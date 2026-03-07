// ===============================
// MoodOS Stability Screen
// ===============================

import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";

// ---- ВСПЛЫВАЮЩЕЕ ОКНО С РАСШИФРОВКОЙ ----
function showInfoPopup(title, text) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.45);
    z-index:300; display:flex; align-items:center; justify-content:center;
    padding:24px; box-sizing:border-box;
  `;
  overlay.innerHTML = `
    <div style="
      background:#e0e5ec; border-radius:24px;
      box-shadow:10px 10px 20px #b8bec7,-10px -10px 20px #ffffff;
      padding:28px 24px; width:100%; max-width:340px;
    ">
      <div style="font-size:20px; font-weight:700; color:#444; margin-bottom:14px;">${title}</div>
      <div style="font-size:15px; color:#666; line-height:1.7;">${text}</div>
      <div id="infoClose" style="
        margin-top:24px; padding:14px; border-radius:16px; cursor:pointer; text-align:center;
        background:#e0e5ec; box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;
        color:#555; font-size:16px; font-weight:600;">Понятно</div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#infoClose").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

const INFO = {
  stability: {
    title: "Устойчивость",
    text: "Показывает насколько предсказуемо твоё эмоциональное состояние. Высокая устойчивость (85%+) означает ровный фон с небольшими колебаниями. Это не значит «всегда весело» — это значит стабильно и предсказуемо.<br><br><b>85–100%</b> — высокая устойчивость<br><b>65–84%</b> — в целом стабильно<br><b>45–64%</b> — заметные качели<br><b>0–44%</b> — турбулентный период"
  },
  volatility: {
    title: "Волатильность",
    text: "Обратная сторона устойчивости — насколько сильно прыгает твоё настроение между записями. Высокая волатильность говорит о резких перепадах. Низкая — о ровном течении.<br><br>Волатильность = 100% − Устойчивость. Нормально иметь 15–35% волатильности — это живой человек, а не робот."
  },
  avg14: {
    title: "Среднее за 14 дней",
    text: "Среднее значение настроения по всем твоим записям за последние 2 недели. Помогает видеть общий фон — где ты находишься в среднем, без учёта отдельных пиков и провалов.<br><br><b>70%+</b> — хороший фон<br><b>50–69%</b> — нейтральный фон<br><b>ниже 50%</b> — сложный период"
  },
  trend: {
    title: "Тренд",
    text: "Направление изменения настроения по последним 4 записям — растёт, снижается или остаётся стабильным.<br><br><b>↑ растёт</b> — последние записи выше предыдущих<br><b>↓ снижается</b> — последние записи ниже<br><b>→ стабильно</b> — изменения в пределах нормы<br><br>Тренд отражает краткосрочную динамику, не долгосрочный прогноз."
  }
};

