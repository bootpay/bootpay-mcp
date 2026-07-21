# Web — 통합결제창

통합결제창은 `pg`와 `method`를 지정하지 않고 결제를 요청하면, 관리자에서 활성화한 모든 PG사와 결제수단이 하나의 창에 표시되어 사용자가 직접 선택할 수 있는 결제 UI입니다.

> **단일 결제창과 차이**: `pg`와 `method`를 지정하면 해당 PG/결제수단으로 바로 이동하지만, 생략하면 관리자에서 설정한 여러 PG와 결제수단 중 사용자가 선택할 수 있는 통합결제창이 뜹니다.

## 언제 통합결제창을 사용하나요?

| 시나리오 | pg/method 지정 | 결과 |
|----------|:--------------:|------|
| PG 1개 + 결제수단 1개만 활성화 | 생략 가능 | 해당 PG/결제수단으로 바로 이동 |
| PG 1개 + 결제수단 여러 개 활성화 | **생략** | 통합결제창에서 결제수단 선택 |
| PG 여러 개 + 결제수단 여러 개 활성화 | **생략** | 통합결제창에서 PG+결제수단 선택 |
| 특정 결제수단만 노출하고 싶을 때 | **지정** | 해당 PG/결제수단으로 바로 이동 |

## 관리자 설정 (필수 선행 조건)

통합결제창을 사용하려면 관리자에서 **2개 이상의 결제수단을 활성화**해야 합니다.

```
# MCP Admin 도구로 설정하는 경우
activate_payment_method(pg_alias="nicepay", method_alias="card", status=1)
activate_payment_method(pg_alias="nicepay", method_alias="bank", status=1)
activate_payment_method(pg_alias="nicepay", method_alias="phone", status=1)
activate_payment_method(pg_alias="nicepay", method_alias="vbank", status=1)

# 결과: 통합결제창에서 카드, 계좌이체, 휴대폰, 가상계좌 중 선택 가능
```

## 전체 코드 — React (통합결제창)

```tsx
import { useState } from 'react'
import Bootpay from '@bootpay/client-js'

const items = [
  { id: 'earphone-01', name: '프리미엄 무선 이어폰', qty: 1, price: 89000 },
  { id: 'tumbler-01', name: '스마트 텀블러 500ml', qty: 1, price: 35000 },
]
const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0)

export default function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: string; message: string } | null>(null)

  const handlePayment = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await Bootpay.requestPayment({
        client_key: import.meta.env.VITE_BOOTPAY_CLIENT_KEY,
        price: totalPrice,
        order_name: `${items[0].name} 외 ${items.length - 1}건`,
        order_id: `order_${Date.now()}`,
        // ✅ pg와 method를 생략하면 통합결제창이 뜹니다
        // 관리자에서 활성화한 모든 PG사와 결제수단이 표시됩니다
        tax_free: 0,
        items,
        user: {
          username: '홍길동',
          phone: '01012345678',
          email: 'test@example.com',
        },
        extra: {
          card_quota: '0,2,3,4,5,6',
          open_type: 'iframe',
          separately_confirmed: true, // 🔴 서버승인(분리승인) — 기본값으로 사용하세요
        },
      })

      // ── 서버승인: confirm 시점에 receipt_id를 서버로 전달만 한다 ──
      if (res.event === 'confirm') {
        const confirmRes = await fetch('/api/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt_id: res.receipt_id, order_id: res.order_id }),
        })
        const confirmed = await confirmRes.json()
        if (confirmed.success) {
          setResult({ type: 'success', message: `결제 완료! receipt_id: ${res.receipt_id}` })
        } else {
          setResult({ type: 'error', message: confirmed.message || '서버 승인에 실패했습니다.' })
        }
      }

      // 가상계좌 선택 시: 발급 시점에는 issued 이벤트 (입금 완료는 웹훅으로 수신)
      if (res.event === 'issued') {
        setResult({ type: 'success', message: '가상계좌가 발급되었습니다. 입금 완료 시 웹훅으로 통지됩니다.' })
      }
    } catch (e: any) {
      console.error('Bootpay 결제 에러:', e)
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
      <h1>Bootpay 통합결제창 테스트</h1>

      <h3>주문 상품</h3>
      {items.map((item) => (
        <div key={item.id}>
          {item.name} — ₩{item.price.toLocaleString()} × {item.qty}
        </div>
      ))}
      <p><strong>합계: ₩{totalPrice.toLocaleString()}</strong></p>

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

## 전체 코드 — Vanilla JS (통합결제창)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bootpay 통합결제창</title>
    <script src="https://js.bootpay.co.kr/bootpay-5.3.0.min.js"></script>
</head>
<body>
    <h1>통합결제창 테스트</h1>
    <p>합계: ₩124,000</p>
    <button onclick="requestPayment()">결제하기</button>
    <div id="result"></div>

    <script>
    async function requestPayment() {
        try {
            const result = await Bootpay.requestPayment({
                client_key: 'YOUR_CLIENT_KEY', // .env에서 설정
                price: 124000,
                order_name: '프리미엄 무선 이어폰 외 1건',
                order_id: 'order_' + Date.now(),
                // ✅ pg, method 생략 → 통합결제창
                // 관리자에서 활성화한 PG와 결제수단이 모두 표시됩니다
                tax_free: 0,
                items: [
                    { id: 'earphone-01', name: '프리미엄 무선 이어폰', qty: 1, price: 89000 },
                    { id: 'tumbler-01', name: '스마트 텀블러 500ml', qty: 1, price: 35000 }
                ],
                user: {
                    username: '홍길동',
                    phone: '01012345678',
                    email: 'test@example.com'
                },
                extra: {
                    card_quota: '0,2,3,4,5,6',
                    open_type: 'iframe',
                    separately_confirmed: true  // 🔴 서버승인(분리승인) — 기본값으로 사용하세요
                }
            });

            // ── 서버승인: confirm 시점에 receipt_id를 서버로 전달만 한다 ──
            if (result.event === 'confirm') {
                const confirmRes = await fetch('/api/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receipt_id: result.receipt_id, order_id: result.order_id })
                });
                const confirmed = await confirmRes.json();
                document.getElementById('result').innerHTML = confirmed.success
                    ? '<p style="color:green;">결제 완료! receipt_id: ' + result.receipt_id + '</p>'
                    : '<p style="color:red;">서버 승인 실패: ' + (confirmed.message || '') + '</p>';
            }
        } catch (e) {
            console.error('Bootpay 결제 에러:', e);
            document.getElementById('result').innerHTML =
                '<p style="color:red;">' + (e.event === 'cancel' ? '결제 취소' : '결제 실패: ' + e.message) + '</p>';
        }
    }
    </script>
</body>
</html>
```

