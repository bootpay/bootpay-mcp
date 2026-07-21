# 서버 — 서버 승인 + 결제 검증 (Node.js)

프론트엔드에서 받은 `receipt_id`로 서버에서 **최종 승인(서버승인)** 하거나 결제를 **검증**하는 예제입니다.

> **서버승인(분리승인)이 기본입니다.** 프론트엔드에서 `extra.separately_confirmed: true`로 결제를 요청하면 결제가 승인대기(status=2) 상태로 멈추고, 서버가 `confirmPayment()`를 호출해야 결제가 확정됩니다. 승인 전에 재고·쿠폰을 확인해 거부할 수 있고, 승인 리턴값으로 금액을 확인합니다 — 별도 결제검증(조회) 단계가 필요 없습니다.

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

## 1. 서버 승인 — /api/confirm (기본)

프론트엔드의 `confirm` 이벤트(또는 redirect 페이지의 `event=confirm`)에서 전달받은 `receipt_id`로 최종 승인합니다.

> **서버승인에서는 별도 결제검증(조회) 단계가 필요 없습니다.** `confirmPayment()` 리턴값에 결제 정보가 담겨 있으므로 리턴값으로 확인합니다.

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

// ── 서버 승인 API (separately_confirmed: true 한 세트) ──
app.post('/api/confirm', async (req, res) => {
    const { receipt_id, order_id } = req.body

    try {
        // 1. (선택) 비즈니스 로직 — 재고 확인, 쿠폰 검증 등. 승인 전이므로 안전하게 거부 가능
        const stockAvailable = await checkStock(order_id)
        if (!stockAvailable) {
            return res.status(400).json({ success: false, message: '재고가 소진되었습니다' })
        }

        // 2. 최종 승인 — 이 시점에 실제 결제가 확정됨
        const confirmed = await Bootpay.confirmPayment(receipt_id)

        // 3. 🔴 리턴값 검증 — 승인 상태·금액을 서버 DB의 주문 금액과 대조
        if (confirmed.status !== 1) {
            return res.status(400).json({ success: false, message: '결제 승인에 실패했습니다: ' + (confirmed.status_locale || confirmed.status) })
        }
        const expectedPrice = await getExpectedPrice(order_id || confirmed.order_id)  // TODO: DB에서 주문 금액 조회
        if (confirmed.price !== expectedPrice) {
            console.error('금액 불일치 — 자동 취소:', { receipt_id, expected: expectedPrice, actual: confirmed.price })
            await Bootpay.cancelPayment({ receipt_id, cancel_message: '금액 불일치 — 자동 취소' })
            return res.status(400).json({ success: false, message: '결제 금액이 주문 금액과 일치하지 않습니다' })
        }

        // 4. 주문 완료 처리
        console.log('서버 승인 완료:', { receipt_id: confirmed.receipt_id, price: confirmed.price })
        // TODO: DB에 주문 상태 업데이트 (paid)
        return res.json({ success: true, data: { receipt_id: confirmed.receipt_id, price: confirmed.price, method: confirmed.method } })

    } catch (error) {
        console.error('서버 승인 에러:', error)
        return res.status(500).json({ success: false, message: '서버 승인 중 오류가 발생했습니다' })
    }
})

// TODO: 실제 구현 시 DB 조회로 교체
async function getExpectedPrice(orderId) {
    // const order = await db.orders.findOne({ order_id: orderId })
    // return order.total_price
    return 124000
}
async function checkStock(orderId) { return true }

app.listen(3000, () => console.log('서버 실행: http://localhost:3000'))
```

## 2. 웹훅 수신 — 유실 보완 (운영 필수)

confirm 이벤트 전달·redirect 이동은 브라우저 종료, 네트워크 단절로 **유실될 수 있습니다.**
결제 상태의 최종 정합성은 웹훅으로 맞추세요. [관리자 → 개발자 설정 → 웹훅 설정](https://admin.bootpay.co.kr/setting/developer?tab=webhook)에 HTTPS URL을 등록합니다.

```javascript
// ── 웹훅 수신 엔드포인트 ──
const BOOTPAY_IP_PREFIX = '223.130.82.'   // 부트페이 발신 IP 대역 223.130.82.0/24

