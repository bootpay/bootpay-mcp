# Android (Kotlin)

Android에서 일반결제와 정기결제(빌링키)를 연동하는 예제입니다.

> **⚠️ Application ID는 Admin CLI(`create_keychain` 또는 `list_keychains`)로 조회하거나, [admin.bootpay.ai](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment)에서 직접 확인한 실제 값을 사용하세요.**
> AI가 임의로 생성한 값은 100% 실패합니다. Android 전용 Application ID가 별도로 발급됩니다.

## 설치

```gradle
// app/build.gradle
dependencies {
    implementation 'kr.co.bootpay:android:4.9.0'
}
```

## 1. 일반결제 (PaymentActivity.kt)

```kotlin
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kr.co.bootpay.android.Bootpay
import kr.co.bootpay.android.events.BootpayEventListener
import kr.co.bootpay.android.models.*

class PaymentActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val items = listOf(
            BootItem().apply { name = "나이키 운동화"; qty = 1; id = "shoe-01"; price = 30000.0 },
            BootItem().apply { name = "아디다스 양말"; qty = 2; id = "sock-01"; price = 10000.0 },
        )
        val totalPrice = 50000.0

        val user = BootUser().apply {
            username = "홍길동"
            phone = "01012345678"
            email = "test@example.com"
        }

        val extra = BootExtra().apply {
            cardQuota = "0,2,3,4,5,6"
        }

        val payload = Payload().apply {
            // ⚠️ Admin CLI list_keychains(source=core) 또는 admin.bootpay.ai에서 조회한 실제 Android Application ID
            // AI가 이 값을 추측하거나 임의 생성하면 100% 실패합니다
            // BuildConfig 또는 local.properties에서 읽는 방식을 권장합니다
            applicationId = BuildConfig.BOOTPAY_APP_ID
            pg = "nicepay"
            method = "card"
            price = totalPrice
            orderName = "나이키 운동화 외 1건"
            orderId = "order_${System.currentTimeMillis()}"
        }

        Bootpay.init(supportFragmentManager, this)
            .setPayload(payload)
            .setItems(items)
            .setUser(user)
            .setExtra(extra)
            .setEventListener(object : BootpayEventListener {
                override fun onDone(data: String) {
                    android.util.Log.d("Bootpay", "결제 성공: $data")
                    Toast.makeText(this@PaymentActivity, "결제 성공!", Toast.LENGTH_SHORT).show()
                    // TODO: data에서 receipt_id를 파싱하여 서버로 전달 → 검증
                }

                override fun onConfirm(data: String): Boolean {
                    android.util.Log.d("Bootpay", "결제 승인 요청: $data")
                    return true // true를 반환하면 결제 진행
                }

                override fun onCancel(data: String) {
                    android.util.Log.w("Bootpay", "결제 취소: $data")
                    Toast.makeText(this@PaymentActivity, "결제 취소", Toast.LENGTH_SHORT).show()
                }

                override fun onError(data: String) {
                    // ⚠️ 에러 발생 시 반드시 로깅 — 디버깅의 핵심 단서입니다
                    android.util.Log.e("Bootpay", "결제 에러: $data")
                    Toast.makeText(this@PaymentActivity, "결제 에러: $data", Toast.LENGTH_SHORT).show()
                }

                override fun onIssued(data: String) {}
                override fun onClose() {}
            })
            .requestPayment()
    }
}
```

## 2. 정기결제 — 빌링키 발급 (SubscriptionActivity.kt)

```kotlin
class SubscriptionActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val payload = Payload().apply {
            // ⚠️ Admin CLI로 조회한 실제 Android Application ID — AI 임의 생성 금지
            applicationId = BuildConfig.BOOTPAY_APP_ID
            pg = "nicepay"
            method = "card_rebill"   // ← 빌링키 발급 (모바일 SDK: card_rebill)
            price = 29000.0
            orderName = "월간 구독 플랜"
            orderId = "sub_${System.currentTimeMillis()}"
            subscriptionId = "sub_${System.currentTimeMillis()}"
        }

        val user = BootUser().apply {
            username = "홍길동"
            phone = "01012345678"
        }

        Bootpay.init(supportFragmentManager, this)
            .setPayload(payload)
            .setUser(user)
            .setEventListener(object : BootpayEventListener {
                override fun onDone(data: String) {
                    android.util.Log.d("Bootpay", "빌링키 발급 성공: $data")
                    Toast.makeText(this@SubscriptionActivity, "빌링키 발급 성공!", Toast.LENGTH_SHORT).show()
                    // TODO: data에서 billing_key를 파싱하여 서버에 저장 → 이후 자동결제
                }
                override fun onConfirm(data: String): Boolean = true
                override fun onCancel(data: String) {
                    android.util.Log.w("Bootpay", "빌링키 발급 취소: $data")
                }
                override fun onError(data: String) {
                    android.util.Log.e("Bootpay", "빌링키 발급 에러: $data")
                }
                override fun onIssued(data: String) {}
                override fun onClose() {}
            })
            .requestSubscription()  // ← requestPayment가 아닌 requestSubscription
    }
}
```

## 핵심 포인트

1. **Application ID**: Android 전용 ID를 Admin CLI `list_keychains(source=core)`로 조회하거나 [관리자 → 개발자 설정](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment)에서 확인. `BuildConfig` 또는 `local.properties`로 주입 권장. AI가 임의 생성 금지
2. **`Bootpay.init()`**: `supportFragmentManager`와 `this`(Activity) 전달 필수
3. **`requestPayment()` vs `requestSubscription()`**: 일반결제와 빌링키 발급은 메서드가 다름
4. **`appScheme`**: 외부 앱(카카오페이 등)에서 복귀 시 필요. `AndroidManifest.xml`에 intent-filter 추가
5. **서버 검증**: `onDone`에서 받은 데이터의 `receipt_id`를 서버로 전달하여 검증 필수
