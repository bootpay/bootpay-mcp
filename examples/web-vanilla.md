# Web — Vanilla JS + CDN

CDN 방식으로 Bootpay 결제를 연동하는 가장 간단한 예제입니다.

## 환경 설정

API 키를 .env에 설정합니다. MCP stdio 모드에서는 `list_keychains(source=core)`로 자동 조회됩니다.

```bash
# .env — list_keychains(source=core) 결과를 여기에 입력
# ⚠️ AI가 임의로 생성한 값(예: 692e4c6da0ba...)은 100% 실패합니다
BOOTPAY_CLIENT_KEY=          # Client Key (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
```

## 전체 코드

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bootpay 결제 예제</title>
    <!-- ⚠️ 반드시 최신 v2 SDK를 사용하세요 (5.x). 3.x/4.x는 deprecated -->
    <script src="https://js.bootpay.co.kr/bootpay-5.3.0.min.js"></script>
</head>
<body>
    <h1>Bootpay 결제 테스트</h1>

    <div id="order-info">
        <h3>주문 상품</h3>
        <ul>
            <li>프리미엄 무선 이어폰 — ₩89,000</li>
            <li>스마트 텀블러 500ml — ₩35,000</li>
        </ul>
        <p><strong>합계: ₩124,000</strong></p>
    </div>

    <div>
        <label>이름: <input type="text" id="userName" value="홍길동"></label><br>
        <label>전화: <input type="text" id="userPhone" value="01012345678"></label><br>
        <label>이메일: <input type="email" id="userEmail" value="test@example.com"></label><br>
        <label>결제수단:
            <select id="payMethod">
                <option value="card">카드</option>
                <option value="bank">계좌이체</option>
                <option value="phone">휴대폰</option>
                <option value="vbank">가상계좌</option>
            </select>
        </label>
    </div>

    <button onclick="requestPayment()" style="margin-top:16px; padding:12px 24px; font-size:16px;">
        결제하기
    </button>

    <div id="result" style="margin-top:16px;"></div>

    <script>
    async function requestPayment() {
        const method = document.getElementById('payMethod').value;

        try {
            const result = await Bootpay.requestPayment({
                // .env에서 설정한 Client Key (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
                client_key: process.env.BOOTPAY_CLIENT_KEY,
                price: 124000,
                order_name: '프리미엄 무선 이어폰 외 1건',
                order_id: 'order_' + Date.now(),
                pg: 'nicepay',
                method: method,
                tax_free: 0,
                items: [
                    { id: 'earphone-01', name: '프리미엄 무선 이어폰', qty: 1, price: 89000 },
                    { id: 'tumbler-01', name: '스마트 텀블러 500ml', qty: 1, price: 35000 }
                ],
                user: {
                    username: document.getElementById('userName').value,
                    phone: document.getElementById('userPhone').value,
                    email: document.getElementById('userEmail').value
                },
                extra: {
                    card_quota: '0,2,3,4,5,6',
                    open_type: 'iframe',
                    separately_confirmed: true  // 🔴 서버승인(분리승인) — 기본값으로 사용하세요
                }
            });

            // ── 서버승인: confirm 시점에 receipt_id를 서버로 전달만 한다 (프론트에서 승인하지 않음) ──
            if (result.event === 'confirm') {
                const confirmRes = await fetch('/api/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receipt_id: result.receipt_id, order_id: result.order_id })
                });
                const confirmed = await confirmRes.json();
                if (confirmed.success) {
                    // 서버가 금액 검증 후 confirmPayment()로 최종 승인 완료
                    document.getElementById('result').innerHTML =
                        '<p style="color:green;">결제 완료! receipt_id: ' + result.receipt_id + '</p>';
                } else {
                    document.getElementById('result').innerHTML =
                        '<p style="color:red;">서버 승인 실패: ' + (confirmed.message || '') + '</p>';
                }
            }

            // 가상계좌: 발급 시점에는 issued 이벤트 (입금 완료는 웹훅으로 수신)
            if (result.event === 'issued') {
                document.getElementById('result').innerHTML =
                    '<p style="color:green;">가상계좌가 발급되었습니다. 입금 완료 시 웹훅으로 통지됩니다.</p>';
            }
        } catch (e) {
            // ⚠️ 에러 발생 시 반드시 콘솔에 로깅하세요 — 디버깅의 핵심 단서입니다
            console.error('Bootpay 결제 에러:', {
                event: e.event,       // 'error' 또는 'cancel'
                message: e.message,   // 에러 메시지
                data: e.data,         // 상세 에러 데이터
                fullError: e          // 전체 에러 객체
            });

            if (e.event === 'cancel') {
                document.getElementById('result').innerHTML =
                    '<p style="color:orange;">결제 취소</p>';
            } else {
                document.getElementById('result').innerHTML =
                    '<p style="color:red;">결제 실패: ' + (e.message || JSON.stringify(e)) + '</p>';
            }
        }
    }
    </script>
</body>
</html>
```

## 서버 코드 — /api/confirm (필수 한 세트)

서버승인 방식이므로 서버의 승인 API가 반드시 필요합니다. **별도 결제검증(조회)은 불필요** — `confirmPayment()` 리턴값의 price를 DB 주문 금액과 대조하고, 불일치 시 `cancelPayment`로 자동 취소합니다. 전체 코드는 [`server-verify.md`](./server-verify.md) 참조.

## 웹훅 보완 (운영 필수)

confirm 전달은 브라우저 종료·네트워크 단절로 유실될 수 있습니다. 관리자 → 개발자 설정 → 웹훅 설정에 HTTPS URL을 등록하고 수신 엔드포인트를 구현하세요.

- **IP 필터**: 부트페이 발신 IP 대역 `223.130.82.0/24` 만 허용
- **재검증**: payload를 신뢰하지 말고 `receiptPayment(receipt_id)`로 금액·상태 재확인
- **멱등 처리**: 같은 receipt_id 중복 수신 대비
- **즉시 200 응답**: 200 + `{ success: true }`가 아니면 재시도됨 (기본 10회, 관리자 설정)

## 핵심 포인트

1. **서버승인이 기본**: `extra.separately_confirmed: true` + `confirm` 이벤트에서 서버로 전달 → 서버가 `confirmPayment()`. done 이벤트만 처리하는 클라이언트 승인은 유실 위험이 있어 비권장
2. **Client Key**: `.env`의 `BOOTPAY_CLIENT_KEY`에 설정. MCP stdio에서 `create_keychain(targets=["core"])` 또는 `list_keychains(source=core)`로 조회. AI가 임의 생성 금지
3. **CDN 버전**: `bootpay-5.3.0.min.js` — 3.x/4.x는 v1 deprecated
4. **리턴값으로 확인**: 서버승인에서는 별도 결제검증(조회) 불필요. `confirmPayment()` 리턴값의 price를 DB 주문 금액과 대조
5. **PG 설정**: `pg: 'nicepay'`는 기본값. 관리자에서 활성화한 PG를 사용
6. **통합결제창**: 이 예제는 `pg`와 `method`를 지정한 단일 결제창 방식입니다. `pg`와 `method`를 생략하면 관리자에서 활성화한 모든 결제수단이 표시되는 **통합결제창**이 뜹니다 → `unified-payment.md` 참조
