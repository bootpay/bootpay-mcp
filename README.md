# Bootpay MCP Server

> **Korea's payment integration, now accessible to AI.**
> 한국 결제 연동을 AI가 직접 수행할 수 있도록 하는 MCP 서버입니다.

[![npm](https://img.shields.io/npm/v/@bootpay/mcp?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@bootpay/mcp)
[![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-blue)](https://mcp.bootpay.ai/mcp)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🛍️ **개발자가 아니라 판매자라면** — 코드 없이 사진과 설명만으로 상품을 등록하는 방법은
> [사진과 설명으로 상품 올리기](./docs/product-registration-ko.md)를 보세요.

---

## AI Agents: 이 저장소를 참조받았다면 여기부터 읽으세요

**"이 레포 참조해서 부트페이 결제 연동해줘"** 라는 요청을 받고 이 문서를 읽고 있다면:

### ⚡ 세션 프리플라이트 — 먼저 MCP 연결 상태를 확인하세요

MCP가 "연결됨"이라도 전송 방식에 따라 사용 가능한 도구가 다릅니다:

| 전송 방식 | Docs (9개) | Admin (68개) | 알림톡 (35개) | Commerce | 키 자동 조회 | 다음 단계 |
|-----------|:----------:|:------------:|:------------:|:--------:|:----------:|----------|
| **stdio** (`npx -y @bootpay/mcp@latest`) | O | O | O | 13개 opt-in | O | → 아래 "stdio 모드" 참고 |
| **HTTP** (`mcp.bootpay.ai/mcp`) | O | — | — | — | — | → 아래 "MCP 없이" 참고 (키 수동 입력 필요) |
| **HTTP** (`mcp.bootpay.ai/commerce/mcp`) | — | — | — | 67개 | — | 몰 운영·구매 전용. 키는 도구 호출 파라미터로 넘깁니다 |
| **MCP 없음** (저장소 참조만) | — | — | — | — | — | → 아래 "MCP 없이" 참고 (키 수동 입력 필요) |

> Commerce 도구가 두 줄인 이유 — stdio 13개는 **상점·상품·리뷰·회원 세션**까지고, 원격 67개는
> 거기에 **장바구니 검증·주문 준비·주문 상태 조회**까지 포함한 전체입니다. 같은 이름이 아니라
> 범위가 다른 두 묶음입니다. 연동 코드를 짜는 중이면 stdio, 몰을 실제로 돌리는 에이전트면
> `/commerce/mcp` 입니다.

**확인 방법:**
```bash
# Codex
codex mcp list          # bootpay 서버가 보이는지 확인

# Claude Code
claude mcp list         # bootpay 서버가 보이는지 확인

# Gemini CLI
gemini mcp list         # bootpay 서버가 보이는지 확인
```

**서버가 있다면 버전도 확인하세요 — 옛 버전은 낡은 답을 냅니다:**
```bash
npx -y @bootpay/mcp@latest --version   # 지금 실행되는 버전
npm view @bootpay/mcp version          # npm 의 최신 버전
```
두 값이 다르면 사용자에게 **최신 버전으로 다시 설치**하도록 안내하세요 → [Quick Start / 0단계: 설치](#0단계-설치--반드시-최신-버전으로)

> **stdio로 연결된 경우**: `browser_login` → `list_keychains`(또는 `create_keychain`)으로 키를 **자동 조회**하세요. 사용자에게 키를 직접 물어보지 마세요.
> **HTTP 또는 MCP 없음**: 사용자에게 키를 요청해야 합니다. 아래 "MCP 없이 이 저장소만 참조하는 경우" 섹션의 정확한 키 이름을 사용하세요.
> **서버가 목록에 없으면?** MCP 설정 후 반드시 **새 세션을 시작**하세요. 설정만으로는 현재 세션에 반영되지 않습니다.
> **설정할 때는 반드시 `@latest` 를 붙이세요** — `npx -y @bootpay/mcp@latest`. 버전을 생략하면 npx 캐시에 남은 옛 사본이 실행됩니다.
> **HTTP로 연결했는데 Admin 도구를 쓰고 싶다면?** stdio(`npx -y @bootpay/mcp@latest`)로 재설정 후 새 세션을 시작하세요.
> **Commerce 쇼핑몰(BootpayCommerce) 연동**에서 사용자가 Commerce key 를 이미 줬다면 로그인·키 발급·설정 변경 없이 진행합니다 — [Commerce 스킬](skills/bootpay-commerce/SKILL.md) 참고.

### stdio 모드 (Admin 도구 사용 가능) — 문서보다 Admin 도구를 먼저 사용하세요

> **중요**: 문서(search_docs)를 먼저 읽지 마세요. Admin 도구로 실제 프로젝트 컨텍스트를 먼저 수집하세요.

```
1. get_integration_context()  → 인증/프로젝트/결제설정/위젯/키체인 한 번에 확인 ⭐
   → readiness.ready = true이면 Step 5로 이동
   → readiness.blockers가 있으면 아래 순서로 해결:
2. browser_login              → Bootpay 로그인 (미인증 시)
3. browser_select_project     → 프로젝트 선택 (미선택 시)
4. create_keychain(targets=["core"]) → 결제용 API 키 발급 (키체인 없을 때)
   → client_key, secret_key 반환 → .env에 즉시 저장
5. get_sdk_versions           → 최신 SDK 버전 확인
6. search_docs → get_doc      → 관련 문서 조회 (보완 참조)
7. 코드 작성                   → .env 환경변수 참조 (키를 코드에 하드코딩 금지)
```

**서버 인증**: client_key/secret_key 기반 Basic Auth. `getAccessToken()` 불필요.

### MCP 없이 이 저장소만 참조하는 경우

> **🚫 API 키를 추측하거나 임의로 생성하지 마세요.** `692e4c6da0ba315535c9dedf` 같은 랜덤 문자열을 .env에 넣으면 100% 실패합니다. Bootpay API 키는 Bootpay 서버가 발급한 값만 유효합니다.

아래 파일을 순서대로 읽고 코드를 작성하세요:

| 순서 | 파일 | 내용 |
|:----:|------|------|
| 1 | [`AGENTS.md`](./AGENTS.md) | AI 에이전트용 지시 — 금지 행위, 금액 규칙, 통합결제창 판단 |
| 2 | [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) | MCP 최신 설치 · Admin CLI로 키 조회 또는 수동 설정 |
| 3 | [`SDK_VERSIONS.md`](./SDK_VERSIONS.md) | 최신 SDK 버전 (v2 5.x) — 3.x/4.x는 deprecated |
| 4 | [`llms.txt`](./llms.txt) | 핵심 규칙, API 도메인, SDK 패키지, 결제 흐름 |
| 5 | [`examples/`](./examples/) | 플랫폼별 전체 코드 예제 (12개) |

> ⚠️ **MCP 없이는 API 키를 AI가 자동 조회할 수 없습니다.** 사용자에게 반드시 아래 안내를 하세요:
> - [admin.bootpay.co.kr](https://admin.bootpay.co.kr) → 프로젝트 → 개발자 설정 → API 연동키(결제) 탭에서 아래 3개 키를 확인하여 `.env`에 입력
> - 또는 stdio 모드로 MCP를 연결하면 `list_keychains`로 자동 조회 가능
>
> **이 안내 없이 키를 추측하거나, 빈 값/.env 없이 코드를 생성하면 실패합니다.**

#### 사용자에게 요청할 키 2개 (정확한 이름)

Admin UI(admin.bootpay.co.kr)에서 보이는 라벨과 `.env` 변수명이 다릅니다. **반드시 아래 매핑을 사용하세요:**

| Admin UI 라벨 | .env 변수명 | 용도 |
|---------------|------------|------|
| **Client Key** (= REST API Key) | `BOOTPAY_CLIENT_KEY` | 프론트엔드 SDK 결제창 호출 + 서버 Basic Auth 공통 |
| **Secret Key** (= Private Key) | `BOOTPAY_SECRET_KEY` | 서버 Basic Auth 인증 (비밀) |

> 프론트엔드 빌드 도구에 따라 `BOOTPAY_CLIENT_KEY` 앞에 접두사를 붙입니다:
> - Vite → `VITE_BOOTPAY_CLIENT_KEY`
> - Next.js → `NEXT_PUBLIC_BOOTPAY_CLIENT_KEY`
> - Create React App → `REACT_APP_BOOTPAY_CLIENT_KEY`

```bash
# .env 예시 — create_keychain 또는 Admin UI에서 확인한 값을 입력
BOOTPAY_CLIENT_KEY=           # Client Key (프론트엔드 SDK + 서버 Basic Auth 공통)
BOOTPAY_SECRET_KEY=           # Secret Key (서버 전용, 프론트엔드 노출 금지)
```

#### ❌ 흔한 실수 — 이 이름을 사용하지 마세요

| 잘못된 이름 | 올바른 이름 | 비고 |
|------------|------------|------|
| `BOOTPAY_REST_APP_ID` | `BOOTPAY_CLIENT_KEY` | "REST API Key"는 Admin UI 라벨일 뿐, 변수명이 아님 |
| `BOOTPAY_PRIVATE_KEY` | `BOOTPAY_SECRET_KEY` | Bootpay에서는 "Secret Key"로 통일 |
| `BOOTPAY_API_KEY` | `BOOTPAY_CLIENT_KEY` | 존재하지 않는 변수명 |
| `getAccessToken()` | Basic Auth | v2에서는 토큰 발급 불필요. client_key:secret_key로 직접 인증 |

### 핵심 규칙

- **SDK v2 (5.x) only** — `bootpay-3.x.x.min.js`, `bootpay-4.x.x.min.js`는 v1(deprecated)이며 동작하지 않음
- **결제는 프론트엔드에서 시작** — 국내 PG 규정. 백엔드에서 결제를 시작하는 코드 금지
- **서버승인(분리승인)이 기본** — `Bootpay.requestPayment` 호출 시 `extra.separately_confirmed: true` 설정. confirm 시점에 receipt_id를 서버로 전달하면 서버가 `confirmPayment()`로 최종 승인하고 리턴값으로 금액을 확인 (별도 결제검증 조회 불필요). done 이벤트만 처리하는 클라이언트 승인 코드는 유실 위험이 있어 비권장
- **웹훅 보완 필수** — 클라이언트 결과 처리는 브라우저 이탈로 유실될 수 있음. 웹훅 엔드포인트를 함께 구현 (부트페이 발신 IP `223.130.82.0/24`만 허용 + `receiptPayment` 재검증 + 멱등 처리)
- **API 키는 Admin CLI로 발급 → .env에 기록** — placeholder·추측값·랜덤 문자열 금지. `create_keychain` 또는 `list_keychains` 반환값만 사용
- **서버 인증은 Basic Auth** — client_key/secret_key 기반. `getAccessToken()` 불필요
- **Secret Key는 서버 전용** — 절대 프론트엔드에 노출하지 않을 것

---

## 오프라인 · MCP 없이 사용하기

**방법 1 — 최신 패키지를 파일로 받아서 설치 (사내망 등 npx 를 못 쓰는 환경)**

```bash
npm pack @bootpay/mcp@latest          # 최신 버전 .tgz 가 현재 폴더에 떨어집니다
npm install -g ./bootpay-mcp-*.tgz    # 받은 파일로 전역 설치
bootpay-mcp --version                 # 설치된 버전 확인
```

> GitHub Releases 의 고정 버전 파일을 받지 마세요. **최신 버전은 항상 npm 에 있습니다.**
> 버전을 고정해야 한다면 `npm view @bootpay/mcp versions` 로 목록을 보고 `@bootpay/mcp@2.1.0` 처럼 명시하세요.

**방법 2 — 문서만 AI 에게 전달 (npm/git 불필요, MCP 도구는 못 씀)**

1. [main.tar.gz 다운로드](https://github.com/bootpay/bootpay-mcp/archive/refs/heads/main.tar.gz)
2. AI 도구에 파일 첨부
3. "부트페이 결제 연동해줘"라고 요청

**방법 3 — git clone (문서 참조용)**

```bash
git clone https://github.com/bootpay/bootpay-mcp.git
# AGENTS.md, llms.txt, SDK_VERSIONS.md, SETUP_GUIDE.md 를 AI에게 전달
```

> 방법 2·3 은 **문서만** 전달합니다. Admin 도구(로그인·키 발급·코드 생성)는 stdio 로 MCP 를 붙여야 씁니다.
> 이 경우 AI 는 API 키를 자동 조회할 수 없으니, 아래 "MCP 없이 이 저장소만 참조하는 경우" 절을 따르세요.

---

## About This Project

AI 코딩 도구(**Claude**, **Cursor**, **Windsurf**, **Cline**, **GitHub Copilot** 등)에서 Bootpay 결제·커머스를 연동할 수 있는 통합 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 서버입니다.

**Docs** (문서 검색·SDK 버전·트러블슈팅) + **Admin** (관리자 설정·PG·위젯·코드 생성) + **알림톡** (카카오 채널·템플릿 검수·발송·수신거부·웹훅) + **Commerce** (스토어·상품·회원) — 하나의 MCP 서버로 제공합니다.

stdio 로 붙으면 기본 **114개**(Docs 9 + Admin 68 + 알림톡 36 + 커머스 연동키 1), Commerce 를 켜면 **126개** 도구가 노출됩니다.
HTTP 로 붙으면 Docs 9개만 노출됩니다.

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
| **npm** (stdio) | 로컬 실행, Admin·알림톡·Commerce 도구 사용 가능 | Claude Desktop, Claude Code, Codex, Gemini CLI |

### 0단계: 설치 — 반드시 최신 버전으로

stdio 설정에는 **항상 `@latest` 를 붙이세요.**

```bash
npx -y @bootpay/mcp@latest
```

> **⚠️ `@latest` 를 빼면 예전에 받아둔 사본이 계속 실행됩니다.**
> `npx @bootpay/mcp` 처럼 버전을 생략하면 npx 는 캐시(`~/.npm/_npx/`)에 남아 있는 사본을 먼저 씁니다.
> 한 번 받아둔 사람은 새 버전이 나와도 옛 버전을 계속 실행하게 되고, 그 사이에 고쳐진 것들이 전달되지 않습니다.
> 실제로 최근 릴리스에서 **문서 검색이 조용히 빈 결과를 내던 문제 · 낡은 SDK 버전표 · 일부 도구가 인자를 거절하던 문제**가 고쳐졌습니다.
> 옛 버전을 쓰면 AI 가 그 낡은 정보로 코드를 만듭니다.

**지금 무엇이 실행되는지 확인하세요:**

```bash
npm view @bootpay/mcp version          # npm 에 올라온 최신 버전
npx -y @bootpay/mcp@latest --version   # 실행될 서버의 버전 (v2.1.1 이상)
```

> `--version` 은 v2.1.1부터 지원합니다. 그보다 낮은 버전이면 이 명령이 서버를 띄운 채 멈춥니다.
> 그럴 때는 `Ctrl+C` 로 끄고 — **그것 자체가 옛 버전이라는 신호이므로** — 아래 캐시 비우기를 바로 실행하세요.

두 값이 같으면 최신입니다. 다르면 캐시를 비우고 다시 받으세요:

```bash
npx clear-npx-cache                    # npx 캐시 비우기
rm -rf ~/.npm/_npx                     # 위 명령이 안 되면 (macOS/Linux)
```

Windows PowerShell:
```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx"
```

**항상 같은 버전을 고정해서 쓰고 싶다면** 전역 설치도 됩니다. 대신 업데이트는 직접 해야 합니다:

```bash
npm install -g @bootpay/mcp@latest     # 설치 · 업데이트 모두 이 명령
bootpay-mcp --version                  # 설치된 버전 확인
```
이 경우 MCP 설정의 `command` 는 `npx` 대신 `bootpay-mcp` 를 쓰고 `args` 는 비웁니다.

**전제조건 — Node.js 18 이상**

```bash
node -v                                # v18.0.0 이상이어야 합니다
```
`node` 명령이 없다면 https://nodejs.org 에서 LTS 를 **먼저** 설치하고, **터미널을 새로 여세요** (PATH 반영).
Windows 는 설치 후 PowerShell 을 새로 열어야 `node` 가 잡힙니다.

> **설정을 저장한 뒤에는 AI 클라이언트를 완전히 종료하고 다시 켜세요.**
> 설정 파일만 고치면 현재 세션에는 반영되지 않습니다. 도구 목록에 부트페이 도구가 안 보이면 대부분 이것 때문입니다.
> 확인: `claude mcp list` / `codex mcp list` / `gemini mcp list`

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) 또는
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**npm (stdio) — 추천:**
```json
{
  "mcpServers": {
    "bootpay-docs": {
      "command": "npx",
      "args": ["-y", "@bootpay/mcp@latest"]
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
claude mcp add bootpay-docs -- npx -y @bootpay/mcp@latest

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
args = ["-y", "@bootpay/mcp@latest"]
```

**HTTP (Docs 도구만, 설치 불필요):**
```toml
[mcp_servers.bootpay]
url = "https://mcp.bootpay.ai/mcp"
```

**커머스 연동키 넣기 (알림톡 · Commerce 도구 공통):**
```toml
[mcp_servers.bootpay]
command = "npx"
args = ["-y", "@bootpay/mcp@latest"]

[mcp_servers.bootpay.env]
BOOTPAY_COMMERCE_CLIENT_KEY = "YOUR_CLIENT_KEY"   # 커머스 연동키 — 결제용 키가 아닙니다
BOOTPAY_COMMERCE_SECRET_KEY = "YOUR_SECRET_KEY"
BOOTPAY_COMMERCE_ENABLED = "true"                 # Commerce 도구까지 켤 때만. 알림톡 도구는 이 줄 없이도 노출됩니다
BOOTPAY_ALIMTALK_SEND_ENABLED = "true"            # 알림톡 실제 발송을 켤 때만 (기본 꺼짐 — 미리보기만 됩니다)
BOOTPAY_ALIMTALK_MAX_RECIPIENTS = "100"           # 알림톡 1회 발송 인원 상한 (기본 100)
BOOTPAY_ALIMTALK_SENDER_KEY = "YOUR_SENDER_KEY"   # 연동 채널이 둘 이상일 때 보낼 채널 고정 (카카오 발신 프로필 키)
```

또는 CLI로 추가:
```bash
codex mcp add bootpay -- npx -y @bootpay/mcp@latest
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
      "args": ["-y", "@bootpay/mcp@latest"]
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
gemini mcp add bootpay npx -y @bootpay/mcp@latest
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
  2. get_setup_checklist      → Client Key + 환경 설정 안내
  3. search_docs → get_doc    → payment/request 문서 조회
  4. 코드 작성                → 문서 기반, 정확한 버전 사용
```

### Docs Tools — 9개 (HTTP + stdio)

| Tool | Description |
|------|-------------|
| `detect_project_stack` | 프로젝트 스택 판정 — 클라이언트 플랫폼·웹 프레임워크·**서버 언어**·실행 환경(상시/서버리스). 모노레포면 앱마다 판정하고 "서버 1회 + 클라이언트 N회" 호출 계획을 반환 |
| `get_sdk_versions` | 모든 SDK 최신 버전 조회 (Web, Android, iOS, Flutter, React Native, 서버 7개 언어) |
| `search_docs` | 120+ 개발자 문서 검색 (12 카테고리) |
| `get_doc` | 특정 문서 전체 마크다운 조회 |
| `list_docs` | 카테고리별 문서 목록 |
| `get_setup_checklist` | 연동 환경 설정 체크리스트 (API 키, SDK 설치, .env) |
| `get_troubleshooting` | 문제 해결 가이드 (onboarding, sandbox, webhook, billing, subscription, error, cancel, cors, csp, open-type, mobile, widget, unified, certification) |
| `get_csp_allowlist` | CSP(frame-src) 허용 PG 도메인 목록 + 프레임워크별 설정 스니펫 생성 |
| `get_cs_guide` | 고객응대(CS) 매뉴얼 검색 |

| Prompt | Description |
|--------|-------------|
| `integration-action-plan` | 결제유형 × 플랫폼별 6단계 연동 액션 플랜 |

### 처음부터 끝까지: Admin CLI로 프로젝트 설정 → 결제 연동

Bootpay가 처음이라면 관리자 화면 대신 AI에게 전부 맡기세요. stdio 방식(`npx -y @bootpay/mcp@latest`)으로 연결하면 Admin 도구 68개가 활성화됩니다.

```
사용자: "부트페이 결제 연동하고 싶어. 처음이야"

AI 내부 동작:
  1. browser_login              → 브라우저 팝업으로 로그인
  2. create_seller              → 셀러(가맹점) 생성 + 기본 프로젝트 자동 생성
  3. browser_select_project     → 프로젝트 선택
  4. activate_payment_method    → 나이스페이 카드결제 활성화
  5. set_sandbox_mode           → 테스트 모드 설정
  6. create_keychain(targets=["core"]) → 결제용 API 키 발급 (client_key, secret_key)
  7. search_docs + get_doc      → 최신 연동 문서 참조
  8. 코드 생성                   → 발급한 키를 .env에 설정, 코드에서 환경변수 참조
```

> **⚠️ 키를 코드에 직접 삽입하지 마세요.** 발급한 키는 반드시 `.env` 파일에 저장하고, 코드에서는 환경변수로 참조합니다. Secret Key는 서버 `.env`에만 저장하세요. `secret_key`는 발급 시 1회만 평문으로 표시됩니다.

> **HTTP 방식에서는 Admin 도구를 사용할 수 없습니다.** 프로젝트 설정이 필요하면 반드시 stdio(`npx @bootpay/mcp@latest`)를 사용하세요.

### Admin Tools — 68개 (stdio 전용)

관리자(admin.bootpay.co.kr)의 설정을 AI가 직접 조회·변경할 수 있는 도구입니다. `npx -y @bootpay/mcp@latest`로 실행하면 자동 활성화됩니다.

| 카테고리 | Tools | Description |
|---------|-------|-------------|
| **코드생성** | `generate_payment_code`, `generate_commerce_code` | 프리플라이트(인증·키체인·결제수단·SDK 확인) + 클라이언트/서버 코드 원스톱 생성. `payment_type`: `payment`(일반) / `billing`(빌링키) / `subscription`(구독 — 회차·배치·무료체험·해지) / `widget` / `auth`, `scheduler`: `cron` / `http_trigger`(서버리스) |
| **컨텍스트** | `get_integration_context`, `get_commerce_context` | 인증·프로젝트·결제설정·위젯·키체인을 한 번에 조회 (`readiness.blockers` 반환) |
| **인증** | `login`, `browser_login`, `logout`, `list_projects`, `switch_project`, `browser_select_project`, `set_token`, `get_auth_status` | 로그인, 프로젝트 전환, 토큰 설정·상태 확인 |
| **셀러** | `create_seller`, `search_sellers`, `get_seller`, `update_seller` | 셀러(가맹점) CRUD |
| **상세설명 블록** | `list_content_templates`, `create_content_template`, `delete_content_template`, `list_content_blocks`, `create_content_block`, `update_content_block`, `delete_content_block`, `list_content_block_products` | 상세설명을 블록으로 구성. 시작 템플릿(서버 저장분 + MCP 내장 스타터)과 여러 상품이 공유하는 공용 블록 관리. `content_type=4`일 때만 블록이 저장되며, HTML(`content`)은 서버가 컴파일해 채웁니다 |
| **디지털 코드풀** | `list_digital_codes`, `register_digital_codes`, `disable_digital_code` | 시리얼·라이센스 번호 일괄 등록/조회/폐기. `code_distribution_mode="pool"` 상품에서 구매자마다 다른 코드를 발급할 때 사용 (한 번에 최대 5,000개) |
| **이미지** | `upload_product_images` | 로컬 경로·URL·base64 → Bootpay CDN 업로드 (최대 10장, 장당 10MB) |
| **카테고리** | `list_categories`, `create_category`, `update_category`, `delete_category`, `reorder_categories` | 카테고리 CRUD. `path="상의 > 티셔츠 > 반팔"`로 계층 일괄 생성, 삭제는 `confirm` 확인 게이트 |
| **부속설정** | `list_subscription_settings`, `list_delivery_shippings`, `create_subscription_setting`, `create_delivery_shipping`, `list_delivery_shipping_bundles`, `get_product_form_setting`, `get_product_info_notice_forms` | 상품에 연결할 구독 설정·배송정책 ID 확보. 정책이 하나도 없는 프로젝트에서는 생성까지 가능 — 배송비·주기 같은 값이 빠지면 저장 대신 `need_answer` 로 무엇을 물어야 하는지 돌려줍니다(금액을 추측해 저장하지 않습니다). 폼 설정 조회로 판매자가 끈 섹션을 건너뛰고, 상품 주요정보(상품정보제공고시)의 상품군(1~40)과 군별 입력 항목도 조회 |
| **프로젝트** | `create_project` | 프로젝트 생성 |
| **키체인** | `list_api_scopes`, `list_keychains`, `create_keychain`, `delete_keychain`, `get_commerce_keys`, `create_commerce_keys` | API 키 발급/조회 (source 파라미터로 커머스/결제 구분). `get_commerce_keys` 는 조회 전용이고, 커머스 키 발급은 `create_commerce_keys` 로 명시 호출 |
| **상품** | `list_products`, `get_product`, `create_product`, `update_product`, `delete_product`, `create_test_products` | 상품 CRUD. `image_paths`로 로컬 사진 경로를 주면 업로드까지 처리, 구독(`subscription_setting_id`)·배송정책(`delivery_shipping_id`) 연결, 상세설명 블록(`content_blocks`), 디지털 지급(`digital_provisioning_type`), 환불정책 노출(`refund_policy_expose_type`) 지원 |
| **결제설정** | `get_payment_settings`, `activate_payment_method`, `set_sandbox_mode`, `update_payment_resource`, `set_payment_mode`, `browser_select_payment_method` | PG·결제수단 설정 |
| **위젯** | `list_widgets`, `get_widget`, `create_widget`, `get_widget_default_styles`, `configure_widget`, `update_widget`, `delete_widget` | 결제위젯 CRUD |
| **쇼핑몰설정** | `get_mall_setting`, `update_mall_setting` | 커머스 몰 기본 설정 조회·변경 |

> 상품·상세설명 블록·디지털 코드풀·카테고리·이미지 도구는 **원격(OAuth) 프로파일에도 포함**됩니다. 결제설정·키체인·자격증명 도구는 원격에서 제외됩니다 — 근거와 현재 상태는 [원격 커넥터 문서](./docs/chatgpt-connector-ko.md)를 보세요.

### Alimtalk Tools — 35개 (stdio 전용)

카카오 알림톡을 AI 가 직접 다룹니다. 채널 연동부터 템플릿 검수·발송·결과 확인까지 commerce-api `/v1/alimtalk` 를 그대로 씁니다.
인증은 **커머스 연동키**(Basic Auth)입니다 — env `BOOTPAY_COMMERCE_CLIENT_KEY` · `BOOTPAY_COMMERCE_SECRET_KEY` 로 넣거나 `set_commerce_credentials` 를 부릅니다.

| 카테고리 | Tools | Description |
|---------|-------|-------------|
| **시작** | `alimtalk_status`, `set_commerce_credentials` | 키·채널·승인 템플릿·웹훅 준비 상태와 다음 할 일 / 커머스 연동키 설정·검증 (알림톡·Commerce 공용) |
| **채널(발신프로필)** | `alimtalk_list_categories`, `alimtalk_request_sender_otp`, `alimtalk_register_sender`, `alimtalk_list_senders`, `alimtalk_get_sender`, `alimtalk_release_sender`, `alimtalk_update_variable_examples` | 카카오 채널 OTP 인증·등록·해지, 미리보기용 변수 예문 |
| **공식 템플릿** | `alimtalk_search_official_templates`, `alimtalk_get_official_template`, `alimtalk_recommend_official_templates` | 부트페이가 승인받아 둔 카탈로그 검색·상세·문장 기반 추천. 그룹키 채널이면 검수 없이 바로 발송 |
| **자체 템플릿** | `alimtalk_list_templates`, `alimtalk_get_template`, `alimtalk_create_template`, `alimtalk_update_template`, `alimtalk_delete_template`, `alimtalk_register_template`, `alimtalk_request_inspection`, `alimtalk_upload_template_image` | 초안 생성(기본) → 대행사 등록 → 카카오 검수. 수정은 현재 값과 합쳐 보내 빠진 필드가 지워지지 않음 |
| **발송·결과** | `alimtalk_send`, `alimtalk_send_test`, `alimtalk_send_bulk`, `alimtalk_cancel_reserved`, `alimtalk_list_messages`, `alimtalk_get_message`, `alimtalk_get_stats` | 발송(기본 꺼짐 · 미리보기 → 확인), 연동 확인용 테스트 1건, 예약 취소, 발송내역·집계 |
| **수신거부** | `alimtalk_list_optouts`, `alimtalk_check_optouts`, `alimtalk_add_optout`, `alimtalk_remove_optout` | 목록·사전 확인(1,000건)·등록·해제 |
| **웹훅** | `alimtalk_get_webhook`, `alimtalk_update_webhook`, `alimtalk_test_webhook`, `alimtalk_rotate_webhook_secret`, `alimtalk_list_webhook_deliveries` | 발송·검수 결과 웹훅 설정·테스트·시크릿 재발급·전송 이력 |

> **발송은 세 겹으로 막혀 있습니다.** 알림톡에는 샌드박스가 없어 발송 호출이 곧 과금이기 때문입니다.
> 1. **기본 꺼짐** — env `BOOTPAY_ALIMTALK_SEND_ENABLED=true` 를 넣어야 실제로 보냅니다. 꺼져 있어도 미리보기는 됩니다.
> 2. **미리보기 → 확인** — `alimtalk_send` 를 `confirm_token` 없이 부르면 변수가 치환된 실제 문구·빠진 변수·수신거부 여부만 돌려줍니다. 사용자가 확인한 뒤 같은 인자에 `confirm_token` 을 더해야 발송됩니다. 토큰은 미리보기와 똑같은 내용에만 한 번 쓰이고 10분 뒤 만료됩니다.
> 3. **인원 상한 · 발신 채널은 env 고정** — `BOOTPAY_ALIMTALK_MAX_RECIPIENTS`(기본 100) · `BOOTPAY_ALIMTALK_SENDER_KEY` 는 도구 인자로 받지 않아 AI 가 바꿀 수 없습니다. 상한을 넘는 대량 발송은 서버 코드에서 보내세요.
>
> - 예약 시각은 시간대 오프셋이 붙은 미래 ISO8601 만 받습니다 (서버는 해석하지 못한 값을 즉시 발송합니다).
> - 채널 해지·템플릿 삭제/등록/검수요청·수신거부 해제·시크릿 재발급은 `confirm=true` 없이 부르면 대상과 영향만 보여줍니다.

### Commerce Tools — stdio 13개 (opt-in) · 원격 67개

AI 에이전트가 커머스 API를 호출하여 쇼핑몰 기능을 구현할 수 있는 도구입니다.
활성화: 환경변수 `BOOTPAY_COMMERCE_ENABLED=true` 설정 후 실행. 키는 알림톡과 같은 `set_commerce_credentials`(기본 노출)로 설정합니다.

아래 표는 **stdio 13개**입니다. 장바구니 검증·주문 준비·주문 상태 조회까지 필요하면
`https://mcp.bootpay.ai/commerce/mcp` 의 **원격 67개**를 쓰세요 — 거기서는 키를 도구 호출
파라미터(`client_key`·`secret_key`)로 넘기므로 설치도 환경변수도 필요 없습니다.
stdio 에서 지금 쓸 수 있는 범위는 `commerce_status` 의 `stdio_scope` 가 알려줍니다.

| 카테고리 | Tools | Description |
|---------|-------|-------------|
| **스토어** | `commerce_get_store`, `commerce_get_store_detail` | 가맹점 정보 조회 |
| **상품** | `commerce_get_products`, `commerce_get_product`, `commerce_create_product`, `commerce_update_product` | 상품 CRUD |
| **회원** | `commerce_login`, `commerce_get_session`, `commerce_logout` | 회원 로그인·세션 관리 |
| **리뷰** | `commerce_get_reviews`, `commerce_get_review_stats` | 리뷰 조회·통계 |
| **상태** | `commerce_status` | Commerce API 상태 확인 |

### Commerce 스킬 — `skills/bootpay-commerce`

Commerce 쇼핑몰을 서버에서 `@bootpay/backend-js` 의 `BootpayCommerce` 로 연동할 때 AI 가 따르는 절차서입니다.
npm 패키지에 함께 배포되며(`package.json` 의 `files` 에 `skills` 포함), Claude Code 에서는 폴더를 skills 디렉터리로 복사해 씁니다.

```bash
npm pack @bootpay/mcp@latest
tar -xzf bootpay-mcp-*.tgz package/skills/bootpay-commerce
mkdir -p ~/.claude/skills && cp -R package/skills/bootpay-commerce ~/.claude/skills/
```

- [SKILL.md](skills/bootpay-commerce/SKILL.md) — 제공된 자격증명 재사용, 관리자 설정 읽기/변경 경계, PG 결제와 Commerce 인증 분리
- [필수 기능 14개](skills/bootpay-commerce/references/required-features.md) — 회원가입·로그인·마이페이지·본인 주문·배송지를 기본 범위로 구현, API gap은 완료 판정에서 제외 불가
- [프론트·v1 개발 규칙](skills/bootpay-commerce/references/storefront-development.md) — 현재 invoice HTML/CSS 규칙, 내부 API 경계, 견적 토큰·구매자 결과
- [references/contracts.md](skills/bootpay-commerce/references/contracts.md) — SDK 2.13.1 raw 응답·Basic 인증·회원 JWT·endpoint·금액·hosted 결제·결과 확인 계약

`generate_commerce_code` 는 기본 `auto_setup=false` 로 관리자 설정을 읽기만 하고(`preflight.performed_writes: 0`), 필요한 변경은
`configuration_changes` 로 제안합니다. 사용자가 이미 Commerce key 를 줬다면 `credential_source="provided"` 로 로그인 없이 진행합니다.
`completion.required_features`는 필수 기능별 API·구현 상태와 gap task를 반환합니다. Next.js 기본 생성물에 계정·본인 주문·배송지가 포함되며, 공개 API 보완이 필요한 가입·회원정보 수정·비밀번호·탈퇴가 남으면 전체는 `incomplete`입니다. 다른 프레임워크는 안전하지 않은 과거 템플릿 대신 현재 프레임워크용 구현 가이드를 반환합니다.

각 도구는 MCP annotation(`readOnlyHint`·`destructiveHint`·`idempotentHint`)으로 쓰기 여부를 선언합니다 — 클라이언트용 힌트이며 권한 검사를 대신하지 않습니다.
신규 주문은 `cart/order-preview`의 `checkout_ready/quote_token/amounts`로 준비합니다(`commerce_calculate_price`는 표시 추정치).
재사용·만료 판단은 `commerce_get_order_status`, 결제 결과 요약(프로젝트 주문·회원 주문자 확인 후)은 `commerce_get_order_result` 로 합니다. 포인트·쿠폰 미리보기 도구(`commerce_preview_point_usage`·`commerce_calculate_point_limit`·`commerce_preview_coupon_discount`)는 서버 경로가 폐지되어 제거됐습니다.

---

## Supported Platforms & SDKs

### Client SDKs

| Platform | Package |
|----------|---------|
| Web (NPM) | `@bootpay/client-js` |
| Web (CDN) | `bootpay-{version}.min.js` |
| Android (Kotlin/Java) | `io.github.bootpay:android` |
| iOS (Swift/ObjC) | `pod 'Bootpay'` |
| Flutter | `bootpay` |
| React Native | `react-native-bootpay-api` |

### Server SDKs

| Language | Package |
|----------|---------|
| Node.js | `@bootpay/backend-js` |
| Python | `bootpay-backend` |
| Java / Kotlin | `io.github.bootpay:backend` |
| Ruby | `bootpay` |
| Go | `github.com/bootpay/backend-go/v2` |
| .NET (C#) | `Bootpay` |
| PHP | `bootpay/server-php` |

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
기존 프로젝트에 월 구독결제 붙여줘 (매일 배치로 결제, 같은 달 두 번 결제 방지, 성공 시에만 다음 달 이용 개방)
Next.js에서 결제 검증 서버 코드 작성해줘
웹훅 설정은 어떻게 하는거야?
결제위젯으로 카카오페이, 네이버페이 연동해줘
토스페이먼츠 PG로 가상계좌 결제 구현해줘
예약 확정 안내를 카카오 알림톡으로 보내고 싶어 — 쓸 만한 템플릿 찾아줘
주문번호 넣어서 알림톡 한 건 보내줘 (미리보기 먼저)
알림톡 발송 결과 웹훅 설정해줘
```

---

## Architecture

전송은 HTTP 와 stdio 둘이고, HTTP 는 도구 묶음에 따라 엔드포인트가 둘입니다:

```
        ┌─────────────────────┐
        │  AI Coding Tool     │
        │  (Claude, Cursor,   │
        │   Windsurf, Cline,  │
        │   Codex, Gemini)    │
        └──────────┬──────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
      [HTTP]              [stdio]
         │                   │
         ▼                   ▼
┌──────────────────────┐  ┌────────────────────────────┐
│ Cloudflare Workers   │  │ npx -y @bootpay/mcp@latest │
│ mcp.bootpay.ai       │  │                            │
│                      │  │ ┌─ Docs      ( 9 tools)    │
│ /mcp          ( 9)   │  │ ├─ Admin     (68 tools)    │
│ /commerce/mcp (67)   │  │ ├─ Alimtalk  (35 tools)    │
│ /api/*        REST   │  │ └─ Commerce  (13 tools)*   │
│                      │  │                            │
│                      │  │ * opt-in                   │
└────────┬─────────────┘  └────────────────────────────┘
         │
┌────────┴─────────┐
│ KV               │
│ 120+ docs        │
└──────────────────┘
```

| 전송 | Docs (9) | Admin (68) | 알림톡 (35) | Commerce | 노출 도구 수 |
|------|:--------:|:----------:|:----------:|:--------:|:-----------:|
| **HTTP** `mcp.bootpay.ai/mcp` | O | — | — | — | 9 |
| **HTTP** `mcp.bootpay.ai/commerce/mcp` | — | — | — | 원격 67 | 67 |
| **stdio** (`npx -y @bootpay/mcp@latest`) | O | O | O | 13 opt-in | 114 (opt-in 포함 126) |

두 HTTP 엔드포인트는 **같은 워커 하나**입니다. 배포·도메인·인증서를 하나로 두되 도구 목록만
가릅니다 — MCP 는 요청마다 도구 목록 전체를 모델에 실어 보내므로, 문서 9개와 커머스 67개를
한 목록에 합치면 매 턴 컨텍스트를 먹고 선택 정확도가 떨어집니다. 읽는 쪽 입장도 다릅니다.
연동하는 개발자에게 `commerce_add_cart_item` 은 잡음이고, 몰을 돌리는 에이전트에게
`get_csp_allowlist` 는 잡음입니다.

> stdio 의 `detect_project_stack` 은 `root_path` 로 로컬 파일시스템을 직접 훑습니다.
> HTTP 에서는 같은 도구가 노출되지만 파일을 볼 수 없으므로 `files`/`file_contents` 를 직접 넘겨야 합니다.

**Stack**: Cloudflare Workers + KV + MCP SDK + Streamable HTTP + stdio

---

## Links

- [Bootpay Developer Docs](https://developers.bootpay.ai)
- [Bootpay Admin](https://admin.bootpay.co.kr)
- [Bootpay Official](https://www.bootpay.ai)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [llms.txt](./llms.txt) — LLM-optimized documentation
- [사진과 설명으로 상품 올리기](./docs/product-registration-ko.md) — 판매자용 상품등록 가이드 (비개발자 대상)
- [원격 커넥터(ChatGPT · Claude) 연결](./docs/chatgpt-connector-ko.md) — OAuth 원격 연결 현황·검증 절차

---

## Keywords

Bootpay, 부트페이, Korean payment gateway, 한국 결제, PG 연동, payment integration, MCP server, Model Context Protocol, AI coding assistant, LLM, Claude, Cursor, Windsurf, Cline, GitHub Copilot, 나이스페이, NICE, 토스페이먼츠, Toss Payments, KG이니시스, KG Inicis, NHN KCP, 카카오페이, Kakao Pay, 네이버페이, Naver Pay, 페이코, PAYCO, 다날, Danal, 정기결제, recurring payment, billing key, 빌링키, subscription, 구독결제, 결제위젯, payment widget, 결제 연동, checkout, 간편결제, easy payment, Cloudflare Workers

### Commerce 호스팅 주문서 로그인 인계

자체 쇼핑몰에서 로그인한 회원이 Bootpay 주문서로 이동하는 연동은
[호스팅 로그인 인계 가이드](docs/commerce-hosted-login.md)를 따릅니다.
회원 Commerce JWT와 `use_auto_login: true`를 함께 전송하고, 호스팅 주문 상세에서
임시 토큰을 적용한 뒤 세션을 조회해야 합니다. `commerce_prepare_order`의 URL 응답은
`{order_number,url}`이며 호스팅 로그인 완료 여부를 뜻하지 않습니다.
