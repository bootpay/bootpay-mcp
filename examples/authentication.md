# 본인인증 (인증창 + 서버 조회·저장)

본인인증은 3단계로 구성됩니다:
1. **프론트엔드**: 인증창 요청 (`requestAuthentication`) → `done` 이벤트에서 `receipt_id` 수신
2. **서버**: `receipt_id`로 인증 결과 조회 (`certificate`) → `status`가 `12`(본인인증완료)인지 확인
3. **서버**: `authenticate_data`에서 필요한 값만 저장 — 동일인 식별·중복가입 방지는 `unique`(DI)로 처리

> ⚠️ **이름·생년월일·전화번호 등 인증 정보는 프론트엔드로 전달되지 않습니다.** 보안상 `done` 이벤트에는 `receipt_id`만 포함되며, 서버가 이 값으로 `certificate(receipt_id)`를 호출해 인증 정보를 확보합니다.

> **사전 준비**: 본인인증은 **다날** 본인인증 상품 계약·활성화가 필요합니다. 관리자 → PG 설정에서 다날 본인인증이 켜져 있는지 먼저 확인하세요.

## 1. 프론트엔드 — 본인인증 요청 (Web)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>본인인증</title>
    <!-- ⚠️ 반드시 최신 v2 SDK를 사용하세요 (5.x). 3.x/4.x는 deprecated -->
    <script src="https://js.bootpay.co.kr/bootpay-5.3.0.min.js"></script>
</head>
<body>
    <h1>본인인증</h1>

    <div>
        <label>이름: <input type="text" id="userName" value="홍길동"></label><br>
        <label>전화: <input type="text" id="userPhone" value="01012345678"></label>
    </div>

    <button onclick="requestAuth()" style="margin-top:16px; padding:12px 24px; font-size:16px;">
        본인인증 시작
    </button>

    <div id="result" style="margin-top:16px;"></div>

    <script>
    async function requestAuth() {
        try {
            const result = await Bootpay.requestAuthentication({
                client_key: 'YOUR_CLIENT_KEY', // list_keychains(source=core) 또는 create_keychain으로 조회한 값
                // ⚠️ create_keychain 또는 list_keychains로 조회한 실제 값만 사용
                // AI가 임의 생성한 값(예: 692e4c6da0ba...)은 100% 실패합니다
                pg: 'danal',                    // 본인인증 전용 PG (모바일 SDK: '다날')
                method: 'auth',                 // 본인인증 전용 method (모바일 SDK: '본인인증')
                authentication_id: 'auth_' + Date.now(), // 결제의 order_id 격. 실제로는 서버에서 생성한 고유값 사용 권장
                order_name: '본인인증',
                user: {
                    username: document.getElementById('userName').value,
                    phone: document.getElementById('userPhone').value
                }
            });

            if (result.event === 'done') {
                const receiptId = result.data.receipt_id;

                // ⚠️ 핵심: 이름·생년월일·전화번호 등 인증 정보는 보안상 프론트엔드로 전달되지 않습니다
                // done 이벤트에는 receipt_id만 포함되며, 서버가 이 값으로 인증 정보를 조회합니다
                console.log('본인인증 완료, 서버 확인 요청:', { receipt_id: receiptId });

                document.getElementById('result').innerHTML =
                    '<p style="color:green;">인증 완료! 확인 중...</p>';

                // receipt_id만 서버로 전달 — 서버가 certificate(receipt_id)로 인증 정보를 조회합니다
                const certRes = await fetch('/api/auth/certificate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receipt_id: receiptId })
                });

                const certified = await certRes.json();
                document.getElementById('result').innerHTML = certified.verified
                    ? '<p style="color:green;">본인인증 성공!</p>'
                    : '<p style="color:red;">인증 실패: ' + (certified.message || '') + '</p>';
            }
        } catch (e) {
            // ⚠️ 에러 발생 시 반드시 콘솔에 로깅하세요 — 디버깅의 핵심 단서입니다
            console.error('Bootpay 본인인증 에러:', {
                event: e.event,       // 'error' 또는 'cancel'
                message: e.message,   // 에러 메시지
                data: e.data,         // 상세 에러 데이터
                fullError: e          // 전체 에러 객체
            });

            if (e.event === 'cancel') {
                document.getElementById('result').innerHTML =
                    '<p style="color:orange;">본인인증 취소</p>';
            } else {
                document.getElementById('result').innerHTML =
                    '<p style="color:red;">본인인증 실패: ' + (e.message || JSON.stringify(e)) + '</p>';
            }
        }
    }
    </script>
</body>
</html>
```

## 2. 서버 — 인증 결과 조회·검증·저장 (Node.js)

```javascript
import express from 'express'
import { Bootpay } from '@bootpay/backend-js'

const app = express()
app.use(express.json())

// ── 서버 초기화 (Basic Auth — getAccessToken 불필요) ──
Bootpay.setConfiguration({
    client_key: process.env.BOOTPAY_CLIENT_KEY,
    secret_key: process.env.BOOTPAY_SECRET_KEY
})

