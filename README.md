# Get Retirement Right

A retirement calculator designed to answer the *real* questions about retirement planning.

**Live app:** https://adambushman.github.io/retirement-calculator/

Most free retirement calculators tell a partial story: a single balance at the start of retirement, dollar figures left un-adjusted for decades of inflation, and retirement modeled as one flat, unchanging phase. This project models retirement as it actually unfolds — in stages, with spending that shifts over time — and gives you the levers to pivot early.

---

## What it does

- **Year-by-year projection** of an investment balance from your current age through life expectancy, applying contributions, withdrawals, and compounding growth for every year.
- **Three retirement stages** — *Go-Go*, *Slow-Go*, and *No-Go* — each with its own length and withdrawal rate, reflecting how activity and spending typically change through retirement.
- **Inflation toggle** that re-expresses every dollar in "today's dollars" using cumulative inflation to the point in time.
- **Stage breakdown** showing end balance, total contributions/withdrawals, and compounded growth for each phase.
- **Recommendations** — plan adjustments derived from the ideas in Bill Perkins' *Die With Zero*, surfaced when your projected end balance runs negative or piles up well in the black.
- **Assumptions & FAQ** sections that spell out exactly how the math is done.

Everything recalculates reactively as you move a slider or edit an input. There is no backend and no persistence — the entire model lives in the browser.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Vue 3 (`<script setup>`, Composition API) |
| Language | TypeScript |
| Build tool | Vite 7 |
| State | Pinia (single setup store) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| UI components | [PrimeVue 4](https://primevue.org/) in unstyled mode + [Volt](https://volt.primevue.org/) components vendored into `src/volt/` |
| Theming | `@primeuix/themes` + `tailwindcss-primeui`, emerald primary palette with light / system-dark CSS variables |
| Charting | [Observable Plot](https://observablehq.com/plot/) (`@observablehq/plot`) |
| Number formatting | `d3-format` |
| Deployment | GitHub Pages via `gh-pages` |

The app is a **single page** — no Vue Router. `App.vue` composes three top-level sections: `InputsDrawer`, `ProjectionPanel`, and `FAQ`.

---

## Project structure

```
src/
├── App.vue                     # Page shell: headline + Inputs / Projection / FAQ
├── main.ts                     # App bootstrap: PrimeVue (unstyled) + Pinia
├── assets/
│   └── main.css                # Tailwind imports + PrimeVue theme variables (light/dark)
│
├── stores/
│   └── useRetirementStore.ts   # THE model — all inputs + every derived figure
│
├── composeables/               # (sic) composables
│   ├── useProjections.ts       # Core projection engine (stage-by-stage growth)
│   └── useHelpers.ts           # formatRange() and other small utilities
│
├── components/
│   ├── InputsDrawer.vue        # Accordion of inputs: Earning & Saving / Retirement Plan / Misc
│   ├── SectionHeader.vue       # Shared section heading
│   ├── SliderLabel.vue         # Positioned labels above the stage-length range slider
│   ├── NumberInput.vue         # Legacy prototype input (unused)
│   ├── IconToolTip.vue         # Hover/tap tooltip wrapper
│   │
│   ├── projection/
│   │   ├── ProjectionPanel.vue     # "Results" panel wrapper
│   │   ├── ProjectionChart.vue     # Stacked bar chart of balance by age + inflation toggle
│   │   ├── PlotFigure.vue          # Thin Vue wrapper around Observable Plot
│   │   ├── ProjectionDetails.vue   # Tab container for the four result views
│   │   ├── ProjectionSummary.vue   # Plain-language "you're projected to…" summary
│   │   ├── Recommendations.vue     # Renders store.recommendations
│   │   └── Assumptions.vue         # Static list of modeling assumptions
│   │
│   ├── stage-summary/
│   │   ├── StageSummaryPanel.vue   # Grid of the four stage cards
│   │   └── SingleStageSummary.vue  # One stage card (balance / flow / growth)
│   │
│   └── faq/
│       ├── FAQ.vue
│       └── QuestionAnswer.vue
│
└── volt/                       # Vendored PrimeVue "Volt" components (Button, Slider,
                                # InputNumber, Accordion, Tabs, Panel, ToggleSwitch, …)
```

---

## How the projection engine works

All of the math lives in [`src/composeables/useProjections.ts`](src/composeables/useProjections.ts) and is orchestrated by the Pinia store.

1. **The store builds four stages** from your inputs, in order:

   | Stage | Growth rate | Length | Monthly cash flow |
   | --- | --- | --- | --- |
   | Pre-retirement | pre-retirement growth | `ageRetirement − ageToday` | + contribution (savings rate × income), grown by annual raises |
   | Go-Go Years | intra-retirement growth | first slice of retirement | − withdrawal (Go-Go rate × final working income) |
   | Slow-Go Years | intra-retirement growth | middle slice | − withdrawal (Slow-Go rate) |
   | No-Go Years | intra-retirement growth | remaining years | − withdrawal (No-Go rate) |

   Stage lengths default to a **40 / 40 / 20** split of the retirement span and are adjustable with a range slider; withdrawal amounts are all anchored to your projected income in the final year before retirement.

2. **`generateGenericGrowthProjection`** walks one stage year by year. Each year it applies the annual cash flow (after any raise / adjustment), then applies growth to the whole balance, and records `startBalance`, `endBalance`, `annualFlow`, and `totalGrowth`.

3. **`prepareGrowthProjection`** chains the stages — each stage starts from the previous stage's ending balance — to produce the `raw` series, then derives an `inflation-adjusted` series by dividing every figure by a cumulative inflation factor (`1 + yearIndex × annualInflation`).

4. The store exposes both series and the UI picks one based on the **"Adjust for Inflation"** toggle (`inflationPerspective`).

### Recommendations

`recommendations` in the store compares your inputs against rough industry ranges (savings rate, growth rates, retirement age, life expectancy, Go-Go length, income). When the projected end-of-life balance is negative it suggests ways to close the gap; when it's meaningfully positive it suggests dialing back. These are framed by *Die With Zero* and are **not financial advice**.

---

## State model

There is a single Pinia store, [`useRetirementStore`](src/stores/useRetirementStore.ts), written as a setup store:

- **Base refs** — the raw user inputs (`ageToday`, `ageRetirement`, `lifeExpectancy`, `annualIncome`, `savingsRate`, growth rates, withdrawal rates, `annualInflation`, `inflationAdjChoice`, …).
- **Computed** — everything downstream: `yearsUntilRetirement`, stage lengths, `futureProjection` (the engine call), `projectionGraph` (chart rows), `futureProjectionResults` (per-stage totals), `avgMonthlyWithdrawal`, and `recommendations`.
- `retirementBoundaries` is a writable computed: it derives the default 40/40/20 stage split but stores an override when the slider is moved, and a `watch` clears that override if the ages move it out of range.

Components read straight from the store; there are no props threaded through the tree for model data.

---

## Local development

Requires **Node `^20.19.0` or `>=22.12.0`**.

```sh
npm install
npm run dev        # Vite dev server with hot reload
```

Other scripts:

```sh
npm run build        # type-check (vue-tsc) + production build
npm run build-only   # production build, skip type-check
npm run preview      # serve the built dist/ locally
npm run type-check   # vue-tsc --build
npm run format       # prettier --write src/
```

### Editor setup

VS Code + the [Vue (Official) / Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension. TypeScript type information for `.vue` files comes from `vue-tsc` / Volar rather than `tsc`.

---

## Deployment

The app is served from GitHub Pages under the `/retirement-calculator/` path (see `base` in [`vite.config.ts`](vite.config.ts)).

```sh
npm run deploy       # npm run build && gh-pages -d dist -b gh-pages
```

This builds `dist/` and publishes it to the `gh-pages` branch of `origin`.

---

## Scope & limitations

- Models **retirement accounts** (401k, IRA, brokerage) plus **guaranteed income** — Social Security, pensions, and annuities. Each pays for life from its own start age with an annual increase (COLA), and what it pays each year reduces what your accounts must cover. Other retirement-year income (part-time work, rental income) isn't modeled.
- **No tax modeling** — contributions are treated as pre-tax and income as gross.
- Growth is applied **annually**, after that year's contributions/withdrawals.
- Years are treated as whole; each stage's withdrawal target is **indexed by inflation** every year of retirement.
- A single inflation figure is applied uniformly across every stage.

See the in-app **Assumptions** tab and **FAQ** for the full details.

---

## Credits

- Retirement-stage framing and the "die with zero" recommendations draw on Bill Perkins, [*Die With Zero*](https://www.diewithzerobook.com/welcome).
- UI components based on PrimeVue's Volt.
