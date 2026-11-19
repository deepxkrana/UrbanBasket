---
version: alpha
name: UrbanBasket
description: A stark, high-trust monochrome system with oversized typography, subtle borders, and generous whitespace.
colors:
  primary: "#171717"
  secondary: "#6b7280"
  tertiary: "#e5e7eb"
  neutral: "#fafafa"
  surface: "#ffffff"
  on-surface: "#171717"
  muted: "#9ca3af"
  border: "#e5e7eb"
  shadow: "#ebebeb"
  error: "#dc2626"
typography:
  headline-display:
    fontFamily: GeistSans
    fontSize: 64px
    fontWeight: 400
    lineHeight: 64px
    letterSpacing: -3.84px
  headline-lg:
    fontFamily: GeistSans
    fontSize: 50px
    fontWeight: 400
    lineHeight: 56px
    letterSpacing: -3.36px
  headline-md:
    fontFamily: GeistSans
    fontSize: 39px
    fontWeight: 400
    lineHeight: 47px
  headline-sm:
    fontFamily: GeistSans
    fontSize: 31px
    fontWeight: 400
    lineHeight: 37px
  body-lg:
    fontFamily: GeistSans
    fontSize: 24px
    fontWeight: 400
    lineHeight: 36px
    letterSpacing: -0.96px
  body-md:
    fontFamily: GeistSans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-sm:
    fontFamily: GeistSans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  label-lg:
    fontFamily: GeistSans
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
  label-md:
    fontFamily: GeistSans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  label-sm:
    fontFamily: GeistSans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
  code-md:
    fontFamily: Geist Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  code-sm:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 2px
  sm: 12px
  md: 20px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 12px
    height: 40px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 12px
    height: 40px
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 0px
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 16px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: 12px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 8px
---

# Vercel Minimal

## Overview
This system feels ultra-minimal, technical, and confident, with an intentionally quiet light theme. It uses large, airy whitespace, restrained monochrome color, and precise typography to communicate a modern developer-first brand. The tone is professional and premium rather than playful, with very little visual ornament.

## Colors
- **Primary (#171717):** Deep ink black used for the main wordmark, headline text, primary buttons, and other high-emphasis elements. It creates the strongest contrast in the system.
- **Surface (#ffffff):** Clean white used for elevated content and control backgrounds when the design needs a crisp, neutral base.
- **Neutral (#fafafa):** Soft off-white page background that keeps the layout bright without looking stark.
- **Secondary (#6b7280):** A muted gray for lower-emphasis navigation and supporting text.
- **Tertiary (#e5e7eb):** Light border and divider color that preserves structure without adding heaviness.
- **Muted (#9ca3af):** A quieter gray for secondary metadata or de-emphasized content.
- **Border (#e5e7eb):** The canonical hairline border tone for cards, inputs, and subtle separators.
- **Shadow (#ebebeb):** A pale tonal shadow/border color used to imply depth with almost no darkness.
- **Error (#dc2626):** Reserved red for validation or destructive states, though it is not visually dominant in the source.

## Typography
The system is built on Geist Sans, which gives it a modern, product-led voice with a clean geometric feel. Headlines are light in weight at 400 and rely on large sizes with very tight negative letter spacing for a dramatic, editorial look. Body copy remains compact and highly readable, while labels are slightly heavier at 500 to help buttons and navigation stand out without becoming bold.

Geist Mono can be used for code, identifiers, or technical readouts when a monospace treatment is needed. Uppercase styling is not a dominant pattern; instead, the system prefers sentence case and minimal typographic decoration.

## Layout
The layout is extremely spacious, with broad horizontal breathing room and a large amount of vertical whitespace in the hero. Content is arranged in a simple, fixed-width desktop composition rather than a dense grid, emphasizing a few focal points instead of many competing panels. Spacing follows a restrained rhythm using 2px, 12px, 20px, 24px, and 40px increments, which keeps the interface precise and predictable.

Section padding should feel generous, especially around hero content and navigation. Cards and controls should remain compact, with tight internal padding and clear separation from the surrounding page.

## Elevation & Depth
The design is mostly flat, and hierarchy comes from contrast, spacing, and scale rather than heavy shadows. Borders are extremely subtle, often using the pale border token or a hairline treatment to outline controls and cards. When depth is needed, it should be understated and tonal, never glossy or dramatic.

The hero mark uses a soft shadow-like glow effect in the screenshot, but the broader system still avoids strong elevation. Prefer crisp edges and quiet surfaces over layered depth.

## Shapes
The shape language is rounded and approachable, but disciplined. Buttons and pill-like controls use full rounding, while cards use the smaller 8px radius for a tidy architectural feel. The overall impression is soft precision: friendly enough for general product use, but still minimal and exacting.

## Components
Buttons are the clearest component family in the system. Use `button-primary` for the main call to action: dark background, white text, `rounded.full`, and a compact 40px height. Use `button-secondary` for supporting actions: transparent background, dark outline or text, and the same pill geometry. `button-tertiary` should be text-only, with no border and no container chrome, for lightweight actions or inline navigation.

Cards should use the `card` treatment: pale surface, subtle 1px border, `rounded.md`, and modest 16px padding. They should remain visually quiet and not compete with content.

Inputs should mirror the button language with pill geometry, strong legibility, and minimal visual noise. Use `input` for form fields, keeping borders subtle and backgrounds clean.

Chips should be compact and neutral, using `chip` with a small padding value and `rounded.full`. They should feel like supportive metadata, not strong filters.

Navigation items and top-level links should remain text-first and restrained. If icons are used, they should be small and monochrome, matching the strict visual discipline of the brand.

## Do's and Don'ts
- Do keep interactions minimal, with simple fills, subtle borders, and no decorative gradients.
- Do use the primary black sparingly to preserve its impact on CTAs and major headlines.
- Do keep typography large, light, and tightly tracked for headings.
- Do preserve generous whitespace around hero content and primary navigation.
- Don't introduce colorful accents unless they are strictly functional.
- Don't use heavy shadows, glassmorphism, or complex card layering.
- Don't over-round containers that are meant to feel structural, like cards and panels.
- Don't crowd the page with dense grids, long paragraphs, or noisy UI chrome.