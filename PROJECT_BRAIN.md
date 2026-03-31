# PROJECT BRAIN — SYSTEM CORE

## 1. PROJECT TYPE
Local-first AI wellness app

AI = text-first  
Audio = optional subsystem (NOT core)

---

## 2. ARCHITECTURE LAYERS

### L1 — CORE ENGINE
- AppRuntime (state)
- Navigation
- Storage
- Module registry

### L2 — AI LAYER
- text input → response pipeline
- no audio dependency

### L3 — UI MODULES
- Meditation
- Insight
- Settings
- History
- Player UI

### L4 — MEDIA ENGINE
AudioController (singleton)

RULES:
- ONLY ONE audio instance
- UI never controls audio directly
- AudioController = source of truth

---

## 3. GLOBAL RULES

- No inline styles (use design system)
- Screens MUST have:
  - onEnter()
  - onExit()
- No logic duplication across screens
- AppRuntime = single state source

---

## 4. AUDIO RULES (CRITICAL)

- stop on exit
- stop on tab hidden
- destroy clears everything
- no background playback allowed
- no duplicate subscriptions

---

## 5. DESIGN PHILOSOPHY

UI = thin layer  
Core = truth  
Engine = deterministic state machine

# DEV LOOP PROTOCOL (CRITICAL RULE)

## RULE 1 — TASK EXECUTION FLOW
Every task must follow this sequence:

1. Implement code changes
2. Ensure no breaking changes to existing stable modules
3. Update TASK_LOG.md
4. Update MODULE_MAP.md (if structure changed)
5. Update PROJECT_BRAIN.md (ONLY if architecture or rules changed)

---

## RULE 2 — OPENCODE RESPONSIBILITY

All OpenCode tasks MUST include:

- exact file changes
- explicit list of modifications
- confirmation section with affected features

---

## RULE 3 — NO SILENT CHANGES

- No hidden refactors
- No renaming without logging
- No architecture changes without updating PROJECT_BRAIN.md

---

## RULE 4 — STATE CONSISTENCY

If code changes:
- Audio logic → must update AudioController rules
- Screen logic → must update MODULE_MAP
- Bug fix → must update TASK_LOG

---

## RULE 5 — SINGLE SOURCE OF TRUTH

- AppRuntime = state source
- AudioController = audio source
- PROJECT_BRAIN.md = architecture source
- TASK_LOG.md = history source

# TASK GENERATOR PROTOCOL (TGP v1)

## PURPOSE
Convert raw user bug reports into structured engineering tasks for OpenCode execution.

---

## INPUT FORMAT (USER)

User writes:
- BUG description
- OR feature request
- OR unexpected behavior

No structure required.

---

## OUTPUT FORMAT (SYSTEM MUST GENERATE)

Every request MUST be transformed into:

### 1. TASK TITLE
Clear engineering name

### 2. CONTEXT
What system/module is affected

### 3. ROOT CAUSE HYPOTHESIS
Likely technical reason (if applicable)

### 4. IMPLEMENTATION PLAN
Step-by-step changes

### 5. AFFECTED FILES
Explicit file list

### 6. OPENCODE TASK
Final execution-ready task

### 7. RISK NOTES
What might break

---

## RULES

- NEVER ask user to structure input
- ALWAYS assume missing context from PROJECT_BRAIN.md
- ALWAYS align with architecture rules
- NEVER suggest rewriting full system unless critical
- Prefer minimal safe patch over refactor

---

## PRIORITY ORDER

1. Stability > Features
2. Determinism > Flexibility
3. No regression > Optimization

DO NOT REFACTOR WORKING UI BINDING LOGIC
ONLY FIX BUG BEHAVIOR