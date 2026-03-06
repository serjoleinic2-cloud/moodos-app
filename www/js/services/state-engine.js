// js/services/state-engine.js

export function detectMoodState(mood) {

    if (mood === null || mood === undefined) {
        return "NEUTRAL"
    }

    if (mood < 25) return "LOW"
    if (mood < 40) return "STRESSED"
    if (mood < 60) return "NEUTRAL"
    if (mood < 80) return "GOOD"

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