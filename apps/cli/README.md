# @frok/cli

Command-line interface tools for the FROK platform.

## Features

- **Interactive CLI** - User-friendly command interface
- **Code Generation** - Scaffold components, routes, and utilities
- **Database Management** - Migration and seed commands
- **Development Tools** - Helper commands for development

## Installation

```bash
# Global installation
pnpm install -g @frok/cli

# Or run directly with pnpm
pnpm -F @frok/cli start <command>
```

## Available Commands

### Development
```bash
# Start development environment
frok dev

# Reset development environment
frok dev:reset
```

### Code Generation
```bash
# Generate new component
frok generate:component <name>

# Generate new API route
frok generate:route <path>

# Generate database migration
frok generate:migration <name>
```

### Database
```bash
# Run migrations
frok db:migrate

# Seed database
frok db:seed

# Reset database
frok db:reset
```

## Development

```bash
# Build CLI
pnpm -F @frok/cli build

# Run in dev mode
pnpm -F @frok/cli dev

# Type check
pnpm -F @frok/cli typecheck
```

## Configuration

CLI configuration is stored in `.frok/config.json` in your project root.

## See Also

- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Inquirer.js Documentation](https://github.com/SBoudrias/Inquirer.js)
