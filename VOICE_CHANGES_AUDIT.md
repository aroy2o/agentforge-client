# VOICE CHANGES AUDIT

## A) Audit Scope And Coverage
- This audit is no-code and based on direct file reads plus cross-reference searches.
- Requested frontend files were reviewed, with one name correction: `src/pages/Agents.jsx` does not exist in this workspace, and `src/pages/AgentBuilder.jsx` appears to be the intended replacement.
- Frontend files reviewed:
- `src/utils/speak.js`
- `src/utils/listen.js`
- `src/utils/voiceCommandDispatcher.js`
- `src/utils/conversationMemory.js`
- `src/utils/ariaContext.js`
- `src/utils/voicePageHandlers.js`
- `src/hooks/useVoiceAgent.js`
- `src/store/voiceSlice.js`
- `src/components/voice/VoiceControlPanel.jsx`
- `src/components/layout/VoiceControlPanel.jsx`
- `src/components/layout/AppLayout.jsx`
- `src/components/layout/Header.jsx`
- `src/components/task/TaskInput.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/AgentBuilder.jsx`
- `src/pages/Scheduler.jsx`
- `src/pages/ChatHistory.jsx`
- `src/pages/Settings.jsx`
- `src/services/api.js`
- Backend files reviewed:
- `agentforge-server/routes/voice.js`
- `agentforge-server/services/elevenlabs.js`
- `agentforge-server/database/models/User.js`
- `agentforge-server/index.js`
- `agentforge-server/database/queries.js`

## B) What Changed In The Voice System
- The active architecture has shifted from command-only voice control to a conversational ARIA loop.
- The current live path is:
- Browser speech-to-text from `listen.js`
- Conversation orchestration in `useVoiceAgent.js`
- Backend assistant interpretation via `POST /api/voice/assistant`
- Spoken response via browser speech synthesis in `speak.js`
- Optional app action execution from parsed assistant action output
- The UI has moved to a conversational voice panel in `src/components/voice/VoiceControlPanel.jsx`, mounted by `AppLayout.jsx`.
- App-wide page-context registration is now done via `voicePageHandlers.js` so ARIA can invoke page-scoped handlers.
- Voice state was expanded in `voiceSlice.js` with conversational fields like thinking status, recent user/assistant speech, follow-up suggestion, onboarding flag, and conversation history.

## C) Active Wiring Vs Legacy Wiring
- Active mounted panel:
- `src/components/layout/AppLayout.jsx` imports `../voice/VoiceControlPanel`.
- Legacy panel still present but not mounted:
- `src/components/layout/VoiceControlPanel.jsx` exists and still uses `dispatchVoiceCommand` from `voiceCommandDispatcher.js`.
- Import scan result indicates only the new panel path is imported by layout. No current imports were found for the legacy panel file path.
- This leaves two parallel implementations in the codebase:
- New conversational panel + assistant route path (active)
- Old command-dispatch panel + dispatcher utility path (inactive in layout)
- `voiceCommandDispatcher.js` is partially still coupled to active code because `useVoiceAgent.js` imports `isRepeatRequest` from it.
- Net effect: old and new systems coexist. The old UI path is effectively dormant, but old logic is not fully retired.

## D) Mic Failure Root Cause Trace
- The previously observed runtime crash (`Cannot access 'startListening' before initialization`) is consistent with a temporal dead zone issue from callback/hook ordering in `useVoiceAgent.js`.
- Current file state indicates that `startListening` is now defined before dependent flows use it, and conversation lifecycle methods are structured around stable callbacks.
- No second live panel is mounted in `AppLayout`, so there is no active double-mic UI race from both panels rendering together.
- Remaining reliability risk is not the same crash, but complexity overlap from keeping both legacy and conversational implementations in source.

## E) Page-Level Voice Integration Status
- Dashboard:
- Registers page handlers for run/stop pipeline and exposes agent roster context.
- Scheduler:
- Registers handlers for schedule actions and maps by task name matching.
- Chat History:
- Registers handlers for new chat/send message/unmatched transcript routing.
- Also uses `useVoiceAgent().speak` to read assistant responses.
- Settings:
- Registers save-settings handler and exposes current tab context.
- Includes voice preference controls and test voice output button.
- Agent Builder:
- Registers handler to open the form step and exposes roster/step context.
- Header:
- No direct voice orchestration found in this file.
- Task Input:
- No direct voice orchestration found in this file.

## F) Backend Voice Contract And Security Notes
- Voice assistant endpoint:
- `POST /api/voice/assistant` is authenticated with `requireAuth` and returns normalized JSON fields (`speech`, `action`, `actionData`, `followUp`, `isConversational`).
- Legacy command endpoint:
- `POST /api/voice/command` remains present for structured parser flow.
- It is not protected by `requireAuth` in current route definition.
- Speech endpoint:
- `POST /api/voice/speak` remains present and attempts ElevenLabs first, then returns 204 to trigger browser fallback behavior.
- On frontend, server TTS usage is intentionally removed/commented in `api.js`, and browser TTS is active.
- Security/consistency risk:
- Mixed auth posture across voice endpoints (`/assistant` protected, `/command` and `/speak` open) creates inconsistent boundary behavior.

## G) Duplications, Conflicts, And Behavioral Risks
- Duplicate voice panel components:
- `src/components/voice/VoiceControlPanel.jsx` (active)
- `src/components/layout/VoiceControlPanel.jsx` (legacy, not mounted)
- Duplicate orchestration paradigms:
- Conversational assistant flow in `useVoiceAgent.js`
- Command dispatcher flow in `voiceCommandDispatcher.js`
- Partial coupling across paradigms:
- `useVoiceAgent.js` still depends on `isRepeatRequest` from legacy dispatcher utility.
- API compatibility drift potential:
- Frontend primarily relies on `/api/voice/assistant`, while `/api/voice/command` remains in `api.js` and backend, increasing long-term maintenance surface.
- UX consistency risks:
- Voice preferences are persisted in user preferences and voice slice state, but multiple historical pathways can reintroduce inconsistent mute/continuous semantics if legacy path is re-mounted accidentally.

## H) Audit Conclusion And Cleanup Priorities
- Current production path appears to be the conversational ARIA system and is wired through `AppLayout` and `useVoiceAgent`.
- The biggest remaining problem is coexistence of legacy and current voice systems in the same codebase, not an immediate hard runtime failure in the active path.
- Highest-priority cleanup items:
- Decide one canonical voice control path and retire the other.
- Remove or quarantine the legacy `components/layout/VoiceControlPanel.jsx` if not intended for rollback.
- Extract `isRepeatRequest` into a neutral utility if needed, then decouple `useVoiceAgent` from legacy dispatcher file.
- Standardize auth expectations across `/api/voice/*` endpoints.
- Optional hardening:
- Add smoke tests for start/stop conversation, low-confidence retry loop, and page action routing to prevent regression of the initialization-order bug class.

---

Verification notes from terminal checks:
- `src/components/voice` and `src/components/layout` both contain a `VoiceControlPanel.jsx` file.
- `AppLayout.jsx` imports `../voice/VoiceControlPanel`.
- `registerVoicePageHandlers` is used in Dashboard, Scheduler, ChatHistory, Settings, and AgentBuilder.
- `dispatchVoiceCommand` usage is isolated to legacy layout panel.
- Frontend server-TTS call to `/api/voice/speak` is removed/commented; browser TTS utilities are active.
