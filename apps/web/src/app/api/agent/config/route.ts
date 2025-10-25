import { NextResponse } from 'next/server';

export async function GET() {
  const model = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';
  
  return NextResponse.json({
    model,
    tools: ['Home Assistant', 'Memory', 'Web Search'],
    reasoning: /(gpt-5|o3|gpt-4\.1|gpt-4o-reasoning)/i.test(model),
  });
}
