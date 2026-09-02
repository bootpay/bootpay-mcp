# Bootpay SDK 버전

> NPM/pip/gem 등 패키지 매니저는 버전 없이 설치하면 최신이 설치됩니다.
> CDN URL은 정확한 버전 번호가 필요합니다 — 아래 표를 확인하세요.
> 최신 버전은 MCP의 `get_sdk_versions` 도구로 동적으로 확인할 수 있습니다.

## 클라이언트 SDK

| 플랫폼 | 패키지 | 최신 버전 | 설치 |
|--------|--------|----------|------|
| Web (NPM) | `@bootpay/client-js` | 5.3.0 | `npm install @bootpay/client-js` |
| Web (CDN) | bootpay JS | 5.3.0 | `https://js.bootpay.co.kr/bootpay-5.3.0.min.js` |
| Web 위젯 (CDN) | bootpay widget | 5.3.0 | `https://js.bootpay.co.kr/bootpay-widget-5.3.0.min.js` |
| Android | `kr.co.bootpay:android` | 5.2.0 | `implementation 'kr.co.bootpay:android:5.2.0'` |
| iOS (Swift) | `Bootpay` | 5.2.0 | `pod 'Bootpay', '~> 5.2.0'` |
| iOS (SwiftUI) | `BootpayUI` | 4.6.0 | `pod 'BootpayUI', '~> 4.6.0'` |
| Flutter | `bootpay_flutter` | 5.2.0 | `flutter pub add bootpay_flutter` |
| React Native | `react-native-bootpay-api` | 13.15.0 | `npm install react-native-bootpay-api` |

## 서버 SDK

| 언어 | 패키지 | 최신 버전 | 설치 |
|------|--------|----------|------|
| Node.js | `@bootpay/backend-js` | 2.5.0 | `npm install @bootpay/backend-js` |
| Python | `bootpay-backend` | 2.3.0 | `pip install bootpay-backend` |
| Java | `kr.co.bootpay:backend` | 3.1.0 | Maven/Gradle |
| Ruby | `bootpay` | 2.0.5 | `gem install bootpay` |
| Go | `github.com/bootpay/backend-go/v2` | v2.3.0 | `go get github.com/bootpay/backend-go/v2` |
| .NET | `Bootpay` | 2.2.0 | `dotnet add package Bootpay` |
| PHP | `bootpay/backend-php` | 2.3.0 | `composer require bootpay/backend-php` |

## 인증 방식 (서버 SDK)

모든 서버 SDK는 두 가지 인증 방식을 지원합니다:

| 방식 | 토큰 발급 | 인증 헤더 | 권장 |
|------|----------|----------|:----:|
| **신규 (client_key/secret_key)** | **불필요** — 매 요청에 SDK가 직접 부착 | `Authorization: Basic base64(client_key:secret_key)` | ✅ |
| **레거시 (application_id/private_key)** | 필수 (`getAccessToken()`, 30분 유효) | `Authorization: Bearer <token>` | (호환용) |

> 신규 방식에서는 `getAccessToken()`을 호출해도 SDK 내부에서 no-op 처리됩니다(2026-05 기준). 매 요청 시 인터셉터가 Basic Auth를 자동 부착합니다.

## 주의

- **v1 (3.x, 4.x)은 deprecated**: `bootpay-3.x.x.min.js`, `bootpay-4.x.x.min.js` 사용 금지
- 현재 클라이언트 SDK는 **v2 (5.x)** 라인 (iOS SwiftUI만 4.6.x — 다른 SDK와 별개 라인)
- 구 패키지 `bootpay-js`는 `@bootpay/client-js`로 교체
- 서버 SDK는 인증 secret 파라미터 명명이 `secret_key`로 통일됨 (2026-05). 구 `server_key` / `serverKey` / `SERVER_KEY` 명명은 모두 deprecated이며 신규 사용 금지

## 최신 버전 확인 방법

1. **MCP 도구** (가장 정확): `get_sdk_versions` — 항상 최신 버전 반환
2. **개발자 문서**: https://developers.bootpay.ai
