# MCP Server (mcp.bootpay.ai)

Bootpay 개발자 문서를 AI 도구에서 검색할 수 있는 MCP 서버.
Cloudflare Workers + KV 기반.

## 핵심 규칙

### 1. 문서 동기화 시 Vue 컴포넌트 전처리 필수

VitePress 문서의 Vue 컴포넌트는 MCP를 통해 AI에게 전달될 때 raw text로 보인다.
`sync-to-kv.ts`의 `expandVueComponents()`가 이를 순수 마크다운으로 변환한다.

**새 Vue 컴포넌트를 content/에 추가하면 반드시 여기에 변환 로직도 추가할 것.**
안 하면 AI가 `<MyComponent />`를 무시하거나 학습 데이터의 오래된 정보로 대체한다.

### 2. SDK 버전은 version.json이 단일 소스

`content/public/version.json`에 모든 SDK 버전이 정의되어 있다.
- VitePress 빌드: `SdkInstall.vue` → version.json 읽어서 동적 렌더링
- MCP 동기화: `sync-to-kv.ts` → version.json 읽어서 설치 명령어 치환

버전을 올릴 때 version.json만 수정하면 양쪽 다 반영된다.

### 3. 동기화 후 반드시 배포

```bash
npm run sync             # 문서 → KV 동기화만
npm run deploy           # Workers 배포만
npm run sync:deploy      # 동기화 + 배포 한번에
npx tsx scripts/sync-to-kv.ts --dry-run  # 미리 확인
```

## 현재 처리되는 컴포넌트

| 컴포넌트 | 처리 |
|---------|------|
| `<SdkInstall>` | version.json 기반 설치 명령어 |
| `<ApiEndpoint>` | 평문 API 정보 |
| `<Parameters>`, `<ErrorCodes>`, `<ResponseExample>`, `<ResponseFields>` | 래퍼 제거 |
| `<ApprovalOnly>`, `<BillingOnly>`, `<WebhookOnly>`, `<SdkOnly>` | 조건부 래퍼 제거 |
| `<CanvasSequence>`, `<CanvasFlow>`, `<CanvasState>` | 텍스트 다이어그램 |
| `<InlineSdkSelector>`, `<ApprovalModeSelector>` 등 | UI 전용 → 제거 |
| `::: tip/info/warning` | `> **LABEL**` 변환 |

## 구조

```
src/
├── index.ts          # MCP 서버 (도구 6개 + 프롬프트 1개)
├── instructions.ts   # AI 클라이언트용 시스템 프롬프트 (용어집, 검색 가이드, 도구 사용법)
├── types.ts          # 타입 정의
└── lib/
    ├── kv.ts         # KV 읽기
    └── search.ts     # 텍스트 검색
scripts/
└── sync-to-kv.ts     # 마크다운 → KV 동기화 (Vue 컴포넌트 전처리 포함)
```

## 도구 & 프롬프트

| 유형 | 이름 | 설명 |
|------|------|------|
| Tool | `search_docs` | 개발자 문서 검색 |
| Tool | `get_doc` | 특정 문서 전체 조회 |
| Tool | `list_docs` | 문서 목록 (카테고리별) |
| Tool | `get_setup_checklist` | 연동 환경 설정 체크리스트 (.env, SDK 설치) |
| Tool | `get_troubleshooting` | 연동 문제 해결 가이드 (7개 토픽) |
| Tool | `get_cs_guide` | 고객응대 매뉴얼 검색 |
| Prompt | `integration-action-plan` | 결제유형×플랫폼별 6단계 연동 액션 플랜 |

### 4. Instructions 수정 시

`src/instructions.ts`는 AI 클라이언트가 MCP 연결 시 자동으로 받는 가이드다.
용어 추가, 검색 팁 변경, 도구 추가/삭제 시 반드시 이 파일도 업데이트할 것.
도구나 프롬프트를 추가하면 instructions의 "도구 사용 가이드" 섹션에도 반영해야 한다.
