import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { validateBody, validateParams } from '@/lib/api/withValidation';
import { formatErrorMessage } from '@/lib/errorHandler';
import { suggestTitleParamSchema } from '@/schemas';
import { z } from 'zod';
import OpenAI from 'openai';

const suggestTitleBodySchema = z.object({
  firstMessage: z.string().min(1).max(10000).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(10).optional(),
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
    const { firstMessage, conversationHistory } = bodyValidation.data;
    const { threadId: _threadId } = paramsValidation.data;

    const openai = new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    });

    // Build messages for GPT based on what's provided
    let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;

    if (conversationHistory && conversationHistory.length > 0) {
      // Use conversation history for better title generation
      messages = [
        {
          role: 'system',
          content: 'Generate a concise, descriptive title (3-6 words) for this conversation. Analyze the entire conversation to understand the main topic. Return ONLY the title, no quotes or extra text.',
        },
        ...conversationHistory.slice(0, 5) as Array<{ role: 'user' | 'assistant'; content: string }>, // Use first 5 messages
      ];
    } else if (firstMessage) {
      // Fallback to first message only
      messages = [
        {
          role: 'system',
          content: 'Generate a concise, descriptive title (3-6 words) for a conversation based on the first user message. Return ONLY the title, no quotes or extra text.',
        },
        {
          role: 'user',
          content: firstMessage,
        },
      ];
    } else {
      return NextResponse.json(
        { ok: false, error: 'Either firstMessage or conversationHistory is required' },
        { status: 400 }
      );
    }

    // Use GPT to generate a concise title
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages,
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
