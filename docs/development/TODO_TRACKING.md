# TODO Tracking Document

**Generated**: 2025-11-15
**Total TODOs**: 19
**Status**: Active tracking for technical debt and feature completion

---

## 📊 Summary by Category

| Category | Count | Priority |
|----------|-------|----------|
| Agent System & Tools | 9 | 🔴 High |
| Chat & Messaging | 5 | 🟡 Medium |
| Analytics & Monitoring | 3 | 🟢 Low |
| Authentication & Security | 1 | 🟡 Medium |
| Error Handling | 1 | 🟢 Low |

---

## 🔴 High Priority (6 items remaining, 3 completed)

### Agent System & Tools

#### 1. **User-Specific Memory Tools Refactoring** ✅ COMPLETED
- **File**: `apps/web/src/lib/agent/tools-unified.ts:7`
- **Issue**: File needs refactoring to support user-specific memory tools
- **Impact**: Multi-user isolation, data privacy
- **Resolution**: Already implemented via `tools-user-specific.ts` and `orchestrator.ts`
- **Completed**: 2025-11-15
- **Notes**: All active API routes now use `createUserMemoryTools(userId)` for proper data isolation

#### 2. **SDK Options - Structured Outputs** (5 instances)
- **Files**:
  - `apps/web/src/lib/agent/orchestrator-enhanced.ts:209`
  - `apps/web/src/lib/agent/orchestrator-enhanced.ts:236`
  - `apps/web/src/lib/agent/orchestrator-enhanced.ts:264`
  - `apps/web/src/lib/agent/orchestrator-enhanced.ts:292`
  - `apps/web/src/lib/agent/orchestrator-enhanced.ts:324`
- **Issue**: Enable when SDK supports structured output options
- **Impact**: Better response validation, type safety
- **Estimated Effort**: Low (monitoring SDK updates)
- **Dependencies**: OpenAI Agent SDK updates
- **Action**: Monitor `@openai/agents` package for structured output support

#### 3. **Tool Call Guardrails**
- **File**: `apps/web/src/lib/agent/guardrails.ts:279`
- **Issue**: Implement when tool calls are available via OutputGuardrail
- **Impact**: Safety, validation of tool usage
- **Estimated Effort**: Medium (2-3 hours)
- **Dependencies**: SDK feature availability

#### 4. **Cost Tracking**
- **File**: `apps/web/src/lib/agent/guardrails.ts:352`
- **Issue**: Implement cost tracking when usage data is available
- **Impact**: Budget management, usage analytics
- **Estimated Effort**: Medium (3-4 hours)
- **Dependencies**: OpenAI API usage data availability

---

## 🟡 Medium Priority (3 items remaining, 3 completed)

### Chat & Messaging

#### 5. **OpenAI API Integration** ✅ COMPLETED
- **Files**:
  - `apps/web/src/app/api/chat/messages/send/route.ts:197`
  - `apps/web/src/app/api/chat/messages/send/route.ts:261`
  - `apps/web/src/app/api/chat/messages/send/route.ts:292`
- **Issue**: Replace with actual OpenAI API call using openaiModelId
- **Resolution**: Implemented both streaming and non-streaming OpenAI API integration
- **Completed**: 2025-11-15
- **Changes**:
  - Added `getOpenAIClient()` import from `@/lib/openai`
  - Replaced `getAIResponseContent()` with real OpenAI API calls
  - Updated SSE streaming to use OpenAI's streaming API
  - Added proper error handling and fallback responses

#### 6. **Message Edit Functionality** (2 instances)
- **Files**:
  - `apps/web/src/components/chat/MessageList.tsx:49`
  - `apps/web/src/components/chat/MessageList.tsx:114`
- **Issue**: Implement message editing feature
- **Impact**: User experience improvement
- **Estimated Effort**: Medium (2-3 hours)
- **Dependencies**: UI design, state management

#### 7. **Message Regeneration**
- **File**: `apps/web/src/components/chat/MessageList.tsx:105`
- **Issue**: Implement regeneration logic
- **Impact**: User experience, retry mechanism
- **Estimated Effort**: Low (1-2 hours)
- **Dependencies**: None

