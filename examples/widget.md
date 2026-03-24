# Web — 결제위젯 (임베드형)

결제위젯은 페이지에 직접 임베드되는 결제 UI입니다. 결제수단 선택과 약관 동의가 위젯 안에서 처리됩니다.

> **일반 결제창과 차이**: 일반 결제(`Bootpay.requestPayment`)는 팝업/리다이렉트, 위젯(`BootpayWidget.render`)은 페이지 내 임베드

## CDN 설치

```html
<!-- ⚠️ 위젯 전용 CDN을 사용하세요 (일반 bootpay-5.x.x.min.js가 아님) -->
<script src="https://js.bootpay.co.kr/bootpay-widget-5.3.0.min.js"></script>
```

## 전체 코드

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bootpay 결제위젯</title>
    <script src="https://js.bootpay.co.kr/bootpay-widget-5.3.0.min.js"></script>
    <style>
        body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
        #bootpay-widget { border: 1px solid #e5e7eb; border-radius: 8px; min-height: 200px; }
        #pay-button { width: 100%; padding: 16px; font-size: 18px; font-weight: bold;
            background: #3b82f6; color: white; border: none; border-radius: 8px;
            margin-top: 16px; cursor: pointer; }
        #pay-button:disabled { background: #9ca3af; cursor: not-allowed; }
        #status { margin-top: 12px; padding: 8px; font-size: 14px; color: #6b7280; }
    </style>
</head>
<body>
    <h1>결제위젯 예제</h1>
    <p>총 결제 금액: <strong>₩50,000</strong></p>

    <!-- 위젯이 렌더링될 영역 -->
    <div id="bootpay-widget"></div>

    <!-- 결제 버튼 (약관 동의 전까지 비활성화) -->
    <button id="pay-button" disabled onclick="requestPayment()">
        결제하기
    </button>

    <div id="status">위젯 로딩 중...</div>

    <script>
    // ── 위젯 렌더링 ──
    BootpayWidget.render('#bootpay-widget', {
        // ⚠️ create_keychain 또는 list_keychains로 조회한 실제 값만 사용
        // AI가 임의 생성한 값(예: 692e4c6da0ba...)은 100% 실패합니다
        application_id: process.env.BOOTPAY_APP_ID, // .env에서 설정
        price: 50000,
        order_name: '나이키 운동화 외 1건',
        order_id: 'order_' + Date.now(),
        pg: 'nicepay',
        use_terms: true,    // 약관 동의 UI 표시
        user: {
            username: '홍길동',
            phone: '01012345678',
            email: 'test@example.com'
        },
        extra: {
            card_quota: '0,2,3,4,5,6'  // 일시불, 2~6개월 할부
        },
        items: [
            { id: 'shoe-01', name: '나이키 운동화', qty: 1, price: 30000 },
            { id: 'sock-01', name: '아디다스 양말', qty: 2, price: 10000 },
        ],

        // ── 이벤트 훅 ──
        hooks: {
            // 위젯 렌더링 완료
            ready: function() {
                document.getElementById('status').textContent = '결제수단을 선택하고 약관에 동의해주세요.'
            },

            // 결제수단 선택/변경 시 호출
            paymentMethodUpdated: function(data) {
                console.log('선택된 결제수단:', data.method)
                document.getElementById('status').textContent = '결제수단: ' + data.method + ' 선택됨'
            },

            // 모든 필수 약관 동의 완료 시 호출
            // → 이 시점에 결제 버튼을 활성화하세요
            allTermsAccepted: function() {
                document.getElementById('pay-button').disabled = false
                document.getElementById('status').textContent = '결제 준비 완료!'
            },

            // 결제 완료
            done: function(data) {
                console.log('결제 성공:', data)
                document.getElementById('status').innerHTML =
                    '<strong style="color:green;">결제 성공! receipt_id: ' + data.receipt_id + '</strong>'

                // TODO: 서버로 receipt_id 전달하여 검증
            },

            // 에러
            error: function(data) {
                console.error('결제 에러:', data)
                document.getElementById('status').innerHTML =
                    '<strong style="color:red;">에러: ' + data.message + '</strong>'
            },

            // 사용자 취소
            cancel: function(data) {
                console.warn('결제 취소:', data)
                document.getElementById('status').textContent = '결제가 취소되었습니다.'
            },

            // 창 닫힘
            close: function() {
                console.log('결제창 닫힘')
            }
        }
    })

    // ── 결제 요청 ──
    function requestPayment() {
        BootpayWidget.requestPayment({
            order_name: '나이키 운동화 외 1건',
            order_id: 'order_' + Date.now(),
        })
    }

    // ── 금액 동적 변경 (옵션) ──
    function updatePrice(newPrice) {
        BootpayWidget.update({
            price: newPrice,
            tax_free: 0
        })
    }

    // ── 약관 상태 조회 (옵션) ──
    function checkTerms() {
        const terms = BootpayWidget.currentTermsCondition()
        // [{ pk: 'term1', title: '이용약관', agree: true }, ...]
        const allAgreed = terms.every(t => t.agree)
        console.log('약관 동의 상태:', allAgreed, terms)
    }
    </script>
