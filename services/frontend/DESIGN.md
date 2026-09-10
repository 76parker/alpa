# Alpa design system

## Product character

Alpa is an operational security console: dense, calm, and legible. Its canonical palette is Arctic Slate: a restrained ice-blue evolution of One Dark that reserves colour for status, risk, and primary action. English is the active product language. The sidebar begins with a generous 92px brand block: a bright 67px icy-blue wyvern glyph positioned 3px above center, the `Alpa` wordmark at 26px in an Avenir-style SaaS sans with open tracking, and a 9px `SECURITY PLATFORM` descriptor below it with an 8px separation. The mark uses a brighter, more saturated cyan treatment so its facets remain distinct from the sidebar; it does not add a glow or shadow. An 8px left inset, 14px right inset, 12px gap, and 67px glyph column reserve 135px for the descriptor at the standard 236px sidebar width, allowing the full label to remain inside the block. The descriptor clips only as a last-resort protection for narrower sidebars. The cleaned 256px `alpa-logo-clean.png?revision=20260908` asset bypasses image optimization and uses a transparent, artifact-free silhouette. This is the one intentionally expressive element in an otherwise dense console.

## Token ownership

`globals.css` is the runtime token source. This document is the normative record of the values and intent; components consume CSS custom properties rather than duplicating values.

| Semantic token | Runtime token | Value | Use |
|---|---|---|---|
| Canvas | `--paper` | `#252d38` | app background |
| Raised surface | `--surface` | `#1e2631` | cards and panels |
| Recessed/input | `--input` | `#181f28` | editable fields |
| Divider | `--line` | `#40516a` | boundaries |
| Primary text | `--text` | `#e0e9f2` | high-emphasis copy |
| Supporting text | `--muted` | `#9facbe` | metadata |
| Brand/info | `--teal` | `#78c7ff` | primary actions and links |
| Primary action | `--action` | `#4c88d3` | solid primary buttons |
| Primary action pressed | `--action-pressed` | `#3e75b8` | pressed primary buttons |
| On primary action | `--on-action` | `#fff` | text/icons on primary buttons |
| Positive | `--green` | `#91cda7` | healthy/completed state |
| Warning | `--yellow` | `#f0ca83` | caution/stale state |
| Danger | `--red` | `#ef7d89` | risk/error state |
| Focus | `--teal` | `#78c7ff` | 2px visible focus ring |

The font stack is `--font-sans`; code, identifiers, and scanner evidence use `--font-mono`. Primary UI text is 14px and secondary/supporting text is 12px; use 8px-derived spacing (4, 8, 12, 16, 24, 32px). Panels and standard buttons use a restrained 4px radius with `--shadow-sm` elevation, keeping the console precise without making it harshly rectangular. The signature is a thin ice-blue active/focus treatment; avoid gradients, neon glows, and blue decoration without a status or interaction purpose.

## Components and glyphs

Lucide is the only icon family. Standard glyphs are 13–19px, decorative icons are `aria-hidden`, and icon-only actions have accessible labels. Product and team avatars use the deterministic identicon/approved image policy in `EntityAvatar`; do not substitute initials as a second avatar system.

Controls are native semantic buttons, links, inputs, selects, and tables. Every control has hover, active, disabled, and visible keyboard-focus states. Use primary teal for the single strongest action, neutral secondary actions for safe alternatives, and isolated danger treatment for destructive actions.

Creation fields use one compact label row: label text, a red required asterisk when applicable, and a circled `?` help control. The help control uses the same muted/teal token states across pages and dialogs, opens concise guidance on hover or keyboard focus, and never displaces the field grid. Its visual tooltip is body-portalled, fixed to the viewport, collision-clamped, and auto-flipped so panel overflow can never clip it; the assistive description remains present beside the field. Workspace creation uses a single-column One Dark dialog with one short orientation block, the field, supporting length/context metadata, and a right-aligned action footer.

Criticality is a compact native select with the four product severity levels; explanatory paragraphs do not repeat inside the options. Status and criticality chips always hug their content; they must not fill an available table cell. Dashboard is temporarily an in-development surface and uses the shared `DevelopmentNotice` treatment; when it returns, its cards must use the same panel, border, type, and status vocabulary as inventory lists.

## Navigation and layers

The persistent sidebar owns the workspace disclosure. Its list expands in normal flow so the navigation moves with it, caps its height against the viewport, and scrolls internally when the workspace count is large. It is not a modal or floating select. On desktop, the 92px sidebar brand block and the 92px contextual top-bar trail end on the same horizontal level and use the same subtle downward shadow instead of hard separator rules. The trail sits 8px below vertical center so its 15px path name aligns with the `SECURITY PLATFORM` descriptor; its type label is 10px uppercase and its directional glyphs are 15px. Contextual top-bar trails show each entity type above its name in hierarchy order, with generous label-to-name spacing; preceding entities are keyboard-accessible return controls. API panels use plain-language directional names and pair each title with the shared circled-question help control.

Overlay layer tokens are global: `--z-dropdown: 200`, `--z-popover: 300`, `--z-backdrop: 500`, `--z-dialog: 600`, `--z-tooltip: 700`, and `--z-toast: 900`. Field-help tooltips deliberately sit above dialogs; portalled dialogs use the same One Dark surfaces as the application root, and their selectors must not depend on being descendants of `.final-app`.

## In-development surfaces

Route-backed features that are not available yet, including Templates, use the shared `DevelopmentNotice` panel. The panel stays within the One Dark system and communicates its state with an icon and explicit English copy, not color alone. A translucent black-and-yellow `repeating-linear-gradient` forms a narrow frame around the panel without crossing or reducing the contrast of its content. The treatment is static: do not animate the warning frame, and keep the global reduced-motion behavior intact. Every notice provides one clear Back action to its owning surface.

## Motion and viewport behavior

Use the existing `--duration-fast` (80ms) and `--easing-ease-in-out` only for immediate feedback; motion must not obscure state changes. Respect `prefers-reduced-motion` by removing transitions and transformations. Preserve document scrolling and visible, themed scrollbars; do not hide overflow to force a panel to fit.

## Accessibility baseline

Aim for WCAG 2.2 AA: real labels, sufficient contrast, keyboard access, visible focus, status text, and semantic headings/tables. Search fields expose an accessible label and an explicit clear button. Form fields retain labels, error association, and meaningful input types.
