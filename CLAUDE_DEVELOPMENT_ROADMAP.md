# FROK Development Roadmap - Claude's Intuitive Plan

**Date**: 2025-11-02
**Author**: Claude Code Assistant
**Status**: DRAFT - Awaiting User Approval
**Version**: 1.0

---

## Executive Summary

Based on the comprehensive audit and fact-check, this roadmap prioritizes development work to transform FROK from a **production-ready foundation** into a **fully-featured multilingual personal assistant**. The plan emphasizes:

1. **Quick Wins** (1-2 weeks): High impact, low complexity
2. **Core Features** (4-6 weeks): Essential multilingual/multimodal capabilities
3. **Smart Features** (6-8 weeks): Context-aware dashboard and orchestration
4. **Advanced Features** (8-12 weeks): External integrations and advanced UI

**Total Estimated Timeline**: 4-6 months for full implementation

---

## Prioritization Framework

### Complexity vs. Impact Matrix

```
High Impact │  ┌─────────┐ ┌─────────┐
            │  │  i18n   │ │Dashboard│
            │  │  (P1)   │ │  (P3)   │
            │  └─────────┘ └─────────┘
            │  ┌─────────┐ ┌─────────┐
            │  │  File   │ │ External│
            │  │  Gen    │ │  APIs   │
            │  │  (P2)   │ │  (P4)   │
            │  └─────────┘ └─────────┘
            │
Low Impact  │  ┌─────────┐ ┌─────────┐
            │  │   PiP   │ │React    │
            │  │  (P5)   │ │Native   │
            │  │         │ │  (P6)   │
            │  └─────────┘ └─────────┘
            └────────────────────────────
              Low          High
              Complexity   Complexity
```

### Priority Levels

- **P0**: Critical (blocks other work)
- **P1**: High Priority (core requirements)
- **P2**: Medium Priority (important but not blocking)
- **P3**: Low Priority (nice to have)
- **P4**: Future (deferred)

---

## Phase 0: Quick Wins (1-2 Weeks)

**Goal**: Deliver immediate value with minimal effort

### 0.1 Auto Thread Titles (Priority: P1, Complexity: Low)

**Current State**: Endpoint exists but requires manual trigger
**Target State**: Automatic title generation after conversation ends

**Tasks**:
- [ ] Update agent interface to auto-trigger `/api/chat/threads/[threadId]/suggest-title` after 3-5 messages
- [ ] Add loading state to thread sidebar during title generation
- [ ] Cache generated titles to avoid re-generation
- [ ] Add user option to edit/override generated titles

**Files to Modify**:
- `apps/web/src/app/(main)/agent/page.tsx`
- `apps/web/src/components/ChatSidebar.tsx`

**Estimated Effort**: 2-3 days
**Impact**: High (better UX, automatic organization)

---

### 0.2 Context-Aware Suggestions (Priority: P1, Complexity: Low)

**Current State**: Static suggestions in `SuggestedPrompts.tsx`
**Target State**: Dynamic suggestions based on time, user history, recent activity

**Tasks**:
- [ ] Create `/api/agent/suggestions` endpoint
- [ ] Implement suggestion generation logic:
  - Time-based (morning: "Daily brief", evening: "Summarize today")
  - User history (frequent topics, recent conversations)
  - Random rotation of useful prompts
- [ ] Update `SuggestedPrompts` component to fetch from API
- [ ] Cache suggestions for 5-10 minutes

**Files to Create**:
- `apps/web/src/app/api/agent/suggestions/route.ts`

**Files to Modify**:
- `apps/web/src/components/SuggestedPrompts.tsx`

**Estimated Effort**: 3-4 days
**Impact**: High (better discoverability, personalization)

---

### 0.3 Enhanced Performance Monitoring (Priority: P2, Complexity: Low)

**Current State**: Web Vitals tracking exists
**Target State**: Real-time dashboard with cost tracking

**Tasks**:
- [ ] Add cost tracking per agent invocation (using tool metadata)
- [ ] Create `/dashboard/analytics` page
- [ ] Display:
  - Daily/weekly API costs
  - Cache hit rates
  - Most expensive queries
  - Agent usage distribution
- [ ] Add budget alerts

**Files to Create**:
- `apps/web/src/app/dashboard/analytics/page.tsx`

