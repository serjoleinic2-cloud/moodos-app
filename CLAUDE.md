# MoodOS — Project Overview

## Overview
MoodOS is a mobile mood tracking & self-discovery app built with Vanilla JS + Capacitor (Android/iOS). It features mood tracking, AI-powered text/voice analysis, guided breathing/meditation practices, an avatar companion, insights/analytics, and PDF reports.

## Tech Stack
- **Frontend**: Vanilla JS (ES modules), no framework
- **Mobile**: Capacitor (Android/iOS WebView)
- **Charts**: Chart.js
- **PDF**: jsPDF
- **Storage**: localStorage (with Google Drive backup)
- **i18n**: 4 languages (ru, en, es, uk)

## Project Structure

```
www/
├── index.html
├── css/
│   ├── style.css        # Global styles + theme definitions
│   └── avatar.css
├── js/
│   ├── app.js           # Boot, main render loop, event handlers
│   ├── navigation.js    # Screen navigation, tool menu
│   ├── state.js         # Global app state (mood, avatar, etc.)
│   ├── system-core.js   # Core system, event bus, AI dispatch
│   ├── ui-controller.js # UI utilities, tab navigation
│   ├── i18n.js          # i18n core (t(), setLang(), getLang())
│   ├── onboarding.js    # First-launch onboarding flow
│   ├── avatar.js        # Avatar companion (tap, drag, proactive)
│   ├── premium-modal.js # Premium upgrade modal
│   ├── monthly-check.js # Monthly medication check reminder
│   │
│   ├── core/              # Architectural layer (ARL)
│   │   └── appRuntime.js # Global state management, event delegation helpers
│   │
│   ├── i18n/            # Translations (4 languages)
│   │   ├── en.js, es.js, ru.js, uk.js
│   │
│   ├── ai/              # AI services (offline-first)
│   │   ├── offline-ai.js      # Text sentiment analysis
│   │   ├── voice.js           # Voice recording
│   │   ├── voice-analysis.js  # Voice tone analysis
│   │   └── avatar-brain.js    # Avatar response logic
│   │
│   ├── screens/         # Screen modules (each has onEnter(container))
│   │   ├── home.js           # Main screen with mood slider
│   │   ├── insight.js        # Analytics, trends, period comparison
│   │   ├── history.js        # Session history list
│   │   ├── report.js         # Calendar heatmap + day popup with audio player
│   │   ├── stability.js       # Stability score screen
│   │   ├── settings.js        # Settings (theme, language, backup, premium)
│   │   ├── premium.js         # Premium status/upgrade screen
│   │   ├── how-it-works.js    # How it works screen
│   │   ├── tools.js           # Tools menu (breathing, meditation, etc.)
│   │   ├── breathing.js       # Breathing exercise
│   │   ├── meditation.js      # Meditation with audio player + custom tracks
│   │   ├── visual-focus.js    # Visual focus tool
│   │   ├── mind-dump.js       # Mind dump journaling
│   │   ├── tap-calm.js        # EFT tapping
│   │   ├── support-texts.js   # Support texts/quotes
│   │   ├── voice.js           # Voice diary screen
│   │   ├── pdf-report.js      # PDF report generation
│   │   └── paywall.js         # Paywall screen
│   │
│   └── services/        # Business logic services
│       ├── memory.js          # Mood/note/session history CRUD
│       ├── session-analytics.js # Practice effectiveness analytics
│       ├── analytics.js       # Stability, trend, golden hour calc
│       ├── weekly-analytics.js  # Weekly block analytics
│       ├── year-comparison.js  # Year-over-year comparison
│       ├── state-engine.js     # Mood state classification
│       ├── insight-engine.js   # AI insight generation
│       ├── pattern-engine.js   # Pattern detection
│       ├── resilience-engine.js # Resilience tracking
│       ├── user-profile.js     # User profile, premium, theme
│       ├── voice-service.js    # Voice processing
│       ├── daily-snapshots.js  # Daily mood snapshots
│       ├── billing-service.js  # In-app purchases
│       └── drive-backup.js     # Google Drive backup/restore
```

## Key Patterns

### Screen navigation
Screens are loaded via `navigation.js`. Each screen module exports `onEnter(container)` or `initScreen(container)`. The container is a DOM element inside `#app`.

### State
Global state in `state.js` — `getMood()`, `setMood()`, `getAvatarState()`, `setAvatarState()`. Profile/premium in `user-profile.js`.

### i18n
`t("key")` for translations. Languages: ru, en, es, uk. `setLang(code)` persists choice.

### Theme system
Themes stored as `profile.colorTheme` in localStorage. Apply via `document.body.setAttribute("data-theme", theme)`. CSS uses `body[data-theme="..."]` selectors. Available themes: `default`, `purple-blue`, `purple-pink`, `ocean-blue` (premium), `warm-sunset` (premium).

### Premium
`isPremium()` from `user-profile.js`. Premium unlocks: themes, custom meditation tracks, advanced analytics, cloud backup. Trial: 7 days.

### Meditation custom tracks
Custom audio tracks stored in localStorage as `med_custom_tracks` (JSON array of `{name, src: data:url, builtin: false}`). Max 5 custom tracks, premium only.

### Audio in day popup (report.js)
Voice recordings stored in session history with `audio` field (data:url). Day popup iterates `dayVoiceMap` and renders inline `<audio>` players per recording.

## Common Issues
- Android WebView: avoid writing `slider.value` directly — triggers unwanted events
- Screen re-render: use `container.innerHTML = ...` then re-bind events
- Premium gating: always use `isPremium()` check before showing premium features
- Theme changes: dispatch `themeChanged` custom event for listeners

## AppRuntime Layer (ARL)
Anti-bug architecture layer for preventing UI/state desync.

### Core API
```js
import { AppRuntime } from "./core/appRuntime.js";

AppRuntime.initModule('moduleName', { /* initial state */ });
AppRuntime.setState('moduleName', { key: value }); // updates state and emits change
AppRuntime.getState('moduleName'); // returns module state
AppRuntime.subscribe('moduleName', (state) => { /* re-render */ });
```

### Event Delegation Standard
All dynamic lists use delegation instead of per-element listeners:
```js
container.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        // handle delete
    }
    if (e.target.closest('.track')) {
        // handle track click
    }
});
```

### CSS Constraints
Dynamic lists MUST have height constraints:
```css
.dynamic-list { max-height: 200px; overflow-y: auto; }
.fixed-controls { position: sticky; bottom: 0; }
```
