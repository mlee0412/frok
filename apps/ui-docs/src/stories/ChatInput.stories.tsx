import type { Meta, StoryObj } from '@storybook/react';
import { ChatInput } from '@frok/ui';

const meta: Meta<typeof ChatInput> = {
  title: 'Chat/ChatInput',
  component: ChatInput,
};
export default meta;

type Story = StoryObj<typeof ChatInput>;

export const Basic: Story = {
  args: {
    onSend: (t: string) => console.log('send:', t),
    placeholder: 'Type a message…',
  },
};
