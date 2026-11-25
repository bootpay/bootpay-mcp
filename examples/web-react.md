# Web — React + NPM

React 프로젝트에서 `@bootpay/client-js` NPM 패키지로 결제를 연동하는 예제입니다.

## 설치

```bash
npm install @bootpay/client-js
```

## 환경 설정

```bash
# .env — list_keychains(source=core) 결과를 여기에 입력
# ⚠️ AI가 임의로 생성한 값(예: 692e4c6da0ba...)은 100% 실패합니다
VITE_BOOTPAY_CLIENT_KEY=     # Client Key (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
```

## 전체 코드 (App.tsx)

```tsx
import { useState } from 'react'
import Bootpay from '@bootpay/client-js'

const items = [
  { id: 'earphone-01', name: '프리미엄 무선 이어폰', qty: 1, price: 89000 },
  { id: 'tumbler-01', name: '스마트 텀블러 500ml', qty: 1, price: 35000 },
]
const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0)

type PayResult = { type: 'success' | 'cancel' | 'error'; message: string }

export default function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PayResult | null>(null)
  const [method, setMethod] = useState('card')
  const [form, setForm] = useState({ name: '홍길동', phone: '01012345678', email: 'test@example.com' })

  const handlePayment = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await Bootpay.requestPayment({
        // ⚠️ .env에서 설정한 Client Key (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
        client_key: import.meta.env.VITE_BOOTPAY_CLIENT_KEY, // .env에 설정
        price: totalPrice,
        order_name: `${items[0].name} 외 ${items.length - 1}건`,
        order_id: `order_${Date.now()}`,
        pg: 'nicepay',
        method,
        tax_free: 0,
        items,
        user: {
          username: form.name,
          phone: form.phone,
          email: form.email,
        },
        extra: {
          card_quota: '0,2,3,4,5,6',
          open_type: 'iframe',
          separately_confirmed: true, // 🔴 서버승인(분리승인) — 기본값으로 사용하세요
        },
      })

      // ── 서버승인: confirm 시점에 receipt_id를 서버로 전달만 한다 (프론트에서 승인하지 않음) ──
      if (res.event === 'confirm') {
        const confirmRes = await fetch('/api/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt_id: res.receipt_id, order_id: res.order_id }),
        })
        const confirmed = await confirmRes.json()
        if (confirmed.success) {
          // 서버가 금액 검증 후 confirmPayment()로 최종 승인 완료
          setResult({ type: 'success', message: `결제 완료! receipt_id: ${res.receipt_id}` })
        } else {
          setResult({ type: 'error', message: confirmed.message || '서버 승인에 실패했습니다.' })
        }
      }

      // 가상계좌: 발급 시점에는 issued 이벤트 (입금 완료는 웹훅으로 수신)
      if (res.event === 'issued') {
        setResult({ type: 'success', message: '가상계좌가 발급되었습니다. 입금 완료 시 웹훅으로 통지됩니다.' })
      }
    } catch (e: any) {
      // ⚠️ 에러 발생 시 반드시 콘솔에 로깅하세요 — 디버깅의 핵심 단서입니다
      console.error('Bootpay 결제 에러:', {
        event: e.event,       // 'error' 또는 'cancel'
        message: e.message,   // 에러 메시지
        data: e.data,         // 상세 에러 데이터
        fullError: e          // 전체 에러 객체
      })

      if (e.event === 'cancel') {
        setResult({ type: 'cancel', message: '결제가 취소되었습니다.' })
      } else {
        setResult({ type: 'error', message: e.message || '결제 중 오류 발생' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Bootpay 결제 테스트</h1>

      <h3>주문 상품</h3>
      {items.map((item) => (
        <div key={item.id}>
          {item.name} — ₩{item.price.toLocaleString()} × {item.qty}
        </div>
      ))}
      <p><strong>합계: ₩{totalPrice.toLocaleString()}</strong></p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름" />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="전화번호" />
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="이메일" />
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="card">카드</option>
          <option value="bank">계좌이체</option>
          <option value="phone">휴대폰</option>
          <option value="vbank">가상계좌</option>
        </select>
      </div>

      <button onClick={handlePayment} disabled={loading} style={{ marginTop: 16, padding: '12px 24px', fontSize: 16 }}>
        {loading ? '결제 중...' : '결제하기'}
      </button>

      {result && (
        <p style={{ color: result.type === 'success' ? 'green' : result.type === 'cancel' ? 'orange' : 'red' }}>
          {result.message}
        </p>
      )}
    </div>
  )
}
```

