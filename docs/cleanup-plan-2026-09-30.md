# Enter-AX 저장소 정리 기획서 (2026-09-30)

> **완료됨 (2026-09-30).** 아래 항목은 전부 같은 날 세션 내에서 실행 완료된 이력입니다 — 더 이상 할 일 목록이 아니라 기록용 문서입니다. 이후 Phase 2(기획사 계정·테넌시) 작업 중 진행된 추가 정리는 `docs/superpowers/plans/2026-09-30-agency-tenancy-phase2.md`와 `docs/backend-foundation.md`를 참고하세요.

실제 파일 참조 여부(grep), git 추적 여부(`git ls-files`/`git status`), 디스크 사용량(`du`)을 직접 확인해서 얻은 결과만 담았습니다. 이 문서는 **계획**으로 작성됐으나, 아래 항목은 모두 실행 완료되었습니다.

---

## 🔴 0. 즉시 조치 — 보안 (가장 먼저 처리)

**`deepseek_chat.py` (저장소 루트)에 NVIDIA API 키가 하드코딩된 fallback 값으로 박혀 있습니다.**

```python
api_key=os.environ.get("NVIDIA_API_KEY", "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")
```

- 현재는 git에 커밋되지 않은 untracked 파일이라 아직 원격에 노출되진 않았지만, `git add -A` 한 번이면 그대로 커밋되어 영구 노출됩니다.
- **조치**: ① 해당 키를 NVIDIA 콘솔에서 즉시 폐기(rotate), ② 이 파일은 앱 코드와 무관한 개인 실험용 스크립트이므로 저장소에서 제거하거나 최소한 하드코딩된 키 값을 삭제하고 `.gitignore`에 등록.

---

## 1. 디스크를 크게 잡아먹는 재생성 가능 산출물

| 대상 | 용량 | 상태 | 판단 근거 |
|---|---|---|---|
| `artifacts/` | **552MB**, 717개 파일 | untracked, `.gitignore` 미등록 | `scripts/verify-ir-deck.mjs`가 만드는 QA 스크린샷/PDF 출력. `ir-deck-color-interior`, `ir-deck-color-interior-final`, `ir-deck-color-interior-v2`, `ir-deck-contact-diagram/-final/-partnership/-visual/-visual-final` 등 같은 슬라이드를 반복 QA하며 쌓인 폴더가 **정리 없이 계속 누적**됨. 스크립트가 `--output=` 인자로 새 폴더를 매번 만들 뿐 이전 결과를 지우지 않음. |
| `.worktrees/enter-ax-build` | **667MB** | 별도 git worktree, 브랜치 `enter-ax-build` | 마지막 커밋이 **2026-09-16** (`test: verify Enter-AX end-to-end experience`), working tree는 clean 상태. 현재 작업 브랜치(`enter-ax-design`)와 목적이 겹치는 옛 실험 브랜치로 보임. 계속 필요한지 직접 확인 필요. |
| `.venv` + `venv` | 53MB + 53MB (총 106MB) | untracked, 둘 다 `.gitignore` 미등록 | 이름만 다른 **완전 중복 파이썬 가상환경**. 어느 스크립트도 `venv/`나 `.venv/`를 명시적으로 가리키지 않음(`CAPCUT_PYTHON_BIN=.venv-capcut/bin/python`처럼 전용 venv만 참조). 둘 다 실수로 생긴 흔적일 가능성이 높음. |
| `.venv-vision` | **981MB** | gitignore됨 (정상) | MediaPipe 등 비전 분석용 전용 venv. 용도는 있지만 저장소 옆에 1GB 가까운 로컬 환경이 있다는 점은 인지 필요 (삭제 대상 아님, 참고용). |
| `video/` | 45MB, mp4 4개 | untracked | 코드/스크립트 어디서도 이 폴더를 참조하지 않음(`"video/mp4"` 같은 MIME 타입 문자열과 혼동 주의 — 실제로는 무관). 개인 원본 촬영본으로 보이며 저장소에 있을 이유가 없음. |

**권장**: `artifacts/`는 `.gitignore`에 추가 + 로컬에서 최신 라운드만 남기고 정리. `.worktrees/enter-ax-build`는 필요 여부 확인 후 `git worktree remove`. `venv`와 `.venv` 중 하나는 삭제. `video/`는 저장소 밖 별도 스토리지로 이동.

---

## 2. 저장소 루트의 개인/스크래치 파일

`src/`, `docs/`, `scripts/` 등 실제 프로젝트 구조와 무관하게 루트에 흩어져 있고, 코드 어디에서도 참조되지 않는 파일들입니다.

- `mochang_business plan_guide .pdf` (2.3MB) — "모창" 관련 무관한 사업계획 PDF
- `기획서.md` (32KB), `사업계획서_모두의창업.md` (36KB), `이미지생성프롬프트.md` (16KB) — 개인 기획 메모. 실제 프로덕트 문서는 이미 `docs/`에 정리되어 있어 중복
- `deepseek_chat.py` — 위 0번 보안 이슈의 원인 파일, 앱 코드와 무관한 CLI 챗봇 실험 스크립트

**권장**: 저장소 밖(개인 노트/Notion 등)으로 이동하거나 삭제. 계속 참고할 거라면 최소한 `docs/personal/` 등으로 격리하고 `.gitignore` 처리.

---

## 3. 중복/사용되지 않는 설정 파일

