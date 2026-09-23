# Enter-AX IR Deck Redesign

**Date:** 2026-09-23
**Status:** Design approved in conversation; implementation pending written-spec review
**Primary artifact:** `ir-deck.html`
**Audience:** 발표·지원사업 심사위원을 기본 독자로 하되 초기 투자자도 이해할 수 있는 혼합형 IR 덱

## 1. Objective

기존 IR 덱을 부분적으로 다듬지 않고, 주장 구조와 시각 시스템을 함께 다시 설계한다. 새 덱은 Enter-AX를 이미 시장 지배력을 가진 플랫폼처럼 보이게 하지 않는다. 대신 다음 세 가지를 짧고 명확하게 증명한다.

1. 국내 엔터테인먼트 실무에는 분절된 수작업이 많다.
2. Enter-AX는 지원자 접수·사람 중심 검토·콘텐츠 실행을 연결하는 실제 작동 프로토타입을 보유한다.
3. 초기 고객 검증을 거쳐 엔터테인먼트 운영 OS로 확장할 수 있는 사업 구조가 있다.

성공 기준은 화려함이 아니라 신뢰감이다. 발표자가 설명하지 않아도 각 슬라이드의 결론이 3초 안에 보이고, 발표를 들으면 근거와 확장 논리가 연결되어야 한다.

## 2. Why the Current Deck Fails

현재 `ir-deck.html`은 개별 슬라이드의 정렬과 기본 타이포그래피는 안정적이지만 IR 문서로서는 다음 문제가 있다.

### 2.1 Narrative failure

- 아직 존재하지 않는 양면 네트워크 효과를 이미 확보한 해자처럼 표현한다.
- 시장의 문제를 고객 인터뷰나 실제 업무 데이터보다 추정과 일반론으로 설명한다.
- `Traction`이 없는데 가격, 마진, 80개사 ARR 목표로 곧바로 이동한다.
- 제품 범위를 캐스팅, A&R, 매니지먼트, 콘텐츠까지 동시에 제시해 초기 진입점이 흐려진다.
- 엔지니어링 프로토타입과 시장 검증을 구분하지 않는다.
- 투자 요청 금액과 이를 통해 달성할 검증 목표가 확정되지 않았다.

### 2.2 Evidence failure

- 등록 기획사 약 4,000개라는 수치는 최신 KOCCA 데이터와 맞지 않는다.
- SAM 1,500개사와 80개사 SOM은 출처가 아니라 사업 가정이다.
- 단위경제성은 실제 운영비가 아니라 아키텍처 가정이다.
- 화면 안의 지원자, 제안, 합격 후기, 운영 수치는 데모 픽스처지만 실제 지표처럼 보일 수 있다.
- 경쟁사 범위를 축소해 Enter-AX만 통합과 자동화를 제공하는 것처럼 보인다.

### 2.3 Visual failure

- 여러 장이 제목 + 박스 + 작은 본문이라는 같은 문법을 반복한다.
- 제품 스크린샷이 너무 작아 실제 작동 증거로 읽히지 않는다.
- 표와 카드의 정보 밀도가 높지만 시선이 먼저 가야 할 단일 메시지가 약하다.
- 파란색 SaaS 템플릿 인상이 강해 엔터테인먼트 산업의 맥락과 창업자의 관점이 드러나지 않는다.
- 시장 동심원, 그라데이션, 범용 아이콘은 AI 생성 사업계획서와 비슷한 인상을 준다.

## 3. Strategic Reframing

### 3.1 One-line definition

> 지원자 접수부터 사람의 최종 승인과 콘텐츠 실행까지 연결하는 중소·중견 엔터테인먼트사의 운영 레이어.

`엔터의 모든 실무를 하나의 OS로`는 장기 비전으로만 사용한다. 현재 제품 정의에는 구현된 범위와 초기 고객을 포함한다.

### 3.2 Beachhead before platform

초기 진입점을 다음 순서로 제시한다.

1. **Talent Intake & Review** — 지원자 프로필·미디어 접수, 분석 보조, 후보 파이프라인
2. **Content Operations** — 승인된 미디어의 숏폼 추출, 자막, CapCut/YouTube 전달
3. **Enterprise AX Expansion** — A&R 문서, 내부 승인, 회사별 업무 자동화

덱에서는 1과 2를 현재 제품, 3을 확장 로드맵으로 분리한다. A&R 표절 검수, 스플릿 시트, 투어 행정, 위기관리 등 미구현 기능은 현재 제품 슬라이드에 넣지 않는다.

