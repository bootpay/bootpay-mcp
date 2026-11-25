# 원격 커넥터(ChatGPT · Claude) 연결 — 현재 상태와 검증 절차

> **상태: 서버 준비 완료, 미개통.** MCP 서버 쪽 구현(보호 리소스 메타데이터 · 401 디스커버리 · 토큰 검증 · 요청별 세션 격리 · 도구 프로파일)은 끝났습니다. 다만 **인가 서버에 introspection 엔드포인트가 없어** 실제 연결은 아직 열려 있지 않습니다. 아래 [남은 선행 작업](#남은-선행-작업)을 보세요.
>
> 지금 상품을 등록하려면 로컬 설치 방식을 쓰세요 → [사진과 설명으로 상품 올리기](./product-registration-ko.md)
>
> 확인 시점: 2026-07-28. 커넥터 등록 UI는 OpenAI·Anthropic 쪽 변경이 잦아 화면이 다를 수 있습니다.

---

## 왜 원격 커넥터인가

로컬 설치(stdio)는 사용자 PC에서 프로세스를 띄웁니다. ChatGPT처럼 브라우저에서만 쓰는 호스팅 클라이언트는 그럴 수 없어서, **OAuth 2.1로 인증하는 원격 MCP 서버**가 따로 필요합니다.

| | 로컬(stdio) | 원격(OAuth) |
|---|---|---|
| 설치 | Node.js + 설정 파일 | 없음 (커넥터 등록만) |
| 인증 | 브라우저 로그인 → 로컬 토큰 파일 | OAuth 승인 → 서버 발급 토큰 |
| 프로젝트 전환 | 대화 중 언제든 | 승인 시점에 고정 |
| 사진 입력 | 로컬 파일 경로 | URL 또는 base64 |
| 쓸 수 있는 도구 | 전체 | 상품 등록 트랙만 |

---

## 원격에 노출되는 도구

`src/admin/tools/remote-tools.ts`의 `REMOTE_TOOL_NAMES`가 정본이고, 프로파일 테스트가 이 목록과 실제 등록을 대조합니다.

**노출**

`get_auth_status` · `list_products` · `get_product` · `create_product` · `update_product` · `delete_product` · `create_test_products` · `list_categories` · `create_category` · `update_category` · `delete_category` · `reorder_categories` · `list_subscription_settings` · `list_delivery_shippings` · `create_subscription_setting` · `create_delivery_shipping` · `list_delivery_shipping_bundles` · `get_product_form_setting` · `get_product_info_notice_forms` · `upload_product_images`

> 배송정책·구독설정 **생성**이 원격에도 있는 이유: 정책이 0개인 프로젝트에서는 `use_delivery_shipping` 이 요구하는 `delivery_shipping_id` 를 얻을 방법이 없어 배송상품 저장 자체가 막힙니다(구독도 같습니다). 상품 저장의 선행 조건이라 상품 스코프 안으로 봅니다. 수정·삭제는 넣지 않았습니다 — 이미 팔리고 있는 상품의 배송비를 바꾸는 경로가 됩니다.

**제외 — 이유별**

| 제외 도구 | 이유 |
|---|---|
| `login`, `set_token` | 자격증명·토큰을 도구 인자로 받는다 → 대화 컨텍스트와 호스팅 업체 로그에 남는다 |
| `browser_login`, `browser_select_project` | `127.0.0.1` 콜백 서버가 사용자 PC가 아니라 서버에서 열려 성립하지 않는다 |
| `switch_project` | 원격은 승인 시점에 프로젝트를 토큰에 고정한다. 대화 중간 전환은 엉뚱한 상점에 상품이 올라가는 사고로 이어진다 |
| `list_projects`, `create_project`, `create_seller`, `update_seller` | 그랜트에 묶인 프로젝트 바깥을 드러내거나 만든다 |
| 결제설정·키체인·위젯 쓰기 | **인가 서버가 발급하는 스코프가 `project.product.read` / `project.product.write` 둘뿐이다** (`OauthClient::SUPPORTED_SCOPES`). 이 도구들을 정당화할 스코프가 아예 없으므로, 스코프가 생기기 전에는 제외한다 |

도구를 새로 추가하면 **기본이 원격 미노출**입니다. `REMOTE_TOOL_NAMES`에 이름을 넣는 의식적인 행동이 있어야 원격에 나갑니다. 프로파일 테스트가 이를 강제합니다.

> 도구를 감추는 것은 스코프 검증을 대체하지 않습니다. 목록에서 빼는 것(미노출)과 서버에서 거부하는 것(스코프 검증) 둘 다 있어야 합니다.

---

## 디스커버리 체인

MCP 클라이언트는 인증이 필요한 서버를 만나면 스스로 인가 서버를 찾아갑니다. 다섯 단계 중 어디서든 끊기면 커넥터 등록이 조용히 실패합니다.

```
1) POST /mcp  (토큰 없음)
   → 401 + WWW-Authenticate: Bearer realm="bootpay-mcp",
       resource_metadata="https://<host>/.well-known/oauth-protected-resource"

2) GET /.well-known/oauth-protected-resource            [MCP 서버]
   → { resource, authorization_servers: [...], scopes_supported: [...] }

3) GET {authorization_server}/.well-known/oauth-authorization-server   [인가 서버]
   → { authorization_endpoint, token_endpoint, registration_endpoint, ... }

4) POST {authorization_server}/oauth/register           [RFC 7591 동적 등록]
   → { client_id }

5) GET  {authorization_server}/oauth/authorize?...      [사용자 승인 화면]
   POST {authorization_server}/oauth/token              [PKCE S256 코드 교환]
   → { access_token, refresh_token }
```

이후 매 요청은 `Authorization: Bearer <access_token>`으로 옵니다. MCP 서버는 그 토큰을 인가 서버에 물어보고(introspection), 통과한 요청에만 상품 도구를 등록합니다.

### 서버가 하는 검증

| 검사 | 실패 시 |
|---|---|
| 토큰 존재 | `401 invalid_request` |
| introspection `active` | `401 invalid_token` |
| **audience 일치** (RFC 8707) | `401 invalid_token` |
| 만료(`exp`) | `401 invalid_token` |
| 스코프 충족 | `403 insufficient_scope` + 필요한 권한 안내 |

만료·위조·폐기는 **모두 같은 응답**으로 거부합니다. 어느 쪽인지 알려주면 토큰 탐색에 쓰입니다.

audience 검증은 건너뛸 수 없습니다. 빠뜨리면 다른 서비스용으로 발급된 토큰이 그대로 통과합니다(confused deputy).

문서 검색(Docs) 도구는 **원래대로 비인증 공개**입니다. 토큰 없이 붙은 클라이언트도 Docs는 그대로 쓸 수 있고, 401 경로가 그쪽까지 막지 않습니다.

---

## 남은 선행 작업

원격 연결을 켜려면 **admin 레포(internal-api)에 두 가지가 필요합니다.** 지금은 `ADMIN_TOOLS_ENABLED = "false"`로 잠가 두었습니다.

### ① `POST /oauth/introspect`

인가 서버가 발급하는 access token은 서명 토큰이 아니라 `SecureRandom.urlsafe_base64(48)` 불투명 문자열이고, DB에는 SHA256 다이제스트만 남습니다(`OauthAccessGrant`). 따라서 **JWKS 로컬 검증이 성립하지 않고**, 인가 서버에 물어보는 방법밖에 없습니다.

모델 쪽에는 `OauthAccessGrant.authenticate(raw)`가 이미 있지만 HTTP로 노출되어 있지 않습니다.

```
POST {authorization_server}/oauth/introspect
Content-Type: application/x-www-form-urlencoded
  token=<access token>
  resource=<MCP resource identifier>

→ 200 {
    "active": true,
    "scope": "project.product.read project.product.write",
    "aud": "https://mcp.bootpay.ai/mcp",
    "exp": 1790000000,
    "client_id": "...",
    "project": { "app_id": "...", "name": "...", "seller": "..." },
    "session_token": "<internal-api 용 관리자 JWT>"
  }

→ 200 { "active": false }    // 만료·위조·폐기를 구분하지 않는다
```

### ② `session_token` — internal-api 호출 수단

이게 핵심입니다. internal-api의 `alive!`는 `Shared::Member.jwt_session_invalid!`로 **관리자 JWT 세션만** 받습니다(`app/controllers/concerns/session_valid.rb`). OAuth access token을 그대로 `Authorization`에 실어 보내면 통과하지 못합니다.

그래서 introspection 응답이 그 요청에 해당하는 **관리자 세션 토큰**을 함께 내려줘야 상품 도구가 실제로 동작합니다. MCP 서버는 이 값을 요청 단위 메모리 저장소에만 넣고 로그·응답 어디에도 남기지 않습니다.

대안으로 internal-api의 `alive!`가 OAuth 그랜트 토큰을 직접 받아들이게 하는 방법도 있습니다. 그 경우 introspection의 `session_token` 대신 access token을 그대로 넘기도록 `src/entry-workers.ts`를 한 줄 고치면 됩니다.

### ③ audience 바인딩

인가 서버가 토큰에 박는 audience가 `MCP_RESOURCE_URL`(현재 `https://mcp.bootpay.ai/mcp`)과 **정확히 같아야** 합니다. 인가 서버 구현 노트에 "현재 토큰에 audience 클레임이 없다"고 적혀 있으므로, introspection 응답의 `aud`를 채우는 작업이 함께 필요합니다.

### 켜는 순서

1. 위 ①~③ 반영 후 `wrangler.toml`의 `ADMIN_TOOLS_ENABLED`를 `"true"`로
2. `MCP_RESOURCE_URL` / `OAUTH_AUTHORIZATION_SERVER`가 실제 배포 주소와 맞는지 확인
3. 아래 검증 절차 수행

---

## 검증 절차

**dev 환경에서 합니다.** 운영 환경 검증은 별도 승인 후에 하세요.

### 1단계 — 디스커버리 체인 (MCP Inspector)

```bash
npx @modelcontextprotocol/inspector
```

`https://<배포주소>/mcp`로 연결하고 단계별로 확인합니다. **어디서 끊겼는지 기록하세요.**

- [ ] 토큰 없이 `tools/list` → Docs 도구만 보인다 (401 아님)
- [ ] 토큰 없이 admin 도구 호출 → `401` + `WWW-Authenticate`에 `resource_metadata` 포함
- [ ] `GET /.well-known/oauth-protected-resource` → `authorization_servers`가 인가 서버를 정확히 가리킨다
- [ ] 그 주소의 `/.well-known/oauth-authorization-server` → RFC 8414 필수 필드 존재
- [ ] `POST /oauth/register` → `client_id` 발급
- [ ] `/oauth/authorize` → 동의 화면 진입, 프로젝트 선택 후 승인
- [ ] `/oauth/token` (PKCE S256) → `access_token` 수령
- [ ] 그 토큰으로 `tools/list` → admin 도구가 보인다

### 2단계 — ChatGPT 커넥터 등록

설정 → 커넥터 → 사용자 지정 커넥터 추가 → MCP 서버 주소 입력.

실패하면 **1단계 어느 항목에서 끊겼는지** 대조해 기록하세요. 등록 실패는 대부분 디스커버리나 DCR에서 조용히 끊깁니다.

### 3단계 — 상품 등록 시나리오

- [ ] 단순 상품 (이름 + 가격)
- [ ] 이미지 포함 — **원격에서는 로컬 경로를 쓸 수 없습니다.** `upload_product_images`에 `image_urls` 또는 `image_base64`로 올린 뒤 그 URL을 `images`에 넣는 흐름이 실제로 되는지 확인
- [ ] 카테고리 지정 상품
- [ ] dev 쇼핑몰에서 등록된 상품이 실제로 보이는지

### 4단계 — 권한 경계

- [ ] `project.product.read`만 가진 토큰으로 `create_product` → `403 insufficient_scope`
- [ ] 결제설정 도구가 `tools/list`에 아예 없다
- [ ] 다른 서비스용 audience 토큰 → 거부
- [ ] 관리자 화면에서 연동 해제 → 다음 요청부터 즉시 차단
- [ ] 서로 다른 토큰 2개로 동시 요청 → 응답이 섞이지 않는다
- [ ] 서버 로그에 토큰 문자열이 남지 않는다

### 5단계 — Claude 커넥터 교차확인

같은 서버를 Claude 커넥터로도 붙여 3~4단계를 반복합니다. 한쪽에서만 되면 특정 클라이언트 전제에 기댄 구현이라는 뜻입니다.

### 6단계 — 로컬 회귀

- [ ] stdio에서 `browser_login` → `browser_select_project` → `create_product` 그대로 동작
- [ ] 기존 `~/.bootpay/mcp-token-*` 파일이 있으면 자동으로 읽힌다

---

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 커넥터 등록이 "연결할 수 없음"으로 끝남 | 디스커버리 체인 중간 단절 | Inspector로 1단계를 하나씩 확인. 401의 `WWW-Authenticate`부터 |
| 401이 오는데 인가 서버로 안 넘어감 | `resource_metadata` 누락/오타 | `/.well-known/oauth-protected-resource` 응답 확인 |
| 등록은 됐는데 도구가 안 보임 | 토큰 검증 실패 | `ADMIN_TOOLS_ENABLED`, introspection 응답의 `active`·`aud`·`session_token` 확인 |
| 항상 `invalid_token` | audience 불일치 | 인가 서버가 박는 `aud`와 `MCP_RESOURCE_URL`을 문자열 단위로 대조 |
| `insufficient_scope` | 승인 시 권한 미선택 | 연동 해제 후 다시 승인하며 필요한 권한 허용 |
| 상품 도구는 보이는데 호출이 전부 실패 | `session_token` 미구현 | [남은 선행 작업 ②](#-session_token--internal-api-호출-수단) |
| 로컬 경로로 사진을 못 올림 | 원격의 정상 동작 | `upload_product_images`에 URL/base64 사용 |

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `src/entry-workers.ts` | 401 디스커버리, 메타데이터 라우트, 요청별 admin 도구 등록 |
| `src/admin/auth/token-verify.ts` | introspection 호출, audience·만료·스코프 검증 |
| `src/admin/remote.ts` | 원격 진입점. node: 의존이 없는 import 그래프 |
| `src/admin/tools/remote-tools.ts` | 원격 도구 목록(`REMOTE_TOOL_NAMES`)과 제외 근거 |
| `src/admin/auth/token-store.ts` | 요청 단위 `MemoryTokenStore` |
| `wrangler.toml` | `ADMIN_TOOLS_ENABLED` · `MCP_RESOURCE_URL` · `OAUTH_AUTHORIZATION_SERVER` |
