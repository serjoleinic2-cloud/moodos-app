// ===============================
// MoodOS Insight Screen — v2
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
import {
  explainCurrentState,
  getTodayForecast,
  getAmnesiaReminder,
  getMicroHabit
} from "../insight-engine.js";
import {
  getResilienceIndex,
  getResilienceLabel,
  getResilienceTrend
} from "../resilience-engine.js";
import { getNoteTriggers, hasEveningDip } from "../pattern-engine.js";

export function onEnter() {
  const container = document.getElementById("insight-content");
  if (!container) return;

  const history = getMoodHistory();
  const mood    = getMood();
  const state   = detectMoodState(mood);
  const stats   = getFullSessionStats();

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="
        display:flex; flex-direction:column; align-items:center;
        justify-content:center; padding:80px 24px; text-align:center;
        color:#999;
      ">
        <div style="font-size:56px; margin-bottom:16px;">🌱</div>
        <div style="font-size:17px; font-weight:600; color:#666; margin-bottom:8px;">
          Здесь будет твоя картина
        </div>
        <div style="font-size:14px; line-height:1.6;">
          Начни отмечать настроение — через несколько дней<br>приложение начнёт понимать тебя.
        </div>
      </div>`;
    return;
  }

  // --- Данные ---
  const stability       = calculateStabilityScore(history);
  const trend           = calculateTrend(history);
  const golden          = calculateGoldenHour(history);
  const avgMood         = Math.round(history.reduce((s, h) => s + h.value, 0) / history.length);
  const recommendation  = getPersonalRecommendation(state);
  const breathingRate   = getEffectivenessRate("breathing");
  const meditationRate  = getEffectivenessRate("meditation");
  const breathingLift   = getAverageMoodLift("breathing");
  const meditationLift  = getAverageMoodLift("meditation");
  const breathingByState  = getEffectivenessByState("breathing");
  const meditationByState = getEffectivenessByState("meditation");
  const dailyData         = buildDailyMood(history);

  // --- Новые движки ---
  const reasons     = explainCurrentState(mood);
  const forecast    = getTodayForecast();
  const amnesia     = getAmnesiaReminder(mood);
  const microHabit  = getMicroHabit(state);
  const resIndex    = getResilienceIndex();
  const resLabel    = getResilienceLabel(resIndex);
  const resTrend    = getResilienceTrend();
  const triggers    = getNoteTriggers();
  const eveningDip  = hasEveningDip();

  container.innerHTML = `
    <style>
      /* ---- BASE ---- */
      .ins-wrap {
        padding: 16px 16px 100px;
        font-family: -apple-system, 'SF Pro Display', sans-serif;
      }
      .ins-title {
        font-size: 22px; font-weight: 700; color: #3d3d3d;
        margin-bottom: 4px;
      }
      .ins-subtitle {
        font-size: 13px; color: #aaa;
        margin-bottom: 24px;
      }

      /* ---- СЕКЦИИ ---- */
      .ins-section { margin-bottom: 28px; }
      .ins-section-label {
        font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
        text-transform: uppercase; color: #b0b8c4;
        margin-bottom: 10px; padding-left: 4px;
      }

      /* ---- КАРТОЧКИ ---- */
      .neo-card {
        background: #e0e5ec;
        border-radius: 20px;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        padding: 18px 20px;
        margin-bottom: 12px;
        box-sizing: border-box;
      }
      .neo-card-inner {
        background: #e8edf4;
        border-radius: 14px;
        box-shadow: inset 3px 3px 7px #c5cad1, inset -3px -3px 7px #f8fdff;
        padding: 14px 16px;
        margin-top: 10px;
      }

      /* ---- HERO-КАРТА (устойчивость) ---- */
      .res-hero {
        background: #e0e5ec;
        border-radius: 24px;
        box-shadow: 8px 8px 18px #b8bec7, -8px -8px 18px #ffffff;
        padding: 22px 24px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 20px;
      }
      .res-ring-wrap {
        position: relative;
        width: 80px; height: 80px;
        flex-shrink: 0;
      }
      .res-ring-wrap canvas {
        position: absolute; top: 0; left: 0;
      }
      .res-ring-label {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px; font-weight: 800; color: #3d3d3d;
      }
      .res-text { flex: 1; }
      .res-text-title {
        font-size: 15px; font-weight: 700; color: #3d3d3d;
        margin-bottom: 4px;
      }
      .res-text-sub {
        font-size: 13px; color: #888; line-height: 1.5;
      }
      .res-trend-badge {
        display: inline-block;
        margin-top: 6px;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px; font-weight: 600;
        background: #e0e5ec;
        box-shadow: 3px 3px 6px #b8bec7, -3px -3px 6px #ffffff;
      }

      /* ---- ПРИЧИНЫ СОСТОЯНИЯ ---- */
      .reason-item {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(0,0,0,0.04);
        font-size: 14px; color: #555; line-height: 1.5;
      }
      .reason-item:last-child { border-bottom: none; }
      .reason-dot {
        width: 8px; height: 8px; border-radius: 50%;
        margin-top: 5px; flex-shrink: 0;
        background: #a0aab8;
      }

      /* ---- ПРОГНОЗ ---- */
      .forecast-card {
        background: #e0e5ec;
        border-radius: 20px;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        padding: 18px 20px;
        margin-bottom: 12px;
      }
      .forecast-icon {
        font-size: 28px; margin-bottom: 8px;
      }
      .forecast-text {
        font-size: 14px; color: #555; line-height: 1.65;
      }

      /* ---- АМНЕЗИЯ ---- */
      .amnesia-card {
        background: #e0e5ec;
        border-radius: 20px;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        padding: 18px 20px;
        margin-bottom: 12px;
        border-left: 3px solid #7eb8d4;
      }
      .amnesia-title {
        font-size: 13px; font-weight: 700; color: #7eb8d4;
        margin-bottom: 6px; letter-spacing: 0.3px;
      }
      .amnesia-text {
        font-size: 14px; color: #555; line-height: 1.65;
      }

      /* ---- ТРИГГЕРЫ ---- */
      .trigger-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 14px;
        background: #e0e5ec;
        border-radius: 14px;
        box-shadow: 4px 4px 9px #b8bec7, -4px -4px 9px #ffffff;
        margin-bottom: 9px;
      }
      .trigger-keyword {
        font-size: 14px; color: #555; font-weight: 500;
      }
      .trigger-diff {
        font-size: 13px; font-weight: 700;
        padding: 3px 10px; border-radius: 20px;
        background: #e0e5ec;
        box-shadow: inset 2px 2px 5px #c5cad1, inset -2px -2px 5px #f8fdff;
        color: #e05555;
      }

      /* ---- МИКРО-ПРИВЫЧКА ---- */
      .habit-card {
        background: #e0e5ec;
        border-radius: 20px;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        padding: 18px 20px;
        margin-bottom: 12px;
        display: flex; gap: 14px; align-items: flex-start;
      }
      .habit-icon {
        font-size: 26px; flex-shrink: 0; margin-top: 2px;
      }
      .habit-text {
        font-size: 14px; color: #555; line-height: 1.65;
      }

      /* ---- FLIP КАРТЫ (метрики) ---- */
      .flip-wrap {
        perspective: 1000px;
        margin-bottom: 12px;
        cursor: pointer;
      }
      .flip-inner {
        position: relative; width: 100%; min-height: 92px;
        transform-style: preserve-3d;
        transition: transform 0.45s ease;
        border-radius: 20px;
      }
      .flip-wrap.flipped .flip-inner { transform: rotateY(180deg); }
      .flip-front, .flip-back {
        position: absolute; top: 0; left: 0; width: 100%;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        border-radius: 20px;
        padding: 16px 20px;
        box-sizing: border-box;
        background: #e0e5ec;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        min-height: 92px;
      }
      .flip-back {
        transform: rotateY(180deg);
        display: flex; align-items: center; justify-content: center;
      }
      .flip-label { font-size: 12px; color: #aaa; margin-bottom: 4px; }
      .flip-value { font-size: 26px; font-weight: 800; color: #444; }
      .flip-sub   { font-size: 12px; color: #999; margin-top: 4px; }
      .flip-hint  { font-size: 10px; color: #c0c6cf; text-align:right; margin-top:6px; }
    </style>

    <div class="ins-wrap">
      <div class="ins-title">Как ты себя чувствуешь?</div>
      <div class="ins-subtitle">Состояние сейчас: <strong style="color:#555;">${getStateLabel(state)}</strong></div>

      <!-- ======= УСТОЙЧИВОСТЬ (HERO) ======= -->
      ${resIndex !== null ? `
      <div class="ins-section">
        <div class="ins-section-label">Эмоциональная устойчивость</div>
        <div class="res-hero">
          <div class="res-ring-wrap">
            <canvas id="resCanvas" width="80" height="80"></canvas>
            <div class="res-ring-label">${resIndex}</div>
          </div>
          <div class="res-text">
            <div class="res-text-title">${resLabel}</div>
            <div class="res-text-sub">
              ${resTrend && resTrend.direction === "up"
                ? `Устойчивость выросла на ${resTrend.change}% за это время`
                : resTrend && resTrend.direction === "down"
                ? "Сейчас чуть больше перепадов — это нормально"
                : "Стабильная динамика"}
            </div>
            <div class="res-trend-badge" style="color:${resTrend?.direction === 'up' ? '#4caf87' : resTrend?.direction === 'down' ? '#e05555' : '#888'}">
              ${resTrend?.direction === 'up' ? '↑ Растёт' : resTrend?.direction === 'down' ? '↓ Снижается' : '→ Стабильно'}
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- ======= ПОЧЕМУ ТАК СЕБЯ ЧУВСТВУЮ ======= -->
      <div class="ins-section">
        <div class="ins-section-label">Почему так себя чувствую</div>
        <div class="neo-card">
          ${reasons.map(r => `
            <div class="reason-item">
              <div class="reason-dot"></div>
              <div>${r}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ======= ПРОГНОЗ ======= -->
      ${forecast ? `
      <div class="ins-section">
        <div class="ins-section-label">Прогноз на сегодня</div>
        <div class="forecast-card">
          <div class="forecast-icon">🔮</div>
          <div class="forecast-text">${forecast}</div>
        </div>
      </div>
      ` : ''}

      <!-- ======= АМНЕЗИЯ ======= -->
      ${amnesia ? `
      <div class="ins-section">
        <div class="ins-section-label">Ты уже справлялся</div>
        <div class="amnesia-card">
          <div class="amnesia-title">💙 Напоминание</div>
          <div class="amnesia-text">
            ${amnesia.daysAgo} дней назад у тебя было похожее состояние (${amnesia.pastMood}%).
            Через ${amnesia.daysToRecover} ${daysWord(amnesia.daysToRecover)} стало значительно лучше — до ${amnesia.recoveredTo}%.
            Ты уже выходил из этого.
          </div>
        </div>
      </div>
      ` : ''}

      <!-- ======= ТРИГГЕРЫ ======= -->
      ${triggers && triggers.length ? `
      <div class="ins-section">
        <div class="ins-section-label">Твои скрытые триггеры</div>
        ${triggers.map(t => `
          <div class="trigger-row">
            <div class="trigger-keyword">
              ${triggerIcon(t.keyword)} ${t.keyword}
              <span style="font-size:12px; color:#aaa; margin-left:6px;">(${t.count}×)</span>
            </div>
            <div class="trigger-diff">${t.diff} pts</div>
          </div>
        `).join('')}
        <div style="font-size:12px; color:#bbb; padding:4px 4px 0; line-height:1.5;">
          В дни когда встречается это слово — настроение ниже среднего
        </div>
      </div>
      ` : ''}

      <!-- ======= МИКРО-ПРИВЫЧКА ======= -->
      ${microHabit ? `
      <div class="ins-section">
        <div class="ins-section-label">Что поможет сейчас</div>
        <div class="habit-card">
          <div class="habit-icon">✨</div>
          <div class="habit-text">${microHabit}</div>
        </div>
      </div>
      ` : ''}

      <!-- ======= ОСНОВНЫЕ МЕТРИКИ (flip) ======= -->
      <div class="ins-section">
        <div class="ins-section-label">Твоя статистика</div>

        <div class="flip-wrap" id="flip-stability">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Стабильность</div>
              <div class="flip-value" style="color:${stabilityColor(stability)}">${stability ?? "—"}%</div>
              <div class="flip-sub">${stabilityText(stability)}</div>
              <div class="flip-hint">нажми →</div>
            </div>
            <div class="flip-back"><canvas id="chartStability" height="110"></canvas></div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-mood">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Среднее настроение</div>
              <div class="flip-value" style="color:${moodColor(avgMood)}">${avgMood}%</div>
              <div class="flip-sub">${moodText(avgMood)}</div>
              <div class="flip-hint">нажми →</div>
            </div>
            <div class="flip-back"><canvas id="chartMood" height="110"></canvas></div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-golden">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Золотые часы</div>
              <div class="flip-value" style="font-size:17px;">⭐ ${goldenShort(golden)}</div>
              <div class="flip-sub">Твой пик активности</div>
              <div class="flip-hint">нажми →</div>
            </div>
            <div class="flip-back"><canvas id="chartHours" height="110"></canvas></div>
          </div>
        </div>

      </div>

      <!-- ======= ПРАКТИКИ (flip) ======= -->
      ${stats ? `
      <div class="ins-section">
        <div class="ins-section-label">Эффективность практик</div>

        <div class="flip-wrap" id="flip-breathing">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">🫁 Дыхание</div>
              <div class="flip-value" style="color:${rateColor(breathingRate)}">${breathingRate ?? "—"}%</div>
              <div class="flip-sub">${breathingLift !== null ? `+${breathingLift} pts подъём` : "Нет данных"} · ${stats.breathingSessions} сессий</div>
              <div class="flip-hint">нажми →</div>
            </div>
            <div class="flip-back"><canvas id="chartBreathing" width="110" height="110"></canvas></div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-meditation">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">🧘 Медитация</div>
              <div class="flip-value" style="color:${rateColor(meditationRate)}">${meditationRate ?? "—"}%</div>
              <div class="flip-sub">${meditationLift !== null ? `+${meditationLift} pts подъём` : "Нет данных"} · ${stats.meditationSessions} сессий</div>
              <div class="flip-hint">нажми →</div>
            </div>
            <div class="flip-back"><canvas id="chartMeditation" width="110" height="110"></canvas></div>
          </div>
        </div>

      </div>
      ` : ''}

    </div>
  `;

  // ---- Кольцо устойчивости ----
  if (resIndex !== null) drawResilienceRing(resIndex);

  // ---- FLIP логика ----
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

// ---- КОЛЬЦО УСТОЙЧИВОСТИ ----
function drawResilienceRing(index) {
  const canvas = document.getElementById("resCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = 40, cy = 40, r = 32;
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + (2 * Math.PI * index / 100);

  // Фон
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = "#d0d5de";
  ctx.lineWidth = 7;
  ctx.stroke();

  // Прогресс
  const color = index >= 70 ? "#4caf87" : index >= 45 ? "#f0a500" : "#e05555";
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.stroke();
}

// ---- ГРАФИКИ ----
function destroyChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const existing = window.Chart?.getChart(canvas);
  if (existing) existing.destroy();
}

function initChartFor(id, history, stats) {
  if (id === "flip-stability")  { destroyChart("chartStability"); drawStabilityChart(history); }
  if (id === "flip-mood")       { destroyChart("chartMood");      drawMoodChart(history); }
  if (id === "flip-golden")     { destroyChart("chartHours");     drawHoursChart(history); }
  if (id === "flip-breathing")  { destroyChart("chartBreathing"); drawPieChart("chartBreathing", stats?.breathingRate ?? 0, "#4db8ff"); }
  if (id === "flip-meditation") { destroyChart("chartMeditation"); drawPieChart("chartMeditation", stats?.meditationRate ?? 0, "#9f7aea"); }
}

function drawMoodChart(history) {
  const canvas = document.getElementById("chartMood");
  if (!canvas || !window.Chart) return;
  canvas.width = canvas.parentElement.offsetWidth - 32;
  const daily = buildDailyMood(history);
  if (!daily.length) return;
  new window.Chart(canvas, {
    type: "line",
    data: {
      labels: daily.map(d => d.date.slice(5)),
      datasets: [{ data: daily.map(d => d.avg), borderColor: "#4db8ff", backgroundColor: "rgba(77,184,255,0.1)", tension: 0.4, pointRadius: 3, fill: true }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 9 } } } } }
  });
}

function drawStabilityChart(history) {
  const canvas = document.getElementById("chartStability");
  if (!canvas || !window.Chart) return;
  canvas.width = canvas.parentElement.offsetWidth - 32;
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
      datasets: [{ data: points.map(p => p.value), borderColor: "#4caf87", backgroundColor: "rgba(76,175,135,0.1)", tension: 0.4, pointRadius: 3, fill: true }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 9 } } } } }
  });
}

function drawHoursChart(history) {
  const canvas = document.getElementById("chartHours");
  if (!canvas || !window.Chart) return;
  canvas.width = canvas.parentElement.offsetWidth - 32;
  const hours = {};
  history.forEach(e => {
    const h = new Date(e.time).getHours();
    if (!hours[h]) hours[h] = { total: 0, count: 0 };
    hours[h].total += e.value;
    hours[h].count++;
  });
  const labels = Object.keys(hours).sort((a, b) => a - b);
  const data   = labels.map(h => Math.round(hours[h].total / hours[h].count));
  new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: labels.map(h => `${h}:00`),
      datasets: [{ data, backgroundColor: data.map(v => v >= 70 ? "#4caf87" : v >= 40 ? "#f0a500" : "#e05555"), borderRadius: 6 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 9 } } } } }
  });
}

function drawPieChart(canvasId, rate, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;
  canvas.width = 110; canvas.height = 110;
  new window.Chart(canvas, {
    type: "doughnut",
    data: {
      datasets: [{ data: [rate, 100 - rate], backgroundColor: [color, "#d0d5de"], borderWidth: 0 }]
    },
    options: {
      cutout: "72%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    },
    plugins: [{
      id: "centerText",
      afterDraw(chart) {
        const { ctx, chartArea: { width, height, left, top } } = chart;
        ctx.save();
        ctx.font = "bold 17px sans-serif";
        ctx.fillStyle = "#444";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${rate ?? 0}%`, left + width / 2, top + height / 2);
        ctx.restore();
      }
    }]
  });
}

