import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerTroubleshootingTool(server: McpServer): void {
  server.tool(
    'get_troubleshooting',
    '연동 중 자주 발생하는 문제의 원인과 해결 방법을 안내합니다.',
    {
      topic: z
        .enum(['onboarding', 'sandbox', 'webhook', 'billing', 'subscription', 'error', 'cancel', 'cors', 'csp', 'open-type', 'mobile', 'widget', 'unified', 'certification'])
        .describe('문제 유형: onboarding(가입·PG 신청·가맹 심사·결제수단 활성화 — 「결제창이 안 뜬다」·「심사가 안 끝난다」의 대부분이 여기), sandbox(테스트 환경), webhook(웹훅 미수신), billing(빌링키 발급·자동결제), subscription(구독 운영 — 이중 결제·배치 미실행·해지 후 청구·무료체험·가격 변경), error(에러코드), cancel(취소·부분취소·환불 상태값), cors(허용 도메인 등록), csp(Content-Security-Policy 로 결제창 차단 — 「Refused to frame」·frame-src), open-type(iframe·popup·redirect 선택과 기기별 분기, 결과 이벤트 처리), mobile(앱), widget(결제위젯), unified(통합결제창), certification(본인인증)'),
    },
    async ({ topic }) => {
      const guides: Record<string, string> = {
        onboarding: `# 가입 · PG 신청 · 가맹 심사

> 실제 상담의 약 20%가 이 구간이다. **코드가 다 됐는데 결제가 안 되는 경우 대부분이 여기서 막혀 있다.**

## 순서 — 이 순서를 건너뛰면 결제창이 뜨지 않는다

1. **회원가입** — [관리자](https://admin.bootpay.co.kr)에서 가입하고 사업자 정보를 등록합니다.
2. **프로젝트 생성** — 가맹점을 만들면 기본 프로젝트가 함께 생깁니다. 연동키(client key)는 프로젝트 단위입니다.
3. **결제수단 활성화** — [결제 설정](https://admin.bootpay.co.kr/payment/setting)에서 PG와 결제수단을 켭니다.
4. **PG 가맹 신청** — [PG 신청](https://admin.bootpay.co.kr/pg/join). 신청하면 담당자가 24시간 내 연락합니다.
5. **PG 심사** — 신청서에 적은 홈페이지·앱에서 결제가 실제로 되는지 PG·카드사 담당자가 직접 확인합니다.

## ⚠️ 연동(개발)과 가맹(계약)은 별개다

**샌드박스로 결제창을 띄우는 것은 가입 직후에도 됩니다.** PG 심사를 통과해야 되는 것은 *실결제*입니다.
"심사가 끝나야 개발을 시작할 수 있나요?" → 아닙니다. 심사와 개발은 동시에 진행하세요.
오히려 **심사를 받으려면 결제창이 먼저 떠야 합니다** (심사원이 직접 눌러 봅니다).

## 심사용 결제창 — 샌드박스 모드면 PG 키 없이 뜬다

[결제 설정](https://admin.bootpay.co.kr/payment/setting)에서 원하는 PG의 결제수단을 **샌드박스 모드로 활성화**하면,
PG에서 받은 clientId/secretKey를 입력하지 않아도 결제창이 뜹니다. 심사는 이 상태로 받으면 됩니다.

- PG 목록에 원하는 PG가 안 보이면 **「전체 PG 보기」** 버튼을 누르세요.
- 샌드박스에서도 **실제 카드 승인이 일어날 수 있습니다** (topic="sandbox" 참고). 자동취소는 밀리거나 누락될 수 있으니 **테스트가 끝나면 관리자에서 직접 취소**하세요.

## PG 가맹 심사 통과 조건 — 사이트에 이게 없으면 반려된다

바이브코딩으로 만든 사이트가 반려되는 사유가 거의 이 목록입니다. **결제 코드보다 이쪽이 먼저 막힙니다.**

1. 웹 또는 앱이 실제로 구축되어 있고, **결제 페이지에서 PG 결제모듈이 호출**될 것
2. **실제 판매 상품(서비스) 1개 이상** 등록
3. 사이트 하단에 **사업자 정보** 노출 — 상호명 · 사업자등록번호 · 대표자명 · 사업장 주소 · 고객센터 전화번호
   - ⚠️ 고객센터 번호로 **휴대폰 번호는 불가**합니다.
4. **교환/환불 정보** 기재
5. **이용약관 · 개인정보처리방침** 게시

## 자주 막히는 지점

| 증상 | 원인 | 해결 |
|------|------|------|
| 새 프로젝트에서만 "결제수단이 사용 허가가 되지 않았거나…" | **결제수단 설정은 프로젝트마다 별개**다. 키만 갈아끼우면 안 된다 | 새 프로젝트의 [결제 설정](https://admin.bootpay.co.kr/payment/setting)에서 결제수단을 다시 활성화 |
| PG 신청서를 쓰다 창이 닫혀서 처음부터 | 신청 폼에 **중간 저장이 없다** | 한 번에 작성. 다시 [PG 신청](https://admin.bootpay.co.kr/pg/join)에서 이어서 진행 |
| 심사가 언제 끝나는지 모르겠다 | 입점 심사는 보통 **영업일 2~3일** | 심사 후 메일로 계약 안내가 간다 |
| 신청한 PG와 다른 PG를 제안받았다 | 사업군에 따라 가맹 가능한 PG와 수수료가 다르다 | 정상 절차다. 담당자 안내를 따르면 된다 |
| 결제창이 뜨는데 PG사 도메인으로 직접 요청이 간다 | **부트페이로 연동된 것이 아니다** — PG SDK를 직접 붙인 상태 | 부트페이 SDK로 연동했는지 확인 (\`generate_payment_code\` 로 다시 생성) |

## 이 도구가 할 수 없는 것

가맹 심사 진행 상태, 수수료율 협상, 계약 서류 접수는 **조회할 수 없습니다.**
사용자가 물으면 관리자에서 확인하거나 담당자 회신을 기다리도록 안내하세요. 추측해서 단정하지 마세요.
`,
        sandbox: `# 샌드박스(테스트 환경) 문제 해결

## ⚠️ 가장 먼저 알아야 할 것 — 샌드박스에서도 실제 카드 승인이 일어납니다

**부트페이 샌드박스는 "가짜 결제"가 아닙니다.** 대부분의 PG사는 샌드박스 모드에서도 실제 카드 승인을 태우고, 카드 명세서에도 찍힙니다.

- **자동취소**: 자동취소 스케줄러는 **샌드박스 결제건에만** 동작하고 주기적으로 돕니다(가맹점 관측 기준 약 3시간 간격)
- **⚠️ 자동취소를 안전장치로 믿으면 안 됩니다** → 테스트 결제가 몰리면 스케줄러가 **밀려서 누락**되어 취소되지 않은 채 남는 건이 생깁니다. 테스트가 끝나면 관리자 결제내역에서 **반드시 직접 취소**해 두세요 (2026-09-02 정정 — 이전의 "당일 자정 무렵 일괄 자동취소" 안내는 정확하지 않습니다)
- **PG별 과금 예외는 딱 두 가지입니다**
  - **KCP**: 샌드박스 결제에서 실제 과금(출금)이 되지 않습니다 → 실 과금 없는 테스트가 필요하면 KCP
  - **라이트페이**: **자동결제(정기결제) 카드 건만** 과금 없이 승인 응답만 돌려줍니다. 라이트페이 **일반 결제는 과금됩니다**
  - 그 외 PG는 샌드박스에서도 실결제가 일어납니다
- 개발 단계에서는 KCP 샌드박스로 연동해 두고, 오픈 시점에 가맹된 PG로 전환해도 됩니다
  - 전환해도 **결제 완료 데이터의 기술적 구조는 동일**합니다. 달라지는 건 카드사 코드와 실패 시 \`pg_error_code\` 값 정도입니다
- 반복 테스트·취소(월 수백 건 수준)는 정상적인 개발 과정이며 카드 정지 사유가 되지 않습니다

## 체크리스트

- [ ] **Client Key 확인**: Sandbox용 Client Key를 사용하고 있나요?
  - 관리자 → 개발자 설정 → 환경을 "Sandbox"로 전환 후 확인
  - Production과 Sandbox의 Client Key는 다릅니다
- [ ] **PG 활성화**: Sandbox에서도 PG사를 활성화해야 결제가 됩니다
  - 관리자 → 결제 설정 → Sandbox 환경에서 PG 활성화
- [ ] **카드사 선택**: 일부 카드사는 테스트 승인이 막혀 있습니다. 국민·현대·삼성·신한 등 메이저 카드사로 테스트하세요
- [ ] **KCP를 PC에서 테스트한다면**: KCP 테스트 결제는 PC 환경에서 **공동인증서 모듈**이 설치되어 있어야 진행됩니다. 설치 안내창조차 뜨지 않으면 모듈 설치 문제입니다

## 자주 묻는 질문

**Q: Sandbox에서 결제가 안 돼요**
→ Sandbox용 Client Key를 사용하는지 확인하세요. Production Client Key로는 Sandbox 결제가 안 됩니다.

**Q: Sandbox에서 성공한 결제가 Production에서 실패해요**
→ Production 환경에서는 PG사 심사가 완료되어야 합니다. 관리자에서 PG 상태를 확인하세요.

**Q: 환경을 전환하려면?**
→ Client Key만 교체하면 됩니다. SDK 코드는 동일합니다.

**Q: 샌드박스 결제도 관리자·웹훅·DB에 기록이 남나요?**
→ 남습니다. 관리자 결제내역에 테스트 건으로 기록되고 웹훅도 동일하게 발송되므로, 가맹점 DB 적재까지 그대로 검증할 수 있습니다.

**Q: 샌드박스 결제 건의 영수증 URL이 오류가 나요**
→ 샌드박스 여부와 무관하게 영수증은 발급됩니다. 오류가 난다면 개별 건 문제이므로 \`receipt_id\`를 확보해 확인해야 합니다. "샌드박스라서 영수증이 안 나온다"는 설명은 사실이 아닙니다.

> 자세한 내용: \`get_doc("guide/setup")\``,

        webhook: `# 웹훅 문제 해결

## 왜 웹훅이 필수인가

클라이언트의 결제 결과 처리(confirm 이벤트 전달, redirect 이동)는 브라우저 종료·네트워크 단절로 **유실될 수 있습니다.**
결제 완료/취소의 최종 정합성은 웹훅으로 맞추세요. 웹훅 없이 클라이언트 결과 처리에만 의존하면 "결제는 됐는데 주문이 없는" 사고가 납니다.

## 웹훅이 안 오는 경우 체크리스트

- [ ] **URL 등록 확인**: 관리자 → 개발자 설정 → 웹훅 URL이 등록되어 있나요?
- [ ] **HTTPS 필수**: 웹훅 URL은 반드시 HTTPS여야 합니다 (HTTP 불가)
- [ ] **응답 조건**: HTTP 200 + 응답 본문 \`{ "success": true }\` **둘 다** 반환해야 성공 처리됩니다
  - 하나라도 빠지면 백오프 간격으로 재시도합니다 (아래 재시도 정책 참조)
- [ ] **방화벽/보안**: Bootpay 발신 IP 대역 \`223.130.82.0/24\`가 차단되어 있지 않은지 확인
- [ ] **IP 필터가 너무 좁지 않은지**: 특정 IP 1개만 허용했다면 \`223.130.82.0/24\` 전체 대역으로 허용하세요
- [ ] **타임아웃**: 웹훅 수신 엔드포인트는 5초 이내에 응답해야 합니다

## 웹훅 보안 체크리스트

- [ ] **IP 필터**: \`223.130.82.0/24\` 이외 IP의 요청은 403으로 거부 (프록시 뒤라면 x-forwarded-for 첫 값 기준)
- [ ] **재검증**: 웹훅 payload를 그대로 신뢰하지 말고 \`receiptPayment(receipt_id)\`로 금액·상태 재확인
- [ ] **멱등성**: 같은 이벤트 중복 수신 대비 중복 처리 방지 — 단 부분취소는 같은 receipt_id로 여러 번 오므로(status·webhook_type 동일) receipt_id만으로 dedup하면 두 번째 부분취소를 놓친다. 누적 취소금액(cancelled_price)이나 취소 건 식별자까지 키에 포함

## 웹훅 URL 자체가 잘못 응답하는 경우 (로그조차 안 남을 때)

부트페이 웹훅 로그에 **시도 기록 자체가 없다면**, 요청이 가맹점 앱까지 도달하지 못한 것입니다.

- [ ] **리다이렉트(3xx) 응답 금지**: 등록한 URL이 다른 주소로 redirect 되면 부트페이 로그에 남지 않습니다. **URL로 직접 접근했을 때 즉시 본응답이 나오도록** 웹서버를 설정하세요
- [ ] **CDN·캐싱 경유 주의**: Cloudflare 등에서 캐싱하거나 외부 리다이렉트로 유도하면 웹훅이 동작하지 않습니다
- [ ] **도메인 CNAME만 걸어둔 경우**: CNAME 경유 역시 기록이 남지 않습니다. 실제 수신 엔드포인트를 직접 등록하세요
- [ ] **응답 본문 형식**: \`{ "success": true }\` 여야 합니다. \`{ "status": 200 }\` 처럼 다른 형태로 응답하면 HTTP 200이라도 **실패로 간주**되어 재시도됩니다
- [ ] **500이 뜨는데 앱 로그에는 아무것도 없다면**: 웹프레임워크·WAF가 **User-Agent나 헤더 검사**로 요청을 먼저 끊은 것입니다. 애플리케이션 로그에는 안 남으므로 **최상단 웹서버(nginx 등) 로그**를 확인하세요. curl로 직접 POST 하면 200이 나오는데 부트페이 웹훅만 500이라면 이 경우가 대부분입니다

> 참고: 관리자의 **"웹훅 테스트" 버튼**이 500을 반환해도 실제 결제 웹훅은 정상 전달되는 경우가 있습니다. 테스트 버튼 결과만으로 판단하지 말고 실제 결제 건의 웹훅 로그로 확인하세요.

## 개발용·운영용 웹훅을 따로 설정할 수 있나요 — 없습니다

**한 프로젝트 안에서 웹훅을 개발용·운영용으로 나눠 설정할 수 없습니다.** 개발과 운영을 분리하려면
**프로젝트 자체를 나누고** 각 프로젝트에 해당 환경의 웹훅 URL을 설정하세요. 프로젝트마다 연동키와
웹훅 설정이 따로 있습니다.

## 관리자 "테스트 Webhook 보내기"가 500인데 우리 서버 로그에는 200이 남았을 때

**관리자의 웹훅 테스트 도구에 일부 웹서버 환경에서 500으로 표시되는 버그가 있습니다.**
가맹점 서버·로드밸런서·WAF·Cloudflare 차단이나 응답 형식 문제로 단정하고 그쪽을 뒤지기 전에
이 가능성을 먼저 알려 주세요. **실제 수신 여부는 샌드박스로 실제 결제를 발생시켜** 웹훅이
들어오는지로 확인합니다. (정상 수신 응답 규격이 HTTP 200 + \`{"success": true}\` 인 것은 그대로 유효합니다.)

## 웹훅 디버깅

1. 관리자 → 결제 내역 → 해당 결제의 웹훅 로그 확인
2. 웹훅 URL로 직접 POST 요청을 보내 서버 도달 여부 확인
3. SSL 인증서가 유효한지 확인 (자체서명 인증서 불가)
4. 부트페이가 응답을 저장하는 범위는 **HTTP 응답까지**입니다. 네트워크 라우팅 단계의 문제는 확인되지 않으므로 수신 측에서 함께 봐야 합니다

## 웹훅 재시도 정책

성공 응답(HTTP 200 + \`{ "success": true }\`)을 받지 못하면 재시도합니다.

- **재시도 횟수**: 관리자 → 개발자 설정 → 웹훅 설정에서 지정하며, 기본값은 10회입니다.
- **간격**: 재시도할수록 늘어나는 백오프 방식입니다. 정확한 간격은 관리자 웹훅 로그에서 확인하세요.
- 지정한 횟수를 모두 실패하면 재시도를 멈춥니다.

> 자세한 내용: \`get_doc("webhook/setup")\``,

        billing: `# 정기결제(빌링) 문제 해결

## 빌링키 발급 실패 체크리스트

- [ ] **메서드 확인**: \`requestPayment()\`가 아닌 \`requestSubscription()\`을 사용하고 있나요?
- [ ] **결제수단**: \`method\`를 \`"카드자동"\` (Web) 또는 \`"card_rebill"\` (모바일)로 설정했나요? (일반 \`"card"\`가 아닌)
- [ ] **PG사 설정**: 정기결제를 지원하는 PG사가 활성화되어 있나요?
  - 모든 PG사가 정기결제를 지원하지는 않습니다
- [ ] **subscription_id**: 구독 식별자를 설정했나요? 관리자에서 구독별 조회에 필요합니다
- [ ] **카드 정보**: 테스트 환경에서는 테스트 카드를 사용하세요

## 카드사 사유로 빌링키 발급이 거절되는 경우

연동 코드가 아니라 **카드 자체 문제**인 케이스가 많습니다. 아래는 코드를 고쳐도 해결되지 않습니다.

| 증상 | 원인 | 안내 |
|------|------|------|
| 다른 곳에서 잘 쓰는 카드인데 등록 실패 | **유효기간이 얼마 남지 않은 카드**는 PG사가 빌링키 발급을 거절할 수 있습니다. 부트페이가 강제하는 잔여기간 기준은 없고 카드사·PG사 정책입니다 | 유효기간이 넉넉한 카드로 등록. 카드를 재발급받으셨다면 **기존 빌링키는 자동으로 갱신되지 않으므로** 새 카드로 빌링키를 다시 발급받아야 합니다 |
| 카드 재발급 후에도 옛 카드로 청구됨 | 재발급을 받아도 **기존 빌링키는 자동 갱신되지 않습니다**. "유효기간 경과 카드" 리턴도 대부분 이 경우입니다 | 새 카드로 빌링키를 **다시 발급**받고, 기존 예약을 새 빌링키로 재등록하세요 |
| \`pg_error_code: 70020\` 카드 비밀번호 오류 | 앞 2자리 비밀번호 불일치. **00·11·22처럼 단순 반복 번호는 맞아도 거절**될 수 있습니다. **3회 이상 틀리면 "최대 인증횟수 초과"** 로 잠깁니다 | 카드 소유주가 카드사에 연락해 **비밀번호 변경·초기화** 후 재시도 |

> 부트페이는 카드번호·비밀번호를 저장하지 않습니다. 입력값 자체를 조회해 드릴 수 없으므로, 위 사유는 **카드사 확인**이 필요한 영역입니다.

### PG가 사유 없이 "카드사 문의 바랍니다"만 돌려줄 때 (예: RETURNCODE 3143)

이 응답은 **부트페이 에러코드가 아니라 카드사가 PG를 통해 내려보낸 거절 사유**입니다.

- **한도초과·잔액부족·도난분실 신고 카드는 카드사가 그 사유를 그대로 내려줍니다.** 그러니 "카드사 문의 바랍니다"라고만 온 건은 **그 사유들이 아닐 가능성이 높습니다.** 한도·잔액 문제라고 단정해서 안내하지 마세요.
- 이 문구는 카드사가 **개인정보에 해당한다고 보아 사유를 숨긴** 경우입니다. 실제로는 CAVV 중복 같은 카드 정보 오류이거나, 카드값 미납·출금계좌 정지처럼 **카드가 정지된 개인적 사유**인 경우가 많습니다.
- **부트페이도 PG도 이 사유를 더 캐낼 수 없고, 응답 문구를 바꿀 수도 없습니다.** 상세 사유는 카드사가 내려주지 않습니다.
- 따라서 안내는 하나뿐입니다 — **카드 소유주 본인이 카드사에 직접 문의**해야 합니다. 다른 카드로 시도하면 즉시 우회됩니다.
- ❌ "부트페이 고객센터로 전화하세요"라고 떠넘기지 마세요. 부트페이가 확인할 수 있는 정보가 없습니다.

## 자동결제 실패 체크리스트

- [ ] **서버 SDK 사용**: 자동결제는 반드시 서버에서 \`requestSubscribePayment()\`로 호출합니다
- [ ] **SDK 초기화**: 서버 SDK에서 \`setConfiguration({ client_key, secret_key })\`로 초기화했나요?
- [ ] **빌링키 유효성**: 빌링키가 만료되거나 해지되지 않았는지 확인
- [ ] **한도 초과**: 카드 한도를 초과하면 결제가 실패합니다
- [ ] **카드 상태**: 분실/정지/해지된 카드는 결제 불가
- [ ] **재시도는 직접 구현**: 빌링키 결제는 자동 재시도가 없습니다. 실패 시 재청구 스케줄은 가맹점이 관리합니다
- [ ] **해지 순서**: 빌링키 삭제 전 대기 중인 예약을 먼저 취소했나요? (cancelSubscribeReserve → destroyBillingKey)

## 정기결제 전체 흐름

\`\`\`
[프론트엔드]                          [서버]                        [Bootpay]
1. requestSubscription()         ────────────────────────────────→
   (method: "card_rebill")
2. 사용자: 카드 정보 입력
3. done 이벤트 (receipt_id)      ←────────────────────────────────
4. receipt_id를 서버로 전달      →
                                  5. lookupSubscribeBillingKey(receipt_id) ──→
                                  6. billing_key 수신·DB 저장               ←──
                                  7. requestSubscribePayment(billing_key)   ──→
\`\`\`

## SDK 메서드 구분

| 단계 | 위치 | 메서드 | 용도 |
|------|------|--------|------|
| 빌링키 발급 | **프론트엔드** | \`requestSubscription()\` | 카드 등록 (사용자 인터랙션 필수) |
| 빌링키 조회 | **서버** | \`lookupSubscribeBillingKey()\` | receipt_id로 billing_key 확보 (발급 직후 1회) |
| 자동결제 | **서버** | \`requestSubscribePayment()\` | billing_key로 즉시 1회 결제 (자동 재시도 없음) |
| 예약결제 | **서버** | \`subscribePaymentReserve()\` | 특정 시각에 자동 결제 예약 |
| 예약 취소 | **서버** | \`cancelSubscribeReserve()\` | 등록된 예약결제 취소 |
| 빌링키 해지 | **서버** | \`destroyBillingKey()\` | 구독 해지 시 빌링키 무효화 |

## 서버 자동결제 코드 (Node.js)

\`\`\`javascript
import { Bootpay } from '@bootpay/backend-js'

Bootpay.setConfiguration({
    client_key: process.env.BOOTPAY_CLIENT_KEY,
    secret_key: process.env.BOOTPAY_SECRET_KEY
})
// Basic Auth 인증 — 별도 토큰 발급 불필요

// 자동결제 요청
const result = await Bootpay.requestSubscribePayment({
    billing_key: '저장된_빌링키',
    order_name: '월간 구독',
    order_id: 'auto_' + Date.now(),
    price: 29000,
    tax_free: 0,
    user: { username: '홍길동' }
})
\`\`\`

## 자주 하는 실수

1. **\`requestPayment()\`로 빌링키 발급 시도** → \`requestSubscription()\`을 사용하세요
2. **\`method: 'card'\`로 빌링키 발급** → \`method: '카드자동'\` (Web) 또는 \`'card_rebill'\` (모바일)을 사용하세요
3. **프론트엔드에서 자동결제 시도** → 자동결제는 반드시 서버에서 실행합니다
4. **빌링키를 프론트에서 직접 받으려 함** → billing_key는 프론트로 오지 않는다. done의 receipt_id를 서버로 보내 lookupSubscribeBillingKey로 확보
5. **SDK 미초기화** → \`setConfiguration({ client_key, secret_key })\`로 초기화해야 합니다

> 자세한 내용: \`get_doc("billing/key")\`, \`get_doc("billing/request")\`, \`get_doc("billing/reserve")\`, \`get_doc("billing/delete")\`, \`get_doc("recipes/recurring-payment")\`
> 회차·이용기간·해지까지 관리하는 구독 운영 문제는 \`get_troubleshooting("subscription")\``,

        subscription: `# 구독(월 정기과금) 운영 문제 해결

구독 장애는 대부분 결제 API가 아니라 **회차 상태 관리**에서 납니다. 증상별로 확인하세요.

## 같은 달에 두 번 결제됐어요 (이중 결제) — 가장 흔한 사고

- [ ] 배치가 **회차를 선점하지 않고** 조회 → 결제만 하고 있지 않나요?
      \`UPDATE cycles SET status='charging' WHERE id=? AND status='pending'\` 이 **1행을 바꿨을 때만** 결제해야 합니다
- [ ] 배치 인스턴스가 2개 떠 있지 않나요? (스케일아웃·재배포 겹침·로컬 cron 동시 실행)
- [ ] 구독 시작 시의 첫 결제와 배치가 같은 회차를 동시에 집지 않나요? → 첫 결제도 같은 선점 함수를 거쳐야 합니다
- [ ] order_id를 회차·시도 단위로 고유하게(\`sub{id}_c{회차}_a{시도}\`) 만들고 있나요? 결제 내역에서 어떤 회차가 두 번 나갔는지 추적됩니다
- ✅ 검증: 같은 회차에 배치를 연속 2회 실행 → 결제 1건이면 정상

## 결제일이 됐는데 결제가 안 나가요

- [ ] 배치 프로세스가 실제로 떠 있나요? **서버리스(Vercel/Lambda/Cloudflare)에서는 node-cron이 동작하지 않습니다** → 플랫폼 스케줄러가 배치 엔드포인트를 HTTP로 호출하도록 등록
- [ ] 회차 status가 \`pending\`인가요? \`charging\`에 고착된 회차는 배치가 집지 않습니다(아래 항목)
- [ ] 구독 status가 \`paused\`/\`cancelled\`로 내려가 있지 않나요? (실패 누적·해지)
- [ ] 배치 조회 조건의 시간대(UTC/KST)가 어긋나 있지 않나요? cron은 timezone을 명시하세요

## 회차가 'charging'에서 멈춰 있어요

결제 요청 도중 서버가 죽거나 타임아웃되면 발생합니다. **결제가 실제로 됐는지 모르는 상태**입니다.

- [ ] 그냥 \`pending\`으로 되돌리지 마세요 → 이미 승인된 결제면 이중 결제가 됩니다
- [ ] \`receiptPayment(receipt_id)\`(또는 order_id로 결제 조회)로 실제 상태를 확인한 뒤 \`paid\`/\`pending\`으로 정리하는 보정 배치를 두세요
- [ ] 웹훅으로도 같은 보정이 가능합니다 — order_id로 회차를 찾아 상태를 맞추세요

## 해지했는데 다음 달에 또 결제됐어요

- [ ] 해지 시 **아직 결제 전인 회차를 \`cancelled\`로 닫았나요?** 구독 status만 바꾸면 남아 있는 pending 회차를 배치가 그대로 집습니다
- [ ] 결제 성공 후 다음 회차를 만들 때 해지·해지예약 상태를 확인하나요?

## 결제가 실패했는데 서비스가 계속 열려 있어요

- [ ] 선불 구독은 **결제 성공 시에만** 다음 이용기간(service_start~service_end)을 열어야 합니다
- [ ] 서비스 접근 판정을 \`구독 status = active\`가 아니라 **결제된 회차의 이용기간 안인지**로 하세요

## 무료체험이 끝났는데 결제가 안 돼요 / 체험 중인데 결제됐어요

- [ ] 무료체험은 첫 회차의 \`charge_at\`만 뒤로 잡는 것입니다. 체험 종료일 = 첫 결제 예정일이 맞나요?
- [ ] 체험 중 이용 판정을 \`trialing + trial_end_at\`으로 하고 있나요?
- [ ] ⚖️ 유료 전환 7일 전 고지(여신전문금융업법)·전환 전 30일 이내 동의(전자상거래법 2025.2)를 처리했나요? 체험을 30일 이내로 잡으면 가입 시 동의로 커버됩니다

## 가격을 올렸는데 예전 금액으로 걷혀요

- [ ] 이미 만들어둔 \`pending\` 회차의 금액도 갱신했나요? 구독 테이블 금액만 바꾸면 기존 회차는 옛 금액 그대로입니다
- [ ] ⚖️ 인상은 7일 전 고지 + 인상 전 30일 이내 **재동의**가 필요합니다 (가입 때 받은 동의로 갈음 불가)

## 카드를 바꿨는데 밀린 회차가 그대로예요

- [ ] 실패로 닫힌 회차를 \`pending\`으로 되돌릴지(밀린 금액 청구), \`cancelled\`로 닫을지(다음 회차부터) 정책을 정했나요? 되돌리지 않으면 계속 미납으로 남습니다

## 결제수단 삭제 요청 처리

- [ ] **구독 해지 ≠ 빌링키 삭제**입니다. 빌링키를 지우면 같은 카드로 도는 다른 구독·주문 결제까지 막힙니다
- [ ] 삭제 전 같은 빌링키를 쓰는 다른 구독이 없는지 확인하고, 대기 중인 예약결제가 있으면 \`cancelSubscribeReserve\`로 먼저 취소하세요(자동 취소되지 않습니다)

> 코드 생성: \`generate_payment_code(payment_type="subscription", scheduler="cron"|"http_trigger")\`
> 자세한 내용: \`get_doc("billing/request")\`, \`get_doc("billing/lookup")\`, \`get_doc("billing/delete")\`, \`get_doc("recipes/recurring-payment")\``,

        error: `# 에러코드 문제 해결

## 자주 발생하는 에러

| 에러 코드 | 원인 | 해결 |
|-----------|------|------|
| **-100** (APPLICATION_ID_INVALID) | 잘못된 Client Key | 관리자에서 올바른 Client Key 확인 |
| **-200** (TOKEN_EXPIRED) | 인증 만료 | Client Key/Secret Key 확인 후 재요청 |
| **1700** | 결제 관련 에러 | 에러 메시지 상세 확인 |
| **3708** (CANCEL_ALREADY_DONE) | 이미 취소된 결제 | 결제 상태(\`receiptPayment\`) 먼저 확인 |
| **3710** (CANCEL_PRICE_OVER) | 취소 금액 초과 | 남은 금액 확인 후 재요청 |
| **1204** | PG사 오류 | PG사 점검 상태 확인, 에러 메시지 확인 |

## PG사가 돌려주는 에러 (부트페이 코드가 아님)

\`res_cd\`/\`res_msg\` 형태의 응답은 PG사 원문 에러입니다. 부트페이 연동 코드로는 해결되지 않습니다.

| PG | 코드 | 의미 | 해결 |
|----|------|------|------|
| KCP | \`8012\` 취소불가 (파트너관리자-결제서버 IP 확인) | KCP 상점 관리자에 부트페이 결제 서버 IP가 등록되지 않음 | KCP 파트너 관리자 → 서버 IP 설정에 **223.130.82.4, 223.130.82.130, 223.130.82.131** 3개 모두 등록 |
| KCP | \`8107\` 포맷에러(지불\\|신용카드\\|카드번호) | KCP → 카드사 승인 요청 단계 오류 또는 고객 카드 문제 | 연동 측에서 해결 불가. PG사 기술문의 필요 |
| KCP | \`5209\` [배치빌] 존재하지않는(사용불가) GROUP_ID | 배치빌용 \`kcpgroup_id\`가 미승인이거나 \`site_cd\`와 매칭되지 않음 | KCP에 배치빌 권한·GROUP_ID 승인 여부 확인 후 관리자 설정 수정 |
| 나이스 | \`CC84\` 하위사업자몰 오류 | 해당 MID에 카드 정기결제(빌링) 설정·카드사 심사 미완료 | 나이스페이먼츠에 해당 MID의 빌링 권한 확인 요청 |

> 위 IP 3개는 **부트페이 서버의 아웃바운드 IP**로, PG사 관리자에 등록하는 값입니다. 가맹점 웹훅 수신 서버에서 허용할 대역(\`223.130.82.0/24\`)과는 용도가 다릅니다.

## 승인 직후 "결제승인실패" 로그가 하나 더 남는 경우

결제가 정상 완료됐는데 서버 로그에 승인 실패 항목이 추가로 붙는다면, 구매자가 **승인 완료 후 뒤로가기로 승인 URL에 재진입**해 중복 승인이 요청된 케이스일 수 있습니다. 이미 승인된 건이라 두 번째 요청이 실패하며 남는 로그이고, 실제 결제는 1건입니다.

## 나이스페이먼츠 1651 "승인 TID 중복 오류"

나이스페이먼츠는 결제 전에 TID를 생성하는데, **그 TID가 이미 사용된 값과 겹쳤을 때** 나는 오류입니다.
나이스 가이드대로 시·분·초와 마이크로초에 난수 5자리를 붙여 생성하므로 확률적으로 겹치기 매우 어렵고,
부트페이 11년 운영 중 처음 확인된 사례입니다.

> ⛔ **주문번호(Moid) 중복이나 가맹점 스케줄러의 중복 호출로 단정하지 마세요.** 겹친 것은
> 주문번호가 아니라 **TID** 입니다. "중복되지 않는 주문번호를 새로 만들어 재요청하라"는 처방은 틀립니다.

## 카카오페이 — "돈은 빠져나갔는데 결제가 안 됐다" (\`-723\` / \`order is expired!\`)

**카카오머니는 '선충전 후지불' 구조입니다.** 결제 승인 전에 연결된 계좌에서 먼저 돈이 빠져나가
카카오머니로 충전되고, 그 충전된 카카오머니로 결제가 진행됩니다. 그래서 충전은 됐는데 승인이
되지 않은 상태(승인하지 않고 시간이 지나 주문이 만료된 \`-723\`)에서는 돈이 나간 것처럼 보여도
**실제로는 구매자의 카카오머니 잔액으로 남아 있습니다.**

- 환불할 대상 거래 자체가 없으므로, **구매자에게 카카오페이 앱의 카카오머니 잔액을 먼저 확인**하도록 안내
- ⚠️ 이 구조를 악용해 "결제가 안 됐다"며 **현금 환불을 요구하는 사례**가 있으니 가맹점에도 함께 안내
- ⛔ "PG TID가 없으니 영업일 3~5일 내 자동 환불된다"는 처방은 카카오머니 건에 해당하지 않습니다

## 서버 SDK에서 \`access_token\`·\`expire_in\` 이 비어 있을 때

**\`expire_in\` 은 v2 API에서만 내려옵니다.** v1 API로 연동돼 있으면 값이 비어 보입니다.
환경변수 로드 실패나 연동키 불일치를 의심하기 **전에 v1/v2 구분을 먼저 확인**하세요.

## 에러 디버깅 순서

1. 에러 메시지에서 코드 확인
2. receipt_id로 관리자에서 결제 상태 조회
3. 서버 SDK 응답의 \`status\`, \`message\` 필드 확인
4. Sandbox에서 동일 시나리오 재현 테스트

## 결제 검증 실패 시

결제 검증(verify)에서 금액 불일치가 발생하면:
- 클라이언트에서 전달한 금액과 서버에서 설정한 금액이 일치하는지 확인
- PG사 응답의 실제 결제 금액을 기준으로 비교

> 자세한 내용: \`get_doc("payment/sdk-error")\``,

        cancel: `# 취소 · 부분취소 · 환불 문제 해결

## 취소 상태값 — 결론부터

부트페이에는 **"취소 대기"·"환불 대기" 같은 중간 상태가 없습니다.** 취소는 1회성 요청이고 결과는 **취소완료 / 취소실패** 둘 중 하나입니다.

| 알고 싶은 것 | 어디서 판단하나 |
|---|---|
| 취소가 실패했다 | 별도 status 없음 → **취소 API의 에러 응답**으로 판별 |
| 정산 완료·잔액 부족으로 취소 불가 | 별도 status 없음 → 마찬가지로 **API 에러 응답** |
| 취소 대기 / 환불 대기 | **그런 상태는 없습니다** |
| 부분취소된 건 | \`status\`는 **결제완료 그대로**, \`cancelled_price > 0\` 으로 판단 |
| 취소 종류 구분 | 웹훅의 \`webhook_type\` (**SDK 5.0 이상에서만 전달**) |

- **취소 종류·사유를 웹훅에서 구분하려면 \`webhook_type\` 을 보세요. 단 \`webhook_type\` 은 SDK 5.0 이상에서만 전달됩니다** — 5.0 미만이면 이 필드 자체가 오지 않으므로 상태값만으로는 구분할 수 없습니다
- \`cancelled_price\` 는 그 시점까지의 **누적 기취소금액**입니다. 부분취소를 두 번 하면 두 번째 웹훅의 \`cancelled_price\` 는 합계로 들어옵니다
- 취소는 하나의 \`receipt_id\` 에 대해 atomic transaction 으로 처리되어 중복 처리되지 않습니다
- **결제 API는 아직 멱등키(idempotency key)를 지원하지 않습니다.** 중복 취소 요청 방지는 가맹점 쪽에서 막아야 합니다

## 카드사에 취소가 안 보여요

- **전액취소**: 카드사에 즉시 반영됩니다
- **부분취소**: 카드사 반영에 **영업일 기준 3~5일** 걸립니다. 관리자에 취소완료로 떠 있는데 카드 명세에 없다면 대부분 이 케이스입니다

## "취소금액이 미정산금액보다 큽니다"

PG사가 당일 정산 예정 금액에서 상계 처리하는데, 그 잔액보다 취소 요청 금액이 커서 나는 **PG사 에러**입니다.

- 부트페이는 PG사의 실시간 미정산 잔액을 조회하는 기능을 제공하지 않습니다
- 사용 중인 PG사 관리자·고객센터에서 미정산 잔액을 확인하고, 정산 유보를 요청한 뒤 취소를 진행하세요
- 미도래 정산금액이 있으면 취소 요청 시 PG사가 상계 처리 후 취소를 완료하는 PG도 있습니다

## 같은 결제에 취소 요청이 두 번 들어왔어요

부분취소는 **같은 \`receipt_id\` 로 여러 번** 발생합니다(\`status\`·\`webhook_type\` 동일). \`receipt_id\` 만으로 dedup 하면 두 번째 부분취소를 놓칩니다 → 누적 \`cancelled_price\` 나 취소 건 식별자까지 멱등키에 포함하세요.

## 부분취소 영수증

- 부분취소 건에 대한 **별도 영수증은 발급되지 않습니다**
- 기존 영수증(\`receipt_url\`)의 금액이 취소분을 반영해 갱신됩니다. 같은 URL을 다시 열면 됩니다

## 중복결제로 보이는 건

하나의 결제창에서 두 번 승인이 일어나는 일은 기술적으로 없습니다. **카드 승인번호(\`card_approve_no\`)가 다르면 창을 두 번 띄워 두 번 결제한 것**입니다. 승인번호를 먼저 비교하세요.

> 자세한 내용: \`get_doc("payment/cancel")\`, \`get_doc("webhook/guide")\`
> 결제 자체가 실패하는 문제는 \`get_troubleshooting("error")\``,

        cors: `# CORS / 도메인 문제 해결

## 먼저 — 도메인 등록은 결제 연동의 필수 조건이 아닙니다

**연동을 위해 웹앱 URL을 허용 도메인으로 반드시 등록해야 하는 것은 아닙니다.** 도메인 미등록은 \`APP_KEY_NOT_FOUND\` 의 원인이 아니며, 그 에러는 **키 값 자체가 잘못된 경우**(다른 프로젝트 키, 복사 실수, 플랫폼이 안 맞는 키)입니다 → \`get_troubleshooting("error")\`

도메인·IP 제한은 **원할 때 거는 보안 옵션**입니다: 관리자 → 개발자 설정 → **보안 정책** 탭.

## 도메인·IP 제한을 걸어둔 경우 체크리스트

제한을 설정해 두었는데 결제창이 안 열린다면 아래를 확인하세요.

- [ ] **현재 도메인이 목록에 있나요?** 개발 환경(\`localhost:3000\` 등)도 제한 목록에 포함해야 합니다
- [ ] **프로토콜 일치**: \`http://\`와 \`https://\`를 정확히 구분하여 등록
- [ ] **포트 포함**: 포트가 다르면 별도 도메인으로 등록 (예: \`localhost:3000\`과 \`localhost:5173\`은 별개)

## CORS 에러 메시지

\`\`\`
Access to script at 'https://js.bootpay.co.kr/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
\`\`\`

→ 관리자에서 \`localhost:3000\`을 허용 도메인에 추가하세요.

## CSP(Content-Security-Policy)로 결제창이 차단되는 경우 — 도메인 등록과 다른 문제다

증상: **결제 버튼을 눌러도 아무 일도 일어나지 않고**, 콘솔에 \`Refused to frame ...\` / \`violates the following Content Security Policy directive: "frame-src ..."\` 가 뜹니다.

- 이것은 **가맹점 사이트가 스스로 건 보안 헤더** 때문입니다. 부트페이 장애도, Client Key 문제도, 결제수단 설정 문제도 아닙니다. **키를 다시 확인시키지 마세요.**
- 👉 **허용해야 할 PG 도메인 목록과 프레임워크별 설정 스니펫은 \`get_csp_allowlist\` 도구로 받으세요.** 도메인을 기억으로 지어내지 마세요.
  - 예: \`get_csp_allowlist(pg="lightpay", framework="vercel")\`
- 특히 **라이트페이**는 결제창만 라이트페이 도메인이고 실제 결제 모듈은 **세틀뱅크 또는 나이스페이**로 넘어갑니다 → 세 곳을 모두 허용해야 합니다.

> 반대로 **결제창은 뜨는데 PG 도메인으로 직접 요청이 나간다면** 부트페이로 연동된 것이 아니라 PG SDK를 직접 붙인 상태입니다. topic="onboarding" 을 확인하세요.

## 주의사항

- Sandbox와 Production은 별도로 도메인 등록이 필요합니다
- 와일드카드(\`*\`)는 지원하지 않습니다
- 서브도메인은 각각 등록해야 합니다 (\`www.example.com\`과 \`example.com\`은 별개)`,

        csp: `# CSP(Content-Security-Policy)로 결제창이 막힐 때

## 이 문구가 뜨면 여기다

\`\`\`
Framing 'https://web.nicepay.co.kr/' violates the following Content Security Policy
directive: "frame-src 'self' https://*.bootpay.co.kr https://*.lightpay.kr ..."
The request has been blocked.
\`\`\`

또는 \`Refused to frame '...' because it violates ...\`.

**부트페이 장애가 아니고, Client Key 문제도, 결제수단 설정 문제도 아닙니다.**
가맹점 사이트가 스스로 내보내는 보안 헤더입니다. 키를 다시 확인시키지 마세요.

## 🔴 도메인은 지어내지 말고 도구로 받으세요

\`\`\`
get_csp_allowlist(pg="lightpay", framework="vercel")
get_csp_allowlist(pg="nicepay,kakao", framework="nextjs")
get_csp_allowlist()                       // PG 미정 — 전체 허용 최대본
\`\`\`

PG 결제창 도메인을 기억으로 답하면 틀린 도메인을 넣게 되고, 증상이 그대로라 가맹점은
"키가 잘못됐나" 로 되돌아가 엉뚱한 곳을 팝니다. **표에 없으면 콘솔 도메인을 그대로 넣으라고 안내하세요.**

## 🔴 라이트페이는 도메인이 3개다

라이트페이(\`pg: 'lightpay'\`)는 **결제창만** 라이트페이 도메인이고,
실제 결제 모듈은 **세틀뱅크 또는 나이스페이**로 넘어갑니다.

| 단계 | 도메인 |
|------|--------|
| 결제창 | \`https://*.lightpay.kr\` \`https://lightpay.kr\` |
| 내부 결제 모듈 | \`https://*.settlebank.co.kr\` \`https://settlebank.co.kr\` |
| 내부 결제 모듈 | \`https://*.nicepay.co.kr\` |

라이트페이 도메인만 허용하면 **결제창은 뜨는데 결제수단을 고른 다음 단계에서 막힙니다.**
"결제창은 떴는데 그 다음이 안 된다" 는 신고는 대부분 이것입니다.

## 🔴 카드사 ACS — PG 도메인과 다른 레이어다

PG 결제창 안에서 **카드 인증(3-D Secure·안심클릭)** 단계로 넘어가면 카드사 자체 서버가 프레임된다.
PG 도메인만 열어두면 여기서 막혀 **"카드 고르고 인증 단계에서 멈춘다"** 가 된다.
PG 차단과 증상이 비슷해 보이지만 **다른 도메인**이므로 콘솔 문구를 반드시 확인할 것.

\`get_csp_allowlist\` 는 이 도메인들을 **기본으로 포함**한다(카드결제를 안 받는 경우에만 제외).

| 카드사 | frame-src |
|--------|-----------|
| KB국민카드 | \`https://*.kbcard.com\` |
| BC카드 | \`https://*.bccard.com\` |
| 롯데카드 | \`https://*.lottecard.co.kr\` |
| 신한카드 | \`https://*.shinhancard.com\` |
| 현대카드 | \`https://*.hyundaicard.com\` |
| 하나카드 | \`https://*.hanacard.co.kr\` |
| 삼성카드 | \`https://*.samsungcard.co.kr\` |
| NH농협카드 | \`https://*.nonghyup.com\` |
| 우리카드 | \`https://*.wooricard.com\` **+ \`https://dacs.wooricard.com:8886\`** |
| 씨티카드 | \`https://*.citibank.co.kr\` |
| VPay(공동) | \`https://*.vpay.co.kr\` \`https://vpay.co.kr\` |

### 우리카드는 포트를 반드시 함께 적는다

\`\`\`
https://dacs.wooricard.com:8886/   → HTTP 302  (살아있음)
https://dacs.wooricard.com/        → 응답 없음  (:443 은 죽어 있음)
\`\`\`

**CSP host-source 는 포트를 생략하면 스킴 기본 포트(443)만 매칭한다.**
\`https://*.wooricard.com\` 으로는 \`:8886\` 을 못 덮는다. 포트를 명시한 항목이 따로 있어야 한다.
와일드카드로 다 되는 줄 알고 넘어가면 **우리카드 사용자만** 결제가 안 된다.

## 왜 가맹점 CSP 가 결제창 *안쪽*까지 막는가

\`open_type: 'iframe'\` 이면 SDK 가 만든 iframe 이 \`about:blank\`/\`srcdoc\` 상태로 시작하므로
**부모(가맹점) 페이지의 CSP 를 상속**합니다. 그래서 결제창 안에서 PG 로 넘어가는 프레임까지
가맹점 CSP 로 검사됩니다.

콘솔에 위반 문서로 결제창 도메인(예: \`paywin.lightpay.kr\`)이 찍히더라도,
**고쳐야 할 CSP 는 가맹점 서버(Vercel·Next.js·Nuxt·nginx)의 헤더**입니다.

## frame-src 만 고치면 안 되는 경우

| 지시어 | 언제 문제가 되나 |
|--------|-----------------|
| \`frame-src\` | 결제창 iframe. 가장 흔한 원인 |
| \`form-action\` | 이니시스·KCP 모바일은 **top-level form POST** 로 결제창을 전환한다. 이 지시어를 선언해 두었다면 frame-src 를 다 열어도 막힌다 |
| \`connect-src\` | SDK 의 승인·상태 조회 |
| \`script-src\` | 부트페이 SDK, 다음 주소검색 |
| \`img-src\` | 카드사 로고·QR 이 \`data:\`/\`blob:\` 로 들어온다 |
| \`default-src\` | \`frame-src\` 미선언 시 여기로 폴백된다 — \`default-src 'self'\` 만 있어도 동일 증상 |

## 적용 지점이 여러 개면 마지막 것이 이긴다

Vercel/Next.js 는 CSP 를 넣을 수 있는 곳이 셋입니다: \`vercel.json\` · \`next.config.js\` 의 \`headers()\` · \`middleware.ts\`.
**middleware 가 가장 나중에 실행되어 이깁니다.** \`<meta http-equiv="Content-Security-Policy">\` 태그로 박혀 있는 경우도 있습니다.

실제로 나가는 값 확인:

\`\`\`bash
curl -sI https://your-site.com | grep -i content-security-policy
\`\`\`

## 체크리스트

- [ ] \`get_csp_allowlist\` 로 받은 목록을 넣었나요? (기억으로 쓴 도메인 아님)
- [ ] 라이트페이면 세틀뱅크·나이스페이도 넣었나요?
- [ ] 카드사 ACS 도메인을 넣었나요? 특히 우리카드는 \`:8886\` 포트까지 적었나요?
- [ ] \`form-action\` 을 선언해 두었다면 거기에도 PG 도메인을 넣었나요?
- [ ] 샌드박스와 운영 도메인이 다른 PG가 있습니다 (\`sandbox-pay.nicepay.co.kr\` ↔ \`pay.nicepay.co.kr\`). 와일드카드면 둘 다 덮입니다
- [ ] 적용 지점이 하나인지 확인했나요? (vercel.json / next.config / middleware 중복)
- [ ] 운영 전환 전 \`Content-Security-Policy-Report-Only\` 로 먼저 돌려봤나요?

## ⚠️ CSP 를 다 열었는데 모바일만 여전히 안 된다면

CSP 허용목록은 **iframe 경로의 필요조건이지 충분조건이 아닙니다.**
모바일에서는 PG·결제수단·브라우저 조합에 따라 중첩 프레임 임베드 자체가 거부될 수 있고,
그건 CSP 로 풀리지 않습니다. 이 경우 \`open_type: 'redirect'\` 로 전환하세요 → topic="open-type"`,

        'open-type': `# open_type — iframe · popup · redirect 와 결과 이벤트 처리

## 🔴 기기에 따라 권장값이 다릅니다

결제창은 **중첩 iframe** 구조입니다 — 가맹점 페이지 → 결제창 → 그 안에서 다시 PG 결제 모듈.
**모바일에서 이게 항상 막히는 것은 아닙니다.** 잘 도는 조합도 많습니다.
다만 PG·결제수단·브라우저 조합에 따라 프레임 임베드가 거부되거나 앱 전환 후 복귀가 실패하는 경우가 있고,
**어느 조합에서 깨지는지 미리 알 수 없다**는 것이 문제입니다.

| 기기 | \`open_type\` | 근거 |
|------|--------------|------|
| **PC (데스크톱 브라우저)** | \`iframe\` | 중첩 프레임이 대체로 문제없다. CSP만 열어주면 됨 |
| **모바일 (iOS·Android·인앱브라우저)** | **\`redirect\` 권장** | 조합에 따라 중첩 iframe 이 거부될 수 있다. CSP 로는 못 푸는 케이스가 있다 |

실패했을 때의 모양이 나쁩니다 — **결제는 승인됐는데 가맹점 화면만 결과를 못 받는** 상태가 되어
"결제했는데 주문이 없다" 는 CS 로 돌아옵니다. 그래서 모바일은 \`redirect\` 를 기본값으로 권합니다.

### iframe 을 피하는 편이 확실한 경우

- **라이트페이(\`pg: 'lightpay'\`)** — 결제창(paywin.lightpay.kr) 안에서 다시 세틀뱅크 또는 나이스페이를
  iframe 으로 로딩하므로 프레임이 3단(가맹점 → 라이트페이 → 세틀뱅크/나이스페이)이 됩니다. 실패 확률이 가장 높습니다.
- **네이버페이** — \`x-iframe\` 을 허용하지 않아 PC 에서도 popup 또는 redirect 가 필요합니다.
- **인앱브라우저**(카카오톡·인스타그램·페이스북·네이버) — 팝업·프레임 제약이 가장 심합니다.

증상 지문: "모바일에서만 결제창이 안 뜬다", "PC 는 되는데 폰에서는 하얀 화면",
"결제수단 고르니까 멈춘다". **PC 테스트만 하고 배포해 놓치는** 대표적 사고입니다.

\`\`\`javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

await Bootpay.requestPayment({
  // ... 생략
  extra: {
    open_type: isMobile ? 'redirect' : 'iframe',
    redirect_url: window.location.origin + '/payment/result',   // redirect 경로에서 필수
    separately_confirmed: true,     // 🔴 서버승인(분리승인)
  },
  // iframe/popup 경로에서만 호출됨
  confirm: async (data) => {
    await postConfirm(data.receipt_id, data.order_id)
    window.location.href = '/payment/result?order_id=' + (data.order_id || '')
  },
})
\`\`\`

브라우저별로 더 세밀하게 나누려면 \`extra.browser_open_type\` 을 씁니다
(\`kakaotalk\`, \`facebook\`, \`naver\`, \`instagram\`, \`mobile_safari\`, \`mobile_chrome\`).

## 🔴 두 경로는 결과 수신 방식이 다릅니다 — 양쪽 다 구현해야 합니다

기기 분기를 넣고 **한쪽 처리만 짜는 것이 가장 흔한 사고**입니다.
PC 에서 테스트했으니 다 됐다고 판단하고 배포하면, 모바일 사용자 전원이 결과를 못 받습니다.

| open_type | 결과 수신 | 구현해야 하는 것 |
|-----------|----------|-----------------|
| \`iframe\` / \`popup\` | \`confirm\` 콜백 (JS) | \`confirm:\` 핸들러 |
| \`redirect\` | \`redirect_url\` 페이지로 복귀 | **결과 페이지 라우트** + 파라미터 판독 |

### redirect 결과 페이지

\`\`\`javascript
// /payment/result
export async function handlePaymentResult() {
  const q = new URLSearchParams(window.location.search)
  const event = q.get('event')          // 'confirm' | 'cancel' | 'error' | 'done'

  if (event === 'cancel') return { ok: false, message: '결제가 취소되었습니다.' }
  if (event === 'error')  return { ok: false, message: q.get('message') || '결제 중 오류' }

  if (event === 'confirm') {
    const receiptId = q.get('receipt_id')
    // 🔴 승인은 서버가 confirmPayment() 로 수행합니다. 프론트는 전달만.
    const r = await fetch('/api/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_id: receiptId, order_id: q.get('order_id') }),
    }).then(res => res.json())
    return r.success ? { ok: true } : { ok: false, message: r.message }
  }

  // 서버승인에서는 done 이 오지 않습니다 — 서버 DB 를 조회해 표시하세요.
  return { ok: false, message: '결제 상태를 확인할 수 없습니다.' }
}
\`\`\`

전달 파라미터: \`event\` · \`receipt_id\` · \`order_id\` · \`status\` · \`status_locale\` · \`message\`

⚠️ **레거시 SDK 는 \`redirect_url\` 로 쿼리가 아니라 POST 로 넘깁니다.** 그 경우 Content-Type 이
\`application/json\` 이 아니라 \`receipt_id\`·\`order_id\` 정도만 받을 수 있습니다.
결과 페이지는 **쿼리와 POST body 를 모두 읽도록** 짜는 편이 안전하고, 상세 정보는
\`receipt_id\` 로 결제 단건조회 API 를 호출해 채우세요.

## redirect 는 서버 라우트가 필요합니다

\`redirect_url\` 은 **실제로 존재하는 페이지**여야 합니다. SPA 라면 그 경로가 404 로 떨어지지 않도록
라우팅(또는 rewrite)이 잡혀 있어야 합니다. 여기서 404 가 나면 "결제하고 나니 페이지가 없다" 가 됩니다.

## 웹훅은 어느 경로든 별도로 필요합니다

클라이언트 결과 처리(콜백이든 redirect 든)는 **유실될 수 있습니다** — 앱 전환 실패, 네트워크 단절,
사용자가 브라우저를 닫음. 결제 확정의 진실은 웹훅과 서버 조회입니다 → topic="webhook"

## popup 은 언제 쓰나

- iframe 을 지원하지 않는 결제수단(네이버페이·이니시스 모바일 카드 일부)
- 단, 팝업차단 정책 때문에 **구매자의 직접 클릭**이 필요합니다 → UI 스텝이 하나 늘어납니다
- 인앱브라우저(카카오톡·인스타그램·페이스북)에서는 팝업이 자주 막히므로 \`redirect\` 가 낫습니다

## iframe 을 쓰면 CSP 를 함께 봐야 합니다

iframe 은 부모 페이지의 CSP 를 상속하므로 PG 도메인이 \`frame-src\` 에 없으면 막힙니다
→ topic="csp" · \`get_csp_allowlist\``,

        mobile: `# 모바일 앱 문제 해결

## 🔴 모바일 웹은 open_type 을 redirect 로 권장합니다

PC 는 \`iframe\` 으로 띄워도 되지만, **모바일(iOS·Android·인앱브라우저)은 \`redirect\`** 를 권합니다.
결제창은 **중첩 iframe**(가맹점 → 결제창 → PG 모듈) 구조인데, 모바일에서 이게 항상 막히지는 않지만
PG·결제수단·브라우저 조합에 따라 프레임 임베드가 거부되거나 앱 복귀가 실패할 수 있고,
그런 경우 **CSP 를 열어도 풀리지 않습니다.** 라이트페이(\`pg: 'lightpay'\`)는 결제창 안에서
세틀뱅크·나이스페이를 다시 로딩해 프레임이 3단이라 실패 확률이 가장 높습니다.

\`\`\`javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
extra: {
  open_type: isMobile ? 'redirect' : 'iframe',
  redirect_url: window.location.origin + '/payment/result',
}
\`\`\`

증상 지문: "모바일에서만 결제창이 안 뜬다" · "PC 는 되는데 폰에서는 하얀 화면" ·
"결제수단 고르니까 멈춘다". **PC 테스트만 하고 배포해 놓치는** 대표적 사고입니다.

⚠️ 기기 분기를 넣었으면 \`confirm\` 콜백(iframe/popup)과 결과 페이지 파라미터 판독(redirect)
**양쪽을 모두** 구현해야 합니다 → topic="open-type"

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

## 카드사별 결제 방식은 가맹점이 바꿀 수 없습니다

특정 카드만 앱카드가 아닌 다른 인증 화면으로 뜨는 것은 **PG사–카드사 간 연동 정책**이며, \`open_type\` 을 바꾸거나 SDK 옵션을 조정해도 달라지지 않습니다.

- **KCP + 국민카드 → ISP 결제**: KCP가 국민카드에 대해 ISP를 권장 방식으로 두고 있어 앱카드 호출로 변경할 수 없습니다
- 삼성카드 모니모 등 간편결제 앱으로 이동한 뒤 진행이 멈추는 현상은 해당 카드사 앱 이슈인 경우가 많습니다 → 앱 완전 종료 후 재시도로 먼저 확인하세요
- 리다이렉트 전환을 권하기 전에, **바꿀 수 있는 문제인지부터** 구분하세요

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

        widget: `# 결제위젯 가이드

## 위젯 vs 일반 결제창

| | 결제위젯 | 일반 결제창 |
|---|---|---|
| UI | 페이지에 임베드 | 팝업/리다이렉트 |
| CDN | \`bootpay-widget-{ver}.min.js\` | \`bootpay-{ver}.min.js\` |
| API | \`BootpayWidget.render()\` | \`Bootpay.requestPayment()\` |
| 결제수단 선택 | 위젯 내부에서 사용자가 선택 | 결제창에서 선택 |
| 약관 동의 | \`use_terms: true\`로 위젯 내 표시 가능 | 별도 처리 |

## 위젯 렌더링 (Web)

\`\`\`html
<script src="https://js.bootpay.co.kr/bootpay-widget-5.x.x.min.js"></script>

<div id="bootpay-widget"></div>
<button id="pay-button" disabled>결제하기</button>
\`\`\`

\`\`\`javascript
BootpayWidget.render('#bootpay-widget', {
    client_key: process.env.BOOTPAY_CLIENT_KEY, // .env에서 설정 (list_keychains로 조회)
    price: 50000,
    order_name: '나이키 운동화 외 1건',
    order_id: 'order_' + Date.now(),
    pg: 'nicepay',
    use_terms: true,   // 약관 동의 UI 표시
    user: { username: '홍길동', phone: '01012345678' },
    extra: { card_quota: '0,2,3,4,5,6' },

    // ── 이벤트 훅 ──
    hooks: {
        ready: () => {
            console.log('위젯 렌더링 완료')
        },

        paymentMethodUpdated: (data) => {
            // 사용자가 결제수단을 선택/변경할 때 호출
            console.log('선택된 결제수단:', data.method)
        },

        allTermsAccepted: () => {
            // 모든 필수 약관에 동의했을 때 호출
            // 이 시점에 결제 버튼을 활성화하세요
            document.getElementById('pay-button').disabled = false
        },

        confirm: (data) => {
            // 승인형 결제: 서버에서 최종 승인 여부 결정
            // true 반환 시 결제 진행, false 시 중단
            return true
        },

        done: (data) => {
            console.log('결제 성공:', data.receipt_id)
            // TODO: 서버로 receipt_id 전달하여 검증
        },

        error: (data) => {
            // ⚠️ 에러 발생 시 반드시 콘솔에 로깅 — 디버깅의 핵심 단서입니다
            console.error('Bootpay 결제 에러:', data)
        },

        cancel: (data) => {
            console.warn('Bootpay 결제 취소:', data)
        },

        close: () => {
            console.log('결제창 닫힘')
        }
    }
})
\`\`\`

## 이벤트 시스템

### Web hooks

| 이벤트 | 시점 | 데이터 | 용도 |
|--------|------|--------|------|
| \`ready\` | 위젯 렌더링 완료 | — | 로딩 상태 해제 |
| \`paymentMethodUpdated\` | 결제수단 선택/변경 | \`{ method }\` | 선택된 수단 표시, 가격 업데이트 |
| \`allTermsAccepted\` | 모든 필수 약관 동의 | — | **결제 버튼 활성화** |
| \`confirm\` | 결제 직전 (승인형) | \`{ receipt_id, ... }\` | 서버 승인 여부 결정 |
| \`done\` | 결제 완료 | \`{ receipt_id, ... }\` | 서버 검증 요청 |
| \`error\` | 에러 발생 | \`{ message, code }\` | 에러 처리 |
| \`cancel\` | 사용자 취소 | — | 취소 처리 |
| \`close\` | 창 닫힘 | — | 정리 |

### 모바일 콜백 (Android/iOS/Flutter/RN)

| 콜백 | 데이터 | 용도 |
|------|--------|------|
| \`onWidgetChangePayment\` / \`setOnChangePayment\` | \`WidgetData\` | 결제수단 변경 시 payload 업데이트 |
| \`onWidgetChangeAgreeTerm\` / \`setOnChangeAgreeTerm\` | \`WidgetData\` | 약관 동의 상태 변경 시 payload 업데이트 |
| \`onWidgetResize\` | \`height\` | 위젯 높이 변경 시 레이아웃 조정 |

**모바일 핵심 패턴**: 이벤트 수신 후 반드시 \`payload.mergeWidgetData(data)\`를 호출하세요.
\`payload.widgetIsCompleted\`가 \`true\`가 되면 결제 버튼을 활성화합니다.

\`\`\`
// Flutter 예시
onWidgetChangePayment: (widgetData) {
    setState(() { _payload.mergeWidgetData(widgetData); });
},
onWidgetChangeAgreeTerm: (widgetData) {
    setState(() { _payload.mergeWidgetData(widgetData); });
},

// 버튼 활성화 조건
ElevatedButton(
    onPressed: _payload.widgetIsCompleted ? _requestPayment : null,
)
\`\`\`

## 결제 버튼 활성화 조건

**약관 동의(\`use_terms: true\`)를 사용할 때**, 결제 버튼은 아래 조건이 모두 충족되어야 활성화합니다:
1. 결제수단이 선택됨
2. 모든 필수 약관에 동의됨

| 플랫폼 | 활성화 판단 방법 |
|--------|----------------|
| Web | \`allTermsAccepted\` 훅 호출 시 |
| Android/iOS | \`payload.widgetIsCompleted == true\` |
| Flutter | \`_payload.widgetIsCompleted == true\` |
| React Native | \`widgetData?.term_passed && widgetData?.completed\` |

## 위젯 유틸리티 API (Web)

| API | 용도 |
|-----|------|
| \`BootpayWidget.render(selector, options)\` | 위젯 렌더링 |
| \`BootpayWidget.update({ price, tax_free })\` | 금액/옵션 동적 변경 |
| \`BootpayWidget.requestPayment(options)\` | 결제 요청 |
| \`BootpayWidget.currentTermsCondition()\` | 약관 동의 상태 조회 |
| \`BootpayWidget.currentPaymentParameters()\` | 현재 결제 파라미터 조회 |
| \`BootpayWidget.destroy()\` | 위젯 제거 |

## 위젯 렌더링 안 되는 경우 체크리스트

- [ ] **CDN 스크립트**: \`bootpay-widget-{ver}.min.js\`를 사용하고 있나요? (일반 \`bootpay-{ver}.min.js\`가 아닌)
- [ ] **DOM 타이밍**: \`#selector\` 요소가 DOM에 존재한 후 렌더링을 호출하나요?
- [ ] **Client Key**: 올바른 Client Key를 사용하고 있나요?
- [ ] **PG 활성화**: 관리자에서 사용할 PG가 활성화되어 있나요?

> 자세한 내용: \`get_doc("payment/widget")\`, \`get_doc("payment/widget-render")\`, \`get_doc("payment/widget-quickstart")\``,

        unified: `# 통합결제창 가이드

## 통합결제창이란?

\`pg\`와 \`method\` 파라미터를 지정하지 않고 결제를 요청하면, 관리자에서 활성화한 모든 PG사와 결제수단이 하나의 창에 표시되어 **사용자가 직접 선택**할 수 있는 결제 UI입니다.

## 통합결제창 vs 단일 결제창

| 구분 | pg/method | 동작 |
|------|:---------:|------|
| **통합결제창** | **생략** | 활성화된 모든 PG·결제수단 표시 → 사용자 선택 |
| **단일 결제창** | **지정** | 해당 PG·결제수단으로 바로 이동 |

## 코드 예시

\`\`\`javascript
// ✅ 통합결제창: pg, method 생략
await Bootpay.requestPayment({
  client_key: 'YOUR_CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_' + Date.now(),
  // pg, method 없음 → 통합결제창
})

// 단일 결제창: pg, method 지정
await Bootpay.requestPayment({
  client_key: 'YOUR_CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_' + Date.now(),
  pg: 'nicepay',
  method: 'card',
})
\`\`\`

## 통합결제창이 안 뜨는 경우 체크리스트

- [ ] **결제수단 2개 이상 활성화**: 관리자에서 최소 2개 결제수단이 활성화되어 있나요?
  - MCP: \`get_payment_settings\`로 확인, \`activate_payment_method\`로 활성화
  - 결제수단이 1개만 활성화되면 통합결제창 없이 바로 해당 결제수단으로 이동합니다
- [ ] **pg/method 파라미터 확인**: \`requestPayment()\` 호출 시 \`pg\`와 \`method\`를 **생략**했나요?
  - \`pg\`나 \`method\`를 지정하면 통합결제창이 아닌 단일 결제창이 표시됩니다
- [ ] **Client Key 확인**: 올바른 Client Key를 사용하고 있나요?
- [ ] **PG 상태 확인**: 활성화한 PG사의 심사가 완료되어 있나요? (Sandbox에서는 무관)

## 자주 묻는 질문

**Q: 통합결제창에서 특정 결제수단만 표시하고 싶어요**
→ 관리자에서 표시하고 싶은 결제수단만 활성화하세요. 비활성화된 결제수단은 통합결제창에 표시되지 않습니다.

**Q: 통합결제창 대신 특정 결제수단으로 바로 가고 싶어요**
→ \`pg\`와 \`method\` 파라미터를 지정하면 해당 결제수단으로 바로 이동합니다.

**Q: 위젯에서도 통합결제창을 쓸 수 있나요?**
→ 결제위젯(\`BootpayWidget\`)은 기본적으로 통합결제창 방식으로 동작합니다. \`pg\`를 지정하고 \`method\`를 생략하면 해당 PG의 활성 결제수단이 위젯 내에 표시됩니다.

**Q: 모바일(Android/iOS/Flutter)에서도 통합결제창이 지원되나요?**
→ 네. 모든 플랫폼에서 동일하게 \`pg\`와 \`method\`를 생략하면 통합결제창이 표시됩니다.

## 서버 검증

통합결제창이든 단일 결제창이든 서버 검증 로직은 동일합니다. 결제 완료 후 \`receipt_id\`를 서버로 전달하여 검증하세요.

> 자세한 내용: \`search_docs("통합결제")\`, \`get_doc("payment/request")\``,

        certification: `# 본인인증 문제 해결

## ⚠️ 코드보다 먼저 — 본인인증은 결제와 별개의 가맹 계약이다

**결제 PG 계약이 있어도 본인인증은 따로 신청해야 합니다.** 코드를 다 짜 놓고 여기서 막히는 경우가 많습니다.

- 신청: [부트페이 관리자 → PG 신청](https://admin.bootpay.co.kr/pg/join) 의 **본인확인 서비스** 탭
- **사업자등록번호가 필요합니다.** 개인 자격으로는 신청할 수 없습니다.
- **다른 PG(예: KCP)와 이미 본인인증 직계약이 있어도, 부트페이를 통해 재가맹해야 합니다.**
  기존 계약을 파기할 필요는 없지만 신청 절차가 달라 **신규 계약처럼 다시 진행**하고, 부트페이를 통한 연동정보를 새로 발급받습니다.
- **별도의 계약비는 없습니다.**
- 소요 기간: **영업일 기준 5일 정도**. 신청 후 메일로 계약 안내가 갑니다.

## 서버리스(Lambda·Vercel 등)에서도 됩니다 — 단, 서버 조회는 생략 불가

"상시 서버가 없어서 본인인증을 못 붙인다"는 오해가 흔한데 그렇지 않습니다.

- 필요한 것은 **REST API를 1회 호출할 수 있는 서버 측 코드**뿐입니다. Lambda 함수 하나면 충분합니다.
- **생략하면 안 되는 이유**: 개인 고유값 \`unique\`(DI)는 **클라이언트에 노출되면 안 됩니다.**
  그래서 인증 결과는 반드시 서버에서 \`certificate(receipt_id)\` 로 조회해 가져와야 합니다.
- 프론트에서 받은 이름·전화번호를 그대로 믿고 저장하는 구현은 위조 가능합니다.

## 인증창이 안 뜨는 경우 체크리스트

- [ ] **다날 본인인증 상품 계약·활성화**: 관리자 → PG 설정에서 다날 본인인증이 켜져 있나요?
- [ ] **pg/method 값 확인**: Web은 \`pg: 'danal'\` + \`method: 'auth'\`, 모바일 SDK는 \`pg: '다날'\` + \`method: '본인인증'\`을 사용하고 있나요?
- [ ] **authentication_id 유니크**: 결제의 \`order_id\`처럼 매 요청마다 고유한 값을 생성하고 있나요? (중복 시 \`AUTH_ALREADY_AUTHENTICATED\`)
- [ ] **client_key·허용 도메인**: 올바른 Client Key를 사용하고, 현재 도메인이 관리자에 등록되어 있나요?

## 인증은 됐는데 정보를 못 가져오는 경우

- [ ] **receipt_id를 서버로 전달했는지**: \`done\` 이벤트에는 \`receipt_id\`만 내려옵니다. 이 값을 서버로 전달했나요?
- [ ] **certificate 조회 status가 12인지**: \`certificate(receipt_id)\` 응답의 \`status\`가 \`12\`(본인인증완료)인지 확인했나요? 12가 아니면 인증 미완료 상태입니다.
- [ ] **30분 유효시간**: 인증 확인은 30분 이내에 처리해야 합니다. 초과 시 \`AUTH_EXPIRED\`가 발생합니다.
- [ ] **AUTH_NOT_CONFIRMED**: 사용자가 인증을 완료하기 전에 조회를 시도하지 않았나요? 완료 후 다시 조회하세요.

## 에러 코드

| 에러 코드 | 상황 | 처리 |
|-----------|------|------|
| \`AUTH_NEED_PG_METHOD\` | \`pg\`·\`method\` 누락 | 요청 파라미터에 \`pg: 'danal'\`, \`method: 'auth'\`를 채우세요 |
| \`AUTH_ALREADY_AUTHENTICATED\` | 이미 완료된 인증 건 재요청 | 새 \`authentication_id\`로 처음부터 다시 요청하세요 |
| \`AUTH_EXPIRED\` | 인증 확인 유효시간(30분) 초과 | 인증을 처음부터 다시 요청하세요 |
| \`AUTH_NOT_CONFIRMED\` | 승인 전 인증 건 조회 | 사용자 인증 완료 후 다시 조회하세요 |

## 전체 흐름

\`\`\`
[프론트엔드]                         [서버]                              [Bootpay/다날]
    │  1. requestAuthentication()     │                                    │
    │─────────────────────────────────┼───────────────────────────────────→│
    │  2. 사용자: 통신사 선택·휴대폰 인증│                                    │
    │  3. done 이벤트 (receipt_id)    │                                    │
    │←────────────────────────────────┼────────────────────────────────────│
    │  4. receipt_id를 서버로 전달     │                                    │
    │─────────────────────────────→   │                                    │
    │                                 │  5. certificate(receipt_id)         │
    │                                 │───────────────────────────────────→│
    │                                 │←───────────────────────────────────│
    │                                 │  6. status 12 확인                  │
    │                                 │  7. authenticate_data 저장 (DB)    │
\`\`\`

## 자주 하는 실수

1. **클라이언트가 보낸 이름·전화번호를 그대로 저장** → 서버가 \`certificate\`로 조회한 값으로 저장하세요
2. **status 확인 없이 완료 처리** → \`status\`가 \`12\`(본인인증완료)일 때만 완료로 처리하세요
3. **done의 receipt_id 외 인증 정보를 기대** → 이름·생년월일 등은 보안상 클라이언트로 내려오지 않습니다
4. **중복가입 방지를 이름+생일로 판단** → \`authenticate_data.unique\`(DI, 개인 고유값)로 동일인을 식별하세요

> 자세한 내용: \`get_doc("payment/certification")\``,
      };

      return {
        content: [{
          type: 'text' as const,
          text: guides[topic] ?? `"${topic}"에 대한 트러블슈팅 가이드가 없습니다.`,
        }],
      };
    }
  );
}
