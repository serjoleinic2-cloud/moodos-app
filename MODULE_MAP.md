# MODULE MAP

## L1 — CORE ENGINE
www/js/core/
- appRuntime.js (global state)
- audioController.js (singleton audio engine)

## L2 — AI LAYER
www/js/ai/
- offline-ai.js (text analysis)
- avatar-brain.js (avatar responses)
- voice.js (recording)
- voice-analysis.js (DEPRECATED)

## L3 — UI MODULES
www/js/screens/
- meditation.js (onEnter/onExit) ⚠️ uses AudioController
- insight.js (onEnter) ⚠️ uses AppRuntime
- settings.js (dynamic modals)
- history.js (unified history)
- voice.js (onEnter)
- premium.js (onEnter)
- pdf-report.js (onEnter)
- tools.js
- breathing.js
- tap-calm.js
- visual-focus.js
- mind-dump.js
- support-texts.js
- paywall.js
- how-it-works.js

## L4 — MEDIA ENGINE
AudioController (singleton)
- play/pause/stop/resume
- subscription system
- visibility handler
- hard reset

## SYSTEM
www/js/
- navigation.js
- state.js
- memory.js
- system-core.js
- i18n.js

---

## RULES
1. Screens MUST have onEnter() / onExit()
2. Screens MUST NOT contain audio logic directly
3. Screens MUST use AudioController for audio
4. Screens MUST use AppRuntime for state
5. No inline styles (use design-system.css)
