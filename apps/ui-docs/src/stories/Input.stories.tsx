import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@frok/ui';

const meta: Meta<typeof Input> = {
  title: 'Primitives/Input',
  component: Input,
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Basic: Story = {
  args: { placeholder: 'Type here...' },
};

export const Playground: Story = {
  args: { placeholder: 'Play with controls' },
};
