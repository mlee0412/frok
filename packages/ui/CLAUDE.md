# packages/ui - Shared UI Component Library Context

**Purpose**: Domain-specific patterns for creating and maintaining reusable React components.

> 📚 **Parent Context**: See [root CLAUDE.md](../../CLAUDE.md) for project-wide standards
> 📖 **Full Docs**: See [packages/ui/README.md](README.md) for complete component catalog

---

## Directory Structure

```
packages/ui/
├── src/
│   ├── components/          # React components
│   │   ├── Button.tsx       # Button (primary, outline, ghost)
│   │   ├── Input.tsx        # Text input with validation
│   │   ├── Card.tsx         # Content card
│   │   ├── Modal.tsx        # Modal dialog
│   │   ├── SideNav.tsx      # Navigation sidebar
│   │   ├── ChatSidebar.tsx  # Chat thread list
│   │   ├── ConfirmDialog.tsx # Confirmation modal
│   │   └── ...
│   ├── hooks/               # Shared React hooks
│   │   ├── useModal.ts      # Modal state management
│   │   └── useConfirmDialog.ts # Confirmation dialog
│   └── styles/
│       └── tokens.css       # CSS custom properties (design tokens)
├── index.ts                 # Barrel export (all components)
└── tailwind.config.ts       # Tailwind configuration
```

---

## Component Development Standards

### File Structure

```typescript
// packages/ui/src/components/ComponentName.tsx

import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export interface ComponentNameProps extends ComponentPropsWithoutRef<'element'> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  // Component-specific props
}

export const ComponentName = forwardRef<HTMLElement, ComponentNameProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    return (
      <element
        ref={ref}
        className={`base-styles variant-${variant} size-${size} ${className || ''}`}
        {...props}
      />
    );
  }
);

ComponentName.displayName = 'ComponentName';
```

**Key Requirements**:
1. **Named exports** - No default exports
2. **TypeScript** - Full type safety with exported prop interface
3. **ForwardRef** - Support ref forwarding for all components
4. **Extend native props** - Use `ComponentPropsWithoutRef<'element'>` for HTML attributes
5. **Display name** - Set displayName for better debugging

### CSS Variables (Design Tokens)

**ALWAYS use CSS variables** - Never hardcode colors:

```css
/* packages/ui/styles/tokens.css */
:root {
  /* Colors */
  --color-primary: oklch(60% 0.15 250);
  --color-accent: oklch(70% 0.2 200);
  --color-surface: oklch(20% 0.01 250);
  --color-border: oklch(30% 0.01 250);
  --color-ring: oklch(60% 0.15 250);

  /* Semantic colors */
  --color-success: oklch(70% 0.15 150);
  --color-danger: oklch(60% 0.2 25);
  --color-warning: oklch(75% 0.15 80);
  --color-info: oklch(65% 0.15 220);

  /* Text */
  --color-foreground: oklch(98% 0 0);
  --color-foreground-muted: oklch(70% 0 0);
}
```

**Usage in Components**:
```typescript
// ❌ Wrong - Never hardcode colors
className="bg-gray-900 text-gray-400 border-gray-700"

// ✅ Correct - Use Tailwind utilities that reference CSS variables
className="bg-surface text-foreground/70 border-border"
```

**Tailwind v4 Integration**:
CSS variables are automatically integrated into Tailwind's theme via `tailwind.config.ts`.

---

## Component Patterns

### Button Component

```typescript
import { Button } from '@frok/ui';

// Variants: primary, outline, ghost
<Button variant="primary">Primary Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>

// Sizes: sm, md, lg
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// With icon
<Button>
  <Icon className="w-4 h-4 mr-2" />
  Button with Icon
</Button>

// Disabled state
<Button disabled>Disabled</Button>

// All native button props supported
<Button type="submit" onClick={handleClick} aria-label="Action">
  Submit
</Button>
```

**Features**:
- Focus-visible ring for accessibility
- Hover/active states
- Disabled styles
- Forwards ref to button element

### Input Component

```typescript
import { Input } from '@frok/ui';

<Input
  type="text"
  placeholder="Enter text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// With error state
<Input error={errors.email?.message} />

// All native input props supported
<Input
  type="email"
  required
  autoComplete="email"
  aria-label="Email address"
/>
```

### Card Component

```typescript
import { Card } from '@frok/ui';

<Card>
  <h2 className="text-lg font-semibold">Title</h2>
  <p className="text-sm text-foreground/70">Content</p>
</Card>
```

### Modal Component

