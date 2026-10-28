---
inclusion: always
---

# Tally.io — UI Design System

## Brand Identity

Tally.io is a modern, premium, technology-driven business tool. The UI should feel:
- **Professional and trustworthy** — used in financial transactions all day
- **Fast and efficient** — cashiers and managers need speed
- **Clean and uncluttered** — information hierarchy over decoration
- **Accessible** — keyboard-navigable, high-contrast, screen reader aware

Do NOT make it look like:
- An outdated cash register or POS terminal
- A generic admin dashboard template
- Overly decorated with gradients and glass effects
- A consumer app with playful animations

## Design Tokens

### Colors (Tailwind CSS custom config)

```
Primary:   Slate/zinc neutral base
Accent:    Indigo-600 / Blue-600 spectrum (technology-inspired)
Success:   Emerald-600
Warning:   Amber-500
Error:     Rose-600
Offline:   Orange-500
```

Light and dark themes are both required.

### Typography

- Headings: Inter or Geist (system fallback: sans-serif)
- Monospace (amounts, IDs, codes): JetBrains Mono or equivalent
- Body: Inter, 14px base, 1.5 line height

### Spacing

Use Tailwind's default spacing scale. Consistent 4px grid.

### Shadows and borders

- Subtle shadows on cards and popovers
- Clean 1px borders using `border-border` token
- No heavy drop shadows on interactive elements

## Component Guidelines

### POS Screen

- Product grid: 3-4 columns on desktop, 2 on tablet
- Cart: always visible on the right side (desktop)
- Product images: 1:1 ratio, skeleton on load
- Quantity controls: large touch targets (min 44px)
- Totals: monospace font, right-aligned
- Pay button: full width, prominent color (not red)

### Tables

Every table must have:
- Loading skeleton state (not spinner alone)
- Empty state with helpful message and CTA
- Error state with retry
- Column sorting indicators
- Pagination or infinite scroll
- Responsive (horizontal scroll or stacked on mobile)

### Forms

- Inline validation errors (on blur for most fields)
- Submit button disabled while submitting (show spinner)
- Success feedback after submission
- Required field indicators
- Proper autocomplete attributes

### Modals and Dialogs

- Confirmation dialogs for destructive actions (sale void, stock delete)
- Use shadcn/ui Dialog component
- Focus trap when open
- Escape key closes (when safe)
- Loading state on confirm button

### Navigation

Desktop:
- Collapsible sidebar (min 56px collapsed, 240px expanded)
- Active state clearly visible
- Group items logically (Operations, Management, Analytics, Settings)

Mobile:
- Bottom tab bar for primary destinations
- Drawer for secondary navigation

### Status Indicators

```
Online + synced:     green dot
Online + syncing:    blue pulsing dot + "Syncing..."
Online + errors:     orange dot + "X items need attention"
Offline:             red dot + "Offline"
```

## Accessibility Requirements

- WCAG 2.1 AA minimum
- All interactive elements keyboard accessible
- ARIA labels on icon-only buttons
- Sufficient color contrast (4.5:1 for text, 3:1 for UI components)
- Skip navigation link
- Proper heading hierarchy
- Form labels associated with inputs

## Responsive Breakpoints

```
sm:   640px   (large mobile / small tablet)
md:   768px   (tablet)
lg:   1024px  (small desktop)
xl:   1280px  (standard desktop)
2xl:  1536px  (large desktop)
```

POS screen: optimized for 1024px+ (desktop) and touch-friendly for tablet.

## Icon Usage

Lucide icons throughout. Consistent 16px or 20px size. Use descriptive `aria-label` when icon has no visible text.

## Charts

Use Recharts. Consistent color palette from design tokens. Always include axis labels and tooltips. Responsive container wrappers.