**Files to Modify**:
- `apps/web/src/lib/cache/agentCache.ts` (add cost tracking)

**Estimated Effort**: 3-5 days
**Impact**: Medium (cost visibility, optimization insights)

---

## Phase 1: Internationalization (2-3 Weeks)

**Goal**: Full Korean/English language support

### 1.1 i18n Framework Setup (Priority: P0, Complexity: Medium)

**Tasks**:
- [ ] Install `next-intl` package
- [ ] Create language files:
  - `apps/web/messages/en.json`
  - `apps/web/messages/ko.json`
- [ ] Configure Next.js middleware for locale detection
- [ ] Wrap app with `NextIntlClientProvider`
- [ ] Extract all hardcoded UI strings to language files

**Files to Create**:
- `apps/web/messages/en.json` (~500 strings)
- `apps/web/messages/ko.json` (~500 strings)
- `apps/web/middleware.ts` (locale detection)

**Files to Modify**:
- `apps/web/src/app/layout.tsx`
- All component files with hardcoded text

**Estimated Effort**: 1 week (including translation)
**Impact**: Critical (enables Korean users)

**Technical Approach**:
```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ko'],
  defaultLocale: 'en',
  localeDetection: true,
});

// Usage in components
import { useTranslations } from 'next-intl';

function Component() {
  const t = useTranslations('common');
  return <Button>{t('save')}</Button>;
}
```

---

### 1.2 Dynamic Language Selection (Priority: P1, Complexity: Low)

**Tasks**:
- [ ] Add language switcher to navigation
- [ ] Persist user language preference in Zustand store
- [ ] Update Whisper API to use selected language
- [ ] Update TTS to use selected language
- [ ] Add language auto-detection for voice input

**Files to Create**:
- `apps/web/src/components/LanguageSwitcher.tsx`

**Files to Modify**:
- `apps/web/src/store/userPreferencesStore.ts` (add `language` field)
- `apps/web/src/app/api/transcribe/route.ts` (dynamic language)
- `apps/web/src/hooks/useTextToSpeech.ts` (dynamic voice selection)

**Estimated Effort**: 3-4 days
**Impact**: High (seamless language switching)

---

### 1.3 Translation Tool Integration (Priority: P1, Complexity: Low)

**Tasks**:
- [ ] Create `translation` tool for agent system
- [ ] Add schema: `{ text: string, sourceLang: string, targetLang: string }`
- [ ] Use GPT-5 for translation (already available)
- [ ] Add "Translate to Korean/English" quick action
- [ ] Support inline translation in chat messages

**Files to Create**:
- `apps/web/src/lib/agent/tools/translation.ts`

**Files to Modify**:
- `apps/web/src/lib/agent/tools-unified.ts` (register new tool)
- `apps/web/src/components/MessageContent.tsx` (translation button)

**Estimated Effort**: 2-3 days
**Impact**: High (bilingual conversations)

**Technical Approach**:
```typescript
// translation tool
{
  name: 'translation',
  description: 'Translate text between languages',
  parameters: {
    text: { type: 'string', required: true },
    targetLang: { type: 'string', enum: ['en', 'ko'], required: true },
  },
  execute: async ({ text, targetLang }) => {
    // Use GPT-5 with system prompt: "Translate the following text to {targetLang}"
  },
}
```

---

## Phase 2: File Generation & Export (2-3 Weeks)

**Goal**: Generate professional documents (PDF, PPTX, DOCX)

### 2.1 PDF Generation (Priority: P1, Complexity: Medium)

**Tasks**:
- [ ] Install `jspdf` and `html2canvas` libraries
- [ ] Create `/api/export/pdf` endpoint
- [ ] Support conversation export to PDF
- [ ] Support agent-generated reports (e.g., "Create a PDF summary of this conversation")
- [ ] Add PDF generation tool to agent system

**Files to Create**:
- `apps/web/src/app/api/export/pdf/route.ts`
- `apps/web/src/lib/agent/tools/pdfGenerator.ts`

**Files to Modify**:
- `apps/web/src/lib/exportConversation.ts` (add PDF option)
- `apps/web/src/components/ThreadOptionsMenu.tsx` (export menu)

**Estimated Effort**: 4-5 days
**Impact**: High (professional document generation)

