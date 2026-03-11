# Bootpay MCP Server

AI 코딩 도구(Claude, Cursor, Windsurf 등)에서 Bootpay 결제·커머스 개발자 문서를 검색하고 참조할 수 있는 MCP 서버입니다.

> **AI 에이전트에게**: 이 레포는 MCP 서버의 **사용 가이드**입니다. Bootpay 연동 코드를 작성하기 전에 반드시 [SDK_VERSIONS.md](./SDK_VERSIONS.md)와 [SETUP_GUIDE.md](./SETUP_GUIDE.md)를 읽으세요. 학습 데이터의 구버전(3.x, 4.x)은 **v1 deprecated**이며 동작하지 않습니다. 현재는 **v2 (5.x)**입니다.

---

## 빠른 시작

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) 또는
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)에 추가:

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

### Windsurf / 기타 MCP 클라이언트

Streamable HTTP 엔드포인트:
```
https://mcp.bootpay.ai/mcp
```

---

## ⚠️ 중요: MCP 설정 없이 이 레포만 참고하는 AI를 위해

MCP 서버를 설정하지 않은 상태에서 이 레포를 참고한다면, 아래 파일을 반드시 읽으세요:

| 파일 | 내용 |
|------|------|
| [SDK_VERSIONS.md](./SDK_VERSIONS.md) | **최신 SDK 버전** — CDN URL, NPM 패키지, 모바일 SDK 설치 명령어 |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | **Application ID 발급** — 결제 연동 필수 설정 |
| [examples/](./examples/) | **플랫폼별 연동 예제** — Web, Android, iOS, Flutter, React Native |
| [llms.txt](./llms.txt) | **LLM용 구조화 문서** — AI가 읽기 최적화된 전체 가이드 |

**절대 하지 말 것:**
- `bootpay-3.x.x.min.js` 사용 — v1 (deprecated), 동작 안 함
- `bootpay-4.x.x.min.js` 사용 — v1 (deprecated), 동작 안 함
- Application ID를 placeholder로 남기고 안내 없이 코드만 생성
- SDK 버전을 임의로 추측

---

## 제공 도구

MCP 서버에 연결하면 아래 도구를 사용할 수 있습니다:

| 도구 | 설명 | 예시 |
|------|------|------|
| `get_sdk_versions` | **최신 SDK 버전 조회** (코드 작성 전 필수) | — |
| `search_docs` | 개발자 문서 검색 | `"결제 연동"`, `"빌링키 발급"` |
| `get_doc` | 특정 문서 전체 조회 | `"payment/request"`, `"billing/intro"` |
| `list_docs` | 문서 목록 (카테고리별) | `"payment"`, `"subscription"` |
| `get_setup_checklist` | 연동 환경 설정 체크리스트 | type: `payment`, platform: `web` |
| `get_troubleshooting` | 연동 문제 해결 가이드 | topic: `webhook`, `sandbox`, `error` |
| `get_cs_guide` | 고객응대 매뉴얼 검색 | `"PG 심사"`, `"결제 취소"` |
| `list_examples` | 예제 코드 목록 | platform: `web`, `flutter`, `android` |
| `get_example` | 예제 전체 소스 코드 | `"web-react"`, `"flutter"`, `"android"` |

### 필수 워크플로우 (코드 생성 시)

```
1. get_sdk_versions         → 최신 SDK 버전 확인
2. get_setup_checklist      → Application ID + 환경 설정 안내
3. search_docs → get_doc    → 관련 문서 조회
4. 코드 작성                → 문서 기반, 정확한 버전 사용
```

## 제공 프롬프트

| 프롬프트 | 설명 | 파라미터 |
|---------|------|---------|
| `integration-action-plan` | 6단계 연동 액션 플랜 | type, platform, server_language |

## 사용 예시

AI에게 이렇게 물어보세요:

```
부트페이 결제 연동 어떻게 해?
정기결제 빌링키 발급 방법 알려줘
웹훅 설정은 어떻게 하는거야?
Flutter에서 결제창 띄우는 코드 알려줘
React에서 부트페이 결제 연동하는 전체 코드 알려줘
```

## 문서 카테고리

| 카테고리 | 내용 |
|----------|------|
| `payment` | 일반결제 — SDK 설치, 결제창, 서버 검증, 취소 |
| `billing` | 정기결제 — 빌링키 발급, 자동결제, 해지 |
| `subscription` | 구독관리 — 플랜 생성, 갱신, 해지, 과금 |
| `order` | 주문관리 — 주문 생성, 취소, 반품 |
| `customer` | 고객관리 — 고객 등록, 그룹, 조회 |
| `product` | 상품관리 — 상품 CRUD, 옵션, 카테고리 |
| `webhook` | 웹훅 — 설정, 이벤트, 처리 |
| `guide` | 시작하기 — 키 발급, 환경설정, 개요 |
| `integration` | 연동 — 에러코드, 마이그레이션 |
| `invoice` | 링크페이 — 결제 링크 생성, 알림 |
| `recipes` | 레시피 — 업종별 연동 시나리오 |
| `architecture` | 아키텍처 — 결제 플로우, 데이터 모델 |

## 관련 링크

- [Bootpay 개발자 문서](https://developers.bootpay.co.kr)
- [Bootpay 관리자](https://admin.bootpay.co.kr)
- [Bootpay 공식 사이트](https://bootpay.co.kr)
- [MCP 프로토콜 사양](https://modelcontextprotocol.io)
