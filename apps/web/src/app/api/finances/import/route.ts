import { NextRequest, NextResponse } from 'next/server';
import { supabaseServiceClient } from '../../../../lib/supabaseServer';

type Item = { date: string; account: string; description?: string; amount: number; currency?: string };

function parseCSV(text: string): Item[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  // naive CSV parser with quotes support (no escapes)
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === ',' && !inQ) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    date: header.indexOf('date'),
    account: header.indexOf('account'),
    description: header.indexOf('description'),
    amount: header.indexOf('amount'),
    currency: header.indexOf('currency'),
  };
  const items: Item[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = split(lines[li]);
    if (cols.length === 1 && cols[0] === '') continue;
    const amountRaw = idx.amount >= 0 ? cols[idx.amount] : '';
    const amount = Number((amountRaw || '').replace(/[$,\s]/g, ''));
    if (!isFinite(amount)) continue;
    const item: Item = {
      date: idx.date >= 0 ? cols[idx.date] : '',
      account: idx.account >= 0 ? cols[idx.account] : '',
      description: idx.description >= 0 ? cols[idx.description] : '',
      amount,
      currency: idx.currency >= 0 ? (cols[idx.currency] || 'USD') : 'USD',
    };
    if (item.date && item.account) items.push(item);
  }
  return items;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServiceClient();
    const ct = (req.headers.get('content-type') || '').toLowerCase();
    let items: Item[] = [];
    if (ct.includes('text/csv')) {
      const text = await req.text();
      items = parseCSV(text);
    } else if (ct.includes('application/json')) {
      const body = await req.json();
      items = Array.isArray(body?.items) ? body.items : [];
    } else {
      return NextResponse.json({ ok: false, error: 'unsupported_content_type', detail: 'Send text/csv or application/json' }, { status: 415 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: true, imported: 0, sample: [] });
    }

    const acctCache = new Map<string, string>();
    async function ensureAccountId(name: string, currency: string): Promise<string> {
      const key = `${name}__${currency}`;
      const cached = acctCache.get(key);
      if (cached) return cached;
      const { data: found, error: selErr } = await supabase
        .from('fin_accounts')
        .select('id, name, currency')
        .eq('name', name)
        .eq('currency', currency)
        .limit(1)
        .maybeSingle();
      if (selErr) throw selErr;
      if (found?.id) {
        acctCache.set(key, found.id);
        return found.id;
      }
      const { data: inserted, error: insErr } = await supabase
        .from('fin_accounts')
        .insert({ name, currency })
        .select('id')
        .single();
      if (insErr) throw insErr;
      acctCache.set(key, inserted.id);
      return inserted.id;
    }

    const { data: rules } = await supabase.from('fin_rules').select('id, pattern, category_id');

    function matchCategoryId(description?: string | null): string | null {
      const d = (description || '').toLowerCase();
      if (!d || !Array.isArray(rules)) return null;
      for (const r of rules) {
        const p = String(r.pattern || '').toLowerCase();
        if (p && d.includes(p)) return r.category_id || null;
      }
      return null;
    }

    const rows: any[] = [];
    for (const it of items) {
      const currency = it.currency || 'USD';
      const accountId = await ensureAccountId(it.account, currency);
      const d = new Date(it.date);
      if (isNaN(d.getTime())) continue;
      const category_id = matchCategoryId(it.description);
      const posted_at = d.toISOString();
      const amountFixed = Number.isFinite(it.amount) ? Number(it.amount.toFixed(2)) : Number(Number(it.amount).toFixed(2));
      const descNorm = String(it.description || '').trim().toLowerCase();
      const currNorm = String(currency || 'USD').trim().toUpperCase();
      const dedup_key = `${accountId}|${posted_at}|${amountFixed}|${currNorm}|${descNorm}`;
      rows.push({
        account_id: accountId,
        posted_at,
        amount: amountFixed,
        currency: currNorm,
        description: it.description || null,
        category_id,
        dedup_key,
      });
    }

    if (rows.length === 0) return NextResponse.json({ ok: true, imported: 0, sample: [] });

    // Remove duplicates within this import by dedup_key
    const uniqueByKey = new Map<string, any>();
    for (const r of rows) {
      if (!uniqueByKey.has(r.dedup_key)) uniqueByKey.set(r.dedup_key, r);
    }
    const uniqueRows = Array.from(uniqueByKey.values());
    const keys = uniqueRows.map((r) => r.dedup_key);

    // Find which keys already exist in DB
    const { data: existingRows, error: existingErr } = await supabase
      .from('fin_transactions')
      .select('dedup_key')
      .in('dedup_key', keys);
    if (existingErr) throw existingErr;
    const existingKeys = new Set((existingRows || []).map((r: any) => r.dedup_key));

    // Upsert unique rows using dedup_key to ignore duplicates
    const { error: upsertErr } = await supabase
      .from('fin_transactions')
      .upsert(uniqueRows, { onConflict: 'dedup_key' });
    if (upsertErr) throw upsertErr;

    const insertedCount = uniqueRows.filter((r) => !existingKeys.has(r.dedup_key)).length;
    return NextResponse.json({ ok: true, imported: insertedCount, sample: items.slice(0, 5) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'exception';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

