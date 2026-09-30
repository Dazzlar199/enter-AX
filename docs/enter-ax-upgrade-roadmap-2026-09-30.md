# ENTER—AX 업그레이드 마스터 로드맵 (2026-09-30)

관련 문서: `docs/ax-product-plan-2026-09-24.md`(제품 기획), `docs/ax-functional-direction-2026-09-23.md`(기능 방향 조사), `docs/market-research-and-execution-playbook.md`(시장·영업 플레이북), `docs/backend-foundation.md`(현재 백엔드 운영 가이드)

이 문서는 위 기획 문서들이 이미 정한 "무엇을 만들 것인가"를 그대로 신뢰하고, **"지금 코드가 그중 어디까지 와 있는가"를 2026-09-30 기준으로 직접 검증**한 뒤(`tsc --noEmit`, `vitest run`, `eslint`, 주요 파일 코드 읽기), 남은 작업을 실행 가능한 단계로 순서 매긴 것이다. 기획을 다시 쓰지 않는다 — 기존 기획서의 우선순위(P0/P1/P2)를 그대로 쓰고, 각 항목이 "아직 코드에 없다"는 것을 파일 경로로 재확인했다.

## 검증된 현재 상태 (2026-09-30)

| 검사 | 결과 |
|---|---|
| `npm run typecheck` | 통과 |
| `npm test` | 110 passed / 4 skipped (43 files) — 스킵된 4개는 로컬 Postgres 필요한 통합 테스트 |
| `npm run lint` | 0 errors, 129 warnings (전부 `.agents/skills/ppt-master` 벤더 코드, 앱 코드 아님) |
| yt-dlp 다운로드 (R1) | 아직 살아있음 → 이 로드맵의 **Phase 1**로 분리, 상세 실행 계획 완성됨 |
| 기획사 로그인/역할 (P0-1) | 완료 (2026-09-30) — `docs/superpowers/plans/2026-09-30-agency-tenancy-phase2.md`. 실행 중 `lookup_session`의 RLS 갭(002)과 `revokeSession`의 SELECT 권한/정책 갭(004, 005)도 함께 발견·수정됨 — 자세한 내용은 `docs/backend-foundation.md`의 "Agency staff login" 섹션 참고. |
| 워크플로 서버 저장 (P0-2) | `LocalWorkflowStore`가 `window.localStorage`만 사용 (`src/features/workflows/store.ts:15`) |
| 워크플로 실행 API 인증 (P0-4) | `src/app/api/v1/workflows/execute/route.ts`는 Origin 체크 + IP rate limit뿐, 세션/테넌트 인증 없음 |
| 미성년자 법정대리인 확인 (P0-7) | `src/features/talent/validation.ts:37`, 자가신고 체크박스뿐 |
| Hermes 실행 엔진 | `src/features/hermes/runner.ts`의 `DemoAgentRunner`는 완전한 데모 스텁 |

---

## 0. 먼저 정할 것 (기획 결정 로그)

`docs/ax-product-plan-2026-09-24.md` §9가 이미 정리한 5개 결정 사항에 대한 권장안. 이 중 1번은 이미 답이 나왔다고 보고 Phase 1을 바로 실행 가능하게 만들었다. 나머지는 Phase 2~3 착수 전에 확정이 필요하다.

| # | 결정 사항 | 권장 | 이유 | 막는 것 |
|---|---|---|---|---|
| 1 | yt-dlp 제거 동의 | **제거** (기본값으로 진행) | 법적 리스크가 명확하고 대체 경로(업로드)가 이미 존재함 | 없음 — Phase 1 바로 실행 가능 |
| 2 | 배포 환경: Vercel 유지 vs 자체 서버 | **사용자 확인 필요** | 실행 엔진(pg-boss 자체 구현 vs Inngest)과 영상 처리 워커의 호스팅 방식이 갈림 | Phase 3(실행 엔진) 착수 전 |
| 3 | AI 요약: 로컬 Ollama 유지 vs 외부 API | **사용자 확인 필요** | 비용·개인정보 이전 문제. 지금은 `OLLAMA_HOST` 로컬 전제 | Phase 3 범위에 영향 |
| 4 | 파일럿 기획사가 쓰는 메신저 (Slack/카카오톡/이메일) | **사용자 확인 필요** | P0-6(승인 요청 전달)·P1-7(알림톡) 연동 우선순위 결정 | Phase 4 이후 |
| 5 | 법률 자문 시점 (AI 기본법, 미성년자) | **사용자 확인 필요** | P0-7·P0-8 착수 범위에 영향 | Phase 4 착수 전 |

