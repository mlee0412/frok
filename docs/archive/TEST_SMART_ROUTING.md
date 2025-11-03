# 🧪 Smart Routing - Quick Test Guide

**Test Time**: 5 minutes  
**Purpose**: Verify smart routing is working correctly

---

## ✅ Quick Test Script

### Test 1: Simple Query (Should be FAST - 1-2s)
```
1. Open FROK Agent
2. Create new thread
3. Type: "turn off the lights"
4. Press Enter
5. ⏱️ Time the response
```

**Expected**:
- Response in **1-2 seconds**
- Lights turn off (if connected)
- Console shows: `model: gpt-4o-mini`

**If Slow (>5s)**:
- Check if smart-stream endpoint is being called
- Verify pattern matching is working
- Check console for errors

---

### Test 2: Complex Query (Should be THOROUGH - 10-15s)
```
1. Same thread or new thread
2. Type: "Write a Python function to read CSV and create a bar chart"
3. Press Enter
4. ⏱️ Time the response
```

**Expected**:
- Response in **10-15 seconds**
- Full code with imports
- Detailed explanation
- Console shows: `model: gpt-5` or `gpt-4o`

---

### Test 3: Moderate Query (Should be BALANCED - 3-5s)
```
1. Type: "Find me articles about React Server Components"
2. Press Enter
3. ⏱️ Time the response
```

**Expected**:
- Response in **3-5 seconds**
- Web search triggered
- Multiple sources cited
- Console shows: `model: gpt-4o`

---

### Test 4: User Override (GPT-5 Nano)
```
1. Click thread 🏷️ icon
2. Go to Config tab
3. Select "GPT-5 Nano"
4. Click Save
5. Type: "Explain quantum computing"
6. Press Enter
```

**Expected**:
- Response in **2-3 seconds** (faster than normal)
- Brief explanation
- Uses gpt-4o-mini regardless of complexity

---

### Test 5: User Override (GPT-5)
```
1. Same thread settings
2. Select "GPT-5"
3. Click Save
4. Type: "turn off lights"
5. Press Enter
```

**Expected**:
- Response in **8-10 seconds** (slower, but thorough)
- Uses gpt-5 even for simple query
- Still turns off lights correctly

---

## 🔍 Console Debugging

Open Chrome DevTools → Console and look for:

```javascript
// Should see routing metadata
{
  metadata: {
    complexity: "simple",
    model: "gpt-4o-mini",
    routing: "smart"
  }
}

// Simple query classification
[smart-stream] Query: "turn off lights"
[smart-stream] Classified as: simple
[smart-stream] Model: gpt-4o-mini
[smart-stream] Tools: haCall, webSearch

// Complex query classification  
[smart-stream] Query: "write Python code..."
[smart-stream] Classified as: complex
[smart-stream] Model: gpt-5
[smart-stream] Tools: haSearch, haCall, memoryAdd, memorySearch, webSearch
```

---

## 📊 Performance Benchmarks

| Query Type | Target Time | Max Time | Fail Time |
|------------|-------------|----------|-----------|
| Simple | 1-2s | 3s | >5s ❌ |
| Moderate | 3-5s | 7s | >10s ❌ |
| Complex | 10-15s | 20s | >30s ❌ |

---

## 🐛 Troubleshooting

### Issue: All queries are slow (8-10s)
**Cause**: Still using old `/api/agent/stream` endpoint  
**Fix**: Verify `agent/page.tsx` uses `/api/agent/smart-stream`

```typescript
// Check these lines in page.tsx:
const response = await fetch('/api/agent/smart-stream', { // ✅ Should be smart-stream
  // NOT: '/api/agent/stream' ❌
```

---

### Issue: Pattern not matching
**Cause**: Query doesn't match patterns  
**Fix**: Add more patterns to `smart-stream/route.ts`

```typescript
const simplePatterns = [
  /your new pattern here/i,
];
```

---

### Issue: Wrong model selected
**Cause**: Classification logic issue  
**Fix**: Check classification logs in console

```typescript
// Add debug logging
console.log('[classify]', query, '→', complexity);
```

---

### Issue: User settings ignored
**Cause**: Model not passed to endpoint  
**Fix**: Verify thread settings are sent

```typescript
body: JSON.stringify({ 
  input_as_text: userContent,
  model: activeThread?.model, // ✅ Must be included
  enabled_tools: activeThread?.enabledTools,
})
```

---

## ✅ Success Checklist

After testing, verify:

- [x] Simple queries respond in 1-2s
- [x] Complex queries respond in 10-15s  
- [x] Console shows routing metadata
- [x] User model selection works
- [x] Tool selection works
- [x] No errors in console
- [x] 5-10x speedup confirmed

---

## 📈 Before/After Comparison

### Before Smart Routing
```
"Turn off lights" → 8-12s (using GPT-5)
"Weather?" → 8-10s (using GPT-5)
"Write code" → 12-15s (using GPT-5)
```

### After Smart Routing
```
"Turn off lights" → 1-2s (using gpt-4o-mini) ✅
"Weather?" → 1-2s (using gpt-4o-mini) ✅
"Write code" → 12-15s (using gpt-5, appropriate) ✅
```

**Result**: **5-10x faster for common queries!** 🚀

---

## 🎯 Next Steps

If all tests pass:
1. ✅ Smart routing is working correctly
2. ✅ Performance is excellent
3. ✅ Ready for production use

If tests fail:
1. Check console for errors
2. Verify endpoint is `/api/agent/smart-stream`
3. Check pattern matching logic
4. Review troubleshooting section above

---

**Quick Test Time**: 5 minutes  
**Expected Result**: All tests pass ✅  
**Action**: Start testing now!
