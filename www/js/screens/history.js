// ===============================
// MoodOS — История
// ===============================
import {
  getMoodHistory, saveMoodHistory,
  getNotesHistory, saveNotesHistory,
  getVoiceHistory,
  getSessionHistory
} from "../services/memory.js";

export function onEnter() {
  renderHistory();
}

// ---- ЦВЕТА / ЭМОДЗИ ----
function moodColor(v) {
  return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555";
}
function moodEmoji(v) {
  return v>=70?"😊":v>=40?"😐":"😔";
}

// ---- ФОРМАТИРОВАНИЕ ----
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric"});
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
}
function toISODate(ts) {
  const d=new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ---- СБОРКА ТАЙМЛАЙНА ----
function buildTimeline() {
  const items = [];

  getMoodHistory().forEach(e => items.push({
    type:"mood", ts:new Date(e.time).getTime(), value:e.value
  }));

  getNotesHistory().forEach(e => items.push({
    type:"note",
    ts: e.timestamp||new Date(e.time||Date.now()).getTime(),
    text: e.text||e.note||""
  }));

  getVoiceHistory().forEach(e => items.push({
    type:"voice",
    ts: e.timestamp||new Date(e.time||Date.now()).getTime(),
    text: e.text||e.transcript||""
  }));

  getSessionHistory().forEach(e => items.push({
    type:"session", ts:e.timestamp,
    sessionType:e.type, moodBefore:e.moodBefore,
    moodAfter:e.moodAfter, result:e.result, duration:e.duration
  }));

  // Фото из localStorage
  const photos = JSON.parse(localStorage.getItem("photo_history")||"[]");
  photos.forEach(p => items.push({
    type:"photo", ts:p.ts, dataUrl:p.dataUrl, caption:p.caption||""
  }));

  items.sort((a,b) => b.ts-a.ts);
  return items;
}

// ---- КАРТОЧКА ----
function renderCard(item) {
  const time = fmtTime(item.ts);

  const deleteBtn = `
    <div class="hist-delete" data-ts="${item.ts}" data-type="${item.type}"
      title="Удалить запись">🗑</div>`;

  if (item.type === "mood") {
    const c = moodColor(item.value);
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="mood">
        <div class="hist-card-left" style="background:${c}">
          <span style="font-size:20px;">${moodEmoji(item.value)}</span>
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">Настроение</div>
          <div class="hist-card-val" style="color:${c}">${item.value}%</div>
        </div>
        <div class="hist-card-right">
          <div class="hist-card-time">${time}</div>
          ${deleteBtn}
        </div>
      </div>`;
  }

  if (item.type === "note") {
    const prev = item.text.length>60 ? item.text.slice(0,60)+"…" : item.text;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="note">
        <div class="hist-card-left" style="background:#5a8dee">
          <span style="font-size:20px;">📝</span>
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">Заметка</div>
          <div class="hist-card-sub">${prev||"—"}</div>
        </div>
        <div class="hist-card-right">
          <div class="hist-card-time">${time}</div>
          ${deleteBtn}
        </div>
      </div>`;
  }

  if (item.type === "voice") {
    const prev = item.text.length>60 ? item.text.slice(0,60)+"…" : item.text;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="voice">
        <div class="hist-card-left" style="background:#9f7aea">
          <span style="font-size:20px;">🎙️</span>
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">Голосовая запись</div>
          <div class="hist-card-sub">${prev||"—"}</div>
        </div>
        <div class="hist-card-right">
          <div class="hist-card-time">${time}</div>
          ${deleteBtn}
        </div>
      </div>`;
  }

  if (item.type === "session") {
    const icon  = item.sessionType==="breathing"?"🫁":"🧘";
    const label = item.sessionType==="breathing"?"Дыхание":"Медитация";
    const rc    = item.result==="positive"?"#4caf87":"#888";
    const rt    = item.result==="positive"?"Помогло":"Не помогло";
    const min   = Math.floor((item.duration||0)/60);
    const sec   = (item.duration||0)%60;
    const dur   = min>0?`${min} мин ${sec} сек`:`${sec} сек`;
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="session">
        <div class="hist-card-left" style="background:#2d9cdb">
          <span style="font-size:20px;">${icon}</span>
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">${label}</div>
          <div class="hist-card-sub" style="color:${rc}">${rt} · ${dur}</div>
        </div>
        <div class="hist-card-right">
          <div class="hist-card-time">${time}</div>
          ${deleteBtn}
        </div>
      </div>`;
  }

  if (item.type === "photo") {
    return `
      <div class="hist-card" data-ts="${item.ts}" data-type="photo">
        <div class="hist-card-left" style="background:#e8a87c;overflow:hidden;padding:0;">
          <img src="${item.dataUrl}" style="width:44px;height:44px;object-fit:cover;border-radius:12px;">
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">Фото</div>
          <div class="hist-card-sub">${item.caption||"Момент дня"}</div>
        </div>
        <div class="hist-card-right">
          <div class="hist-card-time">${time}</div>
          ${deleteBtn}
        </div>
      </div>`;
  }

  return "";
}

// ---- ДЕТАЛЬНЫЙ ВИД ----
function renderDetail(item, allItems) {
  const container = document.getElementById("history-content");
  const time = fmtTime(item.ts);
  const date = fmtDate(item.ts);
  let body = "";

  if (item.type === "mood") {
    const c = moodColor(item.value);
    body = `
      <div style="text-align:center;margin-top:40px;">
        <div style="font-size:72px;">${moodEmoji(item.value)}</div>
        <div style="font-size:52px;font-weight:800;color:${c};margin-top:12px;">${item.value}%</div>
        <div style="color:#888;margin-top:8px;font-size:16px;">Настроение</div>
      </div>`;
  }

  if (item.type === "note") {
    body = `
      <div style="margin-top:20px;padding:18px;border-radius:16px;background:#e0e5ec;
        box-shadow:4px 4px 10px #b8bec7,-4px -4px 10px #ffffff;">
        <div style="font-size:16px;line-height:1.7;color:#444;">${item.text||"Нет текста"}</div>
      </div>`;
  }

  if (item.type === "voice") {
    body = `
      <div style="margin-top:20px;padding:18px;border-radius:16px;background:#e0e5ec;
        box-shadow:4px 4px 10px #b8bec7,-4px -4px 10px #ffffff;">
        <div style="font-size:13px;color:#888;margin-bottom:8px;">Транскрипция:</div>
        <div style="font-size:16px;line-height:1.7;color:#444;">${item.text||"Нет текста"}</div>
      </div>`;
  }

  if (item.type === "photo") {
    body = `
      <div style="margin-top:20px;border-radius:18px;overflow:hidden;
        box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;">
        <img src="${item.dataUrl}" style="width:100%;display:block;">
      </div>
      ${item.caption?`<div style="margin-top:12px;padding:14px;border-radius:14px;background:#e0e5ec;
        box-shadow:4px 4px 9px #b8bec7,-4px -4px 9px #ffffff;font-size:15px;color:#555;">
        ${item.caption}</div>`:""}`;
  }

  if (item.type === "session") {
    const icon  = item.sessionType==="breathing"?"🫁":"🧘";
    const label = item.sessionType==="breathing"?"Дыхание":"Медитация";
    const rc    = item.result==="positive"?"#4caf87":"#888";
    const rt    = item.result==="positive"?"👍 Помогло":"👎 Не помогло";
    const min   = Math.floor((item.duration||0)/60);
    const sec   = (item.duration||0)%60;
    const dur   = min>0?`${min} мин ${sec} сек`:`${sec} сек`;
    body = `
      <div style="text-align:center;margin-top:30px;">
        <div style="font-size:60px;">${icon}</div>
        <div style="font-size:24px;font-weight:600;margin-top:10px;">${label}</div>
      </div>
      <div style="margin-top:24px;display:flex;flex-direction:column;gap:10px;">
        <div class="detail-row"><span>Результат</span><span style="color:${rc};font-weight:600;">${rt}</span></div>
        <div class="detail-row"><span>Длительность</span><span>${dur}</span></div>
        <div class="detail-row"><span>Настроение до</span><span style="color:${moodColor(item.moodBefore)}">${item.moodBefore}%</span></div>
        <div class="detail-row"><span>Настроение после</span><span style="color:${moodColor(item.moodAfter)}">${item.moodAfter}%</span></div>
      </div>`;
  }

  container.innerHTML = `
    <style>
      .detail-row {
        display:flex;justify-content:space-between;
        padding:14px 16px;border-radius:14px;
        background:#e0e5ec;
        box-shadow:4px 4px 10px #b8bec7,-4px -4px 10px #ffffff;
        font-size:15px;color:#555;
      }
    </style>
    <div style="padding:16px;padding-bottom:120px;font-family:-apple-system,sans-serif;">
      <div style="margin-bottom:20px;">
        <div style="font-weight:700;font-size:17px;color:#3d3d3d;">${date}</div>
        <div style="color:#aaa;font-size:13px;margin-top:2px;">${time}</div>
      </div>
      ${body}
    </div>
    <div style="position:fixed;bottom:calc(88px + env(safe-area-inset-bottom));left:0;width:100%;
      display:flex;justify-content:center;z-index:50;">
      <div id="histBackBtn" style="padding:14px 48px;border-radius:20px;background:#e0e5ec;
        box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;
        font-size:16px;color:#555;cursor:pointer;-webkit-tap-highlight-color:transparent;">
        ‹ Назад
      </div>
    </div>`;

  document.getElementById("histBackBtn").onclick = () => renderHistory();
}

// ---- УДАЛЕНИЕ ----
function confirmDelete(ts, type, onConfirm) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.4);
    z-index:500;display:flex;align-items:flex-end;`;

  overlay.innerHTML = `
    <div style="width:100%;background:#e0e5ec;border-radius:24px 24px 0 0;
      padding:28px 24px 48px;box-sizing:border-box;
      font-family:-apple-system,sans-serif;">
      <div style="font-size:18px;font-weight:700;color:#3d3d3d;margin-bottom:8px;">
        Удалить запись?
      </div>
      <div style="font-size:14px;color:#aaa;margin-bottom:24px;line-height:1.5;">
        Это действие нельзя отменить
      </div>
      <button id="delConfirm" style="width:100%;padding:15px;border:none;border-radius:16px;
        background:#e0e5ec;box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
        font-size:16px;font-weight:700;color:#e05555;cursor:pointer;margin-bottom:10px;">
        🗑 Да, удалить
      </button>
      <button id="delCancel" style="width:100%;padding:13px;border:none;background:none;
        font-size:15px;color:#aaa;cursor:pointer;">
        Отмена
      </button>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector("#delConfirm").onclick = () => { overlay.remove(); onConfirm(); };
  overlay.querySelector("#delCancel").onclick  = () => overlay.remove();
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
}

