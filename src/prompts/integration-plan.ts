import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocsProvider } from '../data/provider.js';
import { getClientEnvGuide } from '../tools/helpers.js';
import { CLIENT_PLATFORMS, CLIENT_SDKS, SERVER_LANGUAGES, SERVER_SDKS } from '../sdk/registry.js';

export function registerIntegrationPlanPrompt(server: McpServer, provider: DocsProvider): void {
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
      const v = await provider.getSdkVersions();
      const jsVer = v.js || '5.3.0';

      // 패키지 좌표는 src/sdk/registry.ts 가 단일 소스다
      const platformLabels: Record<string, string> = Object.fromEntries(
        CLIENT_PLATFORMS.map((p) => [p, CLIENT_SDKS[p].label]),
      );

      const serverSdkInstall: Record<string, string> = Object.fromEntries(
        SERVER_LANGUAGES.map((l) => [l, SERVER_SDKS[l].install]),
      );

      const clientSdkInstall: Record<string, string> = {
        ...Object.fromEntries(CLIENT_PLATFORMS.map((p) => [p, CLIENT_SDKS[p].install(v)])),
        web: `npm install @bootpay/client-js\n# 또는 CDN: <script src="https://js.bootpay.co.kr/bootpay-${jsVer}.min.js"></script>`,
      };

      const typeConfig: Record<string, { apiDomain: string; docPaths: string[]; description: string }> = {
        '일반결제': {
          apiDomain: 'api.bootpay.co.kr',
          docPaths: ['payment/request', 'payment/verify', 'payment/cancel'],
          description: '단건 결제 — 사용자가 결제창에서 직접 결제',
        },
        '정기결제': {
          apiDomain: 'api.bootpay.co.kr',
          docPaths: ['billing/key', 'billing/request', 'billing/reserve', 'recipes/recurring-payment'],
          description: '빌링키 발급 → 서버에서 자동결제 반복',
        },
        '주문서': {
          apiDomain: 'api.bootapi.com',
          docPaths: ['order/commerce-flow', 'order/checkout', 'order/list'],
          description: 'Commerce API 주문 생성 → 결제 연동',
        },
        '구독': {
          apiDomain: 'api.bootapi.com',
          docPaths: ['subscription/overview', 'subscription/contract', 'subscription/cycle'],
          description: 'Commerce API 구독 플랜 → 자동 과금 관리 (부트페이 관리형). 자체 DB로 회차를 관리하는 일반적인 월 구독은 빌링키 방식 — generate_payment_code(payment_type="subscription") 권장',
        },
      };

      const config = typeConfig[type];

      const plan = `# ${type} 연동 액션 플랜

> **플랫폼**: ${platformLabels[platform]} | **서버**: ${lang} | **API**: \`${config.apiDomain}\`
> ${config.description}

---

## Phase 0: Admin Preflight (stdio 모드 — 코드 작성 전 필수)

> **⚡ 이 단계를 건너뛰지 마세요.** Admin 도구가 있으면 반드시 실행하세요.
> Admin 도구가 없으면(HTTP 모드) Phase 1로 건너뛰세요.

\`\`\`
1. get_integration_context()     → 인증/프로젝트/결제설정/위젯/키체인 한 번에 확인
   ↓ readiness.ready = true      → Phase 2로 바로 이동
   ↓ readiness.ready = false     → blockers 해결:
     - 미로그인 → browser_login
     - 프로젝트 미선택 → browser_select_project
     - 키체인 없음 → create_keychain(name="결제용", targets=["core"], is_supervisor=true)
     - PG 미활성화 → activate_payment_method
     - Sandbox 설정 → set_sandbox_mode
2. get_integration_context()     → 재확인 (readiness.ready = true 확인)
\`\`\`

get_integration_context 결과에서 확보되는 정보:
| 항목 | .env 변수 | 출처 |
|------|----------|------|
| Client Key | \`VITE_BOOTPAY_CLIENT_KEY\` | keychain_context.client_key |
| Client Key | \`BOOTPAY_CLIENT_KEY\` | keychain_context |
| Secret Key | \`BOOTPAY_SECRET_KEY\` | create_keychain 응답 (1회만 평문) |

---

## Phase 1: 프로젝트 설정 (Admin 도구 없는 경우)

> Admin Preflight에서 이미 완료되었으면 이 단계를 건너뛰세요.

- [ ] [Bootpay 관리자](https://admin.bootpay.co.kr) 회원가입
- [ ] 사업자 정보 등록
- [ ] 프로젝트 생성
- [ ] PG사 활성화 (결제 설정 → 사용할 PG 선택)
- [ ] Sandbox 환경에서 시작 (테스트 완료 후 Production 전환)

### API 키 확인
- **stdio 모드**: \`create_keychain(targets=["core"])\`로 발급 또는 \`list_keychains(source=core)\`로 조회
- **수동**: 관리자 → 개발자 설정 → API 연동키

| 키 | 용도 |
|----|------|
| Client Key | 프론트엔드 SDK + 서버 Basic Auth 공통 (${platformLabels[platform]} / ${lang}) |
| Secret Key | 서버 Basic Auth 인증 (비공개) |

---

## Phase 2: 개발 환경 설정

### 서버 환경변수 (.env)
\`\`\`bash
BOOTPAY_CLIENT_KEY=          # create_keychain 또는 list_keychains로 조회한 Client Key
BOOTPAY_SECRET_KEY=          # create_keychain으로 발급한 Secret Key (1회만 평문 확인 가능)
# 서버 인증: Authorization: Basic Base64(clientKey:secretKey)
\`\`\`

### 클라이언트 환경변수
${getClientEnvGuide(platform)}

### SDK 설치
\`\`\`bash
# 클라이언트 (${platformLabels[platform]})
${clientSdkInstall[platform]}

# 서버 (${lang})
${serverSdkInstall[lang]}
\`\`\`

### 보안 체크
- [ ] \`.env\` 파일이 \`.gitignore\`에 포함되어 있는지 확인
- [ ] Secret Key가 프론트엔드 코드에 포함되지 않는지 확인
- [ ] 환경변수가 올바르게 로드되는지 확인 (\`console.log\`로 테스트)

---

## Phase 3: ${type === '일반결제' || type === '정기결제' ? '결제 요청 구현 (프론트엔드)' : '핵심 기능 구현'}

${type === '일반결제' ? `- [ ] SDK 초기화 (Client Key 설정)
- [ ] 결제 요청 파라미터 구성 (order_name, price, order_id 등)
- [ ] \`extra.separately_confirmed: true\` 설정 — 서버승인(분리승인)이 기본
- [ ] confirm 시점 수신 — iframe/popup은 \`confirm\` 이벤트, redirect는 \`event=confirm\` query
- [ ] confirm에서 receipt_id를 서버 \`/api/confirm\`으로 전달 (프론트에서 승인하지 않음)
- [ ] 결과 표시 — 서버 응답 또는 서버 DB 조회(polling). done 이벤트는 오지 않음` : ''}${type === '정기결제' ? `- [ ] SDK 초기화 (Client Key 설정)
- [ ] 빌링키 발급 요청 — requestSubscription (method: "카드자동"(Web) / "card_rebill"(모바일), subscription_id 필수, price: 0)
- [ ] done 이벤트에서 receipt_id 수신 → 서버로 전달 (billing_key는 프론트로 오지 않음)` : ''}${type === '주문서' ? `- [ ] Commerce SDK 초기화
- [ ] 상품 등록 (Commerce API)
- [ ] 주문 생성 (Commerce API)
- [ ] 주문에 결제 연동` : ''}${type === '구독' ? `- [ ] Commerce SDK 초기화
- [ ] 구독 플랜 생성 (Commerce API)
- [ ] 고객 등록
- [ ] 구독 시작 (빌링키 연동)` : ''}

