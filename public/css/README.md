# EHC Checker — Design System

## Overview

`design-system.css` is the single source of truth for all styling in the EHC
Checker frontend. It is plain vanilla CSS — no Tailwind, no Sass, no PostCSS,
no build step. The browser reads it directly. The philosophy is: tokens (CSS
custom properties) define the visual language, semantic utilities and
component classes apply it. New visual decisions belong here, not in
component-level inline styles.

Fonts: Geist Sans + Geist Mono, self-hosted at `/fonts/`.

## Tokens

| Group       | Examples                                              | Purpose                                                                  |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Surfaces    | `--color-bg-page`, `--color-bg-surface`, `--color-bg-secondary` | Page background, card surfaces, secondary panels                |
| Text        | `--color-text-primary/secondary/tertiary`             | Primary copy, supporting copy, captions                                  |
| Borders     | `--color-border-subtle/default/strong`                | Subtle separators through to strong delimiters                           |
| Accent      | `--color-accent`, `--color-accent-hover`              | Teal — buttons, focus rings, highlights                                  |
| Severity    | `--color-{hard,medium,low,pass}-{bg,text,accent}`     | Flag severities + pass state                                             |
| Typography  | `--font-sans`, `--font-mono`, `--text-{xs..2xl}`      | Family + scale. Sans is Geist; mono is Geist Mono                        |
| Spacing     | `--space-{1..12}` (4px → 48px)                        | Padding, margins, gaps                                                   |
| Radii       | `--radius-{sm,md,lg}` (4 / 8 / 12)                    | Corner roundness                                                         |
| Motion      | `--transition-{fast,base}`                            | Standard easings; use these instead of bespoke timings                   |

## Components

In file order:

- **Layout utilities** — `.container`, `.stack-1..8`, `.row`, `.row-between`, `.row-end`, `.grid-2`
- **Type utilities** — `.text-{xs..2xl}`, `.text-mono`, `.text-{primary,secondary,tertiary}`, `.text-medium`, `.text-uppercase`, `.text-center`, `.truncate`
- **Surfaces** — `.card` (with teal accent bar), `.card-flat` (no accent bar), `.surface-secondary`
- **Buttons** — `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost`
- **Badges** — `.badge` + `.badge-{hard,medium,low,pass,neutral}`
- **Metric** — `.metric` + `.metric-label` + `.metric-value` for severity counters
- **Flag cards** — `.flag-card` + `.flag-card-{hard,medium,low}` with `.flag-card-header`, `.flag-card-title`, `.flag-card-body`, `.flag-card-meta`
- **Banners** — `.banner-success` (with checkmark), `.banner-warning`, `.banner-info`, `.banner-error`
- **Empty state** — `.empty-state` + `.empty-state-mascot` + `.empty-state-title` + `.empty-state-subtitle`
- **Dropzone** — `.dropzone` + `.dropzone--active` (or `body.drag-active`); plus full-page drag overlay via `body.drag-active::after`
- **File rows** — `.file-row` + `.file-row-main` + `.file-row-controls` + `.file-row-name/size/remove` + `.classification-select` + `.file-row-flash`
- **Inputs** — `.input`, `.label`
- **Key-value** — `.kv` definition list grid
- **Tabs** — `.tab-nav` + `.tab-btn` + `.tab-btn-active` (or `.tab-btn.active`)
- **App chrome** — `.app-header`, `.app-header-inner`, `.app-brand`, `.app-tagline`, `.app-main`, `.app-footer`, `.app-footer-disclaimer`, `.app-footer-meta`, `.app-footer-line`
- **Verdict** — `.verdict` + `.verdict-{pass,hold}` + `.verdict-subtitle` + `.verdict-block` + `.verdict-metrics`
- **Animations** — `.spinner`, `.skeleton`, `.fade-in`

## How to add a new component

1. **Add the CSS** in `design-system.css` in the appropriate section (Section 5
   for components). Use tokens for every colour, size, radius, and motion
   value — do not hardcode hex codes or pixels except in tokens themselves.
2. **Document it here** — add a one-line entry in the Components list above
   so the next person grepping the README finds it.
3. **Use it in HTML/JS** — apply the class in `index.html`, `admin.html`, or
   inside `renderReport()` template strings. Avoid inline `style="..."` for
   anything reusable.

## Adding a new severity colour

If a fifth severity bucket is needed (say `info` or `critical`):

1. Add the four tokens in the `:root` block — `--color-{name}-bg`,
   `--color-{name}-text`, `--color-{name}-accent`, and (if needed) a
   `--color-{name}-border` for flag-card left borders.
2. Add a `.badge-{name}` rule mirroring the existing pattern (background +
   text colour from the new tokens).
3. Add a `.flag-card-{name}` rule mirroring the existing pattern (background,
   text colour, `border-left-color`).
4. Update the `cls` map in `renderReport()` in `index.html` so the JS knows
   the new severity exists.

That keeps the visual language consistent and means a new severity is purely
a tokens-and-mappings change — no new components or layout work.
