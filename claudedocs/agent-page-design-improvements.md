# /agent Page Design System Improvements

**Date**: 2025-11-12
**Session**: SC:Improve with --ultrathink
**Objective**: Align /agent page UI/CSS with FROK app design system (100% compliance with Session #14 standards)

---

## Executive Summary

The `/agent` page currently uses inconsistent design patterns, hardcoded colors, and non-standard Tailwind classes. This document outlines systematic improvements to achieve 100% design token compliance.

---

## Design Token Reference

### Color System (from `packages/ui/styles/tokens.css`)

```css
:root {
  --color-primary: #22d3ee;      /* Cyan - Primary actions */
  --color-accent: #3b82f6;       /* Blue - Accent elements */
  --background: #0a0a0a;          /* Page background */
  --foreground: #ededed;          /* Primary text */
  --surface: rgba(255,255,255,0.04);  /* Cards, modals, inputs */
  --border: rgba(255,255,255,0.1);     /* All borders */
  --success: #22c55e;             /* Success states */
  --danger: #ef4444;              /* Errors, delete actions */
  --warning: #f59e0b;             /* Warning states */
  --info: #06b6d4;                /* Info badges */
}
```

### Tailwind v4 Token Usage

| Purpose | Current (❌ Wrong) | Correct (✅) |
|---------|-------------------|--------------|
| Background | `bg-black/50` | `bg-surface` |
| Text | `text-white` | `text-foreground` |
| Border | `border-white/10` | `border-border` |
| Surface | `bg-white/5` | `bg-surface` |
| Primary | `text-primary/100` | `text-primary` |
| Success | `text-emerald-200` | `text-success` |
| Error | `text-rose-300` | `text-danger` |
| Warning | `text-warning/300` | `text-warning` |

---

## Critical Issues & Fixes

### 1. Hardcoded Colors → Semantic Tokens

#### Issue: Background Colors
```tsx
// ❌ Wrong
className="bg-black/50 backdrop-blur-sm"
className="bg-white/5"
className="bg-gradient-to-br from-background via-surface to-background"

// ✅ Correct
className="bg-surface/50 backdrop-blur-sm"
className="bg-surface"
className="bg-background"  // Use flat background, gradients are non-standard
```

#### Issue: Text Colors
```tsx
// ❌ Wrong
className="text-white"
className="text-foreground/60"  // Inconsistent opacity values

// ✅ Correct
className="text-foreground"
className="text-foreground/70"  // Standard opacity: none, /70, /60
```

#### Issue: Border Colors
```tsx
// ❌ Wrong
className="border-white/10"
className="border-white/20"

// ✅ Correct
className="border-border"
className="border-border"  // Use consistent token
```

---

### 2. Non-Standard Color Values → Standard Opacity

#### Issue: Invalid Tailwind Syntax
```tsx
// ❌ Wrong (invalid syntax: /500/60, /500/20)
className="border-primary/500/60 bg-primary/500/20 text-primary/100"
className="hover:border-primary/400 hover:bg-primary/500/30"

// ✅ Correct (standard opacity values)
className="border-primary bg-primary/10 text-primary"
className="hover:border-primary/70 hover:bg-primary/20"
```

#### Issue: Direct Color Classes
```tsx
// ❌ Wrong
className="text-rose-300 hover:text-rose-200 bg-rose-500/10"
className="text-emerald-200 bg-emerald-500/10"
className="text-warning/300"  // Invalid opacity

// ✅ Correct
className="text-danger hover:text-danger/70 bg-danger/10"
className="text-success bg-success/10"
className="text-warning"  // Standard warning token
```

---

### 3. Status Indicator Colors

#### Pinned Threads
```tsx
// ❌ Wrong
{thread.pinned && <span className="text-warning/300">📌</span>}

// ✅ Correct
{thread.pinned && <span className="text-warning">📌</span>}
```

#### Archived Threads
```tsx
// ❌ Wrong
{thread.archived && <span className="text-foreground/60">📦</span>}

// ✅ Correct (already correct - keep as is)
{thread.archived && <span className="text-foreground/60">📦</span>}
```

#### Branch Indicator
```tsx
// ❌ Wrong
<span className="text-xs text-accent/300" title="Branched conversation">🌿</span>

// ✅ Correct
<span className="text-xs text-accent" title="Branched conversation">🌿</span>
```

---

### 4. Component Patterns

#### Modal Backgrounds
```tsx
// ❌ Wrong
className="fixed inset-0 bg-black/50 backdrop-blur-sm"
className="bg-background border border-border rounded-lg"

// ✅ Correct (use Modal component from @frok/ui)
import { Modal } from '@frok/ui';
<Modal open={isOpen} onOpenChange={setIsOpen} title="Title">
  {/* Content */}
</Modal>
```

#### Buttons
```tsx
// ❌ Wrong
<button className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px]">
  Options
</button>

// ✅ Correct (use Button component from @frok/ui)
import { Button } from '@frok/ui';
<Button variant="outline" size="sm">Options</Button>
```

---

### 5. Border Radius Standardization

**Standard Values** (from design system):
- `rounded-md` - Buttons, inputs (standard)
- `rounded-lg` - Cards, small modals
- `rounded-xl` - Large modals, containers
- `rounded-2xl` - Hero cards (Card component default)
- `rounded-full` - Pills, badges, avatars

#### Current Issues
```tsx
// ❌ Inconsistent border radius
className="rounded-2xl"  // Thread items
className="rounded-xl"   // Search input
className="rounded-lg"   // Buttons

// ✅ Standardized
className="rounded-lg"   // Thread items (consistent with Card usage)
className="rounded-lg"   // Search input
className="rounded-md"   // Buttons (standard for interactive elements)
```

---

### 6. Inline Styles → Tailwind Utilities

#### Background Gradients
```tsx
// ❌ Wrong (inline style)
<div className="relative flex min-h-screen bg-gradient-to-br from-background via-surface to-background">

// ✅ Correct (flat background for consistency)
<div className="relative flex min-h-screen bg-background">
```

---

## Implementation Strategy

### Phase 1: Color Token Replacement (High Priority)
1. Replace all `bg-black/*`, `bg-white/*` → `bg-surface`
2. Replace all `text-white` → `text-foreground`
3. Replace all `border-white/*` → `border-border`
4. Fix non-standard opacity values (`/500/60` → standard values)

### Phase 2: Semantic Colors (Medium Priority)
1. Replace direct color classes (`text-rose-*`, `text-emerald-*`) → semantic tokens
2. Apply `text-success`, `text-danger`, `text-warning` for status indicators
3. Standardize primary/accent color usage

### Phase 3: Component Standardization (Medium Priority)
1. Replace raw `<button>` → `Button` from `@frok/ui`
2. Consider replacing modal overlays with `Modal` component
3. Standardize border radius across similar elements

### Phase 4: Layout & Spacing (Low Priority)
1. Remove inline gradients
2. Ensure consistent spacing patterns
3. Verify responsive behavior

---

## Testing Checklist

- [ ] All hardcoded colors replaced with semantic tokens
- [ ] No invalid Tailwind syntax (e.g., `/500/60`)
- [ ] Status indicators use correct semantic colors
- [ ] Border radius consistent with design system
- [ ] No inline styles (except where truly necessary)
- [ ] Visual coherence with dashboard, chatkit pages
- [ ] TypeScript compilation passes
- [ ] Responsive design maintained
- [ ] Accessibility preserved (ARIA labels, focus states)

---

## Before/After Examples

### Thread Item Background
```tsx
// Before
className="group relative cursor-pointer rounded-2xl border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/400 ${
  thread.id === activeThreadId
    ? 'border-primary/500/60 bg-primary/500/10'
    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
}"

// After
className={`group relative cursor-pointer rounded-lg border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
  thread.id === activeThreadId
    ? 'border-primary bg-primary/10'
    : 'border-border bg-surface hover:border-border/70 hover:bg-surface/80'
}`}
```

### Status Badges
```tsx
// Before
<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
  Online
</span>

// After
<span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
  Online
</span>
```

### Modal Overlay
```tsx
// Before
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}>
  <div className="bg-surface border border-border rounded-lg p-6 max-w-2xl w-full mx-4">
    {/* Content */}
  </div>
</div>

// After (using Modal component)
<Modal open={isOpen} onOpenChange={setIsOpen} title="Options" size="lg">
  {/* Content */}
</Modal>
```

---

## Expected Outcomes

1. **100% Design Token Compliance**: All colors use semantic tokens
2. **Visual Coherence**: /agent page matches dashboard, chatkit visual style
3. **Maintainability**: Future changes only need token updates
4. **Accessibility**: Preserved focus states, ARIA labels
5. **Performance**: No regression in bundle size or render performance

---

## References

- **Root CLAUDE.md**: Project-wide design standards
- **Session #14 History**: UI design consistency enforcement
- **packages/ui/CLAUDE.md**: Component development standards
- **packages/ui/styles/tokens.css**: Complete design token reference
