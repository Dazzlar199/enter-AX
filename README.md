# Enter-AX

지원자의 오디션 프로필 등록부터 검증된 엔터사의 탐색·컨택·후보 운영, Hermes-ready AX 작업 관제와 홍보 콘텐츠 준비까지 연결하는 엔터테인먼트 AX 데모입니다.

## 실행

```bash
npm install
npm run dev
```

검증 명령:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## 실행 모드와 데이터 경계

- 기본값인 `NEXT_PUBLIC_BACKEND_MODE=demo`에서는 로그인과 데이터베이스 없이 브라우저 저장소를 사용합니다.
- `NEXT_PUBLIC_BACKEND_MODE=api`에서는 커뮤니티 세션·게시글·댓글·신고가 PostgreSQL에 저장됩니다.
- 지원자 온보딩에서 선택한 사진과 영상은 브라우저 객체 URL로만 미리보며 서버로 전송하지 않습니다.
- 엔터사용 콘텐츠 자동화 화면에서 명시적으로 선택한 영상은 `/api/content/process`로 전송되어 처리됩니다.
- `GEMINI_API_KEY`를 설정하면 문서 분석·숏폼 기획·나레이션 문구/음성 생성이 Google Gemini API로 전송되어 처리됩니다. 키가 없으면 로컬 Ollama를 사용합니다(`.env.example` 참고).
- 콘텐츠·지원자 분석·문서 AX 라우트는 배포 환경에서 기획사 로그인(API 모드) 또는 `ENABLE_CONTENT_AUTOMATION=true`가 있어야 호출됩니다.
- YouTube는 공식 임베드 재생 전용이며 다운로드·캐시·분리 분석하지 않습니다.
- 자동 합격·탈락과 외모 점수화는 제공하지 않습니다.
- 가상 AI 결과에는 `데모` 또는 `API 연동 예정`을 표시합니다.

## 향후 Hermes 경계

웹 UI는 작업 생성과 사람 승인을 담당하고, 정책 계층 뒤의 Hermes 런타임이 회사별 스킬과 MCP/API 도구를 실행하도록 설계했습니다. 외부 발송·게시·지원자 상태 변경은 기본적으로 사람 승인을 요구합니다.

## PostgreSQL 백엔드

```bash
npm run db:up -- --wait
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server
```

로컬 역할, RLS, Preview 활성화와 롤백 절차는 [`docs/backend-foundation.md`](docs/backend-foundation.md)를 참고하세요.

## 업그레이드 방향

[`docs/enter-ax-upgrade-direction-2026-10-01.md`](docs/enter-ax-upgrade-direction-2026-10-01.md)를 참고하세요.

## 배포

작업 브랜치를 Vercel Preview로 먼저 배포해 전체 흐름과 반응형 화면을 확인합니다. Preview 승인 전에는 Production을 교체하지 않습니다.
