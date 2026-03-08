// ===============================
// MoodOS History Screen
// ===============================
import { getMoodHistory, getNotesHistory, getVoiceHistory, getSessionHistory } from "../services/memory.js";

export function onEnter() { renderHistory(); }

function moodColor(v) { return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"; }
function moodEmoji(v) { return v>=70?"😊":v>=40?"😐":"😔"; }
function formatDate(ts) { return new Date(ts).toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric"}); }
function formatTime(ts) { return new Date(ts).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}); }
function toISODate(ts) { const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmtSec(s) { if(!s||isNaN(s)) return "0:00"; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; }

const SESSION_META = {
  "breathing":     { icon:"🫁", label:"Дыхание" },
  "meditation":    { icon:"🧘", label:"Медитация" },
  "visual-focus":  { icon:"👁",  label:"Зрительный якорь" },
  "mind-dump":     { icon:"🧠", label:"Выгрузка мыслей" },
  "tap-calm":      { icon:"✋", label:"Тактильная разрядка" }
};

let currentAudio = null;
let allItemsCache = [];

function buildTimeline() {
  const items = [];

  getMoodHistory().forEach(e => items.push({
    type:"mood", ts: new Date(e.time).getTime(), value: e.value
  }));

  // Заметки — НЕ включаем mind-dump записи (они уже есть в session)
  getNotesHistory().forEach(e => {
    if (e.type === "mind-dump") return; // пропускаем — они дублируют session
    items.push({ type:"note", ts: e.timestamp||new Date(e.time).getTime(), text: e.text||e.note||"" });
  });

  // Голосовые — поле может называться audio или audioUrl
  getVoiceHistory().forEach(e => items.push({
    type:"voice",
    ts: e.timestamp||e.time||Date.now(),
    text: e.text||e.transcript||"",
    audioUrl: e.audioUrl || e.audio || null,   // ← voice.js сохраняет как "audio"
    audioDuration: e.duration||0
  }));

  // Фото
  try {
    const photos = JSON.parse(localStorage.getItem("photo_history")||"[]");
    photos.forEach(e => items.push({
      type:"photo", ts: e.timestamp||e.time||Date.now(),
      dataUrl: e.dataUrl||e.photo||null,
      note: e.note||""
    }));
  } catch(e) {}

  // Сессии практик — все типы
  getSessionHistory().forEach(e => items.push({
    type:"session",
    ts: e.timestamp||Date.now(),
    sessionType: e.type,
    moodBefore: e.moodBefore,
    moodAfter:  e.moodAfter,
    stateBefore: e.stateBefore,
    result:     e.result,
    duration:   e.duration,
    tapCount:   e.tapCount||null,
    // mind-dump: текст сохраняется отдельно в notes, здесь только мета
  }));

  items.sort((a,b) => b.ts - a.ts);
  return items;
}

function groupByDay(items) {
  const g = {};
  items.forEach(i => {
    const d = formatDate(i.ts);
    if (!g[d]) g[d] = [];
    g[d].push(i);
  });
  return g;
}

function renderHistory(filterDate=null) {
  const container = document.getElementById("history-content");
  if (!container) return;

  allItemsCache = buildTimeline();
  const items  = filterDate ? allItemsCache.filter(i=>toISODate(i.ts)===filterDate) : allItemsCache;
  const groups = groupByDay(items);
  const days   = Object.keys(groups);

  let cardsHTML = "";
  days.forEach(day => {
    cardsHTML += `<div class="hist-day-label">📅 ${day}</div>`;
    groups[day].forEach(item => { cardsHTML += renderCard(item); });
  });

  if (days.length === 0) {
    cardsHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">📭</div><div style="margin-top:12px;">${filterDate?"Записей за этот день нет":"История пуста"}</div></div>`;
  }

  container.innerHTML = `
    <div style="padding:4px 0 100px 0;">
      <h2 style="margin-bottom:16px;">История</h2>

      <!-- СТРОКА ПОИСКА + КАМЕРА -->
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;">
        <input type="date" id="histDateFilter" class="hist-date-input" value="${filterDate||''}">

        <!-- Кнопка камеры -->
        <div id="histCameraBtn" style="
          width:48px;height:48px;border-radius:14px;flex-shrink:0;cursor:pointer;
          background:rgba(232,237,230,0.9);
          box-shadow:4px 4px 8px #b8c4b4,-4px -4px 8px #ffffff;
          display:flex;align-items:center;justify-content:center;font-size:22px;">📷</div>

        <div id="histClearDate" style="display:${filterDate?'flex':'none'};width:48px;height:48px;border-radius:14px;cursor:pointer;background:rgba(232,237,230,0.9);color:#888;font-size:18px;box-shadow:4px 4px 8px #b8c4b4,-4px -4px 8px #ffffff;align-items:center;justify-content:center;flex-shrink:0;">✕</div>
      </div>

      <!-- Скрытый input для камеры/галереи -->
      <input type="file" id="histPhotoInput" accept="image/*" capture="environment" style="display:none;">

      ${cardsHTML}
    </div>`;

  // Фильтр по дате
  document.getElementById("histDateFilter").onchange = e => renderHistory(e.target.value||null);
  document.getElementById("histClearDate").onclick = () => renderHistory(null);

  // Камера
  const cameraBtn  = document.getElementById("histCameraBtn");
  const photoInput = document.getElementById("histPhotoInput");

  cameraBtn.addEventListener("click", () => {
    // Показываем выбор: камера или галерея
    showPhotoMenu(container, photoInput);
  });

  photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      savePhoto(ev.target.result);
      renderHistory(filterDate);
    };
    reader.readAsDataURL(file);
    photoInput.value = "";
  });

  // Клики по обычным карточкам
  container.querySelectorAll(".hist-card[data-clickable='1']").forEach(card => {
    card.onclick = () => {
      const ts   = parseInt(card.dataset.ts);
      const type = card.dataset.type;
      const item = allItemsCache.find(i=>i.ts===ts&&i.type===type);
      if (item) renderDetail(item, filterDate);
    };
  });

  // Плееры голосовых
  container.querySelectorAll(".voice-play-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const ts  = btn.dataset.ts;
      const url = btn.dataset.url;
      if (!url) return;
      const seekEl = container.querySelector(`.voice-seek[data-ts="${ts}"]`);
      const curEl  = container.querySelector(`.voice-cur[data-ts="${ts}"]`);
      const totEl  = container.querySelector(`.voice-tot[data-ts="${ts}"]`);

      if (btn._audio && !btn._audio.paused) { btn._audio.pause(); btn.textContent="▶"; return; }
      if (currentAudio && currentAudio !== btn._audio) {
        currentAudio.pause(); currentAudio.currentTime=0;
        container.querySelectorAll(".voice-play-btn").forEach(b=>{ if(b._audio===currentAudio) b.textContent="▶"; });
      }
      if (!btn._audio) {
        btn._audio = new Audio(url);
        btn._audio.addEventListener("timeupdate",()=>{
          const dur=btn._audio.duration||0, cur=btn._audio.currentTime;
          if(seekEl) seekEl.value=dur?(cur/dur*100):0;
          if(curEl)  curEl.textContent=fmtSec(cur);
          if(totEl&&dur) totEl.textContent=fmtSec(dur);
        });
        btn._audio.addEventListener("ended",()=>{ btn.textContent="▶"; if(seekEl) seekEl.value=0; if(curEl) curEl.textContent="0:00"; });
      }
      btn._audio.play(); currentAudio=btn._audio; btn.textContent="⏸";
    });
  });

  container.querySelectorAll(".voice-seek").forEach(seek => {
    seek.addEventListener("input", e => {
      e.stopPropagation();
      const ts=seek.dataset.ts;
      const pb=container.querySelector(`.voice-play-btn[data-ts="${ts}"]`);
      if(pb&&pb._audio){ const d=pb._audio.duration; if(d) pb._audio.currentTime=(seek.value/100)*d; }
    });
  });
}

