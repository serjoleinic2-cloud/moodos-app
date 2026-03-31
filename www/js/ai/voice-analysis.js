// ===============================
// Neyra Voice Analysis
// DEPRECATED — AI analysis for voice notes is no longer used
// Voice notes are now simple recordings without AI processing
// ===============================

// This file is kept for backwards compatibility but is no longer called
// Recording flow: voice.js → saves to localStorage → shown in history.js

export function analyzeLatestVoice() {
  console.warn('[voice-analysis] DEPRECATED: AI voice analysis is no longer performed');
  return null;
}
