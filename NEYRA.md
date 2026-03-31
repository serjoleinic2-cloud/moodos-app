# NEYRA — Project Architecture Contract

---

## 0. PURPOSE

This document defines the architectural rules of the application.

It is the SINGLE SOURCE OF TRUTH for:

* system structure
* module boundaries
* data ownership
* architecture constraints

---

## 1. CORE PRINCIPLE

> The system is modular, state-driven, and UI-separated.

---

## 2. SYSTEM LAYERS

### LAYER 1 — AI CORE (TEXT INTELLIGENCE)

* Input: text
* Output: text response
* No access to UI or audio
* No side effects outside response generation

---

### LAYER 2 — VOICE JOURNAL SYSTEM

* audio recording
* storage
* playback
* history
* type: voice_note

**❌ No AI processing**
**❌ No UI business logic**

---

### LAYER 3 — EXPERIENCE SYSTEM (UI/UX LAYER)

All user-facing modules:

* Practices (Meditation, Breathing, Focus, Sleep, etc.)
* Insight (analytics & visualization)
* Voice UI (display only)
* History system
* Settings system
* Shared UI components (player, controls)

**RULES:**

* UI only
* No business logic
* Uses AppRuntime (ARL) as state source
* Fully extensible

---

## 3. STATE ARCHITECTURE (ARL)

* AppRuntime = single source of truth
* No duplicate state in modules
* All updates go through setState()
* UI = render(state)

---

## 4. EVENT SYSTEM RULE

* Only event delegation allowed
* No per-element listeners in dynamic lists

---

## 5. DATA CONTRACT RULE

Every entity MUST define:

* type
* schema
* lifecycle owner module

---

## 6. MODULE ISOLATION RULE

* AI cannot access Voice
* Voice cannot trigger AI
* UI cannot own state
* Modules cannot cross-modify each other

---

## 7. ANTI-PATTERNS (STRICTLY FORBIDDEN)

* mixed state sources
* DOM as state
* hidden side effects in render
* cross-layer direct calls
* duplicate arrays (standard/custom split without schema)

---

## 8. EXTENSIBILITY RULE

New features MUST:

1. define module ownership
2. define data schema
3. define layer placement
4. integrate via AppRuntime

---

## 9. VERSIONING RULE

This architecture evolves incrementally.

No full rewrites allowed without migration plan.
