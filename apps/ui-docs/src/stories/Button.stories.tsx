import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@frok/ui';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'outline', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Click me', variant: 'primary' }
};

export const Outline: Story = {
  args: { children: 'Click me', variant: 'outline' }
};

export const Ghost: Story = {
  args: { children: 'Click me', variant: 'ghost' }
};

export const Playground: Story = {
  args: { children: 'Play with controls', variant: 'primary', size: 'md' },
};
