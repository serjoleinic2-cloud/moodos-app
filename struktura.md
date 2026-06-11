Структура проекта
D:\moodos-app\
├── FREEZE_PROTOCOL.md           # Architecture freeze rules
├── MODULE_MAP.md               
├── TASK_LOG_ACTIVE.md          
├── Правила.txt                 # AI rules
├── package.json                # Dependencies
├── vite.config.js             # Vite config
├── capacitor.config.json      # Capacitor config
├── gradle.properties          # Gradle config
├── .gitignore
├── android/
│   ├── .gitignore
│   ├── app/
│   │   ├── build.gradle
│   │   ├── capacitor.build.gradle
│   │   ├── proguard-rules.pro
│   │   ├── google-services.json.example
│   │   ├── neyra-release-key.jks
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/neyra/app/
│   │       │   └── MainActivity.java
│   │       ├── assets/
│   │       │   ├── capacitor.config.json
│   │       │   ├── capacitor.plugins.json
│   │       │   └── public/        # Копия dist для APK
│   │       ├── res/               # Android resources
│   │       └── ic_launcher-playstore.png
│   └── gradle/
├── dist/                        # Vite build output
│   ├── index.html
│   ├── assets/                  # Bundled JS/CSS (hash names)
│   ├── css/
│   ├── styles/
│   ├── icons/
│   ├── audio/meditation/
│   ├── avatar/
│   ├── bg/
│   ├── manifest.json
│   └── sw.js
├── www/                         # Source web files
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js                   # Service worker
│   ├── css/
│   │   ├── style.css
│   │   ├── avatar.css
│   │   ├── theme-deep-ocean.css      # Premium theme
│   │   ├── theme-purple-blue.css     # Free theme
│   │   ├── theme-purple-pink.css     # Free theme
│   │   └── theme-warm-sunset.css     # Premium theme
│   ├── styles/
│   │   └── design-system.css
│   ├── assets/
│   │   ├── avatar/
│   │   ├── bg/
│   │   ├── audio/meditation/
│   │   └── icons/
│   │       └── player/
│   ├── js/
│   │   ├── app.js
│   │   ├── navigation.js
│   │   ├── state.js
│   │   ├── system-core.js
│   │   ├── i18n.js
│   │   ├── avatar.js
│   │   ├── events.js
│   │   ├── onboarding.js
│   │   ├── ui-controller.js
│   │   ├── premium-modal.js
│   │   ├── monthly-check.js
│   │   ├── ai/
│   │   │   ├── offline-ai.js
│   │   │   ├── voice.js
│   │   │   ├── voice-analysis.js
│   │   │   ├── avatar-brain.js
│   │   │   ├── avatar-letter-engine.js
│   │   │   ├── avatar-letters-ru.js
│   │   │   ├── avatar-letters-en.js
│   │   │   ├── avatar-letters-es.js
│   │   │   ├── avatar-letters-uk.js
│   │   │   ├── avatar-letters-hi.js
│   │   │   ├── home-greetings.js
│   │   │   ├── challenge-texts-en.js
│   │   │   ├── challenge-texts-es.js
│   │   │   ├── challenge-texts-hi.js
│   │   │   ├── challenge-texts-ru.js
│   │   │   ├── challenge-texts-uk.js
│   │   │   └── medals-texts-ru.js
│   │   ├── core/                    # ARL layer
│   │   │   ├── appRuntime.js
│   │   │   ├── audioController.js
│   │   │   ├── audit-logger.js
│   │   │   ├── event-queue.js
│   │   │   ├── migration-registry.js
│   │   │   └── state-execution-engine.js
│   │   ├── screens/                 # UI screens
│   │   │   ├── home.js
│   │   │   ├── insight.js
│   │   │   ├── history.js
│   │   │   ├── report.js
│   │   │   ├── stability.js
│   │   │   ├── settings.js
│   │   │   ├── premium.js
│   │   │   ├── paywall.js
│   │   │   ├── tools.js
│   │   │   ├── breathing.js
│   │   │   ├── meditation.js
│   │   │   ├── visual-focus.js
│   │   │   ├── mind-dump.js
│   │   │   ├── tap-calm.js
│   │   │   ├── voice.js
│   │   │   ├── pdf-report.js
│   │   │   ├── support-texts.js
│   │   │   ├── how-it-works.js
│   │   │   ├── data-storage.js
│   │   │   └── medals.js
│   │   ├── services/               # Business logic
│   │   │   ├── user-profile.js     # ⭐ Premium logic
│   │   │   ├── billing-service.js  # ⭐ In-app purchases
│   │   │   ├── memory.js
│   │   │   ├── analytics.js
│   │   │   ├── daily-snapshots.js
│   │   │   ├── insight-engine.js
│   │   │   ├── pattern-engine.js
│   │   │   ├── resilience-engine.js
│   │   │   ├── weekly-analytics.js
│   │   │   ├── year-comparison.js
│   │   │   ├── session-analytics.js
│   │   │   ├── state-engine.js
│   │   │   ├── backup-service.js
│   │   │   ├── drive-backup.js
│   │   │   ├── cloud-restore.js
│   │   │   ├── checkpoint-manager.js
│   │   │   ├── voice-service.js
│   │   │   ├── exit-guard.js
│   │   │   ├── backup-reminder.js
│   │   │   ├── reminders-service.js
│   │   │   ├── challenge-engine.js
│   │   │   └── medals-engine.js
│   │   ├── i18n/                    # Translations (5 langs)
│   │   │   ├── ru.js
│   │   │   ├── en.js
│   │   │   ├── es.js
│   │   │   ├── uk.js
│   │   │   └── hi.js
│   │   └── ui/
│   │       ├── avatar-controller.js
│   │       └── letter-overlay.js
