import type { Meta, StoryObj } from '@storybook/react';
import { ChatMessage } from '@frok/ui';

const meta: Meta<typeof ChatMessage> = {
  title: 'Chat/ChatMessage',
  component: ChatMessage,
};
export default meta;

type Story = StoryObj<typeof ChatMessage>;

export const User: Story = {
  args: { role: 'user', content: 'Hello there!' }
};

export const Assistant: Story = {
  args: { role: 'assistant', content: 'Hi! How can I help you today?' }
};
