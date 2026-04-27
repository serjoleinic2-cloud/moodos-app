Структура проекта
D:\moodos-app\
├── CLAUDE.md                    # Rules for AI
├── MODULE_MAP.md               
├── PROJECT_BRAIN.md            
├── TASK_LOG_ACTIVE.md          
├── package.json                # Dependencies
├── vite.config.js             # Vite config
├── capacitor.config.json      # Capacitor config
├── android/
│   └── app/src/main/
│       ├── java/com/neyra/app/
│       │   └── MainActivity.java
│       └── AndroidManifest.xml
├── www/                        # Source web files
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js                  # Service worker
│   ├── css/
│   │   ├── style.css
│   │   └── avatar.css
│   ├── styles/
│   │   └── design-system.css
│   ├── assets/
│   │   ├── avatar/
│   │   ├── audio/meditation/
│   │   └── icons/
│   ├── docs/
│   │   └── privacy.html
│   └── js/
│       ├── app.js
│       ├── navigation.js
│       ├── state.js
│       ├── system-core.js
│       ├── i18n.js
│       ├── avatar.js
│       ├── events.js
│       ├── onboarding.js
│       ├── ui-controller.js
│       ├── premium-modal.js
│       ├── monthly-check.js
│       ├── ai/
│       │   ├── offline-ai.js
│       │   ├── voice.js
│       │   ├── voice-analysis.js
│       │   └── avatar-brain.js
│       ├── core/                    # ARL layer
│       │   ├── appRuntime.js
│       │   ├── audioController.js
│       │   ├── audit-logger.js
│       │   ├── event-queue.js
│       │   ├── migration-registry.js
│       │   ├── state-governance.js
│       │   └── state-execution-engine.js
│       ├── screens/                 # UI screens
│       │   ├── home.js
│       │   ├── insight.js
│       │   ├── history.js
│       │   ├── report.js
│       │   ├── stability.js
│       │   ├── settings.js
│       │   ├── premium.js
│       │   ├── paywall.js
│       │   ├── tools.js
│       │   ├── breathing.js
│       │   ├── meditation.js
│       │   ├── visual-focus.js
│       │   ├── mind-dump.js
│       │   ├── tap-calm.js
│       │   ├── voice.js
│       │   ├── pdf-report.js
│       │   ├── support-texts.js
│       │   ├── how-it-works.js
│       │   ├── data-storage.js
│       │   └── medals.js
│       ├── services/               # Business logic
│       │   ├── user-profile.js     # ⭐ Premium logic
│       │   ├── billing-service.js # ⭐ In-app purchases
│       │   ├── memory.js
│       │   ├── analytics.js
│       │   ├── insight-engine.js
│       │   ├── pattern-engine.js
│       │   ├── resilience-engine.js
│       │   ├── daily-snapshots.js
│       │   ├── weekly-analytics.js
│       │   ├── year-comparison.js
│       │   ├── session-analytics.js
│       │   ├── state-engine.js
│       │   ├── backup-service.js
│       │   ├── drive-backup.js
│       │   ├── cloud-restore.js
│       │   ├── storage-wrapper.js
│       │   ├── checkpoint-manager.js
│       │   ├── voice-service.js
│       │   ├── exit-guard.js
│       │   ├── backup-reminder.js
│       │   ├── userId.js
│       │   ├── reminders-service.js
│       │   ├── challenge-engine.js
│       │   └── medals-engine.js
│       ├── i18n/                  # Translations (5 langs)
│       │   ├── ru.js
│       │   ├── en.js
│       │   ├── es.js
│       │   ├── uk.js
│       │   └── hi.js
│       └── ui/
│           └── avatar-controller.js
└── dist/                       # Vite build output