# ✅ FROK Agent - Complete Feature Test Checklist

**Date**: October 25, 2025  
**Total Features**: 39 (31 base + 8 custom)  
**Status**: Ready for Testing

---

## 🎯 Test Priority

- 🔴 **CRITICAL** - Core functionality, must work
- 🟡 **HIGH** - Important features, test thoroughly  
- 🟢 **MEDIUM** - Nice to have, test if time permits

---

## 📋 PHASE 1: Core Features (15)

### 🔴 1. Thread Management
- [ ] Create new thread
- [ ] Switch between threads
- [ ] Delete thread
- [ ] Thread list loads on page load
- [ ] Thread list updates in real-time

**Test Steps:**
```
1. Click "New Chat" button
2. Verify new thread appears in sidebar
3. Click different thread
4. Verify messages load correctly
5. Right-click → Delete
6. Verify thread removed
```

---

### 🔴 2. Message Sending
- [ ] Send text message
- [ ] Receive AI response
- [ ] Messages persist in database
- [ ] Messages display correctly
- [ ] Timestamp shown

**Test Steps:**
```
1. Type "Hello" in input
2. Press Enter or click Send
3. Verify user message appears
4. Verify AI response streams in
5. Refresh page
6. Verify messages still there
```

---

### 🔴 3. Streaming Response
- [ ] Response streams character-by-character
- [ ] Smooth animation
- [ ] Can stop mid-stream
- [ ] Final message saved correctly
- [ ] No lag or stuttering

**Test Steps:**
```
1. Send: "Write a long story about a robot"
2. Watch stream animation
3. Click Stop button mid-stream
4. Verify partial message saved
```

---

### 🟡 4. File Upload
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] File preview shown
- [ ] Files sent with message
- [ ] File size validation

**Test Steps:**
```
1. Click file upload icon
2. Select image file
3. Verify preview appears
4. Send message with file
5. Verify AI can see the file
```

---

### 🟡 5. Image Analysis (Vision)
- [ ] Upload image
- [ ] AI describes image
- [ ] Multiple images supported
- [ ] Image preview correct
- [ ] Works with text + images

**Test Steps:**
```
1. Upload photo of your room
2. Ask: "What do you see?"
3. Verify AI describes image accurately
4. Upload 2 images
5. Ask to compare them
```

---

### 🟡 6. Voice Recording
- [ ] Start recording
- [ ] Visualizer animates
- [ ] Stop recording
- [ ] Audio transcribed
- [ ] Transcription accurate

**Test Steps:**
```
1. Click microphone icon
2. Say: "Turn on the lights"
3. Click stop
4. Verify transcription appears
5. Verify message sent
```

---

### 🟡 7. Text-to-Speech (TTS)
- [ ] Click speaker icon on message
- [ ] Audio plays correctly
- [ ] Can pause/resume
- [ ] Can stop
- [ ] Voice sounds natural

**Test Steps:**
```
1. Get AI response
2. Click 🔊 icon
3. Verify speech plays
4. Click pause
5. Click resume
6. Click stop
```

---

### 🔴 8. Home Assistant Integration
- [ ] Control lights (on/off)
- [ ] Control switches
- [ ] Check entity status
- [ ] Search for entities
- [ ] Error handling

**Test Steps:**
```
1. Say: "Turn on bedroom lights"
2. Verify lights turn on
3. Say: "Are the lights on?"
4. Verify status returned
5. Say: "Turn off all lights"
```

---

### 🟡 9. Web Search
- [ ] Search for current info
- [ ] Returns relevant results
- [ ] Cites sources
- [ ] Handles no results
- [ ] Fast execution

**Test Steps:**
```
1. Ask: "What's the weather in NYC?"
2. Verify web search triggered
3. Verify results returned
4. Ask: "Latest news about AI"
5. Verify sources cited
```

---

### 🟡 10. Persistent Memory
- [ ] Save user preferences
- [ ] Recall saved info
- [ ] Memory persists across sessions
- [ ] Can update memory
- [ ] Memory search works

**Test Steps:**
```
1. Say: "Remember that my favorite color is blue"
2. Verify confirmation
3. Refresh page
4. Ask: "What's my favorite color?"
5. Verify correct recall
```

---

### 🟡 11. Message Editing
- [ ] Edit button appears on hover
- [ ] Can edit user messages
- [ ] Re-runs conversation from edit point
- [ ] Messages after edit removed
- [ ] New response generated

**Test Steps:**
```
1. Send: "Tell me about cats"
2. Hover over message
3. Click edit (✏️)
4. Change to: "Tell me about dogs"
5. Verify new response generated
```

