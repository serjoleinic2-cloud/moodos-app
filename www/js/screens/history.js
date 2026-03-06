// ===============================
// MoodOS History Screen
// ===============================
import { getMoodHistory } from "../services/memory.js";
import { getNotesHistory } from "../services/memory.js";
import { getVoiceHistory } from "../services/memory.js";
import { getSessionHistory } from "../services/memory.js";

export function onEnter() {
  renderHistory();
}

function moodColor(value) {
  if (value >= 70) return "#4caf87";
  if (value >= 40) return "#f0a500";
  return "#e05555";
}

function moodEmoji(value) {
  if (value >= 70) return "😊";
  if (value >= 40) return "😐";
  return "😔";
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit", month: "long", year: "numeric"
  });
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit"
  });
}

function toISODate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildTimeline() {
  const items = [];

  getMoodHistory().forEach(entry => {
    items.push({
      type: "mood",
      ts: new Date(entry.time).getTime(),
      value: entry.value
    });
  });

  getNotesHistory().forEach(entry => {
    items.push({
      type: "note",
      ts: entry.timestamp || new Date(entry.time).getTime(),
      text: entry.text || entry.note || ""
    });
  });

  getVoiceHistory().forEach(entry => {
    items.push({
      type: "voice",
      ts: entry.timestamp || new Date(entry.time).getTime(),
      text: entry.text || entry.transcript || ""
    });
  });

  getSessionHistory().forEach(entry => {
    items.push({
      type: "session",
      ts: entry.timestamp,
      sessionType: entry.type,
      moodBefore: entry.moodBefore,
      moodAfter: entry.moodAfter,
      result: entry.result,
      duration: entry.duration
    });
  });

  items.sort((a, b) => b.ts - a.ts);
  return items;
}

function groupByDay(items) {
  const groups = {};
  items.forEach(item => {
    const day = formatDate(item.ts);
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
  });
  return groups;
}

function renderCard(item) {
  const time = formatTime(item.ts);

  if (item.type === "mood") {
    const color = moodColor(item.value);
    const emoji = moodEmoji(item.value);
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="mood">
        <div class="hist-card-left" style="background:${color}">
          <span style="font-size:20px;">${emoji}</span>
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">Настроение</div>
          <div class="hist-card-sub" style="color:${color}; font-size:22px; font-weight:bold;">${item.value}%</div>
        </div>
        <div class="hist-card-time">${time}</div>
      </div>`;
  }

  if (item.type === "note") {
    const preview = item.text.length > 60 ? item.text.slice(0, 60) + "..." : item.text;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="note">
        <div class="hist-card-left" style="background:#5a8dee">
          <span style="font-size:20px;">📝</span>
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">Заметка</div>
          <div class="hist-card-sub">${preview || "—"}</div>
        </div>
        <div class="hist-card-time">${time}</div>
      </div>`;
  }

  if (item.type === "voice") {
    const preview = item.text.length > 60 ? item.text.slice(0, 60) + "..." : item.text;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="voice">
        <div class="hist-card-left" style="background:#9f7aea">
          <span style="font-size:20px;">🎙️</span>
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">Голосовая запись</div>
          <div class="hist-card-sub">${preview || "—"}</div>
        </div>
        <div class="hist-card-time">${time}</div>
      </div>`;
  }

  if (item.type === "session") {
    const icon      = item.sessionType === "breathing" ? "🫁" : "🧘";
    const label     = item.sessionType === "breathing" ? "Дыхание" : "Медитация";
    const resultClr = item.result === "positive" ? "#4caf87" : "#888";
    const resultTxt = item.result === "positive" ? "Помогло" : "Не помогло";
    const min       = Math.floor((item.duration || 0) / 60);
    const sec       = (item.duration || 0) % 60;
    const durStr    = min > 0 ? `${min} мин ${sec} сек` : `${sec} сек`;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="session">
        <div class="hist-card-left" style="background:#2d9cdb">
          <span style="font-size:20px;">${icon}</span>
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">${label}</div>
          <div class="hist-card-sub" style="color:${resultClr}">${resultTxt} · ${durStr}</div>
        </div>
        <div class="hist-card-time">${time}</div>
      </div>`;
  }

  return "";
}

