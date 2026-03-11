# iOS (Swift)

iOS에서 일반결제와 정기결제(빌링키)를 연동하는 예제입니다.

## 설치

```ruby
# Podfile
pod 'Bootpay', '~> 4.4.4'
```

```bash
cd ios && pod install
```

## 1. 일반결제 (PaymentViewController.swift)

```swift
import UIKit
import Bootpay

class PaymentViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        title = "일반결제"
        requestPayment()
    }

    func requestPayment() {
        let items = [
            BootItem(name: "나이키 운동화", qty: 1, id: "shoe-01", price: 30000),
            BootItem(name: "아디다스 양말", qty: 2, id: "sock-01", price: 10000),
        ]

        let user = BootUser()
        user.username = "홍길동"
        user.phone = "01012345678"
        user.email = "test@example.com"

        let extra = BootExtra()
        extra.cardQuota = "0,2,3,4,5,6"

        let payload = Payload()
        // ⚠️ 반드시 관리자에서 발급받은 실제 Application ID를 사용하세요
        payload.applicationId = "YOUR_IOS_APP_ID"  // ← 교체 필수!
        payload.pg = "nicepay"
        payload.method = "card"
        payload.price = 50000
        payload.orderName = "나이키 운동화 외 1건"
        payload.orderId = "order_\(Int(Date().timeIntervalSince1970))"

        Bootpay.requestPayment(
            viewController: self,
            payload: payload,
            items: items,
            user: user,
            extra: extra
        )
        .onDone { data in
            let alert = UIAlertController(title: "결제 성공", message: data, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "확인", style: .default))
            self.present(alert, animated: true)
            // TODO: 서버로 receipt_id 전달하여 검증
        }
        .onCancel { data in
            print("결제 취소: \(data)")
        }
        .onError { data in
            print("결제 에러: \(data)")
        }
        .onClose {
            print("결제창 닫힘")
        }
    }
}
```

## 2. 정기결제 — 빌링키 발급 (SubscriptionViewController.swift)

```swift
class SubscriptionViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        title = "정기결제"
        requestSubscription()
    }

    func requestSubscription() {
        let user = BootUser()
        user.username = "홍길동"
        user.phone = "01012345678"

        let payload = Payload()
        payload.applicationId = "YOUR_IOS_APP_ID"  // ← 교체 필수!
        payload.pg = "nicepay"
        payload.method = "card_rebill"   // ← 빌링키 발급
        payload.price = 29000
        payload.orderName = "월간 구독 플랜"
        payload.orderId = "sub_\(Int(Date().timeIntervalSince1970))"
        payload.subscriptionId = "sub_\(Int(Date().timeIntervalSince1970))"

        Bootpay.requestSubscription(
            viewController: self,
            payload: payload,
            user: user
        )
        .onDone { data in
            // billing_key를 서버에 저장 → 이후 서버에서 자동결제 요청
            print("빌링키 발급 성공: \(data)")
        }
        .onIssued { data in
            print("빌링키 발급됨: \(data)")
        }
        .onCancel { data in
            print("발급 취소: \(data)")
        }
        .onError { data in
            print("발급 에러: \(data)")
        }
        .onClose {}
    }
}
```

## 핵심 포인트

1. **Application ID**: iOS 전용 ID를 사용 ([관리자 → 개발자 설정](https://admin.bootpay.co.kr/setting/developer?tab=api-key&cursor=payment))
2. **Chainable API**: `.onDone { }.onCancel { }.onError { }` 체이닝 방식
3. **URL Scheme**: Info.plist에 앱 스킴 등록 필요 (외부 앱에서 복귀 시)
4. **서버 검증**: `onDone`에서 받은 데이터의 `receipt_id`를 서버로 전달하여 검증 필수
