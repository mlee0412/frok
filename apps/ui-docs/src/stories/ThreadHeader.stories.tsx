import type { Meta, StoryObj } from '@storybook/react';
import { ThreadHeader } from '@frok/ui';

const meta: Meta<typeof ThreadHeader> = {
  title: 'Chat/ThreadHeader',
  component: ThreadHeader,
};
export default meta;

type Story = StoryObj<typeof ThreadHeader>;

export const Basic: Story = {
  args: {
    title: 'Demo chat',
    agentId: 'default',
    agents: [
      { id: 'default', name: 'Default' },
      { id: 'fast', name: 'Fast' },
    ],
    onChangeAgent: (id: string) => console.log('agent', id),
  },
};