function renderDetail(item) {
  const container = document.getElementById("history-content");
  const time = formatTime(item.ts);
  const date = formatDate(item.ts);
  let body = "";

  if (item.type === "mood") {
    const color = moodColor(item.value);
    body = `
      <div style="text-align:center; margin-top:40px;">
        <div style="font-size:72px;">${moodEmoji(item.value)}</div>
        <div style="font-size:52px; font-weight:bold; color:${color}; margin-top:12px;">${item.value}%</div>
        <div style="color:#888; margin-top:8px; font-size:16px;">Настроение</div>
      </div>`;
  }

  if (item.type === "note") {
    body = `
      <div style="margin-top:20px; padding:18px; border-radius:16px; background:#e0e5ec;
        box-shadow: 4px 4px 10px #b8bec7, -4px -4px 10px #ffffff;">
        <div style="font-size:16px; line-height:1.7; color:#444;">${item.text || "Нет текста"}</div>
      </div>`;
  }

  if (item.type === "voice") {
    body = `
      <div style="margin-top:20px; padding:18px; border-radius:16px; background:#e0e5ec;
        box-shadow: 4px 4px 10px #b8bec7, -4px -4px 10px #ffffff;">
        <div style="font-size:13px; color:#888; margin-bottom:8px;">Транскрипция:</div>
        <div style="font-size:16px; line-height:1.7; color:#444;">${item.text || "Нет текста"}</div>
      </div>`;
  }

  if (item.type === "session") {
    const icon      = item.sessionType === "breathing" ? "🫁" : "🧘";
    const label     = item.sessionType === "breathing" ? "Дыхание" : "Медитация";
    const resultClr = item.result === "positive" ? "#4caf87" : "#888";
    const resultTxt = item.result === "positive" ? "👍 Помогло" : "👎 Не помогло";
    const min       = Math.floor((item.duration || 0) / 60);
    const sec       = (item.duration || 0) % 60;
    const durStr    = min > 0 ? `${min} мин ${sec} сек` : `${sec} сек`;
    body = `
      <div style="text-align:center; margin-top:30px;">
        <div style="font-size:60px;">${icon}</div>
        <div style="font-size:24px; font-weight:600; margin-top:10px;">${label}</div>
      </div>
      <div style="margin-top:24px; display:flex; flex-direction:column; gap:12px;">
        <div class="detail-row"><span>Результат</span><span style="color:${resultClr}; font-weight:600;">${resultTxt}</span></div>
        <div class="detail-row"><span>Длительность</span><span>${durStr}</span></div>
        <div class="detail-row"><span>Настроение до</span><span style="color:${moodColor(item.moodBefore)}">${item.moodBefore}%</span></div>
        <div class="detail-row"><span>Настроение после</span><span style="color:${moodColor(item.moodAfter)}">${item.moodAfter}%</span></div>
      </div>`;
  }

  container.innerHTML = `
    <style>
      .detail-row {
        display:flex; justify-content:space-between;
        padding:14px 16px; border-radius:14px;
        background:#e0e5ec;
        box-shadow: 4px 4px 10px #b8bec7, -4px -4px 10px #ffffff;
        font-size:15px; color:#555;
      }
    </style>
    <div style="padding:16px; padding-bottom:120px;">
      <div style="margin-bottom:20px;">
        <div style="font-weight:600; font-size:17px;">${date}</div>
        <div style="color:#888; font-size:13px; margin-top:2px;">${time}</div>
      </div>
      ${body}
    </div>
    <div style="
      position:fixed;
      bottom:calc(88px + env(safe-area-inset-bottom));
      left:0; width:100%;
      display:flex; justify-content:center;
      z-index:50;">
      <div id="histBackBtn" style="
        padding:14px 48px; border-radius:20px;
        background:#e0e5ec;
        box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
        font-size:16px; color:#555; cursor:pointer;
        -webkit-tap-highlight-color: transparent;">
        ‹ Назад
      </div>
    </div>
  `;

  document.getElementById("histBackBtn").onclick = () => renderHistory();
}