> 관련 문서: ${config.docPaths.map(p => `\`get_doc("${p}")\``).join(', ')}

---

## Phase 4: 서버 검증 구현 (백엔드)

- [ ] 서버 SDK 초기화 (Client Key + Secret Key)
- [ ] Basic Auth 헤더 설정 — \`Authorization: Basic Base64(clientKey:secretKey)\`
${type === '일반결제' ? `- [ ] 서버 승인 API(\`/api/confirm\`) 구현 — (재고 등 확인) → confirmPayment → 리턴값 검증 순서
- [ ] 리턴값 검증 — confirmPayment 리턴값의 price를 서버 DB 주문 금액과 대조 (별도 결제검증 조회 불필요)
- [ ] 금액 불일치 시 cancelPayment 자동 취소
- [ ] 재고 소진 등 비즈니스 거부는 confirmPayment 호출 전에 처리 (승인 전 거부 가능이 서버승인의 장점)` : ''}${type === '정기결제' ? `- [ ] 빌링키 확보 — lookupSubscribeBillingKey(receipt_id) → DB에 암호화 저장
- [ ] DB 스키마 설계 — billing_keys + recurring_payments (next_payment_at, retry_count, INDEX idx_next)
- [ ] 자동결제 — requestSubscribePayment(billing_key, ...) 호출, status=1 확인·receipt_id 저장
- [ ] 스케줄러 — cron으로 next_payment_at 도래 건 결제 (Bootpay는 스케줄링 미제공) 또는 예약결제(subscribePaymentReserve) 활용
- [ ] 결제 실패 재시도 — retry_count 3회 초과 시 paused + 사용자 알림
- [ ] 해지 — 대기 예약 취소(cancelSubscribeReserve) 후 destroyBillingKey` : ''}${type === '주문서' ? `- [ ] Commerce API Basic Auth 설정
- [ ] 주문 상태 관리 (생성 → 결제 → 배송 → 완료)
- [ ] 취소/반품 처리
- [ ] 주문 조회 API 구현` : ''}${type === '구독' ? `- [ ] Commerce API Basic Auth 설정
- [ ] 구독 상태 관리 (활성 → 일시정지 → 해지)
- [ ] 과금 내역 조회
- [ ] 구독 갱신/해지 처리` : ''}

