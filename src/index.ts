import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler } from 'agents/mcp';
import { z } from 'zod';
import type { Env } from './types.js';
import { getIndex, getDoc, getCsGuide } from './lib/kv.js';
import { searchDocs, searchCsGuide } from './lib/search.js';
import { instructions } from './instructions.js';

function createServer(env: Env) {
  const server = new McpServer(
    {
      name: 'Bootpay Developer Docs',
      version: '1.1.0',
    },
    {
      instructions,
    }
  );

  // ── search_docs ──
  server.tool(
    'search_docs',
    'Bootpay 개발자 문서를 검색합니다. 결제, 정기결제, 구독, 주문, 고객, 웹훅 등 모든 문서를 검색할 수 있습니다.',
    {
      query: z.string().describe('검색 키워드 (예: "결제 연동", "빌링키", "웹훅 설정")'),
      category: z.string().optional().describe('카테고리 필터 (payment, billing, subscription, order, customer, webhook, guide, integration, architecture, invoice, product, recipes)'),
      limit: z.number().optional().default(5).describe('결과 수 (기본 5)'),
    },
    async ({ query, category, limit }) => {
      const index = await getIndex(env.DOCS_KV);
      const results = searchDocs(index.docs, query, { category, limit });

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `"${query}"에 대한 검색 결과가 없습니다. 다른 키워드로 시도해 보세요.\n\n사용 가능한 카테고리: ${index.categories.join(', ')}`,
          }],
        };
      }

      const text = results.map((r, i) =>
        `${i + 1}. **${r.title}** (\`${r.path}\`)\n   ${r.snippet}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `${results.length}개 결과:\n\n${text}\n\n> 전체 내용을 보려면 get_doc 도구에 path를 전달하세요.`,
        }],
      };
    }
  );

  // ── get_doc ──
  server.tool(
    'get_doc',
    '특정 문서의 전체 내용을 마크다운으로 반환합니다.',
    {
      path: z.string().describe('문서 경로 (예: "payment/request", "billing/intro", "guide/keys")'),
    },
    async ({ path }) => {
      // 경로 정규화: 앞뒤 슬래시 제거
      const normalized = path.replace(/^\/+|\/+$/g, '');
      const content = await getDoc(env.DOCS_KV, normalized);

      if (!content) {
        const index = await getIndex(env.DOCS_KV);
        const suggestions = index.docs
          .filter(d => d.path.includes(normalized.split('/').pop() ?? ''))
          .slice(0, 5)
          .map(d => `  - ${d.path} (${d.title})`)
          .join('\n');

        return {
          content: [{
            type: 'text' as const,
            text: `"${normalized}" 문서를 찾을 수 없습니다.${suggestions ? `\n\n비슷한 문서:\n${suggestions}` : ''}`,
          }],
        };
      }

      return { content: [{ type: 'text' as const, text: content }] };
    }
  );

  // ── list_docs ──
  server.tool(
    'list_docs',
    '전체 문서 목록 또는 특정 카테고리의 문서 목록을 반환합니다.',
    {
      category: z.string().optional().describe('카테고리 필터 (생략하면 전체 목록)'),
    },
    async ({ category }) => {
      const index = await getIndex(env.DOCS_KV);
      let docs = index.docs;

      if (category) {
        docs = docs.filter(d => d.category === category);
        if (docs.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `"${category}" 카테고리를 찾을 수 없습니다.\n\n사용 가능한 카테고리: ${index.categories.join(', ')}`,
            }],
          };
        }
      }

      const grouped = new Map<string, typeof docs>();
      for (const doc of docs) {
        const cat = doc.category;
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(doc);
      }

      let text = `총 ${docs.length}개 문서`;
      if (category) text += ` (${category})`;
      text += `\n\n`;

      for (const [cat, catDocs] of grouped) {
        text += `## ${cat} (${catDocs.length})\n`;
        for (const doc of catDocs) {
          text += `- \`${doc.path}\` — ${doc.title}\n`;
        }
        text += '\n';
      }

      return { content: [{ type: 'text' as const, text }] };
    }
  );

  // ── get_setup_checklist ──
  server.tool(
    'get_setup_checklist',
    'Bootpay 연동에 필요한 환경 설정 체크리스트를 반환합니다. 연동 유형에 따라 필요한 키, 설정, SDK 설치 방법을 안내합니다.',
    {
      type: z
        .enum(['payment', 'commerce', 'all'])
        .optional()
        .default('payment')
        .describe('연동 유형: payment(결제만), commerce(커머스 기능), all(전체)'),
      platform: z
        .enum(['web', 'android', 'ios', 'flutter', 'react-native', 'all'])
        .optional()
        .default('all')
        .describe('플랫폼 (SDK 설치 안내용)'),
    },
    async ({ type, platform }) => {
      const sections: string[] = [];

      // ── 공통: 계정 & 프로젝트 ──
      sections.push(`# Bootpay 연동 체크리스트

## 1. 계정 & 프로젝트 준비
- [ ] [Bootpay 관리자](https://admin.bootpay.co.kr) 회원가입 완료
- [ ] 사업자 정보 등록 완료
- [ ] [프로젝트 생성](https://admin.bootpay.co.kr/project/new) 완료
- [ ] 사용할 PG사 활성화 ([결제 설정](https://admin.bootpay.co.kr/payment/setting))
- [ ] Sandbox / Production 환경 결정`);

      // ── 결제 API 키 ──
      if (type === 'payment' || type === 'all') {
        sections.push(`## 2. 결제 API 키 확인
[관리자 → 개발자 설정 → API 연동키 (결제)](https://admin.bootpay.co.kr/setting/developer?tab=api-key&cursor=payment)

| 키 | 용도 | 설정 위치 |
|----|------|-----------|
| **Application ID** | 프론트엔드 SDK에서 결제창 호출 | 클라이언트 코드 또는 \`.env\` |
| **REST API Application ID** | 서버에서 토큰 발급 | 서버 환경변수 |
| **Private Key** | 서버에서 토큰 발급 (비공개) | 서버 환경변수 |

- [ ] Application ID 확인 완료
- [ ] REST API Application ID 확인 완료
- [ ] Private Key 확인 완료

> ⚠️ **Private Key는 절대 프론트엔드 코드에 포함하지 마세요.**

### 환경변수 설정

**프론트엔드 (.env)** — 프레임워크에 맞는 변수명을 사용하세요
\`\`\`bash
# Vite (Vue, React, Svelte)
VITE_BOOTPAY_APP_ID=your_application_id

# Next.js
NEXT_PUBLIC_BOOTPAY_APP_ID=your_application_id

# Nuxt
NUXT_PUBLIC_BOOTPAY_APP_ID=your_application_id

# React (CRA)
REACT_APP_BOOTPAY_APP_ID=your_application_id

# SvelteKit
PUBLIC_BOOTPAY_APP_ID=your_application_id

# Remix / 기타
BOOTPAY_APP_ID=your_application_id
\`\`\`

**서버 (.env)**
\`\`\`bash
BOOTPAY_REST_APP_ID=your_rest_application_id
BOOTPAY_PRIVATE_KEY=your_private_key
\`\`\`

### 보안 체크
- [ ] \`.env\` 파일이 \`.gitignore\`에 포함되어 있는지 확인
- [ ] Private Key가 프론트엔드 번들에 포함되지 않는지 확인
- [ ] 환경변수가 올바르게 로드되는지 \`console.log\`로 테스트 (확인 후 제거)`);
      }

      // ── 커머스 API 키 ──
      if (type === 'commerce' || type === 'all') {
        sections.push(`## ${type === 'all' ? '3' : '2'}. 커머스 API 키 확인
[관리자 → 개발자 설정 → API 연동키 (커머스)](https://admin.bootpay.co.kr/setting/developer?tab=api-key&cursor=internal)

| 키 | 용도 | 설정 위치 |
|----|------|-----------|
| **Commerce Client Key** | 클라이언트 SDK에서 주문서 요청 | 클라이언트 코드 또는 \`.env\` |
| **Commerce Secret Key** | 서버에서 토큰 발급 (비공개) | 서버 환경변수 |

- [ ] Commerce Client Key 확인 완료
- [ ] Commerce Secret Key 확인 완료

**서버 (.env)**
\`\`\`bash
BOOTPAY_COMMERCE_CLIENT_KEY=your_commerce_client_key
BOOTPAY_COMMERCE_SECRET_KEY=your_commerce_secret_key
\`\`\``);
      }

      // ── SDK 설치 ──
      const sdkSection = [`## ${type === 'all' ? '4' : '3'}. SDK 설치

> SDK 버전을 임의로 추측하지 마세요. 아래 명령어를 그대로 사용하면 최신 버전이 설치됩니다.`];
      const clientSdks: Record<string, string> = {
        web: `**Web (NPM)**\n\`\`\`bash\nnpm install @bootpay/client-js\n\`\`\`\n\n**Web (CDN)**\n\`\`\`html\n<script src="https://js.bootpay.co.kr/bootpay-5.2.0.min.js"></script>\n\`\`\`\n\n**Web 위젯 (CDN)**\n\`\`\`html\n<script src="https://js.bootpay.co.kr/bootpay-widget-5.2.0.min.js"></script>\n\`\`\``,
        android: `**Android (build.gradle)**\n\`\`\`gradle\nimplementation 'kr.co.bootpay:android:+'\n\`\`\`\n\n> \`+\`를 사용하면 최신 버전이 자동 선택됩니다. 임의 버전 번호를 추측하지 마세요.`,
        ios: `**iOS (CocoaPods)**\n\`\`\`ruby\npod 'Bootpay'\n\`\`\``,
        flutter: `**Flutter**\n\`\`\`bash\nflutter pub add bootpay_flutter\n\`\`\``,
        'react-native': `**React Native**\n\`\`\`bash\nnpm install @bootpay/react-native-bootpay\ncd ios && pod install\n\`\`\``,
      };

      if (platform === 'all') {
        sdkSection.push('### 클라이언트 SDK');
        for (const sdk of Object.values(clientSdks)) sdkSection.push(sdk);
      } else if (clientSdks[platform]) {
        sdkSection.push('### 클라이언트 SDK');
        sdkSection.push(clientSdks[platform]);
      }

      if (type === 'payment' || type === 'all') {
        sdkSection.push(`### 서버 SDK (결제 검증용)
\`\`\`bash
npm install @bootpay/backend-js    # Node.js
pip install bootpay-backend        # Python
composer require bootpay/backend-php # PHP
\`\`\`

> Java: Maven/Gradle에 \`kr.co.bootpay:backend\` 추가
> Go: \`go get github.com/bootpay/backend-go\`
> Ruby: \`gem install bootpay\`
> .NET: \`dotnet add package Bootpay.BackendApi\``);
      }

      sections.push(sdkSection.join('\n\n'));

      // ── 연동 확인 ──
      const verifyNum = type === 'all' ? '5' : '4';
      sections.push(`## ${verifyNum}. 연동 확인

### 서버 토큰 발급 테스트
\`\`\`javascript
import { Bootpay } from '@bootpay/backend-js'

Bootpay.setConfiguration({
    application_id: process.env.BOOTPAY_REST_APP_ID,
    private_key: process.env.BOOTPAY_PRIVATE_KEY
})

const token = await Bootpay.getAccessToken()
console.log('토큰 발급 성공:', token)
\`\`\`

- [ ] 서버 토큰 발급 성공
- [ ] 클라이언트에서 결제창 호출 성공 (Sandbox)
- [ ] 결제 완료 → 서버 검증 성공

> 자세한 내용: \`get_doc\` 도구로 \`guide/keys\`, \`guide/setup\` 문서를 확인하세요.`);

      return {
        content: [{
          type: 'text' as const,
          text: sections.join('\n\n---\n\n'),
        }],
      };
    }
  );

  // ── get_troubleshooting ──
  server.tool(
    'get_troubleshooting',
    '연동 중 자주 발생하는 문제의 원인과 해결 방법을 안내합니다.',
    {
      topic: z
        .enum(['sandbox', 'webhook', 'billing', 'error', 'cors', 'mobile', 'widget'])
        .describe('문제 유형: sandbox(테스트 환경), webhook(웹훅 미수신), billing(정기결제), error(에러코드), cors(도메인), mobile(앱), widget(결제위젯)'),
    },
    async ({ topic }) => {
      const guides: Record<string, string> = {
        sandbox: `# 샌드박스(테스트 환경) 문제 해결

## 체크리스트

- [ ] **Application ID 확인**: Sandbox용 Application ID를 사용하고 있나요?
  - 관리자 → 개발자 설정 → 환경을 "Sandbox"로 전환 후 확인
  - Production ID와 Sandbox ID는 다릅니다
- [ ] **PG 활성화**: Sandbox에서도 PG사를 활성화해야 결제가 됩니다
  - 관리자 → 결제 설정 → Sandbox 환경에서 PG 활성화
- [ ] **테스트 카드**: 실제 카드가 아닌 테스트 카드로 결제하세요
  - Sandbox에서는 실제 출금이 발생하지 않습니다

## 자주 묻는 질문

**Q: Sandbox에서 결제가 안 돼요**
→ Sandbox용 Application ID를 사용하는지 확인하세요. Production ID로는 Sandbox 결제가 안 됩니다.

**Q: Sandbox에서 성공한 결제가 Production에서 실패해요**
→ Production 환경에서는 PG사 심사가 완료되어야 합니다. 관리자에서 PG 상태를 확인하세요.

**Q: 환경을 전환하려면?**
→ Application ID만 교체하면 됩니다. SDK 코드는 동일합니다.

> 자세한 내용: \`get_doc("guide/setup")\``,

        webhook: `# 웹훅 문제 해결

## 웹훅이 안 오는 경우 체크리스트

- [ ] **URL 등록 확인**: 관리자 → 개발자 설정 → 웹훅 URL이 등록되어 있나요?
- [ ] **HTTPS 필수**: 웹훅 URL은 반드시 HTTPS여야 합니다 (HTTP 불가)
- [ ] **응답 200**: 웹훅 수신 후 반드시 HTTP 200을 반환해야 합니다
  - 200이 아니면 재시도합니다 (최대 5회, 5분 간격)
- [ ] **방화벽/보안**: Bootpay 서버 IP가 차단되어 있지 않은지 확인
- [ ] **타임아웃**: 웹훅 수신 엔드포인트는 5초 이내에 응답해야 합니다

## 웹훅 디버깅

1. 관리자 → 결제 내역 → 해당 결제의 웹훅 로그 확인
2. 웹훅 URL로 직접 POST 요청을 보내 서버 도달 여부 확인
3. SSL 인증서가 유효한지 확인 (자체서명 인증서 불가)

## 웹훅 재시도 정책

| 시도 | 간격 |
|------|------|
| 1차 | 즉시 |
| 2차 | 5분 후 |
| 3차 | 10분 후 |
| 4차 | 30분 후 |
| 5차 | 1시간 후 |

5회 모두 실패하면 더 이상 재시도하지 않습니다.

> 자세한 내용: \`get_doc("webhook/overview")\``,

        billing: `# 정기결제(빌링) 문제 해결

## 빌링키 발급 실패

- [ ] **PG사 설정**: 정기결제를 지원하는 PG사가 활성화되어 있나요?
  - 모든 PG사가 정기결제를 지원하지는 않습니다
- [ ] **결제수단**: \`method\`를 \`"card_rebill"\`로 설정했나요?
- [ ] **카드 정보**: 테스트 환경에서는 테스트 카드를 사용하세요

## 자동결제 실패

- [ ] **빌링키 유효성**: 빌링키가 만료되거나 해지되지 않았는지 확인
- [ ] **한도 초과**: 카드 한도를 초과하면 결제가 실패합니다
- [ ] **카드 상태**: 분실/정지/해지된 카드는 결제 불가

## 빌링키 발급 흐름

\`\`\`
1. 프론트엔드: 빌링키 발급 요청 (method: "card_rebill")
2. 사용자: 카드 정보 입력
3. Bootpay → 서버: 빌링키(billing_key) 전달
4. 서버: 빌링키 저장
5. 이후: 서버에서 빌링키로 자동결제 요청
\`\`\`

> 자세한 내용: \`get_doc("billing/intro")\`, \`get_doc("billing/request")\``,

        error: `# 에러코드 문제 해결

## 자주 발생하는 에러

| 에러 코드 | 원인 | 해결 |
|-----------|------|------|
| **RC_INVALID_APPLICATION_ID** | 잘못된 Application ID | 관리자에서 올바른 ID 확인 |
| **RC_PAYMENT_NOT_FOUND** | 존재하지 않는 receipt_id | 결제 완료 후 받은 receipt_id 사용 |
| **RC_ALREADY_CANCELLED** | 이미 취소된 결제 | 결제 상태 먼저 확인 |
| **RC_INVALID_AMOUNT** | 금액 불일치 | 결제 요청 금액과 검증 금액 비교 |
| **RC_TOKEN_EXPIRED** | 토큰 만료 | 토큰 재발급 후 재시도 |
| **RC_PG_ERROR** | PG사 오류 | PG사 점검 상태 확인 |

## 에러 디버깅 순서

1. 에러 메시지에서 코드 확인
2. receipt_id로 관리자에서 결제 상태 조회
3. 서버 SDK 응답의 \`status\`, \`message\` 필드 확인
4. Sandbox에서 동일 시나리오 재현 테스트

## 결제 검증 실패 시

결제 검증(verify)에서 금액 불일치가 발생하면:
- 클라이언트에서 전달한 금액과 서버에서 설정한 금액이 일치하는지 확인
- PG사 응답의 실제 결제 금액을 기준으로 비교

> 자세한 내용: \`get_doc("integration/error-codes")\``,

        cors: `# CORS / 도메인 문제 해결

## 결제창이 안 열리는 경우

- [ ] **허용 도메인 등록**: 관리자 → 프로젝트 설정 → 허용 도메인에 현재 도메인이 등록되어 있나요?
  - 개발 환경: \`localhost:3000\` 등 등록 필요
  - 운영 환경: 실제 도메인 등록 필요
- [ ] **프로토콜 일치**: \`http://\`와 \`https://\`를 정확히 구분하여 등록
- [ ] **포트 포함**: 포트가 다르면 별도 도메인으로 등록 (예: \`localhost:3000\`과 \`localhost:5173\`은 별개)

## CORS 에러 메시지

\`\`\`
Access to script at 'https://js.bootpay.co.kr/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
\`\`\`

→ 관리자에서 \`localhost:3000\`을 허용 도메인에 추가하세요.

## 주의사항

- Sandbox와 Production은 별도로 도메인 등록이 필요합니다
- 와일드카드(\`*\`)는 지원하지 않습니다
- 서브도메인은 각각 등록해야 합니다 (\`www.example.com\`과 \`example.com\`은 별개)`,

        mobile: `# 모바일 앱 문제 해결

## 앱 스킴(App Scheme) 설정

결제 후 앱으로 돌아오려면 앱 스킴 설정이 필수입니다.

- [ ] **앱 스킴 등록**: 관리자 → 프로젝트 설정 → 앱 스킴 등록
- [ ] **SDK 설정**: 결제 요청 시 \`app_scheme\` 파라미터 설정
- [ ] **네이티브 설정**:
  - Android: \`AndroidManifest.xml\`에 intent-filter 추가
  - iOS: URL Scheme 또는 Universal Links 설정

## 인앱브라우저 이슈

일부 앱(카카오톡, 네이버 등)의 인앱브라우저에서는 결제가 제한될 수 있습니다:
- 해결: 외부 브라우저로 열기 또는 SDK의 \`extra.open_type\` 옵션 사용
- 카카오페이/네이버페이 등 앱 간 이동이 필요한 결제는 인앱브라우저에서 제한됨

## PG사 앱 결제 흐름

\`\`\`
1. 앱에서 결제 요청
2. PG사 결제창 (WebView)
3. 간편결제 앱 호출 (카카오페이 등)
4. 결제 완료
5. app_scheme으로 원래 앱 복귀
6. 서버 검증
\`\`\`

> 자세한 내용: 플랫폼별 SDK 가이드를 확인하세요
> \`search_docs("Android SDK")\` 또는 \`search_docs("iOS SDK")\``,

        widget: `# 결제위젯 문제 해결

## 위젯이 렌더링되지 않는 경우

- [ ] **CDN 스크립트**: 위젯 전용 CDN을 사용하고 있나요?
  - 기본: \`bootpay-5.x.x.min.js\`
  - 위젯: \`bootpay-widget-5.x.x.min.js\` (위젯 기능 포함)
- [ ] **렌더링 대상**: \`BootpayWidget.render('#selector', ...)\`의 selector가 DOM에 존재하나요?
- [ ] **초기화 순서**: DOM이 준비된 후 렌더링을 호출하세요

## 위젯 커스터마이징

- \`widget_key\`: 관리자에서 생성한 위젯 키 (기본: \`"default-widget"\`)
- \`widget_sandbox\`: 테스트 모드 (\`true\`로 설정하면 Sandbox)
- \`widget_use_terms\`: 약관 동의 UI 표시 여부

## 자주 묻는 질문

**Q: 위젯과 기본 결제창의 차이는?**
→ 위젯은 페이지에 임베드되는 UI, 기본 결제창은 팝업/리다이렉트 방식입니다.

**Q: 위젯 스타일을 변경할 수 있나요?**
→ 관리자에서 위젯 테마를 설정할 수 있습니다. CSS 직접 수정은 지원하지 않습니다.

> 자세한 내용: \`get_doc("payment/widget")\``,
      };

      return {
        content: [{
          type: 'text' as const,
          text: guides[topic] ?? `"${topic}"에 대한 트러블슈팅 가이드가 없습니다.`,
        }],
      };
    }
  );

  // ── get_cs_guide ──
  server.tool(
    'get_cs_guide',
    'Bootpay 고객응대 매뉴얼을 조회합니다. 섹션을 지정하면 해당 부분만 반환합니다.',
    {
      section: z.string().optional().describe('검색할 섹션 키워드 (예: "PG 심사", "사업자 변경", "결제 취소"). 생략하면 전체 반환.'),
    },
    async ({ section }) => {
      const guide = await getCsGuide(env.DOCS_KV);
      if (!guide) {
        return { content: [{ type: 'text' as const, text: 'CS 가이드가 아직 등록되지 않았습니다.' }] };
      }

      const result = searchCsGuide(guide, section);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  // ── MCP Prompt: 연동 액션 플랜 ──
  server.prompt(
    'integration-action-plan',
    '결제 연동을 위한 단계별 액션 플랜을 생성합니다. 결제 유형과 플랫폼을 지정하면 맞춤 체크리스트를 제공합니다.',
    {
      type: z.enum(['일반결제', '정기결제', '주문서', '구독']).describe('연동하려는 결제 유형'),
      platform: z.enum(['web', 'android', 'ios', 'flutter', 'react-native']).describe('개발 플랫폼'),
      server_language: z.enum(['nodejs', 'python', 'php', 'java', 'go', 'ruby', 'dotnet']).optional().describe('서버 언어 (기본: nodejs)'),
    },
    async ({ type, platform, server_language }) => {
      const lang = server_language ?? 'nodejs';

      const platformLabels: Record<string, string> = {
        web: 'Web (JavaScript)',
        android: 'Android (Java/Kotlin)',
        ios: 'iOS (Swift)',
        flutter: 'Flutter (Dart)',
        'react-native': 'React Native (TypeScript)',
      };

      const serverSdkInstall: Record<string, string> = {
        nodejs: 'npm install @bootpay/backend-js',
        python: 'pip install bootpay-backend',
        php: 'composer require bootpay/backend-php',
        java: 'Maven/Gradle에 kr.co.bootpay:backend 의존성 추가',
        go: 'go get github.com/bootpay/backend-go',
        ruby: 'gem install bootpay',
        dotnet: 'dotnet add package Bootpay.BackendApi',
      };

      const clientSdkInstall: Record<string, string> = {
        web: 'npm install @bootpay/client-js\n# 또는 CDN: <script src="https://js.bootpay.co.kr/bootpay-5.2.0.min.js"></script>',
        android: "implementation 'kr.co.bootpay:android:+'  // build.gradle",
        ios: "pod 'Bootpay'  // Podfile → pod install",
        flutter: 'flutter pub add bootpay_flutter',
        'react-native': 'npm install @bootpay/react-native-bootpay\ncd ios && pod install',
      };

      const typeConfig: Record<string, { apiDomain: string; docPaths: string[]; description: string }> = {
        '일반결제': {
          apiDomain: 'api.bootpay.co.kr',
          docPaths: ['payment/request', 'payment/verify', 'payment/cancel'],
          description: '단건 결제 — 사용자가 결제창에서 직접 결제',
        },
        '정기결제': {
          apiDomain: 'api.bootpay.co.kr',
          docPaths: ['billing/intro', 'billing/request', 'billing/auto-pay'],
          description: '빌링키 발급 → 서버에서 자동결제 반복',
        },
        '주문서': {
          apiDomain: 'api.bootapi.com',
          docPaths: ['order/intro', 'order/create', 'order/payment'],
          description: 'Commerce API 주문 생성 → 결제 연동',
        },
        '구독': {
          apiDomain: 'api.bootapi.com',
          docPaths: ['subscription/intro', 'subscription/plan', 'subscription/create'],
          description: 'Commerce API 구독 플랜 → 자동 과금 관리',
        },
      };

      const config = typeConfig[type];

      const plan = `# ${type} 연동 액션 플랜

> **플랫폼**: ${platformLabels[platform]} | **서버**: ${lang} | **API**: \`${config.apiDomain}\`
> ${config.description}

---

## Phase 1: 프로젝트 설정

- [ ] [Bootpay 관리자](https://admin.bootpay.co.kr) 회원가입
- [ ] 사업자 정보 등록
- [ ] 프로젝트 생성
- [ ] PG사 활성화 (결제 설정 → 사용할 PG 선택)
- [ ] Sandbox 환경에서 시작 (테스트 완료 후 Production 전환)

### API 키 확인
관리자 → 개발자 설정 → API 연동키

| 키 | 용도 |
|----|------|
| Application ID | 클라이언트 SDK (${platformLabels[platform]}) |
| REST Application ID | 서버 토큰 발급 (${lang}) |
| Private Key | 서버 토큰 발급 (비공개) |${type === '주문서' || type === '구독' ? '\n| Commerce Client Key | 커머스 SDK |\n| Commerce Secret Key | 커머스 서버 API |' : ''}

---

## Phase 2: 개발 환경 설정

### 서버 환경변수 (.env)
\`\`\`bash
BOOTPAY_REST_APP_ID=your_rest_application_id
BOOTPAY_PRIVATE_KEY=your_private_key${type === '주문서' || type === '구독' ? '\nBOOTPAY_COMMERCE_CLIENT_KEY=your_commerce_client_key\nBOOTPAY_COMMERCE_SECRET_KEY=your_commerce_secret_key' : ''}
\`\`\`

### 클라이언트 환경변수 (.env)
\`\`\`bash
# 프레임워크에 맞는 변수명 사용
# Vite:          VITE_BOOTPAY_APP_ID=your_application_id
# Next.js:       NEXT_PUBLIC_BOOTPAY_APP_ID=your_application_id
# React (CRA):   REACT_APP_BOOTPAY_APP_ID=your_application_id
# Nuxt:          NUXT_PUBLIC_BOOTPAY_APP_ID=your_application_id
# SvelteKit:     PUBLIC_BOOTPAY_APP_ID=your_application_id
# Flutter:       .env 또는 Dart 상수 파일에 정의
# Android/iOS:   BuildConfig 또는 plist에 정의
\`\`\`

### SDK 설치
\`\`\`bash
# 클라이언트 (${platformLabels[platform]})
${clientSdkInstall[platform]}

# 서버 (${lang})
${serverSdkInstall[lang]}
\`\`\`

### 보안 체크
- [ ] \`.env\` 파일이 \`.gitignore\`에 포함되어 있는지 확인
- [ ] Private Key가 프론트엔드 코드에 포함되지 않는지 확인
- [ ] 환경변수가 올바르게 로드되는지 확인 (\`console.log\`로 테스트)

---

## Phase 3: ${type === '일반결제' || type === '정기결제' ? '결제 요청 구현 (프론트엔드)' : '핵심 기능 구현'}

${type === '일반결제' ? `- [ ] SDK 초기화 (Application ID 설정)
- [ ] 결제 요청 파라미터 구성 (order_name, price, order_id 등)
- [ ] 결제 완료 콜백에서 receipt_id 수신
- [ ] receipt_id를 서버로 전달하여 검증 요청` : ''}${type === '정기결제' ? `- [ ] SDK 초기화 (Application ID 설정)
- [ ] 빌링키 발급 요청 (method: "card_rebill")
- [ ] 발급 완료 콜백에서 billing_key 수신
- [ ] billing_key를 서버로 전달하여 저장` : ''}${type === '주문서' ? `- [ ] Commerce SDK 초기화
- [ ] 상품 등록 (Commerce API)
- [ ] 주문 생성 (Commerce API)
- [ ] 주문에 결제 연동` : ''}${type === '구독' ? `- [ ] Commerce SDK 초기화
- [ ] 구독 플랜 생성 (Commerce API)
- [ ] 고객 등록
- [ ] 구독 시작 (빌링키 연동)` : ''}

> 📖 관련 문서: ${config.docPaths.map(p => `\`get_doc("${p}")\``).join(', ')}

---

## Phase 4: 서버 검증 구현 (백엔드)

- [ ] 서버 SDK 초기화 (REST Application ID + Private Key)
- [ ] 토큰 발급 (\`getAccessToken()\`)
${type === '일반결제' ? `- [ ] 결제 검증 — receipt_id로 결제 내역 조회
- [ ] 금액 비교 — 요청 금액과 실제 결제 금액 일치 확인
- [ ] 결제 상태 확인 — status가 1(완료)인지 확인
- [ ] 검증 실패 시 자동 취소 로직 구현` : ''}${type === '정기결제' ? `- [ ] 빌링키 저장 (DB에 암호화 저장)
- [ ] 자동결제 API 호출 — billing_key + 금액 + 주문정보
- [ ] 결제 결과 확인 및 처리
- [ ] 스케줄러 설정 (매월/매주 자동결제)
- [ ] 결제 실패 시 재시도 로직` : ''}${type === '주문서' ? `- [ ] Commerce API 토큰 발급
- [ ] 주문 상태 관리 (생성 → 결제 → 배송 → 완료)
- [ ] 취소/반품 처리
- [ ] 주문 조회 API 구현` : ''}${type === '구독' ? `- [ ] Commerce API 토큰 발급
- [ ] 구독 상태 관리 (활성 → 일시정지 → 해지)
- [ ] 과금 내역 조회
- [ ] 구독 갱신/해지 처리` : ''}

---

## Phase 5: 웹훅 연동

- [ ] 웹훅 수신 엔드포인트 구현 (POST)
- [ ] HTTPS URL 준비 (HTTP 불가)
- [ ] 관리자에서 웹훅 URL 등록
- [ ] 웹훅 데이터 검증 (receipt_id로 결제 내역 재확인)
- [ ] 응답 HTTP 200 반환 (5초 이내)
- [ ] 웹훅 실패 시 재시도 대비 멱등성 처리

> 📖 관련 문서: \`get_doc("webhook/overview")\`

---

## Phase 6: 테스트 & 검증

### Sandbox 테스트
- [ ] 결제 성공 시나리오
- [ ] 결제 실패 시나리오 (잔액 부족, 카드 오류)
- [ ] 결제 취소 시나리오
- [ ] 웹훅 수신 확인
${type === '정기결제' ? '- [ ] 빌링키 발급 → 자동결제 → 해지 전체 흐름' : ''}${type === '구독' ? '- [ ] 구독 생성 → 과금 → 갱신 → 해지 전체 흐름' : ''}

### Production 전환
- [ ] Production Application ID로 교체
- [ ] PG사 심사 완료 확인
- [ ] 실제 카드로 소액 테스트 (1,000원 결제 → 즉시 취소)
- [ ] 웹훅 URL Production 환경으로 변경
- [ ] 에러 모니터링 설정

---

## 관련 문서 바로가기

${config.docPaths.map(p => `- \`get_doc("${p}")\``).join('\n')}
- \`get_doc("webhook/overview")\` — 웹훅 설정
- \`get_doc("guide/keys")\` — API 키 발급
- \`get_troubleshooting("sandbox")\` — 테스트 환경 문제 해결`;

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: plan,
          },
        }],
      };
    }
  );

  return server;
}

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        name: 'Bootpay Developer Docs MCP',
        status: 'ok',
        endpoint: '/mcp',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // MCP endpoint
    if (url.pathname === '/mcp') {
      // Accept 헤더가 없거나 부족한 클라이언트 보정
      // Streamable HTTP 프로토콜은 text/event-stream을 요구함
      const accept = req.headers.get('Accept') ?? '';
      if (req.method === 'POST' && !accept.includes('text/event-stream')) {
        const headers = new Headers(req.headers);
        headers.set('Accept', 'application/json, text/event-stream');
        req = new Request(req, { headers });
      }

      const server = createServer(env);
      const handler = createMcpHandler(server);
      return handler(req, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  },
};