---

## 1. 단계 지도 (Phase Map)

| Phase | 목표 | 대응 우선순위 | 선행조건 | 상세 계획 문서 | 규모(추정) |
|---|---|---|---|---|---|
| **1. 컴플라이언스 응급조치** | yt-dlp 다운로드 제거 | R1 | 없음 | `docs/superpowers/plans/2026-09-30-remove-ytdlp-download.md` (완성, 바로 실행 가능) | 1개 태스크, 수 시간 |
| **2. 기획사 계정·테넌시 배선** | 실제 로그인, 역할(관리자/캐스팅/열람전용), 데이터 분리 | P0-1 | 없음 (독립 착수 가능) | `docs/superpowers/plans/2026-09-30-agency-tenancy-phase2.md` (완료, 15개 태스크 전부 리뷰됨) | 완료 — 버튼 게이팅은 화면 1건만, 나머지는 Phase 5/6 |
| **3. 워크플로 서버화** | 저장을 DB로, 실행 API에 세션 인증 추가, 자격증명 보관함 | P0-2, P0-3, P0-4 | Phase 2 (누가 실행/승인했는지 알아야 함) + 배포환경 결정 | 미작성 | 대 (대기열 인프라 신규 도입) |
| **4. 미성년자 법정대리인 확인** | 자가신고 → PASS/NICE 등 실제 본인확인 연동 | P0-7 | 법률 자문 결과, 본인확인 벤더 계약 | 미작성 | 중 (외부 연동 의존) |
| **5. UI 업그레이드** | 에이전시 콘솔·지원자 포털·워크플로 에디터 시각 감사 및 개선 | 전반 | 각 화면의 기능이 확정된 뒤가 이상적이나, 디자인 시스템 정리는 지금 시작 가능 | 미작성 — 아래 §3 참고 | 중~대, 화면별 분할 |
| **6. 캐스팅·A&R 실무 기능** | 오디션 공고, 셀프테이프, 평가표, 데모 수신함 | P1-1~9, P2 | Phase 2, 3 | 미작성 | 대, 모듈별 분할 |

**왜 Phase 1만 지금 완전히 상세화했는가:** `writing-plans` 스킬의 원칙대로, 서로 독립적인 서브시스템을 하나의 거대한 계획에 몰아넣지 않았다. Phase 1은 의존성이 없고 범위가 명확해 바로 실행 가능한 TDD 계획으로 완성했다. Phase 2 이후는 위 표의 "선행조건"이 실제로 걸려 있어서, 지금 세부 스텝을 쓰면 결정이 바뀔 때마다 계획 전체를 다시 써야 한다 — 착수 시점에 그 단계만 골라 상세 계획을 요청하면 같은 방식으로 즉시 작성한다.

---

## 2. Phase 2~4 개요 (착수 시 상세 계획 필요)

### Phase 2 — 기획사 계정·테넌시 배선 (P0-1)

