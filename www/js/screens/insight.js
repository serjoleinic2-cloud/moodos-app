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

  const history   = getMoodHistory();
  const mood      = getMood();
  const state     = detectMoodState(mood);
  const stats     = getFullSessionStats();

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; margin-top:60px; color:#888;">
        <div style="font-size:48px;">📊</div>
        <div style="margin-top:12px;">Начни отслеживать настроение — здесь появится твоя аналитика.</div>
      </div>`;
    return;
  }

  const stability  = calculateStabilityScore(history);
  const trend      = calculateTrend(history);
  const golden     = calculateGoldenHour(history);
  const avgMood    = Math.round(history.reduce((s, h) => s + h.value, 0) / history.length);
  const recommendation = getPersonalRecommendation(state);

  const breathingRate   = getEffectivenessRate("breathing");
  const meditationRate  = getEffectivenessRate("meditation");
  const breathingLift   = getAverageMoodLift("breathing");
  const meditationLift  = getAverageMoodLift("meditation");
  const breathingByState  = getEffectivenessByState("breathing");
  const meditationByState = getEffectivenessByState("meditation");

  // Суточная агрегация для графика
  const dailyData = buildDailyMood(history);

  // Перевод тренда на русский
  const trendRu = translateTrend(trend);

  // Перевод статуса состояния на русский
  const stateLabelRu = translateStateLabel(getStateLabel(state));

  container.innerHTML = `
    <style>
      .insight-section { margin-bottom: 24px; }
      .insight-section-title {
        font-size: 13px; color: #888; font-weight: 600;
        margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;
      }

      /* FLIP CARD */
      .flip-wrap {
        perspective: 1000px;
        margin-bottom: 12px;
        cursor: pointer;
      }
      .flip-inner {
        position: relative;
        width: 100%;
        min-height: 90px;
        transform-style: preserve-3d;
        transition: transform 0.5s ease;
        border-radius: 18px;
      }
      .flip-wrap.flipped .flip-inner {
        transform: rotateY(180deg);
      }
      .flip-front, .flip-back {
        position: absolute; top: 0; left: 0; width: 100%;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        border-radius: 18px;
        padding: 16px;
        box-sizing: border-box;
        background: rgba(232, 237, 230, 0.85);
        box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
      }
      .flip-back {
        transform: rotateY(180deg);
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 90px;
      }
      .flip-label {
        font-size: 12px; color: #aaa; margin-bottom: 4px;
      }
      .flip-value {
        font-size: 28px; font-weight: bold; color: #444;
      }
      .flip-sub {
        font-size: 13px; color: #888; margin-top: 4px;
      }
      .flip-hint {
        font-size: 11px; color: #4caf87;
        text-align: right; margin-top: 6px;
        font-weight: 600;
      }

      /* RECOMMENDATION */
      .rec-card {
        padding: 16px; border-radius: 18px;
        background: rgba(232, 237, 230, 0.85);
        box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
        margin-bottom: 12px;
      }

      /* CHART CONTAINER */
      .chart-wrap {
        padding: 16px; border-radius: 18px;
        background: rgba(232, 237, 230, 0.85);
        box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
        margin-bottom: 12px;
      }

      /* STATE TABLE */
      .state-row {
        display: flex; justify-content: space-between;
        padding: 10px 14px; border-radius: 12px;
        background: rgba(232, 237, 230, 0.85);
        box-shadow: 3px 3px 7px #b8c4b4, -3px -3px 7px #ffffff;
        margin-bottom: 8px;
        font-size: 14px; color: #555;
      }
    </style>

    <div style="padding: 16px; padding-bottom: 100px;">

      <h2 style="margin-bottom: 6px;">Что я о себе узнаю?</h2>
      <div style="font-size:13px; color:#888; margin-bottom:20px;">
        Текущее состояние: <strong>${stateLabelRu}</strong>
      </div>

      <!-- РЕКОМЕНДАЦИЯ -->
      <div class="insight-section">
        <div class="insight-section-title">💡 Личная рекомендация</div>
        <div class="rec-card">
          <div style="font-size:15px; color:#444; line-height:1.5;">${recommendation}</div>
        </div>
      </div>

      <!-- КАРТОЧКИ-ПЕРЕВЁРТЫШИ — ОСНОВНЫЕ МЕТРИКИ -->
      <div class="insight-section">
        <div class="insight-section-title">📈 Основные метрики</div>

        <!-- Стабильность -->
        <div class="flip-wrap" id="flip-stability">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Стабильность</div>
              <div class="flip-value" style="color:${stabilityColor(stability)}">${stability ?? "—"}%</div>
              <div class="flip-sub">${stabilityText(stability)}</div>
              <div class="flip-hint">Нажми для деталей ↩</div>
            </div>
            <div class="flip-back">
              <canvas id="chartStability" height="120"></canvas>
            </div>
          </div>
        </div>

        <!-- Среднее настроение -->
        <div class="flip-wrap" id="flip-mood">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Среднее настроение</div>
              <div class="flip-value" style="color:${moodColor(avgMood)}">${avgMood}%</div>
              <div class="flip-sub">${moodText(avgMood)}</div>
              <div class="flip-hint">Нажми для графика ↩</div>
            </div>
            <div class="flip-back">
              <canvas id="chartMood" height="120"></canvas>
            </div>
          </div>
        </div>

        <!-- Тренд -->
        <div class="flip-wrap" id="flip-trend">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Тренд</div>
              <div class="flip-value" style="font-size:18px; color:#444;">${trendRu}</div>
              <div class="flip-sub">Последние записи vs предыдущие</div>
              <div class="flip-hint">Нажми для деталей ↩</div>
            </div>
            <div class="flip-back" style="flex-direction:column; gap:8px;">
              <div style="font-size:14px; color:#666; text-align:center;">${trendExplainRu(trend)}</div>
            </div>
          </div>
        </div>

        <!-- Golden Hour -->
        <div class="flip-wrap" id="flip-golden">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Золотые часы</div>
              <div class="flip-value" style="font-size:18px;">⭐ ${goldenShort(golden)}</div>
              <div class="flip-sub">Твой пик активности</div>
              <div class="flip-hint">Нажми для деталей ↩</div>
            </div>
            <div class="flip-back" style="flex-direction:column;">
              <canvas id="chartHours" height="120"></canvas>
            </div>
          </div>
        </div>

      </div>

      <!-- КАРТОЧКИ ПРАКТИК -->
      ${stats ? `
      <div class="insight-section">
        <div class="insight-section-title">🫁 Эффективность практик</div>

        <!-- Дыхание -->
        <div class="flip-wrap" id="flip-breathing">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Дыхание</div>
              <div class="flip-value" style="color:${rateColor(breathingRate)}">${breathingRate ?? "—"}%</div>
              <div class="flip-sub">
                ${breathingLift !== null ? `Средний подъём: +${breathingLift} пт` : "Нет данных"}
                · ${stats.breathingSessions} сессий
              </div>
              <div class="flip-hint">Нажми для деталей ↩</div>
            </div>
            <div class="flip-back">
              <canvas id="chartBreathing" height="120"></canvas>
            </div>
          </div>
        </div>

        <!-- Медитация -->
        <div class="flip-wrap" id="flip-meditation">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Медитация</div>
              <div class="flip-value" style="color:${rateColor(meditationRate)}">${meditationRate ?? "—"}%</div>
              <div class="flip-sub">
                ${meditationLift !== null ? `Средний подъём: +${meditationLift} пт` : "Нет данных"}
                · ${stats.meditationSessions} сессий
              </div>
              <div class="flip-hint">Нажми для деталей ↩</div>
            </div>
            <div class="flip-back">
              <canvas id="chartMeditation" height="120"></canvas>
            </div>
          </div>
        </div>

      </div>

      <!-- ПО СОСТОЯНИЯМ -->
      <div class="insight-section">
        <div class="insight-section-title">🧠 При каком состоянии что помогает</div>
        ${buildStateTable(breathingByState, meditationByState)}
      </div>
      ` : `
      <div class="insight-section">
        <div class="rec-card" style="text-align:center; color:#888;">
          Пройди несколько сессий дыхания или медитации — здесь появится аналитика эффективности.
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
        setTimeout(() => initChartFor(wrap.id, history, stats, breathingByState, meditationByState), 300);
      }
    });
  });
}

// ---- ПЕРЕВОДЫ ----
function translateTrend(trend) {
  if (!trend) return "—";
  if (trend.includes("improving") || trend.includes("📈")) return "📈 Улучшается";
  if (trend.includes("declining") || trend.includes("📉")) return "📉 Снижается";
  if (trend.includes("stable") || trend.includes("➡")) return "➡️ Стабильно";
  // Если вернулась уже русская строка — вернуть как есть
  return trend;
}

function translateStateLabel(label) {
  if (!label) return "—";
  const map = {
    "Very good": "Отличное",
    "Good": "Хорошее",
    "Neutral": "Нейтральное",
    "Low": "Сниженное",
    "Stressed": "Напряжённое",
    "High": "Очень высокое",
    "Bad": "Плохое",
    "Critical": "Критическое"
  };
  return map[label] || label;
}

// ---- ГРАФИКИ ----
function destroyChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const existing = window.Chart.getChart(canvas);
  if (existing) existing.destroy();
}

function initChartFor(id, history, stats, breathingByState, meditationByState) {
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

function drawMoodChart(history) {
  const canvas = document.getElementById("chartMood");
  if (!canvas) return;
  const daily = buildDailyMood(history);
  if (!daily.length) return;

  canvas.width = canvas.parentElement.offsetWidth - 32;

  const Chart = window.Chart;
  if (!Chart) return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels: daily.map(d => d.date.slice(5)),
      datasets: [{
        data: daily.map(d => d.avg),
        borderColor: "#4db8ff",
        backgroundColor: "rgba(77,184,255,0.1)",
        tension: 0.4,
        pointRadius: 3,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

function drawStabilityChart(history) {
  const canvas = document.getElementById("chartStability");
  if (!canvas) return;
  canvas.width = canvas.parentElement.offsetWidth - 32;

  const Chart = window.Chart;
  if (!Chart) return;

  const points = [];
  for (let i = 4; i < history.length; i++) {
    const slice = history.slice(i - 4, i + 1);
    const avg = slice.reduce((s, h) => s + h.value, 0) / slice.length;
    const variance = slice.reduce((s, h) => s + Math.pow(h.value - avg, 2), 0) / slice.length;
    const stab = Math.round(Math.max(5, Math.min(100, 100 - Math.sqrt(variance))));
    const d = new Date(history[i].time);
    points.push({ label: `${d.getDate()}.${d.getMonth()+1}`, value: stab });
  }

  new Chart(canvas, {
    type: "line",
    data: {
      labels: points.map(p => p.label),
      datasets: [{
        data: points.map(p => p.value),
        borderColor: "#4caf87",
        backgroundColor: "rgba(76,175,135,0.1)",
        tension: 0.4,
        pointRadius: 3,
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

function drawHoursChart(history) {
  const canvas = document.getElementById("chartHours");
  if (!canvas) return;
  canvas.width = canvas.parentElement.offsetWidth - 32;

  const Chart = window.Chart;
  if (!Chart) return;

  const hours = {};
  history.forEach(e => {
    const h = new Date(e.time).getHours();
    if (!hours[h]) hours[h] = { total: 0, count: 0 };
    hours[h].total += e.value;
    hours[h].count++;
  });

  const labels = Object.keys(hours).sort((a,b) => a-b);
  const data   = labels.map(h => Math.round(hours[h].total / hours[h].count));

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels.map(h => `${h}:00`),
      datasets: [{
        data,
        backgroundColor: data.map(v => v >= 70 ? "#4caf87" : v >= 40 ? "#f0a500" : "#e05555"),
        borderRadius: 6
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

function drawPieChart(canvasId, rate, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width  = 120;
  canvas.height = 120;

  const Chart = window.Chart;
  if (!Chart) return;

  new Chart(canvas, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [rate, 100 - rate],
        backgroundColor: [color, "#d0d5de"],
        borderWidth: 0
      }]
    },
    options: {
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    },
    plugins: [{
      id: "centerText",
      afterDraw(chart) {
        const { ctx, chartArea: { width, height, left, top } } = chart;
        ctx.save();
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#444";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${rate ?? 0}%`, left + width / 2, top + height / 2);
        ctx.restore();
      }
    }]
  });
}

