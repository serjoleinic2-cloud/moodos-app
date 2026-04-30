import { getMoodHistory, getNotesHistory, getVoiceHistory, getSessionHistory, getReflections } from "../services/memory.js";
import { t } from "../i18n.js";

export function onEnter() { renderHistory(); }

function moodColor(v) { return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"; }
function moodEmoji(v) { return v>=70?"😊":v>=40?"😐":"😔"; }
function formatDate(ts) { const d=new Date(ts); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; }
function formatTime(ts) { return new Date(ts).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}); }
function toISODate(ts) { const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmtSec(s) { if(!s||isNaN(s)||!isFinite(s)) return "0:00"; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; }

function SESSION_META() {
  return {
    "breathing":    { icon:"🫁", label: (t("tools_breathing") || "Дыхание").replace(/^🫁\s*/,"") },
    "meditation":   { icon:"🧘", label: (t("tools_meditation") || "Медитация").replace(/^🧘\s*/,"") },
    "visual-focus": { icon:"👁",  label: (t("tools_visual") || "Визуализация").replace(/^👁\s*/,"") },
    "mind-dump":    { icon:"🧠", label: (t("tools_mind") || "Мозговой сброс").replace(/^🧠\s*/,"") },
    "tap-calm":     { icon:"✋", label: (t("tools_tap") || "ЭФР").replace(/^✋\s*/,"") },
    "support-texts": { icon:"💬", label: t("support_texts_title") || "Поддержка" },
    "support_texts": { icon:"💬", label: t("support_texts_title") || "Поддержка" },
  };
}

let currentAudio = null;
let allItemsCache = [];

// ─── Share через Capacitor ────────────────────────────────────
function buildShareText(item) {
  const date = formatDate(item.ts);
  const time = formatTime(item.ts);

  if (item.type === "mood") {
    return `${moodEmoji(item.value)} ${t("hist_mood")}: ${item.value}%\n📅 ${date} ${time}\n\n— Neyra`;
  }
  if (item.type === "note") {
    return `📝 ${t("hist_note")}\n\n"${item.text}"\n\n📅 ${date} ${time}\n— Neyra`;
  }
  if (item.type === "session") {
    const meta = SESSION_META();
    const m = meta[item.sessionType] || { icon:"🛠", label: item.sessionType };
    const result = item.result === "positive" ? t("hist_helped") : t("hist_not_helped");
    return `${m.icon} ${m.label}: ${result}\n📅 ${date} ${time}\n\n— Neyra`;
  }
  if (item.type === "photo") {
    return `📷 ${t("hist_photo")}\n${item.note || t("hist_photo_mood")}\n📅 ${date} ${time}\n— Neyra`;
  }
  if (item.type === "reflection") {
    const moodText = item.mood ? ` (${item.mood}%)` : "";
    return `📝 ${t("hist_reflection") || "Рефлексия"}${moodText}\n\n"${item.text}"\n\n📅 ${date} ${time}\n— Neyra`;
  }
  return null;
}

function shareItem(item) {
  const text = buildShareText(item);
  if (!text) return;

  if (item.type === "photo" && (item.dataUrl || item.uri)) {
    sharePhoto(item);
    return;
  }

  try {
    const Share = window.Capacitor?.Plugins?.Share;
    if (Share) {
      Share.share({ title: "Neyra", text, dialogTitle: t('hist_share_dialog') });
      return;
    }
  } catch(e) {}

  if (navigator.share) {
    navigator.share({ title: "Neyra", text }).catch(() => {});
    return;
  }

  navigator.clipboard?.writeText(text).then(() => {
    showToast("✓ " + t('hist_copied'));
  }).catch(() => {});
}

async function sharePhoto(item) {
  const text = buildShareText(item);
  const Share = window.Capacitor?.Plugins?.Share;
  const Filesystem = window.Capacitor?.Plugins?.Filesystem;
  const Media = window.Capacitor?.Plugins?.Media;
  const Capacitor = window.Capacitor;
  
  let imgSrc = item.uri || item.dataUrl;
  let isFromGallery = item.source === 'gallery';
  
  if (isFromGallery && Media && Capacitor?.isNativePlatform()) {
    try {
      const albumPhotos = await Media.getMedias({ albumName: 'Neyra', quantity: 100 });
      const photo = albumPhotos?.medias?.find(p => {
      const photoTs = typeof p.creationDate === 'number'
        ? p.creationDate
        : new Date(p.creationDate).getTime();
      return Math.abs(photoTs - item.ts) < 5000;
    });
      if (photo?.identifier) {
        const fullPhoto = await Media.getMedias({
          identifiers: [photo.identifier],
          thumbnail: false
        });
        if (fullPhoto?.medias?.[0]?.webPath) {
          imgSrc = fullPhoto.medias[0].webPath;
        }
      }
    } catch(e) {
      console.warn("[share] Could not get full photo, using thumbnail:", e);
    }
  }
  
  if (!imgSrc) return;
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    canvas.width  = img.width  * scale;
    canvas.height = img.height * scale;
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1];
    const fileName = "neyra-photo-" + Date.now() + ".jpg";
    
    if (Share && Filesystem) {
      Filesystem.writeFile({ path: fileName, data: base64, directory: "CACHE" })
        .then(() => Filesystem.getUri({ path: fileName, directory: "CACHE" }))
        .then(fileUri => {
          return Share.share({ title: "Neyra", text, url: fileUri.uri, dialogTitle: t('hist_share_dialog') });
        })
        .catch(err => {
          if (err.name !== "AbortError") {
            console.warn("[share] Capacitor.Share failed:", err);
          }
        });
    } else if (navigator.share) {
      navigator.share({ title: "Neyra", text, url: dataUrl }).catch(() => {});
    }
  };
  img.src = imgSrc;
}

