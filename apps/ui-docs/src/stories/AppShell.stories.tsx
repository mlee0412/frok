import type { Meta, StoryObj } from '@storybook/react';
import { AppShell, SideNav, Card, Button } from '@frok/ui';

const meta: Meta<typeof AppShell> = {
  title: 'Layout/AppShell',
  component: AppShell,
};
export default meta;

type Story = StoryObj<typeof AppShell>;

export const Basic: Story = {
  render: () => (
    <AppShell
      sideNav={
        <SideNav
          header={<div className="px-4 pb-4 text-info/400 font-bold">FROK</div>}
          items={[
            { label: 'Profile', href: '#' },
            { label: 'System', href: '#' },
            { label: 'Smart Home', href: '#' },
            { label: 'Finances', href: '#' },
          ]}
          footer={<div className="mt-auto px-4 pt-4 text-xs opacity-60">© FROK</div>}
        />
      }
      header={<div className="border-b border-white/10 p-4">Header</div>}
    >
      <div className="py-6 space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-info/300 font-semibold">Welcome</h3>
            <Button>Action</Button>
          </div>
          <p className="text-white/70 mt-2">This is the main content area.</p>
        </Card>
        <Card className="p-6">Another section</Card>
      </div>
    </AppShell>
  ),
};