// ---- ВСПОМОГАТЕЛЬНЫЕ ----
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
    avg: Math.round(byDay[date].reduce((a, b) => a + b, 0) / byDay[date].length)
  }));
}

function triggerIcon(keyword) {
  if (keyword.includes("кофе") || keyword.includes("coffee")) return "☕";
  if (keyword.includes("сон") || keyword.includes("sleep") || keyword.includes("спал")) return "😴";
  if (keyword.includes("работ") || keyword.includes("work") || keyword.includes("дедлайн")) return "💼";
  if (keyword.includes("один") || keyword.includes("одиноко")) return "🌧";
  if (keyword.includes("устал")) return "🪫";
  if (keyword.includes("тревог") || keyword.includes("anxiety")) return "😰";
  if (keyword.includes("еда") || keyword.includes("голод")) return "🍽";
  return "⚡";
}

function daysWord(n) {
  if (n === 1) return "день";
  if (n >= 2 && n <= 4) return "дня";
  return "дней";
}

function stabilityColor(s) {
  if (!s) return "#888";
  return s >= 75 ? "#4caf87" : s >= 50 ? "#f0a500" : "#e05555";
}

function stabilityText(s) {
  if (!s) return "Нет данных";
  if (s >= 85) return "Высокая стабильность";
  if (s >= 65) return "Умеренная стабильность";
  if (s >= 45) return "Заметные перепады";
  return "Высокая волатильность";
}

function moodColor(v) {
  return v >= 70 ? "#4caf87" : v >= 40 ? "#f0a500" : "#e05555";
}

function moodText(v) {
  if (v >= 70) return "Состояние сильное";
  if (v >= 40) return "Относительно стабильное";
  return "Требует внимания";
}

function rateColor(r) {
  if (!r) return "#888";
  return r >= 70 ? "#4caf87" : r >= 40 ? "#f0a500" : "#e05555";
}

function goldenShort(golden) {
  const match = (golden || "").match(/\d{2}:\d{2}[–-]\d{2}:\d{2}/);
  return match ? match[0] : (golden || "—");
}