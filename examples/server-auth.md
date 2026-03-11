# 서버 — 본인인증 + 현금영수증 + 에스크로 (Node.js)

결제 외 서버 API — 본인인증 결과 조회, 현금영수증 발행/취소, 에스크로 배송 등록 예제입니다.

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

---

## 1. 본인인증 결과 조회

프론트엔드에서 본인인증 완료 후 받은 `receipt_id`로 인증 결과를 서버에서 조회합니다.

```javascript
// ── 본인인증 결과 조회 ──
async function getCertificate(receiptId) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.certificate(receiptId)

    console.log('본인인증 결과:', {
        name: result.authenticate_data.name,       // 이름
        phone: result.authenticate_data.phone,     // 전화번호
        unique: result.authenticate_data.unique,   // CI (고유 식별자)
        birth: result.authenticate_data.birth,     // 생년월일
        gender: result.authenticate_data.gender,   // 0: 여성, 1: 남성
        foreigner: result.authenticate_data.foreigner, // 0: 내국인, 1: 외국인
        carrier: result.authenticate_data.carrier  // 통신사
    })
    return result
}
```

## 2. 서버 발 본인인증 (SMS/PASS)

프론트엔드 없이 서버에서 직접 본인인증을 요청할 수 있습니다.

```javascript
// ── 본인인증 요청 (SMS) ──
async function requestAuth(userInfo) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.requestAuthentication({
        authentication_id: `auth_${Date.now()}`,  // 가맹점 고유 인증 ID
        pg: 'danal',
        method: 'sms',                  // 'sms' 또는 'pass'
        username: userInfo.name,
        identity_no: userInfo.birth,    // 생년월일 6자리 (YYMMDD)
        carrier: userInfo.carrier,      // SKT, KT, LGU+, SKT_MVNO, KT_MVNO, LGU+_MVNO
        phone: userInfo.phone,
        client_ip: userInfo.ip,
        order_name: '본인인증'
    })

    // receipt_id를 저장 → OTP 확인 시 사용
    console.log('인증 요청 완료, receipt_id:', result.receipt_id)
    return result
}

// ── OTP 확인 (SMS 인증 시) ──
async function confirmAuth(receiptId, otp) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.confirmAuthentication(receiptId, otp)
    console.log('본인인증 승인:', result.authenticate_data.name)
    return result
}

// ── SMS 재전송 ──
async function resendSms(receiptId) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.realarmAuthentication(receiptId)
    console.log('SMS 재전송 완료')
    return result
}
```

---

## 3. 현금영수증

### 3-1. 기존 결제에 현금영수증 발행

계좌이체/가상계좌 결제에 현금영수증을 발행합니다.

```javascript
// ── 기존 결제에 현금영수증 발행 ──
async function publishCashReceipt(receiptId, identityNo, type) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.cashReceiptPublishOnReceipt({
        receipt_id: receiptId,
        identity_no: identityNo,           // 주민번호, 사업자번호, 휴대폰번호
        cash_receipt_type: type,           // '소득공제' 또는 '지출증빙'
        username: '홍길동',
        phone: '01012345678',
        email: 'test@example.com'
    })

    console.log('현금영수증 발행:', result)
    return result
}

// ── 기존 결제 현금영수증 취소 ──
async function cancelCashReceiptOnReceipt(receiptId) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.cashReceiptCancelOnReceipt({
        receipt_id: receiptId,
        cancel_username: '관리자',
        cancel_message: '현금영수증 취소'
    })

    console.log('현금영수증 취소:', result)
    return result
}
```

### 3-2. 별건 현금영수증 (결제 없이 단독 발행)

```javascript
// ── 별건 현금영수증 발행 ──
async function requestStandaloneCashReceipt() {
    await Bootpay.getAccessToken()

    const result = await Bootpay.requestCashReceipt({
        pg: 'nicepay',
        price: 50000,
        tax_free: 0,
        order_name: '오프라인 판매',
        order_id: `cash_${Date.now()}`,
        cash_receipt_type: '소득공제',     // '소득공제' 또는 '지출증빙'
        identity_no: '01012345678',        // 주민번호, 사업자번호, 휴대폰번호
        purchased_at: new Date(),
        user: { username: '홍길동' }
    })

    console.log('별건 현금영수증 발행:', result.receipt_id)
    return result
}

// ── 별건 현금영수증 취소 ──
async function cancelStandaloneCashReceipt(receiptId) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.cancelCashReceipt({
        receipt_id: receiptId,
        cancel_username: '관리자',
        cancel_message: '현금영수증 발행 취소'
    })

    console.log('별건 현금영수증 취소:', result)
    return result
}
```

