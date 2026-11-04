# Commerce 회원 기능 API 갭 — 등록(2026-09-17) → 구현 완료(2026-09-21)

2026-09-17 로컬 소스와 기존 mdshare 완료 기록을 검토해 갭 8개를 등록했고, **2026-09-21 A01~A08을 모두 구현했다(미배포)**. 하위 task 8개와 상위 task는 `done` 이다.

> **배포 상태**: 코드는 commerce-api 작업 트리에 있고 운영·dev에 배포되지 않았다. `config/api_scopes.yml` 의 신규 8개 키도 DB 동기화(`rake api_scopes:plan` → `sync`) 전이다.
> 배포 전 환경에서 이 엔드포인트를 부르면 404, 스코프 동기화 전이면 403(`API_SCOPE_INVALID`, -47)이 난다. 기능 부재가 아니다.

아래 "기능별 후속 작업" 은 등록 시점 기록이고, "구현 결과" 절이 실제로 배포될 계약이다.

- Workspace: `bootpay-project`
- 상위 task: `4e588ff8-ff7f-4498-b478-0cb239dc07cf`
- [상위 구현 brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917/brief)
- 필수 기능 갭 7개 + 선택 확장 보안 후속 1개, 하위 task 8개 — **전부 done(2026-09-21)**
- 상위·하위 brief 9개 모두 `team` 접근 범위, task에 `brief` 관계로 연결

## 기능별 후속 작업

| 구분 | 기능 | Task ID | 구현 brief |
| --- | --- | --- | --- |
| A01 필수 | 가입 약관과 수집 필드를 공개 v1 정책으로 제공한다 | `0f43394f-9703-45dc-b2d4-c13f4d5c78f4` | [brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917-01-signup-policy/brief) |
| A02 필수 | 주소 수집 필수 쇼핑몰에서도 v1 회원가입을 완료한다 | `f93559c1-0958-4973-94d6-296f83f39716` | [brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917-02-signup-address/brief) |
| A03 필수 | 가입 인증 대기를 프로젝트별로 격리하고 재발송·동의 보존을 완성한다 | `370c8587-dde4-49df-8c57-a16e408ef093` | [brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917-03-signup-verification/brief) |
| A04 필수 | 마이페이지 본인 정보 조회와 수정을 구매자 전용 v1로 제공한다 | `a325dfb2-29b3-42da-b070-40f98841b83f` | [brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917-04-self-profile/brief) |
| A05 필수 | 현재 비밀번호 확인 후 변경하고 기존 회원 세션을 폐기한다 | `de9a0feb-d4f9-46b6-8d6c-8d9fb7a60b19` | [brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917-05-password-change/brief) |
| A06 필수 | 비밀번호 찾기를 프로젝트·목적·일회성 검증에 묶어 공개 v1로 제공한다 | `2547be38-b2b6-4551-afcb-2f8cd2b5e116` | [brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917-06-password-recovery/brief) |
| A07 필수 | 회원 탈퇴 안내와 확인을 기존 정책을 지키는 공개 v1로 제공한다 | `409a07e6-1f21-4917-97f0-ce4db71e31f6` | [brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917-07-withdrawal/brief) |
| A08 선택 | 선택 마이페이지·위시리스트 v1 확장의 회원 가드와 소유권을 보완한다 | `db4b701c-2a33-49ac-ab3b-83c26d7d7f65` | [brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917-08-optional-member-guards/brief) |

모든 문서 slug는 `tasks/storefront-account-v1-gaps-20260917-NN-feature/brief`이며 위 링크가 실제 등록된 주소다.

## 구현 결과 — 확정된 공개 v1 계약 (2026-09-21)

