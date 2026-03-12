import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore, calculateTrend, calculateGoldenHour } from "../services/analytics.js";
import { getEffectivenessRate, getAverageMoodLift, getEffectivenessByState, getFullSessionStats, getPersonalRecommendation } from "../services/session-analytics.js";
import { detectMoodState, getStateLabel } from "../services/state-engine.js";
import { getMood } from "../state.js";
import { t } from "../i18n.js";

const STATE_RU = {
  "Low mood":"LOW","Stressed":"STRESSED","Neutral":"NEUTRAL","Good":"GOOD","Very good":"HIGH","Unknown":"—"
};

const PRACTICES = [
  { key: "breathing",    icon: "🫁", labelKey: "breathing_lbl" },
  { key: "meditation",   icon: "🧘", labelKey: "meditation_lbl" },
  { key: "visual-focus", icon: "👁", labelKey: "tools_visual" },
  { key: "mind-dump",    icon: "🧠", labelKey: "tools_mind" },
  { key: "tap-calm",     icon: "✋", labelKey: "tools_tap" },
];

function trendLabel(tr) {
  if (!tr || tr.includes("изучаю")) return t("trend_no_data");
  if (tr.includes("improving")) return t("trend_up");
  if (tr.includes("declining")) return t("trend_down");
  return t("trend_stable");
}
function trendExplain(tr) {
  if (!tr || tr.includes("изучаю")) return t("trend_exp_no_data");
  if (tr.includes("improving")) return t("trend_exp_up");
  if (tr.includes("declining")) return t("trend_exp_down");
  return t("trend_exp_stable");
}
function sColor(s) { if (!s) return "#888"; return s>=75?"#4caf87":s>=50?"#f0a500":"#e05555"; }
function sText(s) {
  if (!s) return t("no_data_short");
  if (s>=85) return t("stab_high"); if (s>=65) return t("stab_mid");
  if (s>=45) return t("stab_low"); return t("stab_none");
}
function mColor(v) { return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"; }
function mText(v) {
  if (v>=70) return t("mood_strong");
  if (v>=40) return t("mood_stable");
  return t("mood_attention");
}
function rColor(r) { if (!r) return "#888"; return r>=70?"#4caf87":r>=40?"#f0a500":"#e05555"; }
function goldenShort(g) {
  if (!g) return "—";
  const m = g.match(/\d{2}:\d{2}[–\-]\d{2}:\d{2}/);
  return m ? m[0] : g;
}
function buildDailyMood(history) {
  const byDay = {};
  history.forEach(e => {
    const d = new Date(e.time);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e.value);
  });
  return Object.keys(byDay).sort().map(date => ({
    date, avg: Math.round(byDay[date].reduce((a,b)=>a+b,0)/byDay[date].length)
  }));
}

function practiceShortLabel(key) {
  const map = {
    "breathing":    t("tools_breathing"),
    "meditation":   t("tools_meditation"),
    "visual-focus": t("tools_visual"),
    "mind-dump":    t("tools_mind"),
    "tap-calm":     t("tools_tap"),
  };
  return (map[key] || key).replace(/^[^\s]+\s/, "");
}

// ============================================================
// Эмоциональная память
// ============================================================
function pluralMonths(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "месяц";
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return "месяца";
  return "месяцев";
}
function pluralDays(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "день";
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return "дня";
  return "дней";
}
function findEmotionalMemory(history, currentMood) {
  if (!history || history.length < 10) return null;
  const sorted = history.slice().sort((a, b) => new Date(a.time) - new Date(b.time));
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const lowPeriods = [];
  let inLow = false, periodStart = null;
  sorted.forEach(e => {
    const ts = new Date(e.time).getTime();
    if (ts >= weekAgo) return;
    if (e.value <= 40 && !inLow) { inLow = true; periodStart = ts; }
    if (e.value > 40 && inLow) {
      inLow = false;
      const daysToRecover = Math.round((ts - periodStart) / (24 * 60 * 60 * 1000));
      if (daysToRecover >= 1) lowPeriods.push({ start: periodStart, end: ts, days: daysToRecover });
    }
  });
  if (!lowPeriods.length) return null;
  const best = lowPeriods[lowPeriods.length - 1];
  const monthsAgo = Math.round((now - best.start) / (30 * 24 * 60 * 60 * 1000));
  const weeksAgo  = Math.round((now - best.start) / (7  * 24 * 60 * 60 * 1000));
  let timeAgo;
  if (monthsAgo >= 2) timeAgo = monthsAgo + " " + pluralMonths(monthsAgo) + " назад";
  else if (weeksAgo >= 2) timeAgo = weeksAgo + " недели назад";
  else timeAgo = "неделю назад";
  return { timeAgo, daysToRecover: best.days };
}

