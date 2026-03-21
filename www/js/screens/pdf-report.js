// =====================================
// MoodOS PDF Report — Share API + Push
// =====================================
import { getMoodHistory, getSessionHistory } from "../services/memory.js";
import { getProfile } from "../services/user-profile.js";
import { calculateStabilityScore, calculateTrend } from "../services/analytics.js";
import { t } from "../i18n.js";

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
      .filter(n => n.id >= 9000 && n.id <= 9099)
      .map(n => ({ id: n.id }));
    if (moodosIds.length) await LocalNotifications.cancel({ notifications: moodosIds });

    if (!days.length || !time) return true;

    const [hh, mm] = time.split(":").map(Number);
    const notifications = [];
    let idCounter = 9000;

    days.forEach(dow => {
      const jsDow = dow === 7 ? 0 : dow;
      const now = new Date();

      for (let week = 0; week < 8; week++) {
        const target = new Date();
        target.setHours(hh, mm, 0, 0);

        const currentDow = now.getDay();
        let daysUntil = (jsDow - currentDow + 7) % 7;
        if (daysUntil === 0 && target.getTime() <= now.getTime() + 65000) {
          daysUntil = 7;
        }
        daysUntil += week * 7;
        target.setDate(target.getDate() + daysUntil);

        notifications.push({
          id: idCounter++,
          title: "MoodOS 📄",
          body: t("pr_notif_body").replace("{period}", period),
          schedule: { at: target, allowWhileIdle: true, exact: true },
          actionTypeId: "OPEN_REPORT",
          extra: { action: "openReport" }
        });
      }
    });

    await LocalNotifications.schedule({ notifications });
    return true;
  } catch(e) {
    console.warn("Schedule error", e);
    return false;
  }
}

const MED_LABELS = {
  "нет":"Не принимает","антидепрессанты":"Антидепрессанты",
  "седативные":"Седативные / успокоительные","другое":"Другое","не_скажу":"Не указано"
};
const EFFECT_LABELS = {
  "лучше":"Стало лучше","примерно_так_же":"Примерно так же",
  "приглушённость":"Чувствует приглушённость","побочки":"Есть побочные эффекты","адаптация":"Подбор дозировки"
};
const SESSION_NAMES = {
  "breathing":"Дыхание","meditation":"Медитация",
  "visual-focus":"Зрительный якорь","mind-dump":"Выгрузка мыслей","tap-calm":"Тактильная разрядка"
};

const STORE_KEY = "pdf_report_settings";
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e) { return {}; }
}
function saveSettings(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

let _reminderListenerAdded = false;

export function checkAutoReminder() {
  setTimeout(() => {
    try {
      if (!window.Capacitor || !window.Capacitor.Plugins) return;
      const { LocalNotifications } = window.Capacitor.Plugins;
      if (!LocalNotifications) return;

      const s = loadSettings();
      if (s.autoDays && s.autoDays.length && s.autoTime) {
  LocalNotifications.checkPermissions().then(perm => {
    if (perm.display !== "granted") return LocalNotifications.requestPermissions();
  }).then(() => {
    return LocalNotifications.getPending();
  }).then(p => {
    const remaining = p.notifications.filter(n => n.id >= 9000 && n.id <= 9099).length;
    if (remaining < 4) scheduleNotifications(s.autoDays, s.autoTime, s.autoPeriod || "30");
  }).catch(() => {});
}

      if (!_reminderListenerAdded) {
        _reminderListenerAdded = true;
        LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
          if (action && action.notification && action.notification.extra && action.notification.extra.action === "openReport") {
            showPdfReportModal();
          }
        });
      }
    } catch(e) { console.warn("Push init error:", e); }
  }, 0);
}