---

## 4. 에스크로 배송 등록

에스크로 결제 시 배송 정보를 등록합니다.

```javascript
// ── 에스크로 배송 시작 ──
async function startShipping(receiptId, trackingInfo) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.shippingStart({
        receipt_id: receiptId,
        tracking_number: trackingInfo.trackingNumber,   // 운송장 번호
        delivery_corp: trackingInfo.deliveryCorp,       // 택배사명 (예: 'CJ대한통운')
        user: {
            username: trackingInfo.receiverName,
            phone: trackingInfo.receiverPhone,
            address: trackingInfo.receiverAddress,
            zipcode: trackingInfo.receiverZipcode
        },
        company: {
            name: trackingInfo.senderName,
            phone: trackingInfo.senderPhone
        }
    })

    console.log('배송 등록 완료:', result)
    return result
}

// 사용 예시
await startShipping('receipt_xxx', {
    trackingNumber: '1234567890',
    deliveryCorp: 'CJ대한통운',
    receiverName: '홍길동',
    receiverPhone: '01012345678',
    receiverAddress: '서울특별시 강남구 테헤란로 123',
    receiverZipcode: '06234',
    senderName: '상점',
    senderPhone: '0212345678'
})
```

---

## 5. 사용자 토큰 발급 (간편결제)

사용자별 토큰을 발급하여 간편결제(카드 자동 입력)를 제공합니다.

```javascript
// ── 사용자 토큰 발급 ──
async function getUserToken(userId) {
    await Bootpay.getAccessToken()

    const result = await Bootpay.requestUserToken({
        user_id: userId,               // 가맹점 사용자 고유 ID
        phone: '01012345678',
        username: '홍길동',
        email: 'test@example.com'
    })

    console.log('사용자 토큰:', {
        user_token: result.user_token,
        expired_at: result.expired_at
    })

    // 이 토큰을 프론트엔드에 전달하면
    // 결제 시 이전에 사용한 카드가 자동으로 표시됩니다
    return result
}
```

---

## 서버 API 전체 메서드 요약

| 카테고리 | 메서드 | 설명 |
|---------|--------|------|
| **인증** | `getAccessToken()` | 서버 토큰 발급 |
| **결제** | `receiptPayment(receiptId)` | 결제 조회 |
| **결제** | `confirmPayment(receiptId)` | 승인형 결제 확정 |
| **결제** | `cancelPayment(params)` | 결제 취소 (전액/부분) |
| **빌링** | `requestSubscribeCardPayment(params)` | 빌링키 자동결제 |
| **빌링** | `subscribePaymentReserve(params)` | 예약결제 등록 |
| **빌링** | `subscribePaymentReserveLookup(id)` | 예약결제 조회 |
| **빌링** | `cancelSubscribeReserve(id)` | 예약결제 취소 |
| **빌링** | `lookupSubscribeBillingKey(receiptId)` | 빌링키 조회 (receipt_id) |
| **빌링** | `lookupBillingKey(billingKey)` | 빌링키 조회 (billing_key) |
| **빌링** | `destroyBillingKey(billingKey)` | 빌링키 해지 |
| **인증** | `certificate(receiptId)` | 본인인증 결과 조회 |
| **인증** | `requestAuthentication(params)` | 서버 발 본인인증 요청 |
| **인증** | `confirmAuthentication(receiptId, otp)` | 본인인증 OTP 확인 |
| **인증** | `realarmAuthentication(receiptId)` | SMS 재전송 |
| **현금** | `cashReceiptPublishOnReceipt(params)` | 기존 결제 현금영수증 발행 |
| **현금** | `cashReceiptCancelOnReceipt(params)` | 기존 결제 현금영수증 취소 |
| **현금** | `requestCashReceipt(params)` | 별건 현금영수증 발행 |
| **현금** | `cancelCashReceipt(params)` | 별건 현금영수증 취소 |
| **에스크로** | `shippingStart(params)` | 에스크로 배송 등록 |
| **간편결제** | `requestUserToken(params)` | 사용자 토큰 발급 |

## 핵심 포인트

1. **모든 API 호출 전 `getAccessToken()`** — 토큰은 만료됨. 매 요청 전 호출
2. **본인인증 CI값**: `authenticate_data.unique`는 사용자 고유 식별자 (CI). 중복가입 방지에 사용
3. **현금영수증 타입**: `'소득공제'`(개인) vs `'지출증빙'`(사업자)
4. **에스크로**: 배송 등록 후 구매자가 구매 확정해야 정산 진행
5. **사용자 토큰**: 프론트엔드에 전달하면 이전 결제 카드가 자동 표시 (간편결제)