**Technical Approach**:
```typescript
// API route
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function POST(req: NextRequest) {
  const { content, title } = await req.json();

  const doc = new jsPDF();
  doc.setFont('helvetica');
  doc.text(title, 10, 10);
  doc.text(content, 10, 20);

  const pdfBuffer = doc.output('arraybuffer');
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${title}.pdf"`,
    },
  });
}
```

---

### 2.2 PowerPoint Generation (Priority: P2, Complexity: Medium)

**Tasks**:
- [ ] Install `pptxgenjs` library
- [ ] Create `/api/export/pptx` endpoint
- [ ] Support slide generation from structured data
- [ ] Add PPTX generation tool to agent system
- [ ] Enable agent to create presentations on demand

**Files to Create**:
- `apps/web/src/app/api/export/pptx/route.ts`
- `apps/web/src/lib/agent/tools/pptxGenerator.ts`

**Estimated Effort**: 5-6 days
**Impact**: Medium (useful for presentations)

**Use Cases**:
- User: "Create a presentation about my weekly schedule"
- Agent: Fetches calendar events, generates PPTX with slides
- User: Downloads `.pptx` file

---

### 2.3 Word Document Generation (Priority: P2, Complexity: Medium)

**Tasks**:
- [ ] Install `docx` library
- [ ] Create `/api/export/docx` endpoint
- [ ] Support rich text formatting (headers, lists, tables)
- [ ] Add DOCX generation tool to agent system

**Files to Create**:
- `apps/web/src/app/api/export/docx/route.ts`
- `apps/web/src/lib/agent/tools/docxGenerator.ts`

**Estimated Effort**: 4-5 days
**Impact**: Medium (document export)

---

## Phase 3: Smart Dashboard (4-6 Weeks)

**Goal**: Context-aware dashboard with external integrations

### 3.1 Weather Integration (Priority: P1, Complexity: Low)

**Tasks**:
- [ ] Sign up for OpenWeatherMap API (free tier)
- [ ] Create `weather` tool for agent system
- [ ] Create Weather card component
- [ ] Add to `/dashboard` home page
- [ ] Support location-based forecasts

**Files to Create**:
- `apps/web/src/lib/agent/tools/weather.ts`
- `apps/web/src/components/dashboard/WeatherCard.tsx`

**Environment Variables**:
- `OPENWEATHER_API_KEY`

**Estimated Effort**: 3-4 days
**Impact**: High (useful daily info)

---

### 3.2 Google Calendar Integration (Priority: P1, Complexity: High)

**Tasks**:
- [ ] Set up Google Cloud Project
- [ ] Enable Google Calendar API
- [ ] Implement OAuth2 flow for user consent
- [ ] Create `calendar_search` and `calendar_add` tools
- [ ] Create Schedule card component
- [ ] Support natural language event creation

**Files to Create**:
- `apps/web/src/app/api/auth/google/route.ts` (OAuth callback)
- `apps/web/src/lib/connectors/googleCalendar.ts`
- `apps/web/src/lib/agent/tools/calendar.ts`
- `apps/web/src/components/dashboard/ScheduleCard.tsx`

**Environment Variables**:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Estimated Effort**: 1-1.5 weeks
**Impact**: High (schedule management)

**Use Cases**:
- User: "What's on my calendar today?"
- Agent: Calls `calendar_search`, returns events
- User: "Book dinner tomorrow at 7 PM"
- Agent: Calls `calendar_add`, creates event

---

### 3.3 Gmail Integration (Priority: P2, Complexity: High)

**Tasks**:
- [ ] Enable Gmail API in Google Cloud
- [ ] Implement OAuth2 flow (reuse Calendar auth)
- [ ] Create `gmail_search`, `gmail_send`, `gmail_summarize` tools
- [ ] Create Email card component
- [ ] Support email classification (urgent/personal/newsletters)
- [ ] LLM-based email summarization

**Files to Create**:
- `apps/web/src/lib/connectors/gmail.ts`
- `apps/web/src/lib/agent/tools/gmail.ts`
- `apps/web/src/components/dashboard/EmailCard.tsx`

**Estimated Effort**: 1-1.5 weeks
**Impact**: Medium-High (email management)

**Security Considerations**:
- Request minimal scopes (readonly for search, send for sending)
- Store OAuth tokens securely in Supabase
- Implement token refresh flow

---

### 3.4 Notion Integration (Priority: P2, Complexity: Medium)

**Tasks**:
- [ ] Install `@notionhq/client` package
- [ ] Set up Notion integration (API key)
- [ ] Create `notion_search`, `notion_create`, `notion_update` tools
- [ ] Create Notion card component
- [ ] Support page/database queries

**Files to Create**:
- `apps/web/src/lib/connectors/notion.ts`
- `apps/web/src/lib/agent/tools/notion.ts`
- `apps/web/src/components/dashboard/NotionCard.tsx`

**Environment Variables**:
- `NOTION_API_KEY`

**Estimated Effort**: 5-7 days
**Impact**: Medium (note organization)

---

### 3.5 Daily Brief Generation (Priority: P1, Complexity: Medium)

**Tasks**:
- [ ] Create `/api/agent/daily-brief` endpoint
- [ ] Aggregate data from:
  - Google Calendar (today's events)
  - Gmail (unread important emails)
  - Weather (today's forecast)
  - User memories (reminders, tasks)
- [ ] Use LLM to generate natural language brief
- [ ] Schedule automatic generation at 7 AM (user configurable)
- [ ] Send push notification (via service worker)

**Files to Create**:
- `apps/web/src/app/api/agent/daily-brief/route.ts`
- `apps/web/src/components/dashboard/DailyBriefCard.tsx`

**Estimated Effort**: 5-7 days
**Impact**: High (orchestration centerpiece)

**Example Output**:
```
Good morning! Here's your daily brief for Saturday, November 2nd:

