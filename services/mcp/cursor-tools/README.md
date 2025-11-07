# FROK Cursor Tools MCP Server

MCP (Model Context Protocol) server providing basic tools for the Cursor agent to interact with the FROK project.

## Available Tools

### File Operations

- **`read_file`** - Read file contents (paths relative to project root)
- **`write_file`** - Write content to a file (creates if doesn't exist)
- **`list_directory`** - List files and directories in a path
- **`find_files`** - Find files matching a glob pattern
- **`grep`** - Search for text patterns in files

### Git Operations

- **`git_status`** - Get git repository status
- **`git_diff`** - Get git diff (staged or unstaged)

### Project Management

- **`run_command`** - Execute shell commands (use with caution)
- **`run_tests`** - Run project tests (`pnpm test`)
- **`run_typecheck`** - Run TypeScript type checking (`pnpm typecheck`)
- **`run_build`** - Build the project (`pnpm build`)

## Setup in Cursor

### 1. Build the MCP Server

```bash
cd services/mcp/cursor-tools
pnpm install
pnpm build
```

### 2. Configure in Cursor

1. Open Cursor Settings
2. Navigate to **Features** > **MCP**
3. Click **+ Add New MCP Server**
4. Configure:
   - **Name**: `FROK Tools`
   - **Type**: `stdio`
   - **Command**:

     ```bash
     node C:\Dev\FROK\services\mcp\cursor-tools\dist\index.js
     ```

     (Adjust path to your project location)

     **Alternative (using pnpm)**:

     ```bash
     pnpm --filter @frok/mcp-cursor-tools start
     ```

     (Requires running from project root)

### 3. Verify Setup

1. Click the refresh button in MCP settings
2. You should see all 11 tools listed
3. The Cursor agent will automatically use these tools when relevant

## Usage Examples

The Cursor agent can now:

- **Read files**: "Read the contents of `apps/web/src/app/page.tsx`"
- **Write files**: "Create a new component at `apps/web/src/components/NewComponent.tsx`"
- **Search code**: "Find all files that use `useState`"
- **Check git status**: "What files have changed?"
- **Run tests**: "Run the test suite"
- **Type check**: "Check for TypeScript errors"

## Security

- All file operations are restricted to the project root directory
- Commands are executed with the project root as working directory
- Paths are validated to prevent directory traversal

## Development

```bash
# Development mode (with watch)
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck
```

## Troubleshooting

### Tools not appearing in Cursor

- Ensure the server is built (`pnpm build`)
- Check the command path in Cursor settings is correct
- Restart Cursor after configuration changes

### Command execution fails

- Ensure you're in the project root when running commands
- Check that required dependencies are installed (`pnpm install`)

### Path issues on Windows

- Use forward slashes or double backslashes in paths
- The server handles Windows paths automatically