#### 8. **Toast Notification**
- **File**: `apps/web/src/components/chat/MessageList.tsx:101`
- **Issue**: Add toast notification for user feedback
- **Impact**: User experience
- **Estimated Effort**: Low (<1 hour)
- **Dependencies**: Toast component from `@frok/ui`

### Authentication & Security

#### 9. **Role-Based Permissions** ✅ COMPLETED
- **File**: `apps/web/src/lib/api/withAuth.ts:147`
- **Issue**: Implement role-based permissions schema
- **Resolution**: Complete RBAC system implemented
- **Completed**: 2025-11-15
- **Changes**:
  - Created database migration `0012_user_roles_permissions.sql`
  - Implemented 3 roles (admin, user, guest) with 20+ permissions
  - Added `hasPermission()`, `hasRole()`, `getUserRoles()`, `getUserPermissions()`
  - Added `requirePermission()` and `requireRole()` middleware
  - Created comprehensive documentation in `docs/RBAC.md`
  - Row-Level Security (RLS) policies enabled
  - Default 'user' role assigned to all existing users

---

## 🟢 Low Priority (4 items)

### Analytics & Monitoring

#### 10. **Performance Metrics Storage**
- **File**: `apps/web/src/app/api/analytics/performance/route.ts:37`
- **Issue**: Store in database or send to analytics service
- **Impact**: Performance monitoring, insights
- **Estimated Effort**: Medium (2-3 hours)
- **Dependencies**: Analytics service setup (Vercel Analytics, PostHog, etc.)

#### 11. **Web Vitals Analytics**
- **File**: `apps/web/src/app/api/analytics/vitals/route.ts:20`
- **Issue**: Send to analytics service
- **Impact**: Performance monitoring
- **Estimated Effort**: Low (1-2 hours)
- **Dependencies**: Analytics service integration

### Error Handling

#### 12. **Error Tracking Service**
- **File**: `apps/web/src/app/api/errors/log/route.ts:20`
- **Issue**: Send to error tracking service
- **Impact**: Error monitoring, debugging
- **Estimated Effort**: Medium (2-3 hours)
- **Dependencies**: Sentry or similar service setup
- **Notes**: Consider using Sentry MCP server if available

---

## 🗺️ Recommended Roadmap

### Phase 1: Core Functionality (Week 1-2)
1. ✅ **User-Specific Memory Tools** (Priority #1)
2. ✅ **OpenAI API Integration** (Priority #5)
3. ✅ **Role-Based Permissions** (Priority #9)

### Phase 2: User Experience (Week 3)
4. ✅ **Message Edit & Regeneration** (Priority #6, #7)
5. ✅ **Toast Notifications** (Priority #8)

### Phase 3: Monitoring & Observability (Week 4)
6. ✅ **Error Tracking Service** (Priority #12)
7. ✅ **Analytics Integration** (Priority #10, #11)

### Phase 4: Advanced Features (Ongoing)
8. ✅ **Cost Tracking** (Priority #4)
9. ✅ **Tool Call Guardrails** (Priority #3)
10. ⏳ **SDK Updates** (Priority #2) - Monitor and implement when available

---

## 📝 Notes & Considerations

### SDK Monitoring
- **Package**: `@openai/agents`
- **Features to Watch**: Structured outputs, tool call validation
- **Action**: Set up GitHub watch or RSS feed for package updates

### Integration Opportunities
- **Sentry**: Error tracking + performance monitoring
- **Vercel Analytics**: Web vitals + custom events
- **PostHog**: Product analytics + feature flags

### Technical Debt
- Several TODOs are blockers for production readiness:
  - User-specific memory isolation (security)
  - OpenAI API integration (core functionality)
  - Role-based permissions (multi-user support)

---

## 🔄 Update History

| Date | Changes | Updated By |
|------|---------|------------|
| 2025-11-15 | Initial tracking document created | Claude Code |

---

**Next Review**: 2025-11-22 (1 week)
**Owner**: Development Team
**Related Docs**: [Session History](SESSION_HISTORY.md), [Architecture](../ARCHITECTURE.md)
