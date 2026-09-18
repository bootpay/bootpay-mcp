# Commerce 회원 기능 API 갭 등록 결과

2026-09-17 로컬 소스와 기존 mdshare 완료 기록을 검토했다. 신규 API 구현·배포는 수행하지 않았으며 아래 task는 모두 **draft / 구현 미착수**다. 공개 v1에서 이미 지원하는 로그인·세션·로그아웃·가입 POST·회원 주문조회·배송지 CRUD와, 추가 계약이 필요한 기능을 구분한다.

- Workspace: `bootpay-project`
- 상위 task: `4e588ff8-ff7f-4498-b478-0cb239dc07cf`
- [상위 구현 brief](https://www.mdshare.io/d/bootpay-project/tasks/storefront-account-v1-gaps-20260917/brief)
- 필수 기능 갭 7개 + 선택 확장 보안 후속 1개, 하위 task 8개
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

모든 문서 slug는 `tasks/storefront-account-v1-gaps-20260917-NN-feature/brief`이며 위 링크가 실제 등록된 주소다. 신규 경로는 **제안**이다. 배포 계약이 확인되기 전 MCP나 생성 코드에서 지원 API로 호출하지 않는다.

## 현재 구현 가능한 범위와 차이

| 기본 기능 | 확인 결과 |
| --- | --- |
| 로그인·세션 복구·로그아웃 | 기존 공개 v1 사용 가능. 서버 Basic과 구매자 JWT의 경계를 지킨다. |
| 회원가입 | `POST /v1/users/signup`은 존재한다. 실제 약관 ID 조회, 주소 필수 설정 대응, 안전한 인증 대기·재발송·동의 보존은 A01~A03으로 보완한다. `/users/join` 외부 회원 동기화를 공개 가입으로 대신하지 않는다. |
| 회원 주문목록·상세 | 기존 `GET /v1/orders`에 회원 JWT와 날짜 범위를 전달하고, `/v1/orders/:order_number/result`의 구매자 검증 결과를 사용한다. 서버 원본 주문 응답을 브라우저에 그대로 전달하지 않는다. |
| 배송지 | 기존 `/v1/users/address` CRUD 사용 가능. A02는 주소록 CRUD가 아니라 가입 시 필수 주소 수집의 입력 누락이다. |
| 본인 프로필 수정 | 안전한 구매자 전용 경로가 없어 A04가 필요하다. 관리자 `/users/:id` 수정 API로 대체하지 않는다. |
| 비밀번호 변경·찾기 | A05/A06의 본인 확인·프로젝트/목적·일회성 토큰·전체 세션 폐기 계약이 필요하다. 내부 mall 기능을 그대로 공개하지 않는다. |
| 회원 탈퇴 | 기존 mall 도메인은 존재하며 A07에서 공개 v1 본인 경계를 추가한다. 관리자 회원 삭제로 대체하지 않는다. |
| 관심상품·별도 my-page 주문 경로 | A08 선택 확장 보안 후속이다. 기본 주문목록은 안전한 기존 경로로 구현할 수 있으므로 소비자 MVP 필수 API 부재로 계산하지 않는다. |

## 제안 API의 구현 순서

1. A01 `GET /v1/users/signup-policy`로 canonical 약관 목록·필수 여부·정책 버전·지원 수집 필드를 제공한다.
2. A02에서 기존 signup에 검증된 주소 입력을 추가하고, A03에서 프로젝트별 인증 조회·재발송·약관 이식을 완성한다.
3. A04 `GET/PATCH /v1/users/me`, A05 `PUT /v1/users/me/password`, A07 `GET/POST /v1/users/me/withdrawal`을 본인 JWT 기반으로 구현한다.
4. A06은 A05의 암호 정책과 세션 폐기를 재사용해 복구 요청→코드 검증→일회성 재설정을 제공한다.
5. A08은 기존 선택 경로에 회원 가드·소유권·장바구니 이동 멱등성을 보완한다.
6. 기능별 API 배포와 계약 테스트 근거가 확인된 뒤 MCP의 해당 기능을 지원 상태로 변경한다.

각 brief는 요청·응답·인증·성공/실패 HTTP 상태·동시성·멱등성·수정 대상·소스 줄 번호·격리 테스트·리스크·롤백을 포함한다. 기존 authenticate의 숫자 `status`를 문자열로 바꾸지 않고 신규 `verification_state` 필드로 상태를 설명하도록 했다.

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

- `get_project_context`, `_guide`, 관련 task context pack을 먼저 읽고 문서 slug 중복을 확인했다.
- `validate_task` 9/9: `isExecutionReady=true`, brief 점수 89, 부족/누락 섹션 0, 최종 경고 0.
- 원격 문서 9/9 재조회: 작성 내용 일치, `team` 접근 범위 확인. 상위 연결된 하위 task 8개 확인.
- 생성 시 일반 키워드(화면·관리자·page) 때문에 목업 경고가 있었으나 수정 대상은 백엔드와 격리 테스트뿐이다. 면제 근거를 brief/metadata에 명시했고 최종 task 검증은 경고 없이 통과했다.
- 실 API 구현, 배포, MongoDB/Redis 통합 테스트, 고객 데이터 변경, 실제 이메일/문자 발송은 수행하지 않았다. 이 등록 검증은 제품 기능의 완료 증거가 아니다.

