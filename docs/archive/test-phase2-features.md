# Phase 2 Testing Guide 🧪

Test all 4 new features in order. Check off each ✅ as you complete it.

---

## Prerequisites
- ✅ Dev server running: `pnpm dev` in `apps/web`
- ✅ Browser open: http://localhost:3000/agent
- ✅ Microphone permissions ready

---

## Test 1: 🎤 Voice Input (Whisper API)

### Steps:
1. Look at the input area (bottom of screen)
2. Find the 🎤 microphone button (between 🖼️ and text input)
3. Click the 🎤 button
   - ✅ Button should turn RED and pulse
   - ✅ White dot should animate with your voice level
4. Say out loud: **"Check the status of all my smart home devices"**
5. Click 🎤 again to stop recording
   - ✅ Button shows ⏳ (hourglass) - "Processing..."
6. Wait 2-3 seconds
   - ✅ Your spoken text appears in the input field
7. Press Enter to send the message

### Expected Result:
- ✅ Transcribed text is accurate (90%+ accuracy)
- ✅ Agent responds with smart home info
- ✅ No errors in browser console

### Troubleshooting:
- **Microphone permission denied?** → Check browser settings
- **No transcription?** → Check OPENAI_API_KEY in .env.local
- **Timeout?** → Try shorter message (Whisper has limits)

---

## Test 2: 🔊 Text-to-Speech (Read Aloud)

### Steps:
1. Wait for an assistant response (from Test 1 or send "Explain photosynthesis")
2. Hover your mouse over the **gray assistant message bubble**
3. Look for buttons that appear at the bottom
   - ✅ You should see: 🔊 🔄 Regenerate
4. Click the **🔊 speaker icon**
   - ✅ Voice starts reading the message
   - ✅ Button changes to: ⏸️ ⏹️
5. While it's speaking, click **⏸️ Pause**
   - ✅ Voice pauses mid-sentence
   - ✅ Button changes to: ▶️ ⏹️
6. Click **▶️ Resume**
   - ✅ Voice continues from where it paused
7. Click **⏹️ Stop**
   - ✅ Voice stops immediately
   - ✅ Button returns to: 🔊

### Expected Result:
- ✅ Voice is clear and natural (not robotic)
- ✅ Pause/Resume works smoothly
- ✅ Stop is immediate
- ✅ Only one message can speak at a time

### Try Also:
- Click 🔊 on a different message while one is speaking
  - ✅ First message stops, new one starts

---

## Test 3: ✏️ Edit Message & Re-run

### Steps:
1. Send a user message: **"Tell me about quantum computers"**
2. Wait for assistant response
3. Hover over **your blue user message** (not the assistant's)
   - ✅ You should see: 🌿 Branch | ✏️ Edit
4. Click **✏️ Edit**
   - ✅ Message turns into a textarea
   - ✅ You see: 💾 Save & Re-run | ✕ Cancel
5. Change the text to: **"Tell me about quantum computing applications"**
6. Click **💾 Save & Re-run**
   - ✅ The old assistant response disappears
   - ✅ New response starts streaming in real-time
   - ✅ Word-by-word streaming animation
7. Wait for response to complete

### Expected Result:
- ✅ Original assistant message is gone
- ✅ New response is different and relevant to edited question
- ✅ Message history updated correctly
- ✅ Can edit again if needed

### Try Also:
- Edit a message in the middle of a long conversation
  - ✅ All messages AFTER the edit are removed
  - ✅ Conversation continues from edit point

---

## Test 4: 🌿 Conversation Branching

### Steps:
1. Start a **new chat** (⌘/Ctrl + K or click "+ New Chat")
2. Have a short conversation:
   ```
   You: "What is artificial intelligence?"
   [Wait for response]
   
   You: "Tell me about neural networks"
   [Wait for response]
   
   You: "How do they learn?"
   [Wait for response]
   ```
3. Now hover over the **2nd user message** ("Tell me about neural networks")
   - ✅ You see: 🌿 Branch | ✏️ Edit
4. Click **🌿 Branch** (purple button)
   - ✅ New thread appears in sidebar
   - ✅ Title shows "(Branch)"
   - ✅ Purple 🌿 badge next to title
   - ✅ You're automatically switched to new thread
5. Look at the new thread's messages
   - ✅ Contains first 3 messages only (up to branch point)
   - ✅ "How do they learn?" is NOT in this thread
6. Continue the conversation in a **different direction**:
   ```
   You: "What about convolutional networks?"
   [New response specific to this branch]
   ```
7. Switch back to **original thread** (click it in sidebar)
   - ✅ Original thread unchanged
   - ✅ All 6+ messages still there

### Expected Result:
- ✅ Two independent conversation threads
- ✅ Can switch between them freely
- ✅ Each can go in different directions
- ✅ Branch badge visible in sidebar

### Try Also:
- Create multiple branches from different points
  - ✅ Each branch is independent
  - ✅ All show 🌿 badge

---

## Test 5: Combined Features Test 🎯

### Advanced Workflow:
1. **Voice**: Record "What are the benefits of exercise?"
2. **Listen**: Click 🔊 to hear response
3. **Edit**: Change your message to "What are the benefits of yoga?"
4. **Branch**: Create branch from edited message
5. **Voice**: In branch, record follow-up question
6. **Listen**: Hear response in branch
7. Switch between original and branch threads

### Expected Result:
- ✅ All features work together smoothly
- ✅ No conflicts or errors
- ✅ Threads maintain separate states
- ✅ Voice/TTS work in both threads

---

## Browser Console Check

Press **F12** → Console tab

### Should NOT see:
- ❌ Red errors
- ❌ "Failed to..." messages
- ❌ 500 server errors

### OK to see:
- ✅ Info logs (blue)
- ✅ "[transcribe]" or "[stream]" logs
- ✅ Network requests (200 OK)

---

## Performance Check

### Voice Input:
- Transcription time: **< 5 seconds**
- Button response: **Immediate**

### TTS:
- Start speaking: **< 200ms**
- Pause/Resume: **Immediate**

### Edit & Re-run:
- Edit mode: **Immediate**
- Streaming: **Real-time, smooth**

### Branching:
- Branch creation: **< 1 second**
- Thread switch: **Immediate**

---

## Common Issues & Solutions

### Issue: Microphone not working
**Solution**: Check browser permissions (🔒 in address bar)

### Issue: No transcription
**Solution**: 
1. Check `.env.local` has `OPENAI_API_KEY`
2. Restart dev server
3. Try shorter recording (< 30 seconds)

### Issue: TTS not speaking
**Solution**: 
1. Check browser volume
2. Try different browser (Chrome/Edge work best)
3. Check system TTS voices installed

### Issue: Edit doesn't trigger new response
**Solution**:
1. Check network tab for errors
2. Verify streaming endpoint working
3. Check OPENAI_API_KEY

### Issue: Branch doesn't appear
**Solution**:
1. Check Supabase connection
2. Verify messages saved to DB
3. Check console for errors

---

## ✅ Testing Complete!

### Results Summary:
- [ ] 🎤 Voice Input - Working
- [ ] 🔊 Text-to-Speech - Working
- [ ] ✏️ Edit & Re-run - Working
- [ ] 🌿 Branching - Working

**All tests passed?** → Ready for Phase 2 features 5-6! 🚀

**Found issues?** → Report them and we'll fix before continuing.

---

## Next Steps

After testing, we'll add:
1. **🏷️ Tags & Folders** - Organize threads
2. **🔗 Public Sharing** - Share conversations

Ready to continue? 👍
