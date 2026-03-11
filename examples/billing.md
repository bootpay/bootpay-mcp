# 정기결제 (빌링키 발급 + 서버 자동결제)

정기결제는 2단계로 구성됩니다:
1. **프론트엔드**: 빌링키 발급 (`requestSubscription`)
2. **서버**: 빌링키로 자동결제 요청 (`requestSubscribeCardPayment`)

> **일반결제와 차이**: 일반결제(`requestPayment`)는 매번 사용자가 결제, 정기결제는 최초 1회 카드 등록 후 서버에서 자동 결제

## 1. 프론트엔드 — 빌링키 발급 (Web)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>정기결제 카드 등록</title>
    <!-- ⚠️ 반드시 최신 v2 SDK를 사용하세요 (5.x). 3.x/4.x는 deprecated -->
    <script src="https://js.bootpay.co.kr/bootpay-5.1.4.min.js"></script>
</head>
<body>
    <h1>정기결제 카드 등록</h1>

    <div>
        <h3>구독 플랜</h3>
        <p>월간 프리미엄 플랜 — ₩29,000/월</p>
        <p style="color:#666;">카드 등록 시 첫 결제가 진행됩니다.</p>
    </div>

    <div>
        <label>이름: <input type="text" id="userName" value="홍길동"></label><br>
        <label>전화: <input type="text" id="userPhone" value="01012345678"></label><br>
        <label>이메일: <input type="email" id="userEmail" value="test@example.com"></label>
    </div>

    <button onclick="requestBillingKey()" style="margin-top:16px; padding:12px 24px; font-size:16px;">
        카드 등록 및 결제
    </button>

    <div id="result" style="margin-top:16px;"></div>

    <script>
    async function requestBillingKey() {
        try {
            const result = await Bootpay.requestSubscription({
                // ⚠️ 반드시 관리자에서 발급받은 실제 Application ID를 사용하세요
                application_id: 'YOUR_APPLICATION_ID',  // ← 교체 필수!
                pg: 'nicepay',
                method: '카드자동',             // ← 빌링키 발급 전용 method (모바일 SDK: 'card_rebill')
                price: 29000,                 // 첫 결제 금액
                order_name: '월간 프리미엄 플랜',
                order_id: 'sub_' + Date.now(),
                subscription_id: 'sub_' + Date.now(),  // 구독 식별자
                tax_free: 0,
                user: {
                    username: document.getElementById('userName').value,
                    phone: document.getElementById('userPhone').value,
                    email: document.getElementById('userEmail').value
                }
            });

            if (result.event === 'done') {
                const billingKey = result.data.billing_key;
                const receiptId = result.data.receipt_id;

                document.getElementById('result').innerHTML =
                    '<p style="color:green;">카드 등록 성공! billing_key: ' + billingKey + '</p>';

                // ⚠️ 핵심: billing_key를 서버에 전달하여 저장
                // 이후 서버에서 이 billing_key로 자동결제를 요청합니다
                await fetch('/api/billing/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        billing_key: billingKey,
                        receipt_id: receiptId,
                        user_id: 'user_123'
                    })
                });
            }
        } catch (e) {
            // ⚠️ 에러 발생 시 반드시 콘솔에 로깅하세요 — 디버깅의 핵심 단서입니다
            console.error('Bootpay 빌링키 발급 에러:', {
                event: e.event,       // 'error' 또는 'cancel'
                message: e.message,   // 에러 메시지
                data: e.data,         // 상세 에러 데이터
                fullError: e          // 전체 에러 객체
            });

            if (e.event === 'cancel') {
                document.getElementById('result').innerHTML =
                    '<p style="color:orange;">카드 등록 취소</p>';
            } else {
                document.getElementById('result').innerHTML =
                    '<p style="color:red;">카드 등록 실패: ' + (e.message || JSON.stringify(e)) + '</p>';
            }
        }
    }
    </script>
</body>
</html>
```

## 2. 서버 — 빌링키로 자동결제 (Node.js)

```javascript
import { Bootpay } from '@bootpay/backend-js'

// ── 서버 초기화 ──
Bootpay.setConfiguration({
    application_id: process.env.BOOTPAY_REST_APP_ID,
    private_key: process.env.BOOTPAY_PRIVATE_KEY
})

// ── 토큰 발급 ──
async function getToken() {
    const token = await Bootpay.getAccessToken()
    if (!token) throw new Error('토큰 발급 실패')
    return token
}