export function showPdfReportModal() {
  const existing = document.getElementById("pdfReportScreen");
  if (existing) existing.remove();

  const s = loadSettings();
  const now  = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const toStr   = now.toISOString().slice(0,10);
  const fromStr = from.toISOString().slice(0,10);

  const autoDays   = s.autoDays   || [];
  const autoPeriod = s.autoPeriod || "30";
  const autoTime   = s.autoTime   || "09:00";

  const DAYS = [
    t("dow_mon"), t("dow_tue"), t("dow_wed"), t("dow_thu"),
    t("dow_fri"), t("dow_sat"), t("dow_sun")
  ];

  const PERIODS = [
    ["7",  t("pr_period_7")],
    ["14", t("pr_period_14")],
    ["30", t("pr_period_30")],
    ["90", t("pr_period_90")],
  ];

  const screen = document.createElement("div");
  screen.id = "pdfReportScreen";
  screen.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:65px;z-index:50;background:linear-gradient(160deg,#d4ede8 0%,#e8e0d5 100%);overflow-y:auto;-webkit-overflow-scrolling:touch;";

  const daysHTML = DAYS.map(function(d, i) {
    return '<div class="pr-day ' + (autoDays.includes(i+1) ? 'active' : '') + '" data-day="' + (i+1) + '">' + d + '</div>';
  }).join('');

  const periodsHTML = PERIODS.map(function(p) {
    return '<div class="pr-period ' + (autoPeriod === p[0] ? 'active' : '') + '" data-period="' + p[0] + '">' + p[1] + '</div>';
  }).join('');

  const autoStatusText = autoDays.length
    ? ('🔔 ' + autoDays.map(function(d) { return DAYS[d-1]; }).join(', ') + ' ' + t("pr_status_at") + ' ' + autoTime + ' · ' + t("pr_status_for") + ' ' + autoPeriod + ' ' + t("report_days"))
    : t("pr_no_reminders");

  screen.innerHTML =
    '<style>' +
    '.pr-wrap{padding:20px 16px 120px;}' +
    '.pr-back{display:flex;align-items:center;gap:8px;margin-bottom:20px;cursor:pointer;-webkit-tap-highlight-color:transparent;}' +
    '.pr-back-icon{font-size:22px;color:#888;}' +
    '.pr-back-label{font-size:16px;color:#888;}' +
    '.pr-title{font-size:22px;font-weight:700;color:#3a3530;margin-bottom:6px;}' +
    '.pr-subtitle{font-size:13px;color:#aaa;margin-bottom:24px;}' +
    '.pr-card{background:rgba(232,237,230,0.9);border-radius:18px;box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;padding:18px;margin-bottom:16px;}' +
    '.pr-card-title{font-size:13px;font-weight:700;color:#888;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:14px;}' +
    '.pr-date-row{display:flex;gap:12px;}' +
    '.pr-date-col{flex:1;}' +
    '.pr-date-label{font-size:11px;color:#aaa;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;}' +
    '.pr-input{width:100%;padding:12px 14px;border:none;border-radius:14px;background:rgba(220,228,218,0.8);box-shadow:inset 3px 3px 6px #c4c9c2,inset -3px -3px 6px #ffffff;font-size:15px;color:#555;outline:none;box-sizing:border-box;}' +
    '.pr-status{font-size:13px;color:#888;margin:10px 0 0;min-height:18px;text-align:center;}' +
    '.pr-btn{width:100%;padding:15px;border:none;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;font-size:16px;font-weight:700;color:#4caf87;cursor:pointer;margin-top:16px;-webkit-tap-highlight-color:transparent;}' +
    '.pr-btn:active{box-shadow:inset 4px 4px 8px #b8c4b4,inset -4px -4px 8px #ffffff;}' +
    '.pr-btn:disabled{opacity:0.5;}' +
    '.pr-hint{font-size:12px;color:#aaa;text-align:center;margin-top:10px;line-height:1.5;}' +
    '.pr-auto-card{background:#6667AB;border-radius:18px;box-shadow:4px 4px 12px rgba(102,103,171,0.4),-4px -4px 12px rgba(255,255,255,0.15);padding:18px;margin-bottom:16px;}' +
    '.pr-auto-title{font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:14px;}' +
    '.pr-auto-label{font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;}' +
    '.pr-days-row{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;}' +
    '.pr-day{padding:7px 11px;border-radius:10px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all 0.15s;}' +
    '.pr-day.active{background:rgba(255,255,255,0.9);color:#6667AB;}' +
    '.pr-period-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}' +
    '.pr-period{padding:8px 14px;border-radius:12px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);cursor:pointer;-webkit-tap-highlight-color:transparent;}' +
    '.pr-period.active{background:rgba(255,255,255,0.9);color:#6667AB;}' +
    '.pr-time-input{width:100%;padding:11px 14px;border:none;border-radius:14px;background:rgba(255,255,255,0.15);color:#fff;font-size:18px;font-weight:600;outline:none;box-sizing:border-box;}' +
    '.pr-auto-save{width:100%;padding:13px;border:none;border-radius:14px;background:rgba(255,255,255,0.2);color:#fff;font-size:15px;font-weight:700;cursor:pointer;margin-top:14px;-webkit-tap-highlight-color:transparent;}' +
    '.pr-auto-save:active{background:rgba(255,255,255,0.3);}' +
    '.pr-auto-status{font-size:12px;color:rgba(255,255,255,0.6);text-align:center;margin-top:8px;min-height:16px;line-height:1.5;}' +
    '</style>' +
    '<div class="pr-wrap">' +
      '<div class="pr-back" id="prBack"><span class="pr-back-icon">‹</span><span class="pr-back-label">' + t("settings") + '</span></div>' +
      '<div class="pr-title">📄 ' + t("pr_title") + '</div>' +
      '<div class="pr-subtitle">' + t("pr_subtitle") + '</div>' +
      '<div class="pr-card">' +
        '<div class="pr-card-title">' + t("pr_period_title") + '</div>' +
        '<div class="pr-date-row">' +
          '<div class="pr-date-col"><div class="pr-date-label">' + t("pr_from") + '</div><input type="date" id="prFrom" class="pr-input" value="' + (s.lastFrom || fromStr) + '"></div>' +
          '<div class="pr-date-col"><div class="pr-date-label">' + t("pr_to") + '</div><input type="date" id="prTo" class="pr-input" value="' + (s.lastTo || toStr) + '"></div>' +
        '</div>' +
        '<div class="pr-status" id="prStatus"></div>' +
        '<button class="pr-btn" id="prGenBtn">📤 ' + t("pr_generate_btn") + '</button>' +
        '<div class="pr-hint">' + t("pr_hint") + '</div>' +
      '</div>' +
      '<div class="pr-auto-card">' +
        '<div class="pr-auto-title">⚡ ' + t("pr_reminder_title") + '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px;">' + t("pr_reminder_sub") + '</div>' +
        '<div class="pr-auto-label">' + t("pr_reminder_days") + '</div>' +
        '<div class="pr-days-row" id="prDaysRow">' + daysHTML + '</div>' +
        '<div class="pr-auto-label">' + t("pr_reminder_time") + '</div>' +
        '<input type="time" id="prAutoTime" class="pr-time-input" value="' + autoTime + '" style="margin-bottom:16px;">' +
        '<div class="pr-auto-label">' + t("pr_reminder_period") + '</div>' +
        '<div class="pr-period-row" id="prPeriodRow">' + periodsHTML + '</div>' +
        '<button class="pr-auto-save" id="prTestNotif" style="background:rgba(255,100,100,0.3);margin-bottom:8px;">🔔 Тест — уведомление через 1 мин</button>' +
        '<button class="pr-auto-save" id="prAutoSave">' + t("pr_save_schedule") + '</button>' +
        '<div class="pr-auto-status" id="prAutoStatus">' + autoStatusText + '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(screen);

  screen.querySelector("#prBack").addEventListener("click", function() { screen.remove(); });

  let selectedDays = autoDays.slice();
  screen.querySelectorAll(".pr-day").forEach(function(btn) {
    btn.addEventListener("click", function() {
      const d = parseInt(btn.dataset.day);
      if (selectedDays.includes(d)) {
        selectedDays = selectedDays.filter(function(x) { return x !== d; });
        btn.classList.remove("active");
      } else {
        selectedDays.push(d);
        btn.classList.add("active");
      }
    });
  });

  let selectedPeriod = autoPeriod;
  screen.querySelectorAll(".pr-period").forEach(function(btn) {
    btn.addEventListener("click", function() {
      screen.querySelectorAll(".pr-period").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      selectedPeriod = btn.dataset.period;
    });
  });

  screen.querySelector("#prTestNotif").addEventListener("click", async function() {
    const statusEl = screen.querySelector("#prAutoStatus");
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      await requestNotificationPermission();
      const perm = await LocalNotifications.checkPermissions();
      const target = new Date(Date.now() + 60000);
      await LocalNotifications.schedule({ notifications: [{
        id: 8999,
        title: "MoodOS тест",
        body: "Уведомления работают!",
        schedule: { at: target, allowWhileIdle: true, exact: true },
      }]});
      statusEl.textContent = "✅ Запланировано на " + target.toLocaleTimeString("ru-RU") + " | Разрешение: " + perm.display;
    } catch(e) {
      statusEl.textContent = "❌ Ошибка: " + e.message;
    }
  });

  screen.querySelector("#prAutoSave").addEventListener("click", async function() {
    const timeVal = screen.querySelector("#prAutoTime").value || "09:00";
    const st = loadSettings();
    st.autoDays   = selectedDays;
    st.autoPeriod = selectedPeriod;
    st.autoTime   = timeVal;
    saveSettings(st);

    const statusEl = screen.querySelector("#prAutoStatus");
    statusEl.textContent = t("pr_scheduling");
    await requestNotificationPermission();
    try { const Battery = window.Capacitor.Plugins.Battery; if (Battery) { const { ignoring } = await Battery.isIgnoringBatteryOptimizations(); if (!ignoring) await Battery.requestIgnoreBatteryOptimizations(); } } catch(e) {}
    const ok = await scheduleNotifications(selectedDays, timeVal, selectedPeriod);
    const activeDayLabels = selectedDays.map(function(d) { return DAYS[d-1]; }).join(', ');

    if (selectedDays.length) {
      statusEl.textContent = ok
        ? ('✅ ' + activeDayLabels + ' ' + t("pr_status_at") + ' ' + timeVal + ' · ' + t("pr_status_for") + ' ' + selectedPeriod + ' ' + t("report_days"))
        : ('🔔 ' + activeDayLabels + ' ' + t("pr_status_at") + ' ' + timeVal + ' (' + t("pr_check_permissions") + ')');
    } else {
      statusEl.textContent = t("pr_reminders_off");
    }
  });

  screen.querySelector("#prGenBtn").addEventListener("click", async function() {
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
      const fileName = "MoodOS_" + fromVal + "_" + toVal + ".pdf";
      statusEl.textContent = t("pr_opening_menu");

      const Share      = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
      const Filesystem = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;

      if (Share && Filesystem) {
        const reader = new FileReader();
        reader.onload = async function(e) {
          try {
            const base64 = e.target.result.split(",")[1];
            await Filesystem.writeFile({ path: fileName, data: base64, directory: "CACHE" });
            const fileUri = await Filesystem.getUri({ path: fileName, directory: "CACHE" });
            await Share.share({
              title: "MoodOS — " + t("pr_title"),
              text: t("pr_share_text"),
              url: fileUri.uri,
              dialogTitle: t("pr_title"),
            });
            statusEl.textContent = t("pr_done");
          } catch(err) {
            if (err.name !== "AbortError") statusEl.textContent = t("pr_error");
          }
          screen.querySelector("#prGenBtn").disabled = false;
        };
        reader.readAsDataURL(pdfBlob);
        return;
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
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
  if (!window.html2canvas) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  }

  const fromDate = new Date(fromStr + "T00:00:00");
  const toDate   = new Date(toStr   + "T23:59:59");

  const moodHistory = getMoodHistory().filter(function(e) {
    const d = new Date(e.time); return d >= fromDate && d <= toDate;
  });
  const sessions = getSessionHistory().filter(function(e) {
    const d = new Date(e.timestamp || 0); return d >= fromDate && d <= toDate;
  });
  const allMoodHistory = getMoodHistory();
  const profile   = getProfile();
  const stability = calculateStabilityScore(moodHistory);
  const trend     = calculateTrend(allMoodHistory);

  function fmtDate(d) {
    return new Date(d).toLocaleDateString("ru-RU", { day:"2-digit", month:"long", year:"numeric" });
  }
  function fmtDT(d) {
    const dt = new Date(d);
    return dt.toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit" }) + " " +
           dt.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
  }
  function moodColor(v) { return v >= 70 ? "#4caf87" : v >= 40 ? "#f0a500" : "#e05555"; }
  function stateLabel(s) {
    return { HIGH:"Отличное", GOOD:"Хорошее", NEUTRAL:"Нейтральное", STRESSED:"Напряжение", LOW:"Сниженное" }[s] || "—";
  }

  const vals = moodHistory.map(function(e) { return e.value; });
  const avg  = vals.length ? Math.round(vals.reduce(function(a,b){return a+b;}, 0) / vals.length) : null;
  const minV = vals.length ? Math.min.apply(null, vals) : null;
  const maxV = vals.length ? Math.max.apply(null, vals) : null;
  const trendTxt = trend === "improving ↑" ? "📈 Улучшается" : trend === "declining ↓" ? "📉 Снижается" : "➡️ Стабильно";

  const practiceStats = {};
  sessions.forEach(function(s) {
    const tp = s.type || "other";
    if (!practiceStats[tp]) practiceStats[tp] = { count:0, positive:0, lift:0 };
    practiceStats[tp].count++;
    if (s.result === "positive") practiceStats[tp].positive++;
    if (s.moodBefore != null && s.moodAfter != null) practiceStats[tp].lift += (s.moodAfter - s.moodBefore);
  });

  const recs = [];
  if (avg !== null) {
    if (avg < 40) recs.push("⚠️ Среднее настроение ниже 40% (" + avg + "%). Рекомендуется детальное обследование эмоционального состояния.");
    else if (avg < 55) recs.push("🔔 Настроение в зоне повышенного внимания (" + avg + "%). Рекомендуется наблюдение.");
    else recs.push("✓ Настроение в стабильной зоне (" + avg + "%). Динамика положительная.");
  }
  if (stability !== null && stability < 50) recs.push("⚠️ Высокая волатильность настроения (стабильность " + stability + "%). Возможна эмоциональная нестабильность.");
  if (trend === "declining ↓") recs.push("📉 Тренд: настроение снижалось в течение периода. Рекомендуется обратить внимание.");
  else if (trend === "improving ↑") recs.push("📈 Тренд: настроение улучшалось в течение периода.");
  if (profile && profile.medEffect === "побочки") recs.push("💊 Пациент отмечает побочные эффекты от препаратов. Рекомендуется пересмотр терапии.");
  if (profile && profile.medEffect === "приглушённость") recs.push("💊 Пациент ощущает приглушённость от препаратов. Возможна корректировка дозы.");
  if (profile && profile.medEffect === "адаптация") recs.push("⏳ Пациент в периоде адаптации к препаратам. Перепады настроения могут быть нормой.");
  if (sessions.length > 0) {
    const best = Object.entries(practiceStats).sort(function(a,b) {
      return (b[1].positive / b[1].count) - (a[1].positive / a[1].count);
    })[0];
    if (best) {
      const pct = Math.round(best[1].positive / best[1].count * 100);
      recs.push("✓ Наиболее эффективная практика: " + (SESSION_NAMES[best[0]] || best[0]) + " (" + pct + "% положительных результатов).");
    }
  }
  if (recs.length === 0) recs.push("Недостаточно данных для формирования рекомендаций.");

  const practicesHTML = Object.entries(practiceStats).map(function(entry) {
    const type = entry[0]; const data = entry[1];
    const pct  = Math.round(data.positive / data.count * 100);
    const lift = Math.round(data.lift / data.count);
    return '<tr>' +
      '<td style="padding:4px 8px">' + (SESSION_NAMES[type] || type) + '</td>' +
      '<td style="padding:4px 8px;text-align:center">' + data.count + '</td>' +
      '<td style="padding:4px 8px;text-align:center;color:' + (pct >= 60 ? "#4caf87" : "#888") + '">' + pct + '%</td>' +
      '<td style="padding:4px 8px;text-align:center;color:' + (lift > 0 ? "#4caf87" : "#888") + '">' + (lift > 0 ? "+" : "") + lift + '%</td>' +
      '</tr>';
  }).join("");

  const journalRows = moodHistory.slice().sort(function(a,b) {
    return new Date(b.time) - new Date(a.time);
  }).slice(0, 50).map(function(e, i) {
    return '<tr style="background:' + (i % 2 === 0 ? "#f5faf5" : "#fff") + '">' +
      '<td style="padding:3px 8px;font-size:11px">' + fmtDT(e.time) + '</td>' +
      '<td style="padding:3px 8px;font-size:11px;font-weight:700;color:' + moodColor(e.value) + '">' + e.value + '%</td>' +
      '<td style="padding:3px 8px;font-size:11px;color:#666">' + stateLabel(e.state) + '</td>' +
      '</tr>';
  }).join("");

  let patientBlock = "";
  if (profile) {
    const showEffect = profile.takesMeds && profile.takesMeds !== "нет" && profile.takesMeds !== "не_скажу";
    patientBlock =
      '<div style="background:#f0f7f4;border-radius:10px;padding:14px 18px;margin-bottom:18px;">' +
        '<div style="font-size:13px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Информация о пациенте</div>' +
        '<div style="display:flex;gap:24px;flex-wrap:wrap;">' +
          '<div><span style="color:#aaa;font-size:12px">Приём препаратов:</span><br><b style="font-size:13px">' + (MED_LABELS[profile.takesMeds] || "Не указано") + '</b></div>' +
          (showEffect ? '<div><span style="color:#aaa;font-size:12px">Эффект:</span><br><b style="font-size:13px">' + (EFFECT_LABELS[profile.medEffect] || "—") + '</b></div>' : "") +
          '<div><span style="color:#aaa;font-size:12px">Базовое состояние:</span><br><b style="font-size:13px">' + (profile.moodBaseline != null ? profile.moodBaseline : 50) + '%</b></div>' +
        '</div>' +
      '</div>';
  }

  let statsBlock = "";
  if (avg !== null) {
    const statItems = [
      ["Среднее настроение", avg + "%", moodColor(avg)],
      ["Стабильность", stability !== null ? stability + "%" : "—", moodColor(stability || 0)],
      ["Минимум", minV + "%", moodColor(minV)],
      ["Максимум", maxV + "%", moodColor(maxV)],
      ["Тренд", trendTxt, "#6667AB"],
      ["Записей", moodHistory.length, "#555"],
    ];
    const statCells = statItems.map(function(item) {
      return '<div style="flex:1;min-width:100px;background:#f5faf5;border-radius:8px;padding:10px 12px;">' +
        '<div style="font-size:11px;color:#aaa;margin-bottom:4px">' + item[0] + '</div>' +
        '<div style="font-size:18px;font-weight:700;color:' + item[2] + '">' + item[1] + '</div>' +
        '</div>';
    }).join("");
    statsBlock =
      '<div style="margin-bottom:18px;">' +
        '<div style="font-size:13px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Статистика за период</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' + statCells + '</div>' +
      '</div>';
  }

  const recsHTML = recs.map(function(r) {
    return '<div style="color:#fff;font-size:12px;margin-bottom:6px;padding:6px 10px;background:rgba(255,255,255,0.1);border-radius:6px;">' + r + '</div>';
  }).join("");
  const recsBlock =
    '<div style="background:#6667AB;border-radius:10px;padding:14px 18px;margin-bottom:18px;">' +
      '<div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Рекомендации для врача</div>' +
      recsHTML +
    '</div>';

  let practicesBlock = "";
  if (sessions.length > 0) {
    practicesBlock =
      '<div style="margin-bottom:18px;">' +
        '<div style="font-size:13px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Использованные практики</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
          '<thead><tr style="background:#e8ede6;">' +
            '<th style="padding:6px 8px;text-align:left;color:#888">Практика</th>' +
            '<th style="padding:6px 8px;text-align:center;color:#888">Сессий</th>' +
            '<th style="padding:6px 8px;text-align:center;color:#888">Эффект</th>' +
            '<th style="padding:6px 8px;text-align:center;color:#888">Прирост</th>' +
          '</tr></thead>' +
          '<tbody>' + practicesHTML + '</tbody>' +
        '</table>' +
      '</div>';
  }

  let journalBlock = "";
  if (moodHistory.length > 0) {
    journalBlock =
      '<div style="margin-bottom:18px;">' +
        '<div style="font-size:13px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Журнал настроения</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
          '<thead><tr style="background:#e8ede6;">' +
            '<th style="padding:5px 8px;text-align:left;color:#888">Дата и время</th>' +
            '<th style="padding:5px 8px;text-align:center;color:#888">Настроение</th>' +
            '<th style="padding:5px 8px;text-align:left;color:#888">Состояние</th>' +
          '</tr></thead>' +
          '<tbody>' + journalRows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  const html =
    '<div style="width:794px;font-family:Arial,sans-serif;color:#333;background:#fff;padding:0;">' +
      '<div style="background:#4caf87;padding:20px 24px 16px;color:#fff;">' +
        '<div style="font-size:24px;font-weight:700;margin-bottom:4px;">MoodOS</div>' +
        '<div style="font-size:13px;opacity:0.85">Отчёт об эмоциональном состоянии</div>' +
        '<div style="font-size:11px;opacity:0.7;margin-top:6px;">Период: ' + fmtDate(fromDate) + ' — ' + fmtDate(toDate) + ' &nbsp;·&nbsp; Сформирован: ' + new Date().toLocaleDateString("ru-RU") + '</div>' +
      '</div>' +
      '<div style="padding:20px 24px;">' +
        patientBlock + statsBlock + recsBlock + practicesBlock + journalBlock +
        '<div style="border-top:1px solid #e0e0e0;padding-top:10px;font-size:10px;color:#aaa;">Отчёт сформирован приложением MoodOS. Предназначен для обсуждения с врачом. Не является медицинским заключением.</div>' +
      '</div>' +
    '</div>';

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await window.html2canvas(container.firstElementChild, {
      scale: 1.5, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", width: 794,
    });
    document.body.removeChild(container);

    const { jsPDF } = window.jspdf;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgW = 210;
    const imgH = canvas.height * imgW / canvas.width;
    const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });

    let posY = 0;
    const pageH = 297;
    while (posY < imgH) {
      if (posY > 0) doc.addPage();
      doc.addImage(imgData, "JPEG", 0, -posY, imgW, imgH);
      posY += pageH;
    }
    return doc.output("blob");

  } catch(e) {
    document.body.removeChild(container);
    throw e;
  }
}

function loadScript(src) {
  return new Promise(function(resolve, reject) {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
