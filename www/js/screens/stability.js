// ===============================
// MoodOS — Устойчивость
// ===============================
import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";

export function onEnter() {
  renderStability();
}

function renderStability() {
  const container = document.getElementById("stability-content");
  if (!container) return;

  const history = getMoodHistory();

  if (!history || history.length < 2) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:80px 24px;text-align:center;color:#999;font-family:-apple-system,sans-serif;">
        <div style="font-size:56px;margin-bottom:16px;">🌱</div>
        <div style="font-size:17px;font-weight:600;color:#666;margin-bottom:8px;">Пока мало данных</div>
        <div style="font-size:14px;line-height:1.6;">Сделай несколько записей —<br>я покажу твою устойчивость</div>
      </div>`;
    return;
  }

  const stab       = calculateStabilityScore(history) ?? 0;
  const volat      = Math.max(0, 100 - stab);
  const last14     = history.slice(-14);
  const last10     = history.slice(-10).reverse();
  const avg14      = Math.round(last14.reduce((s,e) => s+e.value, 0) / last14.length);
  const trend      = calcTrend(history);
  const stabColor  = stab >= 70 ? "#4caf87" : stab >= 45 ? "#f0a500" : "#e05555";
  const trendIcon  = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor = trend === "up" ? "#4caf87" : trend === "down" ? "#e05555" : "#888";
  const levelLabel = stabLabel(stab);

  container.innerHTML = `
    <style>
      .stab-wrap { padding:16px 16px 100px; font-family:-apple-system,'SF Pro Display',sans-serif; }
      .stab-title { font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:4px; }
      .stab-sub   { font-size:13px;color:#aaa;margin-bottom:24px; }

      .stab-section { margin-bottom:24px; }
      .stab-section-label {
        font-size:11px;font-weight:700;letter-spacing:1.2px;
        text-transform:uppercase;color:#b0b8c4;
        margin-bottom:10px;padding-left:4px;
      }

      .stab-hero {
        padding:24px;border-radius:22px;
        background:#e0e5ec;
        box-shadow:8px 8px 18px #b8bec7,-8px -8px 18px #ffffff;
        display:flex;align-items:center;justify-content:space-between;
        margin-bottom:10px;
      }
      .stab-ring-wrap { position:relative;width:100px;height:100px; }
      .stab-ring-label {
        position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;
      }
      .stab-ring-val  { font-size:24px;font-weight:800;color:#3d3d3d; }
      .stab-ring-unit { font-size:11px;color:#aaa; }
      .stab-hero-right { flex:1;padding-left:20px; }
      .stab-hero-level { font-size:18px;font-weight:700;color:#3d3d3d;margin-bottom:6px; }
      .stab-hero-desc  { font-size:13px;color:#888;line-height:1.55; }

      .stab-cards { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
      .stab-card {
        padding:16px;border-radius:18px;
        background:#e0e5ec;
        box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
      }
      .stab-card-label { font-size:12px;color:#aaa;margin-bottom:4px; }
      .stab-card-value { font-size:26px;font-weight:800; }
      .stab-card-sub   { font-size:12px;color:#999;margin-top:3px; }

      .stab-entry-row {
        display:flex;align-items:center;justify-content:space-between;
        padding:12px 16px;border-radius:14px;
        background:#e0e5ec;
        box-shadow:4px 4px 9px #b8bec7,-4px -4px 9px #ffffff;
        margin-bottom:9px;font-size:14px;color:#555;
      }
      .stab-entry-bar-wrap {
        flex:1;height:6px;border-radius:4px;
        background:rgba(0,0,0,0.07);margin:0 12px;overflow:hidden;
      }
      .stab-entry-bar { height:100%;border-radius:4px; }

      .chart-wrap {
        padding:16px;border-radius:18px;
        background:#e0e5ec;
        box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
      }
    </style>

    <div class="stab-wrap">
      <div class="stab-title">Моя устойчивость</div>
      <div class="stab-sub">Насколько стабильно моё эмоциональное состояние</div>

      <!-- ГЕРОЙ — КОЛЬЦО -->
      <div class="stab-section">
        <div class="stab-hero">
          <div class="stab-ring-wrap">
            <canvas id="stabRing" width="100" height="100"></canvas>
            <div class="stab-ring-label">
              <span class="stab-ring-val" style="color:${stabColor}">${stab}</span>
              <span class="stab-ring-unit">из 100</span>
            </div>
          </div>
          <div class="stab-hero-right">
            <div class="stab-hero-level">${levelLabel}</div>
            <div class="stab-hero-desc">${levelDesc(stab)}</div>
          </div>
        </div>
      </div>

      <!-- МЕТРИКИ -->
      <div class="stab-section">
        <div class="stab-section-label">Ключевые показатели</div>
        <div class="stab-cards">
          <div class="stab-card">
            <div class="stab-card-label">Волатильность</div>
            <div class="stab-card-value" style="color:${volat>55?"#e05555":volat>30?"#f0a500":"#4caf87"}">${volat}%</div>
            <div class="stab-card-sub">${volat>55?"Высокая":volat>30?"Умеренная":"Низкая"}</div>
          </div>
          <div class="stab-card">
            <div class="stab-card-label">Среднее за 14 дней</div>
            <div class="stab-card-value" style="color:#555">${avg14}%</div>
            <div class="stab-card-sub">твоя норма</div>
          </div>
          <div class="stab-card">
            <div class="stab-card-label">Тренд</div>
            <div class="stab-card-value" style="color:${trendColor}">${trendIcon}</div>
            <div class="stab-card-sub">${trend==="up"?"Растёт":trend==="down"?"Снижается":"Стабильно"}</div>
          </div>
          <div class="stab-card">
            <div class="stab-card-label">Записей всего</div>
            <div class="stab-card-value" style="color:#7eb8d4">${history.length}</div>
            <div class="stab-card-sub">наблюдений</div>
          </div>
        </div>
      </div>

      <!-- ГРАФИК -->
      <div class="stab-section">
        <div class="stab-section-label">📈 График за 14 дней</div>
        <div class="chart-wrap">
          <canvas id="stabChart" height="140"></canvas>
        </div>
      </div>

      <!-- ПОСЛЕДНИЕ 10 ЗАПИСЕЙ -->
      <div class="stab-section">
        <div class="stab-section-label">Последние записи</div>
        ${last10.map(e => {
          const c = e.value>=70?"#4caf87":e.value>=40?"#f0a500":"#e05555";
          const d = new Date(e.time);
          const label = d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})
            + " " + d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
          return `
          <div class="stab-entry-row">
            <span style="font-size:13px;color:#888;min-width:80px;">${label}</span>
            <div class="stab-entry-bar-wrap">
              <div class="stab-entry-bar" style="width:${e.value}%;background:${c};"></div>
            </div>
            <span style="font-weight:700;color:${c};min-width:36px;text-align:right;">${e.value}%</span>
          </div>`;
        }).join("")}
      </div>

    </div>
  `;

  setTimeout(() => {
    drawRing(stab, stabColor);
    drawLineChart(last14);
  }, 50);
}

// ---- ГРАФИКИ ----

function drawRing(value, color) {
  const canvas = document.getElementById("stabRing");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = 50, cy = 50, r = 38;
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + (2 * Math.PI * value / 100);

  ctx.clearRect(0, 0, 100, 100);

  // Фоновая дуга
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(0,0,0,0.07)";
  ctx.lineWidth = 10;
  ctx.stroke();

  // Цветная дуга
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawLineChart(history) {
  const canvas = document.getElementById("stabChart");
  if (!canvas || !window.Chart) return;
  canvas.width = canvas.parentElement.offsetWidth - 32;

  const existing = window.Chart.getChart(canvas);
  if (existing) existing.destroy();

  const daily = buildDaily(history);

  new window.Chart(canvas, {
    type: "line",
    data: {
      labels: daily.map(d => d.date.slice(5)),
      datasets: [{
        data: daily.map(d => d.avg),
        borderColor: "#9f7aea",
        backgroundColor: "rgba(159,122,234,0.1)",
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: daily.map(d =>
          d.avg>=70?"#4caf87":d.avg>=40?"#f0a500":"#e05555"
        ),
        fill: true
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min:0, max:100,
          ticks: { font:{size:11}, color:"#aaa" },
          grid:  { color:"rgba(0,0,0,0.04)" }
        },
        x: {
          ticks: { font:{size:10}, color:"#aaa" },
          grid:  { display:false }
        }
      }
    }
  });
}

// ---- ВСПОМОГАТЕЛЬНЫЕ ----

function buildDaily(history) {
  const byDay = {};
  history.forEach(e => {
    const d = new Date(e.time);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e.value);
  });
  return Object.keys(byDay).sort().map(date => ({
    date,
    avg: Math.round(byDay[date].reduce((a,b)=>a+b,0)/byDay[date].length)
  }));
}

function calcTrend(history) {
  if (history.length < 6) return "stable";
  const old  = history.slice(-10, -5).reduce((s,e)=>s+e.value,0)/5;
  const curr = history.slice(-5).reduce((s,e)=>s+e.value,0)/5;
  if (curr - old > 5)  return "up";
  if (old - curr > 5)  return "down";
  return "stable";
}

function stabLabel(s) {
  if (s >= 85) return "Очень высокая";
  if (s >= 70) return "Высокая";
  if (s >= 55) return "Хорошая";
  if (s >= 40) return "Умеренная";
  return "Нестабильно";
}

function levelDesc(s) {
  if (s >= 85) return "Твоя эмоциональная система работает как часы. Минимальные колебания.";
  if (s >= 70) return "Состояние предсказуемое и ровное. Небольшие колебания — это норма.";
  if (s >= 55) return "В целом стабильно, но бывают заметные перепады.";
  if (s >= 40) return "Заметные эмоциональные качели. Практики помогут.";
  return "Высокая турбулентность. Я рядом — разберёмся вместе.";
}