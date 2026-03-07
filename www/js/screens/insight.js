// ===============================
// MoodOS Insight Screen
// ===============================

import { getMoodHistory } from "../services/memory.js";
import {
  calculateStabilityScore,
  calculateTrend,
  calculateGoldenHour
} from "../services/analytics.js";
import {
  getEffectivenessRate,
  getAverageMoodLift,
  getEffectivenessByState,
  getFullSessionStats,
  getPersonalRecommendation
} from "../services/session-analytics.js";
import { detectMoodState, getStateLabel } from "../services/state-engine.js";
import { getMood } from "../state.js";

export function onEnter() {
  const container = document.getElementById("insight-content");
  if (!container) return;

  const history = getMoodHistory();
  const mood    = getMood();
  const state   = detectMoodState(mood);
  const stats   = getFullSessionStats();

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; margin-top:60px; color:#888;">
        <div style="font-size:48px;">📊</div>
        <div style="margin-top:12px;">Начни отслеживать настроение — здесь появится твоя аналитика.</div>
      </div>`;
    return;
  }

  const stability      = calculateStabilityScore(history);
  const trend          = calculateTrend(history);
  const golden         = calculateGoldenHour(history);
  const avgMood        = Math.round(history.reduce((s, h) => s + h.value, 0) / history.length);
  const recommendation = getPersonalRecommendation(state);

  const breathingRate     = getEffectivenessRate("breathing");
  const meditationRate    = getEffectivenessRate("meditation");
  const breathingLift     = getAverageMoodLift("breathing");
  const meditationLift    = getAverageMoodLift("meditation");
  const breathingByState  = getEffectivenessByState("breathing");
  const meditationByState = getEffectivenessByState("meditation");

  container.innerHTML = `
    <style>
      .insight-section { margin-bottom: 28px; }
      .insight-section-title {
        font-size: 13px; color: #555; font-weight: 700;
        margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px;
      }

      /* FLIP CARD */
      .flip-wrap {
        perspective: 1000px;
        margin-bottom: 16px;
        cursor: pointer;
      }
      .flip-inner {
        position: relative;
        width: 100%;
        height: 110px;
        transform-style: preserve-3d;
        transition: transform 0.5s ease;
        border-radius: 18px;
      }
      .flip-wrap.flipped .flip-inner {
        transform: rotateY(180deg);
        height: 180px;
      }
      .flip-front, .flip-back {
        position: absolute; top: 0; left: 0;
        width: 100%; height: 100%;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        border-radius: 18px;
        padding: 16px 18px;
        box-sizing: border-box;
        background: #e0e5ec;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
      }
      .flip-back {
        transform: rotateY(180deg);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .flip-label {
        font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.4px;
      }
      .flip-value {
        font-size: 32px; font-weight: bold; color: #333; line-height: 1.1;
      }
      .flip-sub {
        font-size: 13px; color: #555; margin-top: 6px;
      }
      .flip-hint {
        font-size: 11px; color: #999;
        position: absolute; bottom: 10px; right: 14px;
      }

      .rec-card {
        padding: 18px; border-radius: 18px;
        background: #e0e5ec;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        margin-bottom: 16px;
      }

      .state-row {
        display: flex; justify-content: space-between;
        padding: 12px 14px; border-radius: 12px;
        background: #e0e5ec;
        box-shadow: 3px 3px 7px #b8bec7, -3px -3px 7px #ffffff;
        margin-bottom: 10px;
        font-size: 14px; color: #444;
      }
    </style>

    <div style="padding: 16px; padding-bottom: 100px;">

      <h2 style="margin-bottom: 6px;">Что я о себе узнаю?</h2>
      <div style="font-size:14px; color:#555; margin-bottom:24px;">
        Текущее состояние: <strong>${getStateLabel(state)}</strong>
      </div>

      <!-- РЕКОМЕНДАЦИЯ -->
      <div class="insight-section">
        <div class="insight-section-title">💡 Личная рекомендация</div>
        <div class="rec-card">
          <div style="font-size:15px; color:#444; line-height:1.6;">${recommendation}</div>
        </div>
      </div>

      <!-- ОСНОВНЫЕ МЕТРИКИ -->
      <div class="insight-section">
        <div class="insight-section-title">📈 Твоя статистика</div>

        <div class="flip-wrap" id="flip-stability">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Стабильность</div>
              <div class="flip-value" style="color:${stabilityColor(stability)}">${stability ?? "—"}%</div>
              <div class="flip-sub">${stabilityText(stability)}</div>
              <div class="flip-hint">нажми для графика ↩</div>
            </div>
            <div class="flip-back">
              <canvas id="chartStability"></canvas>
            </div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-mood">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Среднее настроение</div>
              <div class="flip-value" style="color:${moodColor(avgMood)}">${avgMood}%</div>
              <div class="flip-sub">${moodText(avgMood)}</div>
              <div class="flip-hint">нажми для графика ↩</div>
            </div>
            <div class="flip-back">
              <canvas id="chartMood"></canvas>
            </div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-trend">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Тренд</div>
              <div class="flip-value" style="font-size:26px;">${trend}</div>
              <div class="flip-sub">Последние записи vs предыдущие</div>
              <div class="flip-hint">нажми для деталей ↩</div>
            </div>
            <div class="flip-back" style="flex-direction:column; gap:8px; padding:20px;">
              <div style="font-size:15px; color:#444; text-align:center; line-height:1.6;">${trendExplain(trend)}</div>
            </div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-golden">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Золотые часы</div>
              <div class="flip-value" style="font-size:22px;">⭐ ${goldenShort(golden)}</div>
              <div class="flip-sub">Твой пик активности</div>
              <div class="flip-hint">нажми для графика ↩</div>
            </div>
            <div class="flip-back">
              <canvas id="chartHours"></canvas>
            </div>
          </div>
        </div>

      </div>

      <!-- ПРАКТИКИ -->
      ${stats ? `
      <div class="insight-section">
        <div class="insight-section-title">🫁 Эффективность практик</div>

        <div class="flip-wrap" id="flip-breathing">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Дыхание</div>
              <div class="flip-value" style="color:${rateColor(breathingRate)}">${breathingRate ?? "—"}%</div>
              <div class="flip-sub">
                ${breathingLift !== null ? `Подъём настроения: +${breathingLift} pts` : "Нет данных"}
                · ${stats.breathingSessions ?? 0} сессий
              </div>
              <div class="flip-hint">нажми для деталей ↩</div>
            </div>
            <div class="flip-back" style="flex-direction:column; align-items:center; justify-content:center;">
              <canvas id="chartBreathing" width="120" height="120"></canvas>
            </div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-meditation">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Медитация</div>
              <div class="flip-value" style="color:${rateColor(meditationRate)}">${meditationRate ?? "—"}%</div>
              <div class="flip-sub">
                ${meditationLift !== null ? `Подъём настроения: +${meditationLift} pts` : "Нет данных"}
                · ${stats.meditationSessions ?? 0} сессий
              </div>
              <div class="flip-hint">нажми для деталей ↩</div>
            </div>
            <div class="flip-back" style="flex-direction:column; align-items:center; justify-content:center;">
              <canvas id="chartMeditation" width="120" height="120"></canvas>
            </div>
          </div>
        </div>

      </div>

      <div class="insight-section">
        <div class="insight-section-title">🧠 При каком состоянии что помогает</div>
        ${buildStateTable(breathingByState, meditationByState)}
      </div>
      ` : `
      <div class="insight-section">
        <div class="rec-card" style="text-align:center; color:#777; font-size:14px; line-height:1.6;">
          Пройди несколько сессий практик — здесь появится аналитика эффективности.
        </div>
      </div>
      `}

    </div>
  `;

  // ---- FLIP ЛОГИКА ----
  document.querySelectorAll(".flip-wrap").forEach(wrap => {
    wrap.addEventListener("click", () => {
      const wasFlipped = wrap.classList.contains("flipped");
      document.querySelectorAll(".flip-wrap").forEach(w => w.classList.remove("flipped"));
      if (!wasFlipped) {
        wrap.classList.add("flipped");
        setTimeout(() => initChartFor(wrap.id, history, stats), 300);
      }
    });
  });
}

// ---- ГРАФИКИ ----
function destroyChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const existing = window.Chart?.getChart(canvas);
  if (existing) existing.destroy();
}

function initChartFor(id, history, stats) {
  if (id === "flip-stability") {
    destroyChart("chartStability");
    drawStabilityChart(history);
  }
  if (id === "flip-mood") {
    destroyChart("chartMood");
    drawMoodChart(history);
  }
  if (id === "flip-golden") {
    destroyChart("chartHours");
    drawHoursChart(history);
  }
  if (id === "flip-breathing") {
    destroyChart("chartBreathing");
    drawPieChart("chartBreathing", stats?.breathingRate ?? 0, "#4db8ff");
  }
  if (id === "flip-meditation") {
    destroyChart("chartMeditation");
    drawPieChart("chartMeditation", stats?.meditationRate ?? 0, "#9f7aea");
  }
}

function chartSize(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.closest(".flip-back");
  if (parent) {
    canvas.width  = parent.offsetWidth  - 32;
    canvas.height = parent.offsetHeight - 24;
  }
}

function drawMoodChart(history) {
  destroyChart("chartMood");
  const canvas = document.getElementById("chartMood");
  if (!canvas || !window.Chart) return;
  chartSize("chartMood");
  const daily = buildDailyMood(history);
  if (!daily.length) return;

  new window.Chart(canvas, {
    type: "line",
    data: {
      labels: daily.map(d => d.date.slice(5)),
      datasets: [{ data: daily.map(d => d.avg), borderColor: "#4db8ff", backgroundColor: "rgba(77,184,255,0.15)", tension: 0.4, pointRadius: 3, fill: true }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 10 }, color: "#555" } }, x: { ticks: { font: { size: 9 }, color: "#555" } } } }
  });
}

function drawStabilityChart(history) {
  destroyChart("chartStability");
  const canvas = document.getElementById("chartStability");
  if (!canvas || !window.Chart) return;
  chartSize("chartStability");

  const points = [];
  for (let i = 4; i < history.length; i++) {
    const slice = history.slice(i - 4, i + 1);
    const avg = slice.reduce((s, h) => s + h.value, 0) / slice.length;
    const variance = slice.reduce((s, h) => s + Math.pow(h.value - avg, 2), 0) / slice.length;
    const stab = Math.round(Math.max(5, Math.min(100, 100 - Math.sqrt(variance))));
    const d = new Date(history[i].time);
    points.push({ label: `${d.getDate()}.${d.getMonth()+1}`, value: stab });
  }

  new window.Chart(canvas, {
    type: "line",
    data: {
      labels: points.map(p => p.label),
      datasets: [{ data: points.map(p => p.value), borderColor: "#4caf87", backgroundColor: "rgba(76,175,135,0.15)", tension: 0.4, pointRadius: 3, fill: true }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 10 }, color: "#555" } }, x: { ticks: { font: { size: 9 }, color: "#555" } } } }
  });
}

function drawHoursChart(history) {
  destroyChart("chartHours");
  const canvas = document.getElementById("chartHours");
  if (!canvas || !window.Chart) return;
  chartSize("chartHours");

  const hours = {};
  history.forEach(e => {
    const h = new Date(e.time).getHours();
    if (!hours[h]) hours[h] = { total: 0, count: 0 };
    hours[h].total += e.value;
    hours[h].count++;
  });
  const labels = Object.keys(hours).sort((a,b) => a-b);
  const data   = labels.map(h => Math.round(hours[h].total / hours[h].count));

  new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: labels.map(h => `${h}:00`),
      datasets: [{ data, backgroundColor: data.map(v => v >= 70 ? "#4caf87" : v >= 40 ? "#f0a500" : "#e05555"), borderRadius: 6 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 10 }, color: "#555" } }, x: { ticks: { font: { size: 9 }, color: "#555" } } } }
  });
}

function drawPieChart(canvasId, rate, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;

  new window.Chart(canvas, {
    type: "doughnut",
    data: {
      datasets: [{ data: [rate, 100 - rate], backgroundColor: [color, "#d0d5de"], borderWidth: 0 }]
    },
    options: {
      cutout: "70%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    },
    plugins: [{
      id: "centerText",
      afterDraw(chart) {
        const { ctx, chartArea: { width, height, left, top } } = chart;
        ctx.save();
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${rate ?? 0}%`, left + width / 2, top + height / 2);
        ctx.restore();
      }
    }]
  });
}

