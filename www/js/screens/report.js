// ===============================
// MoodOS — Отчёт
// ===============================
import { getMoodHistory } from "../services/memory.js";
import { getSessionHistory } from "../services/memory.js";
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
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;text-align:center;color:#999;font-family:-apple-system,sans-serif;">
        <div style="font-size:56px;margin-bottom:16px;">📊</div>
        <div style="font-size:17px;font-weight:600;color:#666;margin-bottom:8px;">Пока нет данных</div>
        <div style="font-size:14px;line-height:1.6;">Начни отмечать настроение —<br>здесь появится твой отчёт</div>
      </div>`;
    return;
  }

  const filtered  = filterByDays(history, currentPeriod);
  const sessions  = getSessionHistory();
  const filteredS = sessions.filter(s => Date.now() - s.timestamp <= currentPeriod * 86400000);

  if (!filtered.length) {
    container.innerHTML = `<div style="padding:24px;color:#888;font-family:-apple-system,sans-serif;">Нет записей за выбранный период</div>`;
    return;
  }

  const avg      = Math.round(filtered.reduce((s, h) => s + h.value, 0) / filtered.length);
  const best     = filtered.reduce((a, b) => a.value > b.value ? a : b);
  const worst    = filtered.reduce((a, b) => a.value < b.value ? a : b);
  const stab     = calculateStabilityScore(filtered) ?? 0;
  const daily    = buildDaily(filtered);

  const stateText = avg >= 70
    ? "Эмоциональное состояние сильное"
    : avg >= 45
    ? "В целом стабильно"
    : "Период требует внимания";

  const stateColor = avg >= 70 ? "#4caf87" : avg >= 45 ? "#f0a500" : "#e05555";
  const stabColor  = stab >= 70 ? "#4caf87" : stab >= 45 ? "#f0a500" : "#e05555";

  container.innerHTML = `
    <style>
      .rep-wrap { padding:16px 16px 100px; font-family:-apple-system,'SF Pro Display',sans-serif; }
      .rep-title { font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:4px; }
      .rep-sub   { font-size:13px;color:#aaa;margin-bottom:20px; }

      .period-row { display:flex;gap:8px;margin-bottom:20px; }
      .period-btn {
        flex:1;padding:11px 0;border:none;border-radius:14px;
        background:#e0e5ec;
        box-shadow:4px 4px 9px #b8bec7,-4px -4px 9px #ffffff;
        font-size:14px;color:#888;cursor:pointer;font-weight:500;
        -webkit-tap-highlight-color:transparent;
        transition:box-shadow 0.15s,color 0.15s;
      }
      .period-btn.active {
        box-shadow:inset 3px 3px 7px #b8bec7,inset -3px -3px 7px #ffffff;
        color:#7eb8d4;font-weight:700;
      }

      .rep-section { margin-bottom:24px; }
      .rep-section-label {
        font-size:11px;font-weight:700;letter-spacing:1.2px;
        text-transform:uppercase;color:#b0b8c4;
        margin-bottom:10px;padding-left:4px;
      }

      .rep-cards { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
      .rep-card {
        padding:16px;border-radius:18px;
        background:#e0e5ec;
        box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
      }
      .rep-card-label { font-size:12px;color:#aaa;margin-bottom:4px; }
      .rep-card-value { font-size:26px;font-weight:800; }
      .rep-card-sub   { font-size:12px;color:#999;margin-top:3px; }

      .rep-card-wide {
        padding:16px 20px;border-radius:18px;
        background:#e0e5ec;
        box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
        margin-bottom:10px;
      }

      .rep-moment-row {
        display:flex;justify-content:space-between;align-items:center;
        padding:12px 16px;border-radius:14px;
        background:#e0e5ec;
        box-shadow:4px 4px 9px #b8bec7,-4px -4px 9px #ffffff;
        margin-bottom:9px;font-size:14px;color:#555;
      }

      .chart-wrap {
        padding:16px;border-radius:18px;
        background:#e0e5ec;
        box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
      }
    </style>

    <div class="rep-wrap">
      <div class="rep-title">Мой отчёт</div>
      <div class="rep-sub">Как я жил в этот период</div>

      <!-- ПЕРЕКЛЮЧАТЕЛЬ ПЕРИОДА -->
      <div class="period-row">
        <button class="period-btn ${currentPeriod===7?'active':''}"  data-days="7">7 дней</button>
        <button class="period-btn ${currentPeriod===30?'active':''}" data-days="30">30 дней</button>
        <button class="period-btn ${currentPeriod===99999?'active':''}" data-days="99999">Всё время</button>
      </div>

      <!-- ГЛАВНЫЕ МЕТРИКИ -->
      <div class="rep-section">
        <div class="rep-section-label">Обзор периода</div>
        <div class="rep-cards">
          <div class="rep-card">
            <div class="rep-card-label">Среднее настроение</div>
            <div class="rep-card-value" style="color:${stateColor}">${avg}%</div>
            <div class="rep-card-sub">${stateText}</div>
          </div>
          <div class="rep-card">
            <div class="rep-card-label">Стабильность</div>
            <div class="rep-card-value" style="color:${stabColor}">${stab}%</div>
            <div class="rep-card-sub">${stabText(stab)}</div>
          </div>
          <div class="rep-card">
            <div class="rep-card-label">Записей</div>
            <div class="rep-card-value" style="color:#555">${filtered.length}</div>
            <div class="rep-card-sub">за период</div>
          </div>
          <div class="rep-card">
            <div class="rep-card-label">Практик</div>
            <div class="rep-card-value" style="color:#7eb8d4">${filteredS.length}</div>
            <div class="rep-card-sub">сессий</div>
          </div>
        </div>
      </div>

      <!-- ГРАФИК -->
      <div class="rep-section">
        <div class="rep-section-label">📈 Динамика настроения</div>
        <div class="chart-wrap">
          <canvas id="repChart" height="140"></canvas>
        </div>
      </div>

      <!-- МОМЕНТЫ -->
      <div class="rep-section">
        <div class="rep-section-label">Моменты</div>
        <div class="rep-moment-row">
          <span>🌟 Лучший момент</span>
          <span style="color:#4caf87;font-weight:700;">${fmt(best.time)} · ${best.value}%</span>
        </div>
        <div class="rep-moment-row">
          <span>🌧 Сложный момент</span>
          <span style="color:#e05555;font-weight:700;">${fmt(worst.time)} · ${worst.value}%</span>
        </div>
      </div>

      <!-- ВЫВОД -->
      <div class="rep-section">
        <div class="rep-section-label">Общий вывод</div>
        <div class="rep-card-wide">
          <div style="font-size:15px;color:#555;line-height:1.65;">
            ${buildConclusion(avg, stab, filtered.length, filteredS.length)}
          </div>
        </div>
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
  setTimeout(() => drawChart(daily), 50);
}

function drawChart(daily) {
  const canvas = document.getElementById("repChart");
  if (!canvas || !window.Chart) return;
  canvas.width = canvas.parentElement.offsetWidth - 32;

  const existing = window.Chart.getChart(canvas);
  if (existing) existing.destroy();

  new window.Chart(canvas, {
    type: "line",
    data: {
      labels: daily.map(d => d.date.slice(5)),
      datasets: [{
        data: daily.map(d => d.avg),
        borderColor: "#7eb8d4",
        backgroundColor: "rgba(126,184,212,0.12)",
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: daily.map(d =>
          d.avg >= 70 ? "#4caf87" : d.avg >= 40 ? "#f0a500" : "#e05555"
        ),
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { font: { size: 11 }, color: "#aaa" }, grid: { color: "rgba(0,0,0,0.04)" } },
        x: { ticks: { font: { size: 10 }, color: "#aaa" }, grid: { display: false } }
      }
    }
  });
}

// ---- ВСПОМОГАТЕЛЬНЫЕ ----
function buildDaily(history) {
  const byDay = {};
  history.forEach(e => {
    const d   = new Date(e.time);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e.value);
  });
  return Object.keys(byDay).sort().map(date => ({
    date,
    avg: Math.round(byDay[date].reduce((a,b) => a+b, 0) / byDay[date].length)
  }));
}

function filterByDays(history, days) {
  if (days > 3650) return history;
  const limit = days * 86400000;
  return history.filter(e => Date.now() - new Date(e.time).getTime() <= limit);
}

function fmt(ts) {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function stabText(s) {
  if (s >= 80) return "Высокая";
  if (s >= 60) return "Хорошая";
  if (s >= 40) return "Умеренная";
  return "Нестабильно";
}

function buildConclusion(avg, stab, entries, sessions) {
  const parts = [];
  if (avg >= 70)      parts.push("Период был эмоционально сильным.");
  else if (avg >= 45) parts.push("Период прошёл в целом стабильно.");
  else                parts.push("Период был непростым — ты справлялся.");

  if (stab >= 70)     parts.push("Твоё состояние было предсказуемым и ровным.");
  else if (stab < 45) parts.push("Были заметные перепады — это нормально.");

  if (sessions >= 5)  parts.push(`Ты провёл ${sessions} практик — это влияет на восстановление.`);
  else if (sessions === 0) parts.push("Практики не использовались — попробуй добавить дыхание.");

  return parts.join(" ");
}