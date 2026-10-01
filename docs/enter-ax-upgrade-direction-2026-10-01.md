# ENTER—AX 업그레이드 방향 (2026-10-01)

관련: `enter-ax-upgrade-roadmap-2026-09-30.md`(단계 지도), `enter-ax-enterprise-product-spec-2026-10-01.md`(4대 모듈 명세). 이 문서는 두 문서를 대체하지 않고, **오늘 코드 점검 결과로 우선순위와 결정 사항을 갱신**한다.

## 1. 한 줄 방향

> **"데모를 실제 파일럿으로"** — 브라우저 저장소·로컬 도구에 의존하는 기능을 서버(PostgreSQL + Gemini)로 옮기고, 기획사 1~3곳이 실제 지원자 데이터로 쓸 수 있는 상태를 만든다. 신기능(A&R, 육성 모듈)은 그 뒤에 얹는다.

## 2. 오늘 확정한 기술 결정

| 항목 | 결정 | 비고 |
|---|---|---|
| LLM | **Gemini API 기본**, Ollama는 로컬 대체 | `src/lib/ai/llm.ts` 한 곳에서 분기. 키는 `GEMINI_API_KEY` |
| 음성(TTS) | Gemini TTS(키 있을 때), 없으면 macOS `say` | 서버(Vercel)에서도 나레이션 생성 가능 |
| 자동화 라우트 접근 | 로컬은 개방, 프로덕션은 **기획사 세션 필수**(API 모드) 또는 `ENABLE_CONTENT_AUTOMATION=true` | `src/server/http/automation-guard.ts` |
| 서드파티 스킬 | git 추적 제외, `skills-lock.json`으로 재설치 | 저장소 용량 |
| 외부 전송 데이터 | 지원자 영상·문서는 **명시적 선택 시에만** Gemini로 전송 | README 데이터 경계에 반영 필요 |

## 3. 우선순위 (갱신)

### A. 지금 바로 (키 없이 가능)
1. **Gemini 키 발급 후 실검증** — `GEMINI_API_KEY`를 `.env.local`에 넣고 문서 분석·숏폼 기획·나레이션 3경로를 한 번씩 실행. (현재는 모킹 테스트만 통과)
2. **README 데이터 경계 갱신** — "Gemini로 전송되는 데이터" 항목 추가, 개인정보 처리방침 문구 초안.
3. **AI 호출 비용·한도 가드** — 기획사별 일일 호출 상한과 감사 로그(`audit_events`)에 모델 호출 기록.

### B. 파일럿 필수 (Phase 3 + 기획서 Phase 2)
1. **지원자·워크플로 데이터를 PostgreSQL로** — `LocalWorkflowStore`(localStorage) → Postgres 구현체. `WorkflowStore` 인터페이스가 이미 있어 클래스 하나 추가.
2. **미디어 스토리지(R2) 직접 업로드** — 영상은 서버를 거치지 않고 presigned URL로. Vercel 함수 용량·시간 제한 회피.
3. **영상 처리(ffmpeg·Whisper) 워커 분리** — Vercel 함수에서는 사실상 불가. 별도 워커(Fly.io/Railway 등)가 큐를 소비하는 구조. **배포 환경 결정(§4)에 의존.**
4. **미성년자 법정대리인 확인** — `GuardianVerificationProvider` 인터페이스 + 수동 확인 구현체부터.

### C. 그다음 (기획서 Phase 3~5)
A&R 데모 수신함 → 육성·월말평가 → 4대 탭 콘솔 통합. 이 단계는 B가 끝난 뒤 모듈별로 상세 계획을 작성한다.

### D. 지속 작업
- 기획사 UI 버튼 게이팅을 화면별로 확대(현재 1건).
- 히스토리 용량 정리(필요 시 `git filter-repo`, 협업자 동의 후).
- 번들 점검: `@huggingface/transformers`, `ffmpeg-static`은 서버 전용인지 `npm run analyze`로 확인.

## 4. 결정이 필요한 것

| # | 질문 | 권장 |
|---|---|---|
| 1 | 배포: Vercel 단독 vs Vercel + 별도 워커 | **Vercel(웹) + 소형 워커(영상 처리)**. 웹은 지금 구조 유지 |
| 2 | Gemini 사용 시 지원자 영상의 해외 전송 동의 | 지원자 동의 문구 + 기획사 계약서 반영 필요 (법률 확인) |
| 3 | 프로덕션 자동화 라우트 | 파일럿 기간은 세션 필수. `ENABLE_CONTENT_AUTOMATION`은 단일 테넌트 데모에서만 |
| 4 | 비용 상한 | 기획사당 월 호출 예산(예: 기본 플랜 N회) 정의 후 가드에 반영 |

## 5. 완료 기준 (파일럿 준비 완료)
- 기획사 1곳이 로그인해 지원자 등록 → 검토 → 제안까지 **새로고침·다른 기기에서도 데이터 유지**.
- 숏폼/문서 AI 기능이 서버에서 키 하나로 동작, 실패 시 사용자 친화 메시지.
- 다른 기획사 데이터 접근 403 + 감사 로그, 열람 전용 계정은 쓰기 버튼 비활성.
- `npm run check`와 e2e 통과, 배포 Preview에서 전체 흐름 확인.
