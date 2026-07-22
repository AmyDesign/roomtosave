# RoomToSave

A browser-based **RRSP / FHSA contribution planner** for Canadian tax filers.
Enter your slips, and it works out exactly how much to put into your RRSP and
FHSA to cut this year's tax bill — down to the dollar, across three optimization
strategies.

Everything runs client-side. The tax engine is pure TypeScript with no server
calls, so no financial data ever leaves the browser.

**Live demo:** _(add your Cloudflare Pages URL here)_

The app lives in [`code/`](./code). The full verification log is in
[`skills/test-cases.md`](./skills/test-cases.md); design decisions are in
[`skills/design-system.md`](./skills/design-system.md).

---

## Why this one is different

Most Canadian RRSP calculators either skip Quebec or get it wrong, because
Quebec's return is a second tax system bolted onto the federal one. This engine
handles it properly:

- **Quebec** — RL-1 slip, the 16.5% federal abatement, QPP (vs CPP) rates, QPP2
  second additional contributions, QPIP/PPIP, the RAMQ prescription-drug premium
  (including its July-1 rate change and income-tested exemption), and the health
  services fund.
- **Federal + BC + Ontario** — brackets, credits, CPP/CPP2, EI, the dividend
  gross-up and tax credit, capital gains, the OAS/EI clawbacks, Ontario LIFT and
  surtax, BC's basic tax reduction and sales-tax credit.
- **Self-employment** — the doubled CPP/QPP and QPIP contributions, and their
  split between deduction and credit.

### Verified, not just written

The engine was cross-checked case by case against **TurboTax** and
**Wealthsimple Tax**, to the cent. That process is what makes it trustworthy —
and it caught seven real engine bugs along the way (the RAMQ July-1 averaging,
the health-services-fund base definition, the self-employment QPIP
deduction/credit split, an over-eager optimizer, and more).

Two pieces of tooling keep it honest:

- **`code/check-testcases.mjs`** — every expected value in `skills/test-cases.md`
  lives in a machine-readable block. This script re-runs them all against the
  current engine and flags any drift, so a documented "PASSED" case can't
  silently rot after an engine change (which had already happened more than once).
- **Golden-case regression tests** (`code/src/lib/tax/__tests__/`) — `npm test`.

---

## Stack

Next.js 14 (App Router, static export) · TypeScript · Tailwind CSS · Zustand ·
a small custom i18n layer (English / 中文). No backend.

## Run locally

```bash
cd code
npm install
npm run dev          # http://localhost:3000
npm run type-check   # tsc --noEmit
npm test             # engine regression tests
node check-testcases.mjs   # verify doc values against the engine
```

## Build & deploy (Cloudflare Pages)

`output: "export"` means `next build` produces a static `out/` folder that any
static host serves.

```bash
cd code
npm run build        # writes code/out
```

Cloudflare Pages → **Create application → Pages → Connect to Git**, then:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Root directory | `code` |
| Build command | `npm run build` |
| Build output directory | `out` |
| Environment variable | `NEXT_PUBLIC_SITE_URL` = your final URL (e.g. `https://roomtosave.pages.dev`) |

Setting `NEXT_PUBLIC_SITE_URL` makes the social-share (OG) image resolve to an
absolute URL on your domain — without it, link previews may not load the image.

> **Note:** the site ships with `robots: { index: false }` in
> `code/src/app/layout.tsx` so it stays out of search results during the
> portfolio stage. Remove that line for a public, indexable launch.

## Project structure

```
code/                     # the Next.js app
  src/
    app/                  # App Router: layout, page, icon.svg, opengraph-image
    components/
      ui/                 # BoxField, CollapsibleCard, Progress, Button …
      common/             # Logo, LanguageSwitcher, Disclaimer
      wizard/             # the four-step flow
      results/            # recommendation, strategy switcher, comparison
    lib/tax/              # the tax engine (pure TypeScript, framework-free)
      data/{2024,2025}/   # per-year tax tables as JSON
      calculator.ts       # main entry
      optimizer.ts        # the RRSP/FHSA recommendation search
      …
    store/                # Zustand form store (persists to localStorage)
    i18n/                 # bilingual message catalogue
  check-testcases.mjs     # doc-vs-engine drift checker
skills/                   # verification log, design system, feature/ticket notes
design/                   # design mockups (kept as a record of the iteration)
```

---

## Disclaimer

RoomToSave provides estimates for informational purposes only. It is not
professional tax advice, and final amounts depend on your CRA (and, in Quebec,
Revenu Québec) assessment.
