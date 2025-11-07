#!/usr/bin/env node

/**
 * MCP Server for Cursor Agent
 * Provides basic tools for file operations, git, terminal, and project management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root (assuming this is in services/mcp/cursor-tools)
const PROJECT_ROOT = resolve(__dirname, '../../../..');

/**
 * Execute shell command safely
 */
async function runCommand(
  command: string,
  cwd: string = PROJECT_ROOT,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command, {
      cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    });
    return result;
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || execError.message || 'Command failed',
    };
  }
}

/**
 * Create and configure MCP server
 */
const server = new Server(
  {
    name: 'frok-cursor-tools',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// ============================================================================
// Tool: read_file
// ============================================================================
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'read_file',
      description: 'Read the contents of a file. Paths are relative to project root.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Relative path to the file from project root (e.g., "apps/web/src/app/page.tsx")',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description:
        'Write content to a file. Creates the file if it does not exist. Paths are relative to project root.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the file from project root',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'list_directory',
      description:
        'List files and directories in a given path. Paths are relative to project root.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the directory (default: project root)',
            default: '.',
          },
        },
      },
    },
    {
      name: 'run_command',
      description: 'Execute a shell command in the project root. Use with caution.',
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute',
          },
          cwd: {
            type: 'string',
            description: 'Working directory (relative to project root, optional)',
          },
        },
        required: ['command'],
      },
    },
    {
      name: 'git_status',
      description: 'Get git status of the repository',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'git_diff',
      description: 'Get git diff for staged or unstaged changes',
      inputSchema: {
        type: 'object',
        properties: {
          staged: {
            type: 'boolean',
            description: 'Show staged changes (default: false)',
            default: false,
          },
        },
      },
    },
    {
      name: 'run_tests',
      description: 'Run project tests using pnpm test',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Optional filter for specific package (e.g., "@frok/web")',
          },
        },
      },
    },
    {
      name: 'run_typecheck',
      description: 'Run TypeScript type checking',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Optional filter for specific package',
          },
        },
      },
    },
    {
      name: 'run_build',
      description: 'Build the project or a specific package',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Optional filter for specific package',
          },
        },
      },
    },
    {
      name: 'find_files',
      description: 'Find files matching a pattern using glob',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Glob pattern (e.g., "**/*.tsx", "apps/web/**/*.ts")',
          },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'grep',
      description: 'Search for text in files using pattern matching',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Text or regex pattern to search for',
          },
          path: {
            type: 'string',
            description: 'Path to search in (relative to project root, default: ".")',
            default: '.',
          },
          caseSensitive: {
            type: 'boolean',
            description: 'Case sensitive search (default: false)',
            default: false,
          },
        },
        required: ['pattern'],
      },
    },
  ],
}));

