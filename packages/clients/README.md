# @frok/clients

HTTP and SDK clients for external services.

## Exports

- `OpenAIClient` - OpenAI API wrapper
- `SupabaseClient` - Supabase client factory
- `HomeAssistantClient` - Home Assistant API client

## Usage

```typescript
import { OpenAIClient } from '@frok/clients';

const client = new OpenAIClient(apiKey);
const response = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Development

```bash
# Build package
pnpm -F @frok/clients build

# Run tests
pnpm -F @frok/clients test

# Type check
pnpm -F @frok/clients typecheck
```

## Package Structure

```
packages/clients/
├── src/
│   ├── openai/       - OpenAI API client
│   ├── supabase/     - Supabase client utilities
│   ├── homeAssistant/ - Home Assistant integration
│   └── index.ts      - Main exports
└── package.json
```

## See Also

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Home Assistant API](https://developers.home-assistant.io/docs/api/rest)
