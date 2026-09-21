# ENTER—AX Agency Console Design

Date: 2026-09-21  
Status: Approved direction, awaiting written-spec review

## Objective

Replace the current marketing-style `/agency` start page with a professional operations overview for entertainment-company teams. The interface should borrow the clarity of Cloudflare's product console—persistent navigation, compact operational tabs, visible system relationships, and measurable status—without copying its brand or turning every task into a node editor.

The product proposition is broader than talent development. ENTER—AX connects talent discovery, casting operations, A&R review, content automation, campaign distribution, approvals, and analytics in one console.

## Design principles

1. **Nodes explain relationships, not ordinary records.** Use node diagrams only when inputs, processes, dependencies, or outputs must be understood together. Lists, tables, cards, forms, and kanban boards remain the default for repeated operational work.
2. **Operate before persuade.** `/agency` is an authenticated-product-style overview, not a landing page. It prioritizes current status, next actions, system relationships, and navigation.
3. **Professional density.** Use a precise light canvas, slim borders, restrained cobalt and orange accents, compact typography, and deliberate spacing. Avoid oversized marketing cards and decorative gradients.
4. **Product truth.** Demo values are labeled `DEMO DATA`. Consequential steps retain human approval. The UI must not imply automatic hiring decisions, appearance scoring, real integrations, or unsupported performance claims.
5. **Progressive disclosure.** The overview shows enough context to choose the next workspace. Detailed configuration and records remain on their existing routes.

## Information architecture

The agency shell gains a console-oriented navigation model.

### Persistent left navigation

- Overview — `/agency`
- Talent Intelligence — `/agency/discover`
- Casting Pipeline — `/agency/pipeline`
- A&R Workspace — `/agency/ax`
- Content Automation — `/agency/content`
- Campaigns — represented as planned/demo unless an existing route supports it
- Analytics — represented as overview data, without inventing a full route

The sidebar groups items under `Operate`, `Automate`, and `Observe`. Existing URLs and their primary actions remain unchanged.

### Context tabs

The `/agency` content header exposes:

- Overview
- Workflows
- Runs
- Analytics
- Integrations
- Settings

Only Overview is fully active in this scope. Other tabs are visibly marked as demo/planned or rendered as non-navigating controls so the interface does not imply unavailable functionality.

## Overview composition

### 1. Console header

Show workspace identity, environment state, and a concise title: `엔터테인먼트 운영을 하나의 AX 흐름으로`. Primary actions lead to Talent Intelligence and Content Automation. The header is compact and operational rather than a full-height hero.

### 2. Connected workflow map

The main visual panel presents three columns:

- **Inputs:** audition submissions, demo audio, source video, campaign schedule
- **ENTER—AX services:** talent screening, human review, A&R analysis, content transformation, approval gate
- **Outputs:** casting pipeline, review brief, scheduled channels, performance report

Orthogonal connectors show direction. Cobalt indicates active internal processing, orange marks items awaiting human approval, green marks completed output, and gray indicates inactive/demo connections. Each node includes a short label, status, and record count where the repository already has defensible demo data.

Nodes link to existing workspaces when a matching route exists. They are not draggable in this iteration; drag-and-drop would suggest an automation builder that the product does not yet support.

### 3. Operational metrics

Below the map, a compact metrics strip shows values derived from existing demo fixtures where possible:

- active candidates
- approvals waiting
- automation runs
- errors or blocked items

Metrics are labeled `DEMO DATA`, use no fabricated external benchmarks, and link to the relevant existing workspace.

### 4. Recent runs and next actions

A two-column section lists recent workflow activity and items requiring review. Status language must distinguish automated preparation from human decisions. Empty and error states remain explicit.

## Component architecture

- `AgencyConsoleShell`: sidebar, compact top bar, mobile navigation, and main content frame. It is used for agency surfaces without changing talent or public shells.
- `AgencyOverview`: page composition for `/agency`.
- `WorkflowMap`: accessible SVG/CSS connector layer and semantic node list.
- `WorkflowNode`: reusable input, process, approval, and output node.
- `OperationalMetrics`: demo-derived summary links.
- `RecentRuns`: read-only activity list using existing fixture vocabulary.
- `ReviewQueue`: human-approval-oriented next actions.

The workflow map data is declared as a small typed local model. Rendering stays separate from the model so future API data can replace fixtures without rewriting layout code.

## Interaction and accessibility

- Every actionable node is a real link with visible keyboard focus.
- Connector lines are decorative; the same relationship is represented by DOM order and accessible labels.
- Hover may reveal a short description, but no essential information depends on hover.
- Motion is limited to a subtle initial connector reveal and status pulse, disabled by `prefers-reduced-motion`.
- Desktop uses a fixed sidebar and three-column map. Tablet collapses the sidebar. Mobile converts the map into a vertical directed sequence; it never compresses a desktop graph beyond readability.
- Color is never the only status signal; every state includes text or an icon-label pair.

## Data and safety boundaries

Existing demo fixtures are the only source for candidate counts and current activity. Where no fixture exists, the overview uses qualitative state such as `연동 예정` rather than a number. No external integrations are activated by this work.

Automation nodes prepare or route material. Hiring, casting, release, and publication actions remain human-approved. The overview must never show automatic pass/fail or appearance scores.

## Error and empty states

- A node with unavailable data shows `데이터 없음` without disappearing from the relationship map.
- A planned integration shows `연동 예정` and cannot be activated.
- An interrupted workflow appears in Recent Runs with a clear retry destination only when an existing route supports that action.
- The page remains usable if metric data is empty; values fall back to zero or a textual unavailable state.

## Scope

### Included

- Professional console shell for agency pages
- Complete `/agency` Overview redesign
- Responsive connected-workflow visualization
- Links into existing discovery, pipeline, A&R, and content workspaces
- Demo-data labels, focus states, reduced-motion handling, and regression coverage

### Excluded

- General-purpose drag-and-drop workflow builder
- New backend automation engine
- Real social-channel integrations
- New Campaign, Analytics, Integrations, or Settings products
- Changes to talent-facing routes

## Verification

- Component tests verify navigation labels, demo disclosure, human-approval wording, and node-to-route links.
- Existing agency route tests continue to pass.
- Type checking and focused unit tests pass.
- Playwright verifies desktop, tablet, and mobile layouts have no horizontal viewport overflow and that keyboard navigation reaches every actionable node.
- Visual review verifies connectors remain legible and ordinary records have not been unnecessarily converted into nodes.
