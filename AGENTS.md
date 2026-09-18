# AI Agent Instructions for Bootpay MCP

> **이 파일은 Codex, Gemini, Claude 등 AI 에이전트가 자동으로 읽는 지시 파일입니다.**

## Commerce 호스팅 주문서의 로그인 인계

기존 쇼핑몰의 로그인 인계 수정은 PG/관리자 키 설정 변경과 구분한다.

- 회원 주문은 `POST /v1/orders/prepare`에 `Bootpay-User-JWT`와 `use_auto_login: true`, `response_type: "url"`을 전달한다.
- API는 기존 범용 `/b/{mall_client_key}?__s=…&redirect_url=…`를 반환해야 한다. `/b`가 `__tc`·`__du`를 설정한 뒤 주문서로 이동한다.
- 호출자는 응답 `url`을 그대로 사용한다. MCP/SDK/가맹점이 `__s` 암호화나 URL 재구성을 구현하지 않는다. true인데 직접 URL이면 API 계약 결함으로 기록하고 자동 재주문하지 않는다.
- `/i/{clientKey}/{invoiceId}/session`은 Invoice 전용이다. 일반 주문번호를 넣거나 범용 `/b`가 없다고 잘못 안내하지 않는다.
- 실제 쿠키 설정·JWT 전송·세션 구매자 일치까지 확인한다. `__s`는 민감한 bearer이므로 원문 로그/문서 저장 금지.
- 만료·미결제 확인 후 다음 사용자 클릭에서만 새 주문 시도. 결과 불명/이미 처리된 주문의 키를 자동 교체하지 않는다.
- [상세 인계 가이드](docs/commerce-hosted-login.md).

## Commerce 쇼핑몰 연동 — 자격증명 재사용과 읽기/변경 경계

`BootpayCommerce`(api.bootapi.com) 쇼핑몰 연동은 아래 PG 결제 규칙과 흐름이 다르다. 상세: [skills/bootpay-commerce/SKILL.md](skills/bootpay-commerce/SKILL.md).

- 사용자가 Commerce client_key/secret_key 를 이미 줬으면 그 키를 쓴다. `browser_login`·프로젝트 선택/생성·키 발급·결제/몰 설정 변경을 요구하지 않는다.
  `generate_commerce_code(credential_source="provided", client_key="<client_key>")` — secret_key 는 도구 인자가 아니라 앱 서버 환경변수 `BOOTPAY_SECRET_KEY` 에만 둔다.
- 키가 없을 때만 `browser_login` → `browser_select_project` → `generate_commerce_code`. 기본 `auto_setup=false` 는 GET 만 하고 필요한 변경을 `configuration_changes` 로 제안한다.
- 설정 변경(`auto_setup=true`, `browser_select_payment_method`, `update_mall_setting`)은 사용자가 요청했을 때만 한다.
- `create_commerce_keys`는 사용자가 키 발급을 요청했을 때만 쓴다. 기존 키가 있으면 `allow_additional=true`는 추가 발급을 명시했을 때만 쓴다. `sandbox` 를 생략하면 운영/테스트 모드는 바뀌지 않는다.
- `get_commerce_keys`·`get_commerce_context` 는 조회 전용이다 — 키가 없어도 만들지 않는다.
- 관리자 API 401 은 현재 프로젝트에서 중단(다른 프로젝트로 전환 금지), 403 은 권한 부족으로 보고(재로그인·설정 변경 자동 실행 금지).
- 서버 인증은 SDK 가 붙이는 `Authorization: Basic base64(client_key:secret_key)`, 회원 요청은 `Bootpay-User-JWT` 헤더. `getAccessToken()` 을 쓰지 않는다.
- 신규 주문은 `cart/order-preview`의 `checkout_ready/quote_token/amounts`를 사용한다. 동일 구매자·기기로 prepare하고 `orders/{id}/result`로 회원 또는 비회원 결과 토큰을 검증한다. `cart/validate`·로컬 추정치는 견적 토큰을 대신하지 않는다.
- 프론트 규칙·공개 v1 경계·배송지·결과 토큰 계약은 [개발 가이드](skills/bootpay-commerce/references/storefront-development.md)를 따른다. invoice 내부 mall API·Pug 과거 규칙을 외부 앱에 복사하지 않는다.
- [필수 기능 14개](skills/bootpay-commerce/references/required-features.md)를 순서대로 구현한다. 회원가입·로그인·마이페이지·본인 주문·배송지는 기본 범위이며 회원 API gap을 선택 기능으로 빼서 완료 처리하지 않는다. `completion.required_features`의 `api_blocked`는 기능별 task/brief로 연결한다.
- 주문 재사용·만료 판단은 `commerce_get_order_status`(주문 상태만, 회원 확인 없음), 결제 결과 요약은 `commerce_get_order_result`(프로젝트 주문 확인 + `user_jwt` 를 주면 주문자 일치 확인)로 한다.
  `commerce_prepare_order` 가 `order_created: "unknown"` 이면 새 키로 다시 만들지 않는다. 이 도구들은 Commerce Remote MCP 에만 있다.
  포인트·쿠폰 미리보기 도구(`commerce_preview_point_usage`·`commerce_calculate_point_limit`·`commerce_preview_coupon_discount`)는 제거됐다.