---

## Phase 5: 웹훅 연동 (운영 필수 — 클라이언트 결과 유실 보완)

> confirm 이벤트 전달·redirect 이동은 브라우저 종료·네트워크 단절로 유실될 수 있습니다.
> 결제 상태의 최종 정합성은 웹훅으로 맞춥니다.

- [ ] 웹훅 수신 엔드포인트 구현 (POST)
- [ ] HTTPS URL 준비 (HTTP 불가)
- [ ] 관리자에서 웹훅 URL 등록
- [ ] **Bootpay 발신 IP 필터** — \`223.130.82.0/24\` 대역만 허용, 그 외 403 거부
- [ ] 웹훅 데이터 검증 (receipt_id로 결제 내역 재확인 — payload 신뢰 금지)
- [ ] 응답 HTTP 200 반환 (5초 이내)
- [ ] 웹훅 실패 시 재시도 대비 멱등성 처리

> 관련 문서: \`get_doc("webhook/setup")\`

---

## Phase 6: 테스트 & 검증

### Sandbox 테스트
- [ ] 결제 성공 시나리오
- [ ] 결제 실패 시나리오 (잔액 부족, 카드 오류)
- [ ] 결제 취소 시나리오
- [ ] 웹훅 수신 확인
${type === '정기결제' ? '- [ ] 빌링키 발급 → 자동결제 → 해지 전체 흐름' : ''}${type === '구독' ? '- [ ] 구독 생성 → 과금 → 갱신 → 해지 전체 흐름' : ''}

### Production 전환
- [ ] Production Client Key/Secret Key로 교체
- [ ] PG사 심사 완료 확인
- [ ] 실제 카드로 소액 테스트 (1,000원 결제 → 즉시 취소)
- [ ] 웹훅 URL Production 환경으로 변경
- [ ] 에러 모니터링 설정

---

## 관련 문서 바로가기

${config.docPaths.map(p => `- \`get_doc("${p}")\``).join('\n')}
- \`get_doc("webhook/setup")\` — 웹훅 설정
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
}
