# @frok/api

Fastify 5 backend API server for the FROK platform.

## Features

- **RESTful API** - Standard HTTP endpoints
- **Authentication** - JWT and session-based auth
- **Rate Limiting** - Request throttling per user/IP
- **Validation** - Zod schema validation
- **TypeScript** - Full type safety
- **Error Handling** - Consistent error responses

## Development

```bash
# Start development server
pnpm dev:api

# Build for production
pnpm -F @frok/api build

# Type check
pnpm -F @frok/api typecheck

# Run tests
pnpm -F @frok/api test
```

## API Routes

### Agent Routes (`/api/agent/*`)
- `POST /api/agent/smart-stream` - Stream agent responses
- `POST /api/agent/run` - Run agent synchronously
- `GET /api/agent/config` - Get agent configuration

### Chat Routes (`/api/chat/*`)
- `GET /api/chat/threads` - List user threads
- `POST /api/chat/threads` - Create new thread
- `GET /api/chat/messages` - Get messages
- `POST /api/chat/messages` - Send message

### Memory Routes (`/api/memory/*`)
- `GET /api/memory/list` - List memories
- `POST /api/memory/add` - Add memory
- `POST /api/memory/search` - Search memories

## Configuration

Environment variables required (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# API
PORT=3001
NODE_ENV=development
```

## Middleware

- **withAuth** - Authentication middleware
- **withRateLimit** - Rate limiting (5 req/min for AI, 60 for standard)
- **withValidation** - Zod schema validation
- **withErrorHandler** - Consistent error responses

## See Also

- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [docs/architecture/AGENT_ROUTES_SECURITY_AUDIT.md](../../docs/architecture/AGENT_ROUTES_SECURITY_AUDIT.md)