function buildStateTable(breathingByState, meditationByState) {
  const states = ["LOW", "STRESSED", "NEUTRAL", "GOOD", "HIGH"];
  const labels = { LOW: "😔 Низкое", STRESSED: "😤 Стресс", NEUTRAL: "😐 Нейтральное", GOOD: "😊 Хорошее", HIGH: "🤩 Отличное" };

  let html = `
    <div style="display:flex; gap:8px; margin-bottom:10px; font-size:12px; color:#555; font-weight:600; padding:0 4px;">
      <div style="flex:2;">Состояние</div>
      <div style="flex:1; text-align:center;">🫁</div>
      <div style="flex:1; text-align:center;">🧘</div>
    </div>`;

  let hasAny = false;
  states.forEach(state => {
    const b = breathingByState[state];
    const m = meditationByState[state];
    if (!b && !m) return;
    hasAny = true;
    html += `
      <div class="state-row">
        <div style="flex:2;">${labels[state]}</div>
        <div style="flex:1; text-align:center; color:${rateColor(b?.rate)}; font-weight:600;">${b ? b.rate + "%" : "—"}</div>
        <div style="flex:1; text-align:center; color:${rateColor(m?.rate)}; font-weight:600;">${m ? m.rate + "%" : "—"}</div>
      </div>`;
  });

  return hasAny ? html : `<div style="color:#777; font-size:14px;">Пока нет данных по состояниям.</div>`;
}

