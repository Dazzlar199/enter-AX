# Agency AX Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the marketing-style `/agency` page with a professional operations console that uses node visualization only for meaningful input-process-output relationships.

**Architecture:** Add an agency-only console shell around the existing agency routes, then compose `/agency` from typed fixture-backed overview modules. A semantic workflow model renders as an accessible three-column node map on desktop and a vertical directed sequence on mobile; existing list, kanban, A&R, and content workspaces keep their current interaction patterns.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, CSS, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-09-21-agency-ax-console-design.md`

## Global Constraints

- Preserve `ENTER—AX`, existing agency URLs, primary task intent, Korean product voice, and current demo fixture repository.
- Use nodes only for relationships between inputs, processes, approval gates, and outputs; do not convert ordinary records into nodes.
- Label fixture-derived operational summaries `DEMO DATA`.
- Keep hiring, casting, release, and publication decisions human-approved; never show automatic pass/fail or appearance scoring.
- Do not add a drag-and-drop builder, backend automation engine, or real social integration.
- Use existing dependencies only; do not add a graph or animation package.
- Mobile renders a vertical workflow sequence and must not horizontally compress the desktop graph.

---

## File structure

- Create `src/components/agency/console/types.ts` — workflow and overview data contracts.
- Create `src/components/agency/console/overviewModel.ts` — derives safe overview data from `DemoState`.
- Create `src/components/agency/console/AgencyConsoleShell.tsx` — agency sidebar and top context bar.
- Create `src/components/agency/console/WorkflowMap.tsx` — semantic nodes and decorative SVG connectors.
- Create `src/components/agency/console/AgencyOverview.tsx` — page composition, metrics, recent runs, and review queue.
- Create `src/components/agency/console/overviewModel.test.ts` — model and safety-boundary tests.
- Create `src/components/agency/console/AgencyConsoleShell.test.tsx` — navigation and planned-state tests.
- Create `src/components/agency/console/WorkflowMap.test.tsx` — accessible relationship and route tests.
- Create `src/components/agency/console/AgencyOverview.test.tsx` — overview copy and demo disclosure tests.
- Modify `src/app/agency/layout.tsx` — apply the agency-only console shell.
- Modify `src/app/agency/page.tsx` — render `AgencyOverview`.
- Modify `src/app/globals.css` — console tokens, layout, nodes, connectors, responsive states, focus, and reduced motion.
- Modify `e2e/responsive.spec.ts` — verify the agency overview across supported viewports.
- Create `e2e/agency-overview.spec.ts` — verify navigation, nodes, and status disclosure.

---

### Task 1: Typed overview model

**Files:**
- Create: `src/components/agency/console/types.ts`
- Create: `src/components/agency/console/overviewModel.ts`
- Create: `src/components/agency/console/overviewModel.test.ts`

**Interfaces:**
- Consumes: `DemoState` from `src/types/domain.ts` and `demoState` from `src/features/demo/fixtures.ts`.
- Produces: `WorkflowNode`, `WorkflowConnection`, `AgencyOverviewModel`, and `createAgencyOverviewModel(state: DemoState): AgencyOverviewModel`.

- [ ] **Step 1: Write the failing model tests**

```tsx
import { describe, expect, it } from "vitest";
import { demoState } from "@/features/demo/fixtures";
import { createAgencyOverviewModel } from "./overviewModel";