## package.json

```json
{
  "name": "bootpay-react-example",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@bootpay/client-js": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

## 서버 코드 — /api/confirm (필수 한 세트)

서버승인 방식이므로 서버의 승인 API가 반드시 필요합니다. **별도 결제검증(조회)은 불필요** — `confirmPayment()` 리턴값으로 확인합니다. 전체 코드는 [`server-verify.md`](./server-verify.md) 참조.

```javascript
// server/index.js — 핵심만
Bootpay.setConfiguration({ client_key: process.env.BOOTPAY_CLIENT_KEY, secret_key: process.env.BOOTPAY_SECRET_KEY })

app.post('/api/confirm', async (req, res) => {
  const { receipt_id, order_id } = req.body
  // 1. (선택) 재고·쿠폰 등 비즈니스 로직 — 승인 전이므로 안전하게 거부 가능
  const confirmed = await Bootpay.confirmPayment(receipt_id)        // 2. 최종 승인 (status 2 → 1)
  const expected = await getOrderPrice(order_id)                    // 3. DB의 주문 금액
  if (confirmed.status !== 1 || confirmed.price !== expected) {     // 4. 리턴값 검증 (status + 금액)
    if (confirmed.status === 1) await Bootpay.cancelPayment({ receipt_id, cancel_message: '금액 불일치 자동 취소' })
    return res.status(400).json({ success: false, message: '결제 승인 검증 실패' })
  }
  return res.json({ success: true, data: confirmed })
})
```

## 웹훅 보완 (운영 필수)

confirm 전달은 브라우저 종료·네트워크 단절로 **유실될 수 있습니다.** 관리자 → 개발자 설정 → 웹훅 설정에 URL을 등록하고 수신 엔드포인트를 구현하세요.

```javascript
const BOOTPAY_IP_PREFIX = '223.130.82.'   // 부트페이 발신 IP 대역 223.130.82.0/24
app.post('/webhook/bootpay', async (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().replace('::ffff:', '')
  if (!ip.startsWith(BOOTPAY_IP_PREFIX)) return res.status(403).end()  // IP 필터
  res.status(200).json({ success: true })                              // 🔴 200 + success:true 둘 다 필수 (아니면 재시도)
  const receipt = await Bootpay.receiptPayment(req.body.receipt_id)    // payload 신뢰 금지 — 재검증
  // req.body.webhook_type 우선 분기(SDK 5.x+): PAYMENT_COMPLETED / PAYMENT_CANCELLED /
  // PAYMENT_PARTIAL_CANCELLED / PAYMENT_VIRTUAL_ACCOUNT_ISSUED — receipt_id 기준 멱등 처리
})
```

## 핵심 포인트

1. **서버승인이 기본**: `extra.separately_confirmed: true` + `confirm` 이벤트에서 서버로 전달 → 서버가 `confirmPayment()`. done 이벤트만 처리하는 클라이언트 승인은 유실 위험이 있어 비권장
2. **Client Key**: `.env`의 `VITE_BOOTPAY_CLIENT_KEY`에 설정. MCP stdio에서 `create_keychain(targets=["core"])` 또는 `list_keychains(source=core)`로 조회. AI가 임의 생성 금지
3. **NPM 패키지**: `@bootpay/client-js` (구 `bootpay-js`가 아님)
4. **리턴값으로 확인**: 서버승인에서는 별도 결제검증(조회) 불필요. `confirmPayment()` 리턴값의 price를 DB 주문 금액과 대조, 불일치 시 `cancelPayment`
5. **웹훅 보완**: 클라이언트 결과 유실 대비. 부트페이 IP(`223.130.82.0/24`) 필터 + 재검증 + 멱등 처리
6. **통합결제창**: 이 예제는 `pg: 'nicepay'`, `method`를 지정한 단일 결제창 방식입니다. `pg`와 `method`를 생략하면 관리자에서 활성화한 모든 결제수단이 표시되는 **통합결제창**이 뜹니다 → `unified-payment.md` 참조
