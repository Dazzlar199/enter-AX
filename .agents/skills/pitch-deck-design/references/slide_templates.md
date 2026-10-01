# 🧩 Pitch Deck Design System: HTML & CSS Component Templates

이 문서는 `.agents/skills/pitch-deck-design` 스킬에서 바로 복사하여 사용할 수 있는 검증된 HTML/CSS 슬라이드 컴포넌트 템플릿 모음입니다.

---

## 1. Airbnb 3-Column Problem / Solution Cards

```html
<!-- HTML -->
<div class="slide-content card-grid-3">
  <article class="pcard">
    <div class="pcard-header">
      <span class="pcard-tag">01 / SCREENING</span>
      <h3>수작업 검토의 피로</h3>
    </div>
    <p class="pcard-desc">매회 5,000건 이상의 지원 영상을 전수 검토하며 피로도 누적 및 유망 원석 누락 발생.</p>
    <div class="pcard-footer">
      <span class="evidence-tag assumption">PAIN POINT</span>
      <span class="pcard-stat">90% 시간 소모</span>
    </div>
  </article>

  <article class="pcard">
    <div class="pcard-header">
      <span class="pcard-tag">02 / TRAVEL COST</span>
      <h3>막대한 글로벌 출장비</h3>
    </div>
    <p class="pcard-desc">도쿄, 방콕, LA 현지 오디션 파견 시 1회당 수천만 원의 체재비와 물리적 시공간 제약 소모.</p>
    <div class="pcard-footer">
      <span class="evidence-tag assumption">PAIN POINT</span>
      <span class="pcard-stat">회당 3,000만 원+</span>
    </div>
  </article>

  <article class="pcard">
    <div class="pcard-header">
      <span class="pcard-tag">03 / CRITERIA</span>
      <h3>주관적 감에 의존</h3>
    </div>
    <p class="pcard-desc">댄스 안무 일치도와 보컬 음정 편차를 증명할 객관적 데이터가 없어 내부 합의 지연.</p>
    <div class="pcard-footer">
      <span class="evidence-tag assumption">PAIN POINT</span>
      <span class="pcard-stat">데이터 부재</span>
    </div>
  </article>
</div>

<!-- CSS -->
<style>
.card-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  align-items: stretch;
}
.pcard {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 32px 28px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-top: 4px solid var(--cobalt);
  box-shadow: 0 4px 16px rgba(20, 24, 32, .03);
}
.pcard-tag {
  display: block;
  margin-bottom: 12px;
  font: 700 12px/1 var(--font-mono);
  letter-spacing: .08em;
  color: var(--muted);
}
.pcard h3 {
  margin: 0 0 16px;
  font: 800 24px/1.2 var(--font-sans);
  color: var(--ink);
  letter-spacing: -.02em;
}
.pcard-desc {
  font-size: 15.5px;
  line-height: 1.6;
  color: var(--muted);
  flex: 1;
}
.pcard-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pcard-stat {
  font: 800 14px/1 var(--font-sans);
  color: var(--ink);
}
</style>
```

---

## 2. Airbnb 2x2 Positioning Matrix

