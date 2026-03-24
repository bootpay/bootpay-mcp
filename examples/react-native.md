# React Native

React Native에서 결제를 연동하는 예제입니다.

> **주의**: Android/iOS 별로 **Application ID가 다릅니다**.

## 설치

```bash
npm install react-native-bootpay-api
cd ios && pod install
```

## 환경 설정

```bash
# .env (react-native-config 패키지 사용)
BOOTPAY_APP_ID=your_web_application_id
BOOTPAY_ANDROID_APP_ID=your_android_application_id
BOOTPAY_IOS_APP_ID=your_ios_application_id
```

## 전체 코드 (App.tsx)

```tsx
import React, { useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, Alert
} from 'react-native'
import { BootpayWebView } from 'react-native-bootpay-api'

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

  // ⚠️ 반드시 관리자에서 발급받은 실제 Application ID를 사용하세요
  const appId = Platform.select({
    android: 'YOUR_ANDROID_APP_ID',  // ← 교체 필수!
    ios: 'YOUR_IOS_APP_ID',          // ← 교체 필수!
    default: 'YOUR_WEB_APP_ID',
  })!

  const handlePayment = () => {
    setLoading(true)

    const payload = {
      pg: 'nicepay',
      method,
      price: totalPrice,
      order_name: '나이키 운동화 외 1건',
      order_id: `order_${Date.now()}`,
      application_id: appId,
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
        onDone={(data: string) => {
          setLoading(false)
          Alert.alert('결제 성공', data)
          // TODO: 서버로 receipt_id 전달하여 검증
        }}
        onConfirm={(data: string) => true}
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
        onClose={() => setLoading(false)}
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

1. **플랫폼별 Application ID**: `Platform.select()`로 Android/iOS ID 분기
2. **`app_scheme`**: iOS Info.plist의 `CFBundleURLSchemes`에 등록 필요 (외부 앱 복귀 시)
3. **`BootpayWebView`**: ref로 참조하여 `requestPayment()` 호출
4. **서버 검증**: `onDone`에서 받은 데이터의 `receipt_id`를 서버로 전달하여 검증 필수
