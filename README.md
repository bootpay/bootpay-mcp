# Bootpay MCP Server

> **Korea's payment integration, now accessible to AI.**
> 한국 결제 연동을 AI가 직접 수행할 수 있도록 하는 MCP 서버입니다.

[![npm](https://img.shields.io/npm/v/@bootpay/mcp?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@bootpay/mcp)
[![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-blue)](https://mcp.bootpay.ai/mcp)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## AI Agents: 이 저장소를 참조받았다면 여기부터 읽으세요

**"이 레포 참조해서 부트페이 결제 연동해줘"** 라는 요청을 받고 이 문서를 읽고 있다면, MCP 설정이 아니라 **결제 연동 코드 작성**이 목적입니다.

아래 파일을 순서대로 읽고 바로 코드를 작성하세요:

| 순서 | 파일 | 내용 |
|:----:|------|------|
| 1 | [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) | Application ID 발급, 환경변수 설정 |
| 2 | [`SDK_VERSIONS.md`](./SDK_VERSIONS.md) | 최신 SDK 버전 (v2 5.x) — 3.x/4.x는 deprecated |
| 3 | [`llms.txt`](./llms.txt) | 핵심 규칙, API 도메인, SDK 패키지, 결제 흐름 |
| 4 | [`examples/`](./examples/) | 플랫폼별 전체 코드 예제 (12개) |

### 핵심 규칙 (코드 생성 전 필수 확인)

- **SDK v2 (5.x) only** — `bootpay-3.x.x.min.js`, `bootpay-4.x.x.min.js`는 v1(deprecated)이며 동작하지 않음
- **결제는 프론트엔드에서 시작** — 국내 PG 규정. 백엔드에서 결제를 시작하는 코드 금지
- **Application ID 필수** — [admin.bootpay.ai](https://admin.bootpay.ai)에서 발급. placeholder 사용 금지
- **Private Key는 서버 전용** — 절대 프론트엔드에 노출하지 않을 것

### MCP 서버를 연결하면 더 정확합니다

위 파일만으로도 연동 가능하지만, MCP 서버를 연결하면 AI가 120+개 문서를 실시간 검색하고 항상 최신 SDK 버전을 사용합니다. 설정 방법은 아래 [Quick Start](#quick-start) 참고.

---

## MCP 없이 사용하기

MCP 설정이 어렵거나 npm을 사용할 수 없는 환경에서는, 이 저장소를 직접 다운로드해서 AI에게 전달하세요:

**방법 1 — tar.gz 다운로드 (npm/git 불필요)**

1. [main.tar.gz 다운로드](https://github.com/bootpay/bootpay-mcp/archive/refs/heads/main.tar.gz)
2. AI 도구에 파일 첨부
3. "부트페이 결제 연동해줘"라고 요청

**방법 2 — git clone**

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

### Admin Tools — 34개 (stdio 전용)

관리자(admin.bootpay.ai)의 설정을 AI가 직접 조회·변경할 수 있는 도구입니다. `npx @bootpay/mcp`로 실행하면 자동 활성화됩니다.

| 카테고리 | Tools | Description |
|---------|-------|-------------|
| **인증** | `login`, `browser_login`, `logout`, `list_projects`, `switch_project`, `browser_select_project` | 로그인, 프로젝트 전환 |
| **토큰** | `set_token`, `get_auth_status` | 인증 토큰 설정·상태 확인 |
| **셀러** | `create_seller`, `search_sellers`, `get_seller`, `update_seller` | 셀러(가맹점) CRUD |
| **키체인** | `list_api_scopes`, `list_keychains`, `create_keychain`, `delete_keychain` | API 키 관리 |
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
│   Windsurf, Cline)  │
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
