# CLAUDE.md Optimization Plan

**Date**: 2025-11-05
**Current Size**: 2,187 lines (93.2KB)
**Target Size**: 100-200 lines (~10KB)
**Goal**: Improve Claude Code performance and maintainability

## Research Findings

### Best Practices from Claude Code Documentation (2025)
1. **File Size**: 100-200 lines maximum for root CLAUDE.md
2. **Organization**: Use multiple CLAUDE.md files - root for general, subdirectories for specific contexts
3. **Content Focus**:
   - Project-specific patterns and architectural decisions
   - Repository etiquette and development workflow
   - Coding standards and naming conventions
   - Common pitfalls specific to the codebase
4. **What to Avoid**:
   - Detailed session logs (move to separate documentation)
   - Redundant information available elsewhere
   - Information that changes frequently

### Performance Impact
- Every line in CLAUDE.md is reprocessed with each message
- Large context files consume tokens and slow performance
- Projects use RAG to efficiently load only relevant content

## Current Issues

### File Analysis
```
Total Lines: 2,187
├── Header & Project Overview: 23 lines (1%)
├── Recent Major Changes (Sessions #2-12): 1,566 lines (72%) ⚠️ PROBLEM
└── Essential Reference Material: 598 lines (27%)
    ├── Project Structure
    ├── Key Files & Purpose
    ├── Dashboard Pages
    ├── Authentication
    ├── Utilities & Hooks
    ├── UI Components
    ├── Performance Optimizations
    ├── Common Issues & Solutions
    ├── Development Workflow
    ├── Environment Variables
    ├── Coding Standards & Best Practices
    ├── Known Limitations
    ├── Next Steps & Recommendations
    └── Troubleshooting
```

**Problems Identified:**
1. ❌ 72% of file is detailed session logs (should be archived)
2. ❌ 10x larger than recommended size (2187 vs 200 lines)
3. ❌ No directory-specific CLAUDE.md files for subsystems
4. ❌ Reference material could be more concise with links
5. ❌ Missing guidance on testing, logging, and documentation updates

## Optimization Strategy

### Phase 1: Extract Session History ✅
**Action**: Move all detailed session logs to `docs/development/SESSION_HISTORY.md`
- Keep only brief "What's New" section in CLAUDE.md with:
  - Last 2-3 major milestones (3-5 lines each)
  - Link to full SESSION_HISTORY.md
- Expected savings: ~1,500 lines

### Phase 2: Restructure Root CLAUDE.md ✅
**New Structure** (Target: 150-200 lines):

```markdown
# FROK Project - Claude Code Instructions

## Project Overview (15 lines)
- Tech stack essentials
- Architecture type (monorepo)
- Links to detailed docs

## Directory Structure (20 lines)
- Concise tree of main directories
- Purpose of each top-level directory
- Links to directory-specific CLAUDE.md files

## Development Workflow (25 lines)
- How to start dev server
- How to run tests (ALWAYS before committing)
- How to build and verify
- Git workflow (branch naming, commits)
- Links to detailed guides

## Coding Standards (40 lines)
- State management patterns
- Component patterns
- API route patterns
- Type safety rules
- Styling conventions
- Testing requirements

## Documentation Requirements (15 lines)
- When to update CLAUDE.md
- When to update session logs
- When to update STATUS.md
- How to structure commit messages

## Essential Commands (15 lines)
- Dev: pnpm dev
- Test: pnpm test, pnpm test:e2e
- Build: pnpm build
- Type check: pnpm typecheck

## Quick Reference Links (10 lines)
- [Full Session History](docs/development/SESSION_HISTORY.md)
- [Complete Documentation Index](DOCS_INDEX.md)
- [Current Status & TODOs](STATUS.md)
- [Architecture Details](docs/ARCHITECTURE.md)
- [Agent System](docs/AGENTS.md)
- [Testing Guide](apps/web/TESTING.md)

## Common Pitfalls (15 lines)
- Top 5-7 issues with quick solutions
- Links to troubleshooting docs
```

### Phase 3: Create Directory-Specific CLAUDE.md Files ✅
**Add context files for major subsystems:**

1. **`apps/web/CLAUDE.md`** (~100 lines)
   - Next.js 15 specific patterns
   - Component organization
   - API route conventions
   - State management with Zustand + TanStack Query
   - Testing with Vitest and Playwright

2. **`services/agents/CLAUDE.md`** (~100 lines)
   - Agent orchestration patterns
   - Tool integration guidelines
   - Response schemas
   - Guardrails system
   - Testing agent interactions

3. **`packages/ui/CLAUDE.md`** (~80 lines)
   - Component development patterns
   - Tailwind v4 conventions
   - Accessibility requirements
   - Storybook stories

### Phase 4: Update Documentation Index ✅
**Update `DOCS_INDEX.md`**:
- Add reference to SESSION_HISTORY.md
- Add references to new directory-specific CLAUDE.md files
- Clarify when to use which documentation file

### Phase 5: Test & Validate ✅
**Testing Strategy**:
1. Start fresh Claude session
2. Try common tasks:
   - Create a new component
   - Add a new API route
   - Fix a bug
   - Add tests
3. Verify Claude has sufficient context
4. Measure performance improvement

## Implementation Checklist

- [ ] Create `docs/development/SESSION_HISTORY.md` with all session logs
- [ ] Restructure root `CLAUDE.md` to 150-200 lines
- [ ] Create `apps/web/CLAUDE.md`
- [ ] Create `services/agents/CLAUDE.md`
- [ ] Create `packages/ui/CLAUDE.md`
- [ ] Update `DOCS_INDEX.md` with new references
- [ ] Update `STATUS.md` with optimization details
- [ ] Test with sample coding tasks
- [ ] Commit changes with detailed message
- [ ] Monitor performance in next few sessions

## Expected Benefits

1. **Performance**: ~90% reduction in context size (2187 → 200 lines)
2. **Maintainability**: Easier to update relevant sections
3. **Clarity**: Focused, domain-specific context where needed
4. **Scalability**: Pattern for future subsystems
5. **Token Efficiency**: Only load context relevant to current work

## Success Metrics

- [ ] Root CLAUDE.md under 200 lines
- [ ] All session logs preserved in SESSION_HISTORY.md
- [ ] 3 directory-specific CLAUDE.md files created
- [ ] No information loss (everything accessible via links)
- [ ] Faster Claude response times
- [ ] Easier for developers to update
