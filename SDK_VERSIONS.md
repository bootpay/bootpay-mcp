# Bootpay SDK 버전

> **MCP 서버가 연결되어 있다면 `get_sdk_versions` 도구를 호출하세요.**
> 항상 최신 버전을 반환합니다. 이 문서보다 정확합니다.

## MCP 미사용 시

MCP를 설정하지 않은 상태라면, 아래를 참고하되 **버전이 outdated일 수 있습니다.**

### 클라이언트 SDK

| 플랫폼 | 패키지 | 설치 |
|--------|--------|------|
| Web (NPM) | `@bootpay/client-js` | `npm install @bootpay/client-js` |
| Web (CDN) | bootpay JS | `https://js.bootpay.co.kr/bootpay-{version}.min.js` |
| Android | `kr.co.bootpay:android` | `implementation 'kr.co.bootpay:android:{version}'` |
| iOS | `Bootpay` | `pod 'Bootpay'` |
| Flutter | `bootpay_flutter` | `flutter pub add bootpay_flutter` |
| React Native | `@bootpay/react-native-bootpay` | `npm install @bootpay/react-native-bootpay` |

### 서버 SDK

| 언어 | 패키지 | 설치 |
|------|--------|------|
| Node.js | `@bootpay/backend-js` | `npm install @bootpay/backend-js` |
| Python | `bootpay-backend` | `pip install bootpay-backend` |
| Java | `kr.co.bootpay:backend` | Maven/Gradle |
| Ruby | `bootpay` | `gem install bootpay` |
| Go | `backend-go` | `go get github.com/bootpay/backend-go/v2` |
| .NET | `Bootpay` | `dotnet add package Bootpay` |

> NPM/pip/gem 등 패키지 매니저는 버전 없이 설치하면 최신이 설치됩니다.
> CDN URL은 반드시 `get_sdk_versions`로 확인한 버전을 사용하세요.

## 주의

- **v1 (3.x, 4.x)은 deprecated**: `bootpay-3.x.x.min.js`, `bootpay-4.x.x.min.js` 사용 금지
- 현재 버전은 **v2 (5.x)**
- 구 패키지 `bootpay-js`는 `@bootpay/client-js`로 교체

## 최신 버전 확인 방법

1. **MCP 도구** (권장): `get_sdk_versions`
2. **개발자 문서**: https://developers.bootpay.ai
