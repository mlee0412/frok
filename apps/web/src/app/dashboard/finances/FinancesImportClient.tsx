'use client';
import * as React from 'react';
import { Card, Button, Input, useToast } from '@frok/ui';

export default function FinancesImportClient() {
  const toast = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);
  const [sample, setSample] = React.useState<any[]>([]);

  async function importCsv() {
    if (!file) return;
    setPending(true);
    try {
      const text = await file.text();
      const r = await fetch('/api/finances/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      });
      const j = await r.json();
      if (j && j.ok) {
        toast.success(`Imported ${j.imported} rows`);
        setSample(Array.isArray(j.sample) ? j.sample : []);
      } else {
        toast.error('Import failed');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="font-medium mb-3">CSV Import</div>
      <div className="text-xs text-foreground/60 mb-3">Expected headers: date,account,description,amount,currency</div>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="file" accept=".csv,text/csv" onChange={(e: any) => setFile(e.currentTarget.files?.[0] || null)} />
        <Button size="sm" disabled={!file || pending} onClick={importCsv}>
          {pending ? 'Importing…' : 'Import CSV'}
        </Button>
      </div>
      {sample.length > 0 && (
        <div className="mt-4 text-xs">
          <div className="text-foreground/60 mb-1">Sample</div>
          <pre className="rounded bg-surface p-2 overflow-x-auto">{JSON.stringify(sample, null, 2)}</pre>
        </div>
      )}
    </Card>
  );
}
