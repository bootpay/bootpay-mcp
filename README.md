# Bootpay MCP Server

> **Korea's payment integration, now accessible to AI.**
> 한국 결제 연동을 AI가 직접 수행할 수 있도록 하는 MCP 서버입니다.

[![npm](https://img.shields.io/npm/v/@bootpay/mcp?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@bootpay/mcp)
[![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-blue)](https://mcp.bootpay.ai/mcp)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI 코딩 도구(**Claude**, **Cursor**, **Windsurf**, **Cline**, **GitHub Copilot** 등)에서 Bootpay 결제·커머스 개발자 문서를 검색하고 참조할 수 있는 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 서버입니다.

MCP를 연결하면 AI가 **최신 SDK 버전 확인, 문서 검색, 예제 코드 조회, 트러블슈팅**을 직접 수행하여 정확한 결제 연동 코드를 생성합니다.

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

### 7 Tools + 1 Prompt

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

---

## For AI Agents Reading This Repo Directly

MCP 서버를 설정하지 않은 상태에서 이 레포를 참고하는 AI를 위한 안내:

| File | Description |
|------|-------------|
| [SDK_VERSIONS.md](./SDK_VERSIONS.md) | **최신 SDK 버전** — CDN URL, NPM, 모바일 SDK |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | **Application ID 발급** — 결제 연동 필수 설정 |
| [llms.txt](./llms.txt) | **LLM-optimized 전체 가이드** — AI가 읽기 최적화된 구조화 문서 |

### Critical Rules

- **SDK v2 (5.x) only** — `bootpay-3.x.x.min.js`, `bootpay-4.x.x.min.js` are v1 (deprecated) and will not work
- **Application ID required** — must be obtained from [Bootpay Admin](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment), never use placeholder values
- **Private Key** — server-side only, never expose in client code

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
| React Native | `@bootpay/react-native-bootpay` |

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

```
┌─────────────────────┐     ┌──────────────────────────┐
│  AI Coding Tool     │     │  Cloudflare Workers      │
│  (Claude, Cursor,   │────→│  mcp.bootpay.ai/mcp     │
│   Windsurf, Cline)  │ MCP │                          │
└─────────────────────┘     │  ┌────────────────────┐  │
                            │  │ Cloudflare KV       │  │
                            │  │ - 120+ docs         │  │
                            │  │ - SDK versions      │  │
                            │  │ - CS guide          │  │
                            │  └────────────────────┘  │
                            └──────────────────────────┘
```

**Stack**: Cloudflare Workers + KV + MCP SDK + Streamable HTTP

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