| 기능 | 엔드포인트 | 등록 당시 제안과 달라진 점 |
| --- | --- | --- |
| A01 가입 정책 | `GET /v1/users/signup-policy` | `fields`·`membership_type` 은 이미 `GET /v1/store` 에 있어 그 파생값으로 맞췄다. TermOfUse 에 version 필드가 없어 `updated_at`(u_at)을 버전 대용으로 낸다. `use_url`·`url` 을 포함해야 외부 URL 약관이 빈 본문으로 그려지지 않는다 |
| A02 주소 가입 | `POST /v1/users/signup` 에 `address` | 제안은 "필수 갭"이었으나 실제로는 **블로커**였다 — `collect_address` 몰에서 v1 가입이 항상 `USER_ADDRESS_BLANK` 로 실패했다. 허용 키는 `zipcode`·`address`·`address_detail` 셋뿐 |
| A03 가입 인증 | `GET /v1/users/authenticate/:id`, `POST .../resend` | 재발송 도메인 로직(30분 만료·60초 쿨다운)은 이미 있었고 컨트롤러 action 이 주석 처리돼 있던 것이 실제 결함이었다. 소유 증명 `verification_context` 신설(resend 필수·show 선택) |
| A04 본인 프로필 | `GET /v1/users/me`, **`PATCH /v1/users/me`** | **PUT 이 아니라 PATCH**. 수정 가능 필드는 `name`·`nickname`·`gender`·`birth`. `email`·`phone` 은 본인확인을 따로 거쳐야 해 파라미터 자체를 거절한다. `profile_version` 으로 동시 수정 409 |
| A05 비밀번호 변경 | `PUT /v1/users/me/password` | 전 기기 세션 폐기를 **credential version**(`User#l_pw_v`)으로 신설했다 — Redis 세션 열거 없이 O(1), 기존 세션·신규 회원 모두 0 이라 하위 호환. 성공하면 요청한 기기의 JWT 도 무효 |
| A06 비밀번호 찾기 | `POST /v1/users/password-recovery/requests` → `verifications` → `PUT .../password` | 제안 대비 대폭 축소 — `VerificationCode` + 재설정 JWT 인프라가 이미 있어 실제 결함 3건만 고쳤다. 수신처를 받지 않고, 계정 존재 여부가 드러나지 않게 응답 모양을 고정 |
| A07 탈퇴 | `GET/POST /v1/users/me/withdrawal` | 가장 얇다 — `Mall::UserWithdrawalService` 에 그대로 위임한다. 제안했던 v1 래퍼 서비스와 "주문 생성 lock 보강" 은 중복이라 삭제. `unprocessable_entity` 는 422 가 아니라 **442** |
| A08 가드·소유권 | `/v1/my-page/order*`, `/v1/wishlist*` | "선택 확장" 이 아니라 라이브 보안 결함이었다 — JWT 없이 Basic 만으로 부르면 401 이 아니라 500 이 났고, `Wishlist.add!` 가 타 프로젝트 상품을 담을 수 있었다. `POST /v1/wishlist/:id/to_cart` 에 `Idempotency-Key` 추가 |

### 공통 설계 결정

- 신규 scope 키 8종을 `user` 그룹에 신설했다. 관리자 키(`user:user_detail`·`user_update`·`user_delete`)를 재사용하지 않는다 — 그 키는 몰의 아무 고객이나 읽고 고치는 권한이다.
- 본인 경로는 전부 `namespace :users` 블록(`config/routes.rb:51`) 안에 두어 `resources :users`(`/v1/users/:id`)보다 먼저 잡히게 했다.
- Error Code 10800~10804 신설 + `config/locales/ko.yml` 동일 번호 한글 메시지.

### 검증

격리 테스트 19파일 / 391 runs / 0 failures, `rails zeitwerk:check` 통과, `bin/api-scope verify` 통과. rspec 은 공유 MongoDB 라 실행하지 않았다.

## 등록 시점(2026-09-17)의 판단과 결과

| 기본 기능 | 등록 당시 판단 | 2026-09-21 결과 |
| --- | --- | --- |
| 로그인·세션 복구·로그아웃 | 기존 공개 v1 사용 가능 | 그대로. 변경 없음 |
| 회원가입 | `POST /v1/users/signup` 은 있으나 약관 ID 조회·주소 필수 대응·인증 재발송이 없음 | A01~A03 으로 보완 완료. `users/join` 은 여전히 외부 동기화 전용 |
| 회원 주문목록·상세 | 기존 `GET /v1/orders` + 회원 JWT 로 가능 | 그대로. 별도 `/v1/my-page/order` 경로는 A08 에서 회원 가드 보강 |
| 배송지 | 기존 `/v1/users/address` CRUD 사용 가능 | 그대로 |
| 본인 프로필 수정 | 구매자 전용 경로 없음 → A04 필요 | `GET`/`PATCH /v1/users/me` 신설. 관리용 `/users/:id` 로 대체하지 않음 |
| 비밀번호 변경·찾기 | A05/A06 계약 필요 | `PUT /v1/users/me/password`, `password-recovery/*` 신설. 전 세션 폐기 포함 |
| 회원 탈퇴 | mall 도메인은 있고 공개 v1 경계만 필요 | `GET/POST /v1/users/me/withdrawal` 신설. 도메인 서비스에 그대로 위임 |
| 관심상품·별도 my-page 주문 경로 | 선택 확장 | 선택이 아니라 보안 결함이었다(A08). 401 대신 500, 타 프로젝트 상품 담기 |

## MCP 반영 (이 저장소)

