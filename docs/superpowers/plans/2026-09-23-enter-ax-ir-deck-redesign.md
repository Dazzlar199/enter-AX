# Enter-AX IR Deck Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the failed 10-slide `ir-deck.html` with a credible, presentation-ready 12-slide investor deck that clearly separates working product evidence from assumptions and targets.

**Architecture:** Keep the deck as one offline-capable HTML artifact with embedded CSS, semantic slide markup, inline SVG diagrams, and a small embedded navigation script. Add a standalone Playwright-based verifier that opens the local file, checks structure and interactions, detects overflow or broken images, and captures all slides for visual review.

**Tech Stack:** HTML5, CSS3, inline SVG, vanilla JavaScript, Node.js, `@playwright/test` Chromium

**Spec:** `docs/superpowers/specs/2026-09-23-enter-ax-ir-deck-redesign.md`

## Global Constraints

- The core deck contains exactly 12 slides and supports an 8–12 minute presentation.
- The logical canvas is 1600×900 with 88px horizontal and 64px vertical safe margins.
- Use the approved palette: `#F6F5F1`, `#FFFFFF`, `#141820`, `#626A78`, `#2864E8`, `#DCEAFF`, `#C8F45D`, `#F06445`, `#D7DAE0`.
- Use Pretendard with `Noto Sans KR` and system sans-serif fallbacks; use `IBM Plex Mono` or `Space Mono` only for labels and evidence tags.
- Limit recurring visual devices to section labels, thin rules, one dominant figure or product screen, and evidence-state tags.
- Do not use glass effects, blue gradients, generated-looking 3D icons, repeated three-column feature cards, decorative underlines, or neon/HUD styling.
- Label claims as `LIVE`, `TESTED`, `PROTOTYPE`, `ASSUMPTION`, or `TARGET`; never present demo fixtures as customer traction.
- Recreate the supplied workflow and market references as original SVG/CSS graphics; do not embed the supplied raster reference images.
- Reuse only verified local product screenshots from `assets/deck/`.
- All market figures include a basis date, calculation, evidence label, and visible source.
- Keep the deck functional without an external network connection.
- Preserve all unrelated working-tree changes.

## File Map

- Modify: `ir-deck.html` — complete 12-slide deck, embedded visual system, diagrams, navigation, scaling, and print rules.
- Create: `scripts/verify-ir-deck.mjs` — structural, content, runtime, image, overflow, keyboard, and screenshot checks.
- Create during verification only: `artifacts/ir-deck/slide-01.png` through `slide-12.png` and `contact-sheet.png` — review outputs, not committed product assets.

## Review Focus

1. **Long Korean copy:** every slide must remain inside the 1600×900 safe area without clipped titles, footnotes, or tags; Task 4 adds bounding-box tests.
2. **Missing local images:** every referenced screenshot must resolve and report non-zero natural dimensions; Task 4 checks image completion.
3. **Navigation boundaries:** arrow keys must clamp at slide 1 and slide 12 instead of wrapping or indexing missing dots; Task 4 tests both edges.
4. **Print/PDF output:** print media must show all slides sequentially, one 16:9 slide per page, with controls hidden; Task 4 checks computed print rules and PDF page count.
5. **Unsupported or misleading claims:** forbidden legacy claims and unresolved value tokens must not appear; Task 1 pins the content guard and Task 5 performs human evidence review.

---

### Task 1: Add a structural and evidence verification harness

**Files:**
- Create: `scripts/verify-ir-deck.mjs`
- Test: `ir-deck.html`

**Interfaces:**
- Consumes: `process.argv` options `--mode=structure|runtime|render|all`, `--deck=<path>`, and `--output=<path>`.
- Produces: exit code `0` on success, exit code `1` with grouped diagnostics on failure, and PNG render files when render mode is enabled.

- [ ] **Step 1: Create the structural verifier with exact deck rules**

Implement these exported functions and CLI entry point:

```js
export function inspectMarkup(html) {
  const slideIds = [...html.matchAll(/<section\b[^>]*class="[^"]*\bslide\b[^"]*"[^>]*id="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = [...slideIds].filter((id, index) => slideIds.indexOf(id) !== index);
  const forbidden = [
    /커뮤니티는 복제할 수 없습니다/,
    /양면 네트워크 효과/,
    /자체 컴퓨터비전·오디오 모델/,
    /수십 원 이하/,
    /80%대 후반/,
    /contact@enter-ax\.com/,
    /\[미정\]/
  ].filter((pattern) => pattern.test(html)).map(String);
  return {
    slideCount: slideIds.length,
    duplicateIds,
    forbidden,
    hasEvidenceTags: ["LIVE", "PROTOTYPE", "ASSUMPTION", "TARGET"].every((tag) => html.includes(tag)),
    hasPrintRules: /@media\s+print/.test(html),
    hasAccessibleDeckLabel: /aria-label="Enter-AX IR deck"/.test(html)
  };
}

export function assertStructure(report) {
  const errors = [];
  if (report.slideCount !== 12) errors.push(`expected 12 slides, found ${report.slideCount}`);
  if (report.duplicateIds.length) errors.push(`duplicate slide ids: ${report.duplicateIds.join(", ")}`);
  if (report.forbidden.length) errors.push(`forbidden claims: ${report.forbidden.join(", ")}`);
  if (!report.hasEvidenceTags) errors.push("missing evidence-state tags");
  if (!report.hasPrintRules) errors.push("missing print rules");
  if (!report.hasAccessibleDeckLabel) errors.push("missing accessible deck label");
  return errors;
}
```

The CLI must read `ir-deck.html` by default, run `inspectMarkup`, print each diagnostic under `STRUCTURE`, and set `process.exitCode = 1` when any assertion fails.

- [ ] **Step 2: Run the verifier against the current deck and confirm failure**

Run:

```bash
node scripts/verify-ir-deck.mjs --mode=structure
```

Expected: non-zero exit with at least the 10-slide count, duplicate `s1`, missing evidence-state set, and legacy-claim diagnostics.

- [ ] **Step 3: Commit the failing guard separately**

```bash
git add scripts/verify-ir-deck.mjs
git commit -m "test: add IR deck verification harness"
```

### Task 2: Rebuild the semantic 12-slide story and content

**Files:**
- Modify: `ir-deck.html`
- Test: `scripts/verify-ir-deck.mjs`

**Interfaces:**
- Consumes: design spec slide order and evidence ledger.
- Produces: twelve unique `<section class="slide" id="slide-01">` elements, each containing one `<h1>`, one `.slide-kicker`, a `.slide-content` region, and an optional `.source-line`.

- [ ] **Step 1: Replace the document shell and define the semantic slide contract**

Use this top-level structure exactly:

```html
<body>
  <main id="deck" aria-label="Enter-AX IR deck">
    <div id="deck-frame">
      <div id="slides" aria-live="polite">
        <section class="slide is-active" id="slide-01" data-title="Cover" aria-hidden="false">…</section>
        <!-- slide-02 through slide-12 follow the same contract -->
      </div>
      <nav class="deck-nav" aria-label="슬라이드 이동">…</nav>
    </div>
  </main>
</body>
```

Do not retain the duplicated `s1` node, legacy 10-dot navigation, invented email address, or seed amount field.

- [ ] **Step 2: Write Slides 1–4 with concise approved copy**

Implement:

1. Cover — “인재 발견부터 콘텐츠 실행까지, 엔터사의 운영을 연결합니다.”
2. Problem — a single operator caught between audition video, candidate sheet, drive, and messenger.
3. Why Now — `6,629`, `+15.8% / +32.4%`, and `32.1%` as three dominant figures with source markers.
4. Solution Flow — `REGISTER → SCREEN → REVIEW → EXECUTE → APPROVE`, with only APPROVE in lime and the caption `자동 합격·탈락 없음`.

Each slide must contain no more than one explanatory paragraph and no more than three supporting labels.

- [ ] **Step 3: Write Slides 5–8 with proof and transparent market logic**

Implement:

5. Working Product — one dominant product screenshot crop and three local execution results labeled `LIVE`.
6. Product Boundary — `NOW / NEXT / LATER`; current features under NOW, operational hardening under NEXT, enterprise AX expansion under LATER.
7. Market — horizontal bottom-up bars for `736억 원/년`, `135억 원/년`, and `9.9억 원 ARR`; show formulas and label assumption components.
8. Competitive Position — compare workflow categories honestly and include competitor strengths for DISCO, Cyanite, and OpusClip.

Use exact source notes from the evidence ledger, not generic “industry estimate” phrasing.

- [ ] **Step 4: Write Slides 9–12 without manufacturing traction**

Implement:

9. Business Model — setup fee plus recurring subscription money flow; all prices labeled `ASSUMPTION`.
10. Validation & GTM — `Engineering proof → 3–5 pilots → paid conversion evidence`; no empty traction graph.
11. Team — `필요 역량 → 현재 증거 → 보강 계획`; only user-confirmed founder claims.
12. Ask — request five pilot partners, industry advisors, and an initial investment conversation; milestone is interview → pilot → paid-conversion evidence.

- [ ] **Step 5: Run structural verification until the content contract passes**

Run:

```bash
node scripts/verify-ir-deck.mjs --mode=structure
```

Expected: `STRUCTURE PASS — 12 slides, unique IDs, evidence labels present, no forbidden claims`.

- [ ] **Step 6: Commit the narrative rebuild**

```bash
git add ir-deck.html
git commit -m "feat: rebuild IR deck narrative"
```

### Task 3: Apply the Swiss editorial design system and original diagrams

**Files:**
- Modify: `ir-deck.html`
- Reuse: `assets/deck/dance-choreo-analysis.png`
- Reuse: `assets/deck/vocal-pitch-analysis.png`
- Reuse: `assets/deck/ax-command-center.png`
- Reuse: `assets/deck/casting-pipeline.png`
- Reuse: `assets/deck/live-audition-demo.png`
- Test: `scripts/verify-ir-deck.mjs`

**Interfaces:**
- Consumes: semantic classes from Task 2.
- Produces: CSS tokens, layout primitives, evidence tags, inline SVG diagrams, responsive scale behavior, and print-safe styles.

- [ ] **Step 1: Define the visual tokens and 1600×900 grid**

Use these root tokens and avoid per-slide ad hoc colors:

```css
:root {
  --canvas: #f6f5f1;
  --paper: #ffffff;
  --ink: #141820;
  --muted: #626a78;
  --cobalt: #2864e8;
  --pale-blue: #dceaff;
  --approval: #c8f45d;
  --risk: #f06445;
  --rule: #d7dae0;
  --font-sans: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", "Space Mono", ui-monospace, monospace;
  --slide-w: 1600px;
  --slide-h: 900px;
  --safe-x: 88px;
  --safe-y: 64px;
}
```

Set `.slide` to a 12-column CSS grid with 24px gaps. Use square or 8px maximum corner radii, 1–2px rules, and no gradient declarations.

- [ ] **Step 2: Build the shared chrome and typography**

Create reusable styles for:

```css
.slide-kicker { font: 600 14px/1 var(--font-mono); letter-spacing: .12em; }
.slide h1 { font: 800 58px/1.08 var(--font-sans); letter-spacing: -.035em; }
.evidence-tag { font: 600 12px/1 var(--font-mono); border: 1px solid currentColor; }
.source-line { font: 500 12px/1.35 var(--font-sans); color: var(--muted); }
.figure { font: 800 88px/.95 var(--font-sans); letter-spacing: -.055em; }
```

Add slide number, section name, thin top rule, and page count consistently. Keep all body copy left-aligned except the cover wordmark and isolated large figures.

- [ ] **Step 3: Draw the workflow, market, positioning, boundary, and GTM graphics**

Use inline SVG with `viewBox`, meaningful `<title>`, and `role="img"` for:

- Slide 2 fragmentation map: four source nodes converging on one operator.
- Slide 4 five-step workflow: line icons built from strokes and rectangles, not emoji or icon fonts.
- Slide 6 NOW/NEXT/LATER timeline.
- Slide 7 bottom-up market bars with formula annotations.
- Slide 8 category-positioning map or limited comparison grid.
- Slide 10 evidence ladder.

