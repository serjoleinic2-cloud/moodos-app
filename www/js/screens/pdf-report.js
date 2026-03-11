// =====================================
// MoodOS PDF Report — Share API + Push
// =====================================
import { getMoodHistory } from "../services/memory.js";
import { getSessionHistory } from "../services/memory.js";
import { getProfile } from "../services/user-profile.js";
import { t, getLang } from "../i18n.js";

async function requestNotificationPermission() {
  try {
    const { LocalNotifications } = Capacitor.Plugins;
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== "granted") await LocalNotifications.requestPermissions();
  } catch(e) { console.warn("Notifications not available", e); }
}

async function scheduleNotifications(days, time, period) {
  try {
    const { LocalNotifications } = Capacitor.Plugins;
    const pending = await LocalNotifications.getPending();
    const moodosIds = pending.notifications
      .filter(n => n.id >= 9000 && n.id <= 9007)
      .map(n => ({ id: n.id }));
    if (moodosIds.length) await LocalNotifications.cancel({ notifications: moodosIds });
    if (!days.length || !time) return;
    const [hh, mm] = time.split(":").map(Number);
    const notifications = [];
    days.forEach(dow => {
      const jsDow = dow === 7 ? 0 : dow;
      const now = new Date();
      const target = new Date();
      target.setHours(hh, mm, 0, 0);
      const currentDow = now.getDay();
      let daysUntil = (jsDow - currentDow + 7) % 7;
      if (daysUntil === 0 && target <= now) daysUntil = 7;
      target.setDate(target.getDate() + daysUntil);
      notifications.push({
        id: 9000 + dow,
        title: "MoodOS 📄",
        body: `${t("pdf_share_text")} (${period} ${t("pdf_sessions")})`,
        schedule: { at: target, repeats: true, every: "week" },
        actionTypeId: "OPEN_REPORT",
        extra: { action: "openReport" }
      });
    });
    await LocalNotifications.schedule({ notifications });
    return true;
  } catch(e) { console.warn("Schedule error", e); return false; }
}

