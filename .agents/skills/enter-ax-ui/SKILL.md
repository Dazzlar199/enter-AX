---
name: enter-ax-ui
description: Use when designing, reviewing, or modifying landing pages, talent flows, agency dashboards, forms, responsive layouts, accessibility, or motion in the Enter-AX frontend.
---

# Enter-AX UI

Create a coherent interface without turning a UI task into an unapproved rebrand. Product truth, human review, and task completion outrank decoration.

## Read the surface

Classify the requested surface before editing:

- **Persuade**: `/` and marketing sections. Clarify the value proposition, role choice, product proof, and primary action.
- **Operate**: `/talent/*` and `/agency/*`. Optimize scanability, state visibility, keyboard use, and task completion.
- **Shared shell**: navigation, role switching, status, and feedback. Preserve consistency across both modes.

State a one-line design read covering the surface, audience, task, and whether the request is refinement or an explicitly approved redesign.

## Preserve product truth

- Keep `ENTER—AX`, routes, primary navigation, role boundaries, and tested CTA intent unless the user explicitly approves changes.
- Preserve Korean product voice and factual safety boundaries: human approval for consequential actions, clear `데모` or `API 연동 예정` labels, no automatic pass/fail, and no appearance scoring.
- Do not invent partners, performance claims, applicant metrics, testimonials, or operational capabilities. Mark sample data as demo data.
- Visual refinement does not authorize changes to information architecture, form semantics, analytics labels, or legal/consent copy.

## Design decisions

- Start from the existing light precision system and semantic tokens. Brand colors and the wordmark are evidence, not placeholders.
- Use color to communicate hierarchy or state. Keep cobalt as the primary action color; use success, warning, and danger colors semantically rather than as competing accents.
- On **Persuade** surfaces, favor concise value, distinct talent/agency paths, and proof using real components or approved assets.
- On **Operate** surfaces, favor clear grouping, compact hierarchy, useful sticky context, complete states, and task-specific mobile layouts rather than compressed desktop boards.
- Avoid generic AI styling such as unexplained neon gradients, interchangeable feature-card rows, decorative status dots, fake terminal/dashboard imagery, and motion added only for spectacle.
- Reuse the existing token and component system before adding dependencies. Check `package.json` before importing any package.

## Interaction and motion

Animate only for hierarchy, state change, spatial continuity, or feedback. Repeated operations should be instant or brief. Prefer CSS for predetermined effects; add a library only when required. Prefer transform and opacity, specify transition properties, keep focus visible, gate hover effects to fine pointers, and honor `prefers-reduced-motion`.

## Workflow

1. Inspect the target, tokens/components, relevant tests, and mobile behavior.
2. Identify what must be preserved and the smallest coherent improvement scope.
3. Use semantic HTML and existing patterns; never enable external hooks or downloaded design binaries implicitly.
4. Review factual copy, keyboard flow, contrast, responsive behavior, and all meaningful states.
5. Run focused tests, then typecheck, lint, unit tests, build, and affected Playwright flows when warranted.

For an explicit UI review, report findings in a `Before | After | Why` table and distinguish required fixes from optional taste improvements.