### 3.3 Proof hierarchy

주장은 다음 강도 순서로 분류한다.

| Label | Meaning | Deck treatment |
| --- | --- | --- |
| `LIVE` | 코드와 로컬 실행으로 확인 | 제품 증거의 중심 |
| `TESTED` | 자동 테스트 또는 보안 테스트 통과 | 작은 근거 라벨 |
| `PROTOTYPE` | 데모 UI와 샘플 데이터로 동작 | 데모임을 명시 |
| `ASSUMPTION` | 가격, SAM, 비용, 전환율 가정 | 별색 라벨과 각주 |
| `TARGET` | 미래 고객 수와 매출 목표 | 타임라인에만 사용 |

`LIVE`, `ASSUMPTION`, `TARGET`을 같은 시각적 무게로 보여주지 않는다.

## 4. Core Story Architecture

본편은 12장, 발표 시간은 8~12분을 기준으로 한다. 장당 하나의 결론만 둔다.

### Slide 1 — Cover

**Headline:** 인재 발견부터 콘텐츠 실행까지, 엔터사의 운영을 연결합니다.
**Subline:** 중소·중견 엔터테인먼트사를 위한 Human-in-the-loop AX workflow
**Visual:** 여백이 큰 표지, 실제 파이프라인을 암시하는 하나의 연결선
**Do not show:** Seed, ARR, 투자금처럼 아직 설명되지 않은 정보

### Slide 2 — Problem

**Headline:** 한 명의 실무자가 지원 영상, 후보표, 콘텐츠 파일 사이를 오갑니다.
**Visual:** 이메일/드라이브/스프레드시트/메신저가 한 담당자에게 몰리는 분절도
**Content:** 오디션 검토, 후보 상태 공유, 숏폼 제작의 세 구간만 사용
**Evidence rule:** 고객 인터뷰가 확보되기 전에는 시간 절감률이나 월 지원 건수를 쓰지 않는다.

### Slide 3 — Why Now

**Headline:** 시장은 커지고, 운영은 복잡해졌고, AI 도입은 이미 시작됐습니다.
**Visual:** 세 개의 큰 숫자를 하나의 가로 리듬으로 구성

- **6,629개사** — 2026-08-12 기준 정상 상태 대중문화예술기획업 등록기업
- **+15.8% / +32.4%** — 2025년 국내 대중음악산업 매출 / 수출 증가율
- **32.1%** — 2025년 4분기 콘텐츠사업체 생성형 AI 활용률

### Slide 4 — Solution Flow

**Headline:** AI는 먼저 정리하고, 사람은 판단하고, 시스템은 실행합니다.
**Visual:** 사용자 제공 Image #1을 내용 참고용으로만 사용하고 새 벡터 도형으로 재작성

```text
REGISTER → SCREEN → REVIEW → EXECUTE → APPROVE
프로필 등록   역량 분석   후보 검토   콘텐츠 실행   사람 승인
```

마지막 승인 단계만 라임색을 사용한다. 하단에는 `자동 합격·탈락 없음`을 짧게 명시한다.

### Slide 5 — Working Product

**Headline:** 핵심 분석과 콘텐츠 파이프라인은 실제 영상으로 동작합니다.
**Visual:** 세로로 작은 화면 여러 개를 나열하지 않고, 실제 UI 한 장을 60% 이상 크게 크롭한다. 오른쪽에는 세 개의 실행 결과만 둔다.

- Pose + beat analysis: 60초 샘플 약 14초
- Pitch DTW comparison: 동일 샘플 자기 비교 1.0, 약 21초
- Choreography DTW comparison: 동일 샘플 자기 비교 1.0, 약 11초

이 숫자는 품질 벤치마크가 아니라 로컬 실행 증거임을 명시한다.

### Slide 6 — Product Boundary

**Headline:** 지금 동작하는 것과 앞으로 확장할 것을 분리했습니다.
**Visual:** `NOW / NEXT / LATER` 세 구간의 얇은 로드맵

- NOW: 프로필, 후보 파이프라인, 포즈·피치·안무 비교, 숏폼 렌더링
- NEXT: 파일럿 운영, 권한/미디어 저장, 작업 큐, 비용 계측
- LATER: A&R·문서·메신저·스케줄러 자동화

### Slide 7 — Market

**Headline:** 첫 시장은 국내 6,629개 등록 기획사의 운영 소프트웨어입니다.
**Visual:** 동심원 대신 기준이 드러나는 수평 막대 또는 계단식 bottom-up 도표