// ── 자동결제 요청 ──
// billing_key로 사용자 개입 없이 서버에서 직접 결제
async function chargeWithBillingKey(billingKey, orderInfo) {
    await getToken()

    const result = await Bootpay.requestSubscribeCardPayment({
        billing_key: billingKey,
        order_name: orderInfo.name,
        order_id: `auto_${Date.now()}`,
        price: orderInfo.price,
        tax_free: 0,
        user: {
            username: orderInfo.userName,
            phone: orderInfo.userPhone,
        },
        items: orderInfo.items || []
    })

    console.log('자동결제 결과:', result)
    return result
}

// ── 예약 결제 (특정 시각에 자동 결제) ──
// 서버에서 예약하면 Bootpay가 해당 시각에 자동으로 결제 실행
async function reservePayment(billingKey, orderInfo, executeAt) {
    await getToken()

    const result = await Bootpay.subscribePaymentReserve({
        billing_key: billingKey,
        order_name: orderInfo.name,
        order_id: `reserve_${Date.now()}`,
        price: orderInfo.price,
        tax_free: 0,
        reserve_execute_at: executeAt,       // Date 객체 또는 ISO 8601 문자열
        user: {
            username: orderInfo.userName,
            phone: orderInfo.userPhone,
        }
    })

    console.log('예약 결제 등록:', result)
    return result
}

// ── 빌링키 해지 ──
async function destroyBillingKey(billingKey) {
    await getToken()
    const result = await Bootpay.destroyBillingKey(billingKey)
    console.log('빌링키 해지:', result)
    return result
}

// ── 사용 예시 ──
// 매월 1일 자동결제 (크론잡 등에서 호출)
async function monthlyCharge() {
    const subscribers = await db.getActiveSubscribers()

    for (const sub of subscribers) {
        try {
            const result = await chargeWithBillingKey(sub.billing_key, {
                name: '월간 프리미엄 플랜',
                price: 29000,
                userName: sub.username,
                userPhone: sub.phone,
            })

            await db.savePaymentLog(sub.user_id, result)
        } catch (error) {
            console.error(`자동결제 실패 (user: ${sub.user_id}):`, error)
            // 실패 시 재시도 로직 또는 사용자 알림
            await notifyPaymentFailed(sub.user_id, error)
        }
    }
}
```

## 정기결제 전체 흐름

```
[프론트엔드]                         [서버]                          [Bootpay]
    │                                 │                                │
    │  1. requestSubscription()       │                                │
    │─────────────────────────────────┼───────────────────────────────→│
    │                                 │                                │
    │  2. 사용자: 카드 정보 입력       │                                │
    │  3. done 이벤트 (billing_key)   │                                │
    │←────────────────────────────────┼────────────────────────────────│
    │                                 │                                │
    │  4. billing_key를 서버로 전달    │                                │
    │─────────────────────────────→   │                                │
    │                                 │  5. billing_key 저장 (DB)      │
    │                                 │                                │
    │                                 │  6. 매월: requestSubscribe     │
    │                                 │     CardPayment(billing_key)   │
    │                                 │───────────────────────────────→│
    │                                 │  7. 결제 결과                   │
    │                                 │←───────────────────────────────│
```

## 핵심 포인트

1. **`requestSubscription()` vs `requestPayment()`**: 빌링키 발급은 반드시 `requestSubscription()` 사용. `requestPayment()`는 일반결제용
2. **`method: 'card_rebill'`**: 빌링키 발급 전용 결제수단. 일반 `card`와 다름
3. **`subscription_id`**: 구독을 식별하는 고유 ID. 관리자에서 구독별 결제 내역 조회에 사용
4. **`billing_key` 보관**: 서버 DB에 암호화하여 저장. 절대 프론트엔드에 보관하지 마세요
5. **서버 자동결제**: `requestSubscribeCardPayment()`로 서버에서 직접 결제. 사용자 개입 불필요
6. **예약 결제**: `subscribePaymentReserve()`로 특정 시각에 자동 결제 예약 가능
7. **빌링키 해지**: 구독 해지 시 `destroyBillingKey()`로 빌링키 무효화
8. **실패 처리**: 카드 한도 초과, 분실 카드 등으로 실패할 수 있음 → 재시도 + 사용자 알림 필수
