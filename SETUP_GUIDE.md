# Bootpay 연동 설정 가이드

Bootpay 결제 연동 시 **가장 흔한 실패 원인**은 Application ID 미설정입니다.
코드를 작성하기 전에 이 가이드를 반드시 따르세요.

---

## 1. 계정 & 프로젝트 생성

1. [Bootpay 관리자](https://admin.bootpay.ai) 회원가입
2. 사업자 정보 등록
3. [프로젝트 생성](https://admin.bootpay.ai/project/new)
4. 사용할 PG사 활성화 ([결제 설정](https://admin.bootpay.ai/payment/setting))

---

## 2. API 키 확인

[관리자 → 개발자 설정 → API 연동키](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment)

### 결제 API 키

| 키 | 용도 | 사용 위치 |
|----|------|-----------|
| **Application ID** | 프론트엔드 SDK에서 결제창 호출 | 클라이언트 코드 |
| **REST API Application ID** | 서버에서 API 토큰 발급 | 서버 환경변수 |
| **Private Key** | 서버에서 API 토큰 발급 (비밀) | 서버 환경변수 |

### 커머스 API 키 (주문서·구독 기능 사용 시)

| 키 | 용도 | 사용 위치 |
|----|------|-----------|
| **Commerce Client Key** | 클라이언트 SDK에서 주문서 요청 | 클라이언트 코드 |
| **Commerce Secret Key** | 서버에서 커머스 API 호출 | 서버 환경변수 |

> ⚠️ **Sandbox와 Production의 Application ID는 다릅니다.**
> 개발 중에는 Sandbox ID, 실서비스에는 Production ID를 사용하세요.
> 관리자에서 환경을 전환하여 각 환경의 ID를 확인할 수 있습니다.

---

## 3. 환경변수 설정

### 서버 (.env)

```bash
BOOTPAY_REST_APP_ID=your_rest_application_id
BOOTPAY_PRIVATE_KEY=your_private_key
```

### 프론트엔드 — 프레임워크별

```bash
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
```

### 모바일 — 플랫폼별 Application ID

**Flutter, React Native는 플랫폼별 Application ID가 다릅니다:**

```bash
# .env
BOOTPAY_APP_ID=your_web_application_id
BOOTPAY_ANDROID_APP_ID=your_android_application_id
BOOTPAY_IOS_APP_ID=your_ios_application_id
```

**Android — `local.properties` 또는 `BuildConfig`**
```properties
# local.properties (git에 커밋하지 마세요)
BOOTPAY_APP_ID=your_android_application_id
```

**iOS — xcconfig 또는 Info.plist**
```bash
# Debug.xcconfig (git에 커밋하지 마세요)
BOOTPAY_APP_ID = your_ios_application_id
```

**Flutter — `--dart-define`**
```bash
flutter run --dart-define=BOOTPAY_APP_ID=your_application_id
```

### 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Private Key가 프론트엔드 코드에 포함되지 않는지 확인
- [ ] Sandbox / Production ID를 올바르게 구분하고 있는지 확인

---

## 4. 결제 연동 핵심 규칙

### PG 결제는 반드시 프론트엔드에서 시작

국내 PG 결제의 필수 흐름:

```
1. 프론트엔드: SDK로 결제창 호출 → 사용자가 결제
2. 프론트엔드: 결제 완료 → receipt_id 수신
3. 백엔드: receipt_id로 결제 검증 (금액 일치 확인)
```

**절대 하지 말 것:**
- 백엔드에서 결제를 시작하는 코드 작성
- `fetch`/`requests`로 결제 API를 직접 호출 (서버 SDK를 사용하세요)

### API 도메인 구분

| API | 도메인 | 용도 |
|-----|--------|------|
| **PG API** | `api.bootpay.co.kr` | 결제, 빌링, 취소, 검증 |
| **Commerce API** | `api.bootapi.com` | 상품, 주문, 고객, 구독 |

---

## 5. 서버 토큰 발급 테스트

연동의 첫 단계로 서버에서 토큰 발급이 되는지 확인하세요:

**Node.js**
```javascript
import { Bootpay } from '@bootpay/backend-js'

Bootpay.setConfiguration({
    application_id: process.env.BOOTPAY_REST_APP_ID,
    private_key: process.env.BOOTPAY_PRIVATE_KEY
})

const token = await Bootpay.getAccessToken()
console.log('토큰 발급 성공:', token)
```

**Python**
```python
from bootpay_backend import BootpayBackend

bootpay = BootpayBackend(
    application_id='your_rest_application_id',
    private_key='your_private_key'
)

token = bootpay.get_access_token()
print('토큰 발급 성공:', token)
```

토큰 발급이 성공하면 API 키가 올바르게 설정된 것입니다.

---

## 다음 단계

- [examples/](./examples/) — 플랫폼별 연동 코드 예제
- [SDK_VERSIONS.md](./SDK_VERSIONS.md) — 최신 SDK 버전 확인
- [개발자 문서](https://developers.bootpay.ai) — 전체 API 레퍼런스
