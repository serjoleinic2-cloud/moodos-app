import { getMoodHistory, getNotesHistory, getSessionHistory, getVoiceHistory, resolveTimestamp, getReflections } from "../services/memory.js";
import Chart from 'chart.js/auto';

window.Chart = Chart;
import { calculateStabilityScore } from "../services/analytics.js";
import { t } from "../i18n.js";
import { isPremium } from "../services/user-profile.js";
import { showPremiumModal } from "../premium-modal.js";
import { getYearComparison } from "../services/year-comparison.js";

function isOceanTheme() {
  return document.body.getAttribute('data-theme') === 'deep-ocean';
}
function chartTextColor() {
  return window.themeVar ? window.themeVar('--theme-chart-text') : '#888';
}
function chartGridColor() {
  return window.themeVar ? window.themeVar('--theme-chart-grid') : 'rgba(0,0,0,0.08)';
}

let currentPeriod = 7;

export function onEnter() { renderReport(); }

export function onExit() {
  const popup = document.getElementById("dayPopup");
  const overlay = document.getElementById("dayPopupOverlay");
  if (popup) popup.remove();
  if (overlay) overlay.remove();
}

function checkHistoryLimit() {
  if (currentPeriod > 7 && !isPremium()) {
    showPremiumModal({
      title: t("free_history_limit_title"),
      desc: t("free_history_limit_desc")
    });
    return false;
  }
  return true;
}

function getTooltips() {
  return {
    avg:     t("tooltip_avg"),
    stab:    t("tooltip_stab"),
    entries: t("tooltip_entries"),
    days:    t("tooltip_days"),
    best:    t("tooltip_best"),
    worst:   t("tooltip_worst"),
  };
}

function getMonthNames() {
  return [
    t("month_jan"), t("month_feb"), t("month_mar"), t("month_apr"),
    t("month_may"), t("month_jun"), t("month_jul"), t("month_aug"),
    t("month_sep"), t("month_oct"), t("month_nov"), t("month_dec")
  ];
}

function getDowNames() {
  return [
    t("dow_mon"), t("dow_tue"), t("dow_wed"), t("dow_thu"),
    t("dow_fri"), t("dow_sat"), t("dow_sun")
  ];
}

