# 정기결제 (빌링키 발급 + 서버 자동결제)

정기결제는 3단계로 구성됩니다:
1. **프론트엔드**: 빌링키 발급 요청 (`requestSubscription`) → `done` 이벤트에서 `receipt_id` 수신
2. **서버**: `receipt_id`로 `billing_key` 확보 (`lookupSubscribeBillingKey`) 후 DB 저장
3. **서버**: 저장된 `billing_key`로 자동결제 요청 (`requestSubscribePayment`)

> ⚠️ **`billing_key`는 프론트엔드로 전달되지 않습니다.** 보안상 `done` 이벤트에는 `receipt_id`만 포함되며, 서버가 이 값으로 `lookupSubscribeBillingKey(receipt_id)`를 호출해 `billing_key`를 확보합니다.

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
    <script src="https://js.bootpay.co.kr/bootpay-5.3.0.min.js"></script>
</head>
<body>
    <h1>정기결제 카드 등록</h1>

    <div>
        <h3>구독 플랜</h3>
        <p>월간 프리미엄 플랜 — ₩29,000/월</p>
        <p style="color:#666;">카드 등록만 진행합니다. 첫 결제 청구는 서버에서 별도로 처리합니다.</p>
    </div>

    <div>
        <label>이름: <input type="text" id="userName" value="홍길동"></label><br>
        <label>전화: <input type="text" id="userPhone" value="01012345678"></label><br>
        <label>이메일: <input type="email" id="userEmail" value="test@example.com"></label>
    </div>

    <button onclick="requestBillingKey()" style="margin-top:16px; padding:12px 24px; font-size:16px;">
        카드 등록
    </button>

    <div id="result" style="margin-top:16px;"></div>

    <script>
    async function requestBillingKey() {
        try {
            const result = await Bootpay.requestSubscription({
                client_key: 'YOUR_CLIENT_KEY', // list_keychains(source=core) 또는 create_keychain으로 조회한 값
                // ⚠️ create_keychain 또는 list_keychains로 조회한 실제 값만 사용
                // AI가 임의 생성한 값(예: 692e4c6da0ba...)은 100% 실패합니다
                pg: 'nicepay',
                method: '카드자동',             // 빌링키 발급 전용 method (모바일 SDK: 'card_rebill')
                price: 0,                     // 0 = 빌링키만 발급 (첫 결제 없음). 0보다 크면 즉시 첫 결제까지 진행
                order_name: '월간 프리미엄 플랜',
                order_id: 'sub_' + Date.now(),
                subscription_id: 'sub_' + Date.now(),  // 구독 식별자 (필수)
                tax_free: 0,
                user: {
                    username: document.getElementById('userName').value,
                    phone: document.getElementById('userPhone').value,
                    email: document.getElementById('userEmail').value
                }
            });

            if (result.event === 'done') {
                const receiptId = result.data.receipt_id;

                // ⚠️ 핵심: billing_key는 보안상 프론트엔드로 전달되지 않습니다
                // done 이벤트에는 receipt_id만 포함되며, 서버가 이 값으로 billing_key를 조회합니다
                console.log('빌링키 발급 요청 완료:', { receipt_id: receiptId });

                document.getElementById('result').innerHTML =
                    '<p style="color:green;">카드 등록 완료! 확인 중...</p>';

                // receipt_id만 서버로 전달 — 서버가 lookupSubscribeBillingKey로 billing_key를 확보합니다
                const registerRes = await fetch('/api/billing/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        receipt_id: receiptId,
                        user_id: 'user_123'
                    })
                });

                const registered = await registerRes.json();
                document.getElementById('result').innerHTML = registered.success
                    ? '<p style="color:green;">카드 등록 성공!</p>'
                    : '<p style="color:red;">등록 실패: ' + (registered.message || '') + '</p>';
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

## 2. 서버 — 빌링키 확보 + 자동결제 (Node.js)

