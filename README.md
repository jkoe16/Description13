# 마음곁

마음이 힘든 사람이 편하게 이야기하고 위로받을 수 있는 웹 앱이에요. 휴대폰 홈 화면에 설치해서 쓰는 PWA예요.

- 배포 주소: **https://maeumgyeot-vmm0.onrender.com** (Render 무료 요금제, `main`에 push하면 자동 배포)
- Firebase 프로젝트: `maeumgyeot-92e27` (로그인 + Firestore 저장)
- AI: OpenAI Responses API (서버에서만 호출). AI는 전문 상담을 대신하지 않아요.

> 이 저장소는 공개예요. 비밀 키와 개인정보는 여기에 적지 않고, Render 환경변수와 `.env.local`에만 둬요.

## 화면

| 화면 | 주소 | 내용 |
|---|---|---|
| 홈 | `#/home` | 인사·오늘의 한 마디(로그인 시 하루 1번 AI가 만듦), 감정 선택, 눈물 쉼터 입구 |
| 마음 대화 | `#/chat` | AI 대화(경청·공감·함께 생각하기·용기 주기). 로그인한 허락 계정만. 자동 저장, 지난 대화·새 대화, 위기 시 109 카드 |
| 마음 기록 | `#/journal` | 감정·크기·메모. 로그인 시 계정에 저장, 감정별 위로(로그인 시 AI가 메모를 읽고 위로) |
| 마음 휴식 | `#/rest` | 호흡 안내 |
| 도움받기 | `#/help` | 109·112·119, 상담기관 |
| 내 계정 | `#/account` | Google·이메일 로그인, 내 데이터 전부 지우기·계정 삭제, 개인정보 안내 |
| 눈물 쉼터 | `#/cry` | 메뉴 없는 어두운 전체 화면, 빗소리·파도(Web Audio), 곁에 있는 말, 진정 후 체크인 |

공통: 밤 9시~아침 6시 또는 휴대폰 다크 모드면 밤 모드, 부드러운 화면 전환, 새 버전이 나오면 "새 버전이 준비됐어요 [바꾸기]" 안내.

## 코드 구조

```
server/            Node 내장 모듈만 사용
  index.js         dist 정적 파일 + /api/chat, /api/comfort, /api/health
  chat.js          마음 대화(json_schema로 reply+risk), 다정한 말(handleComfort), 위기 표현 정규식, IP당 분당 12회 제한
  auth.js          Firebase ID 토큰 검증(내장 crypto), email_verified 필수, ALLOWED_EMAILS 비교
src/
  App.jsx          해시 라우팅, 새 버전 안내 띠
  firebase.js      Firebase 초기화, useUser, 로그인 오류 문구
  theme.js         밤 모드 (data-theme="night")
  comfort.js       미리 써 둔 다정한 말 (AI가 실패하면 이걸 씀)
  comfortAI.js     /api/comfort 호출, 홈 AI 문장 하루 캐시
  pages/, components/
public/
  sw.js            서비스 워커: 화면을 저장해 두고 바로 열기, 뒤에서 갱신, /api는 캐시 안 함
  manifest.webmanifest, icons/
firestore.rules    Firestore 보안 규칙 (Firebase 콘솔에 게시한 것과 같아야 함)
render.yaml        Render 설정
```

Firestore 경로: `users/{uid}/journal/{id}`, `users/{uid}/chats/{id}`. 본인만 읽기·쓰기·삭제할 수 있어요.
규칙을 바꾸면 `firestore.rules`를 고친 뒤 [Firebase 콘솔 규칙 화면](https://console.firebase.google.com/project/maeumgyeot-92e27/firestore/rules)에 붙여 넣고 게시해야 해요.

## 환경변수

값은 Render → maeumgyeot-vmm0 → Environment에 있어요. 로컬에서는 `.env.example`을 `.env.local`로 복사해서 채워요(`.env.local`은 git에 안 올라가요).

| 이름 | 용도 |
|---|---|
| `OPENAI_API_KEY` | AI 답장 (필수) |
| `OPENAI_MODEL` | 선택, 기본 `gpt-6-luna` |
| `ALLOWED_EMAILS` | 마음 대화·AI 문장을 쓸 수 있는 이메일 (쉼표로 구분) |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase 웹 설정 (빌드 때 화면에 들어감) |
| `TRUST_PROXY` | Render에서는 `1` |

## 실행

```bash
npm install
npm run dev                  # 개발 서버 (화면 + API)
npm run build && npm start   # 배포와 같은 방식 (포트 3000)
```

## 운영 메모

- Render 무료 750시간은 **계정 전체가 함께 써요**(같은 계정에 다른 앱도 있음). 그래서 서버를 24시간 깨워 두지 않아요. 오래 안 쓰면 마음 대화 첫 답장이 30~50초 걸릴 수 있어요. 화면은 서비스 워커 덕분에 바로 열려요.
- Render 계정에 쓰지 않는 중복 서비스(`maeumgyeot.onrender.com`, 키 없음)가 있어요.
- Render 환경변수와 Firebase 콘솔 작업은 계정 주인이 직접 해야 해요.

## 지금 상태와 다음 할 일 (2026-11-25 기준)

**확인됨**: 로그인, 대화·기록 저장(실제 휴대폰), 실제 AI 답변과 위기 판단, AI 다정한 말, 보안 규칙(임시 계정으로 시험 후 삭제), 전부 지우기·계정 삭제.

**아직 휴대폰에서 확인 안 됨**: 빗소리·파도 소리, PWA 설치, 새 버전 안내 띠, 로그인 상태에서 AI 문장으로 바뀌는 모습, 아이폰에 설치한 앱 안에서 Google 로그인(팝업이 막힐 수 있음), 이메일 가입 인증 메일.

**다음 할 일 후보** (추천 순서, 자세한 내용과 고치는 방법은 [docs/아쉬운-점.md](docs/아쉬운-점.md))
1. 휴대폰에서 위 항목 확인 → 문제부터 고치기
2. OpenAI 사용 한도 걸기 (platform.openai.com → Settings → Limits)
3. AI가 나를 기억하기 (지금은 대화에서 최근 10개 메시지만 보고, 지난 대화·기록을 모름)
4. 밤 모드 직접 켜고 끄기
5. 마음 기록 돌아보기(감정 그래프 등), 기록 고치기
6. `src/pages/Chat.jsx` 정리 (기능이 늘어 파일이 커짐)

예전에 나온 다른 아이디어: 말로 하는 대화(음성 입력), 위로 보관함.
