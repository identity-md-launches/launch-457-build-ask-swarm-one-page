# Ask the Swarm

A small, static Magic 8-Ball for the wonderfully undecided. Ask a yes-or-no question; a living constellation gathers for 1.5 seconds, then reveals its answer.

Built with TypeScript, Vite and Canvas 2D. No runtime framework, backend, wallet, analytics, cookies or external asset requests. Questions remain in page memory and are never sent or saved. The IMD header link is an ordinary link to `https://imd.fun`.

## Install and run

Use Node.js 22.13 or newer and npm:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For production:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm test` compiles the answer module into disposable `test/scratch/answers/` and runs Node's test runner. It does not need Node's optional TypeScript runtime support. `npm run preview` serves the existing export; it does not rebuild. Stop either server with Ctrl+C. Opening `index.html` directly through `file://` is not the supported preview path; use HTTP.

## Edit the answers

Edit `ANSWERS` in [src/answers.ts](src/answers.ts). Keep at least two unique, nonempty strings. The assignment's ten exact answers are included. The initial choice gives each answer equal probability; later choices give each answer except the previous one equal probability. There are no immediate repeats during a page session. Reloading starts a new session.

The timing and field behavior live in `src/main.ts`; animation is in `src/swarm.ts`; design tokens and responsive styles are in `src/style.css`. Rebuild `dist/` after any source change. If deliberately changing the number of answers, update the ten-answer assertions in `tests/answers.test.mjs` too.

## Static export and publication

The complete, ready-to-serve site is in **`dist/`**. Keep it in the Git submission alongside source, `package.json`, `package-lock.json`, configuration, tests and documentation. The contributor publisher serves this export without rebuilding it. Vite's `base: './'` makes scripts, styles, fonts and the favicon relative to the served location; `/preview/` hosting was tested.

- **Static host:** upload the contents of `dist/` as the site's document root, or select `dist` as the publish directory. No server functions or rewrite rules are needed. A Git-connected host can run `npm ci && npm run build`, with `dist` as output.
- **IPFS:** upload/pin the entire `dist` directory, keeping `index.html` at the pinned root and preserving `assets/` and `fonts/`. Open the returned CID through a gateway with a trailing `/`. Publish that gateway URL or attach the CID to your chosen domain. Do not pin only `index.html`.
- **GitHub source:** publish the repository including `dist/`, source and lockfile. Exclude dependency installations, package caches, disposable `test/scratch/` and browser-tool temporary output. No workflow or submodule is needed.

The export is ready for the authorized contributor-network publisher. This worker did not create a public deployment or public URL: no hosting account/repository destination or publishing tool was provided. No Git metadata, `.github`, environment files or repository `node_modules` were modified. No ignore file was created or changed.

## Verification performed

On 2026-09-29, against the final export:

- Production build, TypeScript check and all **3 answer tests passed**. Tests cover 100,000 deterministic samples and every excluded previous answer.
- **34 Chromium interaction/layout assertions passed**: Enter and click submission, empty/whitespace recovery, 1.5-second delay (observed 1,536ms), duplicate-submit guard, repeat exclusion, longest answer, retained question, pause/resume and reduced motion.
- Inspected screenshots at 320, 390, 768 and 1440 CSS pixels, including 200% text enlargement. Fixed the discovered enlarged-answer overlap and rechecked. Keyboard focus indicators were viewed, including forced colors.
- Axe 4.10.3 reported zero automatic violations in answer/error states; some contrast checks over the canvas require manual assessment. All ordinary solid text/control color pairs measured above their applicable thresholds.
- Production requests returned HTTP 200 from a subpath; no console warnings/errors or failed assets. Local Space Grotesk loaded successfully.
- Mobile touch emulation worked. A 150-frame DPR-2 mobile-viewport sample averaged 16.666ms/frame (~60fps); a separate 4× CPU slowdown sample averaged 27.555ms (~36fps). These are desktop Chromium emulation measurements, not physical-phone guarantees.
- Final dependency audit: zero known vulnerabilities.

Full six-domain review, fixes, evidence and limitations: [artifacts/validation.md](artifacts/validation.md). Implemented design system: [DESIGN.md](DESIGN.md). Screenshots are in `artifacts/`.

The sandbox kept installed packages and npm cache under `/tmp`, then used `PATH=/tmp/ask-swarm-toolchain/node_modules/.bin:$PATH` for the scripts above. Normal installations use `npm ci`. `tests/browser-check.mjs` exports `validate(page, baseUrl)` for an existing Playwright Page; the worker executed that same function through the supplied browser tool. Playwright is intentionally not a runtime or build dependency.

Not performed: physical iOS/Android, Safari/Firefox, native screen-reader speech, browser-native 200% zoom, or real IPFS/public-host deployment. Text enlargement is distinct from native zoom. The network verifier checks paths and bytes, not these behavioral results.

## Attribution

Space Grotesk by Florian Karsten is locally bundled under the SIL Open Font License; see `public/fonts/OFL.txt` (also in the export). The design applies the supplied Better Interface guide by Jakub Krehel (MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`) and its documentation method adapted from Paul Bakaus's Impeccable (Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). See [docs/licenses/better-interface.txt](docs/licenses/better-interface.txt) and [docs/NOTICE.md](docs/NOTICE.md).
