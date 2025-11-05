# FROK Agent Page - Features Summary

## Current Top-Right Action Buttons

Located at: `C:\Dev\FROK\apps\web\src\app\(main)\agent\page.tsx` (lines 2000-2074)

### Current Button Layout (Left to Right)
```
[☁️ Cozy] [📋 Compact] [🧠 Memory] [📚 Notebook] [🔗 Share] [📥 Export ▼]
```

## Buttons Breakdown

### 1. Density Controls (Display Options)
- **☁️ Cozy View** - Comfortable spacing between messages
- **📋 Compact View** - Dense message display
- State: `setDensity` toggle

### 2. Primary Action Buttons (Always Visible)

#### 🧠 Memory Button
- **Purpose**: Manage agent's core memory (what agent remembers)
- **Component**: `AgentMemoryModal.tsx`
- **Features**:
  - Add/delete agent memories
  - Memory types: Core Knowledge, User Preferences, Facts, Skills
  - Importance rating (1-10)
  - TanStack Query hooks: useAgentMemories, useAddAgentMemory, useDeleteAgentMemory
- **API**: `/api/memory/add`, secured with auth
- **Translations**: `memory.agentMemory` namespace

#### 📚 Notebook Button
- **Purpose**: View/manage personal user memories and knowledge base
- **Component**: `UserMemoriesModal.tsx`
- **Features**:
  - Add personal memories/notes
  - Tag-based organization and filtering
  - TanStack Query hooks: useUserMemories, useDeleteUserMemory, useAddUserMemory
- **API**: `/api/memory/list`, `/api/memory/search`
- **Translations**: `memory.userMemories` namespace

### 3. Conditional Action Buttons (Only When Thread Has Messages)

#### 🔗 Share Button
- **Purpose**: Share conversation thread
- **Condition**: Only visible if `activeThread?.messages.length > 0`
- **State**: `showShareModal`

#### 📥 Export Button (With Dropdown)
- **Purpose**: Export conversation in different formats
- **Condition**: Only visible if `activeThread?.messages.length > 0`
- **Options**:
  - 💾 Download - via `downloadMarkdown()`
  - 📋 Copy - via `copyToClipboard()`
- **File**: `exportConversation.ts` contains utility functions
- **State**: `showExportMenu`, `exportSuccess`

---

## Available Features NOT Currently Top Buttons

### 1. Text-to-Speech (TTS) System
**File**: `C:\Dev\FROK\apps\web\src\hooks\useTextToSpeech.ts`
- **Modal Component**: `TTSSettings.tsx`
- **Store**: `ttsStore.ts` (persistent via Zustand)
- **Features**:
  - Voice selection (English voices from Web Speech API)
  - Playback speed (0.5x to 2.0x)
  - Speak message text aloud
  - Pause/Resume/Stop controls
  - Settings: enabled, autoPlay, voice, speed, volume
- **Voice Control States**: idle, speaking, paused
- **Per-Message Controls**: Lines 2197-2219 show pause/resume/stop buttons
- **Access**: State variable `showTTSSettings` already exists (just needs button)

### 2. Voice Recording/Transcription
**File**: `C:\Dev\FROK\apps\web\src\hooks\useVoiceRecorder.ts`
- **Features**:
  - Record audio input
  - Transcribe to text (via Whisper API)
  - Audio level visualization
  - Recording state: recordingState, audioLevel
- **Methods**: startRecording(), stopRecording(), transcribeAudio()
- **Already imported**: Line 10 of agent/page.tsx

### 3. Thread Management Settings
**Component**: `ThreadOptionsMenu.tsx` (3 tabs)
- **Organize Tab**: Title, tags, folders
- **Tools Tab**: Toggle agent tools:
  - 🏠 Home Assistant
  - 🧠 Persistent Memory
  - 🔍 Web Search (DuckDuckGo)
  - 🌐 Web Search (Tavily)
  - 🎨 Image Generation
