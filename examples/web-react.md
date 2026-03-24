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
VITE_BOOTPAY_APP_ID=         # Application ID (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
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
        // ⚠️ .env에서 설정한 Application ID (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
        application_id: import.meta.env.VITE_BOOTPAY_APP_ID, // .env에 설정
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
        },
      })

      if (res.event === 'done') {
        setResult({
          type: 'success',
          message: `결제 성공! receipt_id: ${res.data.receipt_id}`,
        })

        // TODO: 서버로 receipt_id를 전달하여 결제 검증
        // await fetch('/api/verify', {
        //   method: 'POST',
        //   body: JSON.stringify({ receipt_id: res.data.receipt_id }),
        // })
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

## 핵심 포인트

1. **Application ID**: `.env`의 `VITE_BOOTPAY_APP_ID`에 설정. MCP stdio에서 `create_keychain(targets=["core"])` 또는 `list_keychains(source=core)`로 조회. AI가 임의 생성 금지
2. **NPM 패키지**: `@bootpay/client-js` (구 `bootpay-js`가 아님)
3. **async/await**: v2(5.x)는 Promise 기반. try/catch로 에러 처리
4. **서버 검증 필수**: `receipt_id`를 서버로 전달하여 금액 검증