function showToast(msg) {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:#4caf87;color:#fff;padding:10px 20px;border-radius:14px;font-size:14px;font-weight:600;z-index:9999;pointer-events:none;";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ─── Timeline ─────────────────────────────────────────────────
function buildTimeline() {
  const items = [];
  getMoodHistory().forEach(e => items.push({ type:"mood", ts:new Date(e.time).getTime(), value:e.value }));
  getNotesHistory().forEach(e => {
    if (e.type==="mind-dump") return;
    items.push({ type:"note", ts:e.timestamp||new Date(e.time).getTime(), text:e.text||e.note||"" });
  });
  getVoiceHistory().forEach(e => items.push({
    type:"voice_note", ts:e.date||e.timestamp||e.time||Date.now(),
    audioUrl:e.audio||null,
    audioDuration:e.duration||0,
    mood:e.mood||50
  }));
  try {
    const photos = JSON.parse(localStorage.getItem("photo_history")||"[]");
    photos.forEach(e => items.push({
      type: "photo",
      ts: e.timestamp||e.time||Date.now(),
      dataUrl: e.source === 'gallery' ? null : (e.dataUrl||e.photo||null),
      thumbnail: e.thumbnail||null,
      uri: e.uri||null,
      source: e.source||'base64',
      albumName: e.albumName||null,
      note: e.note||""
    }));
  } catch(e) {}
  getSessionHistory().forEach(e => items.push({
    type:"session", ts:e.timestamp||Date.now(),
    sessionType:e.type, moodBefore:e.moodBefore, moodAfter:e.moodAfter,
    stateBefore:e.stateBefore, result:e.result, duration:e.duration, tapCount:e.tapCount||null,
  }));
  getReflections().forEach(e => items.push({ type:"reflection", ts:e.time||Date.now(), text:e.text||"", mood:e.mood||null }));
  items.sort((a,b)=>b.ts-a.ts);
  return items;
}

function groupByDay(items) {
  const g={};
  items.forEach(i=>{ const d=formatDate(i.ts); if(!g[d]) g[d]=[]; g[d].push(i); });
  return g;
}

function deleteItem(item) {
  try {
    if (item.type==="mood") {
      const arr = getMoodHistory().filter(e => new Date(e.time).getTime() !== item.ts);
      localStorage.setItem("mood_history", JSON.stringify(arr));
    } else if (item.type==="note") {
      const arr = getNotesHistory().filter(e => (e.timestamp||new Date(e.time).getTime()) !== item.ts);
      localStorage.setItem("notes_history", JSON.stringify(arr));
    } else if (item.type==="voice_note") {
      const arr = getVoiceHistory().filter(e => (e.date||e.timestamp||e.time) !== item.ts);
      localStorage.setItem("voice_history", JSON.stringify(arr));
    } else if (item.type==="photo") {
      const arr = JSON.parse(localStorage.getItem("photo_history")||"[]");
      const toDelete = arr.find(e => (e.timestamp||e.time) === item.ts);
      if (toDelete?.uri && toDelete.uri.startsWith("file://")) {
        const Filesystem = window.Capacitor?.Plugins?.Filesystem;
        if (Filesystem) {
          const pathMatch = toDelete.uri.match(/\/([^\/]+)$/);
          if (pathMatch) {
            Filesystem.deleteFile({ path: pathMatch[1], directory: "Documents" }).catch(() => {});
          }
        }
      }
      const filtered = arr.filter(e => (e.timestamp||e.time) !== item.ts);
      localStorage.setItem("photo_history", JSON.stringify(filtered));
    } else if (item.type==="session") {
      const arr = getSessionHistory().filter(e => (e.timestamp) !== item.ts);
      localStorage.setItem("session_history", JSON.stringify(arr));
    } else if (item.type==="reflection") {
      const arr = getReflections().filter(e => (e.time) !== item.ts);
      localStorage.setItem("reflections", JSON.stringify(arr));
    }
  } catch(e) {}
}

function compressImage(dataUrl, maxWidth=800, quality=0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

function renderHistory(filterDate=null) {
  const container = document.getElementById("history-content");
  if (!container) return;

  if (currentAudio) { currentAudio.pause(); currentAudio = null; }

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
    cardsHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">📭</div><div style="margin-top:12px;">${filterDate ? t("hist_no_day") : t("hist_no_data")}</div></div>`;
  }

  container.innerHTML = `
    <div style="padding:4px 0 60px 0;">
      <h2 style="margin-bottom:16px;">${t("hist_title")}</h2>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;">
        <input type="date" id="histDateFilter" class="hist-date-input" value="${filterDate||''}">
        <div id="histCameraBtn" style="width:48px;height:48px;border-radius:14px;flex-shrink:0;cursor:pointer;background:rgba(232,237,230,0.9);box-shadow:4px 4px 8px #b8c4b4,-4px -4px 8px #ffffff;display:flex;align-items:center;justify-content:center;font-size:22px;">📷</div>
        <div id="histClearDate" style="display:${filterDate?'flex':'none'};width:48px;height:48px;border-radius:14px;cursor:pointer;background:rgba(232,237,230,0.9);color:#888;font-size:18px;box-shadow:4px 4px 8px #b8c4b4,-4px -4px 8px #ffffff;align-items:center;justify-content:center;flex-shrink:0;">✕</div>
      </div>
      <input type="file" id="histPhotoInput" accept="image/*" capture="environment" style="display:none;">
      ${cardsHTML}
    </div>`;

  document.getElementById("histDateFilter").onchange = e => renderHistory(e.target.value||null);
  document.getElementById("histClearDate").onclick = () => renderHistory(null);

  const cameraBtn  = document.getElementById("histCameraBtn");
  const photoInput = document.getElementById("histPhotoInput");
  cameraBtn.addEventListener("click", () => showPhotoMenu(container, photoInput));
  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);
      await savePhoto(compressed);
      renderHistory(filterDate);
    };
    reader.readAsDataURL(file);
    photoInput.value = "";
  });

  container.querySelectorAll(".hist-card[data-clickable='1']").forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest(".hist-delete-btn")) return;
      const ts=parseInt(card.dataset.ts), type=card.dataset.type;
      const item=allItemsCache.find(i=>i.ts===ts&&i.type===type);
      if (item) renderDetail(item, filterDate);
    };
  });

  container.querySelectorAll(".hist-delete-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const ts=parseInt(btn.dataset.ts), type=btn.dataset.type;
      const item=allItemsCache.find(i=>i.ts===ts&&i.type===type);
      if (item) { deleteItem(item); renderHistory(filterDate); }
    });
  });

  container.querySelectorAll(".hist-share-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const ts = parseInt(btn.dataset.ts);
      const type = btn.dataset.type;
      const item = allItemsCache.find(i => i.ts === ts && i.type === type);
      if (item) shareItem(item);
    });
  });

  // Аудиоплееры
  container.querySelectorAll(".voice-play-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      let url = btn.dataset.url;
      if (!url) return;
      
      // Convert Capacitor file:// URL to web-accessible URL
      const Capacitor = window.Capacitor;
      if (Capacitor?.convertFileSrc && url.startsWith("file://")) {
        url = Capacitor.convertFileSrc(url);
      }
      
      const ts     = btn.dataset.ts;
      const seekEl = container.querySelector(`.voice-seek[data-ts="${ts}"]`);
      const curEl  = container.querySelector(`.voice-cur[data-ts="${ts}"]`);
      const totEl  = container.querySelector(`.voice-tot[data-ts="${ts}"]`);
      const icon   = btn.querySelector("img");

      if (btn._audio && !btn._audio.paused) {
        btn._audio.pause();
        if (icon) icon.src = "/assets/icons/player/play.svg";
        return;
      }
      if (currentAudio && currentAudio !== btn._audio) {
        currentAudio.pause(); currentAudio.currentTime = 0;
        container.querySelectorAll(".voice-play-btn").forEach(b => {
          if (b._audio === currentAudio) {
            const ic = b.querySelector("img");
            if (ic) ic.src = "/assets/icons/player/play.svg";
          }
        });
      }
      if (!btn._audio) {
        const audio = new Audio(url);
        btn._audio = audio;
        const savedDur = parseFloat(btn.dataset.savedDur) || 0;
        if (totEl && savedDur) totEl.textContent = fmtSec(savedDur);
        const updateDuration = () => { if (audio.duration && isFinite(audio.duration)) { if (totEl) totEl.textContent = fmtSec(audio.duration); } };
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("durationchange",  updateDuration);
        audio.addEventListener("timeupdate", () => {
          const dur = (audio.duration && isFinite(audio.duration)) ? audio.duration : savedDur;
          const cur = audio.currentTime;
          if (!dur) return;
          if (curEl) curEl.textContent = fmtSec(cur);
          if (totEl) totEl.textContent = fmtSec(dur);
          if (seekEl && !seekEl._seeking) seekEl.value = (cur / dur) * 100;
        });
        audio.addEventListener("ended", () => {
          if (icon) icon.src = "/assets/icons/player/play.svg";
          if (seekEl) seekEl.value = 0;
          if (curEl)  curEl.textContent = "0:00";
          if (totEl && savedDur) totEl.textContent = fmtSec(savedDur);
        });
      }
      btn._audio.play(); currentAudio = btn._audio;
      if (icon) icon.src = "/assets/icons/player/pause.svg";
    });
  });

  container.querySelectorAll(".voice-seek").forEach(seek => {
    seek.addEventListener("touchstart",  () => { seek._seeking = true; }, { passive: true });
    seek.addEventListener("mousedown",   () => { seek._seeking = true; });
    seek.addEventListener("touchend",    () => { seek._seeking = false; applySeek(seek, container); });
    seek.addEventListener("mouseup",     () => { seek._seeking = false; applySeek(seek, container); });
    seek.addEventListener("input",       e  => { e.stopPropagation(); applySeek(seek, container); });
  });
}

