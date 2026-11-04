# Commerce 호스팅 주문서 세션 인계와 만료 재시도

가맹점 서버(BFF)가 `POST /v1/orders/prepare`로 **일반 상품 주문**을 만들고 호스팅 주문서(`shop.bootpay.co.kr` 또는 `<subdomain>.bootpay.shop`)로 보내는 흐름의 계약이다. `generate_commerce_code(framework: "nextjs", step: "order" | "checkout")`가 만드는 `lib/checkout.ts`·`lib/checkout-ledger.ts`·`app/api/checkout/route.ts`·`lib/checkout-client.ts`가 이 문서를 구현한다. 다른 프레임워크에는 현재 실행 코드 대신 구현 가이드만 제공한다. 선택한 프레임워크에서 같은 서버 BFF 계약을 구현한다.

## 1. 인증 경계 — 쿠키는 도메인을 넘지 않는다

| 위치 | 자격 | 설정 주체 | 도달 범위 |
| --- | --- | --- | --- |
| 가맹점 BFF 세션 | HttpOnly·SameSite=Lax 쿠키에 봉인한 Commerce 회원 JWT | 가맹점 서버 | 가맹점 도메인 |
| 주문 준비 API 호출 | `Authorization: Basic`(client_key:secret_key) + `Bootpay-User-JWT` + `Idempotency-Key` | 가맹점 서버 | 서버 → API |
| 호스팅 주문서 | `__tc`(세션 token)·`__du`(기기 UUID)·`__ck`(client key) 쿠키 | `/b` 브리지 또는 호스팅 로그인 | 호스팅 도메인 |
| iframe SDK 주문서 | 부모 창과 주고받는 메시지 세션(csr 모드) | SDK | iframe |

- 가맹점 쿠키는 호스팅 도메인에 자동으로 공유되지 않는다. 회원 JWT를 URL query·hash에 붙이거나 다른 도메인 쿠키로 강제 공유하지 않는다.
- `Bootpay-User-JWT`는 Commerce 회원 JWT다. 결제 위젯 `user_token`이나 지원하지 않는 `auto_login_token` 필드로 대체하지 않는다.
- secret_key와 회원 JWT는 서버에만 둔다. 브라우저 번들·localStorage·로그에 넣지 않는다.

## 2. 주문 준비 요청 (서버에서만)

```json
{
  "method": "POST",
  "path": "/v1/orders/prepare",
  "headers": {
    "Authorization": "Basic <server credential>",
    "Bootpay-User-JWT": "<member JWT — 회원일 때만>",
    "Bootpay-Device-UUID": "<견적과 같은 서버 세션 기기 ID>",
    "Idempotency-Key": "<브라우저 세션·로그인 주체·시도별로 안정된 키>"
  },
  "body": {
    "quote_token": "<cart/order-preview가 발급한 견적 토큰>",
    "uct": 1,
    "response_type": "url",
    "redirect_url": "https://<merchant origin>/checkout/return",
    "use_auto_login": true
  }
}
```

- 먼저 `POST /v1/cart/order-preview`에서 `checkout_ready:true`·`quote_token`을 받고 같은 구매자·기기로 준비한다. `price/products`는 생략한다. 토큰 오류를 구형 가격 계약으로 우회하지 않는다. 상세: `get_doc("commerce/storefront-development")`.
- 최초 토큰·본문·멱등키를 함께 고정한다. 결과 불명 상태에서 토큰이나 키를 자동 교체하지 않는다. 복귀 URL은 등록된 HTTPS 호스트여야 한다.
- `use_auto_login`은 회원 JWT가 있으면 `true`, 비회원이면 `false`다. 명시한 `false`는 그대로 보낸다.
- 본문의 `redirect_url`은 결제 후 돌아올 **가맹점** 페이지다. 응답 `/b` URL 안의 `redirect_url`(세션 설정 후 들어갈 **호스팅 주문서 경로**)과 다른 값이다.

