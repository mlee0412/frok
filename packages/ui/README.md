# @frok/ui

Shared UI component library for the FROK platform.

## Components

### Core Components
- **Button** - Primary, outline, and ghost button variants
- **Input** - Text inputs with validation support
- **Card** - Container component with variants
- **Modal** - Dialog and modal components
- **Toast** - Notification system

### Form Components
- **Form** - Form wrapper with validation
- **FormField** - Individual form fields
- **Label** - Form labels

### Navigation Components
- **SideNav** - Application sidebar navigation
- **Tabs** - Tabbed interface component

### Layout Components
- **Stack** - Horizontal and vertical stacks
- **Grid** - CSS Grid wrapper

## Usage

```typescript
import { Button, Input, Card } from '@frok/ui';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text..." />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```

## Styling

Components use Tailwind CSS v4 with CSS custom properties:

```typescript
// Use semantic color variables
<Button className="bg-surface text-foreground border-border">
  Click me
</Button>
```

### Available CSS Variables
- `--color-primary` - Primary brand color
- `--color-surface` - Background surfaces
- `--color-foreground` - Text color
- `--color-border` - Border color
- `--color-ring` - Focus ring color

## Development

```bash
# Build package
pnpm -F @frok/ui build

# Run Storybook
pnpm -F @frok/ui-docs dev

# Type check
pnpm -F @frok/ui typecheck
```

## Component Guidelines

1. **Always use named exports** - No default exports
2. **ForwardRef support** - Enable ref forwarding
3. **TypeScript props** - Export prop types
4. **Accessibility** - Include ARIA labels
5. **Responsive design** - Mobile-first approach

## Storybook

View component documentation and examples:

```bash
pnpm -F @frok/ui-docs dev
# Visit http://localhost:6006
```

## See Also

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)
- [apps/ui-docs/](../../apps/ui-docs) - Storybook configuration
