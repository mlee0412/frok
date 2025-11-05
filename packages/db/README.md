# @frok/db

Database utilities and migrations for the FROK platform.

## Features

- Database schema definitions
- Migration scripts
- Query builders and helpers
- Type-safe database access

## Usage

```typescript
import { db } from '@frok/db';

// Query with type safety
const users = await db.select().from('users').where({ active: true });
```

## Migrations

Migrations are located in `migrations/` directory and managed via:

```bash
# Create new migration
pnpm -F @frok/db migration:create <name>

# Run migrations
pnpm -F @frok/db migration:run

# Rollback migration
pnpm -F @frok/db migration:rollback
```

## Development

```bash
# Build package
pnpm -F @frok/db build

# Type check
pnpm -F @frok/db typecheck
```

## Database Schema

The database uses Supabase (PostgreSQL) with the following main tables:
- `users` - User accounts
- `chat_threads` - Chat conversation threads
- `chat_messages` - Individual messages
- `memories` - Agent and user memories
- `agent_memories` - Agent-specific knowledge base

## See Also

- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [infra/supabase/migrations](../../infra/supabase/migrations) - Migration files
