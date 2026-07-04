# 4글자 퀴즈 four-word-quiz

AI가 앞 2글자를 제시하면 학생이 뒤 2글자를 입력해 4글자 단어를 완성하는 실시간 수업용 게임입니다.

## 1. 게임 방식

- 강사는 비밀번호를 입력해 입장합니다.
- 학생은 링크 또는 QR코드로 접속한 뒤 닉네임만 입력합니다.
- 강사가 게임 시간과 문제 개수를 숫자로 설정합니다.
- 게임 시작 시 Google Gemini API가 4글자 문제를 미리 생성합니다.
- 학생 화면에는 앞 2글자만 보입니다.
- 학생은 뒤 2글자를 입력합니다.
- 한 문제당 한 번만 제출할 수 있습니다.
- 정답자는 빠른 순서대로 점수를 받습니다.
- 최종 결과는 1등, 2등, 3등만 표시됩니다.

## 2. 점수 방식

참가자가 10명일 경우:

| 정답 순서 | 점수 |
|---:|---:|
| 1등 | 10점 |
| 2등 | 9점 |
| 3등 | 8점 |
| 10등 | 1점 |
| 오답 | 0점 |

점수 공식:

```text
점수 = 전체 참가자 수 - 정답 순위 + 1
```

## 3. 파일 구조

```text
four-word-quiz/
├── index.html
├── README.md
├── package.json
├── .env.example
├── vercel.json
├── database.rules.json
└── api/
    ├── check-teacher.js
    └── generate-words.js
```

## 4. Firebase에서 해야 할 일

1. Firebase 프로젝트 생성
2. Web App 추가
3. firebaseConfig 확인
4. Authentication에서 Anonymous 로그인 활성화
5. Realtime Database 생성
6. 잠금 모드로 시작
7. Realtime Database Rules에 `database.rules.json` 내용 붙여넣기
8. `index.html` 안의 firebaseConfig 자리 바꾸기

`index.html`에서 아래 값을 실제 Firebase 값으로 교체해야 합니다.

```js
const firebaseConfig = {
  apiKey: 'PASTE_API_KEY_HERE',
  authDomain: 'PASTE_AUTH_DOMAIN_HERE',
  databaseURL: 'PASTE_DATABASE_URL_HERE',
  projectId: 'PASTE_PROJECT_ID_HERE',
  storageBucket: 'PASTE_STORAGE_BUCKET_HERE',
  messagingSenderId: 'PASTE_MESSAGING_SENDER_ID_HERE',
  appId: 'PASTE_APP_ID_HERE'
};
```

## 5. Firebase Rules

초보 테스트용 규칙입니다.

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

주의: 이 규칙은 개발과 수업 테스트용으로 단순화한 규칙입니다. 공개 서비스처럼 오래 운영할 경우에는 학생이 점수나 게임 상태를 직접 수정하지 못하도록 더 엄격한 규칙으로 바꿔야 합니다.

## 6. Vercel Environment Variables

Vercel 프로젝트 설정에서 아래 환경변수를 추가합니다.

```text
TEACHER_PASSWORD=admin
GEMINI_API_KEY=Google AI Studio에서 만든 API 키
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_MODEL`은 선택값입니다. 입력하지 않으면 기본값으로 `gemini-2.5-flash`를 사용합니다.

## 7. GitHub에 올릴 파일

압축 파일 자체를 올리지 말고, 압축을 푼 파일과 폴더를 올립니다.

올릴 것:

```text
index.html
README.md
package.json
.env.example
vercel.json
database.rules.json
api/check-teacher.js
api/generate-words.js
```

올리지 말 것:

```text
.env
node_modules
Firebase 비공개 키 JSON 파일
```

## 8. 사용 순서

1. 강사가 Vercel 배포 주소로 접속합니다.
2. `강사로 입장`을 누릅니다.
3. 비밀번호 `admin`을 입력합니다.
4. 강사 화면의 QR코드 또는 링크를 학생에게 안내합니다.
5. 학생은 닉네임을 입력하고 입장합니다.
6. 강사는 게임 시간과 문제 수를 설정합니다.
7. `게임 시작`을 누릅니다.
8. 문제가 생성되면 학생이 답을 제출합니다.
9. 강사는 필요할 때 `힌트 공개`, `다음 문제`, `일시정지`, `재개`, `강제 종료`, `초기화`, `점수 수정`을 사용합니다.
10. 시간이 끝나면 자동으로 최종 1~3등이 표시됩니다.

## 9. 소리가 안 날 때

브라우저 자동재생 정책 때문에 사용자가 화면을 한 번 클릭하거나 터치하기 전에는 소리가 나지 않을 수 있습니다.

화면을 한 번 클릭한 뒤 다시 진행하세요.

## 10. 자주 나는 오류

### 강사 비밀번호가 안 먹힐 때

Vercel Environment Variables에 아래 값이 있는지 확인합니다.

```text
TEACHER_PASSWORD=admin
```

환경변수를 추가한 뒤에는 Vercel에서 Redeploy를 해야 합니다.

### AI 문제가 생성되지 않을 때

아래를 확인합니다.

```text
GEMINI_API_KEY가 Vercel에 들어갔는지
API Key를 GitHub 코드에 직접 넣지 않았는지
환경변수 추가 후 Redeploy 했는지
```

### Firebase 연결 경고가 나올 때

`index.html` 안의 `firebaseConfig`에서 `PASTE_...` 값을 실제 Firebase 값으로 바꿨는지 확인합니다.

### 학생 입장이 안 될 때

- Firebase Authentication에서 Anonymous 로그인이 켜져 있는지 확인합니다.
- Realtime Database Rules가 게시되었는지 확인합니다.
- 학생이 같은 배포 링크로 들어왔는지 확인합니다.

## 11. 보안 메모

이 버전은 초보 선생님이 쉽게 배포하고 테스트할 수 있도록 단순화했습니다.

더 안전한 운영이 필요하면 다음을 추가로 적용해야 합니다.

- Firebase Rules 강화
- 강사 hostUid 보호
- 학생이 score, current, gameStatus, ranking을 직접 수정하지 못하게 제한
- App Check 적용 검토
