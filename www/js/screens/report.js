// ===============================
// MoodOS Report Screen
// ===============================

import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";

let currentPeriod = 7;

export function onEnter() {
  renderReport();
}

function renderReport() {
  const container = document.getElementById("report-content");
  if (!container) return;

  const history = getMoodHistory();

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; margin-top:60px; color:#888;">
        <div style="font-size:48px;">📊</div>
        <div style="margin-top:12px;">Нет данных для отчёта. Начни отслеживать настроение!</div>
      </div>`;
    return;
  }

  const filtered = filterByDays(history, currentPeriod);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; margin-top:60px; color:#888;">
        <div style="font-size:48px;">📭</div>
        <div style="margin-top:12px;">Нет записей за выбранный период.</div>
      </div>`;
    renderPeriodButtons(container, history);
    return;
  }

  const average = Math.round(
    filtered.reduce((s, h) => s + h.value, 0) / filtered.length
  );

  const best  = filtered.reduce((a, b) => a.value > b.value ? a : b);
  const worst = filtered.reduce((a, b) => a.value < b.value ? a : b);
  const stability = calculateStabilityScore(filtered);

  let stateText = "Сбалансированное состояние.";
  if (average < 40) stateText = "Возможно, ты под эмоциональным давлением. Обрати внимание на отдых и практики.";
  if (average > 70) stateText = "Ты в целом в хорошем эмоциональном состоянии. Так держать!";

  function moodColor(v) {
    if (v >= 70) return "#4caf87";
    if (v >= 40) return "#f0a500";
    return "#e05555";
  }

  function stabilityColor(s) {
    if (!s) return "#888";
    if (s >= 75) return "#4caf87";
    if (s >= 50) return "#f0a500";
    return "#e05555";
  }

  const periodLabel = currentPeriod > 3650 ? "всё время" : `${currentPeriod} дней`;

  container.innerHTML = `
    <style>
      .rep-section-title {
        font-size: 13px; color: #888; font-weight: 600;
        margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .rep-card {
        padding: 16px; border-radius: 18px;
        background: rgba(232, 237, 230, 0.85);
        box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
        margin-bottom: 12px;
      }
      .rep-card-label {
        font-size: 12px; color: #aaa; margin-bottom: 4px;
      }
      .rep-card-value {
        font-size: 28px; font-weight: bold; color: #444;
      }
      .rep-card-sub {
        font-size: 13px; color: #888; margin-top: 4px;
      }
      .rep-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        margin-bottom: 12px;
      }
      .period-btn {
        padding: 10px 0; border: none; border-radius: 14px; cursor: pointer;
        font-size: 14px; font-weight: 600; flex: 1;
        background: linear-gradient(145deg, #f5efe6, #ede5d8);
        box-shadow: 4px 4px 8px #c8bfb2, -4px -4px 8px #ffffff;
        color: #7a6a58;
        transition: 0.2s;
        -webkit-tap-highlight-color: transparent;
      }
      .period-btn.active-period {
        box-shadow: inset 3px 3px 6px #c8bfb2, inset -3px -3px 6px #ffffff;
        color: #4caf87;
        font-weight: 700;
      }
      .chart-wrap {
        padding: 16px; border-radius: 18px;
        background: rgba(232, 237, 230, 0.85);
        box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
        margin-bottom: 12px;
      }
    </style>

    <div style="padding:16px; padding-bottom:100px;">

      <h2 style="margin-bottom:6px;">Как я живу в целом?</h2>
      <div style="font-size:13px; color:#888; margin-bottom:20px;">За ${periodLabel}</div>

      <!-- ПЕРИОД -->
      <div style="display:flex; gap:10px; margin-bottom:20px;">
        <button class="period-btn ${currentPeriod === 7 ? 'active-period' : ''}" data-days="7">7 дней</button>
        <button class="period-btn ${currentPeriod === 30 ? 'active-period' : ''}" data-days="30">30 дней</button>
        <button class="period-btn ${currentPeriod > 3650 ? 'active-period' : ''}" data-days="99999">Всё время</button>
      </div>

      <!-- СЕТКА 2×2 -->
      <div class="rep-section-title">📊 Сводка</div>
      <div class="rep-grid">
        <div class="rep-card">
          <div class="rep-card-label">Среднее настроение</div>
          <div class="rep-card-value" style="color:${moodColor(average)}">${average}%</div>
          <div class="rep-card-sub">за период</div>
        </div>
        <div class="rep-card">
          <div class="rep-card-label">Стабильность</div>
          <div class="rep-card-value" style="color:${stabilityColor(stability)}">${stability ?? "—"}%</div>
          <div class="rep-card-sub">индекс</div>
        </div>
        <div class="rep-card">
          <div class="rep-card-label">Записей</div>
          <div class="rep-card-value" style="color:#4db8ff">${filtered.length}</div>
          <div class="rep-card-sub">всего</div>
        </div>
        <div class="rep-card">
          <div class="rep-card-label">Активных дней</div>
          <div class="rep-card-value" style="color:#9f7aea">${countActiveDays(filtered)}</div>
          <div class="rep-card-sub">с записями</div>
        </div>
      </div>

      <!-- ГРАФИК -->
      <div class="rep-section-title" style="margin-top:8px;">📈 Динамика настроения</div>
      <div class="chart-wrap">
        <canvas id="reportChart" height="130"></canvas>
      </div>

      <!-- ЛУЧШИЙ / СЛОЖНЫЙ -->
      <div class="rep-section-title">🏆 Моменты</div>
      <div class="rep-card">
        <div class="rep-card-label">😊 Лучший момент</div>
        <div style="font-size:15px; color:#4caf87; font-weight:600; margin-top:4px;">${best.value}%</div>
        <div class="rep-card-sub">${formatDate(best.time)}</div>
      </div>
      <div class="rep-card">
        <div class="rep-card-label">😔 Сложный момент</div>
        <div style="font-size:15px; color:#e05555; font-weight:600; margin-top:4px;">${worst.value}%</div>
        <div class="rep-card-sub">${formatDate(worst.time)}</div>
      </div>

      <!-- ВЫВОД -->
      <div class="rep-section-title" style="margin-top:8px;">💬 Общий вывод</div>
      <div class="rep-card">
        <div style="font-size:15px; color:#444; line-height:1.6;">${stateText}</div>
      </div>

    </div>
  `;

  // Кнопки периода
  container.querySelectorAll(".period-btn").forEach(btn => {
    btn.onclick = () => {
      currentPeriod = Number(btn.dataset.days);
      renderReport();
    };
  });

  // График
  requestAnimationFrame(() => drawReportChart(filtered));
}

function drawReportChart(filtered) {
  const canvas = document.getElementById("reportChart");
  if (!canvas || !window.Chart) return;

  const existing = window.Chart.getChart(canvas);
  if (existing) existing.destroy();

  // Суточная агрегация
  const byDay = {};
  filtered.forEach(e => {
    const d = new Date(e.time);
    const key = `${d.getDate()}.${String(d.getMonth()+1).padStart(2,"0")}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e.value);
  });
  const labels = Object.keys(byDay);
  const data = labels.map(k => Math.round(byDay[k].reduce((a,b) => a+b, 0) / byDay[k].length));

  canvas.width = canvas.parentElement.offsetWidth - 32;

  new window.Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
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
        x: { ticks: { font: { size: 9 }, maxRotation: 45 } }
      }
    }
  });
}

function countActiveDays(history) {
  const days = new Set();
  history.forEach(e => {
    const d = new Date(e.time);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });
  return days.size;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit"
  });
}

function filterByDays(history, days) {
  if (days > 3650) return history;
  const now = Date.now();
  const limit = days * 24 * 60 * 60 * 1000;
  return history.filter(entry => now - new Date(entry.time).getTime() <= limit);
}