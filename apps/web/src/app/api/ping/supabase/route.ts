import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || process.env["SUPABASE_ANON_KEY"];

  if (!url || !anon) {
    return NextResponse.json({ ok: false, detail: 'missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' }, { status: 200 });
  }

  return NextResponse.json({ ok: true, detail: 'env present' }, { status: 200 });
}