function applySeek(seek, container) {
  const ts = seek.dataset.ts;
  const pb = container.querySelector(`.voice-play-btn[data-ts="${ts}"]`);
  if (pb && pb._audio) {
    const d = pb._audio.duration;
    if (d && isFinite(d)) pb._audio.currentTime = (seek.value / 100) * d;
  }
}

function showPhotoMenu(container, photoInput) {
  const existing = document.getElementById("photoMenuOverlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "photoMenuOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:flex-end;";
  overlay.innerHTML = `
    <div style="width:100%;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:20px 20px calc(80px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,0.12);">
      <div style="font-size:16px;font-weight:600;color:#3a3530;margin-bottom:16px;text-align:center;">${t("hist_add_photo")}</div>
      <div id="pmCamera"  style="padding:16px;margin-bottom:10px;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;color:#555;font-size:17px;cursor:pointer;">${t("hist_camera")}</div>
      <div id="pmGallery" style="padding:16px;margin-bottom:10px;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;color:#555;font-size:17px;cursor:pointer;">${t("hist_gallery")}</div>
      <div id="pmCancel"  style="padding:16px;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;color:#888;font-size:17px;cursor:pointer;text-align:center;">${t("hist_cancel")}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#pmCamera").onclick  = () => { overlay.remove(); photoInput.setAttribute("capture","environment"); photoInput.click(); };
  overlay.querySelector("#pmGallery").onclick = () => { overlay.remove(); photoInput.removeAttribute("capture"); photoInput.click(); };
  overlay.querySelector("#pmCancel").onclick  = () => overlay.remove();
  overlay.addEventListener("click", e => { if(e.target===overlay) overlay.remove(); });
}

async function savePhoto(dataUrl) {
  try {
    const timestamp = Date.now();
    const fileName = `neyra_${timestamp}.jpg`;
    
    const thumbnail = await compressImage(dataUrl, 100, 0.6);
    
    const Capacitor = window.Capacitor;
    const Media = Capacitor?.Plugins?.Media || Capacitor?.Plugins?.CapacitorCommunityMedia;
    
    if (Media && Capacitor?.isNativePlatform()) {
      try {
        await Media.savePhoto({
          path: dataUrl,
          album: { name: 'Neyra' }
        });
        console.log('[PHOTO] Saved to gallery album Neyra');
        
        const arr = JSON.parse(localStorage.getItem("photo_history") || "[]");
        arr.push({
          timestamp,
          albumName: 'Neyra',
          fileName,
          note: "",
          source: 'gallery',
          thumbnail
        });
        if (arr.length > 20) arr.splice(0, arr.length - 20);
        localStorage.setItem("photo_history", JSON.stringify(arr));
        return;
      } catch(mediaErr) {
        console.warn('[PHOTO] Gallery save failed:', mediaErr);
      }
    }
    
    await _savePhotoFallback(dataUrl, timestamp, thumbnail);
  } catch(e) {
    console.error('[PHOTO] savePhoto error:', e);
  }
}

async function _savePhotoFallback(dataUrl, timestamp, thumbnail) {
  try {
    const Capacitor = window.Capacitor;
    const Filesystem = Capacitor?.Plugins?.Filesystem;
    const ts = timestamp || Date.now();
    const fileName = "neyra-" + ts + ".jpg";
    const base64 = dataUrl.split(",")[1];
    
    let uri = dataUrl;
    
    if (Filesystem && base64) {
      try {
        await Filesystem.writeFile({ path: fileName, data: base64, directory: "Documents" });
        const fileInfo = await Filesystem.getUri({ path: fileName, directory: "Documents" });
        uri = fileInfo.uri || dataUrl;
      } catch(e) {
        console.warn("[photo] Filesystem write failed:", e);
      }
    }
    
    const arr = JSON.parse(localStorage.getItem("photo_history") || "[]");
    arr.push({
      dataUrl: dataUrl,
      thumbnail: thumbnail,
      timestamp: ts,
      note: "",
      source: 'base64'
    });
    if (arr.length > 20) arr.splice(0, arr.length - 20);
    localStorage.setItem("photo_history", JSON.stringify(arr));
    
    if (window.scheduleCloudSync) window.scheduleCloudSync();
  } catch(e) {}
}

function renderCard(item) {
  const time = formatTime(item.ts);
  const meta = SESSION_META();
  const delBtn = (type) => `<div class="hist-delete-btn" data-ts="${item.ts}" data-type="${type}" style="padding:6px 10px;border-radius:10px;background:rgba(224,85,85,0.1);color:#e05555;font-size:16px;cursor:pointer;flex-shrink:0;">🗑</div>`;
  const shareBtn = (item) => `<div class="hist-share-btn" data-ts="${item.ts}" data-type="${item.type}" style="padding:6px 10px;border-radius:10px;background:rgba(76,175,135,0.1);color:#4caf87;font-size:16px;cursor:pointer;flex-shrink:0;">📤</div>`;

  if (item.type==="mood") {
    const col=moodColor(item.value), emo=moodEmoji(item.value);
    return `<div class="hist-card" data-ts="${item.ts}" data-type="mood" data-clickable="1">
      <div class="hist-card-left" style="background:${col}22;"><span style="font-size:20px;">${emo}</span></div>
      <div class="hist-card-body"><div class="hist-card-title">${t("hist_mood")}</div><div class="hist-card-sub" style="color:${col};font-size:20px;font-weight:700;">${item.value}%</div></div>
      <div style="display:flex;align-items:center;gap:8px;">${delBtn("mood")}<div class="hist-card-time">${time}</div></div></div>`;
  }
  if (item.type==="note") {
    const prev=item.text && item.text.length>60 ? item.text.slice(0,60)+"..." : (item.text || t("hist_no_text") || "Нет заметки");
    return `<div class="hist-card" data-ts="${item.ts}" data-type="note" data-clickable="1">
      <div class="hist-card-left" style="background:#5a8dee22;"><span style="font-size:20px;">📝</span></div>
      <div class="hist-card-body"><div class="hist-card-title">${t("hist_note")}</div><div class="hist-card-sub">${prev}</div></div>
      <div style="display:flex;align-items:center;gap:8px;">${delBtn("note")}<div class="hist-card-time">${time}</div></div></div>`;
  }
  if (item.type==="photo") {
    const previewSrc = item.thumbnail || item.uri || item.dataUrl || "";
    return `<div class="hist-card" data-ts="${item.ts}" data-type="photo" data-clickable="1">
      <div class="hist-card-left" style="background:#f59e0b22;overflow:hidden;border-radius:12px;">
        ${previewSrc?`<img src="${previewSrc}" style="width:44px;height:44px;object-fit:cover;border-radius:12px;">`:`<span style="font-size:20px;">📷</span>`}
      </div>
      <div class="hist-card-body"><div class="hist-card-title">${t("hist_photo")}</div><div class="hist-card-sub">${item.note||t("hist_photo_mood")}</div></div>
      <div style="display:flex;align-items:center;gap:8px;">${delBtn("photo")}<div class="hist-card-time">${time}</div></div></div>`;
  }
  if (item.type==="voice_note") {
    const hasAudio=!!item.audioUrl, ts=item.ts;
    const duration = item.audioDuration || 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationStr = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs} сек`;
    return `<div class="hist-card" style="flex-direction:column;align-items:stretch;cursor:default;" data-ts="${ts}" data-type="voice_note">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="hist-card-left" style="background:#9f7aea22;"><span style="font-size:20px;">🎙️</span></div>
        <div class="hist-card-body"><div class="hist-card-title">${t("hist_voice")}</div><div class="hist-card-sub">${t("voice_notes_duration")}</div></div>
        <div style="display:flex;align-items:center;gap:8px;">${delBtn("voice_note")}<div class="hist-card-time">${time}</div></div>
      </div>
      ${hasAudio?`
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="voice-play-btn" data-ts="${ts}" data-url="${item.audioUrl}" data-saved-dur="${item.audioDuration||0}"
            style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:#9f7aea22;box-shadow:3px 3px 6px #b8c4b4,-3px -3px 6px #ffffff;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <img src="/assets/icons/player/play.svg" style="width:14px;height:14px;" alt="Play">
          </div>
          <div style="flex:1;">
            <input type="range" class="voice-seek" data-ts="${ts}" min="0" max="100" value="0" step="0.1" style="width:100%;accent-color:#9f7aea;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#bbb;margin-top:2px;">
              <span class="voice-cur" data-ts="${ts}">0:00</span>
              <span class="voice-tot" data-ts="${ts}">${item.audioDuration?fmtSec(item.audioDuration):"0:00"}</span>
            </div>
          </div>
        </div>
      </div>`:`<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;color:#bbb;">${t("hist_voice_no_audio")}</div>`}
    </div>`;
  }
if (item.type==="session") {
    const col=moodColor(item.moodAfter);
    const normalizedType = item.sessionType?.replace(/_/g, '-').toLowerCase();
    const m=meta[normalizedType]||meta[item.sessionType]||{label:item.sessionType||"—",icon:"🛠",rc:col};
    const dur=fmtSec(item.duration);
    const rt=item.result==="positive"?"👍":item.result==="negative"?"👎":"😐";
    const extra=item.tapCount?`· ${item.tapCount} taps`:"";
    const rc = col;

    return `<div class="hist-card" data-ts="${item.ts}" data-type="session" data-clickable="1">
      <div class="hist-card-left" style="background:${col}22;"><span style="font-size:20px;">${m.icon || '🧘'}</span></div>
      <div class="hist-card-body">
        <div class="hist-card-title">${m.label || '—'}</div>
        <div class="hist-card-sub" style="color:${rc}">${rt} · ${dur}${extra}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">${delBtn("session")}<div class="hist-card-time">${time}</div></div></div>`;
  }
  if (item.type==="reflection") {
    const prev=item.text && item.text.length>60 ? item.text.slice(0,60)+"..." : (item.text || "—");
    const moodBadge = item.mood ? `<span style="font-size:14px;margin-left:8px;">😊 ${item.mood}%</span>` : "";
    return `<div class="hist-card" data-ts="${item.ts}" data-type="reflection" data-clickable="1">
      <div class="hist-card-left" style="background:#10b98122;"><span style="font-size:20px;">📝</span></div>
      <div class="hist-card-body"><div class="hist-card-title">${t("hist_reflection") || "Рефлексия"}</div><div class="hist-card-sub">${prev}${moodBadge}</div></div>
      <div style="display:flex;align-items:center;gap:8px;">${delBtn("reflection")}<div class="hist-card-time">${time}</div></div></div>`;
  }
  return "";
}