```javascript
import express from 'express'
import cron from 'node-cron'
import { Bootpay } from '@bootpay/backend-js'

const app = express()
app.use(express.json())

// ── 서버 초기화 (Basic Auth — getAccessToken 불필요) ──
Bootpay.setConfiguration({
    client_key: process.env.BOOTPAY_CLIENT_KEY,
    secret_key: process.env.BOOTPAY_SECRET_KEY
})

// ── ① 빌링키 등록: 프론트에서 받은 receipt_id로 billing_key 확보 ──
app.post('/api/billing/register', async (req, res) => {
    const { receipt_id, user_id } = req.body

    try {
        const billing = await Bootpay.lookupSubscribeBillingKey(receipt_id)

        await db.query(
            `INSERT INTO billing_keys (user_id, billing_key, card_name, card_last4, status)
             VALUES (?, ?, ?, ?, 'active')`,
            [user_id, billing.billing_key, billing.billing_data.card_company, billing.billing_data.card_no.slice(-4)]
        )

        res.json({ success: true })
    } catch (error) {
        console.error('빌링키 등록 실패:', error)
        res.status(400).json({ success: false, message: error.message })
    }
})

// ── ② 자동결제: billing_key로 즉시 1회 결제 ──
// ⚠️ 자동 재시도·스케줄링은 제공되지 않습니다 — 청구 시점과 재청구는 가맹점이 직접 관리합니다
async function chargeBillingKey(billingKey, orderInfo) {
    const result = await Bootpay.requestSubscribePayment({
        billing_key: billingKey,
        price: orderInfo.price,
        order_name: orderInfo.name,
        order_id: `auto_${Date.now()}`,
        tax_free: 0,
        user: {
            username: orderInfo.userName,
            phone: orderInfo.userPhone,
        }
    })

    console.log('자동결제 결과:', result)
    return result
}

// ── ③ 스케줄러: next_payment_at 도래 건을 매일 조회해 결제 (node-cron) ──
cron.schedule('0 9 * * *', async () => {
    const dueList = await db.query(
        `SELECT * FROM recurring_payments WHERE status = 'active' AND next_payment_at <= NOW()`
    )

    for (const sub of dueList) {
        try {
            const result = await chargeBillingKey(sub.billing_key, {
                name: sub.plan,
                price: sub.amount,
                userName: sub.user_name,
                userPhone: sub.user_phone,
            })

            await db.query(
                `UPDATE recurring_payments SET next_payment_at = ?, receipt_id = ?, retry_count = 0 WHERE id = ?`,
                [getNextMonth(), result.receipt_id, sub.id]
            )
        } catch (error) {
            console.error(`자동결제 실패 (user: ${sub.user_id}):`, error)

            const retryCount = sub.retry_count + 1
            if (retryCount >= 3) {
                // 3회 실패 → 구독 일시정지 + 사용자 알림
                await db.query(`UPDATE recurring_payments SET status = 'paused' WHERE id = ?`, [sub.id])
                await notifyPaymentFailed(sub.user_id, error)
            } else {
                await db.query(`UPDATE recurring_payments SET retry_count = ? WHERE id = ?`, [retryCount, sub.id])
            }
        }
    }
})

// ── ④ 예약결제: 특정 시각에 자동 결제 (빌링키당 최대 10건) ──
async function reservePayment(billingKey, orderInfo, executeAt) {
    const result = await Bootpay.subscribePaymentReserve({
        billing_key: billingKey,
        price: orderInfo.price,
        order_name: orderInfo.name,
        order_id: `reserve_${Date.now()}`,
        reserve_execute_at: executeAt,   // ISO 8601 문자열
    })

    console.log('예약 등록:', result)
    return result
}

// ── 예약 취소 ──
async function cancelReserve(reserveId) {
    return await Bootpay.cancelSubscribeReserve(reserveId)
}

// ── ⑤ 빌링키 해지: 대기 중인 예약을 먼저 취소한 뒤 해지 ──
// destroyBillingKey를 호출해도 대기 중인 예약은 자동으로 취소되지 않습니다
async function revokeBillingKey(billingKey, pendingReserveIds) {
    for (const reserveId of pendingReserveIds) {
        await Bootpay.cancelSubscribeReserve(reserveId)
    }

    const result = await Bootpay.destroyBillingKey(billingKey)
    await db.query(`UPDATE billing_keys SET status = 'revoked' WHERE billing_key = ?`, [billingKey])
    return result
}
```