function buildDailyMood(history) {
  const byDay = {};
  history.forEach(e => {
    const d = new Date(e.time);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e.value);
  });
  return Object.keys(byDay).sort().map(date => ({
    date,
    avg: Math.round(byDay[date].reduce((a,b) => a+b, 0) / byDay[date].length)
  }));
}

function stabilityColor(s) {
  if (!s) return "#888";
  if (s >= 75) return "#4caf87";
  if (s >= 50) return "#f0a500";
  return "#e05555";
}

function stabilityText(s) {
  if (!s) return "Нет данных";
  if (s >= 85) return "Высокая стабильность";
  if (s >= 65) return "Умеренная стабильность";
  if (s >= 45) return "Заметные перепады";
  return "Высокая волатильность";
}

function moodColor(v) {
  if (v >= 70) return "#4caf87";
  if (v >= 40) return "#f0a500";
  return "#e05555";
}

function moodText(v) {
  if (v >= 70) return "Эмоциональное состояние сильное";
  if (v >= 40) return "Относительно стабильное";
  return "Требует внимания";
}

function rateColor(r) {
  if (!r) return "#888";
  if (r >= 70) return "#4caf87";
  if (r >= 40) return "#f0a500";
  return "#e05555";
}

function trendExplain(trend) {
  if (typeof trend === "string" && trend.includes("improving")) return "Последние записи лучше предыдущих. Ты на подъёме — продолжай в том же духе.";
  if (typeof trend === "string" && trend.includes("declining")) return "Последние записи ниже предыдущих. Возможно стоит уделить внимание практикам или отдыху.";
  return "Твоё состояние стабильно без резких изменений.";
}

function goldenShort(golden) {
  if (!golden) return "нет данных";
  const match = String(golden).match(/\d{1,2}:\d{2}[–-]\d{1,2}:\d{2}/);
  return match ? match[0] : String(golden);
}