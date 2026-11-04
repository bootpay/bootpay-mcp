# Commerce 쇼핑몰 개발 계약 검수 — 2026-09-17

사용자 요청에 따라 invoice-frontend 프론트 규칙과 commerce-api 공개 v1을 대조하고 MCP 안내·프롬프트·스킬·생성 코드를 수정했다. 이후 추가된 로그인·회원가입·마이페이지 기본 구현 요구를 필수 기능 목록에 포함했다.

## 근거와 범위

- invoice-frontend 작업 트리: HEAD `f62502f`, `app/vendor` 로컬 변경 포함.
- commerce-api 작업 트리: HEAD `e42e13e`, `app/models`·`config/locales` 로컬 변경 포함.
- 두 저장소는 읽기만 했다. Rails·RSpec·DB·운영 주문/결제·회원 생성은 실행하지 않았다.
- API 배포 여부는 소스 검수로 확인되지 않는다. MCP의 mock/fixture 테스트와 운영 연동 검증은 별개다.

## 확인된 차이와 수정

| 차이 | 근거 | MCP 반영 |
|---|---|---|
| Commerce 액션 플랜이 PG 키체인·SDK·설정으로 연결됨 | `src/prompts/integration-plan.ts` 기존 공통 분기 | 주문서/관리형 구독 Commerce 플랜 분리, 제공된 키·읽기 경계 보존 |
| invoice의 오래된 Pug 지침과 현재 구현 불일치 | invoice `AGENTS.md`, `package.json`, `design.md`, `ProductOptions.vue` | 신규 HTML/CSS·Tailwind v4·PascalCase·storeToRefs, 내부 mall API와 공개 v1 구분 |
| 과거 validate 합계·preview 옵션 누락 가정 유지 | API `order_quote_service.rb`, `order_prepare_service.rb` | 토큰 견적, 주소 필요·불가 null 합계·만료, 같은 구매자/기기·멱등 요청 |
| 구매자 결과 API 대신 구형 결과 사용 | API `order_result_service.rb` | 회원 JWT/게스트 결과 토큰, 최소 결과 데이터, 결제/환불 분리 |
| 비 Next 샘플의 브라우저 JWT·범용 프록시·잘못된 cart 키 | `step-auth.ts`, `step-setup.ts`, `step-cart.ts` | public 생성 레지스트리에서 실행 샘플 제공 중단, 기존 프레임워크용 구현 가이드 제공 |
| 기본 생성물에서 가입·마이페이지·본인 주문 누락 | `registry.ts` 기존 단계와 별도 dormant account 파일 | 기본 account 단계, 본인 주문/배송지 BFF·화면, 필수 14개 기능 상태 |
| 가입/정보수정/비밀번호/탈퇴 API 공백 | API `users/signup`, `users/authenticate`, 관리용 `users/:id`, mall 회원 경로 | `api_blocked`를 완료 방해 요건으로 유지하고 기능별 API 후속 task·brief 등록 → **2026-09-21 A01~A07 구현으로 해소**([갱신 내역](#2026-09-21-갱신--계정-api-a01a07-반영)) |

## 기본 기능과 완료 경계

[필수 기능 14개](../skills/bootpay-commerce/references/required-features.md), [프론트·공개 v1 개발 규칙](../skills/bootpay-commerce/references/storefront-development.md), [SDK 계약](../skills/bootpay-commerce/references/contracts.md)을 함께 배포한다. MCP의 `get_doc`·`list_docs`·`search_docs`에서도 같은 문서를 읽을 수 있다.

Next 기본 생성물은 로그인/세션/로그아웃, 마이페이지, 본인 주문 목록/결과, 배송지 CRUD를 제공한다. 2026-09-21 갱신으로 가입·회원정보 편집·비밀번호 변경/찾기·탈퇴도 실제 공개 v1 계약으로 생성한다. 어느 것도 가짜 성공이나 관리 API 우회로 구현하지 않는다.

API 후속 작업: [계정 v1 보완 상위 brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917/brief). 상세 목록·등록 검수는 [계정 API gap 기록](commerce-account-api-gaps.md)을 참고한다.

## 검증 방법

- 생성 코드 실행 테스트: 서버 견적/구매자/멱등성/결과 토큰, 계정 권한·응답 필드 제한·배송지 CRUD.
- 전체 Vitest, TypeScript 검사, MCP 빌드, 설치 스킬 구조/링크/비밀값·SDK 타입 검사.
- `scripts/verify-generated-next.ts`는 임시 Next 앱을 생성해 타입 검사·빌드·브라우저 fixture를 실행한다. 새 계정 시나리오도 필수 검증 목록에 포함한다.
- 검증 기록은 생성 지문에 연결한다. 코드를 바꾼 후 과거 검증만으로 완료를 선언하지 않는다.
- npm 게시·MCP 배포·운영 설정 변경은 이번 로컬 개선에 포함되지 않는다.

## 최종 확인 결과

- Vitest 38개 파일, 927개 테스트 통과. SDK 예제 타입 검사도 실제 `@bootpay/backend-js` 2.13.1로 실행했다.
- 저장소 TypeScript·빌드, 스킬 구조 검사, diff 검사 통과. npm 패키지 포함 목록에서 새 스킬 참조·내장 문서·계정 생성 모듈을 확인했다.
- 생성된 Next 앱 67개 파일: 타입 검사·Next 빌드·브라우저 필수 항목 17/17 통과. 회원 전환 시 주소 편집 초기화, 주소 생성 응답 유실 후 같은 요청 재시도, 로그인 후 마이페이지 복귀 경합도 검증했다.
- 기록 지문 `c53-07a06d80012e2b0040012336340d-67`이 현재 생성기와 일치한다. 테스트 서버는 종료했다.
- mdshare 상위 1개·하위 8개·team brief 9개: 문서 재조회 일치, 실행 준비 검사 9/9 통과. 후속 API 작업은 모두 draft다.

## 2026-09-21 갱신 — 계정 API A01~A07 반영

commerce-api 에 A01~A08 이 구현되면서(미배포) 위 표의 마지막 줄 gap 이 해소됐다. 이 저장소에 반영한 내용과, 이번 검수에서 함께 드러난 결함을 적는다.

### 지원 상태 전환

`REQUIRED_STOREFRONT_FEATURES` 의 signup·profile-update·password-change·password-recovery·withdrawal 을 `available` 로 올리고 실제 엔드포인트와 생성 파일을 연결했다. 14개 기능이 모두 `available` 이다.

**배포 주의**: 엔드포인트가 배포되지 않은 환경에서는 404 가, `api_scopes` 동기화 전에는 403(`API_SCOPE_INVALID`, -47)이 난다. 기능 부재가 아니므로 생성 코드를 관리용 경로로 되돌리지 말고 대상 환경의 배포 상태를 확인한다.

### 새로 생성하는 파일 (Next.js `account` 단계)

| 경로 | 내용 |
|---|---|
| `app/api/signup/policy/route.ts` | 가입 약관·수집 필드 (A01) |
| `app/api/signup/route.ts` | 가입 제출 — 서버에서 정책을 다시 읽어 필수 약관·policy_version 대조 (A01·A02) |
| `app/api/signup/verification/route.ts` | 인증 대기 조회·재발송 (A03) |
| `app/api/account/profile/route.ts` | 본인 프로필 조회·수정 (A04) |
| `app/api/account/password/route.ts` | 비밀번호 변경 (A05) |
| `app/api/password-recovery/[stage]/route.ts` | 비밀번호 찾기 3단계 (A06) |
| `app/api/account/withdrawal/route.ts` | 탈퇴 안내·실행 (A07) |

화면은 `components/signup-view.tsx`, `account-profile-view.tsx`, `account-password-view.tsx`, `account-withdrawal-view.tsx`, `password-recovery-view.tsx` 와 대응 페이지다.

### 계약에서 놓치기 쉬운 지점

- **PATCH 다.** `/v1/users/me` 는 PATCH 만 받는다. 보낸 필드만 반영되고 생략한 필드는 보존된다.
- **이메일·전화는 못 바꾼다.** 서버가 파라미터 자체를 거절하므로 입력 칸을 만들지 않고 읽기 전용으로 보여준다.
- **비밀번호를 바꾸면 전 기기 세션이 끊긴다.** 요청한 기기 포함. `requires_login:true` 를 받으면 반드시 세션 쿠키를 지운다.
- **탈퇴 두 번째 호출은 401 이다.** 중복 탈퇴가 아니라 첫 탈퇴가 세션을 끊었기 때문이다. "탈퇴 실패" 로 표시하지 않는다.
- **비밀번호 찾기에 수신처를 보내지 않는다.** 발송은 서버에 등록된 회원 연락처로만 간다. 응답은 계정이 없어도 같은 모양이라 존재 여부를 표시할 수 없다.
- **`reset_token`·`verification_context` 는 브라우저로 내리지 않는다.** 생성 코드는 봉인 세션 쿠키에만 담는다.

### 이번에 함께 고친 결함

| 결함 | 실제 계약 |
|---|---|
| `step-find-password.ts` 가 `/v1/users/find_password/*` 호출 | 공개 v1 에 없는 경로(내부 mall 전용). A06 의 `password-recovery/*` 3단계로 교체 |
| `step-wishlist.ts` 가 `POST /v1/wishlist/move-to-cart { wishlist_ids }` 호출 | 일괄 경로 없음. `POST /v1/wishlist/{id}/to_cart` 를 항목마다 + 고정 `Idempotency-Key` |
| 생성 API 클라이언트에 `apiPut`/`apiPatch` 없음 | `step-user-account.ts`·`step-find-password.ts` 가 import 하던 값이라 템플릿이 동작하지 않았다. 추가 |
| 개인 가입이 `/v1/users/join`(외부 동기화) 사용 | `/v1/users/signup` 으로 분리. 법인만 `signupCorporate` 로 `join` 유지 |
| `POST /v1/users/check-business-number-exist` | 존재하지 않는 경로. `GET /v1/users/join/group-business-number-exist?pk=` |
| 가입 폼 비밀번호 6자 검증 | 서버 정책은 8자 이상 72바이트 이하 |
| `step-user-account.ts` 가 `PUT /v1/users/me` 에 email·phone 전송 | PATCH + `editable_fields` 한정 + `profile_version` |

### 알려진 제약

`@bootpay/backend-js` 2.5.0 의 `BootpayCommerce` 에는 `patch` 헬퍼가 없다(`get`/`post`/`put`/`delete` 만). A04 수정은 PATCH 만 받으므로 생성 코드가 SDK 의 axios 인스턴스(`$http` · `entrypoints()`)를 직접 쓴다. 인증 헤더와 응답 인터셉터는 그대로 적용된다. SDK 에 `patch` 가 추가되면 `sdk().patch('users/me', ...)` 로 바꾼다.

### MCP 도구

`src/commerce-remote/tools/account.ts` 에 12개 도구를 추가했다: `commerce_get_signup_policy`, `commerce_signup`, `commerce_get_signup_verification`, `commerce_resend_signup_email`, `commerce_get_me`, `commerce_update_me`, `commerce_change_password`, `commerce_request_password_recovery`, `commerce_verify_password_recovery`, `commerce_reset_password`, `commerce_get_withdrawal_info`, `commerce_withdraw`.

`commerce_withdraw` 는 되돌릴 수 없어 `TOOL_DESTRUCTIVE` 로 선언했다. `commerce_update_me` 는 식별자·권한·자격증명 파라미터를 요청 전에 거절한다.
