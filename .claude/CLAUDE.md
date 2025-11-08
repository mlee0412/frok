# FROK Project - Claude Code Configuration

This file provides guidance to Claude Code when working with the FROK project.

## 🚀 SuperClaude Integration

This project uses **SuperClaude Framework** for enhanced development capabilities.

### Available Skills

- **confidence-check**: Validates implementation confidence before proceeding (≥90% threshold)

### Core Development Principles

#### 1. Evidence-Based Development
**Never guess** - verify with official docs before implementation. Use MCP servers for research.

#### 2. Confidence-First Implementation
Check confidence BEFORE starting:
- ≥90%: Proceed with implementation
- 70-89%: Present alternatives and ask for clarification
- <70%: Ask questions to gather more information

#### 3. Parallel-First Execution
Use **Wave → Checkpoint → Wave** pattern for faster execution:
- Read multiple files in parallel
- Analyze results
- Edit multiple files in parallel

#### 4. Token Efficiency
- Simple tasks (typo fix): ~200 tokens
- Medium tasks (bug fix): ~1,000 tokens
- Complex tasks (feature): ~2,500 tokens
- Always run confidence checks to prevent wasted tokens

## 📂 Project Structure

```
FROK/
├── .claude/              # Claude Code configuration
│   ├── CLAUDE.md        # This file
│   ├── settings.json    # Project settings
│   └── skills/          # SuperClaude skills
└── [your project files]
```

## 🔧 MCP Server Integration

This project can leverage MCP servers for enhanced capabilities:

### High Priority MCP Servers
- **Context7**: Official documentation lookup (prevent hallucination)
- **Sequential-thinking**: Token-efficient reasoning (30-50% reduction)
- **Tavily**: Web search for research
- **Supabase**: Database operations
- **Sentry**: Error tracking and monitoring

### Optional MCP Servers
- **GitHub**: Repository operations
- **Vercel**: Deployment operations
- **Home Assistant**: Home automation (if applicable)

## 💡 Development Workflow

### Before Implementation
1. Run confidence check on the task
2. If confidence ≥90%, proceed
3. If confidence <90%, gather more information

### During Implementation
1. Use parallel execution when possible
2. Verify with official documentation
3. Test incrementally

### After Implementation
1. Run tests
2. Verify functionality
3. Update documentation if needed

## 🎯 Best Practices

- **Always verify** before implementing
- **Use MCP servers** for documentation and research
- **Run confidence checks** for complex tasks
- **Execute in parallel** when operations are independent
- **Keep token usage efficient**

---

*Powered by SuperClaude Framework*
