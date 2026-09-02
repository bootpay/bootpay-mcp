import { SERVER_SDKS, type ServerLanguage } from '../sdk/registry.js';

/** 플랫폼별 클라이언트 환경변수 가이드 */
export function getClientEnvGuide(platform: string): string {
  switch (platform) {
    case 'android':
      return `**Android — \`local.properties\` 또는 \`BuildConfig\`**

\`\`\`properties
# local.properties (git에 커밋하지 마세요)
BOOTPAY_CLIENT_KEY=         # list_keychains로 조회 (Android)
\`\`\`

\`\`\`gradle
// app/build.gradle
android {
    defaultConfig {
        buildConfigField "String", "BOOTPAY_CLIENT_KEY", "\\"" + (project.findProperty("BOOTPAY_CLIENT_KEY") ?: "") + "\\""
    }
}
\`\`\`

\`\`\`kotlin
// 사용 — SDK 메서드명도 setClientKey/clientKey 입니다.
val clientKey = BuildConfig.BOOTPAY_CLIENT_KEY
payload.clientKey = clientKey   // Kotlin DSL
// payload.setClientKey(clientKey) // Java
\`\`\``;
    case 'ios':
      return `**iOS — xcconfig 또는 Info.plist**

\`\`\`bash
# Debug.xcconfig (git에 커밋하지 마세요)
BOOTPAY_CLIENT_KEY =         # list_keychains로 조회 (iOS)
\`\`\`

\`\`\`xml
<!-- Info.plist에 BootpayClientKey 항목 추가 -->
<key>BootpayClientKey</key>
<string>$(BOOTPAY_CLIENT_KEY)</string>
\`\`\`

\`\`\`swift
// 사용 — SDK Payload 의 clientKey 프로퍼티에 그대로 대입
let clientKey = Bundle.main.infoDictionary?["BootpayClientKey"] as? String ?? ""
payload.clientKey = clientKey
\`\`\``;
    case 'flutter':
      return `**Flutter — \`--dart-define\` 또는 \`.env\` + flutter_dotenv**

\`\`\`bash
# 방법 1: dart-define (권장)
flutter run --dart-define=BOOTPAY_CLIENT_KEY=         # list_keychains로 조회
\`\`\`

\`\`\`dart
// 사용 — Payload 의 clientKey 프로퍼티에 대입
const clientKey = String.fromEnvironment('BOOTPAY_CLIENT_KEY');
payload.clientKey = clientKey;
\`\`\`

\`\`\`bash
# 방법 2: .env 파일 + flutter_dotenv 패키지
# .env
BOOTPAY_CLIENT_KEY=                 # list_keychains로 조회 (공통)
BOOTPAY_ANDROID_CLIENT_KEY=         # list_keychains로 조회 (Android 전용)
BOOTPAY_IOS_CLIENT_KEY=             # list_keychains로 조회 (iOS 전용)
BOOTPAY_WEB_CLIENT_KEY=             # list_keychains로 조회 (Flutter Web 전용)
\`\`\`

\`\`\`dart
// flutter_dotenv 패턴
final clientKey = dotenv.maybeGet('BOOTPAY_CLIENT_KEY') ?? '';
payload.clientKey = clientKey;
\`\`\`

> Flutter 는 플랫폼별 Client Key 가 분리되어 있다면 (Web/Android/iOS) 각 플랫폼에 맞는 키를 dispatch 해서 \`payload.clientKey\` 에 넣어주세요.`;
    case 'react-native':
      return `**React Native — \`react-native-config\` 패키지**

\`\`\`bash
npm install react-native-config
\`\`\`

\`\`\`bash
# .env (git에 커밋하지 마세요)
BOOTPAY_CLIENT_KEY=                 # list_keychains로 조회 (공통)
BOOTPAY_ANDROID_CLIENT_KEY=         # list_keychains로 조회 (Android 전용)
BOOTPAY_IOS_CLIENT_KEY=             # list_keychains로 조회 (iOS 전용)
\`\`\`

\`\`\`typescript
import Config from 'react-native-config';
import { Bootpay } from 'react-native-bootpay-api';

const clientKey = Config.BOOTPAY_CLIENT_KEY ?? '';

// JSX 사용 시 — <Bootpay client_key={clientKey} ... />
// 레거시 application_id 방식은 사용하지 않습니다 (호환용 prop 만 존재).
\`\`\``;
    default: // web or all
      return `**프론트엔드 (.env)** — 프레임워크에 맞는 변수명을 사용하세요
\`\`\`bash
# Vite (Vue, React, Svelte)
VITE_BOOTPAY_CLIENT_KEY=         # list_keychains로 조회

# Next.js
NEXT_PUBLIC_BOOTPAY_CLIENT_KEY=         # list_keychains로 조회

# Nuxt
NUXT_PUBLIC_BOOTPAY_CLIENT_KEY=         # list_keychains로 조회

# React (CRA)
REACT_APP_BOOTPAY_CLIENT_KEY=         # list_keychains로 조회

# SvelteKit
PUBLIC_BOOTPAY_CLIENT_KEY=         # list_keychains로 조회

# Remix / 기타
BOOTPAY_CLIENT_KEY=         # list_keychains로 조회
\`\`\``;
  }
}

/**
 * 서버 언어별 Basic Auth 인증 예제.
 * 패키지·초기화 코드는 src/sdk/registry.ts 가 단일 소스다 (여기서 따로 적지 않는다).
 */
export function getServerTokenExample(lang: string): string {
  const key = (lang === 'csharp' ? 'dotnet' : lang) as ServerLanguage;
  const spec = SERVER_SDKS[key] ?? SERVER_SDKS.nodejs;
  const comment = spec.fence === 'python' || spec.fence === 'ruby' ? '#' : '//';

  return `\`\`\`${spec.fence}
${spec.initSnippet}

${comment} 매 요청 시 자동으로 Authorization: Basic base64(client_key:secret_key) 부착
${comment} 별도 토큰 발급(getAccessToken 계열)은 ck/sk 모드에서 no-op 입니다
\`\`\``;
}

/**
 * 문서 백엔드가 죽었을 때 도구가 붙일 경고문.
 *
 * "검색 결과가 없습니다"만 돌려주면 AI 는 서버가 죽은 줄 모르고 키워드를 바꿔가며 재시도하다
 * 결국 학습 기억으로 답을 지어낸다. 실제로 mcp.bootpay.ai 가 404 로 죽어 있던 기간 동안
 * stdio 사용자 전원이 이 상태였다. 그래서 원인을 대놓고 말한다.
 */
export function backendDownNotice(provider: { backendStatus?(): { down: boolean; detail?: string } }): string | null {
  const st = provider.backendStatus?.();
  if (!st?.down)
    return null;
  return `⚠️ **문서 백엔드에 연결하지 못했습니다** (${st.detail ?? '원인 미상'}).

검색 결과가 없는 것이 아니라 **문서를 한 건도 읽지 못한 상태**입니다. 다른 키워드로 재시도해도 결과는 같습니다.

- 이 상태에서 결제 연동 내용을 **기억에 의존해 답하지 마세요.** 틀린 파라미터·없는 API를 지어내게 됩니다.
- 사용자에게 문서 백엔드 장애를 알리고, https://developers.bootpay.ai 문서를 직접 확인하도록 안내하세요.
- \`BOOTPAY_MCP_API_URL\` 환경변수로 다른 주소를 지정할 수 있습니다.
- \`get_troubleshooting\`, \`get_sdk_versions\`, \`detect_project_stack\` 은 서버 내장이라 이 장애와 무관하게 동작합니다.`;
}
