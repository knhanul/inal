import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 이날 Android 앱은 로컬 SPA 번들 대신 운영 사이트(https://inal.nuni.co.kr)를 로드합니다.
 * - 서버에 배포하면 앱 스토어 재심사 없이 화면·기능이 갱신됩니다.
 * - 오프라인·로컬 번들이 필요하면 server.url 을 제거하고 `npm run build && npx cap sync` 후
 *   dist/ 를 패키징하는 방식으로 바꾸면 됩니다.
 */
const config: CapacitorConfig = {
  appId: 'kr.co.nuni.inal',
  appName: '이날',
  webDir: 'dist',
  server: {
    url: 'https://inal.nuni.co.kr',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#F6F3EC',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#F6F3EC',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#F6F3EC',
    },
  },
};

export default config;