| Layer | Calculation | Value | Evidence status |
| --- | --- | ---: | --- |
| Initial TAM | 정상 등록 6,629 × 연 1,110만 원 | 약 736억 원/년 | 기업 수 공식, ARPA 가정 |
| SAM | 초기 적합 고객 1,500 × 연 900만 원 | 약 135억 원/년 | 고객 수·ARPA 가정 |
| SOM | Starter 50 + Growth 25 + Enterprise 5 | 약 9.9억 원 ARR | 3년 목표 |

`TAM`을 전체 음악산업 규모와 혼동하지 않는다. 이 수치는 국내 초기 운영 소프트웨어 시장이다. 글로벌 확장 시장은 검증 가능한 자료를 확보한 후 부록에 추가한다.

### Slide 8 — Competitive Position

**Headline:** 개별 기능이 아니라 엔터사의 승인 흐름을 연결합니다.
**Visual:** 체크박스가 가득한 기능표 대신 고객 업무 기준의 2축 포지셔닝 또는 네 개의 카테고리 비교

비교 범주:

- 이메일·폼·스프레드시트
- 오디션·프로필 플랫폼
- 음악 카탈로그/A&R 도구 (예: DISCO, Cyanite)
- 범용 AI 영상 도구 (예: OpusClip)

Enter-AX의 주장:

- 한국 엔터 실무에 맞춘 지원자→후보→콘텐츠 연결
- 자동 결정이 아닌 사람 승인 중심
- 미디어 분석과 실행 결과가 같은 운영 화면에 남음

경쟁사의 우위도 명시한다: 기존 사용자 기반, 대규모 음악 카탈로그, 완성된 영상 편집 기능, 글로벌 레퍼런스.

### Slide 9 — Business Model

**Headline:** 초기 세팅과 반복 구독으로 회사별 운영 워크플로를 공급합니다.
**Visual:** 가격표 세 칸보다 고객→Enter-AX→서비스 제공의 돈의 흐름을 우선 표시

- Starter: 월 50만 원 + 세팅 100만 원
- Growth: 월 150만 원 + 세팅 300만 원
- Enterprise: 월 400만 원 이상 + 세팅 1,000만 원 이상
- B2C 진단 리포트 9,900원은 핵심 BM이 아니라 실험 후보로 부록 이동

가격은 `ASSUMPTION`으로 표시하고 고객 인터뷰와 파일럿에서 검증할 대상으로 둔다.

### Slide 10 — Validation and GTM

**Headline:** 다음 목표는 기능 추가가 아니라 첫 반복 가능한 고객 검증입니다.
**Visual:** 증거 사다리와 3단계 GTM

1. 기획사 실무자 인터뷰와 현재 업무 흐름 기록
2. 3~5개 파일럿에서 처리시간·승인율·재사용 측정
3. 유료 전환과 추천 가능한 도입 사례 확보

현재는 `Engineering proof` 단계다. 고객 인터뷰, LOI, 유료 계약이 없다면 빈 트랙션 그래프를 만들지 않는다.

### Slide 11 — Team and Execution

**Headline:** 산업 이해와 작동 프로토타입을 만들었고, 다음에는 고객 검증 역량을 보강합니다.
**Visual:** 얼굴 없는 직함 카드 대신 `필요 역량 → 현재 증거 → 보강 계획` 연결도
**Rule:** 대표 경력과 협업 실적은 사용자가 확인한 내용만 사용한다.

### Slide 12 — Closing Ask

현재 투자금과 사용 계획이 확정되지 않았으므로 금액을 임의 생성하지 않는다. 첫 버전은 다음 요청으로 끝낸다.

**Headline:** 첫 5개 기획사 파일럿을 함께 만들 파트너를 찾습니다.
**Ask:** 파일럿 기획사, 산업 자문, 초기 투자 논의
**Milestone:** 인터뷰 → 파일럿 → 유료 전환 근거 확보

투자금이 확정되면 동일 레이아웃을 `Seed Ask / Use of Funds / 12-month milestones` 버전으로 교체한다.

## 5. Visual Design System

### 5.1 Direction

`Swiss International × Editorial Operations System`을 사용한다. 정갈하고 공적인 신뢰감이 있으면서 실제 운영 제품의 구조를 드러내는 방향이다.

피해야 할 스타일:

- Glassmorphism와 블러 카드
- 파란색 다중 그라데이션
- 3D 또는 생성형 아이콘
- 모든 슬라이드의 3열 카드 반복
- 제목 아래 장식용 밑줄
- 장식 목적의 네온/HUD 요소