function renderHistory(filterDate = null) {
  const container = document.getElementById("history-content");
  if (!container) return;

  const allItems = buildTimeline();
  let items = allItems;

  if (filterDate) {
    items = items.filter(item => toISODate(item.ts) === filterDate);
  }

  const groups = groupByDay(items);
  const days   = Object.keys(groups);

  let html = `
    <style>
      .hist-card {
        display:flex; align-items:center; gap:12px;
        padding:12px; margin-bottom:10px; border-radius:16px;
        background:#e0e5ec;
        box-shadow: 4px 4px 10px #b8bec7, -4px -4px 10px #ffffff;
        cursor:pointer; transition: box-shadow 0.2s;
      }
      .hist-card:active {
        box-shadow: inset 3px 3px 7px #b8bec7, inset -3px -3px 7px #ffffff;
      }
      .hist-card-left {
        width:44px; height:44px; border-radius:12px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
      }
      .hist-card-body { flex:1; text-align:left; overflow:hidden; }
      .hist-card-title { font-size:13px; color:#888; margin-bottom:2px; }
      .hist-card-sub {
        font-size:15px; color:#444;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .hist-card-time { font-size:12px; color:#aaa; flex-shrink:0; }
      .hist-day-label {
        font-size:13px; color:#888; font-weight:600;
        margin: 16px 0 8px 4px;
      }
      .hist-date-input {
        flex:1; padding:12px 16px;
        border:none; border-radius:16px;
        background:#e0e5ec;
        box-shadow: inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff;
        font-size:15px; color:#555;
        outline:none; box-sizing:border-box;
      }
    </style>

    <div style="padding:16px;">
      <h2 style="margin-bottom:16px;">История</h2>

      <div style="display:flex; gap:10px; align-items:center; margin-bottom:16px;">
        <input
          type="date"
          id="histDateFilter"
          class="hist-date-input"
          value="${filterDate || ""}">
        <div id="histClearDate" style="
          padding:12px 14px; border-radius:14px; cursor:pointer;
          background:#e0e5ec; color:#888; font-size:16px;
          box-shadow: 4px 4px 8px #b8bec7, -4px -4px 8px #ffffff;
          display:${filterDate ? "flex" : "none"};
          align-items:center; justify-content:center;
          -webkit-tap-highlight-color:transparent;">✕</div>
      </div>
  `;

  if (days.length === 0) {
    html += `
      <div style="text-align:center; margin-top:60px; color:#888;">
        <div style="font-size:48px;">📭</div>
        <div style="margin-top:12px;">${filterDate ? "Записей за этот день нет" : "История пуста"}</div>
      </div>`;
  } else {
    days.forEach(day => {
      html += `<div class="hist-day-label">📅 ${day}</div>`;
      groups[day].forEach(item => { html += renderCard(item); });
    });
  }

  html += `</div>`;
  container.innerHTML = html;

  document.getElementById("histDateFilter").onchange = (e) => {
    renderHistory(e.target.value || null);
  };

  document.getElementById("histClearDate").onclick = () => {
    renderHistory(null);
  };

  container.querySelectorAll(".hist-card").forEach(card => {
    card.onclick = () => {
      const ts   = parseInt(card.dataset.ts);
      const type = card.dataset.type;
      const item = allItems.find(i => i.ts === ts && i.type === type);
      if (item) renderDetail(item);
    };
  });
}