// ============================================================================
// Tool Handlers
// ============================================================================
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: No arguments provided',
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case 'read_file': {
        const filePath = resolve(PROJECT_ROOT, args.path as string);
        // Security: Ensure path is within project root
        if (!filePath.startsWith(PROJECT_ROOT)) {
          throw new Error('Path must be within project root');
        }
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      }

      case 'write_file': {
        const filePath = resolve(PROJECT_ROOT, args.path as string);
        // Security: Ensure path is within project root
        if (!filePath.startsWith(PROJECT_ROOT)) {
          throw new Error('Path must be within project root');
        }
        // Ensure directory exists
        await fs.mkdir(dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, args.content as string, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: `File written successfully: ${args.path}`,
            },
          ],
        };
      }

      case 'list_directory': {
        const dirPath = args.path ? resolve(PROJECT_ROOT, args.path as string) : PROJECT_ROOT;
        // Security: Ensure path is within project root
        if (!dirPath.startsWith(PROJECT_ROOT)) {
          throw new Error('Path must be within project root');
        }
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const items = entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: relative(PROJECT_ROOT, join(dirPath, entry.name)),
        }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(items, null, 2),
            },
          ],
        };
      }

      case 'run_command': {
        const command = args.command as string;
        const cwd = args.cwd ? resolve(PROJECT_ROOT, args.cwd as string) : PROJECT_ROOT;
        // Security: Ensure cwd is within project root
        if (!cwd.startsWith(PROJECT_ROOT)) {
          throw new Error('Working directory must be within project root');
        }
        const result = await runCommand(command, cwd);
        return {
          content: [
            {
              type: 'text',
              text: `Command: ${command}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`,
            },
          ],
        };
      }

      case 'git_status': {
        const result = await runCommand('git status');
        return {
          content: [
            {
              type: 'text',
              text: result.stdout || result.stderr,
            },
          ],
        };
      }

      case 'git_diff': {
        const staged = args.staged as boolean | undefined;
        const command = staged ? 'git diff --staged' : 'git diff';
        const result = await runCommand(command);
        return {
          content: [
            {
              type: 'text',
              text: result.stdout || result.stderr || 'No changes',
            },
          ],
        };
      }

      case 'run_tests': {
        const filter = args.filter ? `--filter=${args.filter}` : '';
        const command = filter ? `pnpm test ${filter}` : 'pnpm test';
        const result = await runCommand(command);
        return {
          content: [
            {
              type: 'text',
              text: result.stdout || result.stderr,
            },
          ],
        };
      }

      case 'run_typecheck': {
        const filter = args.filter ? `--filter=${args.filter}` : '';
        const command = filter ? `pnpm typecheck ${filter}` : 'pnpm typecheck';
        const result = await runCommand(command);
        return {
          content: [
            {
              type: 'text',
              text: result.stdout || result.stderr,
            },
          ],
        };
      }

      case 'run_build': {
        const filter = args.filter ? `--filter=${args.filter}` : '';
        const command = filter ? `pnpm build --filter=${args.filter}` : 'pnpm build';
        const result = await runCommand(command);
        return {
          content: [
            {
              type: 'text',
              text: result.stdout || result.stderr,
            },
          ],
        };
      }

      case 'find_files': {
        const pattern = args.pattern as string;
        // Use PowerShell on Windows, find on Unix
        const isWindows = process.platform === 'win32';
        let command: string;
        if (isWindows) {
          // PowerShell Get-ChildItem with -Recurse
          command = `Get-ChildItem -Path "${PROJECT_ROOT}" -Filter "${pattern.replace(
            /\*\*/g,
            '*',
          )}" -Recurse -File | Select-Object -ExpandProperty FullName`;
        } else {
          // Use find command
          command = `find "${PROJECT_ROOT}" -type f -name "${pattern}" 2>/dev/null`;
        }
        const result = await runCommand(command);
        const files = result.stdout
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => relative(PROJECT_ROOT, line.trim()))
          .filter((line) => line);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      }

      case 'grep': {
        const pattern = args.pattern as string;
        const searchPath = args.path ? (args.path as string) : '.';
        const caseSensitive = args.caseSensitive as boolean | undefined;
        const isWindows = process.platform === 'win32';
        let command: string;
        if (isWindows) {
          // PowerShell Select-String
          const caseFlag = caseSensitive ? '' : '-CaseSensitive:$false';
          command = `Get-ChildItem -Path "${resolve(
            PROJECT_ROOT,
            searchPath,
          )}" -Recurse -File | Select-String -Pattern "${pattern}" ${caseFlag} | ForEach-Object { "$($_.Path):$($_.LineNumber):$($_.Line)" }`;
        } else {
          // Use grep
          const caseFlag = caseSensitive ? '' : '-i';
          command = `grep -r ${caseFlag} "${pattern}" "${resolve(
            PROJECT_ROOT,
            searchPath,
          )}" 2>/dev/null || true`;
        }
        const result = await runCommand(command);
        return {
          content: [
            {
              type: 'text',
              text: result.stdout || result.stderr || 'No matches found',
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Resource Handlers (optional, for exposing project files as resources)
// ============================================================================
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [],
}));

server.setRequestHandler(ReadResourceRequestSchema, async () => {
  throw new Error('Resources not implemented');
});

// ============================================================================
// Start Server
// ============================================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FROK Cursor Tools MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
