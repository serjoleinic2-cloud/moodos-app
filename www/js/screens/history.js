// ===============================
// MoodOS History Screen
// ===============================
import { getMoodHistory, saveMoodHistory } from "../services/memory.js";
import { getNotesHistory, saveNotesHistory } from "../services/memory.js";
import { getVoiceHistory, saveVoiceHistory } from "../services/memory.js";
import { getSessionHistory, saveSessionHistory } from "../services/memory.js";

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

// ---- МЕТАДАННЫЕ ТИПОВ СЕССИЙ ----
function sessionMeta(sessionType) {
  switch (sessionType) {
    case "breathing":     return { icon: "🫁", label: "Дыхание",            color: "#2d9cdb" };
    case "meditation":    return { icon: "🧘", label: "Медитация",           color: "#9f7aea" };
    case "visual-focus":  return { icon: "👁",  label: "Зрительный якорь",   color: "#6d28d9" };
    case "mind-dump":     return { icon: "🧠", label: "Выгрузка мыслей",     color: "#0891b2" };
    case "tap-calm":      return { icon: "✋", label: "Тактильная разрядка", color: "#22c55e" };
    default:              return { icon: "🔵", label: sessionType || "Практика", color: "#888" };
  }
}

// ---- ФОТО ----
function getPhotoHistory() {
  return JSON.parse(localStorage.getItem("photo_history")) || [];
}

function savePhotoHistory(history) {
  localStorage.setItem("photo_history", JSON.stringify(history));
}

function addPhoto(dataUrl) {
  const history = getPhotoHistory();
  history.push({ dataUrl, timestamp: Date.now() });
  savePhotoHistory(history);
}

function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ---- УДАЛЕНИЕ ----
function deleteItem(item) {
  if (item.type === "mood") {
    const h = getMoodHistory().filter(e => new Date(e.time).getTime() !== item.ts);
    saveMoodHistory(h);
  } else if (item.type === "note") {
    const h = getNotesHistory().filter(e => (e.timestamp || new Date(e.time).getTime()) !== item.ts);
    saveNotesHistory(h);
  } else if (item.type === "voice") {
    const h = getVoiceHistory().filter(e => (e.timestamp || new Date(e.time).getTime()) !== item.ts);
    saveVoiceHistory(h);
  } else if (item.type === "session") {
    const h = getSessionHistory().filter(e => e.timestamp !== item.ts);
    saveSessionHistory(h);
  } else if (item.type === "photo") {
    const h = getPhotoHistory().filter(e => e.timestamp !== item.ts);
    savePhotoHistory(h);
  }
}

function showDeleteDialog(item, onConfirm) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.45);
    z-index:200; display:flex; align-items:center; justify-content:center;
  `;
  overlay.innerHTML = `
    <div style="
      background:#e0e5ec; border-radius:24px;
      box-shadow:10px 10px 20px #b8bec7,-10px -10px 20px #ffffff;
      padding:28px 24px; width:280px; text-align:center;
    ">
      <div style="font-size:36px; margin-bottom:12px;">🗑</div>
      <div style="font-size:17px; font-weight:600; color:#444; margin-bottom:8px;">Удалить запись?</div>
      <div style="font-size:14px; color:#888; margin-bottom:24px;">Это действие нельзя отменить</div>
      <div style="display:flex; gap:12px; justify-content:center;">
        <div id="delCancel" style="
          flex:1; padding:14px; border-radius:16px; cursor:pointer; text-align:center;
          background:#e0e5ec; box-shadow:4px 4px 8px #b8bec7,-4px -4px 8px #ffffff;
          color:#888; font-size:15px;">Отмена</div>
        <div id="delConfirm" style="
          flex:1; padding:14px; border-radius:16px; cursor:pointer; text-align:center;
          background:#e0e5ec; box-shadow:4px 4px 8px #b8bec7,-4px -4px 8px #ffffff;
          color:#e05555; font-size:15px; font-weight:600;">Удалить</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#delCancel").onclick  = () => overlay.remove();
  overlay.querySelector("#delConfirm").onclick = () => { overlay.remove(); onConfirm(); };
}

