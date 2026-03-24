# Bootpay 연동 설정 가이드

## 방법 A: Admin CLI (MCP stdio) — 권장

MCP를 stdio 모드(`npx @bootpay/mcp`)로 연결하면 AI가 프로젝트 생성부터 키 발급까지 자동으로 처리합니다.

> **⚠️ HTTP 모드에서는 Admin 도구를 사용할 수 없습니다.** 반드시 stdio(`npx @bootpay/mcp`)로 연결하세요.
> 설정 후 **새 세션을 시작**해야 반영됩니다. 확인: `codex mcp list` / `claude mcp list`

```
① browser_login              → 브라우저 팝업으로 Bootpay 로그인
② create_seller              → 셀러(가맹점) 생성 + 기본 프로젝트 자동 생성
③ browser_select_project     → 프로젝트 선택
④ activate_payment_method    → PG 결제수단 활성화
⑤ set_sandbox_mode           → 테스트 모드 설정
⑥ create_keychain 또는 list_keychains → API 키 발급/조회 (아래 참고)
⑦ .env 파일에 키 설정         → 코드에서 환경변수로 참조 (하드코딩 금지)
```

### API 키 발급/조회

**처음이라면 → `create_keychain`으로 새 키 발급:**
```
create_keychain(name="결제 연동용", targets=["core"], is_supervisor=true)
```
→ `application_id`, `client_key`, `secret_key` 3개 반환
→ ⚠️ **`secret_key`는 이 응답에서만 평문으로 확인 가능.** 반드시 즉시 .env에 저장

**이미 키가 있다면 → `list_keychains`로 조회:**
```
list_keychains(source=core)
```
→ `application_id`, `client_key` 조회 가능 (secret_key는 마스킹됨)
→ secret_key를 분실했으면 `create_keychain`으로 새로 발급

### list_keychains source 파라미터

| source | 조회 대상 | 용도 |
|--------|----------|------|
| `core` | 결제용 키체인 (AppKeyChain) | 결제 연동 — Application ID, Client Key |
| `internal` | 커머스용 키체인 (ProjectKeyChain) | 커머스 API — clientKey, secretKey |
| `all` (기본값) | 둘 다 | 전체 확인 |

### 결제용 API 키 (.env 설정)

Admin UI(admin.bootpay.ai)에서 보이는 라벨과 `.env` 변수명이 다릅니다. **반드시 아래 매핑을 사용하세요:**

| Admin UI 라벨 | API 응답 필드 | .env 변수명 | 용도 |
|---------------|-------------|------------|------|
| **Application ID** (= Web Application ID) | `application_id` | `BOOTPAY_APP_ID` | 프론트엔드 SDK 결제창 호출 |
| **Client Key** (= REST API Key) | `client_key` | `BOOTPAY_CLIENT_KEY` | 서버 Basic Auth 인증 |
| **Secret Key** (= Private Key) | `secret_key` | `BOOTPAY_SECRET_KEY` | 서버 Basic Auth 인증 (비밀) |

> 프론트엔드 빌드 도구에 따라 `BOOTPAY_APP_ID` 앞에 접두사를 붙입니다:
> - Vite → `VITE_BOOTPAY_APP_ID`
> - Next.js → `NEXT_PUBLIC_BOOTPAY_APP_ID`
> - Create React App → `REACT_APP_BOOTPAY_APP_ID`

```bash
# create_keychain 또는 list_keychains 결과를 아래에 입력
BOOTPAY_APP_ID=               # Application ID (프론트엔드)
BOOTPAY_CLIENT_KEY=           # Client Key (서버 Basic Auth)
BOOTPAY_SECRET_KEY=           # Secret Key (서버 전용, 프론트엔드 노출 금지)
```

#### ❌ 흔한 실수 — 이 이름을 사용하지 마세요

