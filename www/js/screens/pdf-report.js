// =====================================
// MoodOS PDF Report — Share API + Push
// =====================================
import { getMoodHistory } from "../services/memory.js";
import { getSessionHistory } from "../services/memory.js";
import { getProfile } from "../services/user-profile.js";
import { t } from "../i18n.js";

async function requestNotificationPermission() {
  try {
    const { LocalNotifications } = Capacitor.Plugins;
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== "granted") {
      await LocalNotifications.requestPermissions();
    }
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
        body: t("pr_notif_body").replace("{period}", period),
        schedule: { at: target, repeats: true, every: "week" },
        actionTypeId: "OPEN_REPORT",
        extra: { action: "openReport" }
      });
    });

    await LocalNotifications.schedule({ notifications });
    return true;
  } catch(e) {
    console.warn("Schedule error", e);
    return false;
  }
}

// PDF-контент всегда на русском — это медицинский документ
const MED_LABELS = {
  "нет":"Не принимает","антидепрессанты":"Антидепрессанты",
  "седативные":"Седативные / успокоительные","другое":"Другое","не_скажу":"Не указано"
};
const EFFECT_LABELS = {
  "лучше":"Стало лучше","примерно_так_же":"Примерно так же",
  "приглушённость":"Чувствует приглушённость","побочки":"Есть побочные эффекты","адаптация":"Подбор дозировки"
};
const STATE_LABELS = {
  "HIGH":"Отличное","GOOD":"Хорошее","NEUTRAL":"Нейтральное","STRESSED":"Напряжение","LOW":"Сниженное"
};
const SESSION_LABELS = {
  "breathing":"Дыхание","meditation":"Медитация",
  "visual-focus":"Зрительный якорь","mind-dump":"Выгрузка мыслей","tap-calm":"Тактильная разрядка"
};