// ---- Меню выбора фото ----
function showPhotoMenu(container, photoInput) {
  const existing = document.getElementById("photoMenuOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "photoMenuOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:flex-end;";

  overlay.innerHTML = `
    <div style="width:100%;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:20px 20px 50px;box-shadow:0 -8px 30px rgba(0,0,0,0.12);">
      <div style="font-size:16px;font-weight:600;color:#3a3530;margin-bottom:16px;text-align:center;">Добавить фото</div>
      <div id="pmCamera" style="padding:16px;margin-bottom:10px;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;color:#555;font-size:17px;cursor:pointer;">📷 Сделать фото</div>
      <div id="pmGallery" style="padding:16px;margin-bottom:10px;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;color:#555;font-size:17px;cursor:pointer;">🖼 Выбрать из галереи</div>
      <div id="pmCancel"  style="padding:16px;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;color:#888;font-size:17px;cursor:pointer;text-align:center;">Отмена</div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector("#pmCamera").onclick = () => {
    overlay.remove();
    photoInput.setAttribute("capture","environment");
    photoInput.click();
  };
  overlay.querySelector("#pmGallery").onclick = () => {
    overlay.remove();
    photoInput.removeAttribute("capture");
    photoInput.click();
  };
  overlay.querySelector("#pmCancel").onclick  = () => overlay.remove();
  overlay.addEventListener("click", e => { if(e.target===overlay) overlay.remove(); });
}

function savePhoto(dataUrl) {
  try {
    const arr = JSON.parse(localStorage.getItem("photo_history")||"[]");
    arr.push({ dataUrl, timestamp: Date.now(), note:"" });
    localStorage.setItem("photo_history", JSON.stringify(arr));
  } catch(e) {}
}

// ---- Рендер карточки ----
function renderCard(item) {
  const time = formatTime(item.ts);

  if (item.type === "mood") {
    const col=moodColor(item.value), emo=moodEmoji(item.value);
    return `<div class="hist-card" data-ts="${item.ts}" data-type="mood" data-clickable="1">
      <div class="hist-card-left" style="background:${col}22;"><span style="font-size:20px;">${emo}</span></div>
      <div class="hist-card-body"><div class="hist-card-title">Настроение</div><div class="hist-card-sub" style="color:${col};font-size:20px;font-weight:700;">${item.value}%</div></div>
      <div class="hist-card-time">${time}</div>
    </div>`;
  }

  if (item.type === "note") {
    const prev = item.text.length>60 ? item.text.slice(0,60)+"..." : item.text;
    return `<div class="hist-card" data-ts="${item.ts}" data-type="note" data-clickable="1">
      <div class="hist-card-left" style="background:#5a8dee22;"><span style="font-size:20px;">📝</span></div>
      <div class="hist-card-body"><div class="hist-card-title">Заметка</div><div class="hist-card-sub">${prev||"—"}</div></div>
      <div class="hist-card-time">${time}</div>
    </div>`;
  }

  if (item.type === "photo") {
    return `<div class="hist-card" data-ts="${item.ts}" data-type="photo" data-clickable="1">
      <div class="hist-card-left" style="background:#f59e0b22;overflow:hidden;border-radius:12px;">
        ${item.dataUrl ? `<img src="${item.dataUrl}" style="width:44px;height:44px;object-fit:cover;border-radius:12px;">` : `<span style="font-size:20px;">📷</span>`}
      </div>
      <div class="hist-card-body"><div class="hist-card-title">Фото</div><div class="hist-card-sub">${item.note||"Фотозапись настроения"}</div></div>
      <div class="hist-card-time">${time}</div>
    </div>`;
  }

  if (item.type === "voice") {
    const prev = item.text&&item.text.length>50 ? item.text.slice(0,50)+"..." : item.text||"";
    const hasAudio = !!item.audioUrl;
    const ts = item.ts;
    return `<div class="hist-card" style="flex-direction:column;align-items:stretch;cursor:default;" data-ts="${ts}" data-type="voice">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="hist-card-left" style="background:#9f7aea22;"><span style="font-size:20px;">🎙️</span></div>
        <div class="hist-card-body"><div class="hist-card-title">Голосовая запись</div><div class="hist-card-sub">${prev||"Голосовой дневник"}</div></div>
        <div class="hist-card-time">${time}</div>
      </div>
      ${hasAudio ? `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="voice-play-btn" data-ts="${ts}" data-url="${item.audioUrl}"
            style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:#9f7aea22;box-shadow:3px 3px 6px #b8c4b4,-3px -3px 6px #ffffff;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;">▶</div>
          <div style="flex:1;">
            <input type="range" class="voice-seek" data-ts="${ts}" min="0" max="100" value="0" step="0.1"
              style="width:100%;accent-color:#9f7aea;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#bbb;margin-top:2px;">
              <span class="voice-cur" data-ts="${ts}">0:00</span>
              <span class="voice-tot" data-ts="${ts}">${fmtSec(item.audioDuration)}</span>
            </div>
          </div>
        </div>
      </div>` : `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;color:#bbb;">🔇 Аудио не сохранено</div>`}
    </div>`;
  }

  if (item.type === "session") {
    const meta = SESSION_META[item.sessionType] || { icon:"🛠", label: item.sessionType||"Практика" };
    const rc   = item.result==="positive" ? "#4caf87" : "#888";
    const rt   = item.result==="positive" ? "Помогло" : "Не помогло";
    const min  = Math.floor((item.duration||0)/60);
    const sec  = (item.duration||0)%60;
    const dur  = min>0 ? `${min} мин ${sec} сек` : `${sec} сек`;
    const extra = item.tapCount ? ` · ${item.tapCount} нажатий` : "";
    // Для mind-dump показываем превью текста
    const mdPreview = item.sessionType==="mind-dump" && item.text
      ? `<div class="hist-card-sub" style="color:#999;font-size:12px;margin-top:2px;">${item.text.slice(0,50)}${item.text.length>50?"...":""}</div>`
      : "";
    return `<div class="hist-card" data-ts="${item.ts}" data-type="session" data-clickable="1">
      <div class="hist-card-left" style="background:#2d9cdb22;"><span style="font-size:20px;">${meta.icon}</span></div>
      <div class="hist-card-body">
        <div class="hist-card-title">${meta.label}</div>
        <div class="hist-card-sub" style="color:${rc}">${rt} · ${dur}${extra}</div>
        ${mdPreview}
      </div>
      <div class="hist-card-time">${time}</div>
    </div>`;
  }

  return "";
}

// ---- Детальный просмотр ----
function renderDetail(item, filterDate) {
  const container = document.getElementById("history-content");
  const time = formatTime(item.ts), date = formatDate(item.ts);
  let body = "";

  if (item.type === "mood") {
    const col = moodColor(item.value);
    body = `<div style="text-align:center;margin-top:40px;">
      <div style="font-size:64px;">${moodEmoji(item.value)}</div>
      <div style="font-size:48px;font-weight:700;color:${col};margin-top:12px;">${item.value}%</div>
      <div style="color:#888;margin-top:8px;">Настроение</div>
    </div>`;
  }

  if (item.type === "note") {
    body = `<div class="mo-metric" style="margin-top:20px;">
      <div style="font-size:16px;line-height:1.7;color:#444;">${item.text||"Нет текста"}</div>
    </div>`;
  }

  if (item.type === "photo") {
    body = `<div style="margin-top:20px;text-align:center;">
      ${item.dataUrl ? `<img src="${item.dataUrl}" style="max-width:100%;border-radius:18px;box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;">` : "Нет изображения"}
      ${item.note ? `<div style="margin-top:12px;color:#666;font-size:15px;">${item.note}</div>` : ""}
    </div>`;
  }

  if (item.type === "session") {
    const meta = SESSION_META[item.sessionType] || { icon:"🛠", label: item.sessionType||"Практика" };
    const rc   = item.result==="positive" ? "#4caf87" : "#888";
    const rt   = item.result==="positive" ? "👍 Помогло" : "👎 Не помогло";
    const min  = Math.floor((item.duration||0)/60);
    const sec  = (item.duration||0)%60;
    const dur  = min>0 ? `${min} мин ${sec} сек` : `${sec} сек`;
    body = `<div style="text-align:center;margin-top:30px;">
      <div style="font-size:56px;">${meta.icon}</div>
      <div style="font-size:22px;font-weight:600;margin-top:10px;">${meta.label}</div>
    </div>
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">
      ${detRow("Результат",`<span style="color:${rc};font-weight:600;">${rt}</span>`)}
      ${detRow("Длительность", dur)}
      ${item.moodBefore!=null?detRow("Настроение до",`<span style="color:${moodColor(item.moodBefore)}">${item.moodBefore}%</span>`):""}
      ${item.moodAfter!=null?detRow("Настроение после",`<span style="color:${moodColor(item.moodAfter)}">${item.moodAfter}%</span>`):""}
      ${item.tapCount?detRow("Нажатий", item.tapCount):""}
      ${item.text?`<div class="mo-metric" style="margin-top:4px;"><div style="font-size:11px;color:#aaa;margin-bottom:6px;">📝 Записанные мысли</div><div style="font-size:15px;color:#444;line-height:1.7;">${item.text}</div></div>`:""}
    </div>`;
  }

  container.innerHTML = `
    <div style="padding:16px 16px 120px;">
      <div style="margin-bottom:18px;">
        <div style="font-weight:600;font-size:16px;color:#3a3530;">${date}</div>
        <div style="color:#888;font-size:13px;margin-top:2px;">${time}</div>
      </div>
      ${body}
    </div>
    <div style="position:fixed;bottom:calc(88px + env(safe-area-inset-bottom));left:0;width:100%;display:flex;justify-content:center;z-index:50;">
      <div id="histBackBtn" style="padding:14px 48px;border-radius:20px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;font-size:16px;color:#555;cursor:pointer;">‹ Назад</div>
    </div>`;

  document.getElementById("histBackBtn").onclick = () => renderHistory(filterDate);
}

function detRow(label, valHTML) {
  return `<div class="mo-metric" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;">
    <span style="color:#888;">${label}</span>${valHTML}</div>`;
}