---
name: pitch-deck-design
description: Master guide for investor pitch deck visual design, typography hierarchy, layout blueprints, and anti-slop principles based on legendary decks (Airbnb, Sequoia, Front, Linear). Use when designing, reviewing, restyling, or refining startup IR decks, slide decks, presentation CSS/HTML, or investor-facing materials.
---

# 🎨 Pitch Deck Visual Design & Layout Master Skill

## Overview
투자자(VC)는 피칭덱의 각 슬라이드를 '읽지' 않고 3초 동안 **'스캔'**합니다. 
이 스킬은 에어비앤비(Airbnb), 세콰이어(Sequoia), 프론트(Front), 리니어(Linear) 등 실리콘밸리 최고 수준의 테크 스타트업 피칭덱이 채택한 **시각적 위계(Visual Hierarchy), 타이포그래피 스케일, 그리드 시스템, 데이터 시각화 및 안티-슬롭(Anti-Slop) 디자인 원칙**을 엔지니어링 및 스타일링에 즉시 적용할 수 있도록 안내합니다.

---

## 🧭 핵심 디자인 철학: Executive Clarity (경영진 수준의 명료함)

1. **지독한 색상 절제 (Color Discipline)**: 90%의 모노크롬(미색 캔버스, 화이트 페이퍼, 딥 차콜) 위에 **단 하나의 시그니처 액센트(Cobalt/Electric Blue)**만 사용하여 핵심 앵커(숫자, 우측 상단 타겟)를 부각합니다.
2. **1 슬라이드 = 1 핵심 메시지 (One Slide, One Anchor)**: 모든 슬라이드는 3초 안에 눈길이 꽂히는 단 하나의 시각적 초점(거대 숫자, 3단 카드, 2x2 매트릭스, 차트)을 가집니다.
3. **증거 기반 태깅 (Evidence-Based Tagging)**: `LIVE`, `PROTOTYPE`, `ASSUMPTION`, `TARGET` 등 신뢰도 태그를 통해 투자자의 실사(DD) 신뢰를 획득합니다.
4. **여백(Whitespace)의 위엄**: 슬라이드 가장자리에 최소 64px~88px의 안전 영역(Safe Margin)을 확보하여 여유와 자신감을 드러냅니다.

---

## 📐 1. 뷰포트 & 레이아웃 시스템 (1600x900 기준)

현대적인 웹 기반 IR 덱(HTML/CSS)은 `1600 x 900` (16:9 비율) 캔버스를 기준으로 설계하고 `transform: scale()`을 통해 어떤 디스플레이에서도 완벽한 비율로 반응형 렌더링되도록 구현합니다.

### 12-Column CSS Grid 시스템
```css
:root {
  --slide-w: 1600px;
  --slide-h: 900px;
  --safe-x: 88px;
  --safe-y: 64px;
  
  /* Color Tokens */
  --canvas: #f6f5f1;       /* 따뜻한 미색 배경 (눈의 피로 감소) */
  --paper: #ffffff;        /* 카드 컨테이너 배경 */
  --ink: #141820;          /* 헤드라인 및 주요 텍스트 */
  --muted: #626a78;        /* 보조 텍스트 및 레이블 */
  --rule: #d7dae0;         /* 1px 정밀 보더 라인 */
  --cobalt: #2864e8;       /* 시그니처 액센트 블루 */
  --approval: #c8f45d;     /* 통과/승인 하이라이트 (라임) */
  --risk: #f06445;         /* 리스크/주의 하이라이트 (코랄) */
}

.slide.is-active {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  column-gap: 24px;
  row-gap: 18px;
  padding: var(--safe-y) var(--safe-x) 68px;
}
```

---

## 🔤 2. 타이포그래피 스케일 & 계층 구조

| 계층 (Hierarchy) | CSS 폰트 크기 / 행간 / 자간 | Weight | 용도 및 규칙 |
| :--- | :--- | :--- | :--- |
| **Kicker / Eyebrow** | `13px ~ 14px` / `1.0` / `letter-spacing: .12em` | SemiBold (600) | 모노스페이스(IBM Plex Mono), ALL CAPS, 액센트 컬러 |
| **Slide Title (H1)** | `48px ~ 58px` / `1.08` / `letter-spacing: -.035em` | Black / ExtraBold (800~900) | 슬라이드의 결론 한 줄 (최대 2줄 제한), 산세리프 |
| **Subtitle / Lede** | `18px ~ 21px` / `1.5` / `letter-spacing: -.01em` | Medium (500) | 제목 바로 아래 보조 설명 문장 |
| **Big Figure (수치)** | `64px ~ 88px` / `0.95` / `letter-spacing: -.055em` | ExtraBold (900) | TAM, 성장률, 주요 지표를 압도적으로 강조 |
| **Card Heading (H2/H3)** | `20px ~ 24px` / `1.2` / `letter-spacing: -.02em` | Bold (700) | 3단 분할 카드의 헤더 |
| **Body Text** | `15px ~ 16px` / `1.55` / `normal` | Regular (400) | 가독성이 높은 본문 불릿 (Muted Gray `#626a78`) |
| **Source Line / Footnote** | `12px` / `1.35` / `normal` | Regular (400) | 슬라이드 최하단 데이터 출처 및 가정(Assumption) 명시 |

---

## 🍱 3. 검증된 슬라이드 레이아웃 템플릿 패턴