| 요청 | API 응답 |
| --- | --- |
| url 모드 + `true` + 유효한 회원 JWT | `{ order_number, url }` — `url`은 `/b/{client_key}?__s=…&redirect_url=…` |
| url 모드 + `true` + JWT 없음·무효 | 주문 생성 전 401 `USER_SESSION_INVALID`(420) |
| url 모드 + `false`·생략 | 직접 주문서 URL(`/mall/{client_key}/order/{order_number}` 또는 `<subdomain>.bootpay.shop/order/{order_number}`). 자동 로그인 없음 |
| url 모드 아님 | `{ order_id, order_number, order_name, price, expired_at }` |

`true` 요청에 `/b`를 돌려주는 것은 API의 책임이다. API 배포 전이면 직접 URL이 올 수 있고, 이것은 소비자가 고칠 문제가 아니라 API 계약 결함·미배포다(§3의 `AUTO_LOGIN_BRIDGE_MISSING`).

## 3. 반환 URL 소비 — 검사만 하고 원문 그대로

소비자(BFF·SDK·MCP·브라우저)는 API 응답의 `url`을 **바이트 그대로** 반환하고 이동한다. 검사 항목:

1. `https:`, 모드별 허용 호스트, 사용자 정보·포트·hash 없음. production은 `shop.bootpay.co.kr`·`<label>.bootpay.shop`, stage는 `stage-shop.bootpay.co.kr`·`<label>.stage.bootpay.shop`, development는 `dev-shop.bootpay.co.kr`·`<label>.dev.bootpay.shop`.
2. 직접 URL은 경로가 `/mall/{key}/order/{order_number}` 또는 `/order/{order_number}`이고 query가 없다.
3. `/b/{client_key}`는 `__s`가 한 번 있고 비어 있지 않으며, `redirect_url`이 같은 origin의 주문 경로다. shop 호스트는 `/mall/{같은 client_key}/order/{order_number}`, 서브도메인은 `/order/{order_number}`이고 query·hash가 없다.
4. URL이 가리키는 주문번호가 응답의 `order_number`와 같다.
5. 회원 JWT로 요청했는데 `/b`가 아니면 502 `AUTO_LOGIN_BRIDGE_MISSING`이다. 이미 만들어진 주문번호는 소유 기록에 남기고 새 주문을 자동으로 만들지 않는다.

금지: `__s` 암호화·복호화, `/b` URL 조립, 직접 URL을 `/b`로 감싸기, query 재인코딩, JWT를 URL에 추가, `__s`·완성 URL을 로그·분석 이벤트·오류 응답에 남기기. `__s`는 암호화돼 있어도 bearer 세션 자료다. 진단 목적으로 수동 조립한 `/b` URL을 운영 우회로 쓰지 않는다. 커스텀 도메인 주문서는 위 허용 호스트에 없으므로 쓰려면 허용 목록에 명시적으로 추가한다.

## 4. 일반 주문 `/b`와 청구서(invoice) 경로는 다르다

| 경로 | 용도 |
| --- | --- |
| `/b/{client_key}?__s=…&redirect_url=…` | 일반 상품 주문의 범용 세션 브리지. 회원 자동 로그인 준비 시 API가 완성해서 반환 |
| `/mall/{client_key}/order/{order_number}`, `<subdomain>.bootpay.shop/order/{order_number}` | 직접 주문서. `use_auto_login` false·생략 응답 |
| `/i/{clientKey}/{invoiceId}/session`, `/i/{invoiceId}/session` | 청구서 전용 브리지. `GET /mall/invoice/session/{invoiceId}` → `{ token?, redirect_url }` |

- `invoiceId`는 청구서(Invoice) 문서 ID다. 일반 주문번호나 주문서 ID를 넣지 않는다.
- `/order/{id}/session`, `mall/order/{id}/session` 같은 경로는 없다. 만들어서 호출하지 않는다.
- 일반 주문의 세션 인계 경로는 `/b`다. "중간 페이지가 없다"고 결론 내리지 않는다.

