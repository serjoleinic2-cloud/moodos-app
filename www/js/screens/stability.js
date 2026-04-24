import { getMoodHistory, getNotesHistory, getReflections } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";
import { t } from "../i18n.js";
import Chart from 'chart.js/auto';

window.Chart = Chart;

function getTodayEntries() {
  const history = getMoodHistory();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  
  return history.filter(e => e.time >= todayStart && e.time < todayEnd);
}

function getTodaySummary(todayHistory) {
  if (todayHistory.length === 0) {
    return null;
  }
  
  const avg = Math.round(todayHistory.reduce((sum, e) => sum + (e.value || 0), 0) / todayHistory.length);
  
  const best = todayHistory.reduce((best, e) => 
    (!best || (e.value || 0) > (best.value || 0)) ? e : best
  , null);
  
  const worst = todayHistory.reduce((worst, e) => 
    (!worst || (e.value || 0) < (worst.value || 0)) ? e : worst
  , null);
  
  return { avg, best, worst };
}

function formatEventLabel(events) {
  if (!events || events.length === 0) return '';
  const labels = events.map(e => {
    const key = 'event_' + e;
    return t(key) || e;
  });
  return labels.join(' + ');
}

function formatTimeBucketLabel(timeBucket) {
  if (!timeBucket) return '';
  const key = 'time_' + timeBucket;
  return t(key) || timeBucket;
}

function renderTodaySection(todaySummary) {
  if (!todaySummary) {
    return `<div class="mo-section-title" style="margin-top:16px;">${t("stab_today") || "Сегодня"}</div>
      <div class="mo-metric" style="text-align:center;padding:20px;color:#888;font-size:14px;">
        ${t("stab_today_no_data") || "Сегодня пока нет записей"}
      </div>`;
  }

  const { avg, best, worst } = todaySummary;

  function flipCard(id, frontHTML, backHTML, accentColor) {
    return `
      <div class="flip-wrap-stab" id="flip_${id}" style="margin-bottom:12px;">
        <div class="flip-inner-stab">
          <div class="flip-front-stab" style="border-left:3px solid ${accentColor};">
            ${frontHTML}
            <div style="font-size:9px;color:#ccc;text-align:right;margin-top:6px;" data-i18n="stab_tap_details">${t('stab_tap_details') || 'тап → подробнее'}</div>
          </div>
          <div class="flip-back-stab" style="border-left:3px solid ${accentColor};">
            ${backHTML}
            <div style="font-size:9px;color:#ccc;text-align:right;margin-top:8px;" data-i18n="stab_tap_back">${t('stab_tap_back') || 'тап → назад'}</div>
          </div>
        </div>
      </div>`;
  }

  // Best moment
  const bestLabel = best?.events?.length ? formatEventLabel(best.events) : '';
  const bestTime  = best?.timeBucket ? formatTimeBucketLabel(best.timeBucket) : '';
  const bestFront = `
    <div style="font-size:12px;color:#888;margin-bottom:4px;">${t("stab_today_best") || "Лучший момент"}</div>
    <div style="font-size:22px;font-weight:700;color:#4caf87;">${best?.value ?? '—'}%</div>`;
  const bestBack = `
    <div style="font-size:11px;color:#888;margin-bottom:6px;">${t("stab_today_best") || "Лучший момент"}</div>
    ${bestLabel ? `<div style="font-size:13px;color:#555;margin-bottom:4px;">📍 ${bestLabel}</div>` : ''}
    ${bestTime  ? `<div style="font-size:12px;color:#888;margin-bottom:4px;">🕐 ${bestTime}</div>` : ''}
    ${!bestLabel && !bestTime ? `<div style="font-size:12px;color:#bbb;">${t("stab_no_triggers") || 'Триггеры не указаны'}</div>` : ''}
    <div style="font-size:12px;color:#4caf87;font-weight:600;margin-top:4px;">${best?.value ?? '—'}% — ${t("stab_best_explain") || 'пиковое значение дня'}</div>`;

  // Worst moment
  const worstLabel = worst?.events?.length ? formatEventLabel(worst.events) : '';
  const worstTime  = worst?.timeBucket ? formatTimeBucketLabel(worst.timeBucket) : '';
  const worstFront = `
    <div style="font-size:12px;color:#888;margin-bottom:4px;">${t("stab_today_worst") || "Сложный момент"}</div>
    <div style="font-size:22px;font-weight:700;color:#e05555;">${worst?.value ?? '—'}%</div>`;
  const worstBack = `
    <div style="font-size:11px;color:#888;margin-bottom:6px;">${t("stab_today_worst") || "Сложный момент"}</div>
    ${worstLabel ? `<div style="font-size:13px;color:#555;margin-bottom:4px;">📍 ${worstLabel}</div>` : ''}
    ${worstTime  ? `<div style="font-size:12px;color:#888;margin-bottom:4px;">🕐 ${worstTime}</div>` : ''}
    ${!worstLabel && !worstTime ? `<div style="font-size:12px;color:#bbb;">${t("stab_no_triggers") || 'Триггеры не указаны'}</div>` : ''}
    <div style="font-size:12px;color:#e05555;font-weight:600;margin-top:4px;">${worst?.value ?? '—'}% — ${t("stab_worst_explain") || 'минимальное значение дня'}</div>`;

  return `
    <div class="mo-section-title" style="margin-top:16px;">${t("stab_today") || "Сегодня"}</div>
    <div class="mo-metric" style="margin-bottom:12px;">
      <div style="font-size:12px;color:#888;margin-bottom:4px;">${t("stab_today_avg") || "Среднее настроение"}</div>
      <div style="font-size:28px;font-weight:700;color:${avg >= 70 ? '#4caf87' : avg >= 40 ? '#f0a500' : '#e05555'}">${avg}%</div>
    </div>
    <style>
      .flip-wrap-stab { perspective:800px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
      .flip-inner-stab { position:relative; width:100%; transform-style:preserve-3d; transition:transform 0.45s ease; border-radius:16px; min-height:80px; }
      .flip-wrap-stab.flipped .flip-inner-stab { transform:rotateY(180deg); }
      .flip-front-stab, .flip-back-stab {
        backface-visibility:hidden; -webkit-backface-visibility:hidden;
        border-radius:16px; padding:14px 16px; box-sizing:border-box;
        background:rgba(232,237,230,0.9);
        box-shadow:5px 5px 12px #b8c4b4,-5px -5px 12px #ffffff;
      }
      .flip-front-stab { position:relative; width:100%; }
      .flip-back-stab  { position:absolute; top:0; left:0; width:100%; height:100%; transform:rotateY(180deg); }
    </style>
    ${best  ? flipCard('best',  bestFront,  bestBack,  '#4caf87') : ''}
    ${worst ? flipCard('worst', worstFront, worstBack, '#e05555') : ''}`;
}