### Pattern A: 3-Column Card Grid (문제 3개, 솔루션 3대 혜택)
- 문제 3개(Problem 3 Pillars)나 솔루션 3개(Solution 3 Benefits)를 표현할 때 사용.
- 상단 3px 보더 컬러를 액센트(`--cobalt`, `--ink`, `--rule`)로 차등 적용.
- 카드 내부: `[순번 모노 태그] ➔ [볼드 헤딩] ➔ [1~2줄의 명쾌한 본문 설명]`.

### Pattern B: 2-Column Split (좌측 스토리텔링 + 우측 제품 캡처 / 매트릭스)
- 좌측 (50~55%): 거대 숫자 Callout + 3줄 핵심 불릿 + 검증 지표.
- 우측 (45~50%): 실제 제품 UI 캡처(`assets/deck/*.png`) 또는 2x2 경쟁 사분면 매트릭스.
- 우측 제품 캡처는 1px 보더와 미묘한 그림자(`box-shadow: 0 12px 36px rgba(0,0,0,0.06)`)를 둘러 하이테크 느낌 부여.

### Pattern C: 2x2 Positioning Matrix (Airbnb 스타일 경쟁 구도)
- **X축**: 범용 일반 도구 (General Tools) ↔ 특화 전문 도구 (Domain Specific)
- **Y축**: 단순 보관/재생 (Storage & View) ↔ 정밀 멀티모달 AI 분석 (Deep Multimodal AI)
- **우측 상단 사분면**: 우리 서비스의 로고를 단독 배치하고 포인트 컬러 아웃라인을 둘러 "유일한 대안"임을 각인.
- 좌하단, 좌상단, 우하단에는 기존 경쟁사(Dropbox, OpusClip, Disco 등)를 배치.

### Pattern D: 4-Phase Roadmap Chart (마일스톤 시각화)
- 4개의 컬럼(Phase 1~4) 상단에 컬러풀한 3px 탑 보더 배치.
- 하단에 4단계 누적 막대 그래프(Bar Chart)를 배치하여 목표 고객 수(예: 10 ➔ 25 ➔ 50 ➔ 80)를 시각적 계단 형태로 전달.

---

## 🏷️ 4. 증거 태그 시스템 (Evidence Tagging System)

투자자의 신뢰를 얻기 위해 데이터와 컴포넌트에 표준화된 배지를 적용합니다:

```html
<span class="evidence-tag live">LIVE</span>        <!-- 실제 코드로 동작 중인 기능 -->
<span class="evidence-tag prototype">PROTOTYPE</span> <!-- 데모/프로토타입 상태의 데이터 -->
<span class="evidence-tag assumption">ASSUMPTION</span><!-- 고객 인터뷰를 통해 검증할 가설 -->
<span class="evidence-tag target">TARGET</span>    <!-- 12~18개월 내 달성할 정량 목표 -->
```

```css
.evidence-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border: 1px solid currentColor;
  border-radius: 2px;
  font: 700 11px/1 var(--font-mono);
  letter-spacing: .08em;
  text-transform: uppercase;
}
.evidence-tag.live { color: #2864e8; border-color: #2864e8; background: #eaf1ff; }
.evidence-tag.prototype { color: #626a78; border-color: #d7dae0; background: #fff; }
.evidence-tag.assumption { color: #f06445; border-color: #f06445; background: #fff1ee; }
.evidence-tag.target { color: #141820; border-color: #141820; background: #c8f45d; }
```

---

## 🚫 5. 안티-슬롭(Anti-Slop) 디자인 체크리스트 (절대 하지 말 것)

- [ ] **무지개색 남용 금지**: 배경, 카드, 텍스트가 제각각 알록달록한 색을 띠면 대학생 과제처럼 보입니다. 배경은 무조건 차분한 모노크롬(`--canvas`), 액센트는 1개만 씁니다.
- [ ] **텍스트 벽(Wall of text) 금지**: 한 슬라이드에 3줄을 초과하는 줄글 문단을 넣지 마십시오. 불릿당 1~2줄로 절단하십시오.
- [ ] **저해상도 스톡 이미지/클립아트 금지**: 의미 없는 악수 사진, 과장된 3D 렌더 로봇 등을 빼고, **실제 제품 UI 스크린샷과 엔지니어링 결과물**만 넣습니다.
- [ ] **가로/세로 어긋남(Misalignment) 금지**: 3개 카드의 상단 라인, 텍스트 시작점, 버튼 패딩이 1px의 오차도 없이 칼같이 맞아야 합니다.
- [ ] **낮은 대비(Low Contrast) 금지**: 회색 배경에 옅은 회색 텍스트, 혹은 파란 배경에 보라색 텍스트는 즉시 반려됩니다. 텍스트는 `#141820` 또는 `#ffffff`로 고대비를 유지합니다.

---

## 🛠️ 실전 활용: 새 슬라이드 작성 및 리디자인 시 작업 루틴

1. **콘텐츠를 3개 덩어리로 압축**: 문제든 해결책이든 핵심 포인트를 3개 이하로 줄인다.
2. **슬라이드 결론(H1)을 단 한 문장으로 선언**: "우리가 왜 이기는가", "시장이 얼마나 큰가".
3. **그리드 패턴 선택**: 3-Column Card(개념 설명) vs 2-Column Split(제품 시연/매트릭스).
4. **증거 수준 태그 부여**: `LIVE`, `PROTOTYPE`, `ASSUMPTION` 중 알맞은 태그 부착.
5. **1600x900 스케일 뷰포트에서 정렬 및 여백 최종 검수**.
