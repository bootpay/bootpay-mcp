# Flutter

Flutter에서 일반결제, 정기결제(빌링키), 다중 결제수단을 연동하는 예제입니다.

> **주의**: Flutter는 Web/Android/iOS 별로 **Application ID가 다릅니다**. 각 플랫폼의 ID를 관리자에서 확인하세요.

## 설치

```yaml
# pubspec.yaml
dependencies:
  bootpay_flutter: ^5.0.0
```

```bash
flutter pub get
```

## 환경 설정

```bash
# .env 또는 --dart-define 사용
BOOTPAY_WEB_APP_ID=your_web_application_id
BOOTPAY_ANDROID_APP_ID=your_android_application_id
BOOTPAY_IOS_APP_ID=your_ios_application_id
```

## 1. 일반결제

```dart
import 'package:bootpay_flutter/bootpay_flutter.dart';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class PaymentScreen extends StatefulWidget {
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _loading = false;

  String get _appId {
    if (kIsWeb) return 'YOUR_WEB_APP_ID';         // ← 교체 필수!
    if (Platform.isAndroid) return 'YOUR_ANDROID_APP_ID';  // ← 교체 필수!
    if (Platform.isIOS) return 'YOUR_IOS_APP_ID';          // ← 교체 필수!
    return '';
  }

  Future<void> _requestPayment() async {
    setState(() => _loading = true);

    Payload payload = Payload()
      ..applicationId = _appId
      ..pg = 'nicepay'
      ..method = 'card'
      ..price = 50000
      ..orderName = '나이키 운동화 외 1건'
      ..orderId = 'order_${DateTime.now().millisecondsSinceEpoch}';

    payload.items = [
      Item()..name = '나이키 운동화'..qty = 1..id = 'shoe-01'..price = 30000,
      Item()..name = '아디다스 양말'..qty = 2..id = 'sock-01'..price = 10000,
    ];

    User user = User()
      ..username = '홍길동'
      ..phone = '01012345678'
      ..email = 'test@example.com';

    Extra extra = Extra()
      ..cardQuota = '0,2,3,4,5,6';

    Bootpay().requestPayment(
      payload: payload,
      user: user,
      extra: extra,
      onDone: (String data) {
        print('결제 성공: $data');
        // TODO: 서버로 receipt_id 전달하여 검증
        setState(() => _loading = false);
      },
      onCancel: (String data) {
        print('결제 취소: $data');
        setState(() => _loading = false);
      },
      onError: (String data) {
        print('결제 에러: $data');
        setState(() => _loading = false);
      },
      onClose: () {
        setState(() => _loading = false);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('일반결제')),
      body: Center(
        child: _loading
            ? CircularProgressIndicator()
            : ElevatedButton(
                onPressed: _requestPayment,
                child: Text('₩50,000 결제하기'),
              ),
      ),
    );
  }
}
```

## 2. 정기결제 (빌링키 발급)

```dart
Future<void> _requestSubscription() async {
  Payload payload = Payload()
    ..applicationId = _appId
    ..pg = 'nicepay'
    ..method = 'card_rebill'   // ← 빌링키 발급용
    ..price = 1000             // 테스트 금액
    ..orderName = '월간 구독 플랜'
    ..orderId = 'sub_${DateTime.now().millisecondsSinceEpoch}'
    ..subscriptionId = 'sub_${DateTime.now().millisecondsSinceEpoch}';

  User user = User()
    ..username = '홍길동'
    ..phone = '01012345678'
    ..email = 'test@example.com';

  Bootpay().requestSubscription(
    payload: payload,
    user: user,
    onDone: (String data) {
      print('빌링키 발급 성공: $data');
      // TODO: 서버에 billing_key 저장 → 이후 서버에서 자동결제 요청
    },
    onIssued: (String data) {
      print('빌링키 발급됨: $data');
    },
    onCancel: (String data) {
      print('발급 취소: $data');
    },
    onError: (String data) {
      print('발급 에러: $data');
    },
    onClose: () {},
  );
}
```

## 3. 다중 결제수단 (PG 분기)

```dart
void _pay(String method) {
  String pg;
  switch (method) {
    case 'kakao':
      pg = 'kakao';
      break;
    case 'npay':
      pg = 'naverpay';
      break;
    default:
      pg = 'nicepay';
  }

  Payload payload = Payload()
    ..applicationId = _appId
    ..pg = pg
    ..method = method
    ..price = 50000
    ..orderName = '나이키 운동화 외 1건'
    ..orderId = 'order_${DateTime.now().millisecondsSinceEpoch}';

  Bootpay().requestPayment(
    payload: payload,
    user: User()..username = '홍길동',
    onDone: (data) => print('성공: $data'),
    onError: (data) => print('에러: $data'),
    onCancel: (data) => print('취소: $data'),
    onClose: () {},
  );
}
```

## 핵심 포인트

1. **플랫폼별 Application ID**: Web/Android/iOS 각각 다른 ID 사용
2. **`requestPayment` vs `requestSubscription`**: 일반결제와 빌링키 발급은 메서드가 다름
3. **PG 분기**: 카카오페이(`kakao`), 네이버페이(`naverpay`)는 별도 PG 지정
4. **서버 검증**: `onDone`에서 받은 `receipt_id`를 서버로 전달하여 검증 필수
