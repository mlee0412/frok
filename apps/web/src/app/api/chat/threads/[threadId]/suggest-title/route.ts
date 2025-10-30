import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { validateBody, validateParams } from '@/lib/api/withValidation';
import { formatErrorMessage } from '@/lib/errorHandler';
import { suggestTitleParamSchema } from '@/schemas';
import { z } from 'zod';
import OpenAI from 'openai';

const suggestTitleBodySchema = z.object({
  firstMessage: z.string().min(1).max(10000),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Apply rate limiting (AI title generation is expensive)
  const rateLimit = await withRateLimit(req, {
    ...rateLimitPresets.ai,
    identifier: () => auth.user.userId,
  });
  if (!rateLimit.ok) return rateLimit.response;

  // Validate params
  const paramsValidation = await validateParams(
    { params: await context.params },
    suggestTitleParamSchema
  );
  if (!paramsValidation.ok) return paramsValidation.response;

  // Validate body
  const bodyValidation = await validateBody(req, suggestTitleBodySchema);
  if (!bodyValidation.ok) return bodyValidation.response;

  try {
    const { firstMessage } = bodyValidation.data;
    const { threadId } = paramsValidation.data;

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
  } catch (error: unknown) {
    console.error('[suggest-title POST error]', error);
    return NextResponse.json(
      { ok: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
