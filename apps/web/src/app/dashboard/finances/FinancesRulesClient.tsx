'use client';
import * as React from 'react';
import { Card, Button, Input, useToast } from '@frok/ui';

type Category = { id: string; name: string };
type Rule = { id: string; pattern: string; category_id: string };

export default function FinancesRulesClient() {
  const toast = useToast();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [rules, setRules] = React.useState<Rule[]>([]);
  const [catName, setCatName] = React.useState('');
  const [pat, setPat] = React.useState('');
  const [catId, setCatId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState<null | string>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        fetch('/api/finances/categories', { cache: 'no-store' }).then((x) => x.json()).catch(() => null),
        fetch('/api/finances/rules', { cache: 'no-store' }).then((x) => x.json()).catch(() => null),
      ]);
      if (c?.ok && Array.isArray(c.items)) setCategories(c.items);
      if (r?.ok && Array.isArray(r.items)) setRules(r.items);
    } finally { setLoading(false); }
  }

  React.useEffect(() => { loadAll(); }, []);

  async function addCategory() {
    if (!catName.trim()) return;
    setPending('add_cat');
    try {
      const r = await fetch('/api/finances/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: catName.trim() }) });
      const j = await r.json();
      if (j?.ok) {
        toast.success('Category added');
        setCatName('');
        await loadAll();
      } else {
        toast.error('Failed to add category');
      }
    } finally { setPending(null); }
  }

  async function deleteCategory(id: string) {
    setPending(`del_cat:${id}`);
    try {
      const r = await fetch('/api/finances/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok !== false) {
        toast.success('Category deleted');
        await loadAll();
      } else {
        toast.error('Failed to delete category');
      }
    } finally { setPending(null); }
  }

  async function addRule() {
    if (!pat.trim() || !catId) return;
    setPending('add_rule');
    try {
      const r = await fetch('/api/finances/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pattern: pat.trim(), category_id: catId }) });
      const j = await r.json();
      if (j?.ok) {
        toast.success('Rule added');
        setPat('');
        await loadAll();
      } else {
        toast.error('Failed to add rule');
      }
    } finally { setPending(null); }
  }

  async function deleteRule(id: string) {
    setPending(`del_rule:${id}`);
    try {
      const r = await fetch('/api/finances/rules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok !== false) {
        toast.success('Rule deleted');
        await loadAll();
      } else {
        toast.error('Failed to delete rule');
      }
    } finally { setPending(null); }
  }

  async function reclassify() {
    setPending('reclass');
    try {
      const r = await fetch('/api/finances/reclassify', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok !== false) {
        toast.success(`Reclassified ${j.updated || 0} transactions`);
      } else {
        toast.error('Reclassify failed');
      }
    } finally { setPending(null); }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-4">
        <div className="font-medium mb-2">Categories</div>
        <div className="flex items-center gap-2 mb-3">
          <Input placeholder="Category name" value={catName} onChange={(e: any) => setCatName(e.currentTarget.value)} />
          <Button size="sm" disabled={!catName.trim() || pending !== null} onClick={addCategory}>{pending === 'add_cat' ? '...' : 'Add'}</Button>
        </div>
        <div className="text-xs text-foreground/60 mb-2">{loading ? 'Loading…' : `${categories.length} categories`}</div>
        <div className="space-y-1">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1">{c.name}</div>
              <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => deleteCategory(c.id)}>Delete</Button>
            </div>
          ))}
          {categories.length === 0 && !loading && <div className="text-xs text-foreground/60">No categories</div>}
        </div>
      </Card>

      <Card className="p-4 md:col-span-2">
        <div className="font-medium mb-2">Rules</div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input placeholder="Pattern (substring)" value={pat} onChange={(e: any) => setPat(e.currentTarget.value)} />
          <select className="border border-border rounded px-2 py-1 text-sm bg-transparent" value={catId} onChange={(e) => setCatId(e.currentTarget.value)}>
            <option value="">Select category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button size="sm" disabled={!pat.trim() || !catId || pending !== null} onClick={addRule}>{pending === 'add_rule' ? '...' : 'Add Rule'}</Button>
        </div>
        <div className="text-xs text-foreground/60 mb-2">{loading ? 'Loading…' : `${rules.length} rules`}</div>
        <div className="space-y-1">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <span className="opacity-60">if description contains</span> <span className="font-mono">"{r.pattern}"</span>
                <span className="opacity-60"> then category → </span>
                <span className="font-medium">{categories.find((c) => c.id === r.category_id)?.name || r.category_id}</span>
              </div>
              <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => deleteRule(r.id)}>Delete</Button>
            </div>
          ))}
          {rules.length === 0 && !loading && <div className="text-xs text-foreground/60">No rules</div>}
        </div>
      </Card>

      <Card className="p-4 md:col-span-3">
        <div className="font-medium mb-2">Actions</div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending !== null} onClick={reclassify}>{pending === 'reclass' ? 'Reclassifying…' : 'Reclassify Transactions'}</Button>
          <div className="text-xs text-foreground/60">Applies rules to existing transactions (matches in description)</div>
        </div>
      </Card>
    </div>
  );
}
