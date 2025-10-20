import type { Meta, StoryObj } from '@storybook/react';
import { SideNav } from '@frok/ui';

const meta: Meta<typeof SideNav> = {
  title: 'Primitives/SideNav',
  component: SideNav,
};
export default meta;

type Story = StoryObj<typeof SideNav>;

export const Basic: Story = {
  args: {
    items: [
      { label: 'Dashboard', href: '#' },
      { label: 'System', href: '#' },
      { label: 'Smart Home', href: '#' },
      { label: 'Finances', href: '#' },
    ],
    header: <div className="px-4 pb-4 text-cyan-400 font-bold">FROK</div>,
    footer: <div className="mt-auto px-4 pt-4 text-xs opacity-60">© FROK</div>,
  },
};
