// ===============================
// MoodOS Insight Screen
// ===============================

import { getMoodHistory } from "../services/memory.js";
import {
  calculateStabilityScore,
  calculateTrend,
  calculateGoldenHour
} from "../services/analytics.js";
import {
  getEffectivenessRate,
  getAverageMoodLift,
  getEffectivenessByState,
  getFullSessionStats,
  getPersonalRecommendation
} from "../services/session-analytics.js";
import { detectMoodState, getStateLabel } from "../services/state-engine.js";
import { getMood } from "../state.js";

const STATE_RU = {
  "Low mood": "Сниженное", "Stressed": "Напряжённое",
  "Neutral": "Нейтральное", "Good": "Хорошее",
  "Very good": "Отличное", "Unknown": "—"
};

function trendRu(t) {
  if (!t || t.includes("изучаю")) return "⏳ Мало данных";
  if (t.includes("improving")) return "📈 Улучшается";
  if (t.includes("declining")) return "📉 Снижается";
  return "➡️ Стабильно";
}
function trendExplain(t) {
  if (!t || t.includes("изучаю")) return "Недостаточно данных. Делай больше записей.";
  if (t.includes("improving")) return "Последние записи лучше предыдущих. Ты на подъёме — продолжай!";
  if (t.includes("declining")) return "Последние записи ниже. Стоит уделить внимание отдыху и практикам.";
  return "Твоё состояние стабильно без резких изменений.";
}
function sColor(s) { if (!s) return "#888"; return s>=75?"#4caf87":s>=50?"#f0a500":"#e05555"; }
function sText(s) {
  if (!s) return "Нет данных";
  if (s>=85) return "Высокая стабильность"; if (s>=65) return "Умеренная стабильность";
  if (s>=45) return "Заметные перепады"; return "Высокая волатильность";
}
function mColor(v) { return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"; }
function mText(v) {
  if (v>=70) return "Эмоциональное состояние сильное";
  if (v>=40) return "Относительно стабильное";
  return "Требует внимания";
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

export function onEnter() {
  const container = document.getElementById("insight-content");
  if (!container) return;

  const history = getMoodHistory();
  const mood    = getMood();
  const state   = detectMoodState(mood);
  const stats   = getFullSessionStats();

  if (!history || history.length === 0) {
    container.innerHTML = `<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">📊</div><div style="margin-top:12px;">Начни отслеживать настроение — здесь появится твоя аналитика.</div></div>`;
    return;
  }

  // ВСЕ вычисления ДО шаблона — иначе ReferenceError
  const stability  = calculateStabilityScore(history);
  const trend      = calculateTrend(history);
  const golden     = calculateGoldenHour(history);
  const avgMood    = Math.round(history.reduce((s,h)=>s+h.value,0)/history.length);
  const recommendation = getPersonalRecommendation(state);
  const breathingRate     = getEffectivenessRate("breathing");
  const meditationRate    = getEffectivenessRate("meditation");
  const breathingLift     = getAverageMoodLift("breathing");
  const meditationLift    = getAverageMoodLift("meditation");
  const breathingByState  = getEffectivenessByState("breathing");
  const meditationByState = getEffectivenessByState("meditation");
  const stateLabelRu = STATE_RU[getStateLabel(state)] || getStateLabel(state);

  container.innerHTML = `
    <style>
      .insight-section { margin-bottom: 24px; }
      .insight-section-title { font-size:13px; color:#888; font-weight:600; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px; }
      .flip-wrap { perspective:1000px; margin-bottom:12px; cursor:pointer; }
      .flip-inner { position:relative; width:100%; transform-style:preserve-3d; transition:transform 0.5s ease; border-radius:18px; }
      .flip-wrap.flipped .flip-inner { transform:rotateY(180deg); }
      .flip-front, .flip-back {
        backface-visibility:hidden; -webkit-backface-visibility:hidden;
        border-radius:18px; padding:16px; box-sizing:border-box;
        background:rgba(232,237,230,0.9);
        box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;
      }
      .flip-front { position:relative; }
      .flip-back {
        position:absolute; top:0; left:0; width:100%; height:100%;
        transform:rotateY(180deg);
        display:flex; align-items:center; justify-content:center; flex-direction:column;
      }
      .flip-label { font-size:12px; color:#999; margin-bottom:4px; }
      .flip-value { font-size:28px; font-weight:700; color:#3a3530; }
      .flip-sub   { font-size:13px; color:#777; margin-top:4px; }
      .flip-hint  { font-size:11px; color:#4caf87; font-weight:600; text-align:right; margin-top:8px; }
      .rec-card { padding:16px; border-radius:18px; background:rgba(232,237,230,0.9); box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff; margin-bottom:12px; }
      .state-row { display:flex; justify-content:space-between; padding:10px 14px; border-radius:12px; background:rgba(232,237,230,0.9); box-shadow:3px 3px 7px #b8c4b4,-3px -3px 7px #ffffff; margin-bottom:8px; font-size:14px; color:#555; }
    </style>

    <div style="padding:4px 0 100px 0;">
      <h2 style="margin-bottom:6px;">Что я о себе узнаю?</h2>
      <div style="font-size:13px;color:#888;margin-bottom:20px;">Текущее состояние: <strong style="color:#3a3530;">${stateLabelRu}</strong></div>

      <div class="insight-section">
        <div class="insight-section-title">💡 Личная рекомендация</div>
        <div class="rec-card"><div style="font-size:15px;color:#444;line-height:1.5;">${recommendation}</div></div>
      </div>

      <div class="insight-section">
        <div class="insight-section-title">📈 Основные метрики</div>

        <div class="flip-wrap" id="flip-stability">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Стабильность</div>
              <div class="flip-value" style="color:${sColor(stability)}">${stability??'—'}%</div>
              <div class="flip-sub">${sText(stability)}</div>
              <div class="flip-hint">Нажми для графика ↩</div>
            </div>
            <div class="flip-back" style="padding:12px;"><canvas id="chartStability" style="width:100%;display:block;"></canvas></div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-mood">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Среднее настроение</div>
              <div class="flip-value" style="color:${mColor(avgMood)}">${avgMood}%</div>
              <div class="flip-sub">${mText(avgMood)}</div>
              <div class="flip-hint">Нажми для графика ↩</div>
            </div>
            <div class="flip-back" style="padding:12px;"><canvas id="chartMood" style="width:100%;display:block;"></canvas></div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-trend">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Тренд</div>
              <div class="flip-value" style="font-size:20px;color:#3a3530;">${trendRu(trend)}</div>
              <div class="flip-sub">Последние записи vs предыдущие</div>
              <div class="flip-hint">Нажми для деталей ↩</div>
            </div>
            <div class="flip-back" style="padding:20px;">
              <div style="font-size:15px;color:#555;text-align:center;line-height:1.6;">${trendExplain(trend)}</div>
            </div>
          </div>
        </div>

        <div class="flip-wrap" id="flip-golden">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Золотые часы</div>
              <div class="flip-value" style="font-size:18px;">⭐ ${goldenShort(golden)}</div>
              <div class="flip-sub">Твой пик активности</div>
              <div class="flip-hint">Нажми для графика ↩</div>
            </div>
            <div class="flip-back" style="padding:12px;"><canvas id="chartHours" style="width:100%;display:block;"></canvas></div>
          </div>
        </div>
      </div>

      ${stats ? `
      <div class="insight-section">
        <div class="insight-section-title">🫁 Эффективность практик</div>
        <div class="flip-wrap" id="flip-breathing">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Дыхание</div>
              <div class="flip-value" style="color:${rColor(breathingRate)}">${breathingRate??'—'}%</div>
              <div class="flip-sub">${breathingLift!==null?`Средний подъём: +${breathingLift} пт`:'Нет данных'} · ${stats.breathingSessions} сессий</div>
              <div class="flip-hint">Нажми для деталей ↩</div>
            </div>
            <div class="flip-back"><canvas id="chartBreathing" width="150" height="150"></canvas></div>
          </div>
        </div>
        <div class="flip-wrap" id="flip-meditation">
          <div class="flip-inner">
            <div class="flip-front">
              <div class="flip-label">Медитация</div>
              <div class="flip-value" style="color:${rColor(meditationRate)}">${meditationRate??'—'}%</div>
              <div class="flip-sub">${meditationLift!==null?`Средний подъём: +${meditationLift} пт`:'Нет данных'} · ${stats.meditationSessions} сессий</div>
              <div class="flip-hint">Нажми для деталей ↩</div>
            </div>
            <div class="flip-back"><canvas id="chartMeditation" width="150" height="150"></canvas></div>
          </div>
        </div>
      </div>
      <div class="insight-section">
        <div class="insight-section-title">🧠 При каком состоянии что помогает</div>
        ${buildStateTable(breathingByState, meditationByState)}
      </div>
      ` : `
      <div class="insight-section">
        <div class="rec-card" style="text-align:center;color:#888;">
          Пройди несколько сессий дыхания или медитации — здесь появится аналитика эффективности.
        </div>
      </div>`}
    </div>`;

  // FLIP логика
  document.querySelectorAll(".flip-wrap").forEach(wrap => {
    wrap.addEventListener("click", () => {
      const wasFlipped = wrap.classList.contains("flipped");

      // Сбрасываем ВСЕ — включая minHeight
      document.querySelectorAll(".flip-wrap").forEach(w => {
        w.classList.remove("flipped");
        const inner = w.querySelector(".flip-inner");
        if (inner) inner.style.minHeight = "";
      });

      if (!wasFlipped) {
        wrap.classList.add("flipped");
        // Ставим минимальную высоту = высоте front до анимации
        const front = wrap.querySelector(".flip-front");
        const inner = wrap.querySelector(".flip-inner");
        if (front && inner) inner.style.minHeight = front.offsetHeight + "px";

        setTimeout(() => {
          initChartFor(wrap.id, history, stats, breathingByState, meditationByState);
          // После отрисовки — растягиваем под график
          requestAnimationFrame(() => {
            const canvas = wrap.querySelector("canvas");
            if (canvas && inner) {
              // Высота = высота canvas + padding (24px)
              const newH = canvas.height + 24;
              const frontH = front ? front.offsetHeight : 0;
              inner.style.minHeight = Math.max(newH, frontH) + "px";
            }
          });
        }, 320);
      }
    });
  });
}

function destroyChart(id) {
  const c = document.getElementById(id);
  if (c && window.Chart) { const ex = window.Chart.getChart(c); if (ex) ex.destroy(); }
}

function initChartFor(id, history, stats, breathingByState, meditationByState) {
  const Chart = window.Chart;
  if (!Chart) return;
  const lineOpts = {
    plugins: { legend: { display: false } },
    scales: { y:{min:0,max:100,ticks:{font:{size:10}}}, x:{ticks:{font:{size:9},maxRotation:45}} }
  };

  if (id === "flip-stability") {
    destroyChart("chartStability");
    const c = document.getElementById("chartStability"); if (!c) return;
    const wrap = document.getElementById("flip-stability");
    const maxH = Math.min(window.innerHeight * 0.55, 320);
    c.width  = (wrap ? wrap.offsetWidth : 300) - 24;
    c.height = maxH;
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
    const wrap = document.getElementById("flip-mood");
    const maxH = Math.min(window.innerHeight * 0.55, 320);
    c.width  = (wrap ? wrap.offsetWidth : 300) - 24;
    c.height = maxH;
    const daily = buildDailyMood(history);
    new Chart(c,{type:"line",data:{labels:daily.map(d=>d.date.slice(5)),datasets:[{data:daily.map(d=>d.avg),borderColor:"#4db8ff",backgroundColor:"rgba(77,184,255,0.12)",tension:0.4,pointRadius:3,fill:true}]},options:lineOpts});
  }

  if (id === "flip-golden") {
    destroyChart("chartHours");
    const c = document.getElementById("chartHours"); if (!c) return;
    const wrap = document.getElementById("flip-golden");
    const maxH = Math.min(window.innerHeight * 0.55, 320);
    c.width  = (wrap ? wrap.offsetWidth : 300) - 24;
    c.height = maxH;
    const hours={};
    history.forEach(e=>{const h=new Date(e.time).getHours();if(!hours[h])hours[h]={total:0,count:0};hours[h].total+=e.value;hours[h].count++;});
    const labels=Object.keys(hours).sort((a,b)=>a-b);
    const data=labels.map(h=>Math.round(hours[h].total/hours[h].count));
    new Chart(c,{type:"bar",data:{labels:labels.map(h=>`${h}:00`),datasets:[{data,backgroundColor:data.map(v=>v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"),borderRadius:6}]},options:lineOpts});
  }

  if (id === "flip-breathing") { destroyChart("chartBreathing"); drawPieChart("chartBreathing", stats?.breathingRate??0, "#4db8ff"); }
  if (id === "flip-meditation") { destroyChart("chartMeditation"); drawPieChart("chartMeditation", stats?.meditationRate??0, "#9f7aea"); }
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

function buildStateTable(bByState, mByState) {
  const states=["LOW","STRESSED","NEUTRAL","GOOD","HIGH"];
  const labels={LOW:"😔 Сниженное",STRESSED:"😤 Напряжение",NEUTRAL:"😐 Нейтральное",GOOD:"😊 Хорошее",HIGH:"🤩 Отличное"};
  let html=`<div style="display:flex;gap:8px;margin-bottom:8px;font-size:12px;color:#888;padding:0 4px;"><div style="flex:2;">Состояние</div><div style="flex:1;text-align:center;">🫁</div><div style="flex:1;text-align:center;">🧘</div></div>`;
  let any=false;
  states.forEach(state=>{
    const b=bByState[state],m=mByState[state]; if(!b&&!m) return; any=true;
    html+=`<div class="state-row"><div style="flex:2;">${labels[state]}</div><div style="flex:1;text-align:center;color:${rColor(b?.rate)};font-weight:600;">${b?b.rate+"%":"—"}</div><div style="flex:1;text-align:center;color:${rColor(m?.rate)};font-weight:600;">${m?m.rate+"%":"—"}</div></div>`;
  });
  return any?html:`<div style="color:#888;font-size:14px;">Пока нет данных по состояниям.</div>`;
}