## 5. 호스팅 쪽 세션 복원 절차 (가맹점이 구현하지 않는 경계)

아래는 호스팅 주문서가 하는 일이다. 가맹점·MCP 생성물은 이 과정을 복제하지 않고, 검증할 때 기대 동작의 기준으로만 쓴다.

1. `/b/{client_key}`: client key 설정 → `__s` 복호화 → token·UUID로 `__tc`·`__du` 설정 → `redirect_url`로 이동. **명시적 세션 인계**라서 호스팅에 있던 기존 로그인을 `__s`에 담긴 회원 세션으로 바꾼다. 복호화에 실패하면 기존 쿠키가 그대로 남는다.
2. 주문서 로드: 호스팅 내부 `GET mall/order_pre/{order_number}`(`/v1` API가 아니다)의 암호화 응답을 기존 복호화 경로로 읽는다. 서버는 회원 주문이고 `use_auto_login`으로 만든 주문일 때만 임시 `token`을 넣는다.
3. 직접 URL 호환 경로: 익명·비 iframe일 때만 `token` 적용 → `await session.alive()` 완료 → 다음 단계. 기존 로그인 세션은 덮어쓰지 않는다.
4. 소유자 검사: 회원 주문인데 세션이 없으면 `session_not_found`, 세션 회원이 주문 소유자와 다르면 `session_mismatch`. 오류가 없을 때만 `order-pre:loaded` 후속 hook(배송지·지갑·결제 위젯)이 실행된다.

| 진입 | 브라우저 상태 | 기대 결과 |
| --- | --- | --- |
| `/b` | 새 익명 브라우저 | `__tc`·`__du` 설정 → 세션 회원 = 주문 소유자 → 주문서 로드 |
| `/b` | 같은 회원 로그인 | 같은 회원 세션으로 교체 → 로드 |
| `/b` | 다른 회원 로그인 | `__s`의 주문 소유자 세션으로 교체 → 소유자 일치 확인 후 로드 |
| `/b` | `__s` 복호화 실패 | 기존 세션 유지 → `session_not_found` 또는 `session_mismatch` |
| 직접 URL | 새 익명·비 iframe | `token`이 있으면 적용 → `session.alive` 완료 → 소유자 일치 시 로드. `token`이 없으면 `session_not_found` |
| 직접 URL | 같은 회원 로그인 | 그대로 로드 |
| 직접 URL | 다른 회원 로그인 | 기존 세션 유지 → `session_mismatch` |
| iframe SDK | 부모 창 세션 | token 적용·소유자 검사를 하지 않음(SDK 세션 사용) |
| 비회원 주문 | — | 회원 세션 검사 없음 |

직접 URL 경로의 `token` 소비는 `/b` 반환 계약을 대신하지 않는 보조 경로다. 이 절은 호스팅 소스 기준 설명이며 배포 상태는 따로 확인한다.

## 6. 재시도와 만료 — 이전 주문 상태를 먼저 확인한다

브라우저는 `requestId`(UUID v4)를 `source`(`cart`·`buy_now`)와 상품 구성별로 sessionStorage에 보관하고 진행 중 요청을 하나만 둔다. 서버 ledger는 (브라우저 세션, 로그인 주체, `requestId`) 단위로 결과를 기록한다. 같은 키의 재요청이 오면 저장된 URL을 돌려주기 **전에** 그 세션이 소유한 주문번호로 `GET /v1/orders/{order_number}`를 조회한다. 사용자가 보낸 임의 주문번호를 가맹점 권한으로 조회하는 공용 프록시는 만들지 않는다.