🌤️ Weather: Sunny, 72°F. Perfect day for outdoor activities.

📅 Calendar: You have 3 events today:
  • 10:00 AM - Team Meeting (1 hour)
  • 2:00 PM - Grocery Shopping (30 min)
  • 7:00 PM - Dinner Reservation at The Garden

📧 Emails: 5 unread emails, 2 marked urgent:
  • John Smith: Q4 Report Review (urgent)
  • Sarah Lee: Project Update (urgent)

✅ Tasks: 2 pending tasks from yesterday:
  • Finish presentation slides
  • Call insurance company

Have a great day! 🎉
```

---

### 3.6 Smart Media Recommendations (Priority: P3, Complexity: Medium)

**Tasks**:
- [ ] Research public APIs (YouTube, Spotify, Netflix)
- [ ] Create media recommendation tool
- [ ] Support casting to devices (AirPlay, Chromecast)
- [ ] Create Media card component

**Files to Create**:
- `apps/web/src/lib/agent/tools/media.ts`
- `apps/web/src/components/dashboard/MediaCard.tsx`

**Estimated Effort**: 1 week
**Impact**: Medium (entertainment)

**Note**: Some APIs (Netflix) may not be publicly available. Focus on YouTube and Spotify.

---

## Phase 4: Advanced Features (6-8 Weeks)

**Goal**: Experimental UI and integrations

### 4.1 Picture-in-Picture Workflow Viewer (Priority: P3, Complexity: High)

**Tasks**:
- [ ] Create `WorkflowViewer` component
- [ ] Implement Document PiP API integration
- [ ] Add fallback modal for unsupported browsers
- [ ] Real-time workflow updates via SSE or WebSocket
- [ ] Display:
  - Current agent thinking
  - Tool calls and arguments
  - Code execution output
  - Browser automation view (if using computer_use)

**Files to Create**:
- `apps/web/src/components/WorkflowViewer.tsx`
- `apps/web/src/hooks/usePictureInPicture.ts`
- `apps/web/src/app/api/agent/workflow/[threadId]/route.ts`

**Browser Support**:
- ✅ Chrome/Edge (Document PiP supported)
- ⚠️ Firefox (not supported, fallback to modal)
- ⚠️ Safari/iOS (not supported, fallback to modal)

**Estimated Effort**: 1.5-2 weeks
**Impact**: Medium (developer tool, transparency)

**Technical Approach**:
```typescript
// usePictureInPicture.ts
export function usePictureInPicture() {
  const openPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      // Fallback to modal
      return;
    }

    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 600,
      height: 400,
    });

    // Render WorkflowViewer into PiP window
    const root = ReactDOM.createRoot(pipWindow.document.body);
    root.render(<WorkflowViewer />);
  };
}
```

---

### 4.2 Financial Advisor Enhancement (Priority: P2, Complexity: High)

**Current State**: Basic transaction tracking
**Target State**: AI-powered financial advisor

**Tasks**:
- [ ] **Option A**: Plaid integration (bank connection)
  - Sign up for Plaid (requires business verification)
  - Implement OAuth flow
  - Fetch transaction data
  - Store in Supabase with encryption
- [ ] **Option B**: Manual CSV uploads (current approach)
  - Enhance import flow
  - Add recurring transaction detection
  - Category auto-assignment via LLM
- [ ] Create financial advisor agent specialist
- [ ] LLM-based insights:
  - Spending patterns
  - Budget recommendations
  - Bill predictions
  - Savings goals
- [ ] Visualization (charts, graphs)

**Files to Modify**:
- `apps/web/src/app/dashboard/finances/page.tsx`
- `apps/web/src/lib/agent/orchestrator-enhanced.ts` (add Financial Advisor specialist)

**Files to Create**:
- `apps/web/src/lib/connectors/plaid.ts` (if using Plaid)
- `apps/web/src/lib/agent/tools/financialAnalysis.ts`

**Environment Variables** (if using Plaid):
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV` (sandbox/development/production)

