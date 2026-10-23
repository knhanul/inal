# 이날 (Inal) — Google Play AAB

## Package

| 항목 | 값 |
|------|-----|
| 파일 | `inal-1.0.0.aab` |
| applicationId / package | `kr.co.nuni.inal` |
| versionName | `1.0.0` |
| versionCode | `1` |
| minSdk | 24 |
| targetSdk / compileSdk | 36 |
| 서명 | Play 업로드용 release keystore (PKCS12) |

## 앱이 로드하는 내용

이 AAB는 **로컬 SPA를 내장해 실행하지 않고**, Capacitor `server.url`로 **운영 사이트 https://inal.nuni.co.kr 를 로드**합니다.

- 서버에 배포하면 Play 재심사 없이 화면·기능이 갱신됩니다.
- HTTPS만 사용합니다 (`cleartext: false`).
- 로컬 번들 방식으로 바꾸려면 `capacitor.config.ts`의 `server.url`을 제거하고 `npm run build && npx cap sync android` 후 다시 `bundleRelease` 하세요.

## Keystore (비공개 — git에 없음)

| 항목 | 경로 |
|------|------|
| Keystore (PKCS12) | `/workspace/inal-signing/inal-upload.keystore` |
| 비밀번호 파일 (mode 600) | `/workspace/inal-signing/keystore.password` |
| Alias | `inal-upload` (파일: `/workspace/inal-signing/key.alias`) |
| Gradle 연결 | `/workspace/inal-src/android/keystore.properties` (gitignored) |

**백업 필수:** keystore와 비밀번호를 잃으면 같은 앱 서명으로 업데이트를 올릴 수 없습니다. 안전한 곳에 복사해 두세요. 채팅/git/README에 비밀번호를 적지 마세요.

## 다시 빌드하는 방법

```bash
cd /workspace/inal-src   # 또는 클론한 저장소
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=/workspace/android-sdk   # SDK가 있는 경로
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

npm ci
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
# 결과: android/app/build/outputs/bundle/release/app-release.aab
```

버전을 올릴 때 `android/app/build.gradle`의 `versionCode` / `versionName`을 함께 올리세요.

## Play Console 다음 단계

1. [Google Play Console](https://play.google.com/console)에서 앱 만들기  
   - 앱 이름: **이날**  
   - 기본 언어: 한국어  
   - 앱/게임: 앱  
   - 무료/유료: 무료(예정)
2. 패키지 이름: **`kr.co.nuni.inal`** (AAB와 동일해야 함)
3. **프로덕션** 또는 **내부 테스트** 트랙 → **앱 번들 업로드** → `inal-1.0.0.aab` 선택
4. 스토어 등록정보: 짧은/긴 설명, 스크린샷(폰), 아이콘(512), 기능 그래픽 등
5. **개인정보처리방침 URL** 제안: `https://inal.nuni.co.kr`  
   - 가능하면 전용 페이지(예: `/privacy`)를 두고 그 URL을 쓰는 편이 안전합니다.
6. 콘텐츠 등급, 대상 연령, 데이터 안전 양식 작성 후 심사 제출

## 한계 / 참고

- 네트워크 필요: 앱은 웹뷰로 운영 사이트를 엽니다. 오프라인에서는 동작하지 않습니다.
- 서버·도메인·인증서가 바뀌면 앱 체감도 바로 바뀝니다.
- Capacitor 플러그인(스플래시/상태바)은 네이티브 셸용이며, 날씨 로직은 웹과 동일합니다.
- Android Studio는 필수는 아닙니다. 이 환경에서는 CLI(`gradlew bundleRelease`)만으로 AAB를 만들었습니다.
