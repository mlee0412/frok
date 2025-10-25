import type { Meta, StoryObj } from '@storybook/react';
import { ChatSidebar } from '@frok/ui';

const meta: Meta<typeof ChatSidebar> = {
  title: 'Chat/ChatSidebar',
  component: ChatSidebar,
};
export default meta;

type Story = StoryObj<typeof ChatSidebar>;

export const Basic: Story = {
  args: {
    threads: [
      { id: 't1', title: 'Welcome' },
      { id: 't2', title: 'Ideas' },
    ],
    currentId: 't1',
    onSelect: (id: string) => console.log('select', id),
    onNew: () => console.log('new'),
  },
};
