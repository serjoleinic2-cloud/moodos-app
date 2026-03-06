// ===============================
// MoodOS Report Screen
// ===============================

import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";

let currentPeriod = 7;

export function onEnter() {
  renderReport();
  setupPeriodButtons();
}

function setupPeriodButtons() {
  const buttons = document.querySelectorAll(".period-btn");

  buttons.forEach(btn => {
    btn.onclick = () => {
      currentPeriod = Number(btn.dataset.days);
      renderReport();
    };
  });
}

function renderReport() {

  const container =
    document.getElementById("report-content");

  if (!container) return;

  const history = getMoodHistory();

  if (!history || history.length === 0) {
    container.innerHTML =
      "<p>No data to generate report.</p>";
    return;
  }

  const filtered = filterByDays(history, currentPeriod);

  if (filtered.length === 0) {
    container.innerHTML =
      "<p>No data for selected period.</p>";
    return;
  }

  const average =
    Math.round(
      filtered.reduce((s, h) => s + h.value, 0) /
      filtered.length
    );

  const best =
    filtered.reduce((a, b) =>
      a.value > b.value ? a : b
    );

  const worst =
    filtered.reduce((a, b) =>
      a.value < b.value ? a : b
    );

  const stability =
    calculateStabilityScore(filtered);

  let stateText = "Balanced state.";

  if (average < 40) stateText = "You may be under emotional pressure.";
  if (average > 70) stateText = "You are generally in a strong emotional state.";

  container.innerHTML = `
    <div class="report-header">
      <h2>Как я живу в целом?</h2>
      <p>Last ${currentPeriod} days overview</p>
    </div>

    <div class="period-switch">
      <button class="period-btn" data-days="7">7 days</button>
      <button class="period-btn" data-days="30">30 days</button>
      <button class="period-btn" data-days="99999">All</button>
    </div>

    <div class="report-block">
      <h3>Total Entries</h3>
      <p>${filtered.length}</p>
    </div>

    <div class="report-block">
      <h3>Average Mood</h3>
      <p>${average}</p>
    </div>

    <div class="report-block">
      <h3>Stability Score</h3>
      <p>${stability ?? "..."}</p>
    </div>

    <div class="report-block">
      <h3>Best Moment</h3>
      <p>${new Date(best.time).toLocaleString()} — ${best.value}</p>
    </div>

    <div class="report-block">
      <h3>Lowest Moment</h3>
      <p>${new Date(worst.time).toLocaleString()} — ${worst.value}</p>
    </div>

    <div class="report-block">
      <h3>Overall Interpretation</h3>
      <p>${stateText}</p>
    </div>
  `;

  setupPeriodButtons();
}

function filterByDays(history, days) {

  if (days > 3650) return history;

  const now = Date.now();
  const limit = days * 24 * 60 * 60 * 1000;

  return history.filter(entry =>
    now - new Date(entry.time).getTime() <= limit
  );
}