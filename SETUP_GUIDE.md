# Bootpay 연동 설정 가이드

> **MCP 서버가 연결되어 있다면 `get_setup_checklist` 도구를 호출하세요.**
> 플랫폼·서버 언어별 맞춤 체크리스트를 제공합니다.

## 1. 계정 & 프로젝트 생성

1. [Bootpay 관리자](https://admin.bootpay.ai) 회원가입
2. 사업자 정보 등록
3. [프로젝트 생성](https://admin.bootpay.ai/project/new)
4. 사용할 PG사 활성화 ([결제 설정](https://admin.bootpay.ai/payment/setting))

## 2. API 키 확인

[관리자 → 개발자 설정 → API 연동키](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment)

| 키 | 용도 | 사용 위치 |
|----|------|-----------|
| **Application ID** | 프론트엔드 SDK에서 결제창 호출 | 클라이언트 코드 |
| **REST API Application ID** | 서버에서 API 토큰 발급 | 서버 환경변수 |
| **Private Key** | 서버에서 API 토큰 발급 (비밀) | 서버 환경변수 |

> Sandbox와 Production의 Application ID는 다릅니다.
> 관리자에서 환경을 전환하여 각 환경의 ID를 확인하세요.

## 3. 환경변수 설정

```bash
# 서버 (.env)
BOOTPAY_REST_APP_ID=your_rest_application_id
BOOTPAY_PRIVATE_KEY=your_private_key
```

프론트엔드 환경변수 네이밍은 프레임워크마다 다릅니다:
- Vite: `VITE_BOOTPAY_APP_ID`
- Next.js: `NEXT_PUBLIC_BOOTPAY_APP_ID`
- Nuxt: `NUXT_PUBLIC_BOOTPAY_APP_ID`

> 보안: `.env`는 `.gitignore`에 포함. Private Key는 절대 프론트엔드에 포함 금지.

## 4. 핵심 규칙

- **결제는 프론트엔드에서 시작** — 국내 PG 규정. 백엔드에서 결제 시작 금지
- **API 도메인 구분** — PG API(`api.bootpay.co.kr`) vs Commerce API(`api.bootapi.com`)
- **SDK 버전 추측 금지** — MCP `get_sdk_versions` 또는 패키지 매니저로 최신 설치

## 다음 단계

- MCP 연결: `llms.txt` 참고
- SDK 설치: `SDK_VERSIONS.md` 참고
- 개발자 문서: https://developers.bootpay.ai