</body>
</html>
```

## 이벤트 흐름

```
1. BootpayWidget.render() 호출
2. → ready 이벤트: 위젯 표시 완료
3. → 사용자가 결제수단 선택
4. → paymentMethodUpdated 이벤트: { method: 'card' }
5. → 사용자가 약관 동의 체크
6. → allTermsAccepted 이벤트: 결제 버튼 활성화
7. → 사용자가 "결제하기" 클릭
8. → BootpayWidget.requestPayment() 호출
9. → done/error/cancel 이벤트
```

## 위젯 유틸리티 API

| API | 용도 |
|-----|------|
| `BootpayWidget.render(selector, options)` | 위젯 렌더링 |
| `BootpayWidget.update({ price, tax_free })` | 금액/옵션 동적 변경 |
| `BootpayWidget.requestPayment(options)` | 결제 요청 |
| `BootpayWidget.currentTermsCondition()` | 약관 동의 상태 배열 반환 |
| `BootpayWidget.currentPaymentParameters()` | 현재 결제 파라미터 |
| `BootpayWidget.destroy()` | 위젯 제거 |

## 모바일 위젯 (Flutter 예시)

```dart
BootpayWidgetView(
  payload: _payload,
  onWidgetReady: () {
    print('위젯 렌더링 완료');
  },
  onWidgetChangePayment: (widgetData) {
    // 결제수단 변경 → payload에 머지
    setState(() {
      _payload.mergeWidgetData(widgetData);
    });
  },
  onWidgetChangeAgreeTerm: (widgetData) {
    // 약관 동의 상태 변경 → payload에 머지
    setState(() {
      _payload.mergeWidgetData(widgetData);
    });
  },
  onWidgetResize: (height) {
    // 위젯 높이 변경 시 레이아웃 조정
    setState(() { _widgetHeight = height; });
  },
)

// 결제 버튼 (결제수단 + 약관 모두 완료 시 활성화)
ElevatedButton(
  onPressed: _payload.widgetIsCompleted ? () {
    _controller.requestPayment(_payload);
  } : null,
  child: Text('결제하기'),
)
```

## 핵심 포인트

1. **CDN 구분**: `bootpay-widget-5.3.0.min.js` (위젯 전용). 일반 `bootpay-5.3.0.min.js`로는 위젯 API 사용 불가
2. **`use_terms: true`**: 약관 동의 UI를 위젯 안에 표시. `allTermsAccepted` 이벤트로 완료 감지
3. **`paymentMethodUpdated`**: 결제수단 선택/변경 시 호출. 이 데이터로 UI 업데이트
4. **결제 버튼 활성화**: 결제수단 선택 + 약관 동의 완료 후에만 활성화 (Web: `allTermsAccepted`, 모바일: `widgetIsCompleted`)
5. **`BootpayWidget.update()`**: 쿠폰 적용 등으로 금액이 변경될 때 사용
6. **모바일 필수 패턴**: 이벤트 콜백에서 반드시 `payload.mergeWidgetData(data)` 호출
