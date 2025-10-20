import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from '@frok/ui';

const meta: Meta<typeof Tabs> = {
  title: 'Primitives/Tabs',
  component: Tabs,
};
export default meta;

type Story = StoryObj<typeof Tabs>;

export const Basic: Story = {
  args: {
    items: [
      { value: 'one', label: 'One' },
      { value: 'two', label: 'Two' },
      { value: 'three', label: 'Three' },
    ],
    defaultValue: 'one',
  },
};
