# 서버 — 정기결제 빌링키 관리 (Node.js)

빌링키 자동결제, 예약결제, 조회, 해지 등 서버에서 수행하는 정기결제 전체 API 예제입니다.

> **프론트엔드 빌링키 발급**은 `billing.md` 예제를 참고하세요.
> 이 문서는 발급된 빌링키를 서버에서 사용하는 방법을 다룹니다.

## 설치

```bash
npm install @bootpay/backend-js
```

## 환경 변수

```bash
# .env
BOOTPAY_REST_APP_ID=your_rest_application_id
BOOTPAY_PRIVATE_KEY=your_private_key
```

## 서버 초기화

```javascript
import { Bootpay } from '@bootpay/backend-js'

Bootpay.setConfiguration({
    application_id: process.env.BOOTPAY_REST_APP_ID,
    private_key: process.env.BOOTPAY_PRIVATE_KEY
})
```

## 1. 빌링키로 자동결제

프론트엔드에서 `requestSubscription()`으로 발급받은 `billing_key`를 사용합니다.

```javascript
// ── 빌링키로 즉시 결제 ──
async function chargeWithBillingKey(billingKey, order) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.requestSubscribeCardPayment({
        billing_key: billingKey,
        order_name: order.name,
        order_id: `auto_${Date.now()}`,
        price: order.price,
        tax_free: order.taxFree || 0,
        card_quota: '0',                  // 일시불 (할부: '2','3','4',...)
        items: order.items || [],
        user: {
            username: order.userName,
            phone: order.userPhone,
            email: order.userEmail
        },
        feedback_url: 'https://your-server.com/api/webhook',  // 결제 결과 웹훅
        metadata: {                       // 가맹점 자유 데이터
            user_id: order.userId,
            plan: order.planId
        }
    })

    console.log('자동결제 성공:', {
        receipt_id: result.receipt_id,
        price: result.price,
        status: result.status_locale,
        card: result.card_data?.card_company
    })
    return result
}
```

## 2. 예약결제 (특정 시각에 자동 결제)

Bootpay 서버가 지정한 시각에 자동으로 결제를 실행합니다.

```javascript
// ── 예약결제 등록 ──
async function reservePayment(billingKey, order, executeAt) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.subscribePaymentReserve({
        billing_key: billingKey,
        order_name: order.name,
        order_id: `reserve_${Date.now()}`,
        price: order.price,
        tax_free: order.taxFree || 0,
        reserve_execute_at: executeAt,   // Date 객체 또는 ISO 8601 문자열
        user: {
            username: order.userName,
            phone: order.userPhone
        },
        feedback_url: 'https://your-server.com/api/webhook'
    })

    console.log('예약결제 등록:', {
        reserve_id: result.reserve_id,
        execute_at: result.reserve_execute_at
    })
    return result
}

// 사용 예시: 다음 달 1일 00:00에 결제
const nextMonth = new Date()
nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
nextMonth.setHours(0, 0, 0, 0)

await reservePayment('billing_key_xxx', {
    name: '월간 프리미엄 플랜',
    price: 29000,
    userName: '홍길동',
    userPhone: '01012345678'
}, nextMonth)
```

## 3. 예약결제 조회/취소

```javascript
// ── 예약결제 상태 조회 ──
async function lookupReserve(reserveId) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.subscribePaymentReserveLookup(reserveId)
    console.log('예약결제 상태:', {
        reserve_id: result.reserve_id,
        status: result.status,
        execute_at: result.reserve_execute_at,
        receipt_id: result.receipt_id       // 결제 완료 시 생성
    })
    return result
}

// ── 예약결제 취소 ──
async function cancelReserve(reserveId) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.cancelSubscribeReserve(reserveId)
    console.log('예약결제 취소:', {
        reserve_id: result.reserve_id,
        success: result.success
    })
    return result
}
```

## 4. 빌링키 조회

```javascript
// ── 빌링키 조회 (receipt_id로) ──
async function lookupByReceipt(receiptId) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.lookupSubscribeBillingKey(receiptId)
    console.log('빌링키 정보:', {
        billing_key: result.billing_key,
        card_company: result.billing_data.card_company,
        card_no: result.billing_data.card_no,       // 마스킹된 카드번호
        status: result.status_locale,
        expire_at: result.billing_expire_at
    })
    return result
}

// ── 빌링키 조회 (billing_key로) ──
async function lookupByBillingKey(billingKey) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.lookupBillingKey(billingKey)
    console.log('빌링키 정보:', {
        billing_key: result.billing_key,
        card_company: result.billing_data.card_company,
        card_no: result.billing_data.card_no
    })
    return result
}
```