## 통합결제창 vs 단일 결제창 비교

```javascript
// ── 통합결제창: pg, method 생략 ──
await Bootpay.requestPayment({
  client_key: 'YOUR_CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_123',
  // pg, method 없음 → 관리자 설정에 따라 통합결제창 표시
})

// ── 단일 결제창: pg, method 지정 ──
await Bootpay.requestPayment({
  client_key: 'YOUR_CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_123',
  pg: 'nicepay',       // 특정 PG 지정
  method: 'card',      // 특정 결제수단 지정
})
```

## 위젯에서 통합결제창

결제위젯(`BootpayWidget`)은 기본적으로 통합결제창 방식으로 동작합니다. `pg`를 지정하되 `method`를 생략하면 해당 PG의 모든 결제수단이 위젯 내에 표시됩니다.

```javascript
BootpayWidget.render('#bootpay-widget', {
  client_key: 'YOUR_CLIENT_KEY',
  price: 50000,
  order_name: '상품명',
  order_id: 'order_' + Date.now(),
  // pg를 지정하되 method를 생략하면 위젯 안에서 결제수단 선택
  pg: 'nicepay',
  use_terms: true,
  // ... hooks
})
```

## 핵심 포인트

1. **pg/method 생략 = 통합결제창**: 관리자에서 활성화한 모든 PG와 결제수단이 하나의 창에 표시됩니다
2. **서버승인이 기본**: 통합결제창에서도 `extra.separately_confirmed: true` + confirm 이벤트 → 서버 `confirmPayment()` 흐름은 동일합니다 (`server-verify.md` 참조)
3. **관리자 설정이 핵심**: 통합결제창에 표시될 결제수단은 관리자(`admin.bootpay.ai`) 또는 MCP `activate_payment_method`로 설정합니다
4. **코드 변경 최소화**: 기존 결제 코드에서 `pg`와 `method` 파라미터만 제거하면 통합결제창으로 전환됩니다
5. **결제수단 1개만 활성화된 경우**: 통합결제창 없이 바로 해당 결제수단으로 이동합니다
6. **웹훅 보완**: 클라이언트 결과 유실 대비 웹훅 수신 엔드포인트 필수 (부트페이 IP `223.130.82.0/24` 필터 + 재검증)
