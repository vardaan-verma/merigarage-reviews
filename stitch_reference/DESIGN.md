---
name: Precision Auto FAQ System
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#e7bdb8'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#ae8883'
  outline-variant: '#5d3f3c'
  surface-tint: '#ffb4ac'
  primary: '#ffb4ac'
  on-primary: '#690006'
  primary-container: '#e31b23'
  on-primary-container: '#fff9f8'
  inverse-primary: '#c00015'
  secondary: '#bbc3ff'
  on-secondary: '#001d92'
  secondary-container: '#1f37b2'
  on-secondary-container: '#a4b0ff'
  tertiary: '#adc6ff'
  on-tertiary: '#002e6a'
  tertiary-container: '#1e6fe2'
  on-tertiary-container: '#fbfaff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ac'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#dee0ff'
  secondary-fixed-dim: '#bbc3ff'
  on-secondary-fixed: '#000f5d'
  on-secondary-fixed-variant: '#1f37b2'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-technical:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.12em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

The design system is crafted for enterprise-grade automotive and garage management workflows, bridging the mechanical authority of physical workshop operations with sleek, modern SaaS clarity. It serves garage proprietors, master technicians, fleet operators, and enterprise service directors who need immediate, friction-free answers to operational, billing, diagnostics, and scheduling queries.

The visual style merges **Corporate / Modern High-Precision** with **Refined Frosted Glass (Glassmorphism)** and subtle automotive cues. The aesthetic draws inspiration from high-performance telemetry displays, machined aluminum finishes, calibrated chassis schematics, and clean industrial instruments. Surfaces leverage dark glass panels with low-alpha white borders, crisp mechanical dividers, and focused accents of vibrant automotive red and rich royal blue. The mood is unmistakably professional, trustworthy, fast, and engineered for maximum readability under varied garage and office ambient light conditions.

## Colors

The palette is anchored by high-contrast automotive primaries against an ultra-deep technical canvas:

- **Canvas & Surface Tier:**
  - Base Background: `#0B0F19` (Deep graphite obsidian)
  - Surface Elevated: `#111827` (Charcoal slate)
  - Surface Glass: `rgba(17, 24, 39, 0.72)` with 16px backdrop blur
  - Surface Card Active / Hover: `rgba(255, 255, 255, 0.05)`
  - Border Hairline: `rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.14)`

- **Brand Accents:**
  - **Primary Automotive Red (`#E31B23` / `#DC2626`):** Dedicated to high-priority callouts, urgent indicators, active states, search highlights, and decisive action triggers.
  - **Secondary Royal Blue (`#243BB5` / `#1D4ED8`):** Applied to structural accents, category indicators, telemetry badges, and focus outlines.
  - **Tertiary Cyan-Blue (`#3B82F6`):** Used for interactive links, informational alerts, and subtle gradient glows.

- **Text & Content Contrast:**
  - Pure White (`#FFFFFF`) for primary titles and active accordion headers.
  - Off-White / Steel (`#E2E8F0`) for body paragraphs and answers.
  - Muted Pewter (`#94A3B8`) for secondary labels, metadata, and placeholder copy.

## Typography

The type system blends the technical, gear-crafted geometry of **Space Grotesk** for headings, metrics, tags, and navigation anchors with the ergonomic clarity of **Manrope** for extended Q&A content.

Headlines leverage tight negative tracking (`-0.02em` to `-0.03em`) to project speed and structural stability. Technical labels utilize uppercase tracking (`0.06em` to `0.12em`) echoing instrument dials and diagnostic consoles. Body typography maintains high line-height ratios (`1.55` to `1.6`) to guarantee quick legibility under harsh tablet and shop-floor displays.

## Layout & Spacing

The layout is built around a standard 12-column responsive fluid grid pinned to an optimal max-width of `1280px` for FAQ exploration portals.

- **Desktop (1024px+):** 12 columns with `1.5rem` (24px) gutters and `2rem` (32px) side margins. The search and filter categories anchor as a 4-column sticky sidebar or a top horizontal pill strip, while the FAQ accordion stream spans the remaining 8 columns.
- **Tablet (768px – 1023px):** 8 columns with `1.25rem` (20px) gutters. Filtering simplifies to a scrolling horizontal track.
- **Mobile (Below 768px):** 4 columns with `1rem` (16px) gutters and `1.25rem` (20px) exterior margin. Accordion cards reflow to 100% width, maximizing touch targets (minimum 48px height per expandable header).

