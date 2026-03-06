// ===============================
// MoodOS Voice Analysis
// ===============================

import { getMood } from "../state.js";
import { analyzeText } from "./offline-ai.js";

let lastAnalyzedTime = null;

export function analyzeLatestVoice() {

  const history =
    JSON.parse(localStorage.getItem("voice_history")) || [];

  if (history.length === 0) return null;

  const lastVoice = history[history.length - 1];

  // защита от повторного анализа
  //if (lastAnalyzedTime === lastVoice.time) {
    //return null;
  //}

  lastAnalyzedTime = lastVoice.time;

  const mood = getMood();

  const syntheticText =
    "User recorded a voice reflection.";

  const result =
    analyzeText(syntheticText, mood);

  let insights =
    JSON.parse(
      localStorage.getItem("voice_insights")
    ) || [];

  insights.push({
    time: lastVoice.time,
    mood,
    insight: result.insight
  });

  localStorage.setItem(
    "voice_insights",
    JSON.stringify(insights)
  );

  console.log(
    "Voice insight created:",
    result.insight
  );

  return result; // ✅ КЛЮЧЕВАЯ СТРОКА
}