import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { getSupabaseServer } from '@/lib/supabase/server';

type Suggestion = {
  icon: string;
  text: string;
  category: string;
};

const TIME_BASED_PROMPTS: Record<string, Suggestion[]> = {
  morning: [
    { icon: '☀️', text: 'What\'s on my schedule today?', category: 'Daily Brief' },
    { icon: '📰', text: 'Summarize the latest news', category: 'News' },
    { icon: '🏃', text: 'Give me a quick workout routine', category: 'Health' },
    { icon: '☕', text: 'Suggest a healthy breakfast', category: 'Wellness' },
  ],
  afternoon: [
    { icon: '💼', text: 'Help me plan my tasks for the rest of the day', category: 'Productivity' },
    { icon: '📊', text: 'Show me a summary of my progress', category: 'Analytics' },
    { icon: '🍽️', text: 'Suggest dinner ideas based on my preferences', category: 'Food' },
    { icon: '🔍', text: 'Research recent developments in AI', category: 'Learning' },
  ],
  evening: [
    { icon: '🌙', text: 'Summarize my day\'s activities', category: 'Daily Summary' },
    { icon: '📺', text: 'Recommend a movie or show to watch', category: 'Entertainment' },
    { icon: '🏠', text: 'Set my home to evening mode', category: 'Smart Home' },
    { icon: '📚', text: 'Suggest something interesting to read', category: 'Learning' },
  ],
  night: [
    { icon: '😴', text: 'Help me wind down for the night', category: 'Wellness' },
    { icon: '📝', text: 'Create tomorrow\'s to-do list', category: 'Planning' },
    { icon: '🌟', text: 'Tell me something inspiring', category: 'Motivation' },
    { icon: '🔒', text: 'Ensure all doors are locked', category: 'Security' },
  ],
};

const WEEKDAY_PROMPTS: Suggestion[] = [
  { icon: '💼', text: 'Review my work tasks and deadlines', category: 'Work' },
  { icon: '📅', text: 'What meetings do I have this week?', category: 'Calendar' },
  { icon: '🎯', text: 'Help me prioritize my tasks', category: 'Productivity' },
];

const WEEKEND_PROMPTS: Suggestion[] = [
  { icon: '🎉', text: 'Suggest fun weekend activities', category: 'Recreation' },
  { icon: '🏡', text: 'Help me plan some home projects', category: 'Home' },
  { icon: '🍳', text: 'Give me a recipe to try', category: 'Cooking' },
];

const GENERAL_PROMPTS: Suggestion[] = [
  { icon: '💡', text: 'Check the status of my smart home devices', category: 'Home Assistant' },
  { icon: '🌐', text: 'Search the web for latest AI news', category: 'Web Search' },
  { icon: '🧠', text: 'What do you remember about my preferences?', category: 'Memory' },
  { icon: '📊', text: 'Analyze this data and give me insights', category: 'Analysis' },
  { icon: '🏠', text: 'Turn on the kitchen lights and set brightness to 80%', category: 'Home Control' },
  { icon: '🔍', text: 'Help me understand a complex topic', category: 'Learning' },
  { icon: '✍️', text: 'Help me write a professional email', category: 'Writing' },
  { icon: '🎨', text: 'Generate an image based on my description', category: 'Creativity' },
];

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    if (temp !== undefined && shuffled[j] !== undefined) {
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
  }
  return shuffled;
}

async function getRecentTopics(userId: string): Promise<string[]> {
  try {
    const supabase = await getSupabaseServer();

    // Get recent thread titles (last 10 threads)
    const { data: threads } = await supabase
      .from('chat_threads')
      .select('title')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!threads || threads.length === 0) return [];

    // Extract unique topics from titles
    const topics = threads
      .map(t => t.title)
      .filter(Boolean)
      .filter(title => title !== 'Untitled' && title.length > 3);

    return topics.slice(0, 5);
  } catch (error) {
    console.error('Error fetching recent topics:', error);
    return [];
  }
}

function generateTopicBasedPrompt(topics: string[]): Suggestion | null {
  if (topics.length === 0) return null;

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  return {
    icon: '🔄',
    text: `Continue our discussion about ${randomTopic}`,
    category: 'Recent Topic',
  };
}

export async function GET(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const timeOfDay = getTimeOfDay();
    const weekend = isWeekend();

    // Get recent topics for personalization
    const recentTopics = await getRecentTopics(auth.user.userId);

    // Build suggestion list
    const suggestions: Suggestion[] = [];

    // 1. Add time-based prompts (2 prompts)
    const timePrompts = TIME_BASED_PROMPTS[timeOfDay] || GENERAL_PROMPTS;
    suggestions.push(...shuffleArray(timePrompts).slice(0, 2));

    // 2. Add weekday/weekend specific prompt (1 prompt)
    const contextPrompts = weekend ? WEEKEND_PROMPTS : WEEKDAY_PROMPTS;
    suggestions.push(...shuffleArray(contextPrompts).slice(0, 1));

    // 3. Add topic-based prompt if available (1 prompt)
    const topicPrompt = generateTopicBasedPrompt(recentTopics);
    if (topicPrompt) {
      suggestions.push(topicPrompt);
    } else {
      // Fallback to general prompt if no topics
      suggestions.push(...shuffleArray(GENERAL_PROMPTS).slice(0, 1));
    }

    // 4. Add random general prompts to fill remaining slots (2 prompts)
    const usedTexts = new Set(suggestions.map(s => s.text));
    const remainingGeneralPrompts = GENERAL_PROMPTS.filter(p => !usedTexts.has(p.text));
    suggestions.push(...shuffleArray(remainingGeneralPrompts).slice(0, 2));

    // Total: 6 suggestions (2 time + 1 context + 1 topic + 2 general)

    return NextResponse.json({
      ok: true,
      suggestions: suggestions.slice(0, 6),
      metadata: {
        timeOfDay,
        isWeekend: weekend,
        hasRecentTopics: recentTopics.length > 0,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('[suggestions GET error]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to generate suggestions',
      },
      { status: 500 }
    );
  }
}