## Elevation & Depth

Visual hierarchy employs a multi-tiered **Atmospheric Glassmorphism** layered against dark graphite gradients:

1. **Tier 0 (Chassis Ground):** `#0B0F19` featuring subtle radial ambient glows (top-left royal blue `#243BB5` at 8% opacity, bottom-right automotive red `#E31B23` at 6% opacity) to provide depth without visual noise.
2. **Tier 1 (Frosted Glass Panels):** Backdrops utilize `rgba(17, 24, 39, 0.65)` layered with `backdrop-filter: blur(16px)` and a precise `1px` translucent top highlight border (`rgba(255, 255, 255, 0.12)`) and lower border (`rgba(255, 255, 255, 0.04)`).
3. **Tier 2 (Floating Accordions & Dialogs):** In their active/expanded state, items elevate through a subtle rim lighting drop shadow: `0 12px 32px -8px rgba(0, 0, 0, 0.65)`, complemented by a delicate left accent border (`3px solid #E31B23` or `#243BB5`).
4. **Interactive Focus Layers:** Glowing rings use `0 0 0 2px rgba(36, 59, 181, 0.45), 0 0 16px rgba(227, 27, 35, 0.25)` to indicate high-precision input focus.

## Shapes

The interface balances automotive mechanical geometry with contemporary software feel:

- Default components, panels, input fields, and accordion containers feature an 8px (`0.5rem`) corner radius.
- Larger feature banners and modal dialogs adopt a 16px (`1rem`) corner radius (`rounded-lg`).
- Interactive filter chips and status tags make deliberate use of semi-pill treatments (24px - 32px) to clearly distinguish them from functional rectangular content cards.
- Engineering accents—such as gear tooth indicators, technical tick marks on search inputs, and chamfered iconography—accentuate the automotive heritage.

## Components

### Hero & Omnisearch Field
- **Structure:** Prominent center-aligned search bar anchored over an engine-glow glass card.
- **Search Input:** `height: 56px`, `rgba(255, 255, 255, 0.05)` fill, `1px` border of `rgba(255, 255, 255, 0.14)`. Focus state highlights a dual-color border gradient transitioning from Royal Blue (`#243BB5`) to Red (`#E31B23`). Includes an engineering crosshair or automotive gear magnifying icon on the left and a "Clear / ESC" badge on the right.

### Category Filter Chips
- **States:**
  - *Default:* Glass badge with `rgba(255, 255, 255, 0.06)` fill, border `rgba(255, 255, 255, 0.1)`, text in `#94A3B8`.
  - *Active:* Solid Royal Blue (`#243BB5`) or Vibrant Red (`#E31B23`) gradient overlay, pure white typography, subtle outer bloom.
  - *Count Indicator:* Monospace pill badge inside chip displaying numeric count of related questions.

### FAQ Accordion Cards
- **Collapsed State:** `rgba(17, 24, 39, 0.6)` background, `1px` border `rgba(255, 255, 255, 0.07)`, padding `20px 24px`. Expand icon is a machined chevron or rotating plus glyph inside a 32px circular housing.
- **Expanded State:** Background transitions to `rgba(26, 34, 53, 0.75)` with an illuminated left vertical indicator bar (3px automotive red).
- **Answer Container:** Smooth slide-down reveal; body copy in `body-md` (`#E2E8F0`) with sub-bullets, inline code/tag elements for part numbers or billing terms, and helpfulness feedback widgets ("Was this helpful? [Yes] [No]").

### Action & Contact Escalation Card
- Positioned below FAQ groups: frosted glass banner housing direct garage support triggers (WhatsApp integration, Call Master Technician, Live Diagnostic Desk).
- Primary Button: Automotive Red fill (`#E31B23`), bold white label, hover elevation with red flare shadow (`0 4px 18px rgba(227, 27, 35, 0.45)`).
- Secondary Button: Transparent glass with Royal Blue perimeter (`#243BB5`), white text, hover fill `rgba(36, 59, 181, 0.15)`.

### Form Controls & Radios
- Checkboxes and radio buttons feature custom machined metallic rings with vibrant red center ticks upon activation.