const STORE_KEY = "pdf_report_settings";

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e) { return {}; }
}
function saveSettings(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

export function checkAutoReminder() {
  setTimeout(() => {
    try {
      if (!window.Capacitor || !window.Capacitor.Plugins) return;
      const { LocalNotifications } = window.Capacitor.Plugins;
      if (!LocalNotifications) return;
      LocalNotifications.addListener("localNotificationActionPerformed", () => {
        showPdfReportModal();
      });
    } catch(e) { console.warn("Push init error:", e); }
  }, 0);
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

  // Дни недели через переводы
  const DAYS = [
    t("dow_mon"), t("dow_tue"), t("dow_wed"), t("dow_thu"),
    t("dow_fri"), t("dow_sat"), t("dow_sun")
  ];

  // Периоды через переводы
  const PERIODS = [
    ["7",  t("pr_period_7")],
    ["14", t("pr_period_14")],
    ["30", t("pr_period_30")],
    ["90", t("pr_period_90")],
  ];

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
        <span class="pr-back-label">${t("settings")}</span>
      </div>

      <div class="pr-title">📄 ${t("pr_title")}</div>
      <div class="pr-subtitle">${t("pr_subtitle")}</div>

      <div class="pr-card">
        <div class="pr-card-title">${t("pr_period_title")}</div>
        <div class="pr-date-row">
          <div class="pr-date-col">
            <div class="pr-date-label">${t("pr_from")}</div>
            <input type="date" id="prFrom" class="pr-input" value="${s.lastFrom||fromStr}">
          </div>
          <div class="pr-date-col">
            <div class="pr-date-label">${t("pr_to")}</div>
            <input type="date" id="prTo" class="pr-input" value="${s.lastTo||toStr}">
          </div>
        </div>
        <div class="pr-status" id="prStatus"></div>
        <button class="pr-btn" id="prGenBtn">📤 ${t("pr_generate_btn")}</button>
        <div class="pr-hint">${t("pr_hint")}</div>
      </div>

      <div class="pr-auto-card">
        <div class="pr-auto-title">⚡ ${t("pr_reminder_title")}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px;">
          ${t("pr_reminder_sub")}
        </div>

        <div class="pr-auto-label">${t("pr_reminder_days")}</div>
        <div class="pr-days-row" id="prDaysRow">
          ${DAYS.map((d,i) => `
            <div class="pr-day ${autoDays.includes(i+1)?'active':''}" data-day="${i+1}">${d}</div>
          `).join('')}
        </div>

        <div class="pr-auto-label">${t("pr_reminder_time")}</div>
        <input type="time" id="prAutoTime" class="pr-time-input" value="${autoTime}" style="margin-bottom:16px;">

        <div class="pr-auto-label">${t("pr_reminder_period")}</div>
        <div class="pr-period-row" id="prPeriodRow">
          ${PERIODS.map(([v,l]) =>
            `<div class="pr-period ${autoPeriod===v?'active':''}" data-period="${v}">${l}</div>`
          ).join('')}
        </div>

        <button class="pr-auto-save" id="prAutoSave">${t("pr_save_schedule")}</button>
        <div class="pr-auto-status" id="prAutoStatus">
          ${autoDays.length
            ? `🔔 ${autoDays.map((_,i) => DAYS[i]).filter((_,i) => autoDays.includes(i+1)).join(', ')} ${t("pr_status_at")} ${autoTime} · ${t("pr_status_for")} ${autoPeriod} ${t("report_days")}`
            : t("pr_no_reminders")}
        </div>
      </div>
    </div>`;

  document.body.appendChild(screen);

  screen.querySelector("#prBack").addEventListener("click", () => screen.remove());

  let selectedDays = [...autoDays];
  screen.querySelectorAll(".pr-day").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = parseInt(btn.dataset.day);
      if (selectedDays.includes(d)) {
        selectedDays = selectedDays.filter(x => x !== d);
        btn.classList.remove("active");
      } else {
        selectedDays.push(d);
        btn.classList.add("active");
      }
    });
  });

  let selectedPeriod = autoPeriod;
  screen.querySelectorAll(".pr-period").forEach(btn => {
    btn.addEventListener("click", () => {
      screen.querySelectorAll(".pr-period").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPeriod = btn.dataset.period;
    });
  });

  screen.querySelector("#prAutoSave").addEventListener("click", async () => {
    const timeVal = screen.querySelector("#prAutoTime").value || "09:00";
    const st = loadSettings();
    st.autoDays   = selectedDays;
    st.autoPeriod = selectedPeriod;
    st.autoTime   = timeVal;
    saveSettings(st);

    const statusEl = screen.querySelector("#prAutoStatus");
    statusEl.textContent = t("pr_scheduling");

    const ok = await scheduleNotifications(selectedDays, timeVal, selectedPeriod);

    const activeDayLabels = selectedDays.map(d => DAYS[d-1]).join(', ');
    statusEl.textContent = selectedDays.length
      ? (ok
          ? `✅ ${activeDayLabels} ${t("pr_status_at")} ${timeVal} · ${t("pr_status_for")} ${selectedPeriod} ${t("report_days")}`
          : `🔔 ${activeDayLabels} ${t("pr_status_at")} ${timeVal} (${t("pr_check_permissions")})`)
      : t("pr_reminders_off");
  });

  screen.querySelector("#prGenBtn").addEventListener("click", async () => {
    const fromVal  = screen.querySelector("#prFrom").value;
    const toVal    = screen.querySelector("#prTo").value;
    const statusEl = screen.querySelector("#prStatus");

    if (!fromVal || !toVal) { statusEl.textContent = t("pr_choose_period"); return; }
    if (new Date(fromVal) > new Date(toVal)) { statusEl.textContent = t("pr_date_error"); return; }

    const st = loadSettings();
    st.lastFrom = fromVal; st.lastTo = toVal;
    saveSettings(st);

    statusEl.textContent = t("pr_generating");
    screen.querySelector("#prGenBtn").disabled = true;

    try {
      const pdfBlob = await generatePdf(fromVal, toVal);
      const fileName = `MoodOS_${fromVal}_${toVal}.pdf`;

      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          statusEl.textContent = t("pr_opening_menu");
          await navigator.share({
            title: `MoodOS ${t("pr_title")} ${fromVal} — ${toVal}`,
            text: t("pr_share_text"),
            files: [file]
          });
          statusEl.textContent = t("pr_done");
          screen.querySelector("#prGenBtn").disabled = false;
          return;
        }
      }

      const url = URL.createObjectURL(pdfBlob);
      const a   = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      statusEl.textContent = t("pr_saved");

    } catch(e) {
      if (e.name !== "AbortError") {
        statusEl.textContent = t("pr_error") + ": " + e.message;
      } else {
        statusEl.textContent = "";
      }
    }

    screen.querySelector("#prGenBtn").disabled = false;
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
    const t = new Date(e.time); return t >= fromDate && t <= toDate;
  });
  const sessions = getSessionHistory().filter(e => {
    const t = new Date(e.timestamp||0); return t >= fromDate && t <= toDate;
  });
  const profile = getProfile();

  const PAGE_W=210, MARGIN=18, CONTENT_W=PAGE_W-MARGIN*2;
  let y = MARGIN;

  const C_DARK=[45,45,45],C_GRAY=[120,120,120],C_LIGHT=[180,180,180];
  const C_GREEN=[76,175,135],C_ORANGE=[240,165,0],C_RED=[224,85,85];
  const C_LINE=[210,215,208];

  function sf(size,style="normal",color=C_DARK){
    doc.setFontSize(size);doc.setFont("helvetica",style);doc.setTextColor(...color);
  }
  function ln(yp){doc.setDrawColor(...C_LINE);doc.setLineWidth(0.3);doc.line(MARGIN,yp,PAGE_W-MARGIN,yp);}
  function chk(n=10){if(y+n>280){doc.addPage();y=MARGIN;}}
  function mc(v){return v>=70?C_GREEN:v>=40?C_ORANGE:C_RED;}
  function fmtDate(d){return new Date(d).toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric"});}
  function fmtDT(d){
    const dt=new Date(d);
    return dt.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"})+" "+
           dt.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
  }

  doc.setFillColor(232,237,230);
  doc.roundedRect(MARGIN-4,y-4,CONTENT_W+8,28,4,4,"F");
  sf(18,"bold",C_GREEN); doc.text("MoodOS",MARGIN,y+8);
  sf(10,"normal",C_GRAY); doc.text("Отчёт об эмоциональном состоянии",MARGIN,y+15);
  sf(9,"normal",C_LIGHT);
  doc.text(`Период: ${fmtDate(fromDate)} — ${fmtDate(toDate)}`,MARGIN,y+21);
  doc.text(`Сформирован: ${new Date().toLocaleDateString("ru-RU")}`,PAGE_W-MARGIN,y+21,{align:"right"});
  y+=34;

  if(profile){
    chk(30);
    sf(11,"bold",C_DARK); doc.text("Информация о пациенте",MARGIN,y); y+=7;
    ln(y); y+=5;
    sf(9,"normal",C_GRAY); doc.text("Приём препаратов:",MARGIN,y);
    sf(9,"bold",C_DARK);   doc.text(MED_LABELS[profile.takesMeds]||"Не указано",MARGIN+42,y); y+=6;
    if(profile.takesMeds&&profile.takesMeds!=="нет"&&profile.takesMeds!=="не_скажу"){
      sf(9,"normal",C_GRAY); doc.text("Эффект от препарата:",MARGIN,y);
      sf(9,"bold",C_DARK);   doc.text(EFFECT_LABELS[profile.medEffect]||"—",MARGIN+42,y); y+=6;
    }
    sf(9,"normal",C_GRAY); doc.text("Базовое состояние:",MARGIN,y);
    sf(9,"bold",C_DARK);   doc.text((profile.moodBaseline??50)+"%",MARGIN+42,y); y+=10;
  }

  chk(40);
  sf(11,"bold",C_DARK); doc.text("Статистика за период",MARGIN,y); y+=7;
  ln(y); y+=6;

  if(moodHistory.length===0){
    sf(9,"normal",C_GRAY); doc.text("Нет данных за выбранный период.",MARGIN,y); y+=10;
  } else {
    const vals=moodHistory.map(e=>e.value);
    const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
    const minV=Math.min(...vals),maxV=Math.max(...vals);
    let stab=100;
    if(vals.length>1){
      const diffs=vals.slice(1).map((v,i)=>Math.abs(v-vals[i]));
      stab=Math.max(0,Math.round(100-diffs.reduce((a,b)=>a+b,0)/diffs.length*2));
    }
    const BW=(CONTENT_W-6)/2,BH=18;
    [{label:"Среднее настроение",value:avg+"%",color:mc(avg)},
     {label:"Устойчивость",value:stab+"%",color:mc(stab)},
     {label:"Минимум",value:minV+"%",color:mc(minV)},
     {label:"Максимум",value:maxV+"%",color:mc(maxV)}
    ].forEach((box,i)=>{
      const bx=MARGIN+(i%2)*(BW+6),by=y+Math.floor(i/2)*(BH+4);
      doc.setFillColor(240,244,238);doc.roundedRect(bx,by,BW,BH,3,3,"F");
      sf(8,"normal",C_GRAY);doc.text(box.label,bx+4,by+6);
      sf(13,"bold",box.color);doc.text(box.value,bx+4,by+14);
    });
    y+=BH*2+12;
    sf(9,"normal",C_GRAY);doc.text(`Всего записей: ${moodHistory.length}`,MARGIN,y);y+=10;

    chk(50);
    sf(11,"bold",C_DARK);doc.text("График настроения",MARGIN,y);y+=7;
    ln(y);y+=4;
    const CH=35,cx=MARGIN,cy=y;
    doc.setFillColor(240,244,238);doc.roundedRect(cx,cy,CONTENT_W,CH,3,3,"F");
    doc.setDrawColor(...C_LINE);doc.setLineWidth(0.2);
    [0,25,50,75,100].forEach(pct=>{
      const gy=cy+CH-(pct/100*CH);
      doc.line(cx,gy,cx+CONTENT_W,gy);
      sf(6,"normal",C_LIGHT);doc.text(pct+"%",cx-1,gy+1,{align:"right"});
    });
    const sorted=moodHistory.slice().sort((a,b)=>new Date(a.time)-new Date(b.time));
    if(sorted.length>1){
      const pts=sorted.map((e,i)=>({
        x:cx+(i/(sorted.length-1))*CONTENT_W,
        y:cy+CH-(e.value/100*CH)
      }));
      doc.setDrawColor(...C_GREEN);doc.setLineWidth(0.8);
      for(let i=1;i<pts.length;i++) doc.line(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y);
      doc.setFillColor(...C_GREEN);
      pts.forEach(p=>doc.circle(p.x,p.y,0.8,"F"));
    }
    y+=CH+10;
  }

  if(sessions.length>0){
    chk(20);
    sf(11,"bold",C_DARK);doc.text("Использованные практики",MARGIN,y);y+=7;
    ln(y);y+=5;
    const bt={};
    sessions.forEach(s=>{
      const t=s.type||"other";
      if(!bt[t]) bt[t]={count:0,positive:0,lift:0};
      bt[t].count++;
      if(s.result==="positive") bt[t].positive++;
      if(s.moodBefore!=null&&s.moodAfter!=null) bt[t].lift+=(s.moodAfter-s.moodBefore);
    });
    Object.entries(bt).forEach(([type,data])=>{
      chk(10);
      const pct=Math.round(data.positive/data.count*100);
      const lift=Math.round(data.lift/data.count);
      sf(9,"bold",C_DARK);doc.text(SESSION_LABELS[type]||type,MARGIN,y);
      sf(9,"normal",C_GRAY);
      doc.text(`${data.count} сессий · ${pct}% эффективность · прирост: ${lift>0?"+":""}${lift}%`,MARGIN+38,y);
      y+=7;
    });
    y+=4;
  }

  chk(20);
  sf(11,"bold",C_DARK);doc.text("Журнал настроения",MARGIN,y);y+=7;
  ln(y);y+=5;
  if(moodHistory.length===0){
    sf(9,"normal",C_GRAY);doc.text("Нет данных.",MARGIN,y);y+=10;
  } else {
    doc.setFillColor(225,232,222);doc.rect(MARGIN,y-3,CONTENT_W,8,"F");
    sf(8,"bold",C_GRAY);
    doc.text("Дата и время",MARGIN+2,y+3);
    doc.text("Настроение",MARGIN+52,y+3);
    doc.text("Состояние",MARGIN+78,y+3);
    y+=9;
    moodHistory.slice().sort((a,b)=>new Date(b.time)-new Date(a.time)).forEach((e,i)=>{
      chk(8);
      if(i%2===0){doc.setFillColor(246,249,244);doc.rect(MARGIN,y-3,CONTENT_W,7,"F");}
      sf(8,"normal",C_DARK);doc.text(fmtDT(e.time),MARGIN+2,y+2);
      sf(8,"bold",mc(e.value));doc.text(e.value+"%",MARGIN+52,y+2);
      sf(8,"normal",C_GRAY);doc.text(STATE_LABELS[e.state]||"—",MARGIN+78,y+2);
      y+=7;
    });
    y+=6;
  }

  chk(16);ln(y);y+=5;
  sf(8,"normal",C_LIGHT);
  doc.text("Отчёт сформирован приложением MoodOS. Предназначен для обсуждения с врачом. Не является медицинским заключением.",MARGIN,y,{maxWidth:CONTENT_W});

  return doc.output("blob");
}

function loadScript(src) {
  return new Promise((resolve,reject)=>{
    if(document.querySelector(`script[src="${src}"]`)){resolve();return;}
    const s=document.createElement("script");
    s.src=src;s.onload=resolve;s.onerror=reject;
    document.head.appendChild(s);
  });
}
