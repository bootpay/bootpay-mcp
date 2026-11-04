# 서버 — 결제 취소/환불 (Node.js)

결제 취소(전액/부분)와 가상계좌 환불을 처리하는 예제입니다.

## 설치

```bash
npm install @bootpay/backend-js
```

## 환경 변수

```bash
# .env
BOOTPAY_CLIENT_KEY=          # Client Key (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
BOOTPAY_SECRET_KEY=          # Secret Key (create_keychain으로 발급 — AI 임의 생성 금지)
```

## 1. 전액 취소

```javascript
import { Bootpay } from '@bootpay/backend-js'

Bootpay.setConfiguration({
    client_key: process.env.BOOTPAY_CLIENT_KEY,
    secret_key: process.env.BOOTPAY_SECRET_KEY
})
// Basic Auth — getAccessToken() 불필요

// ── 전액 취소 ──
async function cancelFull(receiptId, reason) {
    const result = await Bootpay.cancelPayment({
        receipt_id: receiptId,
        cancel_username: '관리자',      // 취소 요청자
        cancel_message: reason          // 취소 사유 (관리자 화면에 표시)
    })

    console.log('전액 취소 완료:', {
        receipt_id: result.receipt_id,
        cancelled_price: result.cancelled_price,
        status: result.status_locale    // '결제취소'
    })
    return result
}
```

## 2. 부분 취소

```javascript
// ── 부분 취소 ──
// 5만원 결제에서 2만원만 취소
async function cancelPartial(receiptId, cancelAmount, cancelTaxFree = 0) {
    const result = await Bootpay.cancelPayment({
        receipt_id: receiptId,
        cancel_price: cancelAmount,           // 취소할 금액
        cancel_tax_free: cancelTaxFree,       // 취소할 면세 금액
        cancel_username: '관리자',
        cancel_message: '부분 환불 요청',
        cancel_id: `cancel_${Date.now()}`     // 부분취소 고유 ID (중복 방지)
    })

    console.log('부분 취소 완료:', {
        receipt_id: result.receipt_id,
        original_price: result.price,
        cancelled_price: result.cancelled_price,    // 누적 취소 금액
        remaining: result.price - result.cancelled_price
    })
    return result
}
```

## 3. 가상계좌 환불

가상계좌 결제 취소 시 환불받을 **계좌 정보**가 필요합니다.

```javascript
// ── 가상계좌 환불 ──
async function cancelVbank(receiptId, refundAccount) {
    const result = await Bootpay.cancelPayment({
        receipt_id: receiptId,
        cancel_username: '관리자',
        cancel_message: '가상계좌 환불',
        refund: {
            bank_account: refundAccount.account,    // 환불 계좌번호
            bank_username: refundAccount.name,      // 예금주
            bank_code: refundAccount.bankCode        // 은행 코드 (아래 표 참조)
        }
    })

    console.log('가상계좌 환불 요청:', result)
    return result
}

// 사용 예시
await cancelVbank('receipt_xxx', {
    account: '1234567890',
    name: '홍길동',
    bankCode: '004'   // KB국민은행
})
```

### 주요 은행 코드

| 코드 | 은행 |
|------|------|
| 004 | KB국민은행 |
| 011 | NH농협은행 |
| 020 | 우리은행 |
| 023 | SC제일은행 |
| 027 | 한국씨티은행 |
| 032 | 대구은행 |
| 034 | 광주은행 |
| 039 | 경남은행 |
| 045 | 새마을금고 |
| 071 | 우체국 |
| 081 | 하나은행 |
| 088 | 신한은행 |
| 090 | 카카오뱅크 |
| 092 | 토스뱅크 |

## 4. Express API 전체 예시

```javascript
import express from 'express'
import { Bootpay } from '@bootpay/backend-js'

const app = express()
app.use(express.json())

Bootpay.setConfiguration({
    client_key: process.env.BOOTPAY_CLIENT_KEY,
    secret_key: process.env.BOOTPAY_SECRET_KEY
})
// Basic Auth — getAccessToken() 불필요

app.post('/api/cancel', async (req, res) => {
    const { receipt_id, cancel_price, reason, refund_account } = req.body

    try {
        // 1. 취소 전 결제 상태 확인
        const receipt = await Bootpay.receiptPayment(receipt_id)

        if (receipt.status === 20) {
            return res.status(400).json({ success: false, message: '이미 취소된 결제입니다' })
        }
        if (receipt.status !== 1) {
            return res.status(400).json({ success: false, message: '결제 완료 상태가 아닙니다' })
        }

        // 2. 부분 취소 시 남은 금액 확인
        if (cancel_price) {
            const remaining = receipt.price - receipt.cancelled_price
            if (cancel_price > remaining) {
                return res.status(400).json({
                    success: false,
                    message: `취소 가능 금액(${remaining}원)을 초과했습니다`
                })
            }
        }

        // 3. 취소 요청
        const cancelParams = {
            receipt_id,
            cancel_username: '관리자',
            cancel_message: reason || '고객 요청 취소'
        }

        // 부분 취소
        if (cancel_price) {
            cancelParams.cancel_price = cancel_price
            cancelParams.cancel_id = `cancel_${Date.now()}`
        }

        // 가상계좌 환불 계좌
        if (refund_account) {
            cancelParams.refund = {
                bank_account: refund_account.account,
                bank_username: refund_account.name,
                bank_code: refund_account.bank_code
            }
        }

        const result = await Bootpay.cancelPayment(cancelParams)

        console.log('결제 취소 완료:', {
            receipt_id: result.receipt_id,
            cancelled_price: result.cancelled_price,
            remaining: result.price - result.cancelled_price
        })

        // TODO: DB 주문 상태 업데이트
        // await db.orders.update(receipt_id, { status: 'cancelled' })

        return res.json({
            success: true,
            data: {
                receipt_id: result.receipt_id,
                cancelled_price: result.cancelled_price,
                remaining_price: result.price - result.cancelled_price
            }
        })

    } catch (error) {
        console.error('결제 취소 에러:', error)
        return res.status(500).json({
            success: false,
            message: error.message || '결제 취소 중 오류가 발생했습니다'
        })
    }
})

app.listen(3000)
```

## cancelPayment 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `receipt_id` | string | ✅ | 결제 영수증 ID |
| `cancel_price` | number | | 부분 취소 금액 (생략 시 전액) |
| `cancel_tax_free` | number | | 취소 면세 금액 |
| `cancel_id` | string | | 부분취소 고유 ID (중복 방지) |
| `cancel_username` | string | | 취소 요청자명 |
| `cancel_message` | string | | 취소 사유 |
| `refund` | object | | 가상계좌 환불 계좌 정보 |
| `refund.bank_account` | string | | 환불 계좌번호 |
| `refund.bank_username` | string | | 예금주 |
| `refund.bank_code` | string | | 은행 코드 |

## 핵심 포인트

1. **전액 취소**: `cancel_price` 생략하면 전액 취소
2. **부분 취소**: `cancel_price` + `cancel_id` 설정. 여러 번 부분 취소 가능
3. **가상계좌 환불**: `refund` 객체에 환불 계좌 정보 필수
4. **중복 취소 방지**: `cancel_id`를 지정하면 동일 ID로 중복 요청 시 거부됨
5. **취소 전 상태 확인**: `receiptPayment()`로 먼저 결제 상태를 확인하세요
6. **이미 취소된 결제**: `status === 20`이면 이미 취소됨. `cancelled_price`로 누적 취소 금액 확인