---

### 🟡 12. Message Regeneration
- [ ] Regenerate button appears
- [ ] Generates new response
- [ ] Previous response saved
- [ ] Can regenerate multiple times
- [ ] Execution time shown

**Test Steps:**
```
1. Get AI response
2. Click regenerate (🔄)
3. Verify new response generated
4. Click regenerate again
5. Verify different response
```

---

### 🟡 13. Conversation Branching
- [ ] Edit creates branch
- [ ] Branch from any message
- [ ] Can switch between branches
- [ ] Original preserved
- [ ] Branch indicator shown

**Test Steps:**
```
1. Have 5 messages in thread
2. Edit message #3
3. Verify branch created
4. Verify messages 4-5 gone
5. Edit message #2
6. Verify another branch
```

---

### 🟡 14. Export Conversation
- [ ] Export as Markdown
- [ ] Download file works
- [ ] Copy to clipboard works
- [ ] Formatting preserved
- [ ] Includes all messages

**Test Steps:**
```
1. Click Export (📥)
2. Click "Download MD"
3. Verify file downloaded
4. Open file
5. Verify formatting
6. Click "Copy MD"
7. Paste elsewhere
```

---

### 🟢 15. Quick Actions
- [ ] Quick action buttons work
- [ ] Pre-fills input correctly
- [ ] Can modify before sending
- [ ] Relevant to context
- [ ] Changes based on thread

**Test Steps:**
```
1. Open empty thread
2. Verify quick actions shown
3. Click a quick action
4. Verify input pre-filled
5. Modify text
6. Send
```

---

## 📋 PHASE 2: Advanced Features (8)

### 🟡 16. Thread Tags
- [ ] Add tags to thread
- [ ] Remove tags
- [ ] Filter by tags
- [ ] Multiple tags work
- [ ] Tag suggestions shown

**Test Steps:**
```
1. Click thread 🏷️ icon
2. Add tag: "work"
3. Add tag: "urgent"
4. Filter by "work" tag
5. Verify only work threads shown
```

---

### 🟡 17. Thread Folders
- [ ] Assign thread to folder
- [ ] Create new folder
- [ ] Filter by folder
- [ ] Remove from folder
- [ ] Folder list updates

**Test Steps:**
```
1. Click thread 🏷️ icon
2. Select folder: "Projects"
3. Create new folder: "Personal"
4. Assign to "Personal"
5. Filter by folder
```

---

### 🟡 18. Pin Threads
- [ ] Pin thread to top
- [ ] Pinned threads stay at top
- [ ] Unpin thread
- [ ] Multiple pins work
- [ ] Icon changes

**Test Steps:**
```
1. Right-click thread
2. Click "Pin"
3. Verify thread at top
4. Pin another thread
5. Verify both at top
6. Unpin first thread
```

---

### 🟡 19. Archive Threads
- [ ] Archive thread
- [ ] Archived threads hidden
- [ ] Show archived filter
- [ ] Unarchive thread
- [ ] Icon changes

**Test Steps:**
```
1. Right-click thread
2. Click "Archive"
3. Verify thread hidden
4. Toggle "Show Archived"
5. Verify thread visible
6. Click "Unarchive"
```

---

### 🟡 20. Share Thread
- [ ] Generate share link
- [ ] Copy link works
- [ ] Link is accessible
- [ ] Expiration works
- [ ] View count tracked

**Test Steps:**
```
1. Click Share (🔗)
2. Click "Generate Link"
3. Copy link
4. Open in incognito
5. Verify conversation visible
6. Verify read-only
```

---

### 🟡 21. Search Threads
- [ ] Search by title
- [ ] Search by content
- [ ] Real-time filtering
- [ ] Case insensitive
- [ ] Clear search works

**Test Steps:**
```
1. Type "python" in search
2. Verify only matching threads shown
3. Type "PYTHON" (caps)
4. Verify same results
5. Clear search
6. Verify all threads back
```

---

### 🟢 22. Loading States
- [ ] Thread list skeleton
- [ ] Message skeleton
- [ ] No layout shift
- [ ] Smooth transitions
- [ ] Appropriate duration

**Test Steps:**
```
1. Refresh page
2. Observe loading skeletons
3. Verify smooth transition
4. Switch threads
5. Verify message skeleton
```

---

### 🟢 23. Error Boundaries
- [ ] Catches React errors
- [ ] Shows error message
- [ ] Doesn't crash app
- [ ] Reload button works
- [ ] Logs error

