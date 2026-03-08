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
function fmtSec(s) { if(!s) return "0:00"; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; }

let currentAudio = null;
let allItemsCache = [];

function buildTimeline() {
  const items = [];
  getMoodHistory().forEach(e => items.push({ type:"mood", ts:new Date(e.time).getTime(), value:e.value }));
  getNotesHistory().forEach(e => items.push({ type:"note", ts:e.timestamp||new Date(e.time).getTime(), text:e.text||e.note||"" }));
  getVoiceHistory().forEach(e => items.push({ type:"voice", ts:e.timestamp||new Date(e.time).getTime(), text:e.text||e.transcript||"", audioUrl:e.audioUrl||e.url||null, audioDuration:e.duration||0 }));
  getSessionHistory().forEach(e => items.push({ type:"session", ts:e.timestamp, sessionType:e.type, moodBefore:e.moodBefore, moodAfter:e.moodAfter, result:e.result, duration:e.duration }));
  items.sort((a,b)=>b.ts-a.ts);
  return items;
}

function groupByDay(items) {
  const g={};
  items.forEach(i=>{ const d=formatDate(i.ts); if(!g[d]) g[d]=[]; g[d].push(i); });
  return g;
}

function renderHistory(filterDate=null) {
  const container = document.getElementById("history-content");
  if (!container) return;

  allItemsCache = buildTimeline();
  let items = filterDate ? allItemsCache.filter(i=>toISODate(i.ts)===filterDate) : allItemsCache;
  const groups = groupByDay(items);
  const days   = Object.keys(groups);

  let cardsHTML = "";
  days.forEach(day => {
    cardsHTML += `<div class="hist-day-label">📅 ${day}</div>`;
    groups[day].forEach(item => { cardsHTML += renderCard(item); });
  });

  if (days.length===0) {
    cardsHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">📭</div><div style="margin-top:12px;">${filterDate?"Записей за этот день нет":"История пуста"}</div></div>`;
  }

  container.innerHTML = `
    <div style="padding:4px 0 100px;">
      <h2 style="margin-bottom:16px;">История</h2>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;">
        <input type="date" id="histDateFilter" class="hist-date-input" value="${filterDate||''}">
        <div id="histClearDate" style="display:${filterDate?'flex':'none'};padding:12px 14px;border-radius:14px;cursor:pointer;background:rgba(232,237,230,0.9);color:#888;font-size:16px;box-shadow:4px 4px 8px #b8c4b4,-4px -4px 8px #ffffff;align-items:center;justify-content:center;">✕</div>
      </div>
      ${cardsHTML}
    </div>`;

  document.getElementById("histDateFilter").onchange = e => renderHistory(e.target.value||null);
  document.getElementById("histClearDate").onclick = () => renderHistory(null);

  // Клики по карточкам (не голосовые)
  container.querySelectorAll(".hist-card[data-clickable='1']").forEach(card => {
    card.onclick = () => {
      const ts   = parseInt(card.dataset.ts);
      const type = card.dataset.type;
      const item = allItemsCache.find(i=>i.ts===ts&&i.type===type);
      if (item) renderDetail(item);
    };
  });

  // Плееры голосовых
  container.querySelectorAll(".voice-play-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const ts  = btn.dataset.ts;
      const url = btn.dataset.url;
      if (!url) return;

      const seekEl    = container.querySelector(`.voice-seek[data-ts="${ts}"]`);
      const curEl     = container.querySelector(`.voice-cur[data-ts="${ts}"]`);
      const totEl     = container.querySelector(`.voice-tot[data-ts="${ts}"]`);

      if (btn._audio && !btn._audio.paused) {
        btn._audio.pause(); btn.textContent="▶"; return;
      }
      if (currentAudio && currentAudio!==btn._audio) {
        currentAudio.pause(); currentAudio.currentTime=0;
        container.querySelectorAll(".voice-play-btn").forEach(b=>{ if(b._audio===currentAudio) b.textContent="▶"; });
      }
      if (!btn._audio) {
        btn._audio = new Audio(url);
        btn._audio.addEventListener("timeupdate",()=>{
          const dur=btn._audio.duration||0, cur=btn._audio.currentTime;
          if(seekEl) seekEl.value=dur?(cur/dur*100):0;
          if(curEl) curEl.textContent=fmtSec(cur);
          if(totEl&&dur) totEl.textContent=fmtSec(dur);
        });
        btn._audio.addEventListener("ended",()=>{ btn.textContent="▶"; if(seekEl) seekEl.value=0; if(curEl) curEl.textContent="0:00"; });
      }
      btn._audio.play();
      currentAudio=btn._audio;
      btn.textContent="⏸";
    });
  });

  container.querySelectorAll(".voice-seek").forEach(seek => {
    seek.addEventListener("input", e => {
      e.stopPropagation();
      const ts = seek.dataset.ts;
      const pb = container.querySelector(`.voice-play-btn[data-ts="${ts}"]`);
      if (pb&&pb._audio) { const d=pb._audio.duration; if(d) pb._audio.currentTime=(seek.value/100)*d; }
    });
  });
}