## DB 설계

```sql
CREATE TABLE billing_keys (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT NOT NULL,
    billing_key VARCHAR(100) NOT NULL,
    card_name   VARCHAR(50),
    card_last4  VARCHAR(4),
    status      VARCHAR(20) DEFAULT 'active',   -- active | revoked
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
);

CREATE TABLE recurring_payments (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    plan            VARCHAR(50) NOT NULL,
    amount          INTEGER NOT NULL,
    next_payment_at DATETIME NOT NULL,
    receipt_id      VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'active',  -- active → paused(실패 3회) → cancelled
    retry_count     INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_next (next_payment_at, status)
);
```

## 정기결제 전체 흐름

```
[프론트엔드]                         [서버]                              [Bootpay]
    │                                 │                                    │
    │  1. requestSubscription()       │                                    │
    │─────────────────────────────────┼───────────────────────────────────→│
    │                                 │                                    │
    │  2. 사용자: 카드 정보 입력       │                                    │
    │  3. done 이벤트 (receipt_id)    │                                    │
    │←────────────────────────────────┼────────────────────────────────────│
    │                                 │                                    │
    │  4. receipt_id를 서버로 전달     │                                    │
    │─────────────────────────────→   │                                    │
    │                                 │  5. lookupSubscribeBillingKey       │
    │                                 │     (receipt_id) → billing_key      │
    │                                 │───────────────────────────────────→│
    │                                 │←───────────────────────────────────│
    │                                 │  6. billing_key 저장 (DB)          │
    │                                 │                                    │
    │                                 │  7. cron: next_payment_at 도래 시   │
    │                                 │     requestSubscribePayment         │
    │                                 │     (billing_key)                   │
    │                                 │───────────────────────────────────→│
    │                                 │  8. 결제 결과                       │
    │                                 │←───────────────────────────────────│
```

## 핵심 포인트

1. **`requestSubscription()` vs `requestPayment()`**: 빌링키 발급은 반드시 `requestSubscription()` 사용. `requestPayment()`는 일반결제용
2. **`method`**: 빌링키 발급 전용 method. Web은 `'카드자동'`, 모바일 SDK는 `'card_rebill'`
3. **`subscription_id`**: 구독을 식별하는 고유 ID (필수). 관리자에서 구독별 결제 내역 조회에 사용
4. **`billing_key`는 프론트로 오지 않음**: `done` 이벤트에는 `receipt_id`만 포함됨 → 서버가 `lookupSubscribeBillingKey(receipt_id)`로 확보해 DB에 암호화 저장
5. **`price: 0` vs `price > 0`**: 0이면 빌링키만 발급(첫 결제 없음), 0보다 크면 즉시 첫 결제까지 진행
6. **자동결제는 1회성**: `requestSubscribePayment()`는 호출 시점에 즉시 1회 결제만 수행. 자동 재시도·스케줄링은 없으며 청구 주기는 가맹점이 cron 등으로 직접 구현
7. **예약결제 10건 제한**: `subscribePaymentReserve()`로 특정 시각에 자동 결제를 예약할 수 있으나 빌링키당 최대 10건
8. **빌링키 해지 순서**: 대기 중인 예약을 `cancelSubscribeReserve()`로 먼저 취소한 뒤 `destroyBillingKey()` 호출 (예약은 자동 취소되지 않음)