describe("createAgencyOverviewModel", () => {
  it("derives operational metrics from demo fixtures", () => {
    const model = createAgencyOverviewModel(demoState);
    expect(model.metrics.find((item) => item.id === "candidates")?.value).toBe(demoState.candidates.length);
    expect(model.metrics.find((item) => item.id === "approvals")?.value).toBe(
      demoState.agentJobs.filter((job) => job.status === "approval-required").length,
    );
  });

  it("keeps consequential automation behind a human approval node", () => {
    const model = createAgencyOverviewModel(demoState);
    expect(model.nodes.some((node) => node.kind === "approval" && node.label === "담당자 승인")).toBe(true);
    expect(model.nodes.some((node) => /자동 합격|외모 점수/.test(node.label))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run src/components/agency/console/overviewModel.test.ts`

Expected: FAIL because `overviewModel` does not exist.

- [ ] **Step 3: Define the contracts**

```ts
export type WorkflowNodeKind = "input" | "process" | "approval" | "output";
export type WorkflowNodeState = "active" | "waiting" | "complete" | "planned";

export type WorkflowNode = {
  id: string;
  column: "inputs" | "services" | "outputs";
  kind: WorkflowNodeKind;
  state: WorkflowNodeState;
  label: string;
  detail: string;
  href?: string;
  badge?: string;
};

export type WorkflowConnection = { from: string; to: string };
export type OverviewMetric = { id: string; label: string; value: number | string; href: string };
export type OverviewActivity = { id: string; label: string; meta: string; state: WorkflowNodeState };

export type AgencyOverviewModel = {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  metrics: OverviewMetric[];
  recentRuns: OverviewActivity[];
  reviewQueue: OverviewActivity[];
};
```

- [ ] **Step 4: Implement the fixture-derived model**

Implement `createAgencyOverviewModel` with these required nodes and routes:

```ts
const nodes: WorkflowNode[] = [
  { id: "auditions", column: "inputs", kind: "input", state: "active", label: "오디션 접수", detail: "지원자 프로필과 미디어", href: "/agency/discover" },
  { id: "demo-audio", column: "inputs", kind: "input", state: "active", label: "데모 음원", detail: "A&R 검토 소스", href: "/agency/ax" },
  { id: "source-video", column: "inputs", kind: "input", state: "active", label: "원본 영상", detail: "숏폼 제작 소스", href: "/agency/content" },
  { id: "screening", column: "services", kind: "process", state: "active", label: "Talent Intelligence", detail: "검토 자료 정리", href: "/agency/discover" },
  { id: "approval", column: "services", kind: "approval", state: "waiting", label: "담당자 승인", detail: "사람이 최종 판단" },
  { id: "content", column: "services", kind: "process", state: "active", label: "Content Automation", detail: "포맷과 배포안 준비", href: "/agency/content" },
  { id: "pipeline", column: "outputs", kind: "output", state: "active", label: "Casting Pipeline", detail: "후보 단계 관리", href: "/agency/pipeline" },
  { id: "review-brief", column: "outputs", kind: "output", state: "complete", label: "A&R Review Brief", detail: "검토용 요약", href: "/agency/ax" },
  { id: "channels", column: "outputs", kind: "output", state: "planned", label: "채널별 예약", detail: "연동 예정" },
];
```

Connections must include `auditions → screening → approval → pipeline`, `demo-audio → approval → review-brief`, and `source-video → content → approval → channels`. Metrics use `state.candidates`, `state.agentJobs`, and `state.contentJobs`; planned integrations use text rather than invented counts.

- [ ] **Step 5: Run the model tests and verify GREEN**

Run: `npm test -- --run src/components/agency/console/overviewModel.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the model**

```bash
git add src/components/agency/console/types.ts src/components/agency/console/overviewModel.ts src/components/agency/console/overviewModel.test.ts
git commit -m "feat: model agency AX overview"
```

---

### Task 2: Agency console shell

**Files:**
- Create: `src/components/agency/console/AgencyConsoleShell.tsx`
- Create: `src/components/agency/console/AgencyConsoleShell.test.tsx`
- Modify: `src/app/agency/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `ReactNode`, Next.js `Link`, and existing `DemoBadge` and `RoleSwitcher` components.
- Produces: `AgencyConsoleShell({ children }: { children: ReactNode })` used by `src/app/agency/layout.tsx`.

- [ ] **Step 1: Write the failing shell test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgencyConsoleShell } from "./AgencyConsoleShell";

describe("AgencyConsoleShell", () => {
  it("groups the complete agency operation surface", () => {
    render(<AgencyConsoleShell><div>workspace</div></AgencyConsoleShell>);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/agency");
    expect(screen.getByRole("link", { name: "Talent Intelligence" })).toHaveAttribute("href", "/agency/discover");
    expect(screen.getByRole("link", { name: "Casting Pipeline" })).toHaveAttribute("href", "/agency/pipeline");
    expect(screen.getByRole("link", { name: "A&R Workspace" })).toHaveAttribute("href", "/agency/ax");
    expect(screen.getByRole("link", { name: "Content Automation" })).toHaveAttribute("href", "/agency/content");
    expect(screen.getByText("연동 예정", { selector: ".agency-console-nav__status" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the shell test and verify RED**

Run: `npm test -- --run src/components/agency/console/AgencyConsoleShell.test.tsx`

Expected: FAIL because `AgencyConsoleShell` does not exist.

- [ ] **Step 3: Implement the semantic shell**

Create a shell containing:

```tsx
<div className="agency-console-shell">
  <a className="skip-link" href="#agency-console-main">본문으로 건너뛰기</a>
  <aside className="agency-console-sidebar" aria-label="엔터사 AX 메뉴">
    <Link href="/" className="agency-console-brand">ENTER—AX</Link>
    <nav aria-label="엔터사 AX 워크스페이스">
      <Link href="/agency">Overview</Link>
      <Link href="/agency/discover">Talent Intelligence</Link>
      <Link href="/agency/pipeline">Casting Pipeline</Link>
      <Link href="/agency/ax">A&amp;R Workspace</Link>
      <Link href="/agency/content">Content Automation</Link>
    </nav>
  </aside>
  <div className="agency-console-frame">
    <header className="agency-console-topbar">
      <span>Nova Entertainment / AX Console</span>
      <div><DemoBadge /><RoleSwitcher /></div>
    </header>
    <main id="agency-console-main" className="agency-console-main" tabIndex={-1}>{children}</main>
  </div>
</div>
```

Group links beneath `OPERATE`, `AUTOMATE`, and `OBSERVE`. Render Campaigns and Analytics as non-actionable planned rows with visible `연동 예정`; do not create false routes. Preserve the wordmark, demo badge, role switcher, and a link back to `/`.

- [ ] **Step 4: Apply the shell in the agency layout**

```tsx
import type { ReactNode } from "react";
import { AgencyConsoleShell } from "@/components/agency/console/AgencyConsoleShell";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return <AgencyConsoleShell>{children}</AgencyConsoleShell>;
}
```

- [ ] **Step 5: Add shell styles**

Add `.agency-console-*` rules with a `248px` desktop sidebar, `52px` topbar, `#f7f7f5` canvas, white panels, `#d9d9d6` borders, cobalt active state, and a small orange approval accent. At `max-width: 960px`, turn the sidebar into a horizontally scrollable compact rail above the content. At `max-width: 680px`, reduce panel padding without hiding navigation labels. Include `:focus-visible` outlines.

- [ ] **Step 6: Run the shell test and typecheck**

Run: `npm test -- --run src/components/agency/console/AgencyConsoleShell.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the shell**

```bash
git add src/components/agency/console/AgencyConsoleShell.tsx src/components/agency/console/AgencyConsoleShell.test.tsx src/app/agency/layout.tsx src/app/globals.css
git commit -m "feat: add agency console shell"
```

---

### Task 3: Accessible connected workflow map

**Files:**
- Create: `src/components/agency/console/WorkflowMap.tsx`
- Create: `src/components/agency/console/WorkflowMap.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `{ nodes: WorkflowNode[]; connections: WorkflowConnection[] }` from `types.ts`.
- Produces: `WorkflowMap(props: { nodes: WorkflowNode[]; connections: WorkflowConnection[] }): JSX.Element`.

- [ ] **Step 1: Write the failing workflow-map test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkflowMap } from "./WorkflowMap";

describe("WorkflowMap", () => {
  it("exposes workflow relationships without depending on connector graphics", () => {
    render(<WorkflowMap nodes={[
      { id: "source", column: "inputs", kind: "input", state: "active", label: "원본 영상", detail: "제작 소스", href: "/agency/content" },
      { id: "approval", column: "services", kind: "approval", state: "waiting", label: "담당자 승인", detail: "사람이 최종 판단" },
    ]} connections={[{ from: "source", to: "approval" }]} />);
    expect(screen.getByRole("link", { name: /원본 영상/ })).toHaveAttribute("href", "/agency/content");
    expect(screen.getByText("담당자 승인")).toBeInTheDocument();
    expect(screen.getByText("원본 영상에서 담당자 승인으로 연결")).toHaveClass("sr-only");
  });
});
```

- [ ] **Step 2: Run the map test and verify RED**

Run: `npm test -- --run src/components/agency/console/WorkflowMap.test.tsx`

Expected: FAIL because `WorkflowMap` does not exist.

- [ ] **Step 3: Implement semantic nodes and relationship text**

Render each column as a labeled `<section>`, actionable nodes as `<Link>`, inactive nodes as `<div>`, and each relationship as visually hidden text. Node markup must include `data-kind` and `data-state`. Render connector SVG with `aria-hidden="true"`, `viewBox="0 0 1000 520"`, and orthogonal `<path>` elements using `vector-effect="non-scaling-stroke"`.

- [ ] **Step 4: Style the map and responsive sequence**

Desktop: three grid columns on a faint square grid with 1px orthogonal connectors. Node cards use compact 12–14px type, restrained shadows, and state labels. Mobile: hide the SVG, use a single column ordered by relationships, and add a CSS arrow between adjacent nodes. Honor `prefers-reduced-motion` and never animate layout-affecting properties.

- [ ] **Step 5: Run the map test and verify GREEN**

Run: `npm test -- --run src/components/agency/console/WorkflowMap.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the workflow map**

```bash
git add src/components/agency/console/WorkflowMap.tsx src/components/agency/console/WorkflowMap.test.tsx src/app/globals.css
git commit -m "feat: visualize connected agency workflows"
```

---

### Task 4: Agency overview page

**Files:**
- Create: `src/components/agency/console/AgencyOverview.tsx`
- Create: `src/components/agency/console/AgencyOverview.test.tsx`
- Modify: `src/app/agency/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `createAgencyOverviewModel(demoState)` and `WorkflowMap`.
- Produces: `AgencyOverview(): JSX.Element` rendered by `/agency`.

- [ ] **Step 1: Write the failing overview test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgencyOverview } from "./AgencyOverview";

describe("AgencyOverview", () => {
  it("presents a complete AX operation overview with truthful states", () => {
    render(<AgencyOverview />);
    expect(screen.getByRole("heading", { name: "엔터테인먼트 운영을 하나의 AX 흐름으로" })).toBeInTheDocument();
    expect(screen.getAllByText("DEMO DATA").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Connected workflow" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "승인 대기" })).toBeInTheDocument();
    expect(screen.queryByText(/자동 합격|외모 점수/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the overview test and verify RED**

Run: `npm test -- --run src/components/agency/console/AgencyOverview.test.tsx`

Expected: FAIL because `AgencyOverview` does not exist.

- [ ] **Step 3: Implement the overview composition**

The component order is:

```tsx
<div className="agency-overview">
  <header className="agency-overview__header">
    <p>AGENCY AX / OVERVIEW</p>
    <h1>엔터테인먼트 운영을 하나의 AX 흐름으로</h1>
    <p>인재 검토부터 콘텐츠 배포 준비까지 연결 상태와 다음 행동을 확인하세요.</p>
    <Link href="/agency/discover">Talent Intelligence 열기</Link>
    <Link href="/agency/content">Content Automation 열기</Link>
  </header>
  <nav className="agency-context-tabs" aria-label="Overview sections">
    <Link href="/agency" aria-current="page">Overview</Link>
    {['Workflows', 'Runs', 'Analytics', 'Integrations', 'Settings'].map((label) => (
      <span aria-disabled="true" key={label}>{label} · DEMO</span>
    ))}
  </nav>
  <section className="agency-workflow-panel" aria-labelledby="workflow-title">
    <h2 id="workflow-title">Connected workflow</h2>
    <WorkflowMap nodes={model.nodes} connections={model.connections} />
  </section>
  <section className="agency-metrics" aria-label="운영 지표">
    {model.metrics.map((metric) => <Link href={metric.href} key={metric.id}>{metric.label}: {metric.value}</Link>)}
  </section>
  <div className="agency-overview__lower-grid">
    <section><h2>최근 실행</h2>{model.recentRuns.map((run) => <p key={run.id}>{run.label}</p>)}</section>
    <section><h2>승인 대기</h2>{model.reviewQueue.map((item) => <p key={item.id}>{item.label}</p>)}</section>
  </div>
</div>
```

Use real links for Overview and existing workspaces. Render `Workflows`, `Runs`, `Analytics`, `Integrations`, and `Settings` as disabled-looking tabs with `aria-disabled="true"` and `DEMO` text rather than fake links. Recent-run language describes preparation and routing, not autonomous decisions.

- [ ] **Step 4: Replace the agency page**

```tsx
import { AgencyOverview } from "@/components/agency/console/AgencyOverview";

export default function AgencyStartPage() {
  return <AgencyOverview />;
}
```

- [ ] **Step 5: Add overview styles**

Use a maximum content width of `1440px`, compact 24–32px page padding, thin panel borders, a 16px radius only on major panels, and minimal shadows. Avoid the existing centered `.entry-page` hero styling. Add clear orange waiting and green completed chips, while cobalt remains the primary action color.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npm test -- --run src/components/agency/console && npm run typecheck`

Expected: all console tests PASS and TypeScript exits 0.

- [ ] **Step 7: Commit the overview**

```bash
git add src/components/agency/console/AgencyOverview.tsx src/components/agency/console/AgencyOverview.test.tsx src/app/agency/page.tsx src/app/globals.css
git commit -m "feat: redesign agency overview as AX console"
```

---

### Task 5: Responsive and workflow regression coverage

**Files:**
- Create: `e2e/agency-overview.spec.ts`
- Modify: `e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: `/agency` rendered by Tasks 1–4.
- Produces: desktop and responsive behavioral coverage.

- [ ] **Step 1: Add the failing agency overview E2E test**

```ts
import { expect, test } from "@playwright/test";

test("agency overview exposes connected operations and existing workspaces", async ({ page }) => {
  await page.goto("/agency");
  await expect(page.getByRole("heading", { name: "엔터테인먼트 운영을 하나의 AX 흐름으로" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Connected workflow" })).toBeVisible();
  await expect(page.getByText("담당자 승인", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Casting Pipeline/ })).toHaveAttribute("href", "/agency/pipeline");
  await expect(page.getByText("DEMO DATA").first()).toBeVisible();
});
```

- [ ] **Step 2: Extend responsive coverage**

Add `/agency` to the existing route list in `e2e/responsive.spec.ts` and retain the existing assertion that `document.documentElement.scrollWidth <= window.innerWidth`.

- [ ] **Step 3: Run focused E2E tests**

Run: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 npx playwright test e2e/agency-overview.spec.ts e2e/responsive.spec.ts`

Expected: PASS on Chromium, Pixel 7, and iPad Pro projects.

- [ ] **Step 4: Run repository verification**

Run: `git diff --check && npm run typecheck && npm test`

Expected: no diff errors, TypeScript exits 0, and all non-skipped unit tests pass.

Run: `npm run lint`

Expected: no new errors in files changed by this plan. Existing warnings in bundled `.agents/skills` content may remain documented.

Run: `npm run build`

Expected: build passes. If the existing `.venv-vision/bin/python` out-of-root symlink still causes a Turbopack panic, record it as a pre-existing environment blocker and do not delete or rewrite the virtual environment.

- [ ] **Step 5: Visually inspect supported layouts**

Open `/agency` at desktop, tablet, and mobile widths. Verify the desktop connectors align to nodes, mobile shows a vertical directed sequence, focus rings are visible, `연동 예정` is non-actionable, and ordinary records remain lists or panels rather than graph nodes.

- [ ] **Step 6: Commit regression coverage**

```bash
git add e2e/agency-overview.spec.ts e2e/responsive.spec.ts
git commit -m "test: cover agency AX console overview"
```
