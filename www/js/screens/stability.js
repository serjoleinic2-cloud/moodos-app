import { getMoodHistory, getNotesHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";
import { t } from "../i18n.js";

export function onEnter() {
  const container = document.getElementById("stability-content");
  if (!container) return;

  const rawHistory = getMoodHistory();

  if (!rawHistory || rawHistory.length < 2) {
    container.innerHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">🧘</div><div style="margin-top:12px;">${t("stab_no_data")}</div></div>`;
    return;
  }

  const seen = new Set();
  const history = rawHistory.filter(e => {
    const key = Math.floor(new Date(e.time).getTime() / 1000);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  const stability  = calculateStabilityScore(history);
  const volatility = 100 - stability;

  const now14  = Date.now();
  const hist14 = history.filter(e => now14 - new Date(e.time).getTime() <= 14*24*60*60*1000);
  const avg14  = hist14.length ? Math.round(hist14.reduce((s,h)=>s+h.value,0)/hist14.length) : null;

  function calcTrend(h) {
    if (h.length < 4) return t("stab_trend_stable");
    const half=Math.floor(h.length/2);
    const recent=h.slice(-half).reduce((s,x)=>s+x.value,0)/half;
    const prev=h.slice(0,half).reduce((s,x)=>s+x.value,0)/half;
    const diff=recent-prev;
    if (diff>5) return t("stab_trend_up");
    if (diff<-5) return t("stab_trend_down");
    return t("stab_trend_stable");
  }

  const trendText  = calcTrend(history);
  const trendColor = trendText.includes("📈")?"#4caf87":trendText.includes("📉")?"#e05555":"#888";

  function sc(s){ return s>=75?"#4caf87":s>=50?"#f0a500":"#e05555"; }
  function mc(v){ return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"; }

  let levelText = t("stab_level_mid");
  if (stability>=85)     levelText = t("stab_level_perfect");
  else if (stability>=65) levelText = t("stab_level_good");
  else if (stability>=45) levelText = t("stab_level_mid");
  else                    levelText = t("stab_level_low");

  const last10 = history.slice(-10).reverse();
  const notes  = getNotesHistory ? getNotesHistory() : [];

  const TOOLTIPS = {
    stab:  t("stab_tip_stab"),
    vol:   t("stab_tip_vol"),
    avg14: t("stab_tip_avg14"),
    trend: t("stab_tip_trend"),
  };

  function infoBtn(key) {
    return `<div class="mo-info-btn" data-tip="${key}">i</div><div class="mo-tooltip">${TOOLTIPS[key]||''}</div>`;
  }

  function entryCards(entries) {
    return entries.map((e, idx) => {
      const d   = new Date(e.time);
      const ds  = d.toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
      const col = mc(e.value);
      const emoji = e.value>=70?"😊":e.value>=40?"😐":"😔";
      let stateText = t("stab_state_low");
      if (e.value>=70)      stateText = t("stab_state_good");
      else if (e.value>=40) stateText = t("stab_state_neutral");
      const nearNote = notes.find(n => Math.abs((n.timestamp||new Date(n.time).getTime()) - e.time) < 30*60*1000);
      const noteText = nearNote ? (nearNote.text||nearNote.note||"") : "";
      return `
        <div class="stab-entry">
          <div class="stab-entry-header" data-idx="${idx}">
            <div style="width:40px;height:40px;border-radius:12px;flex-shrink:0;background:${col}22;display:flex;align-items:center;justify-content:center;font-size:18px;">${emoji}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;color:#999;margin-bottom:3px;">${ds}</div>
              <div style="font-size:12px;color:#777;margin-bottom:6px;">${stateText}</div>
              <div style="height:5px;border-radius:3px;background:#d0d9cc;overflow:hidden;">
                <div style="height:100%;width:${e.value}%;background:${col};border-radius:3px;"></div>
              </div>
            </div>
            <div style="font-size:17px;font-weight:700;color:${col};flex-shrink:0;margin-left:8px;">${e.value}%</div>
            <div class="stab-chevron" data-idx="${idx}" style="font-size:16px;color:#bbb;margin-left:6px;transition:transform 0.2s;">›</div>
          </div>
          <div class="stab-entry-detail" data-idx="${idx}" style="display:none;padding:0 14px 12px;">
            <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.4);box-shadow:inset 3px 3px 6px #c4c9c2,inset -3px -3px 6px #ffffff;font-size:14px;color:#555;line-height:1.6;">
              ${noteText
                ? `<div style="font-size:11px;color:#aaa;margin-bottom:5px;">${t("stab_note_label")}</div>${noteText}`
                : `<span style="color:#bbb;font-style:italic;">${t("stab_no_note")}</span>`}
            </div>
          </div>
        </div>`;
    }).join("");
  }

  container.innerHTML = `
    <div style="padding:4px 0 100px;">
      <div style="font-size:13px;color:#888;margin-bottom:16px;">${t("stab_screen_sub")}</div>

      <div class="mo-section-title">${t("stab_metrics")}</div>
      <div class="mo-grid-2">
        <div class="mo-metric">${infoBtn("stab")}<div class="mo-metric-label">${t("stab_metric_stab")}</div><div class="mo-metric-value" style="color:${sc(stability)}">${stability}%</div><div class="mo-metric-sub">${levelText}</div></div>
        <div class="mo-metric">${infoBtn("vol")}<div class="mo-metric-label">${t("stab_metric_vol")}</div><div class="mo-metric-value" style="color:${sc(100-volatility)}">${volatility}%</div><div class="mo-metric-sub">${t("stab_metric_vol_sub")}</div></div>
        <div class="mo-metric">${infoBtn("avg14")}<div class="mo-metric-label">${t("stab_metric_avg14")}</div><div class="mo-metric-value" style="color:${avg14?mc(avg14):'#888'}">${avg14!==null?avg14+'%':'—'}</div><div class="mo-metric-sub">${hist14.length} ${t("stab_entries_count")}</div></div>
        <div class="mo-metric">${infoBtn("trend")}<div class="mo-metric-label">${t("stab_metric_trend")}</div><div class="mo-metric-value" style="font-size:16px;color:${trendColor}">${trendText}</div><div class="mo-metric-sub">${t("stab_metric_trend_sub")}</div></div>
      </div>

      <div class="mo-section-title" style="margin-top:16px;">${t("stab_dynamics")}</div>
      <div class="mo-metric" style="padding:12px;margin-bottom:16px;">
        <canvas id="stabilityChart14" height="120"></canvas>
      </div>

      <div class="mo-section-title">${t("stab_last")}</div>
      ${entryCards(last10)}
    </div>`;

  container.querySelectorAll(".mo-info-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const wasOpen = btn.classList.contains("open");
      container.querySelectorAll(".mo-info-btn").forEach(b=>b.classList.remove("open"));
      if (!wasOpen) btn.classList.add("open");
    });
  });

  container.querySelectorAll(".stab-entry-header").forEach(h => {
    h.addEventListener("click", () => {
      const idx    = h.dataset.idx;
      const detail = container.querySelector(`.stab-entry-detail[data-idx="${idx}"]`);
      const chev   = container.querySelector(`.stab-chevron[data-idx="${idx}"]`);
      if (!detail) return;
      const open = detail.style.display === "block";
      detail.style.display = open ? "none" : "block";
      if (chev) chev.style.transform = open ? "rotate(0)" : "rotate(90deg)";
    });
  });

  requestAnimationFrame(() => {
    const canvas = document.getElementById("stabilityChart14");
    if (!canvas || !window.Chart) return;
    const ex = window.Chart.getChart(canvas);
    if (ex) ex.destroy();
    const sorted = hist14.slice().sort((a,b)=>a.time-b.time);
    canvas.width = canvas.parentElement.offsetWidth - 24;
    new window.Chart(canvas, {
      type:"line",
      data:{labels:sorted.map(e=>{const d=new Date(e.time);return `${d.getDate()}.${d.getMonth()+1}`;}),datasets:[{data:sorted.map(e=>e.value),borderColor:"#4caf87",backgroundColor:"rgba(76,175,135,0.12)",tension:0.4,pointRadius:3,fill:true}]},
      options:{plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{font:{size:10}}},x:{ticks:{font:{size:9},maxRotation:45}}}}
    });
  });
}