function renderDetail(item, filterDate) {
  const container=document.getElementById("history-content");
  const meta=SESSION_META();
  const time=formatTime(item.ts), date=formatDate(item.ts);
  const canShare = ["mood","note","session","photo","reflection"].includes(item.type);
  let body="";

  if (item.type==="mood") {
    const col=moodColor(item.value);
    body=`<div style="text-align:center;margin-top:40px;">
      <div style="font-size:64px;">${moodEmoji(item.value)}</div>
      <div style="font-size:48px;font-weight:700;color:${col};margin-top:12px;">${item.value}%</div>
      <div style="color:#888;margin-top:8px;">${t("hist_mood")}</div></div>`;
  }
  if (item.type==="note") {
    if (!item.text) {
      body = `<div style="margin-top:20px;text-align:center;color:#888;font-size:14px;">${t("hist_no_text") || "Нет дополнительных заметок"}</div>`;
    } else {
      body=`<div class="mo-metric" style="margin-top:20px;"><div style="font-size:16px;line-height:1.7;color:#444;">${item.text}</div></div>`;
    }
  }
  if (item.type==="photo") {
    if (item.source === 'gallery') {
      body = `<div style="text-align:center;margin-top:40px;">
        <div style="font-size:64px;">📷</div>
        <div style="margin-top:16px;color:#888;font-size:14px;">
          ${t("photo_in_gallery") || "Фото сохранено в альбоме «Neyra» в галерее"}
        </div>
        <div id="openGalleryBtn" style="margin-top:20px;padding:14px 24px;border-radius:20px;background:rgba(76,175,135,0.15);color:#4caf87;font-size:16px;cursor:pointer;display:inline-block;">
          📂 ${t("open_gallery") || "Открыть галерею"}
        </div>
        ${item.note ? `<div style="margin-top:12px;color:#666;">${item.note}</div>` : ""}
      </div>`;
    } else {
      const photoSrc = item.dataUrl || item.uri || "";
      body=`<div style="margin-top:20px;text-align:center;">
        ${photoSrc?`<img src="${photoSrc}" style="max-width:100%;border-radius:18px;box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;">`:t("hist_no_image")}
        ${item.note?`<div style="margin-top:12px;color:#666;font-size:15px;">${item.note}</div>`:""}
      </div>`;
    }
  }
  if (item.type==="session") {
    const m=meta[item.sessionType]||{icon:"🛠", label:item.sessionType || "—"};
    const rc=item.result==="positive"?"#4caf87":"#888";
    const rt=item.result==="positive"?`👍 ${t("hist_helped")}`:`👎 ${t("hist_not_helped")}`;
    const min=Math.floor((item.duration||0)/60), sec=(item.duration||0)%60;
    const dur=min>0?`${min} ${t("hist_min")} ${sec} ${t("hist_sec")}`:`${sec} ${t("hist_sec")}`;
    body=`<div style="text-align:center;margin-top:30px;">
      <div style="font-size:56px;">${m.icon || '🛠'}</div>
      <div style="font-size:22px;font-weight:600;margin-top:10px;">${m.label || '—'}</div>
    </div>
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">
      ${detRow(t("hist_result"),`<span style="color:${rc};font-weight:600;">${rt}</span>`)}
      ${detRow(t("hist_duration"), dur)}
      ${item.moodBefore!=null?detRow(t("hist_mood_before"),`<span style="color:${moodColor(item.moodBefore)}">${item.moodBefore}%</span>`):""}
      ${item.moodAfter!=null?detRow(t("hist_mood_after"),`<span style="color:${moodColor(item.moodAfter)}">${item.moodAfter}%</span>`):""}
      ${item.tapCount?detRow(t("hist_taps"), item.tapCount):""}
      ${item.text?`<div class="mo-metric" style="margin-top:4px;"><div style="font-size:11px;color:#aaa;margin-bottom:6px;">${t("hist_thoughts")}</div><div style="font-size:15px;color:#444;line-height:1.7;">${item.text}</div></div>`:""}
    </div>`;
  }
  if (item.type==="reflection") {
    if (!item.text) {
      body = `<div style="margin-top:20px;text-align:center;color:#888;font-size:14px;">${t("hist_no_text") || "Нет дополнительных заметок"}</div>`;
    } else {
      body=`<div style="margin-top:20px;">
        ${item.mood ? `<div style="text-align:center;margin-bottom:20px;"><span style="font-size:48px;">${moodEmoji(item.mood)}</span><div style="font-size:32px;font-weight:700;color:${moodColor(item.mood)};">${item.mood}%</div></div>` : ""}
        <div class="mo-metric"><div style="font-size:16px;line-height:1.7;color:#444;white-space:pre-wrap;">${item.text}</div></div>
      </div>`;
    }
  }

  container.innerHTML = `
    <div style="padding:16px 16px 120px;">
      <div style="margin-bottom:18px;">
        <div style="font-weight:600;font-size:16px;color:#3a3530;">${date}</div>
        <div style="color:#888;font-size:13px;margin-top:2px;">${time}</div>
      </div>
      ${body}
    </div>
    <div style="position:fixed;bottom:calc(160px + env(safe-area-inset-bottom));left:0;width:100%;display:flex;justify-content:center;gap:12px;z-index:50;padding:0 16px;box-sizing:border-box;">
      ${canShare ? `<div id="histShareBtn" style="padding:14px 20px;border-radius:20px;background:rgba(126,184,212,0.15);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;font-size:16px;color:#7eb8d4;cursor:pointer;white-space:nowrap;">↗ ${t('hist_share_btn')}</div>` : ""}
      <div id="histBackBtn" style="flex:1;padding:14px;border-radius:20px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 12px #b8c4b4,-6px -6px 12px #ffffff;font-size:16px;color:#555;cursor:pointer;text-align:center;">${t("hist_back")}</div>
    </div>`;

  document.getElementById("histBackBtn").onclick = () => renderHistory(filterDate);

  if (canShare) {
    document.getElementById("histShareBtn").addEventListener("click", () => shareItem(item));
  }

  if (item.type === 'photo' && item.source === 'gallery') {
    document.getElementById('openGalleryBtn')?.addEventListener('click', () => {
      const Media = window.Capacitor?.Plugins?.Media;
      if (Media?.openAlbum) {
        Media.openAlbum({ name: 'Neyra' }).catch(() => {});
      }
    });
  }
}

function detRow(label, valHTML) {
  return `<div class="mo-metric" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;">
    <span style="color:#888;">${label}</span>${valHTML}</div>`;
}

export function onExit() {
  document.getElementById("photoMenuOverlay")?.remove();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}
