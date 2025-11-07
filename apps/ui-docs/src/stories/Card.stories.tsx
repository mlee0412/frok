import type { Meta, StoryObj } from '@storybook/react';
import { Card, Button } from '@frok/ui';

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  render: () => (
    <Card className="p-6">
      <h3 className="text-info/300 font-semibold mb-2">Card</h3>
      <p className="text-white/70">Content area inside card.</p>
      <div className="mt-4">
        <Button>Action</Button>
      </div>
    </Card>
  ),
};