app.post('/webhook/bootpay', async (req, res) => {
    // 1. 🔴 IP 필터 — 부트페이 발신 IP 대역만 허용
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
        .split(',')[0].trim().replace('::ffff:', '')
    if (!ip.startsWith(BOOTPAY_IP_PREFIX)) {
        console.warn('웹훅 차단 — 허용되지 않은 IP:', ip)
        return res.status(403).end()
    }

    // 2. 즉시 응답 — 🔴 HTTP 200 + 본문 { "success": true } 둘 다 충족해야 성공 처리
    //    하나라도 빠지면 실패로 간주하고 재시도합니다 (재시도 횟수는 관리자 웹훅 설정, 기본 10회)
    res.status(200).json({ success: true })

    try {
        const { receipt_id, webhook_type } = req.body

        // 3. 🔴 재검증 — 웹훅 payload를 그대로 신뢰하지 말고 결제 조회 API로 재확인
        const receipt = await Bootpay.receiptPayment(receipt_id)

        // 4. 멱등 처리 — 같은 receipt_id 이벤트가 중복 수신될 수 있음
        //    부분취소는 같은 receipt_id로 여러 번 오므로 cancelled_price(누적 취소금액)까지 키에 포함
        // const already = await db.webhookLogs.findOne({ receipt_id, webhook_type, cancelled_price: receipt.cancelled_price })
        // if (already) return

        // 5. webhook_type(SDK 5.x+) 우선 분기 — 클라이언트 처리 유실 시 여기서 복구됨
        switch (webhook_type) {
            case 'PAYMENT_COMPLETED':               // status 1 — 주문을 paid로 (이미 paid면 skip)
                break
            case 'PAYMENT_CANCELLED':               // status 20 — 전체 취소: 재고 복구, 주문 refunded
                break
            case 'PAYMENT_PARTIAL_CANCELLED':       // status 20 — 부분 취소: receipt.cancelled_price만 환불 처리
                break
            case 'PAYMENT_VIRTUAL_ACCOUNT_ISSUED':  // status 5 — 가상계좌 발급 (입금 대기)
                break
            default:
                // 구버전 SDK: webhook_type 없음 → receipt.status(1/20/5)로 fallback
                // 단, status 20만으로는 전체취소/부분취소를 구분할 수 없음
                break
        }
    } catch (error) {
        console.error('웹훅 처리 에러:', error)  // 이미 응답했으므로 자체 재처리 큐로 보정
    }
})
```

## 3. 결제 검증 — /api/verify (클라이언트 승인 사용 시)

클라이언트 승인(separately_confirmed 미설정, 비권장)으로 이미 승인이 끝난 결제(status=1)를 사후 검증하는 방식입니다.
서버승인 방식에서는 이 단계가 필요 없습니다 — 승인 시점에 이미 검증했기 때문입니다.

```javascript
// ── 결제 검증 API (사후 검증) ──
app.post('/api/verify', async (req, res) => {
    const { receipt_id, order_id, expected_price } = req.body

    try {
        // 1. 결제 내역 조회
        const receipt = await Bootpay.receiptPayment(receipt_id)

        // 2. 결제 상태 확인 (status: 1 = 결제 완료)
        if (receipt.status !== 1) {
            return res.status(400).json({
                success: false,
                message: `결제가 완료되지 않았습니다 (상태: ${receipt.status_locale})`
            })
        }

        // 3. 금액 비교 — 불일치 시 이미 승인된 결제이므로 취소 처리
        if (receipt.price !== expected_price) {
            console.error('금액 불일치:', { receipt_id, expected: expected_price, actual: receipt.price })
            await Bootpay.cancelPayment({ receipt_id, cancel_message: '금액 불일치로 자동 취소' })
            return res.status(400).json({ success: false, message: '결제 금액이 일치하지 않습니다' })
        }

        // 4. 주문 ID 확인 (권장)
        if (order_id && receipt.order_id !== order_id) {
            return res.status(400).json({ success: false, message: '주문 정보가 일치하지 않습니다' })
        }

        // 5. 검증 성공 — 주문 처리
        return res.json({
            success: true,
            data: {
                receipt_id: receipt.receipt_id,
                order_id: receipt.order_id,
                price: receipt.price,
                method: receipt.method,
                receipt_url: receipt.receipt_url
            }
        })
    } catch (error) {
        console.error('결제 검증 에러:', error)
        return res.status(500).json({ success: false, message: '결제 검증 중 오류가 발생했습니다' })
    }
})
```

> 서버승인은 **승인 전에 거부**할 수 있지만, 클라이언트 승인은 이미 결제가 끝난 뒤라 **취소로만 대응**할 수 있습니다. 이것이 서버승인을 기본으로 안내하는 이유입니다.

## 결제 상태(status) 코드

| status | 설명 |
|--------|------|
| 0 | 결제 대기 |
| 1 | **결제 완료** |
| 2 | 결제 승인 대기 (서버승인 대기) |
| 5 | 가상계좌 발급 완료 (입금 대기) |
| 20 | 결제 취소 (전체/부분 — webhook_type으로 구분) |

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
    status: number           // 결제 상태 (1 = 완료, 2 = 승인대기)
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

1. **서버승인이 기본**: 프론트 `extra.separately_confirmed: true` → 서버 `/api/confirm`에서 `confirmPayment()`. 클라이언트 승인 + 사후 검증은 비권장
2. **리턴값으로 확인**: 서버승인에서는 별도 결제검증(조회)이 불필요. `confirmPayment()` 리턴값의 price를 DB 주문 금액과 대조, 불일치 시 `cancelPayment`
3. **웹훅 보완 필수**: 클라이언트 결과 유실 대비. IP 필터(`223.130.82.0/24`) + 재검증 + 멱등 처리
4. **Basic Auth 인증**: client_key/secret_key로 자동 인증. `getAccessToken()` 불필요
5. **에러 로깅**: catch 블록에서 반드시 상세 로깅 (receipt_id, status, error message)
6. **Client Key/Secret Key 사용**: 레거시 Application ID/Private Key 방식이 아님. 혼동 주의