| 확인 결과 | BFF 응답 | 브라우저 | 새 prepare |
| --- | --- | --- | --- |
| 기록 없음(새 시도) | 회원·견적 확인 후 prepare → `{ orderNumber, url }` | 이동 | 1회 |
| `order_pending` + `receipt_ready` | 같은 `{ orderNumber, url }` | 이동 | 0 |
| `order_expired` + `receipt_ready` | 409 `CHECKOUT_EXPIRED` | 시도 폐기. 다음 사용자 클릭에서 새 `requestId` | 다음 클릭에서만 1회 |
| 결제 진행·완료·취소·반품·교환·실패·`order_abandoned`, `receipt_ready`가 아닌 주문 | 409 `CHECKOUT_NOT_PAYABLE` | 주문 결과 확인 안내, 시도 유지 | 0 |
| 알 수 없는 상태, 필드 누락, 주문번호 불일치 | 409 `CHECKOUT_UNCERTAIN` | 확인 대기, 시도 유지 | 0 |
| 상태 조회 timeout·네트워크·upstream 오류 | 502 `UPSTREAM_UNAVAILABLE` 등 | 오류. 다시 누르면 같은 `requestId`로 상태부터 재조회 | 0 |
| 같은 시도를 처리 중 | 409 `CHECKOUT_PENDING` | 확인 대기 | 0 |
| prepare 결과 불명(timeout 등) | 이후 재요청은 409 `CHECKOUT_UNCERTAIN` | 확인 대기 | 0 |
| 주문은 만들어졌지만 URL 계약 위반 | 502 `AUTO_LOGIN_BRIDGE_MISSING`·`INVALID_CHECKOUT_URL`(재요청도 같은 코드) | 오류, 상점 문의 | 0 |
| 같은 `requestId`에 다른 상품 구성 | 409 `IDEMPOTENCY_CONFLICT` | 오류 | 0 |

- 만료된 원래 ledger와 주문 소유 기록은 지우지 않는다. 결과 조회와 감사에 쓴다.
- 로그아웃·JWT 만료 정리·다른 회원 로그인으로 주체가 바뀌면 이전 주체의 기록과 URL을 돌려주지 않는다(`/b`에는 이전 회원의 세션이 들어 있다). ledger 키와 `Idempotency-Key` 모두 주체별로 나눈다.
- 현재 API의 `Idempotency-Key`는 같은 프로젝트에서 24시간 안에 같은 키로 기록된 이전 응답을 재생하는 것뿐이다. 본문이 달라도 이전 응답을 돌려줄 수 있고, 동시 요청을 막지 않으며, 견적·구매자와 묶이지 않는다. 그래서 중복 주문 방지는 BFF ledger(같은 키 동시 요청 중 1건만 실행, 결과 불명이면 새 주문 금지)가 먼저 맡고 헤더 키는 보조 수단이다.
- 결제 완료 확인 뒤처럼 구매자가 같은 구성을 명시적으로 새로 사려는 경우에만 화면이 `clearCheckoutAttempt(source)`를 호출한다. 오류 처리 중 자동으로 호출하지 않는다. 결과 화면의 순서는 서버 `paid === true` 확인 → 장바구니 정리(`source:'cart'`로 준비한 이번 주문의 줄만 차감, 바로 구매는 장바구니 불변) → `clearCheckoutAttempt(source)`다.
- V1 주문 상세는 만료 정리를 하지 않는다. 유효시간이 지났어도 호스팅 주문서가 아직 정리하지 않았으면 `order_pending`으로 보일 수 있다. 이때 재사용 URL로 이동하면 호스팅이 3770으로 정리하고, 구매자가 돌아와 다시 누르면 `CHECKOUT_EXPIRED`가 된다. 시각만 보고 BFF가 만료를 단정하지 않는다.
- V1 상세에 `use_auto_login`이 없으면 필드가 없다는 사실로 `false` 저장을 추정하지 않는다.

## 7. 오류 코드 — 한 문구로 뭉치지 않는다

