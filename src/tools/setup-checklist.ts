import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocsProvider } from '../data/provider.js';
import { getClientEnvGuide, getServerTokenExample } from './helpers.js';
import { CLIENT_PLATFORMS, CLIENT_SDKS, SERVER_SDKS, allServerInstalls, type ServerLanguage } from '../sdk/registry.js';

export function registerSetupChecklistTool(server: McpServer, provider: DocsProvider): void {
  server.tool(
    'get_setup_checklist',
    '⚠️ 결제 연동 시에는 이 도구보다 get_integration_context를 먼저 호출하세요. Admin 도구가 있으면 실제 프로젝트 설정을 자동으로 확인합니다. 이 도구는 수동 설정 체크리스트용입니다.',
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
      server_language: z
        .enum(['nodejs', 'python', 'php', 'java', 'go', 'ruby', 'dotnet'])
        .optional()
        .default('nodejs')
        .describe('서버 언어 (Basic Auth 초기화 예제용)'),
    },
    async ({ type, platform, server_language }) => {
      const v = await provider.getSdkVersions();
      const serverLang = server_language as ServerLanguage;
      const sections: string[] = [];

      sections.push(`# Bootpay 연동 체크리스트

## 1. 계정 & 프로젝트 준비

**Admin CLI (stdio 모드) — AI가 자동 처리:**
\`\`\`
browser_login              → 로그인
create_seller              → 셀러 생성 + 기본 프로젝트 자동 생성
browser_select_project     → 프로젝트 선택
activate_payment_method    → PG 결제수단 활성화
set_sandbox_mode           → 테스트 모드 설정
\`\`\`

**수동 설정 (MCP HTTP 모드 또는 MCP 없는 환경):**
- [ ] [Bootpay 관리자](https://admin.bootpay.co.kr) 회원가입 완료
- [ ] 사업자 정보 등록 완료
- [ ] [프로젝트 생성](https://admin.bootpay.co.kr/project/new) 완료
- [ ] 사용할 PG사 활성화 ([결제 설정](https://admin.bootpay.co.kr/payment/setting))
- [ ] Sandbox / Production 환경 결정

> ⚠️ **Client Key 미설정은 가장 흔한 연동 실패 원인입니다.**
> stdio 모드에서는 \`list_keychains\`로 자동 조회됩니다.
> Sandbox와 Production의 Client Key는 다릅니다.`);

      if (type === 'payment' || type === 'all') {
        const clientEnvGuide = getClientEnvGuide(platform);

        sections.push(`## 2. 결제 API 키 확인

**stdio 모드:** \`list_keychains\` 도구를 호출하면 아래 키가 자동 조회됩니다.
**수동:** [관리자 → 개발자 설정 → API 연동키 (결제)](https://admin.bootpay.co.kr/setting/developer?tab=api-key&cursor=payment)

| 키 | 용도 | 설정 위치 |
|----|------|-----------|
| **Client Key** | 프론트엔드 SDK 결제창 호출 + 서버 Basic Auth 공통 | ${platform === 'android' ? 'BuildConfig 또는 local.properties / 서버 환경변수' : platform === 'ios' ? 'xcconfig 또는 Info.plist / 서버 환경변수' : platform === 'flutter' ? '--dart-define 또는 .env / 서버 환경변수' : platform === 'react-native' ? '.env (react-native-config) / 서버 환경변수' : '클라이언트 `.env` / 서버 환경변수'} |
| **Secret Key** | 서버 Basic Auth 인증 (비공개) | 서버 환경변수 |

- [ ] Client Key 확인 완료
- [ ] Secret Key 확인 완료

> ⚠️ **Secret Key는 절대 프론트엔드 코드에 포함하지 마세요.**

### 클라이언트 환경변수 설정

${clientEnvGuide}

**서버 (.env)**
\`\`\`bash
BOOTPAY_CLIENT_KEY=          # create_keychain 또는 list_keychains로 조회
BOOTPAY_SECRET_KEY=          # create_keychain으로 발급 (1회만 평문 확인 가능)
# 서버 인증: Authorization: Basic Base64(clientKey:secretKey)
\`\`\`

### 보안 체크
- [ ] 환경변수/설정 파일이 \`.gitignore\`에 포함되어 있는지 확인
- [ ] Secret Key가 클라이언트 코드에 포함되지 않는지 확인
- [ ] 환경변수가 올바르게 로드되는지 테스트 (확인 후 제거)`);
      }

      if (type === 'commerce' || type === 'all') {
        sections.push(`## ${type === 'all' ? '3' : '2'}. 커머스 API 키 확인

**stdio 모드:** \`list_keychains\` 도구를 호출하면 아래 키가 자동 조회됩니다.
**수동:** [관리자 → 개발자 설정 → API 연동키 (커머스)](https://admin.bootpay.co.kr/setting/developer?tab=api-key&cursor=internal)

| 키 | 용도 | 설정 위치 |
|----|------|-----------|
| **Commerce Client Key** | 클라이언트 SDK에서 주문서 요청 | 클라이언트 코드 또는 \`.env\` |
| **Commerce Secret Key** | 서버에서 토큰 발급 (비공개) | 서버 환경변수 |

- [ ] Commerce Client Key 확인 완료
- [ ] Commerce Secret Key 확인 완료

**서버 (.env)**
\`\`\`bash
BOOTPAY_COMMERCE_CLIENT_KEY=         # list_keychains로 조회
BOOTPAY_COMMERCE_SECRET_KEY=         # list_keychains로 조회
\`\`\``);
      }

      const sdkSection = [`## ${type === 'all' ? '4' : '3'}. SDK 설치

> SDK 버전을 임의로 추측하지 마세요. 아래 명령어를 그대로 사용하면 최신 버전이 설치됩니다.`];
      const jsVer = v.js || '5.3.0';

      // 패키지 좌표는 src/sdk/registry.ts 가 단일 소스
      const clientSdks: Record<string, string> = {
        ...Object.fromEntries(CLIENT_PLATFORMS.map((p) => [
          p,
          `**${CLIENT_SDKS[p].label}**\n\`\`\`bash\n${CLIENT_SDKS[p].install(v)}\n\`\`\``,
        ])),
        web: `**Web (NPM)**\n\`\`\`bash\nnpm install @bootpay/client-js\n\`\`\`\n\n**Web (CDN)**\n\`\`\`html\n<script src="https://js.bootpay.co.kr/bootpay-${jsVer}.min.js"></script>\n\`\`\`\n\n**Web 위젯 (CDN)**\n\`\`\`html\n<script src="https://js.bootpay.co.kr/bootpay-widget-${jsVer}.min.js"></script>\n\`\`\``,
      };

      if (platform === 'all') {
        sdkSection.push('### 클라이언트 SDK');
        for (const sdk of Object.values(clientSdks)) sdkSection.push(sdk);
      } else if (clientSdks[platform]) {
        sdkSection.push('### 클라이언트 SDK');
        sdkSection.push(clientSdks[platform]);
      }

      if (type === 'payment' || type === 'all') {
        sdkSection.push(`### 서버 SDK (결제 검증용) — \`${SERVER_SDKS[serverLang].label}\`
\`\`\`bash
${SERVER_SDKS[serverLang].install}
\`\`\`

> 서버 언어는 클라이언트 플랫폼과 별개입니다. 다른 언어를 쓴다면 아래에서 고르세요.

\`\`\`bash
${allServerInstalls(v)}
\`\`\``);
      }

      sections.push(sdkSection.join('\n\n'));

      const unifiedNum = type === 'all' ? '5' : '4';
      sections.push(`## ${unifiedNum}. 결제창 유형 선택

### 통합결제창 vs 단일 결제창

| 구분 | pg/method 파라미터 | 동작 |
|------|:------------------:|------|
| **통합결제창** | **생략** | 관리자에서 활성화한 모든 PG·결제수단을 하나의 창에 표시 → 사용자 선택 |
| **단일 결제창** | **지정** | 지정한 PG·결제수단으로 바로 이동 |

- **통합결제창 사용 조건**: 관리자에서 **2개 이상의 결제수단을 활성화**
- **코드 차이**: \`requestPayment()\`에서 \`pg\`와 \`method\`를 생략하면 통합결제창, 지정하면 단일 결제창
- 결제수단이 1개만 활성화된 경우: 통합결제창 없이 해당 결제수단으로 바로 이동

\`\`\`javascript
// 통합결제창 (pg, method 생략)
await Bootpay.requestPayment({
  client_key: 'CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_123',
  extra: { separately_confirmed: true },  // 🔴 서버승인(분리승인) — 기본
})

// 단일 결제창 (pg, method 지정)
await Bootpay.requestPayment({
  client_key: 'CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_123',
  pg: 'nicepay',
  method: 'card',
  extra: { separately_confirmed: true },  // 🔴 서버승인(분리승인) — 기본
})
\`\`\`

### 승인 방식 (서버승인이 기본)

- [ ] \`extra.separately_confirmed: true\` 설정 (서버승인)
- [ ] confirm 시점에 receipt_id를 서버 \`/api/confirm\`으로 전달하는 코드
- [ ] 서버에서 \`confirmPayment()\` 호출 후 리턴값(status·price)을 DB 주문 금액과 대조
- [ ] 금액 불일치 시 \`cancelPayment\` 자동 취소

> 자세한 예제: \`get_doc\` 도구로 \`examples/unified-payment\` 참조`);

      const verifyNum = type === 'all' ? '6' : '5';
      sections.push(`## ${verifyNum}. 연동 확인

### 서버 토큰 발급 테스트
${getServerTokenExample(server_language)}

- [ ] 서버 인증(Basic Auth) 성공
- [ ] 클라이언트에서 결제창 호출 성공 (Sandbox)
- [ ] confirm → 서버 \`confirmPayment()\` 승인 → 리턴값 검증 성공

### 웹훅 (운영 필수)

- [ ] 웹훅 수신 엔드포인트 구현 (POST, HTTPS)
- [ ] 관리자 → 개발자 설정 → 웹훅 설정에 URL 등록
- [ ] 부트페이 발신 IP 대역 \`223.130.82.0/24\`만 허용 (그 외 403)
- [ ] 응답: HTTP 200 + 본문 \`{ "success": true }\` (둘 다 필수)
- [ ] \`receiptPayment\`로 payload 재검증 + receipt_id 기준 멱등 처리

> 자세한 내용: \`get_doc\` 도구로 \`guide/keys\`, \`guide/setup\`, \`webhook/setup\` 문서를 확인하세요.`);

      return {
        content: [{
          type: 'text' as const,
          text: sections.join('\n\n---\n\n'),
        }],
      };
    }
  );
}
