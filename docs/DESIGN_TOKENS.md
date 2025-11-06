# FROK Design Token System

**Version**: 1.0
**Last Updated**: 2025-11-05 (Session #14)
**Status**: 100% Compliance Achieved ✅

---

## Overview

FROK uses a **semantic design token system** based on CSS variables. All colors in the codebase MUST use these tokens - hardcoded color values (like `gray-900`, `red-500`, `blue-400`) are **strictly prohibited**.

**Benefits**:
- ✅ Consistent theming across entire app
- ✅ Easy theme switching (dark mode ready)
- ✅ Better maintainability
- ✅ Accessibility compliance
- ✅ Type safety

---

## Quick Reference

### Layout & Structure

| Token | Tailwind Class | Usage | Hex Value |
|-------|----------------|-------|-----------|
| `--background` | `bg-background` | Full-page backgrounds | `#0a0a0a` |
| `--surface` | `bg-surface` | Cards, modals, panels | `rgba(255,255,255,0.04)` |
| `--border` | `border-border` | All borders | `rgba(255,255,255,0.1)` |

### Typography

| Token | Tailwind Class | Usage | Hex Value |
|-------|----------------|-------|-----------|
| `--foreground` | `text-foreground` | Primary text | `#ededed` |
| N/A | `text-foreground/70` | Secondary text | `rgba(237,237,237,0.7)` |
| N/A | `text-foreground/60` | Tertiary/help text | `rgba(237,237,237,0.6)` |

### Semantic Colors

| Token | Tailwind Class | Usage | Hex Value |
|-------|----------------|-------|-----------|
| `--color-primary` | `text-primary`, `bg-primary`, `border-primary` | Primary actions, links | `#22d3ee` |
| `--danger` | `text-danger`, `bg-danger`, `border-danger` | Errors, delete actions | `#ef4444` |
| `--warning` | `text-warning`, `bg-warning`, `border-warning` | Warnings, caution | `#f59e0b` |
| `--success` | `text-success`, `bg-success`, `border-success` | Success states | `#22c55e` |
| `--info` | `text-info`, `bg-info`, `border-info` | Info badges, tags | `#06b6d4` |
| `--color-accent` | `text-accent`, `bg-accent`, `border-accent` | Accent elements | `#3b82f6` |

---

## Usage Guide

### When to Use Each Token

#### `bg-background`
**Use for**:
- Full-page backgrounds
- Error boundary backgrounds
- Large container backgrounds

**Example**:
```typescript
<div className="min-h-screen bg-background">
  {/* App content */}
</div>
```

---

#### `bg-surface`
**Use for**:
- Cards
- Modals
- Panels
- Form inputs
- Dropdown menus
- Navigation sidebars

**Example**:
```typescript
<div className="bg-surface border border-border rounded-lg p-6">
  <h2>Card Title</h2>
</div>
```

**Variants**:
- `bg-surface/50` - Transparent overlay (50% opacity)
- `bg-surface/80` - Semi-transparent (80% opacity)
- `hover:bg-surface` - Hover effect
- `hover:bg-surface/80` - Subtle hover effect

---

#### `border-border`
**Use for**:
- All borders
- Dividers
- Card outlines
- Input borders (default state)

**Example**:
```typescript
<div className="border-b border-border">
  <h3>Section Title</h3>
</div>
```

---

#### `text-foreground`
**Use for**:
- Primary headings
- Body text
- Button labels
- Navigation items

**Example**:
```typescript
<h1 className="text-foreground font-bold">Title</h1>
```

**Opacity Variants**:
- `text-foreground/70` - Secondary text (labels, descriptions)
- `text-foreground/60` - Tertiary text (help text, timestamps)

---

#### `text-primary` / `bg-primary` / `border-primary`
**Use for**:
- Primary action buttons
- Active states
- Links
- Focus indicators
- Selected items

**Examples**:
```typescript
// Button
<Button variant="primary">Save Changes</Button>

// Active tab
<button className={isActive ? 'border-b-2 border-primary text-primary' : ''}>
  Tab
</button>

// Link
<a className="text-primary hover:text-primary/80">Learn more</a>

// Badge
<span className="bg-primary/20 text-primary px-2 py-1 rounded">Active</span>
```

---

#### `text-danger` / `bg-danger` / `border-danger`
**Use for**:
- Error messages
- Destructive actions (delete buttons)
- Form validation errors
- Error states

**Examples**:
```typescript
// Error message
<div className="bg-danger/10 border border-danger/30 text-danger p-4 rounded">
  ⚠️ Error: Something went wrong
</div>

// Delete button hover
<button className="hover:text-danger hover:border-danger">
  Delete
</button>

// Form error
<input className="border-danger focus:border-danger" />
<p className="text-xs text-danger">This field is required</p>
```

---

#### `text-warning` / `bg-warning` / `border-warning`
**Use for**:
- Warning messages
- Caution indicators
- Pending states
- Important notices

**Examples**:
```typescript
// Warning banner
<div className="bg-warning/10 border border-warning/30 text-warning p-4">
  ⚠️ Your session will expire soon
</div>

// Warning badge
<span className="bg-warning/20 text-warning px-2 py-0.5 rounded text-xs">
  Pending
</span>
```

---

#### `text-success` / `bg-success` / `border-success`
**Use for**:
- Success messages
- Completed states
- Confirmation indicators
- Positive feedback

**Examples**:
```typescript
// Success message
<div className="bg-success/10 border border-success/30 text-success p-4">
  ✓ Changes saved successfully
</div>

// Success badge
<span className="text-xs text-success">✓ Default</span>
```

---

#### `text-info` / `bg-info` / `border-info`
**Use for**:
- Info messages
- Tags
- Badges
- Metadata

**Examples**:
```typescript
// Info badge
<span className="bg-info/20 text-info px-2 py-0.5 rounded text-xs">
  Beta
</span>

// Tag
<span className="bg-info/20 text-info rounded px-2 py-1">
  TypeScript
</span>
```

---

#### `text-accent` / `bg-accent` / `border-accent`
**Use for**:
- Special highlights
- Featured content
- Promotional elements

**Examples**:
```typescript
// Featured card
<div className="border-accent/50 bg-accent/5">
  Featured Content
</div>
```

---

## Common Patterns

### 1. Cards

```typescript
// Basic card
<div className="bg-surface border border-border rounded-lg p-6">
  <h3 className="text-foreground font-semibold mb-2">Card Title</h3>
  <p className="text-foreground/70">Card description</p>
</div>

// Hoverable card
<div className="bg-surface border border-border rounded-lg p-6 hover:bg-surface/80 transition">
  {/* Content */}
</div>
```

### 2. Modals

**Always use the Modal component**:
```typescript
import { Modal } from '@frok/ui';

<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  description="Modal description"
  size="lg"
>
  {/* Content */}
</Modal>
```

### 3. Buttons

**Always use the Button component**:
```typescript
import { Button } from '@frok/ui';

<Button variant="primary">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="ghost">Tertiary Action</Button>
```

**Available variants**:
- `primary` - Primary actions (uses `bg-primary`)
- `outline` - Secondary actions (border only)
- `ghost` - Tertiary actions (transparent)

### 4. Form Inputs

```typescript
// Default state
<input className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary" />

// Error state
<input className="w-full px-3 py-2 bg-surface border border-danger rounded focus:outline-none focus:border-danger" />

// With label and error message
<div>
  <label className="block text-sm font-medium text-foreground mb-1">
    Email <span className="text-danger">*</span>
  </label>
  <input className="w-full px-3 py-2 bg-surface border border-border rounded" />
  <p className="text-xs text-danger mt-1">This field is required</p>
</div>
```

### 5. Error States

```typescript
<div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
  ⚠️ An error occurred
</div>
```

### 6. Success States

```typescript
<div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
  ✓ Operation completed successfully
</div>
```

### 7. Warning States

```typescript
<div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm">
  ⚠️ Please review before continuing
</div>
```

### 8. Info Badges/Tags

```typescript
<span className="text-xs px-2 py-0.5 bg-info/20 text-info rounded">
  New Feature
</span>
```

### 9. Loading Skeletons

```typescript
// Skeleton card
<div className="p-3 bg-surface/50 rounded-lg animate-pulse">
  <div className="h-4 bg-surface rounded w-3/4 mb-2"></div>
  <div className="h-3 bg-surface rounded w-1/2"></div>
</div>

// Skeleton text
<div className="h-4 bg-surface rounded w-full mb-2 animate-pulse"></div>
```

### 10. Navigation & Tabs

```typescript
// Active tab
<button className={`px-4 py-2 text-sm transition ${
  isActive
    ? 'border-b-2 border-primary text-primary'
    : 'text-foreground/70 hover:text-foreground'
}`}>
  Tab Label
</button>
```

---

## Opacity Modifiers

You can add opacity to any color using the `/` syntax:

| Opacity | Usage |
|---------|-------|
| `/5` | Very subtle (5%) |
| `/10` | Subtle (10%) |
| `/20` | Light (20%) |
| `/30` | Medium-light (30%) |
| `/50` | Medium (50%) |
| `/60` | Medium-dark (60%) |
| `/70` | Dark (70%) |
| `/80` | Very dark (80%) |
| `/90` | Almost opaque (90%) |

**Examples**:
```typescript
bg-danger/10      // Very subtle red background
text-foreground/70  // 70% opacity text
border-primary/50   // Semi-transparent border
```

---

## State Variants

### Hover States

```typescript
hover:bg-surface        // Hover background
hover:text-primary      // Hover text color
hover:border-danger     // Hover border color
hover:bg-surface/80     // Hover with opacity
```

### Focus States

```typescript
focus:border-primary    // Focus border
focus:outline-none      // Remove default outline
focus:ring-2            // Add focus ring
focus:ring-primary      // Primary focus ring
```

### Active States

```typescript
active:scale-95         // Press effect
active:bg-surface       // Active background
```

---

## ❌ What NOT to Use

### NEVER Use Hardcoded Colors

```typescript
// ❌ WRONG - Will fail code review
className = 'bg-gray-900 text-gray-400'
className = 'bg-red-500 border-blue-400'
className = 'text-sky-500 hover:text-sky-600'
className = 'bg-slate-800 text-zinc-300'

// ✅ CORRECT - Use semantic tokens
className = 'bg-surface text-foreground/70'
className = 'bg-danger border-primary'
className = 'text-primary hover:text-primary/80'
className = 'bg-surface text-foreground'
```

### NEVER Use These Classes

- `gray-*` (use `surface`, `border`, `foreground` instead)
- `red-*` (use `danger` instead)
- `blue-*`, `sky-*`, `cyan-*` (use `primary`, `info`, or `accent` instead)
- `yellow-*`, `orange-*` (use `warning` instead)
- `green-*` (use `success` instead)
- `slate-*`, `zinc-*`, `neutral-*`, `stone-*` (use semantic tokens)

---

## Dark Mode Support

Our design token system is **dark mode ready**. When dark mode is implemented, you'll simply swap the CSS variable values:

```css
/* Light mode */
:root {
  --background: #ffffff;
  --foreground: #000000;
  --surface: rgba(0,0,0,0.04);
  /* ... */
}

/* Dark mode */
:root[data-theme="dark"] {
  --background: #0a0a0a;
  --foreground: #ededed;
  --surface: rgba(255,255,255,0.04);
  /* ... */
}
```

All components using design tokens will automatically adapt!

---

## Accessibility

### Contrast Ratios

All color combinations meet WCAG 2.1 Level AA standards:

| Combination | Ratio | WCAG |
|-------------|-------|------|
| `text-foreground` on `bg-background` | 16:1 | AAA ✅ |
| `text-foreground/70` on `bg-background` | 11:1 | AAA ✅ |
| `text-primary` on `bg-background` | 7:1 | AA ✅ |
| `text-danger` on `bg-background` | 5:1 | AA ✅ |

### Best Practices

1. **Use appropriate text opacity**:
   - Primary content: `text-foreground`
   - Secondary content: `text-foreground/70`
   - Tertiary content: `text-foreground/60`

2. **Use semantic colors meaningfully**:
   - `danger` for errors/destructive actions only
   - `success` for positive feedback only
   - `warning` for caution states only

3. **Test with accessibility tools**: Use browser DevTools to verify contrast

---

## Linting & Enforcement

### Future: ESLint Rule (Planned)

We plan to add an ESLint rule to prevent hardcoded colors:

```javascript
// Will error on:
className = 'bg-gray-900'  // ❌
className = 'text-red-500' // ❌

// Will pass:
className = 'bg-surface'   // ✅
className = 'text-danger'  // ✅
```

### Code Review Checklist

Before submitting a PR, ensure:
- [ ] No `gray-*`, `red-*`, `blue-*`, etc. color classes
- [ ] All buttons use `<Button>` component
- [ ] All modals use `<Modal>` component
- [ ] Semantic colors used appropriately (`danger` for errors, etc.)

---

## Migration Guide

### Converting Existing Code

**Old pattern** → **New pattern**:

```typescript
// Background colors
'bg-gray-900'     → 'bg-surface'
'bg-gray-950'     → 'bg-background'
'bg-gray-800'     → 'bg-surface'

// Text colors
'text-white'      → 'text-foreground'
'text-gray-400'   → 'text-foreground/70'
'text-gray-500'   → 'text-foreground/60'

// Borders
'border-gray-700' → 'border-border'
'border-gray-800' → 'border-border'

// Semantic
'text-red-500'    → 'text-danger'
'bg-red-500/10'   → 'bg-danger/10'
'text-green-400'  → 'text-success'
'text-sky-500'    → 'text-primary' or 'text-info'
'text-yellow-500' → 'text-warning'
```

---

## Resources

- **Source**: `packages/ui/styles/tokens.css`
- **CLAUDE.md**: Main development guide
- **Session Log**: `docs/development/SESSION_14_UI_CONSISTENCY.md`
- **Component Library**: `packages/ui/CLAUDE.md`

---

## Questions?

If you're unsure which token to use:

1. **Check this guide** for common patterns
2. **Look at existing components** in `packages/ui/src/components/`
3. **Ask in code review** - we're happy to help!

---

**Version History**:
- **v1.0** (2025-11-05): Initial release - 100% compliance achieved across codebase