**Estimated Effort**: 2-3 weeks (with Plaid), 1 week (manual only)
**Impact**: High (for users who want financial insights)

**Security Note**: Financial data is sensitive. Ensure:
- End-to-end encryption for stored data
- User consent for all operations
- No auto-payments without explicit confirmation
- PCI DSS compliance if handling payment cards

---

### 4.3 Grocery Ordering Integration (Priority: P3, Complexity: High)

**Tasks**:
- [ ] Research Instacart/Uber Eats APIs (may require partnership)
- [ ] Create grocery list management UI
- [ ] Support voice input for list building
- [ ] Price comparison across services
- [ ] **Always require explicit user confirmation** before ordering

**Files to Create**:
- `apps/web/src/lib/connectors/instacart.ts`
- `apps/web/src/lib/agent/tools/groceryOrder.ts`
- `apps/web/src/components/dashboard/GroceryListCard.tsx`

**Estimated Effort**: 2-3 weeks
**Impact**: Medium (convenience)

**Note**: Many grocery APIs are not publicly available. May need to explore alternatives like:
- Simple list management (no ordering)
- Web scraping (against ToS)
- Manual order placement with assistant guidance

---

### 4.4 Web-Based IDE (Priority: P4, Complexity: Very High)

**Tasks**:
- [ ] Install `monaco-editor` (VS Code's editor)
- [ ] Install `xterm.js` for terminal emulation
- [ ] Create file tree viewer
- [ ] Implement secure command execution (sandboxed)
- [ ] Add syntax highlighting and IntelliSense
- [ ] Git integration

**Files to Create**:
- `apps/web/src/app/dashboard/development/ide/page.tsx`
- `apps/web/src/components/ide/Editor.tsx`
- `apps/web/src/components/ide/Terminal.tsx`
- `apps/web/src/components/ide/FileTree.tsx`

**Security Considerations**:
- **CRITICAL**: This is a high-security-risk feature
- Sandbox all command execution
- Limit file system access
- Prevent privilege escalation
- Consider using Docker containers or VM isolation

**Estimated Effort**: 4-6 weeks
**Impact**: Low-Medium (developer convenience, high risk)

**Recommendation**: **Defer to Phase 5 or later**. Focus on core features first. Alternative: Use external services like GitHub Codespaces or Replit.

---

### 4.5 React Native Mobile App (Priority: P4, Complexity: Very High)

**Tasks**:
- [ ] Initialize React Native project with Expo
- [ ] Share code with web via monorepo structure
- [ ] Implement native features:
  - Push notifications (Expo Notifications)
  - Background sync
  - Siri shortcuts (iOS)
  - Widget support
- [ ] App Store submission

**Estimated Effort**: 8-12 weeks
**Impact**: Medium (better mobile UX, but PWA is sufficient for now)

**Recommendation**: **Defer to Phase 6**. PWA provides 80% of the value with 20% of the effort.

---

## Phase 5: Optimization & Polish (2-3 Weeks)

**Goal**: Performance, security, and UX refinements

### 5.1 Performance Optimizations

**Tasks**:
- [ ] Implement response streaming improvements
- [ ] Add loading skeletons for all cards
- [ ] Optimize bundle size (tree shaking, dynamic imports)
- [ ] Add service worker improvements (better caching strategies)
- [ ] Implement progressive image loading (blur-up placeholders)

**Estimated Effort**: 1 week
**Impact**: High (better perceived performance)

---

### 5.2 Security Audit

**Tasks**:
- [ ] Review all API routes for auth/validation
- [ ] Penetration testing (manual or automated)
- [ ] OWASP Top 10 compliance check
- [ ] Secrets management review (no hardcoded keys)
- [ ] Rate limiting tuning (adjust limits based on usage)

**Estimated Effort**: 1 week
**Impact**: Critical (production security)

---

### 5.3 UX Polish

**Tasks**:
- [ ] Add animations (framer-motion)
- [ ] Improve error messages (user-friendly, actionable)
- [ ] Add onboarding flow for new users
- [ ] Implement keyboard shortcuts guide (`Ctrl+K` command palette)
- [ ] Add dark/light theme refinements

**Estimated Effort**: 1 week
**Impact**: Medium (better UX)

---

## Implementation Timeline

### Gantt Chart (24 Weeks / 6 Months)

```
Week │ Phase 0 │ Phase 1 │ Phase 2 │ Phase 3 │ Phase 4 │ Phase 5
─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────
1-2  │ ████    │         │         │         │         │
3-4  │         │ ████    │         │         │         │
5-6  │         │ ████    │         │         │         │
7-8  │         │         │ ████    │         │         │
9-10 │         │         │ ████    │         │         │
11-14│         │         │         │ ████████│         │
15-18│         │         │         │ ████████│         │
19-22│         │         │         │         │ ████████│
23-24│         │         │         │         │         │ ████
```

### Parallel Workstreams

Some tasks can be done in parallel:
- **Phase 1 (i18n)** + **Phase 2 (File Gen)** can overlap if multiple developers
- **Phase 3 (Dashboard)** tasks can be split:
  - Weather + Calendar (one developer)
  - Gmail + Notion (another developer)
  - Daily Brief (after Calendar + Gmail are done)

---

## Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Current | Target (6 months) |
|--------|---------|-------------------|
| User Languages | 1 (English) | 2 (English + Korean) |
| Export Formats | 1 (Markdown) | 4 (MD, PDF, PPTX, DOCX) |
| Dashboard Cards | 4 (basic) | 10+ (smart) |
| External Integrations | 1 (Home Assistant) | 5+ (Calendar, Gmail, Weather, etc.) |
| Daily Active Users | 1-2 | 5-10 |
| Agent Cost per User | Unknown | <$5/month |
| Average Response Time | ~2s | <1s (with caching) |
| Cache Hit Rate | 0% (new feature) | 40-60% |
| Test Coverage | 60% | 75%+ |

### User Satisfaction Metrics

- **Onboarding Time**: <5 minutes to first successful interaction
- **Language Switching**: <2 clicks to change language
- **Export Success Rate**: 95%+ (no failures)
- **Dashboard Load Time**: <2s for all cards
- **Mobile Experience**: Lighthouse score 90+ (PWA)

---

## Risk Assessment

### High-Risk Items

1. **External API Integrations** (Phase 3)
   - **Risk**: APIs may change, require approval, or have costs
   - **Mitigation**:
     - Use official SDKs where available
     - Implement robust error handling
     - Add fallback mechanisms
     - Monitor API usage and costs

2. **Financial Data Handling** (Phase 4.2)
   - **Risk**: Security breach, regulatory non-compliance
   - **Mitigation**:
     - Encrypt all financial data at rest and in transit
     - Implement strict access controls
     - Regular security audits
     - User consent flows
     - Never auto-execute financial transactions

3. **Web-Based IDE** (Phase 4.4)
   - **Risk**: Remote code execution, privilege escalation
   - **Mitigation**:
     - **Recommend deferring this feature**
     - If implemented, use strict sandboxing (Docker, VMs)
     - Limit file system access
     - Audit all commands

4. **Translation Quality** (Phase 1.3)
   - **Risk**: LLM translation errors, cultural insensitivity
   - **Mitigation**:
     - Use professional translators for UI strings
     - Test with native Korean speakers
     - Provide feedback mechanism for translation errors

### Medium-Risk Items

1. **Picture-in-Picture Browser Support** (Phase 4.1)
   - **Risk**: Limited browser support, UX inconsistency
   - **Mitigation**: Always provide fallback (modal/panel)

2. **Performance Degradation** (All Phases)
   - **Risk**: Too many features slow down app
   - **Mitigation**:
     - Code splitting for all new features
     - Lazy loading
     - Performance budgets in CI/CD

---

## Dependencies & Prerequisites

### Required API Keys & Credentials

| Service | Required For | Cost | Setup Time |
|---------|-------------|------|------------|
| OpenWeatherMap | Weather card | Free tier (1k calls/day) | 10 min |
| Google Cloud (OAuth) | Calendar + Gmail | Free tier | 30 min |
| Notion API | Notion integration | Free | 15 min |
| Plaid | Financial advisor (optional) | $0.30 per user/month | 1-2 weeks (requires business verification) |
| Instacart/Uber Eats | Grocery ordering | Unknown (may not be available) | Unknown |

### Infrastructure Requirements

- **Supabase**: Increase storage if storing many files
- **Vercel**: Increase function timeout for long-running operations
- **Redis**: Already using Upstash for rate limiting

### Team Requirements

**Optimal Team Size**: 2-3 developers
- **Developer 1**: Frontend (React, Next.js, UI components)
- **Developer 2**: Backend (API routes, integrations, agent tools)
- **Developer 3** (optional): DevOps (CI/CD, monitoring, security)

**Single Developer Timeline**: Multiply estimates by 1.5-2x

---

## Decision Points

### Must Decide Before Starting

1. **Plaid Integration**: Yes or No?
   - **Yes**: 2-3 weeks extra effort, recurring costs, full bank sync
   - **No**: 1 week effort, no costs, manual CSV uploads only
   - **Recommendation**: Start with No, add Plaid later if needed

2. **React Native App**: Build or Defer?
   - **Build**: 8-12 weeks, better mobile UX
   - **Defer**: 0 weeks, PWA is sufficient for 1-10 users
   - **Recommendation**: **Defer to Phase 6+**

3. **Web-Based IDE**: Build or Skip?
   - **Build**: 4-6 weeks, high security risk
   - **Skip**: 0 weeks, use external services (GitHub Codespaces)
   - **Recommendation**: **Skip entirely** or defer to Phase 6+

4. **Grocery Ordering**: Attempt or Skip?
   - **Attempt**: 2-3 weeks, may not succeed (API availability)
   - **Skip**: 0 weeks, focus on list management only
   - **Recommendation**: Start with list management, explore ordering later

5. **i18n Locales**: Korean only or Multiple?
   - **Korean only**: Faster (en + ko)
   - **Multiple**: Slower but more flexible (en + ko + ja + zh + es + ...)
   - **Recommendation**: **Start with Korean**, add more later

---

## Next Steps

### Immediate Actions (This Week)

1. **User Review**:
   - [ ] Review this roadmap with user
   - [ ] Confirm priorities (P0, P1, P2, P3, P4)
   - [ ] Make decisions on high-risk/high-effort items
   - [ ] Approve timeline

2. **Setup**:
   - [ ] Create project board (GitHub Projects or Notion)
   - [ ] Break down Phase 0 into tasks
   - [ ] Set up development environment for new dependencies

3. **Quick Win #1** (Auto Thread Titles):
   - [ ] Start implementation immediately
   - [ ] Target: Ship in 2-3 days

### Week 2-3

1. **Phase 0 Completion**:
   - [ ] Finish all Quick Wins
   - [ ] Deploy to production
   - [ ] Gather user feedback

2. **Phase 1 Prep**:
   - [ ] Set up `next-intl`
   - [ ] Extract first 50 UI strings to language files
   - [ ] Find Korean translator (or use LLM with native speaker review)

### Month 2

1. **Phase 1 Execution**:
   - [ ] Complete i18n implementation
   - [ ] User testing with Korean interface
   - [ ] Fix any translation issues

2. **Phase 2 Start**:
   - [ ] Begin file generation work
   - [ ] Prototype PDF export

---

## Appendix A: Technical Stack Summary

### New Dependencies (to be installed)

| Package | Purpose | Phase |
|---------|---------|-------|
| `next-intl` | Internationalization | Phase 1 |
| `jspdf` | PDF generation | Phase 2 |
| `html2canvas` | HTML to image (for PDF) | Phase 2 |
| `pptxgenjs` | PowerPoint generation | Phase 2 |
| `docx` | Word document generation | Phase 2 |
| `@notionhq/client` | Notion API | Phase 3 |
| `googleapis` | Google Calendar/Gmail | Phase 3 |
| `framer-motion` | Animations | Phase 5 |
| `monaco-editor` | Web IDE (optional) | Phase 4 |
| `xterm.js` | Terminal emulation (optional) | Phase 4 |

### Existing Stack (to be leveraged)

- ✅ OpenAI Agent SDK (`@openai/agents`)
- ✅ Next.js 15 + React 19
- ✅ Supabase (auth, database, storage)
- ✅ TanStack Query (caching)
- ✅ Zustand (state management)
- ✅ Zod (validation)
- ✅ Tailwind CSS (styling)
- ✅ Playwright + Vitest (testing)

---

## Appendix B: Cost Estimates

### Development Costs (assuming $100/hour)

| Phase | Estimated Hours | Cost |
|-------|----------------|------|
| Phase 0 (Quick Wins) | 40-60 hours | $4,000 - $6,000 |
| Phase 1 (i18n) | 80-120 hours | $8,000 - $12,000 |
| Phase 2 (File Gen) | 80-100 hours | $8,000 - $10,000 |
| Phase 3 (Dashboard) | 160-240 hours | $16,000 - $24,000 |
| Phase 4 (Advanced) | 240-320 hours | $24,000 - $32,000 |
| Phase 5 (Polish) | 40-60 hours | $4,000 - $6,000 |
| **Total** | **640-900 hours** | **$64,000 - $90,000** |

### Operational Costs (monthly)

| Service | Estimated Cost |
|---------|---------------|
| OpenAI API (GPT-5) | $50 - $200/month (depends on usage) |
| Supabase | $25/month (Pro plan) |
| Vercel | $20/month (Pro plan) |
| Upstash Redis | $10/month |
| Google Cloud APIs | Free tier (low usage) |
| OpenWeatherMap | Free tier |
| Plaid (if used) | $0.30/user/month ($3/month for 10 users) |
| **Total** | **$108 - $258/month** |

---

## Appendix C: Alternative Approaches

### Faster Approach (3 Months)

Focus on **essential features only**:
- ✅ Phase 0 (Quick Wins)
- ✅ Phase 1 (i18n - Korean/English)
- ✅ Phase 2.1 (PDF generation only)
- ✅ Phase 3.1 + 3.2 (Weather + Calendar only)
- ❌ Skip: Gmail, Notion, Grocery, IDE, React Native

**Total**: 12 weeks, ~300-400 hours, $30,000 - $40,000

### Slower Approach (9-12 Months)

Include **all features** + additional ones:
- ✅ All phases above
- ✅ Health wearable integration
- ✅ Smart booking (Yelp, Airbnb, OpenTable)
- ✅ Business analytics (POS integration)
- ✅ React Native mobile app
- ✅ Advanced agent capabilities (memory improvements, tool approval)

**Total**: 36-48 weeks, ~1,200-1,600 hours, $120,000 - $160,000

---

## Conclusion

This roadmap provides a **realistic, phased approach** to building FROK into a fully-featured multilingual personal assistant. The plan:

1. **Starts with Quick Wins** to deliver immediate value
2. **Prioritizes core features** (i18n, file generation, smart dashboard)
3. **Defers high-risk/low-value features** (IDE, React Native)
4. **Includes decision points** to adjust based on user feedback
5. **Estimates costs** for transparency

**Recommended Starting Point**: **Phase 0 (Quick Wins)** → deliver value in 1-2 weeks, then reassess.

**Status**: Awaiting user approval to begin Phase 0.

---

**Last Updated**: 2025-11-02
**Next Review Date**: After Phase 0 completion (2 weeks)