export function onEnter() {
  const container = document.getElementById("insight-content");
  if (!container) return;

  const history = getMoodHistory();
  const mood    = getMood();
  const state   = detectMoodState(mood);
  const stats   = getFullSessionStats();

  if (!history || history.length === 0) {
    container.innerHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">📊</div><div style="margin-top:12px;">${t("no_data_insight")}</div></div>`;
    return;
  }

  const stability  = calculateStabilityScore(history);
  const trend      = calculateTrend(history);
  const golden     = calculateGoldenHour(history);
  const avgMood    = Math.round(history.reduce((s,h)=>s+h.value,0)/history.length);
  const recommendation = getPersonalRecommendation(state);

  const practiceData = {};
  PRACTICES.forEach(p => {
    practiceData[p.key] = {
      rate:    getEffectivenessRate(p.key),
      lift:    getAverageMoodLift(p.key),
      byState: getEffectivenessByState(p.key),
      sessions: 0,
    };
  });
  if (stats) {
    practiceData["breathing"].sessions    = stats.breathingSessions    || 0;
    practiceData["meditation"].sessions   = stats.meditationSessions   || 0;
    practiceData["visual-focus"].sessions = stats.visualFocusSessions  || 0;
    practiceData["mind-dump"].sessions    = stats.mindDumpSessions     || 0;
    practiceData["tap-calm"].sessions     = stats.tapCalmSessions      || 0;
  }

  const activePractices = PRACTICES.filter(p => practiceData[p.key].rate !== null);
  const stateCode = STATE_RU[getStateLabel(state)] || state;
  const stateLabelTr = t("state_" + stateCode.toLowerCase()) || getStateLabel(state);

  // --- Эмоциональная память (только если настроение ≤ 40%) ---
  let memoryBlockHTML = "";
  if (mood <= 40) {
    const memory = findEmotionalMemory(history, mood);
    if (memory) {
      memoryBlockHTML = `
      <div class="insight-section" id="emotional-memory-block">
        <div class="insight-section-title">🧠 Эмоциональная память</div>
        <div style="padding:18px;border-radius:18px;background:rgba(159,122,234,0.12);box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;">
          <div style="font-size:15px;color:#444;line-height:1.7;">
            Вы уже переживали подобное состояние <strong style="color:#9f7aea;">${memory.timeAgo}</strong>.<br>
            Через <strong style="color:#4caf87;">${memory.daysToRecover} ${pluralDays(memory.daysToRecover)}</strong> состояние улучшилось.
          </div>
          <div style="margin-top:12px;font-size:13px;color:#9f7aea;line-height:1.5;">
            💜 Это временно. Вы уже справлялись с этим раньше.
          </div>
        </div>
      </div>`;
    }
  }

  container.innerHTML = `
    <style>
      .insight-section { margin-bottom: 24px; }
      .insight-section-title { font-size:13px; color:#888; font-weight:600; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px; }
      .flip-wrap { perspective:1000px; margin-bottom:12px; cursor:pointer; }
      .flip-inner { position:relative; width:100%; transform-style:preserve-3d; transition:transform 0.5s ease; border-radius:18px; }
      .flip-wrap.flipped .flip-inner { transform:rotateY(180deg); }
      .flip-front, .flip-back { backface-visibility:hidden; -webkit-backface-visibility:hidden; border-radius:18px; padding:16px; box-sizing:border-box; background:rgba(232,237,230,0.9); box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff; }
      .flip-front { position:relative; }
      .flip-back { position:absolute; top:0; left:0; width:100%; height:100%; transform:rotateY(180deg); display:flex; align-items:center; justify-content:center; flex-direction:column; }
      .flip-label { font-size:12px; color:#999; margin-bottom:4px; }
      .flip-value { font-size:28px; font-weight:700; color:#3a3530; }
      .flip-sub   { font-size:13px; color:#777; margin-top:4px; }
      .flip-hint  { font-size:11px; color:#4caf87; font-weight:600; text-align:right; margin-top:8px; }
      .rec-card { padding:16px; border-radius:18px; background:rgba(232,237,230,0.9); box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff; margin-bottom:12px; }
      .state-row { display:flex; align-items:center; gap:6px; padding:10px 12px; border-radius:12px; background:rgba(232,237,230,0.9); box-shadow:3px 3px 7px #b8c4b4,-3px -3px 7px #ffffff; margin-bottom:8px; font-size:13px; color:#555; }
      .state-cell { flex:1; text-align:center; font-weight:600; font-size:13px; }
      .state-name { flex:2; font-size:13px; }
      .state-header { display:flex; align-items:center; gap:6px; padding:0 12px 6px; font-size:11px; color:#aaa; }
      .state-header-name { flex:2; }
      .state-header-cell { flex:1; text-align:center; }
    </style>

    <div style="padding:4px 0 100px 0;">
      <h2 style="margin-bottom:6px;">${t("insight_title")}</h2>
      <div style="font-size:13px;color:#888;margin-bottom:20px;">${t("current_state")}: <strong style="color:#3a3530;">${stateLabelTr}</strong></div>

      ${memoryBlockHTML}

      <div class="insight-section">
        <div class="insight-section-title">${t("personal_rec")}</div>
        <div class="rec-card"><div style="font-size:15px;color:#444;line-height:1.5;">${recommendation}</div></div>
      </div>

      <div class="insight-section">
        <div class="insight-section-title">${t("key_metrics")}</div>

        <div class="flip-wrap" id="flip-stability">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">${t("stability_lbl")}</div>
              <div class="flip-value" style="color:${sColor(stability)}">${stability??'—'}%</div>
              <div class="flip-sub">${sText(stability)}</div>
              <div class="flip-hint">${t("tap_for_details")}</div>
            </div>
            <div class="flip-back"><canvas id="chartStability" style="width:100%;height:160px;"></canvas></div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-mood">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">${t("avg_mood_lbl")}</div>
              <div class="flip-value" style="color:${mColor(avgMood)}">${avgMood}%</div>
              <div class="flip-sub">${mText(avgMood)}</div>
              <div class="flip-hint">${t("tap_for_details")}</div>
            </div>
            <div class="flip-back"><canvas id="chartMood" style="width:100%;height:160px;"></canvas></div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-trend">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">${t("trend_lbl")}</div>
              <div class="flip-value" style="font-size:20px;color:#3a3530;">${trendLabel(trend)}</div>
              <div class="flip-sub">${t("trend_sub")}</div>
              <div class="flip-hint">${t("tap_for_details")}</div>
            </div>
            <div class="flip-back" style="padding:20px;">
              <div style="font-size:15px;color:#555;text-align:center;line-height:1.6;">${trendExplain(trend)}</div>
            </div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-golden">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">${t("golden_lbl")}</div>
              <div class="flip-value" style="font-size:18px;">⭐ ${goldenShort(golden)}</div>
              <div class="flip-sub">${t("golden_sub")}</div>
              <div class="flip-hint">${t("tap_for_details")}</div>
            </div>
            <div class="flip-back"><canvas id="chartHours" style="width:100%;height:160px;"></canvas></div>
          </div>
        </div>
      </div>

      ${activePractices.length > 0 ? `
      <div class="insight-section">
        <div class="insight-section-title">${t("practices_eff")}</div>
        ${activePractices.map(p => {
          const d = practiceData[p.key];
          return `
          <div class="flip-wrap" id="flip-${p.key}">
            <div class="flip-inner">
              <div class="flip-front">
                <div class="flip-label">${p.icon} ${practiceShortLabel(p.key)}</div>
                <div class="flip-value" style="color:${rColor(d.rate)}">${d.rate??'—'}%</div>
                <div class="flip-sub">${d.lift!==null?`${t("avg_lift")}: +${d.lift} пт`:t("no_data_short")} · ${d.sessions} ${t("sessions_count")}</div>
                <div class="flip-hint">${t("tap_for_details")}</div>
              </div>
              <div class="flip-back"><canvas id="chart-${p.key}" width="150" height="150"></canvas></div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="insight-section">
        <div class="insight-section-title">${t("state_helps")}</div>
        ${buildStateTable(activePractices, practiceData)}
      </div>
      ` : `
      <div class="insight-section">
        <div class="rec-card" style="text-align:center;color:#888;">${t("no_sessions")}</div>
      </div>`}
    </div>`;

  document.querySelectorAll(".flip-wrap").forEach(wrap => {
    wrap.addEventListener("click", () => {
      const wasFlipped = wrap.classList.contains("flipped");
      document.querySelectorAll(".flip-wrap").forEach(w => w.classList.remove("flipped"));
      if (!wasFlipped) {
        wrap.classList.add("flipped");
        const front = wrap.querySelector(".flip-front");
        const inner = wrap.querySelector(".flip-inner");
        if (front && inner) inner.style.minHeight = front.offsetHeight + "px";
        setTimeout(() => initChartFor(wrap.id, history, stats, practiceData), 320);
      }
    });
  });
}

function destroyChart(id) {
  const c = document.getElementById(id);
  if (c && window.Chart) { const ex = window.Chart.getChart(c); if (ex) ex.destroy(); }
}

function initChartFor(id, history, stats, practiceData) {
  const Chart = window.Chart;
  if (!Chart) return;
  const lineOpts = {
    plugins: { legend: { display: false } },
    scales: { y:{min:0,max:100,ticks:{font:{size:10}}}, x:{ticks:{font:{size:9},maxRotation:45}} }
  };

  if (id === "flip-stability") {
    destroyChart("chartStability");
    const c = document.getElementById("chartStability"); if (!c) return;
    c.width = c.parentElement.offsetWidth - 16;
    const pts = [];
    for (let i=4; i<history.length; i++) {
      const sl=history.slice(i-4,i+1), avg=sl.reduce((s,h)=>s+h.value,0)/sl.length;
      const v=sl.reduce((s,h)=>s+Math.pow(h.value-avg,2),0)/sl.length;
      const st=Math.round(Math.max(5,Math.min(100,100-Math.sqrt(v))));
      const d=new Date(history[i].time);
      pts.push({label:`${d.getDate()}.${d.getMonth()+1}`,value:st});
    }
    new Chart(c,{type:"line",data:{labels:pts.map(p=>p.label),datasets:[{data:pts.map(p=>p.value),borderColor:"#4caf87",backgroundColor:"rgba(76,175,135,0.12)",tension:0.4,pointRadius:3,fill:true}]},options:lineOpts});
  }
  if (id === "flip-mood") {
    destroyChart("chartMood");
    const c = document.getElementById("chartMood"); if (!c) return;
    c.width = c.parentElement.offsetWidth - 16;
    const daily = buildDailyMood(history);
    new Chart(c,{type:"line",data:{labels:daily.map(d=>d.date.slice(5)),datasets:[{data:daily.map(d=>d.avg),borderColor:"#4db8ff",backgroundColor:"rgba(77,184,255,0.12)",tension:0.4,pointRadius:3,fill:true}]},options:lineOpts});
  }
  if (id === "flip-golden") {
    destroyChart("chartHours");
    const c = document.getElementById("chartHours"); if (!c) return;
    c.width = c.parentElement.offsetWidth - 16;
    const hours={};
    history.forEach(e=>{const h=new Date(e.time).getHours();if(!hours[h])hours[h]={total:0,count:0};hours[h].total+=e.value;hours[h].count++;});
    const labels=Object.keys(hours).sort((a,b)=>a-b);
    const data=labels.map(h=>Math.round(hours[h].total/hours[h].count));
    new Chart(c,{type:"bar",data:{labels:labels.map(h=>`${h}:00`),datasets:[{data,backgroundColor:data.map(v=>v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"),borderRadius:6}]},options:lineOpts});
  }

  const practiceKey = id.replace("flip-", "");
  if (practiceData[practiceKey]) {
    const canvasId = `chart-${practiceKey}`;
    destroyChart(canvasId);
    const rate = practiceData[practiceKey].rate ?? 0;
    const colors = {
      "breathing":    "#4db8ff",
      "meditation":   "#9f7aea",
      "visual-focus": "#4caf87",
      "mind-dump":    "#f0a500",
      "tap-calm":     "#e05555",
    };
    drawPieChart(canvasId, rate, colors[practiceKey] || "#4caf87");
  }
}

function drawPieChart(canvasId, rate, color) {
  const c = document.getElementById(canvasId); if (!c||!window.Chart) return;
  new window.Chart(c, {
    type:"doughnut",
    data:{datasets:[{data:[rate,100-rate],backgroundColor:[color,"#d0d5de"],borderWidth:0}]},
    options:{cutout:"70%",plugins:{legend:{display:false},tooltip:{enabled:false}}},
    plugins:[{id:"ct",afterDraw(chart){
      const {ctx,chartArea:{width,height,left,top}}=chart;
      ctx.save(); ctx.font="bold 20px sans-serif"; ctx.fillStyle="#3a3530";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`${rate??0}%`,left+width/2,top+height/2); ctx.restore();
    }}]
  });
}

function buildStateTable(activePractices, practiceData) {
  const states = ["LOW","STRESSED","NEUTRAL","GOOD","HIGH"];
  const activeStates = states.filter(state =>
    activePractices.some(p => practiceData[p.key].byState[state])
  );
  if (!activeStates.length) {
    return `<div style="color:#888;font-size:14px;">${t("no_state_data")}</div>`;
  }
  const groups = [];
  for (let i = 0; i < activePractices.length; i += 3) {
    groups.push(activePractices.slice(i, i + 3));
  }
  return groups.map(group => `
    <div style="margin-bottom:16px;overflow-x:auto;">
      <div class="state-header">
        <div class="state-header-name">${t("state_col")}</div>
        ${group.map(p => `<div class="state-header-cell">${p.icon}</div>`).join('')}
      </div>
      ${activeStates.map(state => `
        <div class="state-row">
          <div class="state-name">${t("state_"+state.toLowerCase())}</div>
          ${group.map(p => {
            const d = practiceData[p.key].byState[state];
            return `<div class="state-cell" style="color:${rColor(d?.rate)}">${d ? d.rate+"%" : "—"}</div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
  `).join('');
}