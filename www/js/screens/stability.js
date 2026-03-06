// ===============================
// MoodOS Stability Screen
// ===============================

import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";

export function onEnter() {

  const container =
    document.getElementById("stability-content");

  if (!container) return;

  const history = getMoodHistory();

  if (!history || history.length < 2) {
    container.innerHTML =
      "<p>Not enough data to calculate stability.</p>";
    return;
  }

  const stability =
    calculateStabilityScore(history);

  const volatility =
    100 - stability;

  let levelText = "Moderate emotional movement.";

  if (stability >= 85)
    levelText = "Highly stable emotional system.";
  else if (stability >= 65)
    levelText = "Generally stable with natural variation.";
  else if (stability >= 45)
    levelText = "Noticeable emotional swings.";
  else
    levelText = "High volatility. Emotional turbulence present.";

  const last10 =
    history.slice(-10).reverse();

  container.innerHTML = `
    <div class="stability-header">
      <h2>Насколько я устойчив?</h2>
      <p>Emotional volatility analysis</p>
    </div>

    <div class="stability-block">
      <h3>Stability Score</h3>
      <p>${stability}%</p>
    </div>

    <div class="stability-block">
      <h3>Volatility Level</h3>
      <p>${volatility}%</p>
    </div>

    <div class="stability-block">
      <h3>Interpretation</h3>
      <p>${levelText}</p>
    </div>

    <div class="stability-block">
      <h3>Last 10 Entries</h3>
      ${last10
        .map(e =>
          `<p>${new Date(e.time).toLocaleString()} — ${e.value}</p>`
        )
        .join("")}
    </div>

    <div class="stability-block">
      <h3>What this means</h3>
      <p>
      Stability measures how predictable your emotional pattern is.
      High stability means small fluctuations.
      Low stability means stronger emotional swings.
      </p>
    </div>
  `;
}