**Test Steps:**
```
(Hard to test without causing errors)
1. Verify error boundary wraps app
2. Check console for errors
3. Test with invalid data
```

---

## 📋 PHASE 3: Custom Features (8)

### 🟡 24. Auto Title Suggestion
- [ ] Title generated on first message
- [ ] Title is descriptive
- [ ] Non-blocking (background)
- [ ] Updates thread list
- [ ] 3-6 words length

**Test Steps:**
```
1. Create new thread
2. Send: "Help me plan a birthday party"
3. Wait 2-3 seconds
4. Verify title changes to something like:
   "Plan Birthday Party Assistance"
```

---

### 🔴 25. Tool Selection Toggle
- [ ] Tool checkboxes work
- [ ] Settings persist
- [ ] Per-thread isolation
- [ ] Toast notification shown
- [ ] Agent respects settings

**Test Steps:**
```
1. Click thread 🏷️ → Tools tab
2. Uncheck "Home Assistant"
3. Click Save
4. Ask: "Turn on lights"
5. Verify agent says it can't
6. Re-enable tool
7. Verify works again
```

---

### 🔴 26. Multi-Model Selector
- [ ] GPT-5 option works
- [ ] GPT-5 Nano option works
- [ ] Settings persist
- [ ] Per-thread isolation
- [ ] Toast notification shown

**Test Steps:**
```
1. Click thread 🏷️ → Config tab
2. Select "GPT-5 Nano"
3. Click Save
4. Send simple query
5. Verify fast response (1-2s)
6. Switch to "GPT-5"
7. Verify more thoughtful response
```

---

### 🔴 27. Smart Query Routing
- [ ] Simple queries use fast model
- [ ] Complex queries use GPT-5
- [ ] Response time improved
- [ ] Appropriate model selected
- [ ] Transparent (metadata)

**Test Steps:**
```
1. Send: "Turn off lights"
2. Verify fast response (1-2s)
3. Send: "Write Python code to analyze CSV"
4. Verify longer response (10s)
5. Check console for routing metadata
```

---

### 🟡 28. TTS Voice/Speed Controls
- [ ] Settings modal opens
- [ ] Voice selection works
- [ ] Speed slider works
- [ ] Settings persist
- [ ] Applied to all TTS

**Test Steps:**
```
1. Click 🔊 button in header
2. Change speed to 1.5x
3. Select different voice
4. Click Save
5. Play message audio
6. Verify faster speed + new voice
```

---

### 🟡 29. Agent Style/Tone
- [ ] 5 styles available
- [ ] Style selection works
- [ ] Settings persist
- [ ] Per-thread isolation
- [ ] Noticeable difference

**Test Steps:**
```
1. Click thread 🏷️ → Config
2. Select "Concise" style
3. Ask: "Explain React hooks"
4. Note brief response
5. Select "Detailed" style
6. Ask same question
7. Note much longer response
```

---

### 🟢 30. Project Context
- [ ] Text area editable
- [ ] Settings persist
- [ ] Agent uses context
- [ ] Per-thread isolation
- [ ] Helpful for scoping

**Test Steps:**
```
1. Click thread 🏷️ → Config
2. Add context: "Python data analysis project"
3. Click Save
4. Ask: "How should I handle missing data?"
5. Verify Python-specific answer
```

---

### 🟡 31. Agent Core Memory
- [ ] Memory modal opens
- [ ] Can add memories
- [ ] 4 types available
- [ ] Importance slider works
- [ ] Can delete memories

**Test Steps:**
```
1. Click 🧠 button in header
2. Add memory:
   - Type: User Preference
   - Content: "Prefers concise answers"
   - Importance: 8
3. Click Add
4. Verify memory appears
5. Start new thread
6. Verify shorter responses
7. Delete memory
```

---

## 📋 PHASE 4: Performance Features (4)

### 🔴 32. Message Caching
- [ ] Messages load instantly on return
- [ ] No duplicate API calls
- [ ] Cache persists during session
- [ ] Cache cleared on refresh
- [ ] Significant speedup

**Test Steps:**
```
1. Open thread A (loads from API)
2. Switch to thread B (loads from API)
3. Switch back to thread A (INSTANT)
4. Switch to thread B (INSTANT)
5. Verify no loading spinner
```

---

### 🔴 33. Request Deduplication
- [ ] Rapid clicks don't duplicate
- [ ] Previous requests cancelled
- [ ] No race conditions
- [ ] Clean error handling
- [ ] Console shows aborts

