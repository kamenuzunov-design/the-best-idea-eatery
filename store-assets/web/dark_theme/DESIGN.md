---
name: Artisan Epice
colors:
  surface: '#16130c'
  surface-dim: '#16130c'
  surface-bright: '#3d3930'
  surface-container-lowest: '#110e07'
  surface-container-low: '#1e1b14'
  surface-container: '#231f18'
  surface-container-high: '#2d2a22'
  surface-container-highest: '#38342c'
  on-surface: '#eae1d5'
  on-surface-variant: '#d1c5af'
  inverse-surface: '#eae1d5'
  inverse-on-surface: '#343028'
  outline: '#9a907b'
  outline-variant: '#4e4635'
  surface-tint: '#efc143'
  primary: '#ffd568'
  on-primary: '#3e2e00'
  primary-container: '#e5b83b'
  on-primary-container: '#604900'
  inverse-primary: '#765b00'
  secondary: '#59dda9'
  on-secondary: '#003826'
  secondary-container: '#00a878'
  on-secondary-container: '#003322'
  tertiary: '#e1d9c9'
  on-tertiary: '#343025'
  tertiary-container: '#c5bdae'
  on-tertiary-container: '#514c40'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf95'
  primary-fixed-dim: '#efc143'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#594400'
  secondary-fixed: '#78fac3'
  secondary-fixed-dim: '#59dda9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005138'
  tertiary-fixed: '#eae2d1'
  tertiary-fixed-dim: '#cdc6b6'
  on-tertiary-fixed: '#1f1b11'
  on-tertiary-fixed-variant: '#4b463a'
  background: '#16130c'
  on-background: '#eae1d5'
  surface-variant: '#38342c'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies the warmth, richness, and meticulous craft of high-end culinary arts. Designed for epicures, home chefs, and dietary-conscious gourmets, the aesthetic blends an intimate bistro atmosphere with contemporary culinary tech. 

The emotional tone balances cozy indulgence with razor-sharp utility. It evokes candlelit kitchens, aged oak counters, and gleaming copper cookware through deep roasted charcoal foundations, radiant golden amber sparks, and vibrant emerald herbal accents.

