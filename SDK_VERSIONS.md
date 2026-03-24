# Bootpay SDK 버전

> NPM/pip/gem 등 패키지 매니저는 버전 없이 설치하면 최신이 설치됩니다.
> CDN URL은 정확한 버전 번호가 필요합니다 — 아래 표를 확인하세요.

## 클라이언트 SDK

| 플랫폼 | 패키지 | 설치 |
|--------|--------|------|
| Web (NPM) | `@bootpay/client-js` | `npm install @bootpay/client-js` |
| Web (CDN) | bootpay JS | `https://js.bootpay.co.kr/bootpay-{version}.min.js` |
| Android | `kr.co.bootpay:android` | `implementation 'kr.co.bootpay:android:{version}'` |
| iOS | `Bootpay` | `pod 'Bootpay'` |
| Flutter | `bootpay_flutter` | `flutter pub add bootpay_flutter` |
| React Native | `react-native-bootpay-api` | `npm install react-native-bootpay-api` |

## 서버 SDK

| 언어 | 패키지 | 설치 |
|------|--------|------|
| Node.js | `@bootpay/backend-js` | `npm install @bootpay/backend-js` |
| Python | `bootpay-backend` | `pip install bootpay-backend` |
| Java | `kr.co.bootpay:backend` | Maven/Gradle |
| Ruby | `bootpay` | `gem install bootpay` |
| Go | `backend-go` | `go get github.com/bootpay/backend-go/v2` |
| .NET | `Bootpay` | `dotnet add package Bootpay` |
| PHP | `bootpay/backend-php` | `composer require bootpay/backend-php` |

## 주의

- **v1 (3.x, 4.x)은 deprecated**: `bootpay-3.x.x.min.js`, `bootpay-4.x.x.min.js` 사용 금지
- 현재 버전은 **v2 (5.x)**
- 구 패키지 `bootpay-js`는 `@bootpay/client-js`로 교체

## 최신 버전 확인 방법

1. **MCP 도구** (가장 정확): `get_sdk_versions` — 항상 최신 버전 반환
2. **개발자 문서**: https://developers.bootpay.ai
