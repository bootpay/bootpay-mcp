# Bootpay MCP Server

> **Korea's payment integration, now accessible to AI.**
> 한국 결제 연동을 AI가 직접 수행할 수 있도록 하는 MCP 서버입니다.

[![npm](https://img.shields.io/npm/v/@bootpay/mcp?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@bootpay/mcp)
[![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-blue)](https://mcp.bootpay.ai/mcp)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## AI Agents: 이 저장소를 참조받았다면 여기부터 읽으세요

**"이 레포 참조해서 부트페이 결제 연동해줘"** 라는 요청을 받고 이 문서를 읽고 있다면:

### ⚡ 세션 프리플라이트 — 먼저 MCP 연결 상태를 확인하세요

MCP가 "연결됨"이라도 전송 방식에 따라 사용 가능한 도구가 다릅니다:

| 전송 방식 | Docs (7개) | Admin (34개) | Commerce (13개) | 키 자동 조회 | 다음 단계 |
|-----------|:----------:|:------------:|:---------------:|:----------:|----------|
| **stdio** (`npx @bootpay/mcp`) | O | O | opt-in | O | → 아래 "stdio 모드" 참고 |
| **HTTP** (`mcp.bootpay.ai/mcp`) | O | — | — | — | → 아래 "MCP 없이" 참고 (키 수동 입력 필요) |
| **MCP 없음** (저장소 참조만) | — | — | — | — | → 아래 "MCP 없이" 참고 (키 수동 입력 필요) |

**확인 방법:**
```bash
# Codex
codex mcp list          # bootpay 서버가 보이는지 확인

# Claude Code
claude mcp list         # bootpay 서버가 보이는지 확인

# Gemini CLI
gemini mcp list         # bootpay 서버가 보이는지 확인
```

> **stdio로 연결된 경우**: `browser_login` → `list_keychains`(또는 `create_keychain`)으로 키를 **자동 조회**하세요. 사용자에게 키를 직접 물어보지 마세요.
> **HTTP 또는 MCP 없음**: 사용자에게 키를 요청해야 합니다. 아래 "MCP 없이 이 저장소만 참조하는 경우" 섹션의 정확한 키 이름을 사용하세요.
> **서버가 목록에 없으면?** MCP 설정 후 반드시 **새 세션을 시작**하세요. 설정만으로는 현재 세션에 반영되지 않습니다.
> **HTTP로 연결했는데 Admin 도구를 쓰고 싶다면?** stdio(`npx @bootpay/mcp`)로 재설정 후 새 세션을 시작하세요.

### stdio 모드 (Admin 도구 사용 가능)

Admin CLI로 프로젝트 설정부터 결제까지 자동 처리됩니다:

```
1. browser_login              → Bootpay 로그인
2. browser_select_project     → 프로젝트 선택 (없으면 create_seller)
3. activate_payment_method    → PG 결제수단 활성화
4. set_sandbox_mode           → 테스트 모드 설정
5. create_keychain(targets=["core"]) → 결제용 API 키 발급 (application_id, client_key, secret_key)
   또는 list_keychains(source=core) → 기존 키 조회 (secret_key 마스킹됨)
6. get_sdk_versions           → 최신 SDK 버전 확인
7. search_docs → get_doc      → 관련 문서 조회
8. 코드 작성                   → .env 환경변수 참조 (키를 코드에 하드코딩 금지)
```

**서버 인증**: client_key/secret_key 기반 Basic Auth. `getAccessToken()` 불필요.

### MCP 없이 이 저장소만 참조하는 경우

> **🚫 API 키를 추측하거나 임의로 생성하지 마세요.** `692e4c6da0ba315535c9dedf` 같은 랜덤 문자열을 .env에 넣으면 100% 실패합니다. Bootpay API 키는 Bootpay 서버가 발급한 값만 유효합니다.

아래 파일을 순서대로 읽고 코드를 작성하세요:

| 순서 | 파일 | 내용 |
|:----:|------|------|
| 1 | [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) | Admin CLI로 키 조회 또는 수동 설정 |
| 2 | [`SDK_VERSIONS.md`](./SDK_VERSIONS.md) | 최신 SDK 버전 (v2 5.x) — 3.x/4.x는 deprecated |
| 3 | [`llms.txt`](./llms.txt) | 핵심 규칙, API 도메인, SDK 패키지, 결제 흐름 |
| 4 | [`examples/`](./examples/) | 플랫폼별 전체 코드 예제 (12개) |

> ⚠️ **MCP 없이는 API 키를 AI가 자동 조회할 수 없습니다.** 사용자에게 반드시 아래 안내를 하세요:
> - [admin.bootpay.ai](https://admin.bootpay.ai) → 프로젝트 → 개발자 설정 → API 연동키(결제) 탭에서 아래 3개 키를 확인하여 `.env`에 입력
> - 또는 stdio 모드로 MCP를 연결하면 `list_keychains`로 자동 조회 가능
>
> **이 안내 없이 키를 추측하거나, 빈 값/.env 없이 코드를 생성하면 실패합니다.**

#### 사용자에게 요청할 키 3개 (정확한 이름)

Admin UI(admin.bootpay.ai)에서 보이는 라벨과 `.env` 변수명이 다릅니다. **반드시 아래 매핑을 사용하세요:**

| Admin UI 라벨 | .env 변수명 | 용도 |
|---------------|------------|------|
| **Application ID** (= Web Application ID) | `BOOTPAY_APP_ID` | 프론트엔드 SDK 결제창 호출 |
| **Client Key** (= REST API Key) | `BOOTPAY_CLIENT_KEY` | 서버 Basic Auth 인증 |
| **Secret Key** (= Private Key) | `BOOTPAY_SECRET_KEY` | 서버 Basic Auth 인증 (비밀) |

> 프론트엔드 빌드 도구에 따라 `BOOTPAY_APP_ID` 앞에 접두사를 붙입니다:
> - Vite → `VITE_BOOTPAY_APP_ID`
> - Next.js → `NEXT_PUBLIC_BOOTPAY_APP_ID`
> - Create React App → `REACT_APP_BOOTPAY_APP_ID`

```bash
# .env 예시 — create_keychain 또는 Admin UI에서 확인한 값을 입력
BOOTPAY_APP_ID=               # Application ID (프론트엔드)
BOOTPAY_CLIENT_KEY=           # Client Key (서버 Basic Auth)
BOOTPAY_SECRET_KEY=           # Secret Key (서버 전용, 프론트엔드 노출 금지)
```

#### ❌ 흔한 실수 — 이 이름을 사용하지 마세요

| 잘못된 이름 | 올바른 이름 | 비고 |
|------------|------------|------|
| `BOOTPAY_REST_APP_ID` | `BOOTPAY_CLIENT_KEY` | "REST API Application ID"는 Admin UI 라벨일 뿐, 변수명이 아님 |
| `BOOTPAY_PRIVATE_KEY` | `BOOTPAY_SECRET_KEY` | Bootpay에서는 "Secret Key"로 통일 |
| `BOOTPAY_API_KEY` | `BOOTPAY_CLIENT_KEY` | 존재하지 않는 변수명 |
| `getAccessToken()` | Basic Auth | v2에서는 토큰 발급 불필요. client_key:secret_key로 직접 인증 |

### 핵심 규칙

- **SDK v2 (5.x) only** — `bootpay-3.x.x.min.js`, `bootpay-4.x.x.min.js`는 v1(deprecated)이며 동작하지 않음
- **결제는 프론트엔드에서 시작** — 국내 PG 규정. 백엔드에서 결제를 시작하는 코드 금지
- **API 키는 Admin CLI로 발급 → .env에 기록** — placeholder·추측값·랜덤 문자열 금지. `create_keychain` 또는 `list_keychains` 반환값만 사용
- **서버 인증은 Basic Auth** — client_key/secret_key 기반. `getAccessToken()` 불필요
- **Secret Key는 서버 전용** — 절대 프론트엔드에 노출하지 않을 것

---

## MCP 없이 사용하기

MCP 설정이 어렵거나 npm을 사용할 수 없는 환경에서는, 이 저장소를 직접 다운로드해서 AI에게 전달하세요:

**방법 1 — npm 패키지 직접 설치 (npm registry 불필요)**

```bash
npm install https://github.com/bootpay/bootpay-mcp/releases/download/v2.0.2/bootpay-mcp-2.0.2.tgz
```

**방법 2 — tar.gz 다운로드 (npm/git 불필요)**

1. [main.tar.gz 다운로드](https://github.com/bootpay/bootpay-mcp/archive/refs/heads/main.tar.gz)
2. AI 도구에 파일 첨부
3. "부트페이 결제 연동해줘"라고 요청

**방법 3 — git clone**

```bash
git clone https://github.com/bootpay/bootpay-mcp.git
# llms.txt, SDK_VERSIONS.md, SETUP_GUIDE.md를 AI에게 전달
```

---

## About This Project

AI 코딩 도구(**Claude**, **Cursor**, **Windsurf**, **Cline**, **GitHub Copilot** 등)에서 Bootpay 결제·커머스를 연동할 수 있는 통합 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 서버입니다.

**Docs** (문서 검색·SDK 버전·트러블슈팅) + **Admin** (관리자 설정·PG·위젯) + **Commerce** (스토어·상품·회원) — 총 **54개 도구**를 하나의 MCP 서버로 제공합니다.

---

## Supported PG & Payment Methods

Bootpay는 국내 주요 PG사와 간편결제를 통합 지원합니다:

| PG사 | 코드 | 지원 결제 |
|------|------|----------|
| **나이스페이 (NICE)** | `nicepay` | 카드, 계좌이체, 가상계좌, 휴대폰 |
| **토스페이먼츠 (Toss Payments)** | `tosspayments` | 카드, 계좌이체, 가상계좌, 휴대폰 |
| **KG이니시스 (KG Inicis)** | `inicis` | 카드, 계좌이체, 가상계좌, 휴대폰 |
| **NHN KCP** | `kcp` | 카드, 계좌이체, 가상계좌, 휴대폰 |
| **카카오페이 (Kakao Pay)** | `kakao` | 간편결제 |
| **네이버페이 (Naver Pay)** | `naverpay` | 간편결제 |
| **페이코 (PAYCO)** | `payco` | 간편결제 |
| **토스페이 (Toss Pay)** | `tosspay` | 간편결제 |
| **다날 (Danal)** | `danal` | 휴대폰 소액결제 |

**결제 유형**: 일반결제 (카드/계좌이체/가상계좌/휴대폰) · 정기결제 (빌링키) · 본인인증 · 에스크로 · 현금영수증

---

## Quick Start

두 가지 연결 방식을 지원합니다:

| 방식 | 특징 | 추천 환경 |
|------|------|----------|
| **HTTP** (Streamable HTTP) | 설치 불필요, 원격 서버 | Cursor, Windsurf, Cline, 웹 기반 |
| **npm** (stdio) | 로컬 실행, 오프라인 가능 | Claude Desktop, Claude Code |

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) 또는
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**npm (stdio) — 추천:**
```json
{
  "mcpServers": {
    "bootpay-docs": {
      "command": "npx",
      "args": ["-y", "@bootpay/mcp"]
    }
  }
}
```

**HTTP (원격):**
```json
{
  "mcpServers": {
    "bootpay-docs": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.bootpay.ai/mcp"]
    }
  }
}
```

### Claude Code (CLI)

```bash
# npm (stdio)
claude mcp add bootpay-docs -- npx -y @bootpay/mcp

# HTTP
claude mcp add bootpay-docs --transport http https://mcp.bootpay.ai/mcp
```

### Cursor

Settings → MCP Servers → Add:

```json
{
  "bootpay-docs": {
    "url": "https://mcp.bootpay.ai/mcp"
  }
}
```

### Codex (OpenAI)

`~/.codex/config.toml`:

**stdio (권장, 전체 도구):**
```toml
[mcp_servers.bootpay]
command = "npx"
args = ["-y", "@bootpay/mcp"]
```

**HTTP (Docs 도구만, 설치 불필요):**
```toml
[mcp_servers.bootpay]
url = "https://mcp.bootpay.ai/mcp"
```

**Commerce 도구 활성화:**
```toml
[mcp_servers.bootpay]
command = "npx"
args = ["-y", "@bootpay/mcp"]

[mcp_servers.bootpay.env]
BOOTPAY_COMMERCE_CLIENT_KEY = "YOUR_CLIENT_KEY"
BOOTPAY_COMMERCE_SECRET_KEY = "YOUR_SECRET_KEY"
```

또는 CLI로 추가:
```bash
codex mcp add bootpay -- npx -y @bootpay/mcp
```

> **설정 후 반드시 확인:**
> 1. 현재 Codex 세션을 종료하고 새 세션을 시작하세요
> 2. `codex mcp list`로 bootpay 서버가 보이는지 확인
> 3. 보이지 않으면 `~/.codex/config.toml`의 `[mcp_servers.bootpay]` 섹션을 재확인

### Gemini CLI

`~/.gemini/settings.json`:

**stdio (권장, 전체 도구):**
```json
{
  "mcpServers": {
    "bootpay": {
      "command": "npx",
      "args": ["-y", "@bootpay/mcp"]
    }
  }
}
```

**HTTP Streaming:**
```json
{
  "mcpServers": {
    "bootpay": {
      "httpUrl": "https://mcp.bootpay.ai/mcp"
    }
  }
}
```

또는 CLI로 추가:
```bash
gemini mcp add bootpay npx -y @bootpay/mcp
```

> **주의**: Gemini CLI는 서버 이름에 언더스코어(`_`)를 사용하면 보안 정책 파싱 오류가 발생합니다. `bootpay-docs` ✅ / `bootpay_docs` ❌

### Windsurf / Cline / Other MCP Clients

Streamable HTTP endpoint:
```
https://mcp.bootpay.ai/mcp
```

---

## What AI Can Do with This MCP

MCP를 연결하면 AI가 다음을 직접 수행합니다:

```
사용자: "React에서 부트페이 카드결제 연동해줘"

AI 내부 동작:
  1. get_sdk_versions         → 최신 SDK 버전 확인 (v2 5.x)
  2. get_setup_checklist      → Application ID + 환경 설정 안내
  3. search_docs → get_doc    → payment/request 문서 조회
  4. 코드 작성                → 문서 기반, 정확한 버전 사용
```

### Docs Tools — 7개 (HTTP + stdio)

| Tool | Description |
|------|-------------|
| `get_sdk_versions` | 모든 SDK 최신 버전 조회 (Web, Android, iOS, Flutter, React Native, Server) |
| `search_docs` | 120+ 개발자 문서 검색 (12 카테고리) |
| `get_doc` | 특정 문서 전체 마크다운 조회 |
| `list_docs` | 카테고리별 문서 목록 |
| `get_setup_checklist` | 연동 환경 설정 체크리스트 (API 키, SDK 설치, .env) |
| `get_troubleshooting` | 문제 해결 가이드 (sandbox, webhook, billing, error, cors, mobile, widget) |
| `get_cs_guide` | 고객응대(CS) 매뉴얼 검색 |

| Prompt | Description |
|--------|-------------|
| `integration-action-plan` | 결제유형 × 플랫폼별 6단계 연동 액션 플랜 |

### 처음부터 끝까지: Admin CLI로 프로젝트 설정 → 결제 연동

Bootpay가 처음이라면 관리자 화면 대신 AI에게 전부 맡기세요. stdio 방식(`npx @bootpay/mcp`)으로 연결하면 Admin 도구 34개가 활성화됩니다.

```
사용자: "부트페이 결제 연동하고 싶어. 처음이야"

AI 내부 동작:
  1. browser_login              → 브라우저 팝업으로 로그인
  2. create_seller              → 셀러(가맹점) 생성 + 기본 프로젝트 자동 생성
  3. browser_select_project     → 프로젝트 선택
  4. activate_payment_method    → 나이스페이 카드결제 활성화
  5. set_sandbox_mode           → 테스트 모드 설정
  6. create_keychain(targets=["core"]) → 결제용 API 키 발급 (application_id, client_key, secret_key)
  7. search_docs + get_doc      → 최신 연동 문서 참조
  8. 코드 생성                   → 발급한 키를 .env에 설정, 코드에서 환경변수 참조
```

> **⚠️ 키를 코드에 직접 삽입하지 마세요.** 발급한 키는 반드시 `.env` 파일에 저장하고, 코드에서는 환경변수로 참조합니다. Secret Key는 서버 `.env`에만 저장하세요. `secret_key`는 발급 시 1회만 평문으로 표시됩니다.

> **HTTP 방식에서는 Admin 도구를 사용할 수 없습니다.** 프로젝트 설정이 필요하면 반드시 stdio(`npx @bootpay/mcp`)를 사용하세요.

### Admin Tools — 34개 (stdio 전용)

관리자(admin.bootpay.ai)의 설정을 AI가 직접 조회·변경할 수 있는 도구입니다. `npx @bootpay/mcp`로 실행하면 자동 활성화됩니다.

| 카테고리 | Tools | Description |
|---------|-------|-------------|
| **인증** | `login`, `browser_login`, `logout`, `list_projects`, `switch_project`, `browser_select_project` | 로그인, 프로젝트 전환 |
| **토큰** | `set_token`, `get_auth_status` | 인증 토큰 설정·상태 확인 |
| **셀러** | `create_seller`, `search_sellers`, `get_seller`, `update_seller` | 셀러(가맹점) CRUD |
| **키체인** | `list_api_scopes`, `list_keychains`, `create_keychain`, `delete_keychain` | API 키 발급/조회 (source 파라미터로 커머스/결제 구분) |
| **상품** | `list_products`, `get_product`, `create_product`, `update_product`, `delete_product` | 상품 CRUD |
| **프로젝트** | `create_project` | 프로젝트 생성 |
| **결제설정** | `get_payment_settings`, `activate_payment_method`, `set_sandbox_mode`, `update_payment_resource`, `set_payment_mode` | PG·결제수단 설정 |
| **위젯** | `list_widgets`, `get_widget`, `create_widget`, `get_widget_default_styles`, `configure_widget`, `update_widget`, `delete_widget` | 결제위젯 CRUD |

### Commerce Tools — 13개 (stdio 전용, opt-in)

AI 에이전트가 커머스 API를 호출하여 쇼핑몰 기능을 구현할 수 있는 도구입니다.
활성화: 환경변수 `BOOTPAY_COMMERCE_ENABLED=true` 설정 후 실행.

| 카테고리 | Tools | Description |
|---------|-------|-------------|
| **인증** | `set_commerce_credentials` | clientKey/secretKey 설정·검증 |
| **스토어** | `commerce_get_store`, `commerce_get_store_detail` | 가맹점 정보 조회 |
| **상품** | `commerce_get_products`, `commerce_get_product`, `commerce_create_product`, `commerce_update_product` | 상품 CRUD |
| **회원** | `commerce_login`, `commerce_get_session`, `commerce_logout` | 회원 로그인·세션 관리 |
| **리뷰** | `commerce_get_reviews`, `commerce_get_review_stats` | 리뷰 조회·통계 |
| **상태** | `commerce_status` | Commerce API 상태 확인 |

---

## Supported Platforms & SDKs

### Client SDKs

| Platform | Package |
|----------|---------|
| Web (NPM) | `@bootpay/client-js` |
| Web (CDN) | `bootpay-{version}.min.js` |
| Android (Kotlin/Java) | `kr.co.bootpay:android` |
| iOS (Swift/ObjC) | `pod 'Bootpay'` |
| Flutter | `bootpay_flutter` |
| React Native | `react-native-bootpay-api` |

### Server SDKs

| Language | Package |
|----------|---------|
| Node.js | `@bootpay/backend-js` |
| Python | `bootpay-backend` |
| Java / Kotlin | `kr.co.bootpay:backend` |
| Ruby | `bootpay` |
| Go | `github.com/bootpay/backend-go` |
| .NET (C#) | `Bootpay` |
| PHP | `bootpay/backend-php` |

---

## Documentation Categories

| Category | Content |
|----------|---------|
| `payment` | 일반결제 — SDK 설치, 결제창, 서버 검증, 취소/환불 |
| `billing` | 정기결제 — 빌링키 발급, 자동결제, 예약결제, 해지 |
| `subscription` | 구독관리 — 플랜 생성, 갱신, 해지, 과금 |
| `order` | 주문관리 — 주문 생성, 취소, 반품 |
| `customer` | 고객관리 — 고객 등록, 그룹, 조회 |
| `product` | 상품관리 — 상품 CRUD, 옵션, 카테고리 |
| `webhook` | 웹훅 — 설정, 이벤트, 처리, 재시도 정책 |
| `guide` | 시작하기 — 키 발급, 환경설정, 개요 |
| `integration` | 연동 — 에러코드, 마이그레이션, 호환성 |
| `invoice` | 링크페이 — 결제 링크 생성, 알림 |
| `recipes` | 레시피 — 업종별 연동 시나리오 |
| `architecture` | 아키텍처 — 결제 플로우, 데이터 모델 |

---

## Ask AI

MCP를 연결한 후 AI에게 이렇게 물어보세요:

```
부트페이 결제 연동 어떻게 해?
React에서 카드결제 연동하는 전체 코드 알려줘
Flutter에서 정기결제(빌링키) 발급 방법 알려줘
Next.js에서 결제 검증 서버 코드 작성해줘
웹훅 설정은 어떻게 하는거야?
결제위젯으로 카카오페이, 네이버페이 연동해줘
토스페이먼츠 PG로 가상계좌 결제 구현해줘
```

---

## Architecture

두 가지 전송 방식을 지원하며, 도구 범위가 다릅니다:

```
┌─────────────────────┐
│  AI Coding Tool     │
│  (Claude, Cursor,   │
│   Windsurf, Cline,  │
│   Codex, Gemini)    │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 [HTTP]    [stdio]
    │         │
    ▼         ▼
┌─────────┐  ┌──────────────────────────┐
│ Workers │  │ npx @bootpay/mcp         │
│ mcp.    │  │                          │
│ bootpay │  │ ┌─ Docs (7 tools)        │
│ .ai/mcp │  │ ├─ Admin (34 tools)      │
│         │  │ └─ Commerce (13 tools)*  │
│ Docs    │  │                          │
│ only    │  │ * opt-in                 │
└────┬────┘  └──────────────────────────┘
     │
┌────┴────┐
│ KV      │
│ 120+docs│
└─────────┘
```

| 전송 | Docs (7) | Admin (34) | Commerce (13) |
|------|:--------:|:----------:|:-------------:|
| **HTTP** (Cloudflare Workers) | O | — | — |
| **stdio** (`npx @bootpay/mcp`) | O | O | opt-in |

**Stack**: Cloudflare Workers + KV + MCP SDK + Streamable HTTP + stdio

---

## Links

- [Bootpay Developer Docs](https://developers.bootpay.ai)
- [Bootpay Admin](https://admin.bootpay.ai)
- [Bootpay Official](https://www.bootpay.ai)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [llms.txt](./llms.txt) — LLM-optimized documentation

---

## Keywords

Bootpay, 부트페이, Korean payment gateway, 한국 결제, PG 연동, payment integration, MCP server, Model Context Protocol, AI coding assistant, LLM, Claude, Cursor, Windsurf, Cline, GitHub Copilot, 나이스페이, NICE, 토스페이먼츠, Toss Payments, KG이니시스, KG Inicis, NHN KCP, 카카오페이, Kakao Pay, 네이버페이, Naver Pay, 페이코, PAYCO, 다날, Danal, 정기결제, recurring payment, billing key, 빌링키, subscription, 구독결제, 결제위젯, payment widget, 결제 연동, checkout, 간편결제, easy payment, Cloudflare Workers