function renderCard(item) {
  const time = formatTime(item.ts);

  if (item.type==="mood") {
    const col=moodColor(item.value), emo=moodEmoji(item.value);
    return `<div class="hist-card" data-ts="${item.ts}" data-type="mood" data-clickable="1">
      <div class="hist-card-left" style="background:${col}22;"><span style="font-size:20px;">${emo}</span></div>
      <div class="hist-card-body"><div class="hist-card-title">Настроение</div><div class="hist-card-sub" style="color:${col};font-size:22px;font-weight:700;">${item.value}%</div></div>
      <div class="hist-card-time">${time}</div>
    </div>`;
  }

  if (item.type==="note") {
    const prev=item.text.length>60?item.text.slice(0,60)+"...":item.text;
    return `<div class="hist-card" data-ts="${item.ts}" data-type="note" data-clickable="1">
      <div class="hist-card-left" style="background:#5a8dee22;"><span style="font-size:20px;">📝</span></div>
      <div class="hist-card-body"><div class="hist-card-title">Заметка</div><div class="hist-card-sub">${prev||"—"}</div></div>
      <div class="hist-card-time">${time}</div>
    </div>`;
  }

  if (item.type==="voice") {
    const prev=item.text&&item.text.length>50?item.text.slice(0,50)+"...":item.text||"";
    const hasAudio=!!item.audioUrl;
    const ts=item.ts;
    return `<div class="hist-card" style="flex-direction:column;align-items:stretch;cursor:default;" data-ts="${ts}" data-type="voice">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="hist-card-left" style="background:#9f7aea22;"><span style="font-size:20px;">🎙️</span></div>
        <div class="hist-card-body"><div class="hist-card-title">Голосовая запись</div><div class="hist-card-sub">${prev||"Нет транскрипции"}</div></div>
        <div class="hist-card-time">${time}</div>
      </div>
      ${hasAudio?`
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="voice-play-btn" data-ts="${ts}" data-url="${item.audioUrl}" style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:#9f7aea22;box-shadow:3px 3px 6px #b8c4b4,-3px -3px 6px #ffffff;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;">▶</div>
          <div style="flex:1;">
            <input type="range" class="voice-seek" data-ts="${ts}" min="0" max="100" value="0" step="0.1" style="width:100%;accent-color:#9f7aea;height:4px;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#bbb;margin-top:2px;">
              <span class="voice-cur" data-ts="${ts}">0:00</span>
              <span class="voice-tot" data-ts="${ts}">${fmtSec(item.audioDuration)}</span>
            </div>
          </div>
        </div>
      </div>`:`<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;color:#bbb;">🔇 Аудио не сохранено</div>`}
    </div>`;
  }

  if (item.type==="session") {
    const icon=item.sessionType==="breathing"?"🫁":"🧘";
    const lbl=item.sessionType==="breathing"?"Дыхание":"Медитация";
    const rc=item.result==="positive"?"#4caf87":"#888";
    const rt=item.result==="positive"?"Помогло":"Не помогло";
    const min=Math.floor((item.duration||0)/60), sec=(item.duration||0)%60;
    const dur=min>0?`${min} мин ${sec} сек`:`${sec} сек`;
    return `<div class="hist-card" data-ts="${item.ts}" data-type="session" data-clickable="1">
      <div class="hist-card-left" style="background:#2d9cdb22;"><span style="font-size:20px;">${icon}</span></div>
      <div class="hist-card-body"><div class="hist-card-title">${lbl}</div><div class="hist-card-sub" style="color:${rc}">${rt} · ${dur}</div></div>
      <div class="hist-card-time">${time}</div>
    </div>`;
  }
  return "";
}

function renderDetail(item) {
  const container = document.getElementById("history-content");
  const time=formatTime(item.ts), date=formatDate(item.ts);
  let body="";

  if (item.type==="mood") {
    const col=moodColor(item.value);
    body=`<div style="text-align:center;margin-top:40px;">
      <div style="font-size:64px;">${moodEmoji(item.value)}</div>
      <div style="font-size:48px;font-weight:700;color:${col};margin-top:12px;">${item.value}%</div>
      <div style="color:#888;margin-top:8px;">Настроение</div></div>`;
  }
  if (item.type==="note") {
    body=`<div class="mo-metric" style="margin-top:20px;"><div style="font-size:16px;line-height:1.7;color:#444;">${item.text||"Нет текста"}</div></div>`;
  }
  if (item.type==="session") {
    const icon=item.sessionType==="breathing"?"🫁":"🧘";
    const lbl=item.sessionType==="breathing"?"Дыхание":"Медитация";
    const rc=item.result==="positive"?"#4caf87":"#888";
    const rt=item.result==="positive"?"👍 Помогло":"👎 Не помогло";
    const min=Math.floor((item.duration||0)/60), sec=(item.duration||0)%60;
    const dur=min>0?`${min} мин ${sec} сек`:`${sec} сек`;
    body=`<div style="text-align:center;margin-top:30px;"><div style="font-size:56px;">${icon}</div><div style="font-size:22px;font-weight:600;margin-top:10px;">${lbl}</div></div>
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">
      ${detRow("Результат",`<span style="color:${rc};font-weight:600;">${rt}</span>`)}
      ${detRow("Длительность",dur)}
      ${detRow("Настроение до",`<span style="color:${moodColor(item.moodBefore)}">${item.moodBefore}%</span>`)}
      ${detRow("Настроение после",`<span style="color:${moodColor(item.moodAfter)}">${item.moodAfter}%</span>`)}
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

  document.getElementById("histBackBtn").onclick = () => renderHistory();
}

function detRow(label, valHTML) {
  return `<div class="mo-metric" style="display:flex;justify-content:space-between;padding:12px 16px;">
    <span style="color:#888;">${label}</span>${valHTML}</div>`;
}