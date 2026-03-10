import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";
import { t } from "../i18n.js";

let currentPeriod = 7;

export function onEnter() { renderReport(); }

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

function renderReport() {
  const container = document.getElementById("report-content");
  if (!container) return;

  const history = getMoodHistory();

  if (!history || history.length === 0) {
    container.innerHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">📊</div><div style="margin-top:12px;">${t("report_no_data")}</div></div>`;
    return;
  }

  const filtered = filterByDays(history, currentPeriod);

  const periodBtns = `
    <div style="display:flex;gap:10px;margin-bottom:20px;">
      ${[7,30,99999].map(d=>`<button class="mo-btn period-btn ${currentPeriod===d?'active-period':''}" data-days="${d}" style="flex:1;">${d>3650?t("report_all_time"):d+" "+t("report_days")}</button>`).join('')}
    </div>`;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:4px 0 100px;">${periodBtns}
      <div style="text-align:center;margin-top:40px;color:#888;"><div style="font-size:48px;">📭</div><div style="margin-top:12px;">${t("report_no_period")}</div></div></div>`;
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

  container.innerHTML = `
    <div style="padding:4px 0 100px;">
      <div style="font-size:13px;color:#888;margin-bottom:16px;">${t("report_period_label")} ${periodLabel}</div>

      ${periodBtns}

      <div class="mo-section-title">${t("report_summary")}</div>
      <div class="mo-grid-2">
        ${metricCard(t("report_avg"), `<span style="color:${mc(average)}">${average}%</span>`, t("report_per_period"), "avg")}
        ${metricCard(t("report_stab"), `<span style="color:${sc(stability)}">${stability??'—'}%</span>`, t("report_index"), "stab")}
        ${metricCard(t("report_entries"), `<span style="color:#4db8ff">${filtered.length}</span>`, t("report_total"), "entries")}
        ${metricCard(t("report_active_days"), `<span style="color:#9f7aea">${activeDays}</span>`, t("report_with_entries"), "days")}
      </div>

      <div class="mo-section-title" style="margin-top:16px;">${t("report_dynamics")}</div>
      <div class="mo-metric" style="padding:12px;margin-bottom:16px;">
        <canvas id="reportChart" height="130"></canvas>
      </div>

      <div class="mo-section-title">${t("report_moments")}</div>
      <div class="mo-grid-2">
        ${metricCard(t("report_best"),  `<span style="color:#4caf87">${best.value}%</span>`,  formatDate(best.time),  "best")}
        ${metricCard(t("report_worst"), `<span style="color:#e05555">${worst.value}%</span>`, formatDate(worst.time), "worst")}
      </div>

      <div class="mo-section-title" style="margin-top:16px;">${t("report_conclusion")}</div>
      <div class="mo-metric">
        <div style="font-size:15px;color:#444;line-height:1.6;">${stateText}</div>
      </div>
    </div>`;

  bindPeriodBtns(container);
  bindTooltips(container);
  requestAnimationFrame(() => drawChart(filtered));
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
    btn.onclick = () => { currentPeriod = Number(btn.dataset.days); renderReport(); };
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
  if (!canvas || !window.Chart) return;
  const ex = window.Chart.getChart(canvas);
  if (ex) ex.destroy();

  const byDay = {};
  filtered.forEach(e => {
    const d = new Date(e.time);
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
    options:{plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{font:{size:10}}},x:{ticks:{font:{size:9},maxRotation:45}}}}
  });
}

function countActiveDays(history) {
  const days = new Set();
  history.forEach(e => { const d=new Date(e.time); days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`); });
  return days.size;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
}

function filterByDays(history, days) {
  if (days>3650) return history;
  const now = Date.now();
  const limit = days*24*60*60*1000;
  return history.filter(e => now - new Date(e.time).getTime() <= limit);
}