| 계층 | 코드 | 의미 | 행동 |
| --- | --- | --- | --- |
| 준비 API | 401 `USER_SESSION_INVALID`(420) | 회원 JWT 없음·무효. 주문 생성 전 거부 | 다시 로그인 |
| 호스팅 `mall/order_pre` | 401 `ORDER_EXPIRED`(3770) | 서버가 유효시간 종료를 확인하고 주문을 `order_expired`로 정리 | BFF 상태 조회로 확정한 뒤 다음 클릭에서 새 시도 |
| 호스팅 `mall/order_pre` | 400 `ORDER_NOT_PAYMENT_READY`(3737) | 결제 준비 상태가 아님(만료 정리 뒤 재조회, 결제 진행·완료 등) | 로그인 만료나 재생성 가능으로 단정하지 않고 V1 상태로 판정 |
| 호스팅 화면 | `session_not_found` | 회원 주문인데 호스팅 세션 없음(`/b` 누락, token 미적용) | 세션 인계 경로 확인 |
| 호스팅 화면 | `session_mismatch` | 세션 회원과 주문 소유자가 다름 | 소유 회원으로 다시 로그인 |
| 호스팅 화면 | `order_load_failed`·네트워크 | 원인 불명 | 재시도하고 원래 코드를 기록 |
| BFF | `CHECKOUT_*`·`AUTO_LOGIN_BRIDGE_MISSING`·`INVALID_CHECKOUT_URL`·`UPSTREAM_UNAVAILABLE` | §6 표 | §6 표 |

화면 제목 "주문 세션이 만료되었습니다"만 보고 JWT 누락이나 만료로 판정하지 않는다. 같은 만료 주문도 첫 조회는 3770, 정리 뒤 재조회는 3737로 바뀔 수 있으므로 코드와 시각을 함께 남긴다. 3770 코드만으로 새 주문을 허용하지 않고, 새 시도 허용은 V1 상태(`order_expired` + `receipt_ready`)로만 결정한다.

## 8. 검증 체크리스트

1. **요청 캡처**: `POST /v1/orders/prepare`의 method·path·헤더(`Bootpay-User-JWT`는 회원일 때만, `Idempotency-Key`는 시도별로 안정)·본문(`quote_token`, `uct`, `response_type: "url"`, 가맹점 `redirect_url`, boolean `use_auto_login`)을 확인한다. `true`인데 JWT가 없으면 upstream 호출 0건이다.
2. **URL 보존**: API가 준 `/b` URL이 BFF 응답과 브라우저 이동까지 바이트 그대로인지, 소비자 코드에 `__s` 암호화·URL 조립 코드가 0개인지, 로그에 `__s`·JWT가 0건인지 본다.
3. **세션 복원**: 새 브라우저가 반환 URL을 그대로 따라가 `/b` 이후 호스팅 `__tc`가 생기고, 이어진 호스팅 회원 세션 조회의 회원이 주문 소유자와 같으며, `order-pre:loaded` 전에 배송지·지갑 호출이 0건인지 확인한다. 요청 값만 맞고 호스팅 쿠키·세션이 복원되지 않으면 실패다.
4. **재시도**: 같은 `requestId` 재요청이 상태 조회 후 기존 결과를 재사용하는지, `order_expired` + `receipt_ready` 확인 뒤 다음 클릭에서만 새 `requestId`와 prepare 1회가 생기는지, pending·paid·cancelled·unknown·timeout·주문번호 불일치에서 prepare 0건인지 본다.
5. **오류 구분**: 3737·3770·`session_not_found`·`session_mismatch`·네트워크 오류가 서로 다른 코드로 남는지 본다.
6. **운영 진단 원칙**: 기존 주문의 필요한 조회만 한다. 새 prepare·결제·취소를 실행하지 않는다. 호스팅 GET이 만료 주문을 정리할 수 있으므로 조회 전후 상태가 달라질 수 있음을 기록한다.
7. **보고**: 모의 HTTP·로컬 fixture 검증과 배포 환경·실결제 검증을 구분해 적는다. `use_auto_login: true` 전송이나 URL 모양만으로 로그인 인계 완료를 주장하지 않는다.

## 9. MCP 도구 `commerce_prepare_order`·`commerce_get_order_status`

