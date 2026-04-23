// ⚠️ Использовать только через SystemCore
// js/services/state-engine.js
import { getMoodBaseline } from './user-profile.js';

export function detectMoodState(mood) {
    if (mood === null || mood === undefined) {
        return "NEUTRAL"
    }

    // Берём персональную базу юзера (учитывает medEffect и baseFeeling)
    const baseline = getMoodBaseline(); // 35–58, default 50
    const offset = baseline - 50; // смещение от нейтрального

    // Применяем offset к порогам — юзер на седативных имеет сдвинутую норму
    if (mood < 25 + offset) return "LOW"
    if (mood < 40 + offset) return "STRESSED"
    if (mood < 60 + offset) return "NEUTRAL"
    if (mood < 80 + offset) return "GOOD"

    return "HIGH"
}

export function getStateLabel(state){

 switch(state){

  case "LOW":
   return "Low mood"

  case "STRESSED":
   return "Stressed"

  case "NEUTRAL":
   return "Neutral"

  case "GOOD":
   return "Good"

  case "HIGH":
   return "Very good"

  default:
   return "Unknown"

 }

}

export async function analyze(input) {
  const state = detectMoodState(input)
  const label = getStateLabel(state)
  return { state, label }
}