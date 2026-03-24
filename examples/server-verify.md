# 서버 — 결제 검증 (Node.js)

결제 완료 후 프론트엔드에서 받은 `receipt_id`로 서버에서 결제를 검증하는 예제입니다.

> **왜 서버 검증이 필수인가?** 프론트엔드에서 결제 금액을 조작할 수 있기 때문에, 서버에서 실제 결제된 금액과 주문 금액이 일치하는지 반드시 확인해야 합니다.

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

> Client Key/Secret Key는 `create_keychain(targets=["core"])` 또는 [관리자 → 개발자 설정 → API 연동키](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment)에서 확인하세요.

## 1. 결제 검증 (Express 예시)

```javascript
import express from 'express'
import { Bootpay } from '@bootpay/backend-js'

const app = express()
app.use(express.json())

// ── 서버 SDK 초기화 (Basic Auth — getAccessToken 불필요) ──
Bootpay.setConfiguration({
    client_key: process.env.BOOTPAY_CLIENT_KEY,
    secret_key: process.env.BOOTPAY_SECRET_KEY
})

// ── 결제 검증 API ──
app.post('/api/verify', async (req, res) => {
    const { receipt_id, order_id, expected_price } = req.body

    try {
        // 1. 결제 내역 조회 (Basic Auth — 별도 토큰 발급 불필요)
        const receipt = await Bootpay.receiptPayment(receipt_id)

        // 2. 결제 상태 확인 (status: 1 = 결제 완료)
        if (receipt.status !== 1) {
            console.error('결제 미완료:', { receipt_id, status: receipt.status, status_locale: receipt.status_locale })
            return res.status(400).json({
                success: false,
                message: `결제가 완료되지 않았습니다 (상태: ${receipt.status_locale})`
            })
        }

        // 3. 금액 비교 — 핵심! 프론트엔드 조작 방지
        if (receipt.price !== expected_price) {
            console.error('금액 불일치:', { receipt_id, expected: expected_price, actual: receipt.price })

            // 금액 불일치 시 자동 취소 (선택)
            await Bootpay.cancelPayment({
                receipt_id,
                cancel_message: '금액 불일치로 자동 취소'
            })

            return res.status(400).json({
                success: false,
                message: '결제 금액이 일치하지 않습니다'
            })
        }

        // 4. 주문 ID 확인 (선택이지만 권장)
        if (order_id && receipt.order_id !== order_id) {
            console.error('주문 ID 불일치:', { expected: order_id, actual: receipt.order_id })
            return res.status(400).json({
                success: false,
                message: '주문 정보가 일치하지 않습니다'
            })
        }

        // 5. 검증 성공 — 주문 처리
        console.log('결제 검증 성공:', {
            receipt_id: receipt.receipt_id,
            order_id: receipt.order_id,
            price: receipt.price,
            method: receipt.method,       // card, bank, vbank, phone
            pg: receipt.pg,               // nicepay, tosspayments, ...
            purchased_at: receipt.purchased_at
        })

        // TODO: DB에 주문 저장, 상품 재고 차감 등
        // await db.orders.create({ receipt_id, ... })

        return res.json({
            success: true,
            message: '결제가 확인되었습니다',
            data: {
                receipt_id: receipt.receipt_id,
                order_id: receipt.order_id,
                price: receipt.price,
                method: receipt.method,
                receipt_url: receipt.receipt_url  // 영수증 URL
            }
        })

    } catch (error) {
        console.error('결제 검증 에러:', error)
        return res.status(500).json({
            success: false,
            message: '결제 검증 중 오류가 발생했습니다'
        })
    }
})

app.listen(3000, () => console.log('서버 실행: http://localhost:3000'))
```

## 2. 승인형 결제 — 서버 최종 승인

승인형 결제는 프론트엔드에서 결제 후 서버에서 **최종 승인**을 해야 결제가 확정됩니다.
재고 확인, 쿠폰 검증 등 서버 로직이 필요한 경우 사용합니다.

```javascript
// ── 승인형 결제: 서버 최종 승인 API ──
app.post('/api/confirm', async (req, res) => {
    const { receipt_id } = req.body

    try {
        // 1. 결제 내역 조회
        const receipt = await Bootpay.receiptPayment(receipt_id)

        // 2. 서버 비즈니스 로직 (재고 확인, 쿠폰 검증 등)
        const stockAvailable = await checkStock(receipt.order_id)
        if (!stockAvailable) {
            // 재고 없으면 결제 취소
            await Bootpay.cancelPayment({
                receipt_id,
                cancel_message: '재고 소진'
            })
            return res.status(400).json({ success: false, message: '재고가 소진되었습니다' })
        }

        // 3. 최종 승인 — 이 시점에 실제 결제가 확정됨
        const confirmed = await Bootpay.confirmPayment(receipt_id)
        console.log('결제 승인 완료:', confirmed.receipt_id)

        return res.json({ success: true, data: confirmed })

    } catch (error) {
        console.error('결제 승인 에러:', error)
        return res.status(500).json({ success: false, message: '결제 승인 실패' })
    }
})
```

> **승인형 결제를 사용하려면** 프론트엔드에서 `extra.separately_confirmed: true`를 설정해야 합니다.

## 결제 상태(status) 코드

| status | 설명 |
|--------|------|
| 0 | 결제 대기 |
| 1 | **결제 완료** |
| 2 | 결제 승인 대기 (승인형) |
| 20 | 결제 취소 |

## 결제 조회 응답 주요 필드

```typescript
{
    receipt_id: string       // Bootpay 영수증 ID
    order_id: string         // 가맹점 주문 ID
    price: number            // 결제 금액
    tax_free: number         // 면세 금액
    cancelled_price: number  // 취소된 금액
    order_name: string       // 주문명
    pg: string               // PG사 (nicepay, tosspayments, ...)
    method: string           // 결제수단 (card, bank, vbank, phone)
    status: number           // 결제 상태 (1 = 완료)
    status_locale: string    // 상태 한글명
    purchased_at: Date       // 결제 완료 시각
    receipt_url: string      // 매출전표 URL
    sandbox: boolean         // 테스트 결제 여부
    card_data?: {            // 카드 결제 시
        card_company: string // 카드사명
        card_no: string      // 마스킹된 카드번호
        card_approve_no: string // 승인번호
        card_quota: string   // 할부 개월 (0: 일시불)
    }
}
```

## 핵심 포인트

1. **Basic Auth 인증**: client_key/secret_key로 자동 인증. `getAccessToken()` 불필요
2. **금액 비교 필수**: `receipt.price === expected_price` — 클라이언트 조작 방지
3. **status 확인**: `status === 1`이 결제 완료. 2는 승인 대기
4. **에러 로깅**: catch 블록에서 반드시 상세 로깅 (receipt_id, status, error message)
5. **Client Key/Secret Key 사용**: 프론트엔드용 Application ID와 다름. 혼동 주의
