import React from 'react';
import { Card, Button } from '@frok/ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ProfilePage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="text-cyan-300 font-semibold mb-2">Welcome</div>
          <p className="text-white/70">Overview cards will go here (clock, weather, media, etc.).</p>
          <div className="mt-4"><Button>Primary action</Button></div>
        </Card>
        <Card className="p-6">Recent activity placeholder</Card>
      </div>
    </div>
  );
}
