# Design Skills

## Skill: Color Palette Generation
Generate a cohesive color palette based on tone and audience:
- Primary color: the dominant brand color
- Accent color: used for CTAs and highlights
- Background: page background (dark/light based on tone)
- Surface: card/component background
- Text primary and text secondary
- Always provide exact hex values

## Skill: Typography Selection
Choose font pairings from system fonts or Google Fonts (name only — no CDN links):
- Heading font: must be distinctive and match the brand tone
- Body font: must be highly readable at small sizes
- Define a size scale: h1, h2, h3, body, small, caption

## Skill: Layout Architecture
Define the page layout system:
- Max content width (typically 1200px or 1280px)
- Section padding (top/bottom)
- Column grid for features (2-col, 3-col, 4-col)
- Mobile breakpoint behavior

## Skill: Component Design
Specify how each reusable component looks:
- Primary button: background, border-radius, padding, hover state
- Feature card: background, border, shadow, border-radius
- Section header: alignment, spacing, label treatment
- Hero: centered vs split layout, background treatment

## Skill: Animation Specification
Define subtle CSS-only animations for polish:
- Button hover transitions
- Card hover effects (lift, glow)
- Optional hero fade-in via CSS `@keyframes` on load
Always specify: property, duration, easing. Do not require JavaScript.