| 잘못된 이름 | 올바른 이름 | 비고 |
|------------|------------|------|
| `BOOTPAY_REST_APP_ID` | `BOOTPAY_CLIENT_KEY` | "REST API Application ID"는 Admin UI 라벨이지 변수명이 아님 |
| `BOOTPAY_PRIVATE_KEY` | `BOOTPAY_SECRET_KEY` | Bootpay에서는 "Secret Key"로 통일 |
| `BOOTPAY_API_KEY` | `BOOTPAY_CLIENT_KEY` | 존재하지 않는 변수명 |
| `getAccessToken()` | Basic Auth 사용 | v2에서는 토큰 발급 불필요 |

> **Secret Key는 서버 `.env`에만 저장하세요.** 프론트엔드 코드나 Git 저장소에 노출되면 보안 사고가 발생합니다.
> Sandbox와 Production의 Application ID는 다릅니다. `get_auth_status`로 현재 환경을 확인하세요.

### 서버 SDK 인증 (Basic Auth)

client_key/secret_key 기반 Basic Auth 인증을 사용합니다. **별도 토큰 발급(getAccessToken) 불필요.**

```javascript
import { Bootpay } from '@bootpay/backend-js'

Bootpay.setConfiguration({
    client_key: process.env.BOOTPAY_CLIENT_KEY,
    secret_key: process.env.BOOTPAY_SECRET_KEY
})

// API 호출 시 자동으로 Authorization: Basic Base64(clientKey:secretKey) 헤더 적용
const receipt = await Bootpay.receiptPayment(receiptId)
```

---

## 방법 B: 수동 설정 (MCP 없는 환경)

MCP를 사용할 수 없는 경우 **사용자가 직접** [Bootpay 관리자](https://admin.bootpay.ai)에서 키를 확인해야 합니다.

> **🚫 AI가 API 키를 추측하거나 임의로 생성하는 것은 절대 금지입니다.**
> Bootpay API 키는 Bootpay 서버가 발급한 값만 유효합니다.
> 사용자가 실제 키를 제공하기 전까지 `.env` 작성이나 코드 생성을 진행하지 마세요.

1. [회원가입](https://admin.bootpay.ai) → 사업자 정보 등록
2. [프로젝트 생성](https://admin.bootpay.ai/project/new)
3. [PG사 활성화](https://admin.bootpay.ai/payment/setting)
4. [API 연동키 확인](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment)

**사용자에게 이렇게 안내하세요:**

```
admin.bootpay.ai → 개발자 설정 → API 연동키(결제) 탭에서 아래 3개를 복사해서 알려주세요:

1. Application ID (= Web Application ID)
2. Client Key (= REST API Key)
3. Secret Key (= Private Key)
```

**사용자가 키를 제공하면 `.env`에 이렇게 저장:**

```bash
BOOTPAY_APP_ID=5b8f6...       # 1번: Application ID
BOOTPAY_CLIENT_KEY=6b...      # 2번: Client Key
BOOTPAY_SECRET_KEY=dG9r...    # 3번: Secret Key (서버 전용)
```

> **중요**: Admin UI에서 "REST API Application ID"라고 표시되는 값이 `BOOTPAY_CLIENT_KEY`이고, "Private Key"라고 표시되는 값이 `BOOTPAY_SECRET_KEY`입니다. 이름이 다르지만 같은 값입니다.

---

## 핵심 규칙

- **결제는 프론트엔드에서 시작** — 국내 PG 규정. 백엔드에서 결제 시작 금지
- **API 도메인 구분** — PG API(`api.bootpay.co.kr`) vs Commerce API(`api.bootapi.com`)
- **SDK 버전** — v2 (5.x)만 사용. 3.x/4.x는 deprecated
- **Secret Key는 서버 전용** — 절대 프론트엔드에 노출 금지
- **.env는 .gitignore에 포함** — API 키가 저장소에 커밋되지 않도록
- **Basic Auth 인증** — client_key/secret_key 기반. `getAccessToken()` 불필요

## 다음 단계

- SDK 설치: [`SDK_VERSIONS.md`](./SDK_VERSIONS.md)
- 연동 가이드: [`llms.txt`](./llms.txt)
- 코드 예제: [`examples/`](./examples/)
- 개발자 문서: https://developers.bootpay.ai