// ── 본인인증 결과 조회·검증·저장 ──
app.post('/api/auth/certificate', async (req, res) => {
    const { receipt_id, user_id } = req.body

    try {
        const certificate = await Bootpay.certificate(receipt_id)

        // ⚠️ 핵심: status가 12(본인인증완료)일 때만 완료로 처리합니다
        if (certificate.status !== 12) {
            return res.status(400).json({ verified: false, message: '본인인증이 완료되지 않았습니다.' })
        }

        const { name, phone, birth, gender, foreigner, carrier, unique } = certificate.authenticate_data

        // ⚠️ 핵심: 클라이언트가 보낸 이름·전화번호를 신뢰하지 말고
        // 서버가 조회한 authenticate_data 값만 저장합니다. 필요한 값만 최소한으로 저장하세요.
        const existing = await db.query(
            `SELECT id FROM verified_users WHERE unique_key = ?`,
            [unique]
        )

        if (existing.length > 0) {
            // unique(DI)로 동일인·중복가입 여부를 식별합니다. 이름+생일 조합으로 판단하지 마세요.
            return res.status(409).json({ verified: false, message: '이미 가입된 사용자입니다.' })
        }

        await db.query(
            `INSERT INTO verified_users (user_id, name, phone, birth, unique_key)
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, name, phone, birth, unique]
        )

        res.json({ verified: true })
    } catch (error) {
        console.error('본인인증 조회 에러:', { receipt_id, error: error.message || error })
        res.status(400).json({ verified: false, message: error.message })
    }
})
```

## 본인인증 전체 흐름

```
[프론트엔드]                         [서버]                              [Bootpay/다날]
    │                                 │                                    │
    │  1. requestAuthentication()     │                                    │
    │─────────────────────────────────┼───────────────────────────────────→│
    │                                 │                                    │
    │  2. 사용자: 통신사 선택·휴대폰 인증│                                    │
    │  3. done 이벤트 (receipt_id)    │                                    │
    │←────────────────────────────────┼────────────────────────────────────│
    │                                 │                                    │
    │  4. receipt_id를 서버로 전달     │                                    │
    │─────────────────────────────→   │                                    │
    │                                 │  5. certificate(receipt_id)         │
    │                                 │───────────────────────────────────→│
    │                                 │←───────────────────────────────────│
    │                                 │  6. status 12 확인                  │
    │                                 │  7. authenticate_data 최소 저장     │
    │                                 │     (unique로 중복가입 확인)        │
```

## 4. REST API로 직접 연동 (창 없는 SMS 인증)

인증창 없이 자체 UI에서 진행하려면 서버에서 REST API로 직접 연동할 수 있습니다.

```javascript
// ① 인증 요청 - 사용자 휴대폰으로 SMS 인증번호가 전송된다.
const requested = await Bootpay.requestAuthentication({
    authentication_id: 'auth_' + Date.now(),
    pg: '다날',
    method: '본인인증',
    order_name: '회원가입 본인인증',
    authenticate_type: 'sms',
    username: '홍길동',
    identity_no: '900101', // 생년월일 6자리
    carrier: 'SKT',
    phone: '01012345678'
})

// ② 인증 승인 - 사용자가 입력한 SMS 인증번호(OTP)로 승인한다.
const confirmed = await Bootpay.confirmAuthentication(requested.receipt_id, otp)

// ③ 인증번호가 오지 않으면 재전송한다.
// await Bootpay.realarmAuthentication(requested.receipt_id)

// ④ status 12(본인인증완료) 확인 후 인증 정보를 사용한다.
if (confirmed.status === 12) {
    saveVerifiedUser(confirmed.authenticate_data)
}
```

## 핵심 포인트

1. **`requestAuthentication()` vs `requestPayment()`**: 본인인증은 반드시 `requestAuthentication()` 사용. Web은 `pg: 'danal'` + `method: 'auth'`, 모바일 SDK는 `pg: '다날'` + `method: '본인인증'`
2. **`authentication_id`**: 결제의 `order_id`에 해당하는 가맹점 고유 인증번호. **필수** — 서버에서 생성해 DB에 저장하는 것을 권장
3. **인증 정보는 프론트로 오지 않음**: `done` 이벤트에는 `receipt_id`만 포함됨 → 서버가 `certificate(receipt_id)`로 조회
4. **status 12 확인 필수**: `certificate` 응답의 `status`가 `12`(본인인증완료)일 때만 완료로 처리
5. **저장 원칙**: `authenticate_data`에서 필요한 값만 최소 저장. **클라이언트가 보낸 이름·전화번호를 그대로 저장하지 말 것** — 반드시 서버 조회값 사용
6. **중복가입 방지**: `authenticate_data.unique`(DI, 개인 고유값)로 동일인 식별. 이름+생일 조합으로 판단하지 말 것
7. **유효시간 30분**: 인증 확인은 30분 이내에 처리해야 함. 초과 시 `AUTH_EXPIRED` — 처음부터 재요청
8. **에러 코드**: `AUTH_NEED_PG_METHOD`(pg/method 누락), `AUTH_ALREADY_AUTHENTICATED`(완료 건 재요청 → 새 authentication_id), `AUTH_EXPIRED`(30분 초과), `AUTH_NOT_CONFIRMED`(승인 전 조회)
9. **REST(창 없는 SMS) 방식**: 자체 UI가 필요하면 서버 `requestAuthentication`(SMS 발송) → `confirmAuthentication(receipt_id, otp)`(승인) → `realarmAuthentication`(재전송) → `certificate` 조회 순으로 REST 연동 가능