Use cobalt for system movement, lime only for human approval, orange only for risk or unverified assumptions, and ink/rule colors for neutral structure.

- [ ] **Step 4: Place product screenshots as evidence rather than decoration**

Use `<picture>` or `<img>` with descriptive Korean alt text, `object-fit: cover`, and deliberate `object-position`. Slide 5 must devote at least 60% of its content area to one screenshot, with at most two small supporting crops. Do not stretch an image or place five screenshots in equal cards.

- [ ] **Step 5: Add responsive presentation scaling and print CSS**

Use a single transform on `#deck-frame` based on `min(innerWidth / 1600, innerHeight / 900)`. For print:

```css
@page { size: 13.333in 7.5in; margin: 0; }
@media print {
  html, body { width: auto; height: auto; overflow: visible; background: #fff; }
  #deck-frame { width: 1600px; height: auto; transform: none !important; }
  .slide { position: relative; display: grid !important; page-break-after: always; break-after: page; }
  .deck-nav, .keyboard-hint { display: none !important; }
}
```

- [ ] **Step 6: Run the structural verifier and commit the design system**

Run:

```bash
node scripts/verify-ir-deck.mjs --mode=structure
```

Expected: PASS with no missing asset paths or content regressions.

```bash
git add ir-deck.html
git commit -m "design: apply editorial Swiss IR deck system"
```

### Task 4: Complete interaction, accessibility, overflow, and print verification

**Files:**
- Modify: `ir-deck.html`
- Modify: `scripts/verify-ir-deck.mjs`
- Test: `scripts/verify-ir-deck.mjs`

**Interfaces:**
- Consumes: `window.deckController` methods `goTo(index)`, `next()`, `previous()`, `scale()`.
- Produces: keyboard and button navigation, correct ARIA state, 12 PNG slide renders, one contact sheet, and a 12-page PDF probe.

- [ ] **Step 1: Add the deck controller with clamped navigation**

Expose this stable interface:

```js
window.deckController = {
  get current() { return currentIndex; },
  get total() { return slides.length; },
  goTo(index) { activate(Math.max(0, Math.min(slides.length - 1, index))); },
  next() { this.goTo(currentIndex + 1); },
  previous() { this.goTo(currentIndex - 1); },
  scale: applyScale
};
```

Support ArrowRight, ArrowDown, PageDown, and Space for next; ArrowLeft, ArrowUp, PageUp for previous; Home and End for boundaries. Update `.is-active`, `aria-hidden`, nav-dot `aria-current`, and the `01 / 12` counter atomically.

- [ ] **Step 2: Extend the verifier with browser runtime assertions**

In `runRuntimeChecks(page)`, assert:

```js
const runtime = await page.evaluate(() => ({
  total: window.deckController.total,
  current: window.deckController.current,
  visible: [...document.querySelectorAll(".slide")].filter((slide) => getComputedStyle(slide).display !== "none").length,
  brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute("src")),
  overflows: [...document.querySelectorAll(".slide")]
    .filter((slide) => slide.scrollWidth > slide.clientWidth || slide.scrollHeight > slide.clientHeight)
    .map((slide) => slide.id)
}));
```

Then press `End`, `ArrowRight`, `Home`, and `ArrowLeft` and verify the index remains clamped at 11 and 0 respectively. Verify exactly one slide is visible on screen and every nav dot has an accessible label.

- [ ] **Step 3: Add per-slide safe-area checks**

For every `.slide-content`, `.source-line`, and `h1`, compare its bounding box against the slide box inset by 64px vertically and 88px horizontally. Allow only intentionally full-bleed `.visual-bleed` elements to cross the safe area. Print exact element selectors for violations.

- [ ] **Step 4: Add render and PDF output**

When `--mode=render` or `all` is used:

