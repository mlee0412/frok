function normalizeAgentOutput(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map(item => normalizeAgentOutput(item))
      .filter((part): part is string => typeof part === 'string' && part.length > 0);
    return parts.length > 0 ? parts.join('\n').trim() : null;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    const textValue = obj['text'];
    if (typeof textValue === 'string') {
      return normalizeAgentOutput(textValue);
    }

    const outputText = obj['output_text'];
    if (typeof outputText === 'string' || Array.isArray(outputText)) {
      return normalizeAgentOutput(outputText);
    }

    const responseText = obj['response'];
    if (typeof responseText === 'string') {
      return normalizeAgentOutput(responseText);
    }

    if (obj['content']) {
      return normalizeAgentOutput(obj['content']);
    }
  }

  return null;
}

export function extractFinalText(result: any): string | null {
  const direct = normalizeAgentOutput(result?.finalOutput);
  if (direct) {
    return direct;
  }

  const state = result?.state ?? {};
  const candidates = [
    state.messages,
    state.history,
    state.conversation,
    result?.messages,
    state.final,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (let i = candidate.length - 1; i >= 0; i -= 1) {
        const message = candidate[i];
        const role = message?.role ?? message?.message?.role;

        if (role && typeof role === 'string' && role.includes('assistant')) {
          const content =
            message?.content ?? message?.message?.content ?? message?.output ?? message?.text;
          const text = normalizeAgentOutput(content);
          if (text) {
            return text;
          }
        }
      }
    } else if (candidate) {
      const text = normalizeAgentOutput(candidate);
      if (text) {
        return text;
      }
    }
  }

  return null;
}
