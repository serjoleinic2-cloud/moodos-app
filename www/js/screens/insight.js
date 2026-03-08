// ===============================
// MoodOS Insight Screen
// ===============================
import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore, calculateTrend, calculateGoldenHour } from "../services/analytics.js";
import { getEffectivenessRate, getAverageMoodLift, getEffectivenessByState, getFullSessionStats, getPersonalRecommendation } from "../services/session-analytics.js";
import { detectMoodState, getStateLabel } from "../services/state-engine.js";
import { getMood } from "../state.js";

// Переводы
const STATE_LABELS = { "Low mood":"Сниженное", "Stressed":"Напряжённое", "Neutral":"Нейтральное", "Good":"Хорошее", "Very good":"Отличное", "Unknown":"—" };
function ru(label) { return STATE_LABELS[label] || label; }

function trendRu(t) {
  if (!t) return "—";
  if (t.includes("improving") || t.includes("📈")) return "📈 Улучшается";
  if (t.includes("declining") || t.includes("📉")) return "📉 Снижается";
  return "➡️ Стабильно";
}
function trendExplain(t) {
  if (!t) return "Недостаточно данных.";
  if (t.includes("improving")) return "Последние записи лучше предыдущих. Ты на подъёме!";
  if (t.includes("declining")) return "Последние записи ниже. Стоит уделить внимание отдыху и практикам.";
  return "Состояние стабильно без резких изменений.";
}
function sColor(s) { if (!s) return "#888"; return s>=75?"#4caf87":s>=50?"#f0a500":"#e05555"; }
function mColor(v) { return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"; }
function rColor(r) { if (!r) return "#888"; return r>=70?"#4caf87":r>=40?"#f0a500":"#e05555"; }
function sText(s) {
  if (!s) return "Нет данных";
  if (s>=85) return "Высокая стабильность";
  if (s>=65) return "Умеренная стабильность";
  if (s>=45) return "Заметные перепады";
  return "Высокая волатильность";
}
function mText(v) {
  if (v>=70) return "Эмоциональное состояние сильное";
  if (v>=40) return "Относительно стабильное";
  return "Требует внимания";
}
function goldenShort(g) {
  if (!g) return "—";
  const m = g.match(/\d{2}:\d{2}[–-]\d{2}:\d{2}/);
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

export function onEnter() {
  const container = document.getElementById("insight-content");
  if (!container) return;

  const history = getMoodHistory();
  const mood    = getMood();
  const state   = detectMoodState(mood);
  const stats   = getFullSessionStats();

  if (!history || history.length === 0) {
    container.innerHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">📊</div><div style="margin-top:12px;">Начни отслеживать настроение — здесь появится аналитика.</div></div>`;
    return;
  }

  const stability  = calculateStabilityScore(history);
  const trend      = calculateTrend(history);
  const golden     = calculateGoldenHour(history);
  const avgMood    = Math.round(history.reduce((s,h)=>s+h.value,0)/history.length);
  const recommendation = getPersonalRecommendation(state);
  const bRate = getEffectivenessRate("breathing");
  const mRate = getEffectivenessRate("meditation");
  const bLift = getAverageMoodLift("breathing");
  const mLift = getAverageMoodLift("meditation");
  const bByState = getEffectivenessByState("breathing");
  const mByState = getEffectivenessByState("meditation");

  // Строим flip-карточку: front + back с min-height
  function flipCard(id, front, backContent) {
    return `
      <div class="flip-wrap" id="${id}">
        <div class="flip-inner">
          <div class="flip-front">${front}</div>
          <div class="flip-back">${backContent}</div>
        </div>
      </div>`;
  }

  const cardStability = flipCard("flip-stability",
    `<div class="flip-label">Стабильность</div>
     <div class="flip-value" style="color:${sColor(stability)}">${stability??'—'}%</div>
     <div class="flip-sub">${sText(stability)}</div>
     <div class="flip-hint">Нажми для графика ↩</div>`,
    `<div style="width:100%;padding:8px 0;"><canvas id="chartStability" style="width:100%;height:180px;"></canvas></div>`
  );

  const cardMood = flipCard("flip-mood",
    `<div class="flip-label">Среднее настроение</div>
     <div class="flip-value" style="color:${mColor(avgMood)}">${avgMood}%</div>
     <div class="flip-sub">${mText(avgMood)}</div>
     <div class="flip-hint">Нажми для графика ↩</div>`,
    `<div style="width:100%;padding:8px 0;"><canvas id="chartMood" style="width:100%;height:180px;"></canvas></div>`
  );

  const cardTrend = flipCard("flip-trend",
    `<div class="flip-label">Тренд</div>
     <div class="flip-value" style="font-size:18px;color:#3a3530;">${trendRu(trend)}</div>
     <div class="flip-sub">Последние записи vs предыдущие</div>
     <div class="flip-hint">Нажми для деталей ↩</div>`,
    `<div style="font-size:15px;color:#555;text-align:center;line-height:1.6;padding:8px;">${trendExplain(trend)}</div>`
  );

  const cardGolden = flipCard("flip-golden",
    `<div class="flip-label">Золотые часы</div>
     <div class="flip-value" style="font-size:18px;">⭐ ${goldenShort(golden)}</div>
     <div class="flip-sub">Твой пик активности</div>
     <div class="flip-hint">Нажми для графика ↩</div>`,
    `<div style="width:100%;padding:8px 0;"><canvas id="chartHours" style="width:100%;height:180px;"></canvas></div>`
  );

  const practicesHTML = stats ? `
    <div class="mo-section-title">🫁 Эффективность практик</div>
    ${flipCard("flip-breathing",
      `<div class="flip-label">Дыхание</div>
       <div class="flip-value" style="color:${rColor(bRate)}">${bRate??'—'}%</div>
       <div class="flip-sub">${bLift!==null?`Средний подъём: +${bLift} пт`:'Нет данных'} · ${stats.breathingSessions} сессий</div>
       <div class="flip-hint">Нажми для деталей ↩</div>`,
      `<div style="display:flex;align-items:center;justify-content:center;padding:16px;"><canvas id="chartBreathing" width="150" height="150"></canvas></div>`
    )}
    ${flipCard("flip-meditation",
      `<div class="flip-label">Медитация</div>
       <div class="flip-value" style="color:${rColor(mRate)}">${mRate??'—'}%</div>
       <div class="flip-sub">${mLift!==null?`Средний подъём: +${mLift} пт`:'Нет данных'} · ${stats.meditationSessions} сессий</div>
       <div class="flip-hint">Нажми для деталей ↩</div>`,
      `<div style="display:flex;align-items:center;justify-content:center;padding:16px;"><canvas id="chartMeditation" width="150" height="150"></canvas></div>`
    )}
    <div class="mo-section-title">🧠 При каком состоянии что помогает</div>
    ${buildStateTable(bByState, mByState)}
  ` : `
    <div class="mo-metric" style="text-align:center;color:#888;margin-top:4px;">
      Пройди несколько сессий — здесь появится аналитика эффективности.
    </div>`;

  container.innerHTML = `
    <div style="padding:4px 0 100px 0;">
      <div style="font-size:13px;color:#888;margin-bottom:20px;">
        Текущее состояние: <strong style="color:#3a3530;">${ru(getStateLabel(state))}</strong>
      </div>

      <div class="mo-section-title">💡 Личная рекомендация</div>
      <div class="mo-metric" style="margin-bottom:16px;">
        <div style="font-size:15px;color:#444;line-height:1.5;">${recommendation}</div>
      </div>

      <div class="mo-section-title">📈 Основные метрики</div>
      ${cardStability}${cardMood}${cardTrend}${cardGolden}

      ${practicesHTML}
    </div>`;

  // FLIP логика — закрываем предыдущую перед открытием новой
  container.querySelectorAll(".flip-wrap").forEach(wrap => {
    wrap.addEventListener("click", () => {
      const wasFlipped = wrap.classList.contains("flipped");
      container.querySelectorAll(".flip-wrap").forEach(w => w.classList.remove("flipped"));
      if (!wasFlipped) {
        wrap.classList.add("flipped");
        // Синхронизируем высоту back = front
        const front = wrap.querySelector(".flip-front");
        const back  = wrap.querySelector(".flip-back");
        if (front && back) back.style.minHeight = front.offsetHeight + "px";
        setTimeout(() => initChartFor(wrap.id, history, stats, bByState, mByState), 320);
      }
    });
  });
}

// ---- ГРАФИКИ ----
function destroyChart(id) {
  const c = document.getElementById(id);
  if (c && window.Chart) { const ex = window.Chart.getChart(c); if (ex) ex.destroy(); }
}

function initChartFor(id, history, stats, bByState, mByState) {
  const Chart = window.Chart;
  if (!Chart) return;

  const lineOpts = {
    plugins: { legend: { display: false } },
    scales: { y: { min:0, max:100, ticks:{font:{size:10}} }, x: { ticks:{font:{size:9},maxRotation:45} } }
  };

  if (id === "flip-stability") {
    destroyChart("chartStability");
    const c = document.getElementById("chartStability");
    if (!c) return;
    const pts = [];
    for (let i = 4; i < history.length; i++) {
      const sl = history.slice(i-4, i+1);
      const avg = sl.reduce((s,h)=>s+h.value,0)/sl.length;
      const v = sl.reduce((s,h)=>s+Math.pow(h.value-avg,2),0)/sl.length;
      const st = Math.round(Math.max(5,Math.min(100,100-Math.sqrt(v))));
      const d = new Date(history[i].time);
      pts.push({ label:`${d.getDate()}.${d.getMonth()+1}`, value:st });
    }
    new Chart(c, { type:"line", data:{ labels:pts.map(p=>p.label), datasets:[{data:pts.map(p=>p.value),borderColor:"#4caf87",backgroundColor:"rgba(76,175,135,0.12)",tension:0.4,pointRadius:3,fill:true}]}, options:lineOpts });
  }

  if (id === "flip-mood") {
    destroyChart("chartMood");
    const c = document.getElementById("chartMood");
    if (!c) return;
    const daily = buildDailyMood(history);
    new Chart(c, { type:"line", data:{ labels:daily.map(d=>d.date.slice(5)), datasets:[{data:daily.map(d=>d.avg),borderColor:"#4db8ff",backgroundColor:"rgba(77,184,255,0.12)",tension:0.4,pointRadius:3,fill:true}]}, options:lineOpts });
  }

  if (id === "flip-golden") {
    destroyChart("chartHours");
    const c = document.getElementById("chartHours");
    if (!c) return;
    const hours = {};
    history.forEach(e => {
      const h = new Date(e.time).getHours();
      if (!hours[h]) hours[h]={total:0,count:0};
      hours[h].total+=e.value; hours[h].count++;
    });
    const labels = Object.keys(hours).sort((a,b)=>a-b);
    const data   = labels.map(h=>Math.round(hours[h].total/hours[h].count));
    new Chart(c, { type:"bar", data:{ labels:labels.map(h=>`${h}:00`), datasets:[{data,backgroundColor:data.map(v=>v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"),borderRadius:6}]}, options:lineOpts });
  }

  if (id === "flip-breathing") {
    destroyChart("chartBreathing");
    drawDoughnut("chartBreathing", stats?.breathingRate??bRate??0, "#4db8ff");
  }
  if (id === "flip-meditation") {
    destroyChart("chartMeditation");
    drawDoughnut("chartMeditation", stats?.meditationRate??mRate??0, "#9f7aea");
  }
}

function drawDoughnut(canvasId, rate, color) {
  const c = document.getElementById(canvasId);
  if (!c || !window.Chart) return;
  new window.Chart(c, {
    type:"doughnut",
    data:{ datasets:[{ data:[rate,100-rate], backgroundColor:[color,"#d0d9cc"], borderWidth:0 }]},
    options:{ cutout:"70%", plugins:{ legend:{display:false}, tooltip:{enabled:false} }},
    plugins:[{ id:"ct", afterDraw(chart){
      const {ctx,chartArea:{width,height,left,top}}=chart;
      ctx.save(); ctx.font="bold 22px sans-serif"; ctx.fillStyle="#3a3530";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`${rate??0}%`, left+width/2, top+height/2); ctx.restore();
    }}]
  });
}

function buildStateTable(bByState, mByState) {
  const states = ["LOW","STRESSED","NEUTRAL","GOOD","HIGH"];
  const labels = { LOW:"😔 Сниженное", STRESSED:"😤 Напряжение", NEUTRAL:"😐 Нейтральное", GOOD:"😊 Хорошее", HIGH:"🤩 Отличное" };
  let html = `<div style="display:flex;gap:8px;margin-bottom:8px;font-size:12px;color:#999;padding:0 4px;">
    <div style="flex:2;">Состояние</div><div style="flex:1;text-align:center;">🫁</div><div style="flex:1;text-align:center;">🧘</div></div>`;
  let hasAny = false;
  states.forEach(state => {
    const b=bByState[state], m=mByState[state];
    if (!b&&!m) return;
    hasAny = true;
    html+=`<div class="mo-metric" style="display:flex;justify-content:space-between;margin-bottom:8px;padding:10px 14px;">
      <div style="flex:2;font-size:14px;color:#555;">${labels[state]}</div>
      <div style="flex:1;text-align:center;color:${rColor(b?.rate)};font-weight:700;">${b?b.rate+"%":"—"}</div>
      <div style="flex:1;text-align:center;color:${rColor(m?.rate)};font-weight:700;">${m?m.rate+"%":"—"}</div>
    </div>`;
  });
  return hasAny ? html : `<div style="color:#888;font-size:14px;">Пока нет данных по состояниям.</div>`;
}

function buildDailyMood(history) {
  const byDay = {};
  history.forEach(e => {
    const d = new Date(e.time);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!byDay[key]) byDay[key]=[];
    byDay[key].push(e.value);
  });
  return Object.keys(byDay).sort().map(date=>({ date, avg:Math.round(byDay[date].reduce((a,b)=>a+b,0)/byDay[date].length) }));
}