// ---- ТАЙМЛАЙН ----
function buildTimeline() {
  const items = [];

  getMoodHistory().forEach(entry => {
    items.push({ type: "mood", ts: new Date(entry.time).getTime(), value: entry.value });
  });

  getNotesHistory().forEach(entry => {
    items.push({ type: "note", ts: entry.timestamp || new Date(entry.time).getTime(), text: entry.text || entry.note || "" });
  });

  getVoiceHistory().forEach(entry => {
    items.push({ type: "voice", ts: entry.timestamp || new Date(entry.time).getTime(), text: entry.text || entry.transcript || "" });
  });

  getSessionHistory().forEach(entry => {
    items.push({ type: "session", ts: entry.timestamp, sessionType: entry.type, moodBefore: entry.moodBefore, moodAfter: entry.moodAfter, result: entry.result, duration: entry.duration });
  });

  getPhotoHistory().forEach(entry => {
    items.push({ type: "photo", ts: entry.timestamp, dataUrl: entry.dataUrl });
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

// ---- КАРТОЧКА ----
function renderCard(item) {
  const time = formatTime(item.ts);
  const deleteBtn = `
    <div class="hist-delete-btn" data-ts="${item.ts}" data-type="${item.type}" style="
      padding:8px; margin-left:4px; border-radius:10px; cursor:pointer; flex-shrink:0;
      background:#e0e5ec; box-shadow:3px 3px 6px #b8bec7,-3px -3px 6px #ffffff;
      font-size:16px; display:flex; align-items:center; justify-content:center;
      -webkit-tap-highlight-color:transparent;">🗑</div>`;

  if (item.type === "mood") {
    const color = moodColor(item.value);
    const emoji = moodEmoji(item.value);
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="mood">
        <div class="hist-card-left" style="background:${color}"><span style="font-size:20px;">${emoji}</span></div>
        <div class="hist-card-body">
          <div class="hist-card-title">Настроение</div>
          <div class="hist-card-sub" style="color:${color}; font-size:22px; font-weight:bold;">${item.value}%</div>
        </div>
        <div class="hist-card-time">${time}</div>
        ${deleteBtn}
      </div>`;
  }

  if (item.type === "note") {
    const preview = item.text.length > 60 ? item.text.slice(0, 60) + "..." : item.text;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="note">
        <div class="hist-card-left" style="background:#5a8dee"><span style="font-size:20px;">📝</span></div>
        <div class="hist-card-body">
          <div class="hist-card-title">Заметка</div>
          <div class="hist-card-sub">${preview || "—"}</div>
        </div>
        <div class="hist-card-time">${time}</div>
        ${deleteBtn}
      </div>`;
  }

  if (item.type === "voice") {
    const preview = item.text.length > 60 ? item.text.slice(0, 60) + "..." : item.text;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="voice">
        <div class="hist-card-left" style="background:#9f7aea"><span style="font-size:20px;">🎙️</span></div>
        <div class="hist-card-body">
          <div class="hist-card-title">Голосовая запись</div>
          <div class="hist-card-sub">${preview || "—"}</div>
        </div>
        <div class="hist-card-time">${time}</div>
        ${deleteBtn}
      </div>`;
  }

  if (item.type === "session") {
    const { icon, label, color } = sessionMeta(item.sessionType);
    const resultClr = item.result === "positive" ? "#4caf87" : "#888";
    const resultTxt = item.result === "positive" ? "Помогло" : "Не помогло";
    const min = Math.floor((item.duration || 0) / 60);
    const sec = (item.duration || 0) % 60;
    const durStr = min > 0 ? `${min} мин ${sec} сек` : `${sec} сек`;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="session">
        <div class="hist-card-left" style="background:${color}"><span style="font-size:20px;">${icon}</span></div>
        <div class="hist-card-body">
          <div class="hist-card-title">${label}</div>
          <div class="hist-card-sub" style="color:${resultClr}">${resultTxt} · ${durStr}</div>
        </div>
        <div class="hist-card-time">${time}</div>
        ${deleteBtn}
      </div>`;
  }

  if (item.type === "photo") {
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="photo">
        <div class="hist-card-left" style="background:#f59e0b; overflow:hidden; padding:0;">
          <img src="${item.dataUrl}" style="width:44px;height:44px;object-fit:cover;border-radius:12px;">
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">Фото</div>
          <div class="hist-card-sub" style="color:#888;">${formatDate(item.ts)}</div>
        </div>
        <div class="hist-card-time">${time}</div>
        ${deleteBtn}
      </div>`;
  }

  return "";
}

// ---- ДЕТАЛЬНЫЙ ПРОСМОТР ----
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
        box-shadow:4px 4px 10px #b8bec7,-4px -4px 10px #ffffff;">
        <div style="font-size:16px; line-height:1.7; color:#444;">${item.text || "Нет текста"}</div>
      </div>`;
  }

  if (item.type === "voice") {
    body = `
      <div style="margin-top:20px; padding:18px; border-radius:16px; background:#e0e5ec;
        box-shadow:4px 4px 10px #b8bec7,-4px -4px 10px #ffffff;">
        <div style="font-size:13px; color:#888; margin-bottom:8px;">Транскрипция:</div>
        <div style="font-size:16px; line-height:1.7; color:#444;">${item.text || "Нет текста"}</div>
      </div>`;
  }

  if (item.type === "session") {
    const { icon, label } = sessionMeta(item.sessionType);
    const resultClr = item.result === "positive" ? "#4caf87" : "#888";
    const resultTxt = item.result === "positive" ? "👍 Помогло" : "👎 Не помогло";
    const min = Math.floor((item.duration || 0) / 60);
    const sec = (item.duration || 0) % 60;
    const durStr = min > 0 ? `${min} мин ${sec} сек` : `${sec} сек`;
    body = `
      <div style="text-align:center; margin-top:30px;">
        <div style="font-size:60px;">${icon}</div>
        <div style="font-size:24px; font-weight:600; margin-top:10px;">${label}</div>
      </div>
      <div style="margin-top:24px; display:flex; flex-direction:column; gap:12px;">
        <div class="detail-row"><span>Результат</span><span style="color:${resultClr}; font-weight:600;">${resultTxt}</span></div>
        <div class="detail-row"><span>Длительность</span><span>${durStr}</span></div>
        <div class="detail-row"><span>Настроение до</span><span style="color:${moodColor(item.moodBefore)}">${item.moodBefore ?? "—"}%</span></div>
        <div class="detail-row"><span>Настроение после</span><span style="color:${moodColor(item.moodAfter)}">${item.moodAfter ?? "—"}%</span></div>
      </div>`;
  }

  if (item.type === "photo") {
    body = `
      <div style="margin-top:20px; text-align:center;">
        <img src="${item.dataUrl}" style="
          max-width:100%; border-radius:16px;
          box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;">
      </div>`;
  }

  container.innerHTML = `
    <style>
      .detail-row {
        display:flex; justify-content:space-between;
        padding:14px 16px; border-radius:14px;
        background:#e0e5ec;
        box-shadow:4px 4px 10px #b8bec7,-4px -4px 10px #ffffff;
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
      position:fixed; bottom:calc(88px + env(safe-area-inset-bottom));
      left:0; width:100%; display:flex; justify-content:center; z-index:50;">
      <div id="histBackBtn" style="
        padding:14px 48px; border-radius:20px; background:#e0e5ec;
        box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;
        font-size:16px; color:#555; cursor:pointer;
        -webkit-tap-highlight-color:transparent;">‹ Назад</div>
    </div>
  `;

  document.getElementById("histBackBtn").onclick = () => renderHistory();
}

// ---- ГЛАВНЫЙ РЕНДЕР ----
function renderHistory(filterDate = null) {
  const container = document.getElementById("history-content");
  if (!container) return;

  const allItems = buildTimeline();
  let items = filterDate ? allItems.filter(i => toISODate(i.ts) === filterDate) : allItems;

  const groups = groupByDay(items);
  const days   = Object.keys(groups);

  let html = `
    <style>
      .hist-card {
        display:flex; align-items:center; gap:12px;
        padding:12px; margin-bottom:10px; border-radius:16px;
        background:#e0e5ec;
        box-shadow:4px 4px 10px #b8bec7,-4px -4px 10px #ffffff;
        cursor:pointer;
      }
      .hist-card:active { box-shadow:inset 3px 3px 7px #b8bec7,inset -3px -3px 7px #ffffff; }
      .hist-card-left {
        width:44px; height:44px; border-radius:12px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
      }
      .hist-card-body { flex:1; text-align:left; overflow:hidden; }
      .hist-card-title { font-size:13px; color:#888; margin-bottom:2px; }
      .hist-card-sub { font-size:15px; color:#444; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .hist-card-time { font-size:12px; color:#aaa; flex-shrink:0; }
      .hist-day-label { font-size:13px; color:#888; font-weight:600; margin:16px 0 8px 4px; }
      .hist-date-input {
        flex:1; padding:12px 16px; border:none; border-radius:16px;
        background:#e0e5ec;
        box-shadow:inset 4px 4px 8px #b8bec7,inset -4px -4px 8px #ffffff;
        font-size:15px; color:#555; outline:none; box-sizing:border-box;
      }
    </style>
    <div style="padding:16px; padding-bottom:120px;">
      <h2 style="margin-bottom:16px;">История</h2>
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:16px;">
        <input type="date" id="histDateFilter" class="hist-date-input" value="${filterDate || ""}">
        <div id="histClearDate" style="
          padding:12px 14px; border-radius:14px; cursor:pointer;
          background:#e0e5ec; color:#888; font-size:16px;
          box-shadow:4px 4px 8px #b8bec7,-4px -4px 8px #ffffff;
          display:${filterDate ? "flex" : "none"};
          align-items:center; justify-content:center;">✕</div>
        <div id="histAddPhoto" style="
          padding:12px 14px; border-radius:14px; cursor:pointer;
          background:#e0e5ec; color:#f59e0b; font-size:20px;
          box-shadow:4px 4px 8px #b8bec7,-4px -4px 8px #ffffff;
          display:flex; align-items:center; justify-content:center;">📷</div>
      </div>
      <input type="file" id="histPhotoInput" accept="image/*" style="display:none;">
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

  // Фильтр
  document.getElementById("histDateFilter").onchange = (e) => renderHistory(e.target.value || null);
  document.getElementById("histClearDate").onclick   = () => renderHistory(null);

  // Кнопка фото — показываем выбор камера/галерея
  document.getElementById("histAddPhoto").onclick = () => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.45);
      z-index:200; display:flex; align-items:flex-end;`;
    overlay.innerHTML = `
      <div style="
        background:#e0e5ec; border-radius:24px 24px 0 0;
        padding:24px 20px 48px; width:100%; box-sizing:border-box;">
        <div style="font-size:16px; font-weight:600; color:#444; margin-bottom:20px; text-align:center;">Добавить фото</div>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div id="photoCamera" style="
            padding:16px; border-radius:16px; cursor:pointer; text-align:center;
            background:#e0e5ec; box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;
            color:#555; font-size:17px;">📸 Сделать фото</div>
          <div id="photoGallery" style="
            padding:16px; border-radius:16px; cursor:pointer; text-align:center;
            background:#e0e5ec; box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;
            color:#555; font-size:17px;">🖼 Выбрать из галереи</div>
          <div id="photoCancel" style="
            padding:16px; border-radius:16px; cursor:pointer; text-align:center;
            background:#e0e5ec; box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;
            color:#aaa; font-size:17px;">Отмена</div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#photoCancel").onclick = () => overlay.remove();
    overlay.querySelector("#photoCamera").onclick = () => {
      overlay.remove();
      const inp = document.getElementById("histPhotoInput");
      inp.setAttribute("capture", "environment");
      inp.click();
    };
    overlay.querySelector("#photoGallery").onclick = () => {
      overlay.remove();
      const inp = document.getElementById("histPhotoInput");
      inp.removeAttribute("capture");
      inp.click();
    };
  };

  document.getElementById("histPhotoInput").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, (dataUrl) => {
      addPhoto(dataUrl);
      renderHistory(filterDate);
    });
    e.target.value = "";
  };

  // Клик по карточке
  container.querySelectorAll(".hist-card").forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest(".hist-delete-btn")) return;
      const ts   = parseInt(card.dataset.ts);
      const type = card.dataset.type;
      const item = allItems.find(i => i.ts === ts && i.type === type);
      if (item) renderDetail(item);
    };
  });

  // Кнопки удаления
  container.querySelectorAll(".hist-delete-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const ts   = parseInt(btn.dataset.ts);
      const type = btn.dataset.type;
      const item = allItems.find(i => i.ts === ts && i.type === type);
      if (!item) return;
      showDeleteDialog(item, () => {
        deleteItem(item);
        renderHistory(filterDate);
      });
    };
  });
}