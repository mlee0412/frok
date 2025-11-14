import { describe, expect, it } from 'vitest';
import { extractFinalText } from '../extractAgentOutput';

describe('extractFinalText', () => {
  it('returns direct finalOutput when present', () => {
    const result = extractFinalText({ finalOutput: 'Hello world' });
    expect(result).toBe('Hello world');
  });

  it('handles array-based finalOutput', () => {
    const result = extractFinalText({ finalOutput: ['First part', 'Second part'] });
    expect(result).toBe('First part\nSecond part');
  });

  it('derives the last assistant message from state.messages', () => {
    const result = extractFinalText({
      state: {
        messages: [
          { role: 'user', content: 'Hi there' },
          { role: 'assistant', content: 'Hello human' },
        ],
      },
    });

    expect(result).toBe('Hello human');
  });

  it('supports nested message objects with output_text', () => {
    const result = extractFinalText({
      state: {
        messages: [
          { message: { role: 'assistant', content: { output_text: ['Part A', 'Part B'] } } },
        ],
      },
    });

    expect(result).toBe('Part A\nPart B');
  });

  it('returns null when no assistant text is found', () => {
    const result = extractFinalText({ state: { messages: [{ role: 'user', content: 'Only user' }] } });
    expect(result).toBeNull();
  });
});