// ---- ТАБЛИЦА ПО СОСТОЯНИЯМ ----
function buildStateTable(breathingByState, meditationByState) {
  const states = ["LOW", "STRESSED", "NEUTRAL", "GOOD", "HIGH"];
  const labels = { LOW: "😔 Сниженное", STRESSED: "😤 Напряжение", NEUTRAL: "😐 Нейтральное", GOOD: "😊 Хорошее", HIGH: "🤩 Отличное" };

  let html = `
    <div style="display:flex; gap:8px; margin-bottom:8px; font-size:12px; color:#888; padding:0 4px;">
      <div style="flex:2;">Состояние</div>
      <div style="flex:1; text-align:center;">🫁</div>
      <div style="flex:1; text-align:center;">🧘</div>
    </div>
  `;

  states.forEach(state => {
    const b = breathingByState[state];
    const m = meditationByState[state];
    if (!b && !m) return;

    html += `
      <div class="state-row">
        <div style="flex:2;">${labels[state]}</div>
        <div style="flex:1; text-align:center; color:${rateColor(b?.rate)}; font-weight:600;">
          ${b ? b.rate + "%" : "—"}
        </div>
        <div style="flex:1; text-align:center; color:${rateColor(m?.rate)}; font-weight:600;">
          ${m ? m.rate + "%" : "—"}
        </div>
      </div>`;
  });

  return html || `<div style="color:#888; font-size:14px;">Пока нет данных по состояниям.</div>`;
}

// ---- СУТОЧНАЯ АГРЕГАЦИЯ ----
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

// ---- ВСПОМОГАТЕЛЬНЫЕ ----
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

function trendExplainRu(trend) {
  if (!trend) return "Недостаточно данных для анализа.";
  if (trend.includes("improving") || trend.includes("Улучш")) return "Последние записи лучше предыдущих. Ты на подъёме — продолжай в том же духе.";
  if (trend.includes("declining") || trend.includes("Сниж")) return "Последние записи ниже предыдущих. Возможно стоит уделить внимание практикам или отдыху.";
  return "Твоё состояние стабильно без резких изменений.";
}

function goldenShort(golden) {
  if (!golden) return "—";
  const match = golden.match(/\d{2}:\d{2}–\d{2}:\d{2}/);
  return match ? match[0] : golden;
}