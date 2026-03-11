# Bootpay Developer Docs MCP Server

AI 코딩 도구(Claude, Cursor, Windsurf 등)에서 Bootpay 결제·커머스 개발자 문서를 바로 검색하고 참조할 수 있는 MCP 서버입니다.

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

## 제공 도구

| 도구 | 설명 | 예시 |
|------|------|------|
| `search_docs` | 개발자 문서 검색 | `"결제 연동"`, `"빌링키 발급"` |
| `get_doc` | 특정 문서 전체 조회 | `"payment/request"`, `"billing/intro"` |
| `list_docs` | 문서 목록 (카테고리별) | `"payment"`, `"subscription"` |
| `get_setup_checklist` | 연동 환경 설정 체크리스트 | type: `payment`, platform: `web` |
| `get_troubleshooting` | 연동 문제 해결 가이드 | topic: `webhook`, `sandbox`, `error` |
| `get_cs_guide` | 고객응대 매뉴얼 검색 | `"PG 심사"`, `"결제 취소"` |

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
```

## 문서 카테고리

| 카테고리 | 내용 | 문서 수 |
|----------|------|---------|
| `payment` | 일반결제 (SDK, 결제창, 검증) | 25 |
| `billing` | 정기결제 (빌링키, 자동결제) | 11 |
| `subscription` | 구독관리 (플랜, 갱신, 해지) | 23 |
| `order` | 주문관리 (생성, 취소, 반품) | 11 |
| `customer` | 고객관리 (등록, 그룹, 조회) | 13 |
| `webhook` | 웹훅 설정 및 처리 | 3 |
| `guide` | 시작하기 (키 발급, 환경설정) | 7 |
| `integration` | 연동 (에러코드, 마이그레이션) | 9 |
| `architecture` | 아키텍처 (플로우, 데이터모델) | 5 |
| `invoice` | 링크페이 (생성, 알림) | 5 |
| `product` | 상품관리 (CRUD) | 5 |
| `recipes` | 레시피 (쇼핑몰, SaaS, 디지털) | 3 |

## 기술 스택

- **런타임**: Cloudflare Workers
- **스토리지**: Cloudflare KV
- **프로토콜**: MCP (Streamable HTTP)
- **SDK**: `@modelcontextprotocol/sdk` + `agents` (Cloudflare)

## 관련 링크

- [Bootpay 개발자 문서](https://developers.bootpay.co.kr)
- [Bootpay 공식 사이트](https://bootpay.co.kr)
- [MCP 프로토콜 사양](https://modelcontextprotocol.io)
