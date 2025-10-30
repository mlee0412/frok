import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';

export const runtime = 'nodejs';

// Fast intent classification
export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Rate limiting (AI preset - 5 req/min)
  const rateLimit = await withRateLimit(req, rateLimitPresets.ai);
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const { query } = await req.json();

    // Ultra-fast pattern matching for common simple queries
    const simplePatterns = [
      // Home control
      /turn (on|off|the).+(light|lamp|switch|fan|tv|television)/i,
      /(lights?|lamps?|switches?|fans?) (on|off)/i,
      /(open|close).+(door|window|garage|curtain|blind)/i,
      /(set|adjust).+(temperature|thermostat|heat|ac)/i,
      /(dim|brighten).+(light|lamp)/i,
      
      // Weather
      /(what'?s|how'?s|check|tell me).+(weather|temperature|forecast)/i,
      /weather (in|for|at)/i,
      /is it (raining|snowing|sunny|cloudy)/i,
      
      // Time/Date
      /(what|tell me).+(time|date|day)/i,
      /what time is it/i,
      
      // Status checks
      /(are|is).+(on|off|open|closed)/i,
      /status of/i,
      
      // Simple greetings (can skip AI entirely)
      /^(hi|hello|hey|good morning|good afternoon|good evening)[\s\W]*$/i,
    ];

    // Check if query matches simple patterns
    if (simplePatterns.some(pattern => pattern.test(query))) {
      return NextResponse.json({ 
        complexity: 'simple',
        confidence: 0.95,
        reason: 'Pattern match: simple command'
      });
    }

    // For ambiguous cases, use GPT-5 Nano for classification (fast)
    const openai = new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `Classify the query complexity:
- "simple": Single action (control device, check weather/time, simple question)
- "moderate": Needs web search, multiple steps, or basic reasoning
- "complex": Requires deep reasoning, coding, analysis, or multi-step planning

Respond with JSON only: {"complexity": "simple|moderate|complex", "reason": "brief reason"}`
        },
        { role: 'user', content: query }
      ],
      max_tokens: 50,
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '{}';
    const classification = JSON.parse(response);

    return NextResponse.json({
      complexity: classification.complexity || 'moderate',
      confidence: 0.8,
      reason: classification.reason || 'AI classification'
    });

  } catch (error: unknown) {
    console.error('[classify error]', error);
    // Default to moderate on error
    return NextResponse.json({
      complexity: 'moderate',
      confidence: 0.5,
      reason: 'Classification failed, using default'
    });
  }
}