- **이미 있는 것:** `src/server/identity/{model,repository,service,token}.ts` (세션 발급/검증/폐기, SHA-256 토큰 해시), `src/server/tenancy/service.ts`의 `TenancyService.requireMembership(userId, tenantId, allowedRoles, requestId)` (역할 기반 접근 거부 + 감사 로그까지 이미 구현됨), `db/migrations/001_backend_foundation.sql`의 `users`/`tenants`/`tenant_memberships`/`audit_events` 스키마.
- **상태: 완료 (2026-09-30).** 상세 계획은 `docs/superpowers/plans/2026-09-30-agency-tenancy-phase2.md`(15개 태스크, 전부 완료·리뷰됨). `tenant_staff_profiles`(이메일 + scrypt 비밀번호 해시, `db/migrations/003_agency_accounts.sql`)를 신규 추가해 `/agency/login`에서 실제 로그인이 동작한다. 셀프서비스 가입/초대는 여전히 범위 밖 — 파일럿 기획사별 최초 계정은 `scripts/create-agency-account.mjs` 운영자 CLI로만 발급한다(§0 결정 #4, 초대 전달 채널 미확정과 연결된 의도적 보류). `src/server/container.ts`가 이제 `TenancyService`를 생성해 배선하며, 이미 구현·테스트돼 있던 `TenancyService.requireMembership`(역할 기반 403 + 감사 로그)을 실제 HTTP 경로가 처음으로 호출하게 됐다. 역할 게이팅 UI는 `TalentReview.tsx`의 열람전용 사용자용 "오디션 제안 보내기" 버튼 비활성화로 1건 구현됨 — 나머지 화면(승인·연락·게시 버튼 등)은 Phase 5/6에서 화면별로 이어서 적용.
- **완료 기준(기획서 그대로):** 다른 기획사 데이터에 접근하면 403이 나고 감사 로그에 남는다. 열람 전용 사용자는 승인·연락·게시 버튼이 비활성이다. (위 상태 참고: 403+감사 로그는 기존 `TenancyService` 동작을 재사용해 충족됐고, 버튼 비활성화는 1건만 구현되어 나머지는 Phase 5/6 대상으로 남음.)
- **디자인 영향:** 로그인 화면은 구현됨(`/agency/login`). 역할 배지 UI, 나머지 화면의 버튼 게이팅은 Phase 5(UI 업그레이드)에서 이어간다.
- **브랜치 위생 주의:** 이 Phase의 일부 태스크가 커밋한 파일(예: `AgencyConsoleShell.tsx`, `TalentReview.tsx`)은 이 작업 이전부터 이 브랜치에 커밋되지 않은 채 존재하던 대규모 기존 작업의 일부였다. 특히 `TalentReview.tsx`는 여전히 미추적 상태인 `DanceAnalysisPanel.tsx`, `VocalAnalysisPanel.tsx`, `src/features/talent/cover.ts`를 import한다. 즉 이 Phase가 만든 개별 커밋 하나만 따로 체크아웃하면 타입체크/빌드가 실패할 수 있다 — 브랜치 전체가 함께 커밋되기 전까지는 이 Phase의 개별 커밋을 안전한 롤백/bisect 지점으로 취급하지 말 것. 미추적 파일들을 커밋하는 것은 이 Phase의 범위 밖이라 의도적으로 손대지 않았다.

### Phase 3 — 워크플로 서버화 (P0-2, P0-3, P0-4)

- **이미 있는 것:** `WorkflowStore` 인터페이스(`src/features/workflows/store.ts:6-10`)가 이미 저장 방식을 추상화해둬서 Postgres 구현체 추가가 곧 이 인터페이스의 새 클래스 하나로 끝난다. `src/server/workflows/execute.ts` + `net-guard.ts`(내부망 차단, 15초/1MB 제한)는 이미 프로덕션 수준.
- **없는 것:** 대기열 라이브러리(`package.json`에 pg-boss/BullMQ/Inngest 전무) — 기획서 권장대로 Postgres 대기열(pg-boss류)이 1순위. `/api/v1/workflows/execute`에 세션 인증 없음(Origin 체크뿐). 자격증명(Slack webhook 등)이 브라우저 평문 저장.
- **의존성:** Phase 2가 끝나야 "누가 승인했는가"를 기록할 수 있음. §0의 결정 #2(배포 환경)가 대기열 구현체 선택을 좌우함.
- **완료 기준(기획서 그대로):** 새 지원서 도착 → 자료 점검 → 누락 시 보완 요청(승인 후) 흐름이 사람의 개입 없이 돈다. 승인만 사람이 한다.

### Phase 4 — 미성년자 법정대리인 확인 (P0-7)

- **이미 있는 것:** `src/features/talent/validation.ts:37`의 자가신고 체크박스, `OnboardingForm.tsx`의 동의 UI.
- **없는 것:** 생년월일 기반 만 14세 자동 판정, PASS/NICE 등 실제 본인확인 API 연동, 미확인 시 프로필 비공개 처리.
- **의존성:** §0 결정 #5(법률 자문), 본인확인 벤더 계약(KG이니시스/다날 등, 기획서 §6 비용표 참고).
- **설계 팁:** 벤더를 나중에 바꿀 수 있도록 `GuardianVerificationProvider` 인터페이스를 먼저 정의하고, 초기엔 수동 확인(운영자가 전화 확인 후 승인) mock 구현체로 시작해 실제 법률 검토가 끝나기 전에도 나머지 파이프라인(비공개 처리, 삭제 처리)을 먼저 테스트할 수 있게 하는 것을 권장.

---

## 3. Phase 5 — UI 업그레이드 (ui-taste 스킬 기반)

`ui-taste` 스킬의 `operate`(제품/대시보드) 플레이북과 `audit` 체크리스트를 이번 단계의 기준으로 쓴다. 확인한 현재 상태:

- 디자인 토큰 체계는 이미 성숙하다 — `src/app/globals.css`(3,597줄)에 `--bg-*`, `--text-*`, `--accent-*`, `--shadow-*`, `--font-*` 토큰이 정의돼 있고, 커뮤니티(warm 테마, 2631줄)·에이전시(cool 테마, 3333줄) 등 섹션별 오버라이드까지 이미 존재한다. **즉 "백지에서 디자인 시스템 만들기"가 아니라 "이미 있는 시스템을 기준으로 감사(audit)→다듬기(polish)"가 맞는 접근이다.**
- `operate.md`의 원칙 그대로 이 프로젝트에 적용: 정보 위계(지금 위치·주 작업·다음 행동)가 명확한지, 카드/테두리 남용 대신 여백·정렬로 그룹핑하는지, 로딩/빈 화면/에러/성공/비활성 상태가 화면마다 빠짐없이 있는지, 반응형에서 내비게이션이 구조적으로 접히는지를 화면별로 점검한다.

### 실행 순서

1. **감사(Audit) 먼저, 수정은 나중.** `run` 또는 `browse`/`gstack` 스킬로 `npm run dev`를 띄우고, 데스크톱·모바일 대표 크기에서 아래 화면들을 실제로 렌더링해 `audit.md` 체크리스트(작업 명확성, 기존 시스템과의 일관성, 레이아웃/오버플로/반응형, 상태 피드백, 라벨·포커스·대비, 명백한 성능 문제)로 점검한다. 이 문서는 코드만 읽고 "화면이 이럴 것이다"라고 추정하지 않는다 — 실제 렌더링 확인이 필요하다.
2. **점검 대상 화면 (우선순위순):**
   - `src/app/agency/page.tsx` + `src/components/agency/console/*` — 에이전시 콘솔 홈. Phase 2 로그인/역할 UI가 여기 붙을 예정이라 먼저 감사.
   - `src/components/agency/workflow-editor/*` — 워크플로 에디터. Phase 3에서 서버 저장·자격증명 UI가 추가되므로, 지금 상태 일관성부터 확인.
   - `src/app/talent/*` (`page`, `onboarding`, `profile`, `offers`) — 지원자 포털. Phase 4의 법정대리인 확인 플로우가 온보딩에 붙을 예정.
   - `src/components/agency/ContentWorkflow.tsx` — Phase 1 완료 직후라 변경된 채널 영상 카드(안내 문구로 교체됨)의 시각 확인이 필요.
3. **발견한 문제는 배치로 고친다.** `craft.md`(구현 가이드)를 적용해 한 화면씩 고치고, 고친 뒤 다시 렌더링해 확인한다. 요청 범위 밖의 "이미 잘 동작하는" 영역은 재설계하지 않는다(operate.md의 원칙).
4. **신규 화면(로그인/초대, 역할 배지, 평가표, 셀프테이프 요청 등)은 `new-work.md` 플레이북**으로 별도 설계한다 — 기존 화면 감사와는 다른 트랙이다.

### 완료 기준

- 데스크톱(1440px)·모바일(390px) 대표 크기에서 각 화면의 로딩/빈 화면/에러 상태가 실제로 렌더링되어 확인됨.
- 에이전시 콘솔과 워크플로 에디터가 동일한 컴포넌트 어휘(버튼, 카드, 배지 스타일)를 공유함 — 현재 두 영역이 다른 색 토큰(cool vs 기본)을 쓰고 있어 의도된 구분인지 비일관성인지 감사 단계에서 확정 필요.
- Phase 1에서 교체한 `.channel-video-hint` 같은 신규 UI 조각이 기존 카드 컴포넌트 어휘와 맞는지 확인.

---

## 4. 실행 방식

각 Phase 착수 시:

1. **결정이 걸린 항목(§0)은 먼저 사용자에게 확인.**
2. `writing-plans` 스킬로 그 Phase 전용 상세 계획을 `docs/superpowers/plans/YYYY-MM-DD-<phase-name>.md`에 작성 (Phase 1과 동일한 형식 — 파일 경로, 실제 코드, TDD 스텝).
3. 계획 완료 후 실행 방식 선택: **Subagent-Driven**(태스크마다 새 서브에이전트 + 2단계 리뷰, 권장) 또는 **Inline**(이 세션에서 배치 실행 + 체크포인트).

**지금 바로 실행 가능한 것은 Phase 1 하나뿐이다.** Phase 2는 §0 결정 없이도 착수 가능하니, 원하면 다음으로 Phase 2의 상세 계획을 바로 작성할 수 있다.