### 5.2 Palette

| Role | Color |
| --- | --- |
| Warm canvas | `#F6F5F1` |
| Paper white | `#FFFFFF` |
| Ink | `#141820` |
| Muted ink | `#626A78` |
| Cobalt | `#2864E8` |
| Pale blue | `#DCEAFF` |
| Human approval lime | `#C8F45D` |
| Risk orange | `#F06445` |
| Rule | `#D7DAE0` |

시각 비율은 아이보리/흰색 70%, 검정 20%, 코발트와 상태색 10% 이하로 제한한다.

### 5.3 Typography

- Korean title: Pretendard 800, fallback `Noto Sans KR`, 36–44pt equivalent
- Korean body: Pretendard 400/600, 15–18pt equivalent
- Data/label: `IBM Plex Mono` 또는 `Space Mono`, 9–11pt equivalent
- Large figures: 56–76pt equivalent
- Body copy: 한 슬라이드 45단어 내외를 목표로 한다.
- 모든 문장은 왼쪽 정렬한다. 표지와 단일 숫자만 예외적으로 중앙 정렬할 수 있다.

HTML 구현 전 설치된 폰트를 확인한다. 웹폰트가 없어도 레이아웃이 무너지지 않는 시스템 폰트 폴백을 제공한다.

### 5.4 Grid and spacing

- Canvas: 16:9, 1600×900 logical pixels
- Safe margin: 좌우 88px, 상하 64px
- Grid: 12 columns, 24px gutter
- Minimum gap: 28px
- Title area: 상단 20~24%
- Source footer: 하단 36px 전용 영역
- 카드 모서리: 0~8px, 대부분 직각
- 선: 1px 또는 2px만 사용

### 5.5 Signature devices

반복되는 디자인 요소는 네 가지만 사용한다.

1. 좌측 상단의 슬라이드 번호와 섹션명
2. 얇은 규칙선과 정렬된 근거 라벨
3. 큰 숫자 한 개 또는 실제 제품 화면 한 개
4. `LIVE / ASSUMPTION / TARGET` 증거 상태 태그

## 6. Visual Asset Plan

### Existing assets to reuse

- `assets/deck/dance-choreo-analysis.png`
- `assets/deck/vocal-pitch-analysis.png`
- `assets/deck/ax-command-center.png`
- `assets/deck/casting-pipeline.png`
- `assets/deck/live-audition-demo.png`

스크린샷은 작은 카드 안에 축소하지 않는다. 슬라이드마다 핵심 영역을 크게 크롭하고, 한두 개의 짧은 주석만 추가한다.

### Assets to redraw

- 5단계 solution flow: 직접 제작한 SVG 라인 아이콘과 연결선
- Market: HTML/CSS 또는 SVG 수평 막대
- Competition: SVG 포지셔닝 또는 제한된 비교표
- GTM: 3단계 증거 사다리
- Product boundary: NOW/NEXT/LATER 타임라인

사용자 제공 Image #1과 Image #2는 내용 참고자료다. 최종 덱에 래스터 이미지 그대로 삽입하지 않는다.

## 7. Evidence Ledger

### Verified public sources

1. KOCCA/Data.go.kr, 대중문화예술기획업 등록기업 현황, 2026-08-12
   `https://www.data.go.kr/data/15118569/fileData.do`
   직접 집계: 전체 7,891개, 정상 6,629개, 폐업 1,175개, 휴업 87개. 정상 기업의 서울·경기 비중 92.4%.

2. KOCCA, 2025년 콘텐츠산업 동향분석
   `https://welcon.kocca.kr/en/info/business/1957553`
   2025년 콘텐츠산업 수출 5.9% 증가, 음악 수출 32.4% 증가, 2025년 4분기 콘텐츠사업체 생성형 AI 활용률 32.1%.

3. KOCCA, 대중음악산업계 간담회
   `https://welcon.kocca.kr/ko/info/business/1958572`
   2025년 대중음악산업 매출 15.8%, 수출 32.4% 증가. 제작·마케팅 비용 상승과 기업 간 격차가 현장 과제로 제시됨.

4. IFPI Global Music Report 2026
   `https://www.ifpi.org/wp-content/uploads/2026/03/GMR2026_SOTI.pdf`
   2025년 글로벌 레코디드 음악 매출 317억 달러, 6.4% 성장, 한국은 세계 7위 시장.

