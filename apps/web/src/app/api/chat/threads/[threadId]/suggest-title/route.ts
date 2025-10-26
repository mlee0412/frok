import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(
  req: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const body = await req.json();
    const { firstMessage } = body;
    const { threadId } = await context.params; // kept for parity; not used currently

    if (!firstMessage) {
      return NextResponse.json(
        { ok: false, error: 'First message required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use GPT to generate a concise title
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a concise, descriptive title (3-6 words) for a conversation based on the first user message. Return ONLY the title, no quotes or extra text.',
        },
        {
          role: 'user',
          content: firstMessage,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    const suggestedTitle = completion.choices[0]?.message?.content?.trim() || 'New Chat';

    return NextResponse.json({ ok: true, title: suggestedTitle });
  } catch (e: any) {
    console.error('[suggest-title POST error]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to suggest title' },
      { status: 500 }
    );
  }
}
