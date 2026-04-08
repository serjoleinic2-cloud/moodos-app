# PROJECT STRUCTURE (SOURCE OF TRUTH)

d:\moodos-app\
  CLAUDE.md
  README.md
  PROJECT_BRAIN.md
  TASK_LOG.md
  checkpoint.md
  FREEZE_PROTOCOL.md
  auditclaude.md
  AUDIT.txt
  package.json
  capacitor.config.json
  MainActivity.java
  MODULE_MAP.md
  android\
    app\
      build.gradle
      build\
    .gradle\
    .idea\
    .kotlin\
  www\
    index.html
    manifest.json
    sw.js
    css\
      style.css
      avatar.css
    styles\
      design-system.css
    assets\
      avatar\
        neyra-avatar.svg
      audio\
        meditation\
          Celestial Tranquility.mp3
          Tibetan Serenity.mp3
    js\
      app.js
      navigation.js
      state.js
      system-core.js
      ui-controller.js
      avatar-controller.js
      i18n.js
      onboarding.js
      avatar.js
      premium-modal.js
      monthly-check.js
      core\
        appRuntime.js
        audioController.js
        audit-logger.js
        state-governance.js
        migration-registry.js
        state-execution-engine.js
        event-queue.js
      ai\
        offline-ai.js
        voice.js
        voice-analysis.js
        avatar-brain.js
      i18n\
        en.js
        es.js
        ru.js
        uk.js
        en.js.backup_before_audit
        es.js.backup_before_audit
        ru.js.backup_before_audit
        uk.js.backup_before_audit
      screens\
        home.js
        insight.js
        history.js
        report.js
        stability.js
        settings.js
        premium.js
        how-it-works.js
        tools.js
        breathing.js
        meditation.js
        visual-focus.js
        mind-dump.js
        tap-calm.js
        support-texts.js
        voice.js
        pdf-report.js
        paywall.js
      services\
        memory.js
        session-analytics.js
        analytics.js
        weekly-analytics.js
        year-comparison.js
        state-engine.js
        insight-engine.js
        pattern-engine.js
        resilience-engine.js
        user-profile.js
        voice-service.js
        daily-snapshots.js
        billing-service.js
        drive-backup.js

---

# FILE INDEX

- CLAUDE.md
- README.md
- PROJECT_BRAIN.md
- TASK_LOG.md
- checkpoint.md
- auditclaude.md
- AUDIT.txt
- package.json
- capacitor.config.json
- MainActivity.java
- MODULE_MAP.md
- android/app/build.gradle
- android/.gradle/8.14.3/gc.properties
- android/.idea/workspace.xml
- www/index.html
- www/manifest.json
- www/sw.js
- www/css/style.css
- www/css/avatar.css
- www/styles/design-system.css
- www/assets/audio/meditation/Celestial Tranquility.mp3
- www/assets/audio/meditation/Tibetan Serenity.mp3
- www/assets/avatar/neyra-avatar.svg
- www/js/app.js
- www/js/navigation.js
- www/js/state.js
- www/js/system-core.js
- www/js/ui-controller.js
- www/js/ui/avatar-controller.js
- www/js/i18n.js
- www/js/onboarding.js
- www/js/avatar.js
- www/js/premium-modal.js
- www/js/monthly-check.js
- www/js/core/appRuntime.js
- www/js/core/audioController.js
- www/js/ai/offline-ai.js
- www/js/ai/voice.js
- www/js/ai/voice-analysis.js
- www/js/ai/avatar-brain.js
- www/js/i18n/en.js
- www/js/i18n/es.js
- www/js/i18n/ru.js
- www/js/i18n/uk.js
- www/js/i18n/en.js.backup_before_audit
- www/js/i18n/es.js.backup_before_audit
- www/js/i18n/ru.js.backup_before_audit
- www/js/i18n/uk.js.backup_before_audit
- www/js/screens/home.js
- www/js/screens/insight.js
- www/js/screens/history.js
- www/js/screens/report.js
- www/js/screens/stability.js
- www/js/screens/settings.js
- www/js/screens/premium.js
- www/js/screens/how-it-works.js
- www/js/screens/tools.js
- www/js/screens/breathing.js
- www/js/screens/meditation.js
- www/js/screens/visual-focus.js
- www/js/screens/mind-dump.js
- www/js/screens/tap-calm.js
- www/js/screens/support-texts.js
- www/js/screens/voice.js
- www/js/screens/pdf-report.js
- www/js/screens/paywall.js
- www/js/services/memory.js
- www/js/services/session-analytics.js
- www/js/services/analytics.js
- www/js/services/weekly-analytics.js
- www/js/services/year-comparison.js
- www/js/services/state-engine.js
- www/js/services/insight-engine.js
- www/js/services/pattern-engine.js
- www/js/services/resilience-engine.js
- www/js/services/user-profile.js
- www/js/services/voice-service.js
- www/js/services/daily-snapshots.js
- www/js/services/billing-service.js
- www/js/services/drive-backup.js

---

# ARCHITECTURE BASELINE (FROZEN)

## L1 — CORE ENGINE
www/js/core/
- appRuntime.js
- audioController.js

## L2 — AI LAYER
www/js/ai/
- offline-ai.js
- avatar-brain.js
- voice.js
- voice-analysis.js (DEPRECATED)

## L3 — UI MODULES
www/js/screens/
- home.js
- insight.js
- history.js
- report.js
- stability.js
- settings.js
- premium.js
- how-it-works.js
- tools.js
- breathing.js
- meditation.js
- visual-focus.js
- mind-dump.js
- tap-calm.js
- support-texts.js
- voice.js
- pdf-report.js
- paywall.js

## L4 — MEDIA ENGINE
AudioController (singleton)

## SYSTEM
www/js/
- navigation.js
- state.js
- memory.js
- system-core.js
- i18n.js
- ui-controller.js
- onboarding.js
- avatar.js
- premium-modal.js
- monthly-check.js

## SERVICES
www/js/services/
- analytics.js
- billing-service.js
- daily-snapshots.js
- drive-backup.js
- insight-engine.js
- memory.js
- pattern-engine.js
- resilience-engine.js
- session-analytics.js
- state-engine.js
- user-profile.js
- voice-service.js
- weekly-analytics.js
- year-comparison.js

## I18N
www/js/i18n/
- en.js
- es.js
- ru.js
- uk.js

## STATIC
- www/css/style.css
- www/css/avatar.css
- www/styles/design-system.css
- www/index.html
- www/manifest.json
- www/sw.js
- www/assets/audio/meditation/*.mp3

---

# CHANGE POLICY

Структура может изменяться только если:

1. Есть конкретный баг или проблема
2. Есть объяснение "почему текущая структура не работает"
3. Есть описание последствий изменения

Иначе — запрещено

---

# RULES

- Любое изменение структуры запрещено без явного решения
- Любое перемещение файлов требует причины
- Любая новая папка должна быть объяснена
- Screens MUST have onEnter() / onExit()
- Screens MUST NOT contain audio logic directly
- Screens MUST use AudioController for audio
- Screens MUST use AppRuntime for state
- No inline styles (use design-system.css)

---

# PROHIBITION

Запрещено:
- "давай улучшим"
- "будет чище если"
- "на будущее лучше"
- Рефакторинг без бага
- Перемещение файлов без причины
- Переименование без причины