## 🔴 최우선 규칙 (PG 결제 연동): 코드 작성 전에 반드시 Admin 도구를 먼저 실행하세요

**결제창(PG) 코드를 한 줄이라도 작성하기 전에** 아래 순서를 반드시 따르세요. Commerce 쇼핑몰 연동은 위 절을 따릅니다.
문서(search_docs, get_doc)를 먼저 읽거나, 학습 데이터로 코드를 생성하면 **100% 실패합니다.**

### 🏆 권장: generate_payment_code (원스톱 — 1회 호출로 완료)

```
generate_payment_code(platform="web", payment_type="payment", framework="react")
```
- 인증/키체인/결제수단/SDK 버전 자동 확인 및 해결 → 완성된 코드 반환
- `auto_setup=true`(기본값): 키체인 없으면 자동 생성, 결제수단 없으면 자동 활성화
- **사전 조건**: browser_login + browser_select_project만 완료되면 됨
- **파라미터**:
  - `platform`: web, android, ios, flutter, react-native
  - `payment_type`: payment(일반결제), billing(정기결제), widget(위젯, web 전용)
  - `framework`: react, vanilla, nextjs (web일 때만)

> **결제 연동 요청 시 이 도구를 가장 먼저 호출하세요.** search_docs, get_doc, get_integration_context를 먼저 호출할 필요 없습니다.

### 대안: 수동 Step-by-Step (세밀한 제어가 필요한 경우)

### Step 1: 통합 컨텍스트 수집
```
get_integration_context()
```
- 인증 상태, 프로젝트, 결제 설정, 위젯, 키체인을 **한 번에** 조회
- `readiness.ready = true` → Step 4로 이동
- `readiness.ready = false` → Step 2에서 blockers 해결

### Step 2: Blockers 해결
```
readiness.blockers 배열을 확인하고 순서대로 해결:
- 미로그인        → browser_login
- 프로젝트 미선택  → browser_select_project
- 키체인 없음     → create_keychain(name="결제용", targets=["core"], is_supervisor=true)
- PG 미활성화     → activate_payment_method
```

### Step 3: 재확인
```
get_integration_context()  → readiness.ready = true 확인
```

### Step 4: SDK 버전 + 문서 (보완 참조)
```
get_sdk_versions()         → 최신 SDK 버전 확인
search_docs("결제 연동")    → 관련 문서 조회 (보조 참고용)
```

### Step 5: 코드 작성
```
- .env 환경변수로 키 참조 (하드코딩 절대 금지)
- 클라이언트 + 서버 코드 함께 제공
- get_integration_context 결과의 실제 프로젝트 정보 반영
- 통합결제창 vs 단일 결제창 판단 (아래 참조)
```

## 통합결제창 가이드

관리자에서 PG와 결제수단이 여러 개 활성화되어 있으면, `pg`와 `method`를 생략하여 **통합결제창**을 사용할 수 있습니다.

### 판단 기준
```
get_integration_context() 결과에서 payment.active_method_count 확인:
- active_method_count = 1  → 단일 결제창 (pg, method 지정)
- active_method_count >= 2 → 통합결제창 권장 (pg, method 생략)
```

### 코드 차이
```javascript
// 통합결제창: pg, method 생략 → 사용자가 결제수단 선택
await Bootpay.requestPayment({
  client_key: 'CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_123',
})

// 단일 결제창: pg, method 지정 → 해당 결제수단으로 바로 이동
await Bootpay.requestPayment({
  client_key: 'CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_123',
  pg: 'nicepay',
  method: 'card',
})
```

### 사용자 질문별 대응
| 사용자 요청 | 권장 |
|------------|------|
| "결제 연동해줘" (기본) | `get_integration_context`로 활성 결제수단 수 확인 → 2개 이상이면 통합결제창 |
| "카드 결제만 되면 돼" | 단일 결제창 (`pg`, `method` 지정) |
| "여러 결제수단 선택할 수 있게" | 통합결제창 (`pg`, `method` 생략) |
| "위젯으로 결제" | 위젯은 기본적으로 통합결제창 방식 |

## ⛔ 절대 금지

| 금지 행위 | 이유 |
|----------|------|
| API 키 추측/생성 | `YOUR_CLIENT_KEY`, 랜덤 문자열 → 100% 실패 |
| 문서만 읽고 코드 생성 | 프로젝트 설정/키 없이는 동작 불가 |
| 키를 코드에 하드코딩 | .env + 환경변수로 참조해야 함 |
| Secret Key 프론트엔드 노출 | 서버 전용. Next.js: `NEXT_PUBLIC_` 접두사 금지, Nuxt: `NUXT_PUBLIC_` 접두사 금지 |
| Next.js/Nuxt에서 클라이언트 컴포넌트에 서버 SDK 사용 | 서버 승인·조회·취소는 반드시 `app/api/`(Next), `server/api/`(Nuxt)에서만 |
| SDK 버전 추측 | 3.x/4.x는 deprecated. get_sdk_versions로 확인 |
| getAccessToken() 사용 | Basic Auth 방식으로 변경됨 |
| 백엔드에서 결제 시작 | PG 규정상 프론트엔드에서만 시작 가능 |
| items[].price에 정가 입력 | 할인 적용된 실결제 단가를 넣어야 함. 정가 입력 시 합계 불일치로 결제 실패 |

