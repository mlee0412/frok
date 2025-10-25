import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Toaster, useToast, Button, Card } from '@frok/ui';

const meta: Meta = {
  title: 'Feedback/Toaster',
};
export default meta;

type Story = StoryObj;

function Demo() {
  const toast = useToast();
  return (
    <div className="space-y-4">
      <Card className="p-4 space-x-2">
        <Button onClick={() => toast.show('Hello from Toaster')}>Default</Button>
        <Button variant="outline" onClick={() => toast.success('Saved!')}>Success</Button>
        <Button variant="outline" onClick={() => toast.error('Something went wrong')}>Error</Button>
        <Button variant="outline" onClick={() => toast.info('FYI: Check the logs')}>Info</Button>
      </Card>
    </div>
  );
}

export const Basic: Story = {
  render: () => (
    <Toaster>
      <Demo />
    </Toaster>
  ),
};
