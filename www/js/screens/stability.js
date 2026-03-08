// ===============================
// MoodOS Stability Screen
// ===============================

import { getMoodHistory } from "../services/memory.js";
import { getNotesHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";

export function onEnter() {
  const container = document.getElementById("stability-content");
  if (!container) return;

  const history = getMoodHistory();

  if (!history || history.length < 2) {
    container.innerHTML = `
      <div style="text-align:center; margin-top:60px; color:#888;">
        <div style="font-size:48px;">🧘</div>
        <div style="margin-top:12px;">Нужно минимум 2 записи для анализа устойчивости.</div>
      </div>`;
    return;
  }

  const stability = calculateStabilityScore(history);
  const volatility = 100 - stability;

  // Среднее за 14 дней
  const now14 = Date.now();
  const hist14 = history.filter(e => now14 - new Date(e.time).getTime() <= 14 * 24 * 60 * 60 * 1000);
  const avg14 = hist14.length
    ? Math.round(hist14.reduce((s, h) => s + h.value, 0) / hist14.length)
    : null;

  // Тренд
  function calcTrend(hist) {
    if (hist.length < 4) return "➡️ Стабильно";
    const half = Math.floor(hist.length / 2);
    const recent = hist.slice(-half).reduce((s,h) => s+h.value, 0) / half;
    const prev   = hist.slice(0, half).reduce((s,h) => s+h.value, 0) / half;
    const diff = recent - prev;
    if (diff > 5) return "📈 Улучшается";
    if (diff < -5) return "📉 Снижается";
    return "➡️ Стабильно";
  }

  const trendText = calcTrend(history);
  const trendColor = trendText.includes("Улучш") ? "#4caf87" : trendText.includes("Сниж") ? "#e05555" : "#888";

  let levelText = "Умеренные эмоциональные колебания.";
  if (stability >= 85) levelText = "Очень высокая устойчивость. Ты в балансе.";
  else if (stability >= 65) levelText = "Хорошая устойчивость с естественными колебаниями.";
  else if (stability >= 45) levelText = "Заметные перепады настроения.";
  else levelText = "Высокая волатильность. Эмоциональная турбулентность.";

  function stabilityColor(s) {
    if (s >= 75) return "#4caf87";
    if (s >= 50) return "#f0a500";
    return "#e05555";
  }

  // Последние 10 записей с заметками
  const notes = getNotesHistory ? getNotesHistory() : [];
  const last10 = history.slice(-10).reverse();

  // Строим карточки последних записей с заметками
  function buildEntryCards(entries, notes) {
    return entries.map((e, idx) => {
      const d = new Date(e.time);
      const dateStr = d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      const color = e.value >= 70 ? "#4caf87" : e.value >= 40 ? "#f0a500" : "#e05555";
      const emoji = e.value >= 70 ? "😊" : e.value >= 40 ? "😐" : "😔";

      // Ищем заметку ближайшую по времени (±30 мин)
      const nearNote = notes.find(n => {
        const nts = n.timestamp || new Date(n.time).getTime();
        return Math.abs(nts - e.time) < 30 * 60 * 1000;
      });
      const noteText = nearNote ? (nearNote.text || nearNote.note || "") : "";

      const pct = e.value;
      const barColor = color;

      return `
        <div class="stab-entry" id="stab-entry-${idx}" style="
          border-radius: 16px;
          background: rgba(232, 237, 230, 0.85);
          box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
          margin-bottom: 10px;
          overflow: hidden;
        ">
          <!-- Заголовок записи — кликабельный -->
          <div class="stab-entry-header" data-idx="${idx}" style="
            display: flex; align-items: center; gap: 12px;
            padding: 12px 14px; cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          ">
            <div style="
              width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
              background: ${color}22;
              display: flex; align-items: center; justify-content: center;
              font-size: 20px;
            ">${emoji}</div>
            <div style="flex: 1;">
              <div style="font-size: 13px; color: #888; margin-bottom: 2px;">${dateStr}</div>
              <!-- Прогресс-бар -->
              <div style="height: 6px; border-radius: 4px; background: #d0d9cc; overflow: hidden; margin-top: 4px;">
                <div style="height: 100%; width: ${pct}%; background: ${barColor}; border-radius: 4px; transition: width 0.4s;"></div>
              </div>
            </div>
            <div style="font-size: 18px; font-weight: bold; color: ${color}; flex-shrink: 0;">${e.value}%</div>
            <div class="stab-chevron" data-idx="${idx}" style="font-size: 14px; color: #aaa; flex-shrink: 0; transition: transform 0.2s;">›</div>
          </div>

          <!-- Раскрывающийся блок заметки -->
          <div class="stab-entry-detail" data-idx="${idx}" style="
            display: none;
            padding: 0 14px 14px 14px;
          ">
            <div style="
              padding: 12px 14px; border-radius: 12px;
              background: rgba(255,255,255,0.4);
              box-shadow: inset 3px 3px 6px #c4c9c2, inset -3px -3px 6px #ffffff;
              font-size: 14px; color: #555; line-height: 1.6;
            ">
              ${noteText
                ? `<div style="font-size:11px; color:#aaa; margin-bottom:6px;">📝 Заметка</div>${noteText}`
                : `<div style="color:#aaa; font-size:13px; font-style:italic;">Заметка не добавлена</div>`
              }
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  container.innerHTML = `
    <style>
      .stab-section-title {
        font-size: 13px; color: #888; font-weight: 600;
        margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .stab-card {
        padding: 16px; border-radius: 18px;
        background: rgba(232, 237, 230, 0.85);
        box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
        margin-bottom: 12px;
      }
      .stab-card-label { font-size: 12px; color: #aaa; margin-bottom: 4px; }
      .stab-card-value { font-size: 28px; font-weight: bold; }
      .stab-card-sub { font-size: 13px; color: #888; margin-top: 4px; }
      .stab-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        margin-bottom: 16px;
      }
    </style>

    <div style="padding: 16px; padding-bottom: 100px;">

      <h2 style="margin-bottom: 6px;">Насколько я устойчив?</h2>
      <div style="font-size: 13px; color: #888; margin-bottom: 20px;">Анализ эмоциональных колебаний</div>

      <!-- СЕТКА КАРТОЧЕК -->
      <div class="stab-section-title">📊 Показатели</div>
      <div class="stab-grid">
        <div class="stab-card">
          <div class="stab-card-label">Устойчивость</div>
          <div class="stab-card-value" style="color:${stabilityColor(stability)}">${stability}%</div>
          <div class="stab-card-sub">${levelText}</div>
        </div>
        <div class="stab-card">
          <div class="stab-card-label">Волатильность</div>
          <div class="stab-card-value" style="color:${stabilityColor(100 - volatility)}">${volatility}%</div>
          <div class="stab-card-sub">перепады настроения</div>
        </div>
        <div class="stab-card">
          <div class="stab-card-label">Среднее за 14 дней</div>
          <div class="stab-card-value" style="color:${avg14 ? stabilityColor(avg14) : '#888'}">${avg14 !== null ? avg14 + "%" : "—"}</div>
          <div class="stab-card-sub">${hist14.length} записей</div>
        </div>
        <div class="stab-card">
          <div class="stab-card-label">Тренд</div>
          <div class="stab-card-value" style="font-size:16px; color:${trendColor}">${trendText}</div>
          <div class="stab-card-sub">по последним данным</div>
        </div>
      </div>

      <!-- ГРАФИК 14 ДНЕЙ -->
      <div class="stab-section-title">📈 Динамика за 14 дней</div>
      <div class="stab-card" style="padding:12px;">
        <canvas id="stabilityChart14" height="120"></canvas>
      </div>

      <!-- ПОСЛЕДНИЕ ЗАПИСИ -->
      <div class="stab-section-title" style="margin-top:8px;">🕐 Последние записи</div>
      ${buildEntryCards(last10, notes)}

    </div>
  `;

  // График 14 дней
  requestAnimationFrame(() => {
    const canvas = document.getElementById("stabilityChart14");
    if (!canvas || !window.Chart) return;
    const existing = window.Chart.getChart(canvas);
    if (existing) existing.destroy();

    const sorted14 = hist14.slice().sort((a,b) => a.time - b.time);
    const labels = sorted14.map(e => {
      const d = new Date(e.time);
      return `${d.getDate()}.${d.getMonth()+1}`;
    });
    const data = sorted14.map(e => e.value);
    canvas.width = canvas.parentElement.offsetWidth - 24;

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
  });

  // Раскрытие карточек записей
  container.querySelectorAll(".stab-entry-header").forEach(header => {
    header.addEventListener("click", () => {
      const idx = header.dataset.idx;
      const detail = container.querySelector(`.stab-entry-detail[data-idx="${idx}"]`);
      const chevron = container.querySelector(`.stab-chevron[data-idx="${idx}"]`);
      if (!detail) return;
      const isOpen = detail.style.display === "block";
      detail.style.display = isOpen ? "none" : "block";
      if (chevron) chevron.style.transform = isOpen ? "rotate(0deg)" : "rotate(90deg)";
    });
  });
}