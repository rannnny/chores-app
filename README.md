# 집안일 공유 🧺

부부가 함께 집안일을 등록하고, 처리 주기를 관리하고, 누가 언제 했는지 기록하는 모바일 우선 웹앱(PWA)입니다.

## 기능

- 집안일 등록 (반복 작업 / 1회성 작업)
- 처리 주기 설정 → 마지막 처리일 기준으로 다음 할 일을 달력에 자동 표시
- 기한 지난 할 일 강조 표시
- 처리할 때 누가 했는지 + 메모 기록
- 처리 이력 보기 (집안일별 필터)
- 월별 처리 통계 (누가 몇 번 했는지)
- 계정별 로그인 (Supabase Auth)
- 홈 화면에 추가하면 앱처럼 실행되는 PWA

## 처음 설정하기 (필수)

### 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 새 프로젝트 생성
2. 프로젝트의 **SQL Editor**에서 [supabase_schema.sql](supabase_schema.sql) 내용을 전체 실행
3. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사

### 2. 환경변수 설정

`.env.example`을 `.env.local`로 복사하고 값을 채워 넣습니다.

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=복사한 Project URL
VITE_SUPABASE_ANON_KEY=복사한 anon public 키
```

### 3. 이메일 확인 끄기 (선택, 둘이서만 쓰는 앱이라 추천)

Supabase 대시보드 → **Authentication → Providers → Email**에서
"Confirm email"을 꺼두면 가입 즉시 로그인됩니다. 켜두면 가입 후 이메일 인증 링크를 눌러야 합니다.

### 4. 실행

```bash
npm install
npm run dev
```

휴대폰에서 같은 와이파이로 접속하려면 `npm run dev` 실행 후 터미널에 표시되는
`Network` 주소(예: `http://192.168.x.x:5173`)로 접속하세요.

### 5. 배포 (예: Vercel)

```bash
npm run build
```

Vercel에 새 프로젝트로 연결하고, 위 환경변수 2개를 Vercel 프로젝트 설정에도 똑같이 등록하면 됩니다.
배포된 주소를 휴대폰에서 열고 "홈 화면에 추가"하면 앱처럼 쓸 수 있어요.

## 계정 만들기

앱을 열고 "계정이 없나요? 가입하기"에서 이름/이메일/비밀번호로 각자 계정을 만들면 됩니다.
두 사람 모두 같은 집안일 목록을 보고 처리할 수 있어요.

## 디자인 참고

- 아이콘(`public/icon-192.png`, `public/icon-512.png`)은 임시로 다른 프로젝트 아이콘을 가져다 썼습니다. 원하는 아이콘으로 교체하세요.
- 테마 컬러는 틸/민트(`#0d9488`)입니다. `vite.config.ts`의 `manifest.theme_color`와 `index.html`의 `theme-color`에서 바꿀 수 있습니다.
