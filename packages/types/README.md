# @frok/types

Shared TypeScript type definitions for the FROK monorepo.

## Exports

- **Database Types** - Row types for database tables
- **API Types** - Request/response types for API routes
- **Agent Types** - Types for agent system
- **UI Types** - Component prop types

## Usage

```typescript
import type { ChatThread, ChatMessage } from '@frok/types';

function processThread(thread: ChatThread) {
  // Type-safe thread processing
}
```

## Type Categories

### Database Types
```typescript
import type {
  ChatThreadRow,
  ChatMessageRow,
  UserRow
} from '@frok/types/database';
```

### API Types
```typescript
import type {
  CreateThreadRequest,
  SendMessageRequest
} from '@frok/types/api';
```

### Agent Types
```typescript
import type {
  AgentConfig,
  ToolDefinition,
  AgentResponse
} from '@frok/types/agent';
```

## Development

```bash
# Build type definitions
pnpm -F @frok/types build

# Type check
pnpm -F @frok/types typecheck
```

## Best Practices

1. **Never use `any`** - Use `unknown` for truly unknown types
2. **Export all types** - Make types available for other packages
3. **Document complex types** - Add JSDoc comments for clarity
4. **Use discriminated unions** - For type safety with variants

## See Also

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [docs/architecture/NORMALIZATION_PLAN.md](../../docs/architecture/NORMALIZATION_PLAN.md) - Type safety guidelines
