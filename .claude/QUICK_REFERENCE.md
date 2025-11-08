# SuperClaude Quick Reference

## 🎯 Core Principles

1. **Evidence-Based**: Verify with docs, never guess
2. **Confidence-First**: Check ≥90% before implementing
3. **Parallel Execution**: Wave → Checkpoint → Wave
4. **Token Efficient**: Simple tasks use simple tools

## 🛠️ Available Skills

### @confidence-check
Pre-implementation confidence validation
- ≥90%: ✅ Proceed
- 70-89%: ⚠️ Present alternatives
- <70%: ❌ Request clarification

## 📋 Development Workflow

### Before Implementation
```
1. Clarify scope
2. @confidence-check
3. Research if needed (Context7/Tavily)
4. Verify with official docs
```

### During Implementation
```
1. Plan in waves (group operations)
2. Execute in parallel
3. Track progress (TodoWrite)
4. Test incrementally
```

### After Implementation
```
1. Self-review
2. Run tests
3. Document if needed
```

## 🔧 MCP Servers (Auto-Activated)

| Server | Purpose | When Used |
|--------|---------|-----------|
| **Context7** | Official docs | New libraries, best practices |
| **Sequential** | Complex reasoning | Architecture, design decisions |
| **Tavily** | Web search | Research, latest info |
| **Supabase** | Database ops | DB queries, migrations |
| **Sentry** | Error tracking | Monitoring, debugging |
| **GitHub** | Repo ops | PRs, code review |

## 💡 Quick Tips

- Let Claude choose tools automatically
- Trust confidence scores
- Group independent operations
- Verify with official docs
- Keep simple tasks simple

## 🚀 Performance

- 2-3x faster (parallel)
- 30-50% fewer tokens (sequential)
- 94% token reduction (repo index)
- Higher quality (evidence-based)
- Fewer errors (confidence checks)

## 📍 Locations

- Skills: `.claude/skills/`
- Docs: `CLAUDE.md`, `SUPERCLAUDE_SETUP.md`
- Config: `~/.claude.json`
