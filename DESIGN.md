# Ask the Swarm — implemented design

## Overview

A single-purpose oracle for playful yes/no questions. The page uses a near-black ground, off-white geometric type, violet particles and one lavender primary action. The organic constellation is the centerpiece; interface controls stay quiet and readable beneath it. The user's described swarm direction is authoritative; the current IMD homepage was inspected as context, not copied wholesale.

The page has a compact IMD header, centered introduction, canvas with HTML answer overlay, motion/status toolbar, question form and small footer. It is a one-page composition, not a general dashboard system.

## Colors

Canonical primitive and semantic tokens are in `src/style.css:10`. Components consume semantic tokens. Hex is the implemented notation. Only the requested dark appearance is supported.

| Semantic token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#090b10` | Page background |
| `--color-surface` | `#12141d` | Input and quiet hover surface |
| `--color-line` | `#262935` | Header/footer rules and decorative lines |
| `--color-input-border` | `#737787` | Identifiable input boundary |
| `--color-text` | `#f2f0f9` | Headline, input, answers |
| `--color-muted` | `#9b9dac` | Supporting copy, placeholder, motion label |
| `--color-accent` | `#b6a4ff` | Filled primary action and brand decoration |
| `--color-accent-hover` | `#c6b6ff` | Primary hover |
| `--color-accent-active` | `#9d85ef` | Busy primary action |
| `--color-on-accent` | `#090b10` | Primary-action text |
| `--color-focus` | `#c6b6ff` | 2px focus outline, 5px offset |
| `--color-ready` | `#a7dec9` | Ready dot, paired with text |
| `--color-error` | `#ffb2be` | Error text and field outline |

Canvas colors are decorative RGBA violet layers defined in `src/swarm.ts`. They do not encode answer categories. The button is the only filled action. Error and readiness each have text cues; color never carries their meaning alone. Measured solid-pair contrast and the moving-canvas limitation are recorded in validation.

## Typography

`--font-body` is locally bundled **Space Grotesk**, then Arial/sans-serif. `public/fonts/space-grotesk-latin.woff2` is a normal-style 300–700 variable font; implemented text uses weights 400, 500, 600 and 700. `font-display: swap` and root smoothing are enabled. The font was confirmed loaded in Chromium. `--font-mono` uses SFMono-Regular, Consolas, Liberation Mono or monospace for small oracle annotations; it has no network dependency.

| Role | Size / weight / line height |
| --- | --- |
| Main heading | `clamp(2.5rem, 5.4vw, 4rem)` / 500 / 1.1; tracking −.055em |
| Main heading ≤35rem | `clamp(2.1rem, 9vw, 3rem)` |
| Body / question input | `1rem` / 400 / 1.5–1.6 |
| Labels / header note | `.8125rem` / 400–500 |
| Primary button | `.875rem` / 600 / 1.5 |
| Helper / toolbar / footer | `.75rem` / 400 / 1.5–1.6 |
| Answer | `1.65rem`, mobile `1.3rem` / 500 / 1.4 |
| Decorative orb captions | `.625rem`, mobile `.5625rem` / 400 / 1.6; .16em tracking |

Headings and answers use balanced wrapping. Descriptions use pretty wrapping. Answers have a 260px measure (225px on mobile); their parent can grow with enlarged text. Inputs remain 16px at the default root size on mobile. Small decorative orb annotations are hidden from assistive technology; the answer is separately exposed through a persistent live region.

## Layout

The page shell has `min-height: 100svh`, a flexible main and a footer in normal flow. Chrome is capped at 1328px, main at 1040px, oracle at 850px, and the form at 600px. The canvas stage is at most 570px wide. Its minimum height is 360px, then 350px at ≤48rem and 310px at ≤35rem. HTML answer content establishes a larger height when needed; the absolute canvas follows that size through `ResizeObserver`.

Spacing tokens are 4, 8, 12, 16, 24, 32 and 48px (`--space-1` through `--space-12`). Main chrome uses a 24px side inset; mobile uses 20px, accounting for safe-area inset. Control gap is 12px, label gap 12px, and form-to-oracle gap 25px (22px mobile).

- At ≤48rem: side annotations and header note hide; header height reduces to 76px.
- At ≤35rem: header is 70px; question controls stack; the button fills the form width; secondary footer copy hides; toolbar can wrap. The orb extends 15px into each content gutter but stays within the viewport.
- Input/button minimum height: 58px desktop, 56px mobile. Motion control and brand link: at least 44px tall.

No fixed positioning covers content. Vertical scrolling is expected on short/mobile viewports. Actual 320, 390, 768 and 1440px layouts and 200% text enlargement were inspected without horizontal overflow. English is the supplied language; no localization or RTL variant is shipped.

## Elevation & Depth

The interface is mostly flat. Thin rules separate header/footer; the input has a structural border. The swarm uses pre-rendered violet glow sprites and a faint annular atmosphere. Answer text has a subtle `0 0 24px #b6a4ff44` glow. The ready dot has a small mint glow. There are no cards, dialogs or floating panels.

## Shapes

Controls share `.75rem` corners through `--radius-control`; the motion control uses 5px corners. The IMD brand and favicon use a nested diamond motif. The canvas is a slowly deforming 3D shell with multiple lobes, not a static circular image. Glows have an 8px minimum fit margin.

## Components

- **Header/footer** (`index.html`, `.site-header`, `.site-footer`): real external brand link; neutral supporting text. Footer includes “Powered by the IMD swarm”.
- **Oracle** (`src/swarm.ts`, `.oracle`): `new Swarm(canvas)`; `setPhase('idle'|'thinking'|'revealed')`, `setPaused(boolean)`, `destroy()`. Desktop uses 320 agents, narrow canvas 210, DPR capped at 1.75. Five neighbors are precomputed per node; four line-opacity batches and cached glow sprites limit per-frame work. Rotation is continuous between phases.
- **Answer overlay** (`.orb-message`, `.answer`): idle diamond/caption; thinking caption; balanced HTML result. The persistent `#announcement` status exposes thinking and result to assistive technology.
- **Question form** (`src/main.ts`, `#question-form`): visible label, native text input and submit button, Enter support, 500-character limit. Empty/whitespace submission shows “Ask it something first.”, sets `aria-invalid`, and focuses the field. Typing clears it. Busy state makes the input read-only and disables submit with the original label and spinner. The question remains after a result.
- **Motion control** (`#motion-toggle`): pause/resume text and icon. Reduced-motion preference takes precedence and is named explicitly. Hidden tabs stop rendering. No persisted setting or storage is used.

Thinking lasts 1500ms; node acceleration/contraction is followed by a 650ms release and answer fade. Error shake is 300ms at ±3px. Button press scale is .96. Ordinary interaction transitions are 150ms with `cubic-bezier(.2,0,0,1)`. CSS animation only runs under `prefers-reduced-motion: no-preference`; reduced motion gives static canvas states. Forced-colors focus uses the system `Highlight` color.

## Do's and Don'ts

- Reuse semantic color tokens, the centered content widths, and the existing native field/button patterns.
- Keep one filled primary action and include a textual cue for changing state.
- Preserve relative asset URLs, local assets, motion preferences and the answer's ability to grow with text.
- Keep particle detail in Canvas, interactive controls and results in HTML. Avoid introducing backend/wallet/tracking dependencies.
- For a future companion page, reuse `.page-shell`, the chrome and typography tokens, add one clear main heading, then compose normal-flow sections. Add a page only as a separate requested scope; this export needs no router.

Design-guide provenance and licenses: `docs/NOTICE.md` and `docs/licenses/better-interface.txt`.