export function onEnter() {

  const container = document.getElementById("stability-content");
  if (!container) return;

  const history = getMoodHistory();

  if (!history || history.length < 2) {
    container.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:#888;">
        Недостаточно данных для анализа устойчивости.<br>Сделай несколько записей настроения.
      </div>`;
    return;
  }

  const stability = calculateStabilityScore(history);
  const volatility = 100 - stability;

  let levelText = "Умеренные колебания.";
  let levelColor = "#f0a500";

  if (stability >= 85) {
    levelText = "Высокая устойчивость.";
    levelColor = "#4caf82";
  } else if (stability >= 65) {
    levelText = "В целом стабильно, естественные колебания.";
    levelColor = "#4caf82";
  } else if (stability >= 45) {
    levelText = "Заметные эмоциональные качели.";
    levelColor = "#f0a500";
  } else {
    levelText = "Высокая волатильность. Турбулентный период.";
    levelColor = "#e05555";
  }

  // Среднее за 14 дней
  const last14 = history.slice(-14);
  const avg14 = last14.length
    ? Math.round(last14.reduce((s, e) => s + e.value, 0) / last14.length)
    : null;

  // Тренд
  let trendText = "→ стабильно";
  if (history.length >= 4) {
    const recent = history.slice(-4).map(e => e.value);
    const half = Math.floor(recent.length / 2);
    const avgFirst = recent.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const avgLast  = recent.slice(half).reduce((a, b) => a + b, 0) / (recent.length - half);
    if (avgLast - avgFirst > 5) trendText = "↑ растёт";
    else if (avgFirst - avgLast > 5) trendText = "↓ снижается";
  }

  // Последние 10 записей
  const last10 = history.slice(-10).reverse();

  // Значок ℹ️
  const infoBtn = (key) => `
    <div class="stab-info-btn" data-key="${key}" style="
      position:absolute; top:10px; right:10px;
      width:22px; height:22px; border-radius:50%;
      background:#e0e5ec;
      box-shadow:3px 3px 6px #b8bec7,-3px -3px 6px #ffffff;
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:700; color:#4da6ff;
      cursor:pointer; flex-shrink:0;
      -webkit-tap-highlight-color:transparent;
    ">i</div>`;

  // HTML карточек-жалюзи
  const entriesHTML = last10.map((entry, i) => {
    const date = new Date(entry.time);
    const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const val = entry.value;

    let barColor = "#4caf82";
    if (val < 40) barColor = "#e05555";
    else if (val < 65) barColor = "#f0a500";

    let emoji = "😊";
    if (val < 30) emoji = "😞";
    else if (val < 50) emoji = "😐";
    else if (val >= 80) emoji = "😄";

    let stateLabel = entry.state || "";
    if (!stateLabel) {
      if (val >= 75) stateLabel = "Хорошо";
      else if (val >= 50) stateLabel = "Нормально";
      else if (val >= 30) stateLabel = "Сложновато";
      else stateLabel = "Тяжело";
    }

    return `
      <div class="stab-entry" data-index="${i}" style="
        margin-bottom:10px; border-radius:16px; background:#e0e5ec;
        box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
        overflow:hidden; cursor:pointer;
      ">
        <div class="stab-entry-header" style="display:flex; align-items:center; gap:12px; padding:12px 16px;">
          <span style="font-size:22px;">${emoji}</span>
          <div style="flex:1;">
            <div style="height:8px; border-radius:4px; background:#d0d5de; overflow:hidden;">
              <div style="width:${val}%; height:100%; background:${barColor}; border-radius:4px; transition:width 0.4s ease;"></div>
            </div>
          </div>
          <span style="font-size:15px; font-weight:600; color:#555; min-width:38px; text-align:right;">${val}%</span>
          <span class="stab-arrow" style="font-size:18px; color:#aaa; transition:transform 0.3s ease;">▾</span>
        </div>
        <div class="stab-entry-detail" style="max-height:0; overflow:hidden; transition:max-height 0.35s ease;">
          <div style="padding:0 16px 14px 16px; border-top:1px solid #d0d5de;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; margin-bottom:8px;">
              <span style="color:#888; font-size:13px;">📅 ${dateStr} в ${timeStr}</span>
              <span style="background:#e0e5ec; box-shadow:3px 3px 6px #b8bec7,-3px -3px 6px #ffffff; border-radius:8px; padding:3px 10px; font-size:13px; color:#555;">${stateLabel}</span>
            </div>
            ${entry.note ? `
              <div style="margin-top:8px; padding:10px 12px; border-radius:12px; background:#e0e5ec;
                box-shadow:inset 3px 3px 6px #b8bec7,inset -3px -3px 6px #ffffff;
                color:#555; font-size:14px; line-height:1.5;">📝 ${entry.note}</div>
            ` : `<div style="color:#aaa; font-size:13px; margin-top:8px;">Заметка не добавлена</div>`}
          </div>
        </div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div style="padding:16px 16px 100px 16px;">

      <!-- Карточки сводки -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">

        <div class="stab-info-card" data-key="stability" style="
          border-radius:16px; background:#e0e5ec;
          box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
          padding:16px; text-align:center; position:relative; cursor:pointer;">
          ${infoBtn("stability")}
          <div style="font-size:11px; color:#888; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Устойчивость</div>
          <div style="font-size:28px; font-weight:700; color:#4caf82;">${stability}%</div>
        </div>

        <div class="stab-info-card" data-key="volatility" style="
          border-radius:16px; background:#e0e5ec;
          box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
          padding:16px; text-align:center; position:relative; cursor:pointer;">
          ${infoBtn("volatility")}
          <div style="font-size:11px; color:#888; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Волатильность</div>
          <div style="font-size:28px; font-weight:700; color:${levelColor};">${volatility}%</div>
        </div>

        <div class="stab-info-card" data-key="avg14" style="
          border-radius:16px; background:#e0e5ec;
          box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
          padding:16px; text-align:center; position:relative; cursor:pointer;">
          ${infoBtn("avg14")}
          <div style="font-size:11px; color:#888; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Среднее 14 дней</div>
          <div style="font-size:28px; font-weight:700; color:#555;">${avg14 !== null ? avg14 + "%" : "—"}</div>
        </div>

        <div class="stab-info-card" data-key="trend" style="
          border-radius:16px; background:#e0e5ec;
          box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
          padding:16px; text-align:center; position:relative; cursor:pointer;">
          ${infoBtn("trend")}
          <div style="font-size:11px; color:#888; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Тренд</div>
          <div style="font-size:22px; font-weight:700; color:#555;">${trendText}</div>
        </div>

      </div>

      <!-- Интерпретация -->
      <div style="
        border-radius:16px; background:#e0e5ec;
        box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
        padding:16px; margin-bottom:20px;
        color:${levelColor}; font-size:15px; font-weight:600; text-align:center;">
        ${levelText}
      </div>

      <!-- Последние записи -->
      <div style="font-size:13px; color:#888; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">
        Последние записи — нажми чтобы раскрыть
      </div>

      ${entriesHTML}

    </div>
  `;

  // ---- Клик по карточке или кнопке ℹ️ ----
  container.querySelectorAll(".stab-info-card, .stab-info-btn").forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const key = el.dataset.key;
      if (INFO[key]) showInfoPopup(INFO[key].title, INFO[key].text);
    };
  });

  // ---- Жалюзи ----
  container.querySelectorAll(".stab-entry").forEach(entry => {
    entry.addEventListener("click", () => {
      const detail = entry.querySelector(".stab-entry-detail");
      const arrow  = entry.querySelector(".stab-arrow");
      const isOpen = detail.style.maxHeight !== "0px" && detail.style.maxHeight !== "";

      container.querySelectorAll(".stab-entry-detail").forEach(d => { d.style.maxHeight = "0px"; });
      container.querySelectorAll(".stab-arrow").forEach(a => { a.style.transform = "rotate(0deg)"; });

      if (!isOpen) {
        detail.style.maxHeight = "200px";
        arrow.style.transform = "rotate(180deg)";
      }
    });
  });
}