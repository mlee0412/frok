# @frok/ui-docs

Storybook documentation for FROK UI components.

## Features

- **Interactive Component Explorer** - Browse all UI components
- **Live Code Examples** - See component code and props
- **Visual Testing** - Test components in isolation
- **Documentation** - Component usage guidelines

## Development

```bash
# Start Storybook dev server
pnpm -F @frok/ui-docs dev
# Visit http://localhost:6006

# Build static Storybook
pnpm -F @frok/ui-docs build

# Preview static build
pnpm -F @frok/ui-docs preview
```

## Project Structure

```
apps/ui-docs/
├── .storybook/       - Storybook configuration
│   ├── main.ts       - Main config
│   ├── preview.ts    - Preview config
│   └── manager.ts    - Manager config
├── stories/          - Component stories
│   ├── Button.stories.tsx
│   ├── Input.stories.tsx
│   └── ...
└── public/           - Static assets
```

## Writing Stories

Stories are written using Component Story Format (CSF 3):

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@frok/ui';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};
```

## Available Addons

- **Controls** - Interactive props editor
- **Actions** - Event handler logging
- **Viewport** - Responsive design testing
- **Accessibility** - a11y testing
- **Docs** - Auto-generated documentation

## Deployment

Static Storybook builds are automatically deployed on push to main:

```bash
# Build for deployment
pnpm -F @frok/ui-docs build

# Output in storybook-static/
```

## See Also

- [Storybook Documentation](https://storybook.js.org/docs)
- [packages/ui/](../../packages/ui) - UI component library
