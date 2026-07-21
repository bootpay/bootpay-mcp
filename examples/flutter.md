# Flutter

Flutter에서 일반결제, 정기결제(빌링키), 다중 결제수단을 연동하는 예제입니다.

> **⚠️ Client Key는 Admin CLI(`create_keychain` 또는 `list_keychains`)로 조회하거나, [admin.bootpay.ai](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment)에서 직접 확인한 실제 값을 사용하세요.**
> AI가 임의로 생성한 값은 100% 실패합니다. Flutter는 Web/Android/iOS 별로 Client Key가 다릅니다.

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
# ⚠️ 아래 값은 Admin CLI list_keychains(source=core) 또는 admin.bootpay.ai에서 조회한 실제 값을 입력하세요
# AI가 임의로 생성한 값(예: 692e4c6da0ba...)은 100% 실패합니다
BOOTPAY_WEB_CLIENT_KEY=     # Web Client Key
BOOTPAY_ANDROID_CLIENT_KEY= # Android Client Key
BOOTPAY_IOS_CLIENT_KEY=     # iOS Client Key
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

  // ⚠️ Admin CLI list_keychains(source=core) 또는 admin.bootpay.ai에서 조회한 실제 값만 사용
  // --dart-define 또는 .env 패키지로 주입하세요. AI가 임의 생성한 값은 100% 실패합니다
  String get _clientKey {
    if (kIsWeb) return const String.fromEnvironment('BOOTPAY_WEB_CLIENT_KEY');
    if (Platform.isAndroid) return const String.fromEnvironment('BOOTPAY_ANDROID_CLIENT_KEY');
    if (Platform.isIOS) return const String.fromEnvironment('BOOTPAY_IOS_CLIENT_KEY');
    return '';
  }

  Future<void> _requestPayment() async {
    setState(() => _loading = true);

    Payload payload = Payload()
      ..clientKey = _clientKey
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
      onConfirm: (String data) {
        // ── 서버승인(기본): receipt_id를 서버로 전달만 하고 false 반환 (자동 승인 방지) ──
        sendConfirmToServer(data);  // 서버 /api/confirm 호출 → 서버가 confirmPayment()
        return false; // 자동 승인 방지
      },
      onDone: (String data) {
        // 서버승인 방식에서는 호출되지 않음
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
        // 결과 화면으로 이동 → 서버 DB 조회로 결제 결과 확인
        setState(() => _loading = false);
      },
    );
  }

  // ── 서버승인 헬퍼 ──
  // data(JSON)에서 receipt_id를 추출 → POST /api/confirm { receipt_id, order_id }
  // 서버가 confirmPayment(receipt_id) 호출 후 리턴값(status·price)으로 검증 (금액 불일치 시 cancelPayment)
  Future<void> sendConfirmToServer(String data) async {
    // final receiptId = jsonDecode(data)['receipt_id'];
    // http.post 로 서버 /api/confirm 에 전달 → 서버가 confirmPayment 후 금액 검증
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
    ..clientKey = _clientKey
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
    ..clientKey = _clientKey
    ..pg = pg
    ..method = method
    ..price = 50000
    ..orderName = '나이키 운동화 외 1건'
    ..orderId = 'order_${DateTime.now().millisecondsSinceEpoch}';

  Bootpay().requestPayment(
    payload: payload,
    user: User()..username = '홍길동',
    onConfirm: (data) {
      sendConfirmToServer(data);  // 서버 /api/confirm 호출 → 서버가 confirmPayment()
      return false; // 자동 승인 방지
    },
    onDone: (data) {
      // 서버승인 방식에서는 호출되지 않음
    },
    onError: (data) => print('에러: $data'),
    onCancel: (data) => print('취소: $data'),
    onClose: () {},
  );
}
```

## 핵심 포인트

1. **플랫폼별 Client Key**: Web/Android/iOS 각각 다른 키 사용
2. **`requestPayment` vs `requestSubscription`**: 일반결제와 빌링키 발급은 메서드가 다름
3. **PG 분기**: 카카오페이(`kakao`), 네이버페이(`naverpay`)는 별도 PG 지정
4. **서버승인이 기본**: `onConfirm`에서 receipt_id를 서버로 전달하고 `false` 반환 (자동 승인 방지). 서버가 `confirmPayment()` 후 리턴값(status·price)으로 검증. `onDone`은 호출되지 않음
5. **웹훅 보완**: 클라이언트 결과 처리는 앱 종료로 유실될 수 있음. 웹훅 엔드포인트 필수 (부트페이 IP `223.130.82.0/24` 필터 + 200/`success:true` 응답 + 재검증)