## 🔴 결제 금액 규칙

**price === sum(items[].price × items[].qty)** — 불일치 시 결제 실패

```javascript
// ✅ 올바른 예시: 할인 적용된 실결제 단가
const items = [
  { item_name: '상품 A', qty: 2, price: 9000 },  // 정가 10000, 할인 1000 → 실결제 9000
  { item_name: '상품 B', qty: 1, price: 5000 },
]
const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0)  // 23000

Bootpay.requestPayment({ price: totalPrice, items, ... })  // ✅ 23000 === 23000

// ❌ 잘못된 예시: 정가로 넣으면 합계 불일치
// items = [{ price: 10000, qty: 2 }, { price: 5000, qty: 1 }]  → 합계 25000
// price: 23000  → ❌ 23000 !== 25000 → 결제 실패
```

## 환경

- Bootpay API는 **production 환경만** 사용합니다.
- 테스트는 `set_sandbox_mode`로 sandbox 모드를 사용하세요.

## .env 구조

```bash
# 프론트엔드 (키체인의 client_key 사용)
VITE_BOOTPAY_CLIENT_KEY=       # Client Key (프론트엔드 SDK)
NEXT_PUBLIC_BOOTPAY_CLIENT_KEY= # Next.js

# 서버 (Basic Auth: Authorization: Basic Base64(clientKey:secretKey))
BOOTPAY_CLIENT_KEY=         # Client Key
BOOTPAY_SECRET_KEY=         # Secret Key (서버 전용)
```

## Admin 도구 없는 경우 (HTTP 모드 / MCP 미연결)

Admin 도구(get_integration_context, browser_login 등)가 없으면:
1. 사용자에게 [admin.bootpay.co.kr](https://admin.bootpay.co.kr) → API 연동키에서 키를 확인하도록 안내
2. 사용자가 키를 제공할 때까지 코드 생성 금지
3. stdio 모드 설정 안내: `npx -y @bootpay/mcp@latest`

## 알림톡 (카카오 알림톡) — stdio 의 alimtalk_* 도구

"알림톡 보내줘" · "알림톡 템플릿 만들어줘" 같은 요청은 결제 연동 흐름과 별개입니다.

1. `alimtalk_status` 부터 — 커머스 연동키 · 카카오 채널 · 승인된 템플릿 · 웹훅 상태와 다음 할 일을 줍니다
2. 키는 결제용이 아니라 **커머스 연동키**입니다 (env `BOOTPAY_COMMERCE_CLIENT_KEY` · `BOOTPAY_COMMERCE_SECRET_KEY` 또는 `set_commerce_credentials`)
3. 템플릿은 `alimtalk_recommend_official_templates` 로 공식 템플릿부터 찾고, 없으면 `alimtalk_create_template`(초안) → 등록 → 카카오 검수
4. 🔴 실제 발송은 기본 꺼짐입니다 — 사용자가 env `BOOTPAY_ALIMTALK_SEND_ENABLED=true` 로 켭니다(AI 가 대신 켜지 마세요). 켜져 있어도 두 단계 — `alimtalk_send` 를 `confirm_token` 없이 불러 미리보기를 사용자에게 보여 주고, 동의를 받은 뒤에만 같은 인자 + `confirm_token` 으로 다시 부릅니다. 샌드박스가 없어 곧바로 실제 발송 · 과금입니다
5. 문자(LMS) 대체발송은 안내하지 마세요 — 부트페이는 제공하지 않습니다

## MCP 버전 — 반드시 최신으로 안내하세요

설정 문자열에서 **`@latest` 를 빼지 마세요.** `npx @bootpay/mcp` 는 npx 캐시(`~/.npm/_npx/`)에 남아 있는
옛 사본을 실행합니다. 옛 버전은 문서 검색이 조용히 빈 결과를 내거나 낡은 SDK 버전을 단언하므로,
AI 가 그 정보로 코드를 만들면 그대로 실패합니다.

```bash
npm view @bootpay/mcp version          # npm 의 최신 버전
npx -y @bootpay/mcp@latest --version   # 지금 실행되는 버전 (v2.1.1 이상에서 지원)
npx clear-npx-cache                    # 두 값이 다르면 캐시를 비우고 다시 실행
```

- 전제조건: Node.js 18 이상 (`node -v`). 없으면 https://nodejs.org 의 LTS 설치 후 **터미널을 새로 열 것**
- 설정 저장 후에는 AI 클라이언트를 **완전히 종료하고 다시 켜야** 반영됩니다
- 도구 응답에 "문서 백엔드에 연결하지 못했습니다"가 보이면 버전을 먼저 의심하세요