```html
<!-- HTML -->
<div class="slide-content matrix-wrapper">
  <div class="matrix-grid">
    <!-- Top Axis Label -->
    <div class="matrix-axis-y-top">DEEP MULTIMODAL AI (정밀 멀티모달 AI 분석)</div>
    
    <!-- Quadrants -->
    <div class="quadrant quad-tl">
      <span class="q-label">범용 + AI 분석</span>
      <div class="q-competitors">
        <span class="comp-badge">OpusClip</span>
        <span class="comp-badge">Runway</span>
      </div>
    </div>
    
    <div class="quadrant quad-tr target-winner">
      <span class="q-badge">ENTER—AX 독점 영역</span>
      <strong class="target-brand">ENTER—AX</strong>
      <p class="target-desc">엔터테인먼트 특화 워크플로우 + 관절/보컬 정밀 멀티모달 분석</p>
      <span class="evidence-tag live">PROTOTYPE LIVE</span>
    </div>
    
    <div class="quadrant quad-bl">
      <span class="q-label">범용 + 단순 파일 보관</span>
      <div class="q-competitors">
        <span class="comp-badge">Google Drive</span>
        <span class="comp-badge">Dropbox</span>
      </div>
    </div>
    
    <div class="quadrant quad-br">
      <span class="q-label">엔터 도메인 + 단순 수작업</span>
      <div class="q-competitors">
        <span class="comp-badge">DISCO.ac</span>
        <span class="comp-badge">자체 이메일 접수</span>
      </div>
    </div>
    
    <!-- Bottom Axis Label -->
    <div class="matrix-axis-y-bottom">STORAGE & VIEW (단순 파일 보관 / 재생)</div>
  </div>
  
  <div class="matrix-axis-x">
    <span>← GENERAL TOOLS (범용 미디어 도구)</span>
    <span>ENTERTAINMENT SPECIFIC (엔터테인먼트 특화) →</span>
  </div>
</div>

<!-- CSS -->
<style>
.matrix-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}
.matrix-grid {
  position: relative;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
}
.quadrant {
  padding: 24px;
  background: var(--paper);
  border: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.quadrant.target-winner {
  background: #141820;
  color: #fff;
  border: 2px solid var(--cobalt);
  box-shadow: 0 12px 32px rgba(40, 100, 232, 0.15);
}
.target-winner .q-badge {
  font: 700 11px/1 var(--font-mono);
  color: var(--approval);
  letter-spacing: .08em;
}
.target-winner strong {
  font-size: 32px;
  letter-spacing: -.03em;
  color: #fff;
}
.target-winner p {
  font-size: 14.5px;
  line-height: 1.5;
  color: #d7dae0;
}
.q-label {
  font: 600 12px/1 var(--font-mono);
  color: var(--muted);
}
.q-competitors {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.comp-badge {
  padding: 6px 10px;
  background: var(--canvas);
  border: 1px solid var(--rule);
  font: 600 13px/1 var(--font-sans);
  color: var(--ink);
}
.matrix-axis-x {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 2px solid var(--ink);
  font: 700 12px/1 var(--font-mono);
  color: var(--ink);
}
</style>
```

---

## 3. Working Product: 2-Column Split with Multimodal Assets

```html
<!-- HTML -->
<div class="slide-content split-grid">
  <!-- Left Column: Operating Dashboard -->
  <div class="split-col main-view">
    <figure class="proof-card">
      <div class="proof-img-wrap">
        <img src="assets/deck/ax-command-center.png" alt="Enter-AX 커맨드 센터 대시보드">
      </div>
      <figcaption>
        <span class="evidence-tag live">LIVE</span>
        <strong>AX Command Center</strong> — 지원자 현황, 파이프라인 심사 및 승인
      </figcaption>
    </figure>
  </div>

  <!-- Right Column: Dual AI Engines -->
  <div class="split-col engine-views">
    <figure class="engine-card">
      <div class="engine-thumb">
        <img src="assets/deck/dance-choreo-analysis.png" alt="댄스 안무 포즈 일치도 분석">
      </div>
      <div class="engine-meta">
        <strong>Vision AI: 댄스 안무 DTW 분석</strong>
        <p>33개 관절 랜드마크 추출 ➔ 원작 안무 대비 싱크로율 정밀 점수화</p>
      </div>
    </figure>

    <figure class="engine-card">
      <div class="engine-thumb">
        <img src="assets/deck/vocal-pitch-analysis.png" alt="보컬 피치 음정 편차 분석">
      </div>
      <div class="engine-meta">
        <strong>Audio AI: 보컬 피치(Hz) 트래킹</strong>
        <p>기본 주파수(F0) 추적 ➔ 원곡 대비 음정 정확도 및 바이브레이션 리포트</p>
      </div>
    </figure>
  </div>
</div>
```
