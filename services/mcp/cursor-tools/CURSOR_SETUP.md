# Quick Setup Guide for Cursor MCP Tools

## Prerequisites

- Node.js 18+ installed
- pnpm installed
- Cursor IDE

## Setup Steps

### 1. Build the MCP Server

From the project root:

```bash
cd services/mcp/cursor-tools
pnpm install
pnpm build
```

### 2. Add to Cursor

1. Open Cursor
2. Go to **Settings** (Ctrl+,)
3. Navigate to **Features** > **MCP**
4. Click **+ Add New MCP Server**
5. Fill in:
   - **Name**: `FROK Tools`
   - **Type**: `stdio`
   - **Command**: 
     ```
     node C:\Dev\FROK\services\mcp\cursor-tools\dist\index.js
     ```
     *(Replace `C:\Dev\FROK` with your actual project path)*

### 3. Verify

1. Click the **Refresh** button in MCP settings
2. You should see 11 tools listed:
   - `read_file`
   - `write_file`
   - `list_directory`
   - `find_files`
   - `grep`
   - `run_command`
   - `git_status`
   - `git_diff`
   - `run_tests`
   - `run_typecheck`
   - `run_build`

## Usage

Once configured, the Cursor agent will automatically use these tools when relevant. You can also explicitly request tool usage:

- "Read the file `apps/web/src/app/page.tsx`"
- "What's the git status?"
- "Run the tests"
- "Search for all uses of `useState` in the codebase"

## Troubleshooting

**Tools not appearing?**
- Ensure the server is built: `pnpm build`
- Check the command path is correct
- Restart Cursor

**Commands failing?**
- Ensure you're in the project root
- Check that pnpm dependencies are installed: `pnpm install`

**Path issues on Windows?**
- Use forward slashes or double backslashes
- The server handles Windows paths automatically