**Test Steps:**
```
1. Rapidly click between threads
2. Verify only one request per thread
3. Check console for "AbortError" (expected)
4. Verify no duplicate messages
```

---

### 🔴 34. Database Indexes
- [ ] Thread queries fast (<100ms)
- [ ] Message queries fast (<50ms)
- [ ] Tag filtering fast
- [ ] Folder filtering fast
- [ ] No visible lag

**Test Steps:**
```
1. Open Network tab in DevTools
2. Load thread list
3. Verify fast response (<100ms)
4. Filter by tags
5. Verify instant filtering
6. Check database indexes exist:
   - idx_chat_threads_user_deleted
   - idx_chat_messages_composite
```

---

### 🔴 35. Auto Timestamp Trigger
- [ ] Thread updated_at updates automatically
- [ ] No manual API call needed
- [ ] Works on message insert
- [ ] Works on message update
- [ ] Thread list reorders

**Test Steps:**
```
1. Send message in thread
2. Verify thread moves to top
3. Check Network tab
4. Verify no extra PATCH request
5. Timestamp in database updated
```

---

## 📋 PHASE 5: UI/UX Features (4)

### 🟢 36. Mobile Responsive
- [ ] Sidebar toggles on mobile
- [ ] Hamburger menu works
- [ ] Overlay shown
- [ ] Touch targets correct size
- [ ] Layout adapts

**Test Steps:**
```
1. Resize window to 375px width
2. Verify hamburger menu appears
3. Click hamburger
4. Verify sidebar slides in
5. Click overlay
6. Verify sidebar closes
```

---

### 🟢 37. Toast Notifications
- [ ] Success toasts show
- [ ] Error toasts show
- [ ] Auto-dismiss after 5s
- [ ] Can dismiss manually
- [ ] Stacks correctly

**Test Steps:**
```
1. Update thread settings
2. Verify green success toast
3. Try invalid action
4. Verify red error toast
5. Trigger multiple toasts
6. Verify stack display
```

---

### 🟢 38. Optimistic Updates
- [ ] New thread appears instantly
- [ ] Rollback on error
- [ ] Smooth transitions
- [ ] No flash of content
- [ ] Correct final state

**Test Steps:**
```
1. Click "New Chat"
2. Verify instant appearance
3. Verify smooth transition to real ID
4. Simulate network error
5. Verify rollback happens
```

---

### 🟢 39. Accessibility
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader friendly
- [ ] Color contrast good

**Test Steps:**
```
1. Tab through interface
2. Verify focus visible
3. Press Enter to activate
4. Check with screen reader
5. Verify WCAG AA contrast
```

---

## 🎯 Test Execution Plan

### Day 1: Critical Features (8 hours)
- Thread management
- Message sending/receiving
- Streaming
- Tool selection
- Model selector
- Smart routing
- Message caching
- Database performance

### Day 2: Important Features (6 hours)
- Home Assistant
- File upload & vision
- Voice & TTS
- Search & filters
- Tags & folders
- Auto title
- Memory system

### Day 3: Nice-to-Have (4 hours)
- Export/share
- Quick actions
- Loading states
- Mobile responsive
- Toast notifications
- Accessibility

---

## 📊 Success Criteria

### Must Pass (Critical)
- ✅ All Phase 1 core features work
- ✅ All Phase 3 custom features work
- ✅ All Phase 4 performance features work
- ✅ No data loss
- ✅ No crashes

### Should Pass (High Priority)
- ✅ All Phase 2 advanced features work
- ✅ Mobile responsive
- ✅ Fast performance (<2s simple queries)
- ✅ Good UX

### Nice to Pass (Medium Priority)
- ✅ All Phase 5 UI/UX features work
- ✅ Perfect accessibility
- ✅ No console errors

---

## 🐛 Bug Tracking Template

```markdown
### Bug #X: [Title]
**Severity**: Critical / High / Medium / Low
**Feature**: [Feature name]
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected**: 
**Actual**: 
**Screenshot**: 
**Console Errors**: 
**Fix Status**: 
```

---

## ✅ Sign-Off Checklist

- [ ] All critical tests passed
- [ ] All high priority tests passed
- [ ] Performance acceptable
- [ ] Mobile works
- [ ] No major bugs
- [ ] Documentation updated
- [ ] Ready for production

---

**Total Features to Test**: 39  
**Estimated Test Time**: 18 hours  
**Test Environment**: Local development  
**Browser**: Chrome (primary), Safari, Firefox

**Start Testing**: `npm run dev` and go through each feature systematically!
