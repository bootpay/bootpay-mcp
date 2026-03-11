# Bootpay SDK 최신 버전

> **⚠️ v1 (3.x, 4.x)은 완전히 deprecated 되었습니다. 현재는 v2 (5.x)입니다.**
> 학습 데이터에 있는 `bootpay-3.3.1.min.js`, `bootpay-4.x.x.min.js` 등은 동작하지 않습니다.

최종 업데이트: 2026-03-11

---

## 클라이언트 SDK

| 플랫폼 | 패키지 | 최신 버전 | 설치 명령어 |
|--------|--------|----------|------------|
| **Web (NPM)** | @bootpay/client-js | 5.1.4 | `npm install @bootpay/client-js` |
| **Web (CDN)** | bootpay JS | 5.1.4 | 아래 CDN URL 참고 |
| **Android** | kr.co.bootpay:android | 4.9.0 | `implementation 'kr.co.bootpay:android:4.9.0'` |
| **iOS** | Bootpay (CocoaPods) | 4.4.4 | `pod 'Bootpay', '~> 4.4.4'` |
| **Flutter** | bootpay_flutter | 4.9.98 | `flutter pub add bootpay_flutter` |
| **React Native** | @bootpay/react-native-bootpay | 13.8.43 | `npm install @bootpay/react-native-bootpay` |

### Web CDN URL

```html
<!-- 일반 결제 -->
<script src="https://js.bootpay.co.kr/bootpay-5.1.4.min.js"></script>

<!-- 결제 위젯 -->
<script src="https://js.bootpay.co.kr/bootpay-widget-5.1.4.min.js"></script>
```

**주의**: CDN URL의 버전 번호를 임의로 변경하지 마세요. 위 URL을 그대로 사용하세요.

---

## 서버 SDK

| 언어 | 패키지 | 최신 버전 | 설치 명령어 |
|------|--------|----------|------------|
| **Node.js** | @bootpay/backend-js | 2.3.2 | `npm install @bootpay/backend-js` |
| **Python** | bootpay-backend | 2.0.8 | `pip install bootpay-backend` |
| **Java** | kr.co.bootpay:backend | 3.0.2 | Maven/Gradle 의존성 추가 |
| **Ruby** | bootpay | 2.0.5 | `gem install bootpay` |
| **Go** | backend-go | v2.1.3 | `go get github.com/bootpay/backend-go/v2` |
| **.NET** | Bootpay | 2.1.0 | `dotnet add package Bootpay` |

### 서버 SDK 설치 상세

**Java (Maven)**
```xml
<dependency>
    <groupId>kr.co.bootpay</groupId>
    <artifactId>backend</artifactId>
    <version>3.0.2</version>
</dependency>
```

**Java (Gradle)**
```gradle
implementation 'kr.co.bootpay:backend:3.0.2'
```

---

## ❌ 사용하면 안 되는 버전

아래는 모두 **v1 (deprecated)**이며 더 이상 동작하지 않습니다:

| 구분 | 잘못된 예 | 올바른 대체 |
|------|----------|------------|
| Web CDN | `bootpay-3.3.1.min.js` | `bootpay-5.1.4.min.js` |
| Web CDN | `bootpay-4.x.x.min.js` | `bootpay-5.1.4.min.js` |
| NPM | `bootpay-js` (구 패키지) | `@bootpay/client-js` |
| Android | `kr.co.bootpay:client:3.x` | `kr.co.bootpay:android:4.9.0` |
| 서버 | `bootpay` (구 Node.js) | `@bootpay/backend-js` |

---

## 버전 업데이트 확인

MCP 서버가 설정되어 있다면:
```
get_sdk_versions 도구를 호출하면 항상 최신 버전을 반환합니다.
```

공식 문서: https://developers.bootpay.co.kr