1. Create the requested output directory.
2. Navigate to each slide with `window.deckController.goTo(index)`.
3. Capture the `.slide.is-active` element at 1600×900 as `slide-01.png` through `slide-12.png`.
4. Generate `deck.pdf` with background graphics and assert the PDF contains 12 `/Type /Page` entries excluding `/Pages`.
5. Generate `contact-sheet.png` by opening a temporary HTML grid that references the 12 PNG files and capturing it with Chromium.

- [ ] **Step 5: Run the complete automated check**

Run:

```bash
node scripts/verify-ir-deck.mjs --mode=all --output=artifacts/ir-deck
```

Expected: `STRUCTURE PASS`, `RUNTIME PASS`, `PRINT PASS — 12 pages`, and 12 slide PNGs plus a contact sheet.

- [ ] **Step 6: Commit interaction and verification**

```bash
git add ir-deck.html scripts/verify-ir-deck.mjs
git commit -m "test: verify IR deck presentation output"
```

### Task 5: Perform the required visual and evidence QA loop

**Files:**
- Modify if needed: `ir-deck.html`
- Verify: `artifacts/ir-deck/contact-sheet.png`
- Verify: `artifacts/ir-deck/deck.pdf`

**Interfaces:**
- Consumes: Task 4 renders and the approved spec evidence ledger.
- Produces: corrected final deck with one documented render–fix–rerender cycle.

- [ ] **Step 1: Inspect the contact sheet and all full-size slide renders**

Check each slide for one dominant focal point, readable screenshot details, minimum body-text size, consistent source placement, balanced negative space, and absence of repetitive card layouts. Record concrete issues by slide number before editing.

- [ ] **Step 2: Reconcile every numeric claim against the evidence ledger**

Confirm:

- `6,629` normal-status registered companies as of 2026-08-12.
- `+15.8%` music-industry revenue growth and `+32.4%` export growth for 2025.
- `32.1%` generative-AI usage among content businesses in 2025 Q4.
- TAM `6,629 × ₩11.1M ≈ ₩73.6B`, SAM `1,500 × ₩9M = ₩13.5B`, and SOM `80 customers ≈ ₩990M ARR` with assumption/target labels.
- Product execution timings are described as local proof, not performance benchmarks.

- [ ] **Step 3: Apply focused corrections**

Correct only observed issues such as title wrapping, cramped source notes, ambiguous evidence tags, screenshot crop position, bar-label overlap, or low-contrast controls. Do not introduce a new visual style during QA.

- [ ] **Step 4: Rerun the entire verifier and inspect the new contact sheet**

Run:

```bash
node scripts/verify-ir-deck.mjs --mode=all --output=artifacts/ir-deck-final
```

Expected: all automated checks pass and the corrected contact sheet has no clipping, overlap, unreadable sources, or unmarked assumptions.

- [ ] **Step 5: Commit final QA corrections**

```bash
git add ir-deck.html scripts/verify-ir-deck.mjs
git commit -m "fix: polish IR deck after visual QA"
```

### Task 6: Final handoff verification

**Files:**
- Verify: `ir-deck.html`
- Verify: `scripts/verify-ir-deck.mjs`
- Verify: `docs/superpowers/specs/2026-09-23-enter-ax-ir-deck-redesign.md`

**Interfaces:**
- Consumes: final implementation and verification artifacts.
- Produces: evidence-backed delivery summary with exact file links and known business-input gaps.

- [ ] **Step 1: Run clean final checks**

```bash
git diff --check
node scripts/verify-ir-deck.mjs --mode=all --output=artifacts/ir-deck-final
git status --short
```

Expected: no whitespace errors in changed deck files, all deck checks pass, and unrelated user changes remain untouched.

- [ ] **Step 2: Open the final HTML locally and perform a presentation smoke test**

Verify slide 1 → 12 navigation with keyboard and buttons, then inspect browser print preview for one slide per page. Confirm the deck works with the network disabled.

- [ ] **Step 3: Report the result and remaining user-supplied inputs**

Link the final `ir-deck.html`, the verifier, and the final contact sheet. State that investment amount, verified founder biography, customer interviews, letters of intent, and paid traction remain intentionally absent until supplied by the user.
