# React Native

React Native에서 결제를 연동하는 예제입니다.

> **⚠️ Client Key는 Admin CLI(`create_keychain` 또는 `list_keychains`)로 조회하거나, [admin.bootpay.ai](https://admin.bootpay.ai/setting/developer?tab=api-key&cursor=payment)에서 직접 확인한 실제 값을 사용하세요.**
> AI가 임의로 생성한 값은 100% 실패합니다. Android/iOS 별로 Client Key가 다릅니다.

## 설치

```bash
npm install react-native-bootpay-api
cd ios && pod install
```

## 환경 설정

```bash
# .env (react-native-config 패키지 사용)
# ⚠️ 아래 값은 Admin CLI list_keychains(source=core) 또는 admin.bootpay.ai에서 조회한 실제 값을 입력하세요
# AI가 임의로 생성한 값(예: 692e4c6da0ba...)은 100% 실패합니다
BOOTPAY_CLIENT_KEY=         # Web Client Key
BOOTPAY_ANDROID_CLIENT_KEY= # Android Client Key
BOOTPAY_IOS_CLIENT_KEY=     # iOS Client Key
```

## 전체 코드 (App.tsx)

```tsx
import React, { useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, Alert
} from 'react-native'
import { BootpayWebView } from 'react-native-bootpay-api'
import Config from 'react-native-config'  // .env에서 Client Key 읽기

const items = [
  { id: 'shoe-01', name: '나이키 운동화', qty: 1, price: 30000 },
  { id: 'sock-01', name: '아디다스 양말', qty: 2, price: 10000 },
]
const totalPrice = 50000

const METHODS = [
  { label: '카드', value: 'card' },
  { label: '계좌이체', value: 'bank' },
  { label: '휴대폰', value: 'phone' },
  { label: '가상계좌', value: 'vbank' },
]

export default function App() {
  const bootpay = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState('card')

  // ⚠️ Admin CLI list_keychains(source=core) 또는 admin.bootpay.ai에서 조회한 실제 값만 사용
  // AI가 이 값을 추측하거나 임의 생성하면 100% 실패합니다
  // react-native-config 패키지로 .env에서 읽는 방식을 권장합니다
  const clientKey = Platform.select({
    android: Config.BOOTPAY_ANDROID_CLIENT_KEY,  // .env에서 읽기
    ios: Config.BOOTPAY_IOS_CLIENT_KEY,          // .env에서 읽기
    default: Config.BOOTPAY_CLIENT_KEY,
  })!

  const handlePayment = () => {
    setLoading(true)

    const payload = {
      pg: 'nicepay',
      method,
      price: totalPrice,
      order_name: '나이키 운동화 외 1건',
      order_id: `order_${Date.now()}`,
      client_key: clientKey,
    }

    const user = {
      username: '홍길동',
      phone: '01012345678',
      email: 'test@example.com',
    }

    const extra = {
      app_scheme: 'bootpayexample',
      card_quota: '0,2,3,4,5,6',
    }

    bootpay.current?.requestPayment(payload, items, user, extra)
  }

  // ── 서버승인 헬퍼 ──
  // data(JSON)에서 receipt_id를 추출 → POST /api/confirm { receipt_id, order_id }
  // 서버가 confirmPayment(receipt_id) 호출 후 리턴값(status·price)으로 검증 (금액 불일치 시 cancelPayment)
  const sendConfirmToServer = async (data: string) => {
    // const { receipt_id, order_id } = JSON.parse(data)
    // await fetch('/api/confirm', {
    //   method: 'POST', headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ receipt_id, order_id }),
    // })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bootpay 결제 테스트</Text>
      <Text style={styles.price}>합계: ₩{totalPrice.toLocaleString()}</Text>

      <View style={styles.methods}>
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.methodBtn, method === m.value && styles.methodActive]}
            onPress={() => setMethod(m.value)}
          >
            <Text>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <TouchableOpacity style={styles.payBtn} onPress={handlePayment}>
          <Text style={styles.payText}>결제하기</Text>
        </TouchableOpacity>
      )}

      <BootpayWebView
        ref={bootpay}
        onConfirm={(data: string) => {
          // ── 서버승인(기본): receipt_id를 서버로 전달만 하고 false 반환 (자동 승인 방지) ──
          sendConfirmToServer(data)  // 서버 /api/confirm 호출 → 서버가 confirmPayment()
          return false // 자동 승인 방지
        }}
        onDone={(data: string) => {
          // 서버승인 방식에서는 호출되지 않음
        }}
        onCancel={(data: string) => {
          console.warn('Bootpay 결제 취소:', data)
          setLoading(false)
          Alert.alert('결제 취소')
        }}
        onError={(data: string) => {
          // ⚠️ 에러 발생 시 반드시 콘솔에 로깅 — 디버깅의 핵심 단서입니다
          console.error('Bootpay 결제 에러:', data)
          setLoading(false)
          Alert.alert('결제 에러', data)
        }}
        onClose={() => {
          // 결과 화면으로 이동 → 서버 DB 조회로 결제 결과 확인
          setLoading(false)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  price: { fontSize: 18, marginBottom: 16 },
  methods: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodBtn: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  methodActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  payBtn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center' },
  payText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
})
```

## 핵심 포인트

1. **플랫폼별 Client Key**: `Platform.select()`로 Android/iOS 키 분기
2. **`app_scheme`**: iOS Info.plist의 `CFBundleURLSchemes`에 등록 필요 (외부 앱 복귀 시)
3. **`BootpayWebView`**: ref로 참조하여 `requestPayment()` 호출
4. **서버승인이 기본**: `onConfirm`에서 receipt_id를 서버로 전달하고 `false` 반환 (자동 승인 방지). 서버가 `confirmPayment()` 후 리턴값(status·price)으로 검증. `onDone`은 호출되지 않음
5. **웹훅 보완**: 클라이언트 결과 처리는 앱 종료로 유실될 수 있음. 웹훅 엔드포인트 필수 (부트페이 IP `223.130.82.0/24` 필터 + 200/`success:true` 응답 + 재검증)