```typescript
import { Modal, useModal } from '@frok/ui';

function Component() {
  const { isOpen, open, close } = useModal();

  return (
    <>
      <Button onClick={open}>Open Modal</Button>

      <Modal
        open={isOpen}
        onOpenChange={close}
        title="Modal Title"
        description="Optional description"
        size="md" // sm, md, lg, xl, full
      >
        <p>Modal content</p>

        <Modal.Footer>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
```

**Features**:
- ESC key to close
- Click outside to close
- Body scroll prevention
- Focus trap
- ARIA attributes (aria-modal, aria-labelledby, role="dialog")

### ConfirmDialog Component

```typescript
import { useConfirmDialog } from '@frok/ui';

function Component() {
  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async () => {
    await confirm({
      title: 'Delete Item',
      description: 'Are you sure? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger', // danger, warning, info
      onConfirm: async () => {
        await deleteItem();
      },
    });
  };

  return (
    <>
      <Button onClick={handleDelete}>Delete</Button>
      {dialog}
    </>
  );
}
```

---

## Accessibility Requirements

### ARIA Labels

**All interactive elements MUST have accessible names**:

```typescript
// ❌ Wrong - No accessible name
<button onClick={onClose}>×</button>

// ✅ Correct - aria-label provides accessible name
<button onClick={onClose} aria-label="Close modal">×</button>
```

### Modal Accessibility

All modals MUST have:
```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Title</h2>
  <p id="modal-description">Description</p>
</div>
```

### Focus Management

```typescript
// Use focus trap for modals
import { useFocusTrap } from '@frok/ui';

const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
return <div ref={modalRef}>...</div>;
```

### Keyboard Navigation

- **Tab**: Focus next element
- **Shift+Tab**: Focus previous element
- **Enter/Space**: Activate buttons
- **Escape**: Close modals/dialogs
- **Arrow keys**: Navigate lists (use `useListFocus` hook)

---

## Tailwind CSS v4 Patterns

### Using @apply (Sparingly)

```css
/* Only for repeated patterns */
.btn-base {
  @apply inline-flex items-center justify-center rounded-md font-medium transition-colors;
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring;
}
```

**Prefer**: Utility classes in JSX over @apply (better for tree-shaking)

### Custom Utilities

```typescript
// Use cn() helper for conditional classes
import { cn } from '@frok/utils';

className={cn(
  'base-class',
  variant === 'primary' && 'bg-primary text-white',
  variant === 'outline' && 'border border-border',
  disabled && 'opacity-50 cursor-not-allowed',
  className // User-provided classes last (can override)
)}
```

---

## Component Testing

### Unit Tests with Vitest

```typescript
// packages/ui/src/components/__tests__/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies variant classes', () => {
    render(<Button variant="primary">Button</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-primary');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
```

### Storybook Stories

```typescript
// apps/ui-docs/stories/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@frok/ui';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'outline', 'ghost'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};
```

---

## Adding New Components

### Checklist

- [ ] Create component file in `src/components/ComponentName.tsx`
- [ ] Use named export: `export const ComponentName = ...`
- [ ] Add TypeScript interface: `export interface ComponentNameProps`
- [ ] Use `forwardRef` for ref support
- [ ] Extend native HTML props: `ComponentPropsWithoutRef<'element'>`
- [ ] Set `displayName` for debugging
- [ ] Use CSS variables (never hardcoded colors)
- [ ] Add ARIA attributes where appropriate
- [ ] Support all native element attributes via `...props`
- [ ] Export from `src/index.ts`
- [ ] Add unit tests in `src/components/__tests__/`
- [ ] Add Storybook story in `apps/ui-docs/stories/`
- [ ] Document in `packages/ui/README.md`

### Example: Creating a Badge Component

```typescript
// packages/ui/src/components/Badge.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@frok/utils';

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
          variant === 'default' && 'bg-surface text-foreground',
          variant === 'success' && 'bg-success/10 text-success',
          variant === 'danger' && 'bg-danger/10 text-danger',
          variant === 'warning' && 'bg-warning/10 text-warning',
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
```

---

## Quick Commands

```bash
# Development (from monorepo root)
pnpm -F @frok/ui dev        # Watch mode for development

# Testing
pnpm -F @frok/ui test       # Unit tests
pnpm -F @frok/ui typecheck  # TypeScript compilation

# Building
pnpm -F @frok/ui build      # Build for production

# Storybook
pnpm -F @frok/ui-docs dev   # Start Storybook on :6006
```

---

**Note**: This file provides UI component patterns. For usage in Next.js apps, see [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md).