- **Config Tab**:
  - Model Selection: GPT-5 Think/Think-Planning, GPT-5, GPT-5 Mini, GPT-5 Nano, Auto
  - Agent Style: Balanced, Concise, Detailed, Technical, Casual
  - Project Context: Custom instructions

---

## Feature Location Map

### Modals/Components
| Feature | Path | Type |
|---------|------|------|
| Agent Memory | `components/AgentMemoryModal.tsx` | Modal |
| User Notebook | `components/UserMemoriesModal.tsx` | Modal |
| TTS Settings | `components/TTSSettings.tsx` | Modal |
| Thread Options | `components/ThreadOptionsMenu.tsx` | Modal (3 tabs) |

### Hooks
| Feature | Path | Returns |
|---------|------|---------|
| Text-to-Speech | `hooks/useTextToSpeech.ts` | ttsState, speak, pause, resume, stop, settings, voices |
| Voice Recording | `hooks/useVoiceRecorder.ts` | recordingState, audioLevel, startRecording, stopRecording, transcribeAudio |

### Stores (Persistent)
| Store | Purpose |
|-------|---------|
| `store/ttsStore.ts` | TTS settings: enabled, autoPlay, voice, speed, volume |
| `store/chatStore.ts` | Threads, messages |
| `store/userPreferencesStore.ts` | UI preferences, density |

### Utilities
| Utility | Purpose |
|---------|---------|
| `lib/exportConversation.ts` | downloadMarkdown(), copyToClipboard() |

---

## Button Styling Pattern

```typescript
className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
```

Key Features:
- Icon always visible
- Text hidden on mobile: `hidden sm:inline`
- Blue hover state with sky-500 color
- Small icon + text layout

---

## Potential Replacements

### Option A: Add Voice Input/Output Buttons
- **Remove**: Memory (🧠) + Notebook (📚) [2 buttons]
- **Add**: Voice Settings (🔊) + Voice Record (🎤) [2 buttons]
- **Rationale**: Direct voice interaction is primary feature
- **Setup**: `showTTSSettings` and `recordingState` already in component

### Option B: Quick Tool Toggles
- **Remove**: Notebook (📚) [1 button]
- **Add**: Tool toggle menu (e.g., 🏠 Home, 🌐 Search, 🎨 Image)
- **Rationale**: Per-thread tool selection is common workflow
- **Data**: AVAILABLE_TOOLS array in ThreadOptionsMenu

### Option C: Model/Style Quick Select
- **Remove**: Notebook (📚) [1 button]
- **Add**: Quick model selector showing current model
- **Rationale**: Model selection affects cost and performance
- **Current**: In ThreadOptionsMenu config tab

### Option D: Keep Both + Reorganize
- Move Memory/Notebook to sidebar or collapsible menu
- Keep voice + export as top buttons
- Use three-dot menu (⋮) for less-frequent actions

---

## Translation Keys Needed

### For Voice Settings Button
```
tts.title = "Voice Settings"
tts.tooltip = "Configure text-to-speech preferences"
```

### For Voice Record Button
```
voice.title = "Record Audio"
voice.tooltip = "Record audio input for transcription"
voice.tooltip_recording = "Stop recording"
```

---

## State Variables Already in Component

```typescript
// TTS Controls
const [showTTSSettings, setShowTTSSettings] = React.useState(false);
const { ttsState, settings: ttsSettings, voices: ttsVoices, speak, pause, resume, stop, updateSettings } = useTextToSpeech();

// Voice Recording
const { recordingState, audioLevel, startRecording, stopRecording, transcribeAudio } = useVoiceRecorder();

// Memory Controls
const [showMemoryModal, setShowMemoryModal] = React.useState(false);
const [showUserMemoriesModal, setShowUserMemoriesModal] = React.useState(false);
```

All the infrastructure is already in place for voice buttons!

