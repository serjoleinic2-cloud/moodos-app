// ===============================
// MoodOS Offline AI
// ===============================

const responses = [

"You handled more than you think today.",
"Your emotional system may need rest.",
"This looks like cognitive fatigue.",
"Try slowing the pace slightly.",
"You seem to be processing something important.",
"A short walk may help reset your state.",
"Your mood pattern suggests recovery need.",
"Today looks emotionally active.",
"Consider lowering expectations today.",
"Your system may benefit from calm input."

];

// добавим вариативность до ~100
while (responses.length < 100) {
  responses.push(
    responses[Math.floor(Math.random()*10)]
  );
}

export function analyzeText(text, mood) {

  if (!text || text.length < 3) {
    return {
      insight: "Write a little more so I can understand.",
      emotion: "neutral",
      confidence: 0.3,
      tags: ["low_input"]
    };
  }

  let base =
    responses[
      Math.floor(Math.random() * responses.length)
    ];

  if (mood < 40) {
    base += " Be gentle with yourself today.";
  }

  if (mood > 70) {
    base += " This is a good moment to build momentum.";
  }

  // простая эмоциональная оценка
  let emotion = "neutral";

  if (mood < 35) emotion = "low";
  else if (mood > 70) emotion = "positive";

  return {
    insight: base,
    emotion,
    confidence: 0.75,
    tags: ["offline_ai"]
  };
}