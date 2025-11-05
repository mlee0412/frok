# @frok/utils

Shared utility functions for the FROK monorepo.

## Exports

### String Utilities
```typescript
import { truncate, capitalize, kebabCase, camelCase } from '@frok/utils';

truncate('Long text...', 10); // "Long te..."
capitalize('hello'); // "Hello"
kebabCase('helloWorld'); // "hello-world"
camelCase('hello-world'); // "helloWorld"
```

### Date Utilities
```typescript
import { formatRelativeTime, formatShortDate, formatDateTime } from '@frok/utils';

formatRelativeTime(date); // "2 hours ago"
formatShortDate(date); // "Jan 15, 2025"
formatDateTime(date); // "Jan 15, 2025 at 2:30 PM"
```

### Class Name Utilities
```typescript
import { cn } from '@frok/utils';

// Conditional className joining (like clsx)
cn('base-class', condition && 'conditional-class', 'another-class');
```

### Validation Utilities
```typescript
import { isEmail, isURL, isUUID } from '@frok/utils';

isEmail('test@example.com'); // true
isURL('https://example.com'); // true
isUUID('123e4567-e89b-12d3-a456-426614174000'); // true
```

## Development

```bash
# Build package
pnpm -F @frok/utils build

# Run tests
pnpm -F @frok/utils test

# Type check
pnpm -F @frok/utils typecheck
```

## Utility Categories

- **String Utils** - Text manipulation and formatting
- **Date Utils** - Date/time formatting and parsing
- **Class Name Utils** - CSS class name helpers
- **Validation Utils** - Input validation functions
- **Array Utils** - Array manipulation helpers
- **Object Utils** - Object transformation utilities

## Best Practices

1. **Pure functions** - No side effects
2. **Type safety** - Full TypeScript support
3. **Performance** - Optimized for common use cases
4. **Documentation** - JSDoc comments for all exports
5. **Testing** - Unit tests for all utilities

## See Also

- [lodash](https://lodash.com) - Inspiration for utility patterns
- [date-fns](https://date-fns.org) - Date utility patterns
