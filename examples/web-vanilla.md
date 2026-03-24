# Web — Vanilla JS + CDN

CDN 방식으로 Bootpay 결제를 연동하는 가장 간단한 예제입니다.

## 환경 설정

API 키를 .env에 설정합니다. MCP stdio 모드에서는 `list_keychains(source=core)`로 자동 조회됩니다.

```bash
# .env — list_keychains(source=core) 결과를 여기에 입력
# ⚠️ AI가 임의로 생성한 값(예: 692e4c6da0ba...)은 100% 실패합니다
BOOTPAY_APP_ID=              # Application ID (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
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
                // .env에서 설정한 Application ID (create_keychain 또는 list_keychains로 조회 — AI 임의 생성 금지)
                application_id: process.env.BOOTPAY_APP_ID,
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
                    open_type: 'iframe'
                }
            });

            if (result.event === 'done') {
                document.getElementById('result').innerHTML =
                    '<p style="color:green;">결제 성공! receipt_id: ' + result.data.receipt_id + '</p>';

                // TODO: 서버로 receipt_id를 전달하여 결제 검증
                // const verify = await fetch('/api/verify', {
                //     method: 'POST',
                //     body: JSON.stringify({ receipt_id: result.data.receipt_id })
                // });
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

## 핵심 포인트

1. **Application ID**: `.env`의 `BOOTPAY_APP_ID`에 설정. MCP stdio에서 `create_keychain(targets=["core"])` 또는 `list_keychains(source=core)`로 조회. AI가 임의 생성 금지
2. **CDN 버전**: `bootpay-5.3.0.min.js` — 3.x/4.x는 v1 deprecated
3. **서버 검증 필수**: 결제 성공 후 `receipt_id`를 서버로 전달하여 금액 검증을 반드시 수행
4. **PG 설정**: `pg: 'nicepay'`는 기본값. 관리자에서 활성화한 PG를 사용
