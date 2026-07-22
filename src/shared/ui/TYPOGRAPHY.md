# Typography — Almaz CRM

Single UI font: **Inter Variable** (self-hosted via `@fontsource-variable/inter`).
Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`.
IDs/codes only (`#1247`-style order numbers, SKUs): **JetBrains Mono Variable** via `font-mono`.
No serif/display fonts. The brand wordmark is Inter 700 + `tracking-tight` (`.brand-gradient`).

Global rendering (index.css): `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`,
`font-feature-settings: 'cv02','cv03','cv04','ss01'`. Body weight rides the variable axis:
450 on dark presets, 400 on light (`--body-weight`) — never faux-bold.

## The 8 tokens (tailwind.config.ts `fontSize` — the only sizes in the app)

| Token       | Size/Line | Weight | Usage                                        |
| ----------- | --------- | ------ | -------------------------------------------- |
| `text-2xs`  | 11/16     | 500    | table headers (uppercase + `tracking-caps`), chips |
| `text-xs`   | 12/18     | 400–500| captions, helper text, timestamps            |
| `text-sm`   | 13/20     | 400–500| table cells, secondary text, inputs          |
| `text-base` | 14/22     | 400–500| default body, form labels (500)              |
| `text-md`   | 16/24     | 600    | card titles, drawer titles                   |
| `text-lg`   | 18/26     | 600    | section headings (−0.01em)                   |
| `text-xl`   | 22/28     | 650    | page titles (−0.01em) — nothing exceeds 28px |
| `text-stat` | 26/32     | 650    | dashboard stat values (−0.01em)              |

Weights: 400 / 500 / 600 / 650–700 only. Uppercase labels: `text-2xs uppercase tracking-caps` (+0.04em).
Paragraph line length: cap at ~70ch (`max-w-[70ch]`).

## Numbers & money

- Every numeric cell, stat value, tick and price gets `.tnum`
  (`font-variant-numeric: tabular-nums lining-nums`) so columns align.
- Money via the `<Money value short?>` component: thin-space thousands
  (`Intl.NumberFormat('uz-UZ')`), currency word muted and one step smaller.
  Abbreviations (`24.8 mln`) only on dashboard stats / compact cards.
- All numeric table columns are right-aligned.
