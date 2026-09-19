# Testing Classic Snake

JSON case files under `tests/cases/` are the **source of truth**. Unit (`npm test`) and Playwright (`npm run test:e2e`) load those files and drive assertions from `steps` / `expect`. Do not add a new Scrutiny scenario only as hard-coded TypeScript.

CSV export of results is optional later. JSON stays canonical. There is no spreadsheet ingest.

## Case files

Path: `tests/cases/*.json` (one case = one object / file).

| Field | Required | Values |
|---|---|---|
| `id` | yes | Stable id (`A5`, `B7`, `C14`, …) |
| `layer` | yes | `unit` \| `e2e` \| `pixel` |
| `title` | yes | Human-readable name |
| `steps` | yes | Interpreter ops (`openFresh`, `seedHigh`, `eatOnce`, `persistBest`, …) |
| `expect` | yes | Interpreter asserts (`visible`, `highScore`, `tickInterval`, `noVerticalClip`, …) |
| `gate` | yes | `block` (fails **TEST PASS**) \| `optional` |
| `viewport` | no | `desktop` for a 1280×800 smoke; otherwise Pixel project |

**Add a feature:** add or edit a JSON file, then re-run `npm test` and/or `npm run test:e2e`. Extend `tests/cases/unit-runner.ts` or `tests/e2e/case-runner.ts` only when you need a new op/assert.

Gate mapping: E2E **B7 / B9 / B10** and Pixel **C14** use `gate: "block"`. Do not skip, soften, or `fixme` those cases.

## Local

```bash
npm install
npx playwright install --with-deps chromium

npm test                 # loads tests/cases/*.json (layer=unit) + catalog checks
npm run test:e2e         # Playwright Chromium; loads e2e/pixel JSON cases
npm run test:e2e:pixel   # Pixel project only (412×915)
```

`npm run test:e2e` builds `dist/` and starts `vite preview` at `http://127.0.0.1:4173/classic-snake/` unless `BASE_URL` is set. Failure screenshots land in `test-results/`.

`classic-snake-ci` owns C14 on Chromium at 412×915: `gate: "block"`, measurable HUD / maze / D-pad asserts. A missing or emptied C14 JSON fails `npm test` catalog checks.

## Live smoke (`BASE_URL`)

Honor `BASE_URL` for a remote host. Playwright does **not** start a local webServer when it is set. Documented mounts (never hard-code only one host):

| Environment | URL |
|---|---|
| Local preview (default) | `http://127.0.0.1:4173/classic-snake/` |
| playaddatest | `https://playaddatest.duckdns.org/classic-snake/` |
| prod | `https://playadda.duckdns.org/classic-snake/` |

```bash
BASE_URL=https://playaddatest.duckdns.org/classic-snake/ npm run test:e2e
BASE_URL=https://playadda.duckdns.org/classic-snake/ npm run test:e2e
```

## Jenkins `classic-snake-ci` / `classic-snake-test`

Linux Builder agent. Both jobs run the suite **from the git checkout only** — no Google Sheet, spreadsheet ingest, or CSV import on the agent.

Set **`DEPLOY=false`**. These `*-ci` jobs must not rsync or publish `dist/`.

```bash
npm ci
npx playwright install --with-deps chromium
npm test
npm run test:e2e:pixel    # C14 block gate; classic-snake-ci must run this
npm run test:e2e          # pixel catalog (e2e + pixel JSON cases)
```

Set `CI=1` so Playwright uses the CI reporter, retries once, and does not reuse an existing preview server. For live playaddatest or prod smoke, export `BASE_URL` to that host’s Classic Snake path.

## Catalog (A–C)

| id | Layer | Gate | Coverage |
|---|--------|------|----------|
| A5 | unit | optional | Beating Best writes `classic-snake-v1`; a lower score does not overwrite |
| A6 | unit | optional | `GAME_VERSION` matches `package.json` / shipped HTML title |
| A8 | unit | optional | Mobile base tick 250ms vs desktop 168ms; floors 80 / 55 |
| B7 | e2e | **block** | How-to-play and Start on the same first screen |
| B8 | e2e | optional | Version ID on launch + play HUD (`v1.x.x`) |
| B9 | e2e | **block** | Best localStorage updates when beaten and survives reload |
| B10 | e2e | **block** | Pixel / coarse pointer uses 250ms base tick (`window.__snake.getInterval`) |
| C14 | pixel | **block** | Maze + D-pad usable at 412×915 without critical clip |

`src/game/cases.test.ts` fails if a required id is missing or a block case is not `gate: "block"`.

## Manual-only (do not automate, not in JSON)

C14 home-bar coverage in CI is a CSS `--safe-bottom` emulation (34px) plus Chromium 412×915. Still manual:

- Real Pixel 7a / Android Chrome gesture-bar and cutout.
- iPhone Safari-only visual quirks (dynamic toolbar, `visualViewport` dips, rubber-band).
- Subjective aesthetics beyond measurable clip / usable board size.
- Weekly prod / merge greenlights and sign-off rituals.

## Hooks

Stable `data-testid` attributes (`version`, `howto`, `start`, `hud`, `best`, `board`, `dpad`, `start-screen`, …). Safe-area padding reads `--safe-top` / `--safe-bottom` (default `env(safe-area-inset-*)`) so Pixel cases can emulate a 34px home bar. Gameplay logic is unchanged.