const STORE_KEY = "pdf_report_settings";
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e) { return {}; }
}
function saveSettings(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

function fmtDateNum(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const yyyy = dt.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function fmtDTNum(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const hh = String(dt.getHours()).padStart(2,"0");
  const mi = String(dt.getMinutes()).padStart(2,"0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

export function closeAllOverlays() {
  document.getElementById("pdfReportScreen")?.remove();
  document.querySelectorAll(".health-modal-overlay").forEach(m => m.remove());
}

export async function checkAutoReminder() {
  try {
    const { LocalNotifications } = Capacitor.Plugins;
    await requestNotificationPermission();
    LocalNotifications.addListener("localNotificationActionPerformed", () => {
      showPdfReportModal();
    });
  } catch(e) { console.warn("Push init error", e); }
}

export function showPdfReportModal() {
  const existing = document.getElementById("pdfReportScreen");
  if (existing) existing.remove();

  const s = loadSettings();
  const now  = new Date();
  const from = new Date(now); from.setDate(from.getDate() - 30);
  const toStr   = now.toISOString().slice(0,10);
  const fromStr = from.toISOString().slice(0,10);

  const autoDays   = s.autoDays   || [];
  const autoPeriod = s.autoPeriod || "30";
  const autoTime   = s.autoTime   || "09:00";
  const lang = typeof getLang === "function" ? getLang() : "ru";
const DAYS_MAP = {
  ru: ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"],
  en: ["Mo","Tu","We","Th","Fr","Sa","Su"],
  es: ["Lu","Ma","Mi","Ju","Vi","Sa","Do"],
  uk: ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"],
};
const PERIODS_MAP = {
  ru: [["7","7 дней"],["14","14 дней"],["30","30 дней"],["90","3 месяца"]],
  en: [["7","7 days"],["14","14 days"],["30","30 days"],["90","3 months"]],
  es: [["7","7 días"],["14","14 días"],["30","30 días"],["90","3 meses"]],
  uk: [["7","7 днів"],["14","14 днів"],["30","30 днів"],["90","3 місяці"]],
};
const DAYS    = DAYS_MAP[lang]    || DAYS_MAP.ru;
const PERIODS = PERIODS_MAP[lang] || PERIODS_MAP.ru;

  const screen = document.createElement("div");
  screen.id = "pdfReportScreen";
  screen.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:65px;z-index:50;
    background:linear-gradient(160deg,#d4ede8 0%,#e8e0d5 100%);
    overflow-y:auto;-webkit-overflow-scrolling:touch;`;

  screen.innerHTML = `
    <style>
      .pr-wrap{padding:20px 16px 120px;}
      .pr-back{display:flex;align-items:center;gap:8px;margin-bottom:20px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
      .pr-back-icon{font-size:22px;color:#888;}
      .pr-back-label{font-size:16px;color:#888;}
      .pr-title{font-size:22px;font-weight:700;color:#3a3530;margin-bottom:6px;}
      .pr-subtitle{font-size:13px;color:#aaa;margin-bottom:24px;}
      .pr-card{background:rgba(232,237,230,0.9);border-radius:18px;box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;padding:18px;margin-bottom:16px;}
      .pr-card-title{font-size:13px;font-weight:700;color:#888;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:14px;}
      .pr-date-row{display:flex;gap:12px;}
      .pr-date-col{flex:1;}
      .pr-date-label{font-size:11px;color:#aaa;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;}
      .pr-input{width:100%;padding:12px 14px;border:none;border-radius:14px;background:rgba(220,228,218,0.8);box-shadow:inset 3px 3px 6px #c4c9c2,inset -3px -3px 6px #ffffff;font-size:15px;color:#555;outline:none;box-sizing:border-box;}
      .pr-status{font-size:13px;color:#888;margin:10px 0 0;min-height:18px;text-align:center;}
      .pr-btn{width:100%;padding:15px;border:none;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;font-size:16px;font-weight:700;color:#4caf87;cursor:pointer;margin-top:16px;-webkit-tap-highlight-color:transparent;}
      .pr-btn:active{box-shadow:inset 4px 4px 8px #b8c4b4,inset -4px -4px 8px #ffffff;}
      .pr-btn:disabled{opacity:0.5;}
      .pr-hint{font-size:12px;color:#aaa;text-align:center;margin-top:10px;line-height:1.5;}
      .pr-auto-card{background:#6667AB;border-radius:18px;box-shadow:4px 4px 12px rgba(102,103,171,0.4),-4px -4px 12px rgba(255,255,255,0.15);padding:18px;margin-bottom:16px;}
      .pr-auto-title{font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:14px;}
      .pr-auto-label{font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;}
      .pr-days-row{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;}
      .pr-day{padding:7px 11px;border-radius:10px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all 0.15s;}
      .pr-day.active{background:rgba(255,255,255,0.9);color:#6667AB;}
      .pr-period-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
      .pr-period{padding:8px 14px;border-radius:12px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);cursor:pointer;-webkit-tap-highlight-color:transparent;}
      .pr-period.active{background:rgba(255,255,255,0.9);color:#6667AB;}
      .pr-time-input{width:100%;padding:11px 14px;border:none;border-radius:14px;background:rgba(255,255,255,0.15);color:#fff;font-size:18px;font-weight:600;outline:none;box-sizing:border-box;}
      .pr-auto-save{width:100%;padding:13px;border:none;border-radius:14px;background:rgba(255,255,255,0.2);color:#fff;font-size:15px;font-weight:700;cursor:pointer;margin-top:14px;-webkit-tap-highlight-color:transparent;}
      .pr-auto-save:active{background:rgba(255,255,255,0.3);}
      .pr-auto-status{font-size:12px;color:rgba(255,255,255,0.6);text-align:center;margin-top:8px;min-height:16px;line-height:1.5;}
    </style>
    <div class="pr-wrap">
      <div class="pr-back" id="prBack">
        <span class="pr-back-icon">‹</span>
        <span class="pr-back-label">${t("pdf_back")}</span>
      </div>
      <div class="pr-title">${t("pdf_title")}</div>
      <div class="pr-subtitle">${t("pdf_subtitle")}</div>
      <div class="pr-card">
        <div class="pr-card-title">${t("pdf_period")}</div>
        <div class="pr-date-row">
          <div class="pr-date-col">
            <div class="pr-date-label">${t("pdf_from")}</div>
            <input type="date" id="prFrom" class="pr-input" value="${s.lastFrom||fromStr}">
          </div>
          <div class="pr-date-col">
            <div class="pr-date-label">${t("pdf_to")}</div>
            <input type="date" id="prTo" class="pr-input" value="${s.lastTo||toStr}">
          </div>
        </div>
        <div class="pr-status" id="prStatus"></div>
        <button class="pr-btn" id="prGenBtn">${t("pdf_gen_btn")}</button>
        <div class="pr-hint">${t("pdf_hint")}</div>
      </div>
      <div class="pr-auto-card">
        <div class="pr-auto-title">${t("pdf_reminder_title")}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px;">${t("pdf_reminder_sub")}</div>
        <div class="pr-auto-label">${t("pdf_days_label")}</div>
        <div class="pr-days-row" id="prDaysRow">
          ${DAYS.map((d,i) => `
            <div class="pr-day ${autoDays.includes(i+1)?'active':''}" data-day="${i+1}">${d}</div>
          `).join('')}
        </div>
        <div class="pr-auto-label">${t("pdf_time_label")}</div>
        <input type="time" id="prAutoTime" class="pr-time-input" value="${autoTime}" style="margin-bottom:16px;">
        <div class="pr-auto-label">${t("pdf_period_label")}</div>
        <div class="pr-period-row" id="prPeriodRow">
          ${PERIODS.map(([v,l]) =>
            `<div class="pr-period ${autoPeriod===v?'active':''}" data-period="${v}">${l}</div>`
          ).join('')}
        </div>
        <button class="pr-auto-save" id="prAutoSave">${t("pdf_save_schedule")}</button>
        <div class="pr-auto-status" id="prAutoStatus">
          ${autoDays.length
            ? `🔔 ${autoDays.map(d=>DAYS[d-1]).join(', ')} ${autoTime} · ${PERIODS.find(([v])=>v===autoPeriod)?.[1]||autoPeriod}`
            : t("pdf_no_reminder")}
        </div>
      </div>
    </div>`;

  document.body.appendChild(screen);
  screen.querySelector("#prBack").addEventListener("click", () => screen.remove());

  let selectedDays = [...autoDays];
  screen.querySelectorAll(".pr-day").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = parseInt(btn.dataset.day);
      if (selectedDays.includes(d)) { selectedDays = selectedDays.filter(x=>x!==d); btn.classList.remove("active"); }
      else { selectedDays.push(d); btn.classList.add("active"); }
    });
  });

  let selectedPeriod = autoPeriod;
  screen.querySelectorAll(".pr-period").forEach(btn => {
    btn.addEventListener("click", () => {
      screen.querySelectorAll(".pr-period").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      selectedPeriod = btn.dataset.period;
    });
  });

  screen.querySelector("#prAutoSave").addEventListener("click", async () => {
    const timeVal = screen.querySelector("#prAutoTime").value || "09:00";
    const st = loadSettings();
    st.autoDays = selectedDays; st.autoPeriod = selectedPeriod; st.autoTime = timeVal;
    saveSettings(st);
    const statusEl = screen.querySelector("#prAutoStatus");
    statusEl.textContent = t("pdf_planning");
    const ok = await scheduleNotifications(selectedDays, timeVal, selectedPeriod);
    statusEl.textContent = selectedDays.length
      ? (ok
          ? `✅ ${selectedDays.map(d=>DAYS[d-1]).join(', ')} ${timeVal}`
          : `🔔 ${selectedDays.map(d=>DAYS[d-1]).join(', ')} (${t("pdf_check_perms")})`)
      : t("pdf_reminder_off");
  });

  // Кнопка генерации — НЕ async чтобы не потерять user gesture для Share
  screen.querySelector("#prGenBtn").addEventListener("click", () => {
    const fromVal  = screen.querySelector("#prFrom").value;
    const toVal    = screen.querySelector("#prTo").value;
    const statusEl = screen.querySelector("#prStatus");
    const genBtn   = screen.querySelector("#prGenBtn");

    if (!fromVal || !toVal) { statusEl.textContent = t("pdf_select_period"); return; }
    if (new Date(fromVal) > new Date(toVal)) { statusEl.textContent = t("pdf_date_error"); return; }

    const st = loadSettings();
    st.lastFrom = fromVal; st.lastTo = toVal;
    saveSettings(st);

    statusEl.textContent = t("pdf_generating");
    genBtn.disabled = true;

    generatePdf(fromVal, toVal).then(pdfBlob => {
      const fileName = `MoodOS_${fromVal}_${toVal}.pdf`;

      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          statusEl.textContent = t("pdf_opening");
          navigator.share({
            title: `${t("pdf_share_title")} ${fromVal} — ${toVal}`,
            text: t("pdf_share_text"),
            files: [file]
          }).then(() => {
            statusEl.textContent = t("pdf_done");
          }).catch(e => {
            if (e.name !== "AbortError") statusEl.textContent = t("pdf_error") + e.message;
            else statusEl.textContent = "";
          }).finally(() => { genBtn.disabled = false; });
          return;
        }
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      statusEl.textContent = t("pdf_saved");
      genBtn.disabled = false;

    }).catch(e => {
      statusEl.textContent = t("pdf_error") + e.message;
      genBtn.disabled = false;
    });
  });
}

async function generatePdf(fromStr, toStr) {
  if (!window.jspdf) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });

  const fromDate = new Date(fromStr + "T00:00:00");
  const toDate   = new Date(toStr   + "T23:59:59");

  const moodHistory = getMoodHistory().filter(e => {
    const d = new Date(e.time); return d >= fromDate && d <= toDate;
  });
  const sessions = getSessionHistory().filter(e => {
    const d = new Date(e.timestamp||0); return d >= fromDate && d <= toDate;
  });
  const profile = getProfile();

  const MED_LABELS = {
    "нет": t("pdf_med_no"), "антидепрессанты": t("pdf_med_anti"),
    "седативные": t("pdf_med_sed"), "другое": t("pdf_med_other"), "не_скажу": t("pdf_med_not_said")
  };
  const EFFECT_LABELS = {
    "лучше": t("pdf_eff_better"), "примерно_так_же": t("pdf_eff_same"),
    "приглушённость": t("pdf_eff_numb"), "побочки": t("pdf_eff_side"), "адаптация": t("pdf_eff_adapt")
  };
  const STATE_LABELS = {
    "HIGH": t("pdf_state_high"), "GOOD": t("pdf_state_good"),
    "NEUTRAL": t("pdf_state_neutral"), "STRESSED": t("pdf_state_stressed"), "LOW": t("pdf_state_low")
  };
  const SESSION_LABELS = {
    "breathing": t("pdf_sess_breathing"), "meditation": t("pdf_sess_meditation"),
    "visual-focus": t("pdf_sess_visual"), "mind-dump": t("pdf_sess_mind"), "tap-calm": t("pdf_sess_tap")
  };

  const PAGE_W=210, MARGIN=18, CONTENT_W=PAGE_W-MARGIN*2;
  let y = MARGIN;

  const C_DARK=[45,45,45], C_GRAY=[120,120,120], C_LIGHT=[180,180,180];
  const C_GREEN=[76,175,135], C_ORANGE=[240,165,0], C_RED=[224,85,85];
  const C_LINE=[210,215,208];

  function sf(size,style="normal",color=C_DARK){
    doc.setFontSize(size);doc.setFont("helvetica",style);doc.setTextColor(...color);
  }
  function ln(yp){doc.setDrawColor(...C_LINE);doc.setLineWidth(0.3);doc.line(MARGIN,yp,PAGE_W-MARGIN,yp);}
  function chk(n=10){if(y+n>280){doc.addPage();y=MARGIN;}}
  function mc(v){return v>=70?C_GREEN:v>=40?C_ORANGE:C_RED;}

  // Шапка
  doc.setFillColor(232,237,230);
  doc.roundedRect(MARGIN-4,y-4,CONTENT_W+8,28,4,4,"F");
  sf(18,"bold",C_GREEN); doc.text("MoodOS",MARGIN,y+8);
  sf(10,"normal",C_GRAY); doc.text(t("pdf_doc_subtitle"),MARGIN,y+15);
  sf(9,"normal",C_LIGHT);
  doc.text(`${t("pdf_period_label2")} ${fmtDateNum(fromDate)} — ${fmtDateNum(toDate)}`,MARGIN,y+21);
  doc.text(`${t("pdf_generated")} ${fmtDateNum(new Date())}`,PAGE_W-MARGIN,y+21,{align:"right"});
  y+=34;

  // Профиль
  if(profile){
    chk(30);
    sf(11,"bold",C_DARK); doc.text(t("pdf_patient"),MARGIN,y); y+=7;
    ln(y); y+=5;
    sf(9,"normal",C_GRAY); doc.text(t("pdf_meds"),MARGIN,y);
    sf(9,"bold",C_DARK); doc.text(MED_LABELS[profile.takesMeds]||t("pdf_med_not_said"),MARGIN+42,y); y+=6;
    if(profile.takesMeds&&profile.takesMeds!=="нет"&&profile.takesMeds!=="не_скажу"){
      sf(9,"normal",C_GRAY); doc.text(t("pdf_effect"),MARGIN,y);
      sf(9,"bold",C_DARK); doc.text(EFFECT_LABELS[profile.medEffect]||"—",MARGIN+42,y); y+=6;
    }
    sf(9,"normal",C_GRAY); doc.text(t("pdf_baseline"),MARGIN,y);
    sf(9,"bold",C_DARK); doc.text((profile.moodBaseline??50)+"%",MARGIN+42,y); y+=10;
  }

  // Статистика
  chk(40);
  sf(11,"bold",C_DARK); doc.text(t("pdf_stats"),MARGIN,y); y+=7;
  ln(y); y+=6;

  if(moodHistory.length===0){
    sf(9,"normal",C_GRAY); doc.text(t("pdf_no_data"),MARGIN,y); y+=10;
  } else {
    const vals=moodHistory.map(e=>e.value);
    const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
    const minV=Math.min(...vals), maxV=Math.max(...vals);
    let stab=100;
    if(vals.length>1){
      const diffs=vals.slice(1).map((v,i)=>Math.abs(v-vals[i]));
      stab=Math.max(0,Math.round(100-diffs.reduce((a,b)=>a+b,0)/diffs.length*2));
    }
    const BW=(CONTENT_W-6)/2, BH=18;
    [{label:t("pdf_avg"),value:avg+"%",color:mc(avg)},
     {label:t("pdf_stab"),value:stab+"%",color:mc(stab)},
     {label:t("pdf_min"),value:minV+"%",color:mc(minV)},
     {label:t("pdf_max"),value:maxV+"%",color:mc(maxV)}
    ].forEach((box,i)=>{
      const bx=MARGIN+(i%2)*(BW+6), by=y+Math.floor(i/2)*(BH+4);
      doc.setFillColor(240,244,238); doc.roundedRect(bx,by,BW,BH,3,3,"F");
      sf(8,"normal",C_GRAY); doc.text(box.label,bx+4,by+6);
      sf(13,"bold",box.color); doc.text(box.value,bx+4,by+14);
    });
    y+=BH*2+12;
    sf(9,"normal",C_GRAY); doc.text(`${t("pdf_total")} ${moodHistory.length}`,MARGIN,y); y+=10;

    chk(50);
    sf(11,"bold",C_DARK); doc.text(t("pdf_chart"),MARGIN,y); y+=7;
    ln(y); y+=4;
    const CH=35, cx=MARGIN, cy=y;
    doc.setFillColor(240,244,238); doc.roundedRect(cx,cy,CONTENT_W,CH,3,3,"F");
    doc.setDrawColor(...C_LINE); doc.setLineWidth(0.2);
    [0,25,50,75,100].forEach(pct=>{
      const gy=cy+CH-(pct/100*CH);
      doc.line(cx,gy,cx+CONTENT_W,gy);
      sf(6,"normal",C_LIGHT); doc.text(pct+"%",cx-1,gy+1,{align:"right"});
    });
    const sorted=moodHistory.slice().sort((a,b)=>new Date(a.time)-new Date(b.time));
    if(sorted.length>1){
      const pts=sorted.map((e,i)=>({
        x:cx+(i/(sorted.length-1))*CONTENT_W,
        y:cy+CH-(e.value/100*CH)
      }));
      doc.setDrawColor(...C_GREEN); doc.setLineWidth(0.8);
      for(let i=1;i<pts.length;i++) doc.line(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y);
      doc.setFillColor(...C_GREEN);
      pts.forEach(p=>doc.circle(p.x,p.y,0.8,"F"));
    }
    y+=CH+10;
  }

  // Практики
  if(sessions.length>0){
    chk(20);
    sf(11,"bold",C_DARK); doc.text(t("pdf_practices"),MARGIN,y); y+=7;
    ln(y); y+=5;
    const bt={};
    sessions.forEach(s=>{
      const tp=s.type||"other";
      if(!bt[tp]) bt[tp]={count:0,positive:0,lift:0};
      bt[tp].count++;
      if(s.result==="positive") bt[tp].positive++;
      if(s.moodBefore!=null&&s.moodAfter!=null) bt[tp].lift+=(s.moodAfter-s.moodBefore);
    });
    Object.entries(bt).forEach(([type,data])=>{
      chk(10);
      const pct=Math.round(data.positive/data.count*100);
      const lift=Math.round(data.lift/data.count);
      sf(9,"bold",C_DARK); doc.text(SESSION_LABELS[type]||type,MARGIN,y);
      sf(9,"normal",C_GRAY);
      doc.text(`${data.count} ${t("pdf_sessions")} · ${pct}% ${t("pdf_efficiency")} · ${t("pdf_lift")} ${lift>0?"+":""}${lift}%`,MARGIN+38,y);
      y+=7;
    });
    y+=4;
  }

  // Журнал
  chk(20);
  sf(1