| 입력 | 전송 |
| --- | --- |
| `user_jwt` 있음, `use_auto_login` 생략 | `Bootpay-User-JWT` + `use_auto_login: true` |
| `user_jwt` 있음, `use_auto_login: false` | `Bootpay-User-JWT` + `false` |
| `user_jwt` 없음, 생략·`false` | 회원 헤더 없음 + `false` |
| `user_jwt` 없음, `true` | 도구 오류 `USER_JWT_REQUIRED`, API 호출 없음 |

- `commerce_prepare_order`는 flat 본문을 보낸다. `products[].option.product_option_id` 중첩을 유지하고 `delivery_type`은 숫자(1: 택배 등)로 보낸다.
- `idempotency_key`는 본문이 아니라 `Idempotency-Key` 헤더로만 보낸다. 같은 구매 시도에는 같은 키를 쓴다. 서버 재생 범위는 §6의 한계와 같다. timeout 등으로 응답을 받지 못하면 `order_created: "unknown"`으로 알리고, 새 키로 다시 만들지 말고 같은 키로만 재시도하거나 상태를 조회하라고 안내한다.
- url 모드의 `true` 응답이 `env_mode`별 shop 호스트의 `/b`(목적지 `/mall/{client_key}/order/{order_number}`)가 아니면 도구 오류 `AUTO_LOGIN_BRIDGE_MISSING`이다(생성된 주문번호 포함). 도구는 URL을 고치거나 새 주문을 자동으로 만들지 않는다.
- 성공 응답의 `next_step_keys`는 응답에 실제로 있는 키만 가리킨다(url 모드: `url`·`order_number`). `login_handoff.requested`는 요청을 전달했다는 뜻이지 브라우저 로그인 성공의 증거가 아니다.
- 이 도구는 실제 주문을 만든다. 진단만을 위해 반복 호출하지 않는다.
- `commerce_get_order_status`는 조회 전용(`GET /v1/orders/{order_number}`)이며 `commerce_prepare_order`를 호출하지 않는다. 응답은 `order_number`·`status`·`receipt_status`·`checkout_state`·`new_order_allowed`·`auto_prepare: false`다. `checkout_state`는 `order_pending` + `receipt_ready`이면 `reusable`(같은 url 재사용), `order_expired` + `receipt_ready`이면 `expired`(`new_order_allowed: "next_user_action_only"` — 다음 구매자 클릭에서만 새 준비), 결제 완료·구매 확정·취소·반품·교환 또는 `receipt_success`·`receipt_cancelled`이면 `settled`(결과 확인), 그 외·조회 실패·주문번호 불일치(`ORDER_MISMATCH`)는 `unconfirmed`(확인 대기)다. 조회 오류의 3737·3770은 서로 다른 코드로 남는다.
- 구매자 결과는 `GET /v1/orders/{order_number}/result`로 확인한다. 회원 JWT 또는 비회원 `result_token`+동일 기기 UUID를 쓴다. `payment_status`·`amounts`를 검사하고 pending은 `Retry-After`를 따른다. 결과 토큰은 서버에 저장한다. Remote의 `commerce_get_order_result`도 이 구매자 경로와 기존 가맹점 조회를 구분한다.
- 생성된 BFF는 결제 진행 중(`payment_pending` 등) 주문을 `CHECKOUT_NOT_PAYABLE`로, 도구는 `unconfirmed`로 분류한다. 이름은 달라도 둘 다 새 준비를 허용하지 않는다.

## 10. 검증 근거와 한계 (2026-09)

- 확인됨: 기존 범용 `/b` 브리지가 호스팅 쿠키를 설정하고 주문서로 이동하는 것, 유효한 회원 주문의 호스팅 token과 세션 회원·주문 소유자 일치, 만료 주문(`order_expired` + `receipt_ready`)의 URL 재사용 차단과 새 주문 0건.
- 확인되지 않음: API의 `/b` 반환 운영 배포, 만료 표본의 `use_auto_login` 저장값, 실결제 완료. 이 문서의 표는 API·호스팅 소스와 로컬 검증 기준이다.
