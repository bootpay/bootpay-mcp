# AI Agent Instructions for Bootpay MCP

> **이 파일은 Codex, Gemini, Claude 등 AI 에이전트가 자동으로 읽는 지시 파일입니다.**

## 🔴 최우선 규칙: 코드 작성 전에 반드시 Admin 도구를 먼저 실행하세요

**코드를 한 줄이라도 작성하기 전에** 아래 순서를 반드시 따르세요.
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