- **`.eslintrc.json` (레거시 ESLint 설정)** vs **`eslint.config.mjs` (ESLint 9 flat config, devDependencies의 `"eslint": "^9"`가 실제로 읽는 설정)**. 두 설정이 다른 규칙 세트를 갖고 있어 혼란만 유발 — `.eslintrc.json`은 flat config 환경에서 사실상 죽은 파일. **삭제 권장.**
- **`package.json`의 `"export": "next build && next export"` 스크립트** — Next.js 15에서는 `next export` CLI 명령이 제거되었고, `next.config.js`에도 `output: "export"` 설정이 없음. 지금 실행하면 실패하는 **깨진 스크립트**. 삭제하거나 static export가 필요하면 `next.config.js`에 `output: "export"`를 추가하는 방식으로 전환.
- **`next.config.ts` → `next.config.js`**: 이미 현재 브랜치 diff에서 `D next.config.ts` / `M next.config.js`로 정리 진행 중. 방향은 맞으나 **아직 커밋되지 않은 상태**이니 최종 커밋 시 남겨진 `.ts` 잔재가 없는지 확인.

---

## 4. 이미 진행 중인 삭제 — 커밋만 남음

현재 브랜치 diff에 아래 삭제가 스테이징 대기 중이며, 코드베이스 전체를 grep한 결과 **남아있는 참조가 없어 안전하게 커밋 가능**합니다.

- `src/components/agency/AgentJobPanel.tsx` / `.test.tsx`
- `src/components/marketing/Hero.tsx`, `AxFlow.tsx`, `ProductProof.tsx`

→ 별도 조치 불필요, 다음 커밋에 포함시키면 됩니다.

---

## 5. IR 덱 디자인 에셋 중 미사용 파일

`assets/deck/` 안의 34개 이미지 중 `ir-deck.html`이 실제로 `<img src="assets/deck/...">`로 참조하는 파일은 14개뿐입니다. 나머지 20개는 디자인 반복 과정에서 남은 버전들로 보입니다.

미참조 확인된 파일: `agency-workflow-map-v1.png`, `anonymous-performer-portrait-v1.png`, `casting-pipeline.png`, `competitor-cyanite.png`, `competitor-disco.png`, `competitor-opusclip.png`, `cover-agency-current.png`, `cover-community-current.png`, `cover-hero.png`, `cover-hero-v2.png`, `cover-hero-white-v3.png`, `dance-choreo-analysis.png`, `live-audition-demo.png`, `logo-hybe.svg`, `logo-sm.png`, `logo-sm.svg`, `solution-panorama-v1.png`, `source-kocca-registry.png`, `source-newsis-content-industry.png`, `talent-community-board.png`, `talent-profile-card-crop.png`, `talent-profile-card.png`, `vocal-pitch-analysis.png`, `workflow-color-v1.png`, `workflow-native-preview.png`, `workflow-summary.svg`

(`ax-command-center.png`만 예외 — `ir-deck.html`엔 없지만 `pitch-decks/05_...md` 기획 문서에서 참조하므로 보류 권장)

**권장**: 향후 덱 리디자인에 쓸 게 아니라면 `assets/deck/archive/`로 옮기거나 삭제. 최소한 git에 커밋하기 전에 정리.

---

## 6. `docs/` 폴더 문서 스프롤

일주일 사이 비슷한 성격의 로드맵/기획 문서가 3개 생성되어 어느 게 최신 기준인지 불명확합니다.

- `docs/ax-functional-direction-2026-09-23.md`
- `docs/ax-product-plan-2026-09-24.md`
- `docs/enter-ax-upgrade-roadmap-2026-09-30.md` (가장 최신)

**권장**: 가장 최신 문서를 "현재 기준"으로 명시하고, 나머지는 `docs/archive/`로 옮겨 이력으로만 남기기. (내용 삭제가 아니라 위치 정리만 제안합니다 — 실제로 유용한 의사결정 기록일 수 있어 삭제는 권하지 않습니다.)

---

## 7. `.env.example` 누락 항목

`.env.local`에 실제로 쓰이는 변수 중 `.env.example`에 없는 항목이 있어 신규 셋업 시 빠뜨리기 쉽습니다.

- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_OAUTH_REDIRECT_URI` — `src/lib/auth/youtube.ts`에서 실제 사용
- `NVIDIA_API_KEY` — 0번 이슈의 `deepseek_chat.py`에서만 사용 (해당 스크립트를 없애면 이 변수도 자연히 불필요)

**권장**: YouTube OAuth 3종은 `.env.example`에 빈 값으로 추가.

---

## 실행 우선순위 제안

1. **NVIDIA API 키 즉시 폐기** (보안, 지금 바로)
2. `artifacts/`를 `.gitignore`에 추가 + 로컬 정리, `.worktrees/enter-ax-build` 필요 여부 확인 후 제거
3. `venv`/`.venv` 중복 제거, `video/` 및 루트 개인 파일 이동
4. `.eslintrc.json` 삭제, `package.json`의 `export` 스크립트 삭제/수정
5. 진행 중인 컴포넌트 삭제 커밋 확정
6. `assets/deck/` 미사용 이미지 정리
7. `docs/` 로드맵 3종 정리, `.env.example` 보강

원하시면 이 순서대로 하나씩(또는 한번에) 실제로 적용해 드릴 수 있습니다.