function deleteEntry(ts, type) {
  if (type === "mood") {
    const h = getMoodHistory().filter(e => new Date(e.time).getTime() !== ts);
    saveMoodHistory(h);
  }
  if (type === "note") {
    const h = getNotesHistory().filter(e => (e.timestamp||new Date(e.time||0).getTime()) !== ts);
    saveNotesHistory(h);
  }
  if (type === "photo") {
    const h = JSON.parse(localStorage.getItem("photo_history")||"[]").filter(p=>p.ts!==ts);
    localStorage.setItem("photo_history", JSON.stringify(h));
  }
  // voice и session — только из памяти (нет публичного saveVoiceHistory)
  renderHistory();
}

// ---- ДОБАВИТЬ ФОТО ----
function addPhoto() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Сжимаем до 800px
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 800;
        let w = img.width, h = img.height;
        if (w > max) { h = Math.round(h*max/w); w = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        const caption = prompt("Подпись к фото (необязательно)") || "";
        const photos  = JSON.parse(localStorage.getItem("photo_history")||"[]");
        photos.push({ ts: Date.now(), dataUrl, caption });
        localStorage.setItem("photo_history", JSON.stringify(photos));
        renderHistory();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ---- ГЛАВНЫЙ РЕНДЕР ----
function renderHistory(filterDate = null) {
  const container = document.getElementById("history-content");
  if (!container) return;

  const allItems = buildTimeline();
  const items    = filterDate
    ? allItems.filter(i => toISODate(i.ts) === filterDate)
    : allItems;

  const groups = {};
  items.forEach(item => {
    const day = fmtDate(item.ts);
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
  });
  const days = Object.keys(groups);

  container.innerHTML = `
    <style>
      .hist-wrap { padding:16px 16px 100px; font-family:-apple-system,'SF Pro Display',sans-serif; }
      .hist-title { font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:16px; }

      .hist-toolbar { display:flex;gap:10px;align-items:center;margin-bottom:16px; }
      .hist-date-input {
        flex:1;padding:12px 16px;border:none;border-radius:16px;
        background:#e0e5ec;
        box-shadow:inset 4px 4px 8px #b8bec7,inset -4px -4px 8px #ffffff;
        font-size:15px;color:#555;outline:none;box-sizing:border-box;
      }
      .hist-icon-btn {
        width:46px;height:46px;border:none;border-radius:14px;
        background:#e0e5ec;
        box-shadow:4px 4px 9px #b8bec7,-4px -4px 9px #ffffff;
        font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;
        -webkit-tap-highlight-color:transparent;flex-shrink:0;
      }
      .hist-icon-btn:active { box-shadow:inset 3px 3px 7px #b8bec7,inset -3px -3px 7px #ffffff; }

      .hist-card {
        display:flex;align-items:center;gap:12px;
        padding:12px;margin-bottom:10px;border-radius:16px;
        background:#e0e5ec;
        box-shadow:4px 4px 10px #b8bec7,-4px -4px 10px #ffffff;
        cursor:pointer;transition:box-shadow 0.2s;
        -webkit-tap-highlight-color:transparent;
      }
      .hist-card:active { box-shadow:inset 3px 3px 7px #b8bec7,inset -3px -3px 7px #ffffff; }
      .hist-card-left {
        width:44px;height:44px;border-radius:12px;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;
      }
      .hist-card-body { flex:1;overflow:hidden; }
      .hist-card-title { font-size:12px;color:#aaa;margin-bottom:2px; }
      .hist-card-val   { font-size:20px;font-weight:800; }
      .hist-card-sub   { font-size:14px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .hist-card-right { display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0; }
      .hist-card-time  { font-size:12px;color:#aaa; }
      .hist-delete {
        font-size:16px;padding:4px;cursor:pointer;opacity:0.5;
        -webkit-tap-highlight-color:transparent;
      }
      .hist-delete:active { opacity:1; }

      .hist-day-label {
        font-size:13px;color:#999;font-weight:700;
        margin:16px 0 8px 4px;letter-spacing:0.3px;
      }
    </style>

    <div class="hist-wrap">
      <div class="hist-title">История</div>

      <div class="hist-toolbar">
        <input type="date" id="histDateFilter" class="hist-date-input"
          value="${filterDate||""}">
        ${filterDate ? `<button class="hist-icon-btn" id="histClearDate">✕</button>` : ""}
        <button class="hist-icon-btn" id="histAddPhoto" title="Добавить фото">📷</button>
      </div>

      ${days.length === 0
        ? `<div style="text-align:center;margin-top:60px;color:#999;">
            <div style="font-size:48px;">📭</div>
            <div style="margin-top:12px;font-size:15px;">
              ${filterDate?"Записей за этот день нет":"История пуста"}
            </div>
           </div>`
        : days.map(day => `
            <div class="hist-day-label">📅 ${day}</div>
            ${groups[day].map(item => renderCard(item)).join("")}
          `).join("")
      }
    </div>
  `;

  // Фильтр по дате
  container.querySelector("#histDateFilter").onchange = e => {
    renderHistory(e.target.value || null);
  };
  container.querySelector("#histClearDate")?.onclick = () => renderHistory(null);

  // Добавить фото
  container.querySelector("#histAddPhoto").onclick = () => addPhoto();

  // Клик по карточке — открыть детали
  container.querySelectorAll(".hist-card").forEach(card => {
    card.onclick = (e) => {
      // Если кликнули на мусорку — не открываем детали
      if (e.target.classList.contains("hist-delete")) return;
      const ts   = parseInt(card.dataset.ts);
      const type = card.dataset.type;
      const item = allItems.find(i => i.ts===ts && i.type===type);
      if (item) renderDetail(item, allItems);
    };
  });

  // Удаление
  container.querySelectorAll(".hist-delete").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const ts   = parseInt(btn.dataset.ts);
      const type = btn.dataset.type;
      confirmDelete(ts, type, () => deleteEntry(ts, type));
    };
  });
}