## 5. 빌링키 해지

구독 해지 시 빌링키를 삭제하여 더 이상 결제가 불가능하게 합니다.

```javascript
// ── 빌링키 해지 ──
async function destroyBillingKey(billingKey) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.destroyBillingKey(billingKey)
    console.log('빌링키 해지 완료:', result.billing_key)
    return result
}
```

## 6. 실전 패턴 — 월간 구독 자동결제

```javascript
// ── 크론잡: 매월 1일 자동결제 ──
async function processMonthlySubscriptions() {
    const subscribers = await db.getActiveSubscribers()
    const results = { success: 0, failed: 0 }

    for (const sub of subscribers) {
        try {
            await Bootpay.getAccessToken()

            const result = await Bootpay.requestSubscribeCardPayment({
                billing_key: sub.billing_key,
                order_name: sub.plan_name,
                order_id: `sub_${sub.user_id}_${Date.now()}`,
                price: sub.price,
                tax_free: 0,
                user: { username: sub.username, phone: sub.phone }
            })

            // 결제 성공 → 구독 갱신
            await db.updateSubscription(sub.id, {
                last_paid_at: new Date(),
                next_payment_at: getNextMonth(),
                receipt_id: result.receipt_id
            })
            results.success++

        } catch (error) {
            console.error(`자동결제 실패 (user: ${sub.user_id}):`, error)

            // 재시도 횟수 확인
            const retryCount = await db.getRetryCount(sub.id)

            if (retryCount < 3) {
                // 3일 후 재시도 예약
                const retryAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                await Bootpay.getAccessToken()
                await Bootpay.subscribePaymentReserve({
                    billing_key: sub.billing_key,
                    order_name: sub.plan_name,
                    order_id: `retry_${sub.user_id}_${Date.now()}`,
                    price: sub.price,
                    tax_free: 0,
                    reserve_execute_at: retryAt
                })
                await db.incrementRetryCount(sub.id)
            } else {
                // 3회 실패 → 구독 일시정지 + 사용자 알림
                await db.pauseSubscription(sub.id)
                await notify.sendPaymentFailed(sub.user_id, {
                    message: '결제 수단을 확인해주세요',
                    retry_count: retryCount
                })
            }
            results.failed++
        }
    }

    console.log('월간 결제 처리 완료:', results)
}
```

## requestSubscribeCardPayment 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `billing_key` | string | ✅ | 빌링키 |
| `order_name` | string | ✅ | 주문명 |
| `order_id` | string | ✅ | 가맹점 주문 ID (중복 불가) |
| `price` | number | ✅ | 결제 금액 |
| `tax_free` | number | | 면세 금액 (기본 0) |
| `card_quota` | string | | 할부 개월 ('0': 일시불) |
| `card_interest` | string | | 무이자 설정 |
| `items` | array | | 상품 목록 |
| `user` | object | | 사용자 정보 |
| `feedback_url` | string | | 결과 웹훅 URL |
| `metadata` | any | | 가맹점 자유 데이터 |

## subscribePaymentReserve 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `billing_key` | string | ✅ | 빌링키 |
| `order_name` | string | ✅ | 주문명 |
| `order_id` | string | ✅ | 가맹점 주문 ID |
| `price` | number | ✅ | 결제 금액 |
| `reserve_execute_at` | Date | ✅ | 결제 실행 시각 |
| `tax_free` | number | | 면세 금액 |
| `user` | object | | 사용자 정보 |
| `feedback_url` | string | | 결과 웹훅 URL |

## 핵심 포인트

1. **토큰 갱신**: `getAccessToken()`은 매 요청 전 호출. 토큰은 만료될 수 있음
2. **order_id 유일성**: 같은 order_id로 중복 결제 불가. 타임스탬프나 UUID 사용
3. **예약결제 vs 즉시결제**: 예약은 Bootpay 서버가 실행, 즉시는 호출 즉시 실행
4. **재시도 로직**: 카드 한도/분실 등으로 실패 가능 → 3회 재시도 후 일시정지 권장
5. **빌링키 해지**: 구독 해지 시 반드시 `destroyBillingKey()` 호출하여 무효화
6. **웹훅 설정**: `feedback_url`을 설정하면 결제 결과를 웹훅으로도 수신 가능