let cachedStability = null;
let cachedHistoryHash = null;

function getStability() {
  const rawHistory = getMoodHistory();
  
  const seen = new Set();
  const history = rawHistory.filter(e => {
    const key = Math.floor(new Date(e.time).getTime() / 1000);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  
  const hash = history.length + '-' + (history.length > 0 ? history[history.length-1].time : 0);
  if (cachedStability !== null && cachedHistoryHash === hash) {
    return { stability: cachedStability, history, hash };
  }
  
  const stability = calculateStabilityScore(history);
  cachedStability = stability;
  cachedHistoryHash = hash;
  
  return { stability, history, hash };
}

export function onEnter() {
  const container = document.getElementById("stability-content");
  if (!container) return;

  const { stability, history } = getStability();

  if (!history || history.length < 2) {
    container.innerHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">🧘</div><div style="margin-top:12px;">${t("stab_no_data")}</div></div>`;
    return;
  }

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
      const day2 = String(d.getDate()).padStart(2,'0');
      const mon2 = String(d.getMonth()+1).padStart(2,'0');
      const h2   = String(d.getHours()).padStart(2,'0');
      const min2 = String(d.getMinutes()).padStart(2,'0');
      const ds   = `${day2}.${mon2} ${h2}:${min2}`;
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
    <div style="padding:4px 0 60px;">
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

      ${renderTodaySection(getTodaySummary(getTodayEntries()))}
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

  // Flip карточки лучший/сложный момент
  container.querySelectorAll('.flip-wrap-stab').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
  });
}
