import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const query = String(body?.query || '').trim();
  const max_results = typeof body?.max_results === 'number' ? Math.min(body.max_results, 10) : 5;

  if (!query) {
    return NextResponse.json({ ok: false, error: 'query_required' }, { status: 400 });
  }

  // Check for TAVILY_API_KEY
  const tavilyKey = process.env["TAVILY_API_KEY"];
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          max_results,
          include_answer: true,
          include_raw_content: false,
        }),
      });

      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `tavily_status_${res.status}` }, { status: 500 });
      }

      const data: any = await res.json();
      const results = (data.results || []).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.content || '',
      }));

      return NextResponse.json({ ok: true, answer: data.answer || null, results }, { status: 200 });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: 'tavily_exception', detail: e?.message }, { status: 500 });
    }
  }

  // Fallback: DuckDuckGo HTML scraping (basic, no API key needed)
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'ddg_failed' }, { status: 500 });
    }

    const html = await res.text();
    // Very basic parsing: extract result links
    const results: { title: string; url: string; snippet: string }[] = [];
    const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null && results.length < max_results) {
      results.push({ title: match[2] ?? '', url: match[1] ?? '', snippet: '' });
    }

    return NextResponse.json({ ok: true, answer: null, results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'search_exception', detail: e?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: true, hint: 'POST { query, max_results? } to search the web. Set TAVILY_API_KEY for better results.' },
    { status: 200 }
  );
}