5. KOCCA 2024 음악산업백서
   `https://welcon.kocca.kr/ko/info/report/1954309`
   2023년 국내 음악산업 매출 12조 6,842억 원.

### Verified product sources

- DISCO A&R & Management: `https://www.disco.ac/solutions/a-and-r-management`
- Cyanite product and API: `https://cyanite.ai/`
- OpusClip pricing and features: `https://www.opus.pro/pricing`

### Internal verified evidence

- TypeScript/TSX 161개, 약 11,129줄
- 앱 페이지/API 라우트 29개
- 자동 테스트 102개 통과, PostgreSQL 연동 테스트 4개는 미실행
- 포즈, 피치, 안무 분석 스크립트의 로컬 샘플 실행 성공
- 프로덕션 빌드는 `.venv-vision` 외부 심볼릭 링크를 Turbopack이 거부해 현재 실패
- Vercel 프리뷰는 SSO 보호 상태이며 `enter-ax.com`은 2026-09-23 조사 당시 DNS 해석 실패

### Claims that must remain assumptions

- 초기 적합 고객 1,500개사
- 블렌디드 연 객단가 1,110만 원
- 3년 내 고객 80개사와 ARR 9.9억 원
- 요금제별 가격과 고객 구성
- 분석 1건당 비용과 80%대 후반 이상의 총마진
- 고객 검토시간 절감률과 전환율

## 8. Interaction and Delivery

`ir-deck.html`은 발표용 HTML과 인쇄/PDF 변환 양쪽을 지원한다.

- 키보드 좌우 이동
- 하단 슬라이드 번호
- 전체 화면에서 16:9 비율 유지
- 인쇄 시 한 페이지당 한 슬라이드
- 화면 축소 시 콘텐츠 비율 유지
- 접근 가능한 제목 구조와 이미지 대체 텍스트
- 외부 네트워크 없이 로컬 자산만으로 핵심 레이아웃 렌더링

내비게이션은 발표 화면을 방해하지 않도록 평상시 낮은 대비로 두고 포커스/호버 시만 선명하게 만든다.

## 9. QA Requirements

구현 후 다음 검증을 모두 수행한다.

### Content QA

- `LIVE`, `PROTOTYPE`, `ASSUMPTION`, `TARGET` 표기가 주장과 일치하는지 확인
- 모든 시장 수치에 기준일·계산식·출처 포함
- 미구현 기능을 현재 제품처럼 표현하지 않음
- 데모 데이터가 고객 트랙션처럼 보이지 않음
- 경쟁사 기능을 의도적으로 축소하지 않음
- `TBD`, 임시 문구, 존재하지 않는 연락처 제거

### Visual QA

- 1600×900과 일반 노트북 화면에서 10pt 미만 텍스트가 없음
- 스크린샷의 핵심 내용이 발표 거리에서 식별됨
- 각 슬라이드에 시각적 초점이 하나뿐임
- 0.5인치 상당의 안전 여백 유지
- 요소 겹침, 잘림, 좁은 행간, 과도한 표 밀도 없음
- 첫 렌더 후 반드시 문제를 찾아 한 차례 이상 수정·재검증

### Technical QA

- 모든 슬라이드의 키보드 이동 확인
- 브라우저 콘솔 오류 없음
- 로컬 이미지 404 없음
- 인쇄 미리보기에서 한 장씩 분리
- Chromium 스크린샷으로 전체 12장 시각 검토

## 10. Out of Scope for This Redesign

- 실제 고객 인터뷰 결과 창작
- 투자금, 매출, 계약, 사용자 수 조작
- 제품 코드나 프로덕션 빌드 문제 수정
- 결제 시스템과 데이터 파이프라인 구현
- 글로벌 TAM을 근거 없이 확대
- PPTX 파일 생성. HTML 승인 후 별도 단계에서 같은 시스템으로 PPTX를 제작한다.

## 11. Implementation Boundary

서면 명세 승인 후 구현 계획은 다음 책임으로 분리한다.

1. `ir-deck.html`의 구조와 스타일을 새로 작성
2. 기존 실제 제품 스크린샷을 목적별로 크롭·배치
3. solution flow, market, competition, GTM 도표를 SVG/CSS로 제작
4. 12장 전체 콘텐츠·출처·가정 라벨 적용
5. 브라우저 렌더 및 인쇄 QA, 수정 후 재검증

기존 파일은 Git 이력으로 복구 가능하므로 별도 복제본을 제품 트리에 추가하지 않는다. 구현 시 사용자의 다른 미커밋 변경은 수정하거나 되돌리지 않는다.