구현에 맞춰 이 저장소를 함께 갱신했다. 반영 내역과 이번에 함께 고친 결함 목록은 [쇼핑몰 개발 계약 검수](commerce-storefront-audit.md#2026-09-21-갱신--계정-api-a01a07-반영)에 있다.

- `REQUIRED_STOREFRONT_FEATURES` 14개 기능을 모두 `available` 로 전환
- Next.js `account` 단계가 가입·프로필·비밀번호·비밀번호 찾기·탈퇴 화면과 BFF 라우트를 생성
- `src/commerce-remote/tools/account.ts` 에 MCP 도구 12개 추가
- `skills/bootpay-commerce/references/required-features.md` 와 빌트인 문서 동기화


## 소스 근거

검토 checkout: `/Users/rumi/RubymineProjects/bootservice/commerce/commerce-api`

- `app/services/v1/users/signup_service.rb:78`: `TermOfUse.list_by_type`의 list와 fixed 전체를 기준으로 실제 약관 ID를 검증한다.
- `app/services/v1/users/signup_service.rb:57`, `app/models/concerns/project/user_ext/create.rb:47`: 가입 서비스는 주소를 전달하지 않지만 몰 정책은 주소를 필수로 요구할 수 있다.
- `app/controllers/v1/users/authenticate_controller.rb:4`, `app/models/concerns/user_standby/authentication.rb:8`: 인증 조회에 프로젝트가 명시되지 않으며 재발송 action은 주석 처리되어 있다.
- `app/services/v1/users/signup_service.rb:93`: standby 분기는 최종 회원의 term_ids 저장 이전에 반환한다.
- `app/controllers/v1/users_controller.rb:48`, `app/controllers/mall/my_page/user_controller.rb:5`: 관리자 고객 CRUD와 내부 mall 본인 관리 경로를 구분해야 한다.
- `app/models/concerns/user/create.rb:96`, `app/models/concerns/user/find_password.rb:150`: 현재 비밀번호 확인·복구 도메인은 있지만 안전한 공개 v1 수명주기 계약이 필요하다.
- `app/services/mall/user_withdrawal_service.rb:79`: 탈퇴 차단 사유·본인 확인·보관 정책을 재사용할 도메인이 이미 있다.
- `app/controllers/v1/my_page/order_controller.rb:2`, `app/controllers/v1/wishlist_controller.rb:8`: 선택 경로에 `member_jwt_alive!` 적용이 빠져 있다.

## 기존 작업과의 관계

- [SF-06 가입·배송지](https://www.mdshare.io/d/bootpay-project/tasks/storefront-next-v1-gaps-20260914-06-customer-address/brief), `7eaae4c3-cb26-48c7-946c-9b34980fba46`: 완료한 signup·주소 CRUD를 재작성하지 않고 남은 정책·주소 입력·인증 문제만 분리했다.
- [SF-01 구매자 JWT](https://www.mdshare.io/d/bootpay-project/tasks/storefront-next-v1-gaps-20260914-01-customer-session/brief), `9bd83425-394a-4c75-8642-dccceda7b47e`: 완료한 회원 가드를 재사용하고 완료 메모가 남긴 선택 경로만 보완한다.
- [기존 mall 탈퇴](https://www.mdshare.io/d/bootpay-project/tasks/mall-gap-10-member-withdrawal/brief), `1bdb65f4-e72c-491e-be2d-3b30891eb444`: 내부 구현은 유지하며 공개 v1 경계를 추가한다.
- 기존 완료 상위 `c5bfd31c-f951-4a76-9f4c-3453545381bd`와 기존 subtask 상태는 변경하지 않았다.

## 등록 검증과 한계

### 등록 시점(2026-09-17)

- `get_project_context`, `_guide`, 관련 task context pack을 먼저 읽고 문서 slug 중복을 확인했다.
- `validate_task` 9/9: `isExecutionReady=true`, brief 점수 89, 부족/누락 섹션 0, 최종 경고 0.
- 원격 문서 9/9 재조회: 작성 내용 일치, `team` 접근 범위 확인. 상위 연결된 하위 task 8개 확인.
- 생성 시 일반 키워드(화면·관리자·page) 때문에 목업 경고가 있었으나 수정 대상은 백엔드와 격리 테스트뿐이다. 면제 근거를 brief/metadata에 명시했고 최종 task 검증은 경고 없이 통과했다.
- 등록 시점에는 실 API 구현·배포를 수행하지 않았다. 이 등록 검증은 제품 기능의 완료 증거가 아니다.

### 구현 시점(2026-09-21)

- 격리 테스트 19파일 / 391 runs / 0 failures · 0 errors. `rails zeitwerk:check` 통과, `bin/api-scope verify` 통과(컨트롤러 141키 / 카탈로그 121).
- rspec 은 공유 MongoDB(`bootservice`)를 쓰므로 실행하지 않았다. DB 통합 테스트·고객 데이터 변경·실제 이메일/문자 발송도 하지 않았다.
- 따라서 **런타임 실측은 없다.** 대역이 덮지 못한 영역(RejoinGuard HMAC, 암호화 콜백, Redlock 직렬화, Mongo 부분 인덱스 동작)은 dev 배포 후 확인해야 한다.
- 배포·스코프 동기화 전이므로 이 문서의 계약은 "코드가 이렇게 동작하도록 작성됐다" 까지이고 "운영에서 그렇게 동작한다" 는 아직 아니다.