function renderReport() {
  const container = document.getElementById("report-content");
  if (!container) return;

  const history = getMoodHistory();

  if (!history || history.length === 0) {
    container.innerHTML = `<div style="text-align:center;margin-top:60px;color:var(--theme-text-accent,#888);"><div style="font-size:48px;">📊</div><div style="margin-top:12px;">${t("report_no_data")}</div></div>`;
    return;
  }

  const filtered = filterByDays(history, currentPeriod);

  const periodBtns = `
    <div style="display:flex;gap:10px;margin-bottom:20px;">
      ${[7,30,99999].map(d=>`<button class="mo-btn period-btn ${currentPeriod===d?'active-period':''}" data-days="${d}" style="flex:1;">${d>3650?t("report_all_time"):d+" "+t("report_days")}</button>`).join('')}
    </div>`;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:4px 0 60px;">${periodBtns}
      <div style="text-align:center;margin-top:40px;color:var(--theme-text-accent,#888);"><div style="font-size:48px;">📭</div><div style="margin-top:12px;">${t("report_no_period")}</div></div></div>`;
    bindPeriodBtns(container);
    return;
  }

  const average   = Math.round(filtered.reduce((s,h)=>s+h.value,0)/filtered.length);
  const best      = filtered.reduce((a,b)=>a.value>b.value?a:b);
  const worst     = filtered.reduce((a,b)=>a.value<b.value?a:b);
  const stability = calculateStabilityScore(filtered);
  const activeDays = countActiveDays(filtered);

  function mc(v){ return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"; }
  function sc(s){ if(!s) return "#888"; return s>=75?"#4caf87":s>=50?"#f0a500":"#e05555"; }

  let stateText = t("report_conclusion_mid");
  if (average < 40) stateText = t("report_conclusion_low");
  if (average > 70) stateText = t("report_conclusion_high");

  const periodLabel = currentPeriod > 3650 ? t("report_all_time") : `${currentPeriod} ${t("report_days")}`;

  let yearComparisonHTML = "";
  if (isPremium()) {
    const comparison = getYearComparison();
    if (comparison) {
      const arrow = comparison.trend === "up" ? "↑" : comparison.trend === "down" ? "↓" : "→";
      const color = comparison.trend === "up" ? "#4caf87" : comparison.trend === "down" ? "#e05555" : "#f0a500";
      const absDiff = Math.abs(comparison.difference);
      let mainText = "";
      if (comparison.trend === "up") {
        mainText = `${t("year_comparison_better").replace("{n}", absDiff)}`;
      } else if (comparison.trend === "down") {
        mainText = `${t("year_comparison_worse").replace("{n}", absDiff)}`;
      } else {
        mainText = `${t("year_comparison_same")}`;
      }
      yearComparisonHTML = `
        <div style="margin-top:16px;padding:16px;border-radius:16px;background:linear-gradient(135deg,#2a3a4a,#1a2530);box-shadow:4px 4px 12px rgba(0,0,0,0.2),-2px -2px 8px rgba(255,255,255,0.1);">
          <div style="font-size:12px;color:var(--theme-text-accent,#888);margin-bottom:8px;">${t("year_comparison_title")}</div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:28px;font-weight:700;color:${color};">${arrow}</div>
            <div>
              <div style="font-size:16px;font-weight:600;color:#fff;">${mainText}</div>
              <div style="font-size:11px;color:var(--theme-text-accent,#666);margin-top:2px;">${t("year_comparison_vs_period")}</div>
            </div>
          </div>
        </div>`;
    }
  } else {
    yearComparisonHTML = `
      <div id="yearComparisonLocked" style="margin-top:16px;padding:16px;border-radius:16px;background:linear-gradient(135deg,rgba(255,200,50,0.08),rgba(255,140,0,0.04));border:1.5px solid rgba(255,180,0,0.5);cursor:pointer;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:20px;">🔒</div>
          <div>
            <div style="font-size:13px;color:var(--theme-text-accent,#666);">${t("year_comparison_locked").replace("🔒 ", "")}</div>
            <div style="font-size:11px;color:var(--theme-text-accent,#888);margin-top:2px;">${t("year_comparison_sell")}</div>
          </div>
        </div>
      </div>`;
  }

  container.innerHTML = `
    <div style="padding:4px 0 60px;">
      <div style="font-size:13px;color:var(--theme-text-accent,#888);margin-bottom:16px;">${t("report_period_label")} ${periodLabel}</div>

      ${periodBtns}

      ${yearComparisonHTML}

      <div class="mo-section-title">${t("report_summary")}</div>
      <div class="mo-grid-2">
        ${metricCard(t("report_avg"), `<span style="color:${mc(average)}">${average}%</span>`, t("report_per_period"), "avg")}
        ${metricCard(t("report_stab"), `<span style="color:${sc(stability)}">${stability??'—'}%</span>`, t("report_index"), "stab")}
        ${metricCard(t("report_entries"), `<span style="color:#4db8ff">${filtered.length}</span>`, t("report_total"), "entries")}
        ${metricCard(t("report_active_days"), `<span style="color:#9f7aea">${activeDays}</span>`, t("report_with_entries"), "days")}
      </div>

      <button id="rptCalendarBtn" style="width:100%;padding:15px;border:none;border-radius:16px;background:linear-gradient(135deg,#6667AB,#9f7aea);box-shadow:6px 6px 14px rgba(102,103,171,0.4),-4px -4px 10px rgba(255,255,255,0.3);font-size:16px;font-weight:700;color:#fff;cursor:pointer;margin-bottom:16px;-webkit-tap-highlight-color:transparent;letter-spacing:0.3px;">
        📅 ${t("cal_title")}
      </button>

      <div class="mo-section-title" style="margin-top:16px;">${t("report_dynamics")}</div>
      <div class="mo-metric" style="padding:12px;margin-bottom:16px;">
        <canvas id="reportChart" height="130"></canvas>
      </div>

      <div class="mo-section-title">${t("report_moments")}</div>
      <div class="mo-grid-2">
  ${metricCard(t("report_best"),  `<span style="color:#4caf87">${best.value}%</span>`,  formatDate(resolveTimestamp(best)),  "best")}
  ${worst.value < 50 ? metricCard(t("report_worst"), `<span style="color:#e05555">${worst.value}%</span>`, formatDate(resolveTimestamp(worst)), "worst") : ""}
      </div>

      <div class="mo-section-title" style="margin-top:16px;">${t("report_conclusion")}</div>
      <div class="mo-metric">
        <div style="font-size:15px;color:#444;line-height:1.6;">${stateText}</div>
      </div>
    </div>`;

  bindPeriodBtns(container);
  bindTooltips(container);
  requestAnimationFrame(() => drawChart(filtered));
  const calBtn = container.querySelector("#rptCalendarBtn");
  if (calBtn) {
    calBtn.onclick = () => showMoodCalendarOverlay();
  }
  
  const lockedBtn = container.querySelector("#yearComparisonLocked");
  if (lockedBtn) {
    lockedBtn.addEventListener("click", () => {
      showPremiumModal({
        title: t("year_comparison_locked").replace("🔒 ", ""),
        desc: t("free_history_limit_desc")
      });
    });
  }
}

// ============================================================
// Календарь настроений — оверлей
// ============================================================
function showMoodCalendarOverlay() {
  const existing = document.getElementById("moodCalendarOverlay");
  if (existing) existing.remove();

  // Строим единый timeline как в history.js
  const allItems = [];
  getMoodHistory().forEach(e => {
    const ts = resolveTimestamp(e);
    if (!ts) return;
    allItems.push({ type: "mood", ts, value: e.value });
  });
  getNotesHistory().forEach(e => {
    const ts = resolveTimestamp(e);
    if (!ts) return;
    allItems.push({ type: "note", ts });
  });
  getSessionHistory().forEach(e => {
    const ts = resolveTimestamp(e);
    if (!ts) return;
    allItems.push({ type: "session", ts,
      sessionType: e.type || e.sessionType,
      result: e.result });
  });
  getVoiceHistory().forEach(e => {
    const ts = resolveTimestamp(e);
    if (!ts) return;
    allItems.push({ type: "voice_note", ts, audio: e.audio || null });
  });
  getReflections().forEach(e => {
    const ts = resolveTimestamp(e);
    if (!ts) return;
    allItems.push({ type: "reflection", ts });
  });

  // dayAvg только из mood записей
  const byDay = {};
  allItems.filter(i => i.type === "mood").forEach(i => {
    const d = new Date(i.ts);
    const key = d.getFullYear() + "-" +
      String(d.getMonth()+1).padStart(2,"0") + "-" +
      String(d.getDate()).padStart(2,"0");
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(i.value);
  });
  const dayAvg = {};
  Object.keys(byDay).forEach(k => {
    dayAvg[k] = Math.round(byDay[k].reduce((a,b)=>a+b,0)/byDay[k].length);
  });

  // daySessions и dayPracticeCounts из allItems
  const daySessions = {};
  const dayPracticeCounts = {};
  allItems.filter(i => i.type === "session").forEach(i => {
    const d = new Date(i.ts);
    const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    daySessions[key] = (daySessions[key] || 0) + 1;
    const type = normalizePracticeType(i.sessionType || '');
    if (!dayPracticeCounts[key]) dayPracticeCounts[key] = {};
    dayPracticeCounts[key][type] = (dayPracticeCounts[key][type] || 0) + 1;
  });

  // dayVoiceMap из allItems
  const dayVoiceMap = {};
  allItems.filter(i => i.type === "voice_note" && i.audio).forEach(i => {
    const d = new Date(i.ts);
    const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    if (!dayVoiceMap[key]) dayVoiceMap[key] = [];
    let audioSrc = i.audio;
    const Capacitor = window.Capacitor;
    if (Capacitor?.convertFileSrc && audioSrc.startsWith("file://")) {
      audioSrc = Capacitor.convertFileSrc(audioSrc);
    }
    dayVoiceMap[key].push(audioSrc);
  });

  const PRACTICE_NAMES = {
    breathing:      '🫁 ' + (t('tools_breathing') || 'Дыхание').replace(/^\S+\s/, ''),
    meditation:     '🧘 ' + (t('tools_meditation') || 'Медитация').replace(/^\S+\s/, ''),
    'visual-focus': '👁 ' + (t('tools_visual') || 'Зрительный якорь').replace(/^\S+\s/, ''),
    'mind-dump':    '🧠 ' + (t('tools_mind') || 'Выгрузка мыслей').replace(/^\S+\s/, ''),
    'tap-calm':     '✋ ' + (t('tools_tap') || 'Тактильная разрядка').replace(/^\S+\s/, ''),
    'support_texts':'💬 ' + (t('support_texts_title') || 'Тексты поддержки').replace(/^\S+\s/, '')
  };
  
  function normalizePracticeType(type) {
    if (!type) return 'other';
    const normalized = type.toLowerCase().replace(/[-_]/g, '-');
    if (normalized.includes('breath')) return 'breathing';
    if (normalized.includes('meditat')) return 'meditation';
    if (normalized.includes('visual') || normalized.includes('focus')) return 'visual-focus';
    if (normalized.includes('mind') || normalized.includes('dump')) return 'mind-dump';
    if (normalized.includes('tap')) return 'tap-calm';
    if (normalized.includes('support') || normalized.includes('text')) return 'support_texts';
    return type;
  }

  function moodBg(v) {
    if (v === undefined) return "rgba(0,0,0,0.04)";
    if (v >= 70) return "#4caf8733";
    if (v >= 40) return "#f0a50033";
    return "#e0555533";
  }
  function moodFg(v) {
    if (v === undefined) return "#ddd";
    if (v >= 70) return "#2e7d55";
    if (v >= 40) return "#b07700";
    return "#b03030";
  }

  const now = new Date();
  let viewYear  = now.getFullYear();
  let viewMonth = now.getMonth();

  function renderGrid(year, month) {
    const MONTH_NAMES = getMonthNames();
    const DOW_NAMES   = getDowNames();

    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month+1, 0);
    let dow = firstDay.getDay();
    if (dow === 0) dow = 7;

    let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px;">`;
    DOW_NAMES.forEach(d => {
      html += `<div style="text-align:center;font-size:10px;color:var(--theme-text-muted,#aaa);font-weight:600;padding:2px 0;">${d}</div>`;
    });
    html += `</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">`;

    for (let i = 1; i < dow; i++) html += `<div></div>`;

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const key = year + "-" + String(month+1).padStart(2,"0") + "-" + String(day).padStart(2,"0");
      const v = dayAvg[key];
      const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      const hasVoiceDay = (dayVoiceMap[key] || []).length > 0;
      const hasData = v !== undefined || hasVoiceDay;
      html += `<div class="cal-day ${hasData ? 'cal-day-clickable' : ''}" data-key="${key}" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;background:${moodBg(v)};border:${isToday?"2px solid #6667AB":"1px solid rgba(0,0,0,0.06)"};box-sizing:border-box;cursor:${hasData ? 'pointer' : 'default'};">
        <span style="font-size:9px;color:var(--theme-text-muted,#bbb);">${day}</span>
        ${v !== undefined ? `<span style="font-size:10px;font-weight:700;color:${moodFg(v)};line-height:1.1;">${v}%</span>` : ""}
        ${hasVoiceDay && v === undefined ? `<span style="font-size:8px;">🎤</span>` : ''}
      </div>`;
    }
    html += `</div>`;

    return { gridHtml: html, monthLabel: `${MONTH_NAMES[month]} ${year}` };
  }
  
  function showDayPopup(key) {
    const v = dayAvg[key];
    
    const sessions = daySessions[key] || 0;
    const voices = dayVoiceMap[key] || [];
    const hasVoice = voices.length > 0;
    
    const date = new Date(key + "T12:00:00");
    const day = String(date.getDate()).padStart(2, '0');
    const mon = String(date.getMonth() + 1).padStart(2, '0');
    const dateFormatted = `${day}.${mon}.${date.getFullYear()}`;
    
    const popup = document.createElement("div");
    popup.id = "dayPopup";
    popup.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:300;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:20px;padding:24px;width:280px;box-shadow:0 10px 40px rgba(0,0,0,0.3);";
    
    const moodColor = v >= 70 ? "#4caf87" : v >= 40 ? "#f0a500" : "#e05555";
    
    const practiceMap = dayPracticeCounts[key] || {};
    const practiceEntries = Object.entries(practiceMap || {}).sort((a, b) => b[1] - a[1]);
    const displayPractices = practiceEntries.slice(0, 3);
    const remainingCount = practiceEntries.length - 3;
    
    let practicesHTML = '';
    if (displayPractices.length > 0) {
      practicesHTML = displayPractices.map(([type, count]) => {
        const name = PRACTICE_NAMES[type] || type;
        return `<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.5);border-radius:8px;font-size:13px;color:var(--theme-text-muted,#555);">
          <span>${name}</span>
          <span style="font-weight:600;color:var(--theme-text-accent,#666);">×${count}</span>
        </div>`;
      }).join('');
      if (remainingCount > 0) {
        practicesHTML += `<div style="font-size:11px;color:var(--theme-text-accent,#888);text-align:center;padding:6px;">+ ${remainingCount} ещё</div>`;
      }
    }
    
    popup.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:14px;color:var(--theme-text-accent,#888);margin-bottom:4px;">${dateFormatted}</div>
        ${v !== undefined ? `
        <div style="font-size:36px;font-weight:700;color:${moodColor};">${v}%</div>
        <div style="font-size:12px;color:var(--theme-text-muted,#aaa);">${t("hist_mood") || "Настроение"}</div>
        ` : `
        <div style="font-size:14px;color:var(--theme-text-muted,#aaa);margin-bottom:8px;">${t("hist_voice_diary") || "Голосовая заметка"}</div>
        `}
      </div>`;

    const dayOverlay = document.createElement("div");
    dayOverlay.id = "dayPopupOverlay";
    dayOverlay.style.cssText = "position:fixed;inset:0;z-index:299;background:rgba(0,0,0,0.3);";
    dayOverlay.onclick = () => {
      popup.remove();
      dayOverlay.remove();
    };

    document.body.appendChild(dayOverlay);
    document.body.appendChild(popup);

    popup.querySelector("#dayPopupClose").onclick = () => {
      popup.remove();
      dayOverlay.remove();
    };
  }

  overlay.innerHTML = build();
  document.body.appendChild(overlay);

  function rebind() {
    overlay.querySelector("#calClose").onclick = () => overlay.remove();
    overlay.querySelector("#calPrev").onclick = () => {
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      overlay.innerHTML = build(); rebind();
    };
    overlay.querySelector("#calNext").onclick = () => {
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      overlay.innerHTML = build(); rebind();
    };
    
    overlay.querySelectorAll(".cal-day-clickable").forEach(el => {
      el.onclick = () => showDayPopup(el.dataset.key);
    });
    
    overlay.addEventListener("click", e => { 
      if (e.target === overlay) overlay.remove(); 
    });
    
    // Voice button handlers
    overlay.querySelectorAll(".voice-btn").forEach(btn => {
      btn.onclick = () => {
        const idx = btn.dataset.index;
        const audio = document.getElementById("voice-player-" + idx);
        if (!audio) return;
        if (audio.paused) {
          audio.play();
          btn.querySelector("img").src = "/icons/player/pause.svg?v=2";
        } else {
          audio.pause();
          btn.querySelector("img").src = "/icons/player/play.svg?v=2";
        }
        audio.onended = () => {
          btn.querySelector("img").src = "/icons/player/play.svg?v=2";
        };
      };
    });
  }
  rebind();
}


function metricCard(label, valueHTML, sub, tooltipKey) {
  const tips = getTooltips();
  return `
    <div class="mo-metric" style="position:relative;">
      <div class="mo-info-btn" data-tip="${tooltipKey}">i</div>
      <div class="mo-tooltip">${tips[tooltipKey]||''}</div>
      <div class="mo-metric-label">${label}</div>
      <div class="mo-metric-value">${valueHTML}</div>
      <div class="mo-metric-sub">${sub}</div>
    </div>`;
}

function bindPeriodBtns(container) {
  container.querySelectorAll(".period-btn").forEach(btn => {
    btn.onclick = () => { 
      const newPeriod = Number(btn.dataset.days);
      if (newPeriod > 7 && !isPremium()) {
        showPremiumModal({
          title: t("free_history_limit_title"),
          desc: t("free_history_limit_desc")
        });
        return;
      }
      currentPeriod = newPeriod; 
      renderReport(); 
    };
  });
}

function bindTooltips(container) {
  container.querySelectorAll(".mo-info-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = btn.classList.contains("open");
      container.querySelectorAll(".mo-info-btn").forEach(b => b.classList.remove("open"));
      if (!wasOpen) btn.classList.add("open");
    });
  });
  document.addEventListener("click", () => {
    container.querySelectorAll(".mo-info-btn").forEach(b => b.classList.remove("open"));
  }, { once: true });
}

function drawChart(filtered) {
  const canvas = document.getElementById("reportChart");
  if (!canvas) return;
  if (!window.Chart) {
    const parent = canvas.parentElement;
    if (parent) parent.innerHTML =
      '<div style="color:var(--theme-text-muted,#aaa);font-size:13px;text-align:center;padding:20px;">' +
      t('chart_unavailable') + '</div>';
    return;
  }
  const ex = window.Chart.getChart(canvas);
  if (ex) ex.destroy();

  const byDay = {};
  filtered.forEach(e => {
    const ts = resolveTimestamp(e);
    if (!ts) return;
    const d = new Date(ts);
    const k = `${d.getDate()}.${String(d.getMonth()+1).padStart(2,"0")}`;
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(e.value);
  });
  const labels = Object.keys(byDay);
  const data   = labels.map(k=>Math.round(byDay[k].reduce((a,b)=>a+b,0)/byDay[k].length));
  canvas.width = canvas.parentElement.offsetWidth - 24;

  new window.Chart(canvas, {
    type:"line",
    data:{labels,datasets:[{data,borderColor:"#4caf87",backgroundColor:"rgba(76,175,135,0.12)",tension:0.4,pointRadius:3,fill:true}]},
    options:{plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{font:{size:10},color:window.themeVar('--theme-chart-text')},grid:{color:window.themeVar('--theme-chart-grid')}},x:{ticks:{font:{size:9},maxRotation:45,color:window.themeVar('--theme-chart-text')},grid:{color:window.themeVar('--theme-chart-grid')}}}}
  });
}

function countActiveDays(history) {
  const days = new Set();
  history.forEach(e => { const d=new Date(e.time); days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`); });
  return days.size;
}

function formatDate(ts) {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const h   = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${mon} ${h}:${min}`;
}

function filterByDays(history, days) {
  if (days>3650) return history;
  const now = Date.now();
  const limit = days*24*60*60*1000;
  return history.filter(e => {
    const ts = resolveTimestamp(e);
    return ts !== null && (now - ts) <= limit;
  });
}