The design movement is **Modern Tactile Minimalism with Low-Contrast Framing**: rich surface layering, precise hairline borders (#3A311E), and tactile pill-shaped badges that feel like curated pantry tags.

## Colors

The palette relies on a deep, organic dark-mode foundation with high-contrast text and deliberate functional accents.

- **Background & Canvas (`#16130C`)**: An ultra-deep espresso charcoal base that avoids sterile digital grays in favor of roasted, organic warmth.
- **Surface Elevation (`#221D12`)**: Elevated container fill for cards, modal sheets, and ingredient trays.
- **Structural Outlines (`#3A311E`)**: Muted bronze-brown hairline borders that define card geometry without introducing harsh contrast.
- **Primary Brand Accent (`#E5B83B`)**: Radiant golden amber used for key interactive triggers, primary CTA buttons, highlighted categories, and badge backings. Contrast pairing on primary surfaces is dark espresso text (`#16130C`) to maintain strict readability.
- **Secondary Functional Accent (`#00A878`)**: Emerald teal reserved strictly for cost intelligence (e.g., portion pricing), dietary classifications (keto, vegan, superfood), and readiness indicators.
- **Text Layers**:
  - `Headings`: Crisp pure white (`#FFFFFF`) for immediate scannability.
  - `Body Text`: Warm cream (`#D8D0C0`) for soft, fatigue-free editorial reading.
  - `Metadata & Secondary Labels`: Muted golden-tinted gray (`#9C917A`) for cooking times, icons, ratings, and ingredient metrics.

## Typography

The design system uses **Plus Jakarta Sans** uniformly across all tiers. Its geometry provides modern precision while its subtle warmth and wide apertures mirror the welcoming, premium nature of artisanal dining.

- **Uppercase Tracking**: Badges, dietary flags, and small utility tags (`label-sm`, `label-md`) use uppercase formatting with generous tracking (`0.04em` to `0.08em`) for clear legibility over saturated fills.
- **Headlines**: Set in heavy weights (700 and 800) with slight negative tracking to anchor recipe titles, chef suggestions, and dashboard banners firmly against dark backgrounds.
- **Numeric Clarity**: Preparation times, prices, and ingredient counts inherit tabular figures to prevent layout jitter in recipe lists and inventory tables.

## Layout & Spacing

The layout is built around a structured 12-column grid system tuned for 1440px desktop canvases while gracefully condensing into multi-column tablet and single-column mobile views.

- **Desktop (1440px)**: Max width constrained to `1320px` centered with `3rem` margins. Sidebar navigation or pantry inventory occupies 3-4 columns; main recipe feeds and culinary cards span the remaining 8-9 columns with `2rem` gutters.
- **Card Internals**: Recipe and ingredient cards utilize strict `space-md` (`1rem`) to `space-lg` (`1.5rem`) interior padding, giving high-resolution culinary photography and nutrition telemetry room to breathe.
- **Horizontal Scrolling Trays**: Used for category filters (e.g., Soups, Salads, Desserts) and pantry inventory tokens, using `space-sm` (`0.5rem`) gaps between pills.

## Elevation & Depth

Visual hierarchy on dark espresso surfaces is created through tonal stepping, translucent layering, and hairline low-contrast borders rather than deep blurry drop-shadows.

1. **Surface 0 (Canvas Base)**: `#16130C` — Flat, absorbing, non-reflective background.
2. **Surface 1 (Base Cards & Shells)**: `#221D12` bounded with a continuous 1px solid border of `#3A311E`.
3. **Surface 2 (Interactive Floating Elements & Floating Nav Bars)**: `#2B2417` with `rgba(0, 0, 0, 0.45)` ambient blur (blur: 20px, spread: 0px, offset-y: 8px).
4. **Hero Overlays**: Image backdrops use a vertical gradient mask blending from `rgba(22, 19, 12, 0.1)` at the upper edge to `rgba(22, 19, 12, 0.95)` at the base to ensure full white-text legibility.
5. **Secondary Teal Badges**: Subtle emerald glow (`rgba(0, 168, 120, 0.15)`) applied only to highlight "Ready to Cook" confirmation statuses.

## Shapes

The design system embraces an intentional duality: **generously rounded containers** for overall card architecture and **strict pill profiles** for all micro-interactions.

- **Pill Philosophy (`rounded-full` / `9999px`)**: All buttons, dietary tags, category selectors, pantry items, and search inputs are shaped as continuous pills. This softens the technological interface and reflects organic culinary packaging.
- **Cards & Sheets (`1.5rem` / `24px`)**: Outer content panels use smooth, modern corner radiuses that frame food imagery naturally.
- **Floating Modals & Hero Banners (`2rem` / `32px`)**: Maximum curvature applied to full-bleed recipe features and primary hero carousels.

## Components

### Buttons
- **Primary Amber Action**: Background `#E5B83B`, text `#16130C`, font weight 700. Pill shape, padding `0.75rem 1.75rem`. On hover, lightens to `#F0C755`.
- **Secondary Emerald Action (e.g., "Cook Now", "Add Ingredient")**: Background `#00A878`, text `#FFFFFF`, font weight 700. Pill shape.
- **Tertiary Chef AI / Auxiliary Action**: Background `#2A2316`, border 1px solid `#3A311E`, text `#E5B83B`, accompanied by golden sparkle icons.

### Badges & Filter Chips
- **Dietary & Cost Pills**: Background `rgba(0, 168, 120, 0.18)`, border 1px solid `rgba(0, 168, 120, 0.45)`, text `#00A878`. Height 26px, typography `label-sm`.
- **Category Chips**: Inactive chips use background `#251F14`, border 1px solid `#3A311E`, text `#D8D0C0`. Active chips invert to solid `#E5B83B` with `#16130C` text and emoji/icon prefixes.

### Input Fields & Search Bars
- **Search Capsule**: Pill-shaped container filled with `#221D12`, border 1px solid `#3A311E`. Left-aligned magnifying icon in `#9C917A`. Placeholder text in `#9C917A`, active typing in `#FFFFFF`. On focus, border transitions to `#E5B83B`.

### Recipe & Inventory Cards
- **Card Body**: `#221D12` container with `1px solid #3A311E` border and `1.5rem` border-radius.
- **Thumbnails**: Rounded with `1rem` inner radius, featuring bottom-left corner percentage stickers (e.g., `100% available`) backed by solid `#00A878`.
- **Metadata Cluster**: Inline groups utilizing `#9C917A` icons for cooking duration, difficulty level, and community ratings.