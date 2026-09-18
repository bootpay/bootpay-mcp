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
| 가입/정보수정/비밀번호/탈퇴 API 공백 | API `users/signup`, `users/authenticate`, 관리용 `users/:id`, mall 회원 경로 | `api_blocked`를 완료 방해 요건으로 유지하고 기능별 API 후속 task·brief 등록 |

## 기본 기능과 완료 경계

[필수 기능 14개](../skills/bootpay-commerce/references/required-features.md), [프론트·공개 v1 개발 규칙](../skills/bootpay-commerce/references/storefront-development.md), [SDK 계약](../skills/bootpay-commerce/references/contracts.md)을 함께 배포한다. MCP의 `get_doc`·`list_docs`·`search_docs`에서도 같은 문서를 읽을 수 있다.

Next 기본 생성물은 로그인/세션/로그아웃, 마이페이지, 본인 주문 목록/결과, 배송지 CRUD를 제공한다. 가입 진입점은 실제 약관 ID API가 없으므로 제출을 차단한다. 회원정보 편집·비밀번호 변경/복구·탈퇴를 가짜 성공이나 관리 API 우회로 구현하지 않는다. 해당 필수 API가 보완되기 전에는 구매 흐름 검증이 통과해도 전체 쇼핑몰은 `incomplete`다.

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
