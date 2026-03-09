// ===============================
// MoodOS Stability Screen
// ===============================
import { getMoodHistory } from "../services/memory.js";
import { getNotesHistory } from "../services/memory.js";
import { calculateStabilityScore } from "../services/analytics.js";

const TOOLTIPS = {
  stab:   "Насколько ровным было твоё настроение. 100% = нет скачков, 0% = сильная волатильность.",
  vol:    "Обратная сторона устойчивости: насколько сильно менялось настроение.",
  avg14:  "Среднее значение всех замеров за последние 14 дней.",
  trend:  "Направление изменений: сравнение последних записей с предыдущими."
};

export function onEnter() {
  const container = document.getElementById("stability-content");
  if (!container) return;

  // Диагностика: читаем напрямую из localStorage
  let rawFromStorage = [];
  try {
    rawFromStorage = JSON.parse(localStorage.getItem("mood_history") || "[]");
  } catch(e) { rawFromStorage = []; }

  const rawHistory = getMoodHistory();

  // Если getMoodHistory возвращает меньше чем в localStorage — проблема в memory.js
  // Показываем оба числа для диагностики
  if (!rawHistory || rawHistory.length < 2) {
    container.innerHTML = `
      <div style="text-align:center;margin-top:60px;color:#888;">
        <div style="font-size:48px;">🧘</div>
        <div style="margin-top:12px;">Нужно минимум 2 записи для анализа устойчивости.</div>
        <div style="margin-top:16px;font-size:12px;color:#bbb;text-align:left;padding:12px;background:rgba(255,255,255,0.4);border-radius:12px;">
          <b>Диагностика:</b><br>
          getMoodHistory(): ${rawHistory ? rawHistory.length : 'null'} записей<br>
          localStorage["mood_history"]: ${rawFromStorage.length} записей<br>
          Все ключи: ${Object.keys(localStorage).join(', ')}
        </div>
      </div>`;
    return;
  }

  // Дедупликация: убираем записи с одинаковым временем (до секунды)
  const seen = new Set();
  const history = rawHistory.filter(e => {
    const key = Math.floor(new Date(e.time).getTime() / 1000);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const stability  = calculateStabilityScore(history);
  const volatility = 100 - stability;

  // 14 дней
  const now14  = Date.now();
  const hist14 = history.filter(e => now14 - new Date(e.time).getTime() <= 14*24*60*60*1000);
  const avg14  = hist14.length ? Math.round(hist14.reduce((s,h)=>s+h.value,0)/hist14.length) : null;

  function calcTrend(h) {
    if (h.length < 4) return "➡️ Стабильно";
    const half   = Math.floor(h.length/2);
    const recent = h.slice(-half).reduce((s,x)=>s+x.value,0)/half;
    const prev   = h.slice(0,half).reduce((s,x)=>s+x.value,0)/half;
    const diff   = recent - prev;
    if (diff>5) return "📈 Улучшается";
    if (diff<-5) return "📉 Снижается";
    return "➡️ Стабильно";
  }

  const trendText  = calcTrend(history);
  const trendColor = trendText.includes("Улучш")?"#4caf87":trendText.includes("Сниж")?"#e05555":"#888";

  function sc(s){ if(s>=75) return "#4caf87"; if(s>=50) return "#f0a500"; return "#e05555"; }
  function mc(v){ return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555"; }

  let levelText = "Умеренные колебания.";
  if (stability>=85) levelText = "Отличный баланс. Ты в потоке.";
  else if (stability>=65) levelText = "Хорошая устойчивость.";
  else if (stability>=45) levelText = "Заметные перепады настроения.";
  else levelText = "Высокая волатильность.";

  // Последние 10 записей — сортируем по времени, берём 10 последних
  const last10 = history
    .slice()
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .slice(-10)
    .reverse(); // новые сверху
  const notes  = getNotesHistory ? getNotesHistory() : [];

  function infoBtn(key) {
    return `<div class="mo-info-btn" data-tip="${key}">i</div><div class="mo-tooltip">${TOOLTIPS[key]||''}</div>`;
  }

  function entryCards(entries) {
    return entries.map((e, idx) => {
      const d    = new Date(e.time);
      const ds   = d.toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
      const col  = mc(e.value);
      const emoji= e.value>=70?"😊":e.value>=40?"😐":"😔";
      // Ищем заметку в пределах 30 минут от записи
      const nearNote = notes.find(n => Math.abs((n.timestamp||new Date(n.time).getTime()) - new Date(e.time).getTime()) < 30*60*1000);
      const noteText = nearNote ? (nearNote.text||nearNote.note||"") : "";
      // Состояние на момент записи
      const stateLabel = e.state
        ? ({ "LOW":"Сниженное","STRESSED":"Напряжение","NEUTRAL":"Нейтральное","GOOD":"Хорошее","HIGH":"Отличное" }[e.state] || e.state)
        : null;
      return `
        <div class="stab-entry">
          <div class="stab-entry-header" data-idx="${idx}">
            <div style="width:40px;height:40px;border-radius:12px;flex-shrink:0;background:${col}22;display:flex;align-items:center;justify-content:center;font-size:18px;">${emoji}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;color:#999;margin-bottom:3px;">${ds}</div>
              <div style="height:5px;border-radius:3px;background:#d0d9cc;overflow:hidden;">
                <div style="height:100%;width:${e.value}%;background:${col};border-radius:3px;"></div>
              </div>
            </div>
            <div style="font-size:17px;font-weight:700;color:${col};flex-shrink:0;margin-left:8px;">${e.value}%</div>
            <div class="stab-chevron" data-idx="${idx}" style="font-size:16px;color:#bbb;margin-left:6px;transition:transform 0.2s;">›</div>
          </div>
          <div class="stab-entry-detail" data-idx="${idx}" style="display:none;padding:0 14px 14px;">
            <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.45);box-shadow:inset 3px 3px 6px #c4c9c2,inset -3px -3px 6px #ffffff;font-size:14px;color:#555;line-height:1.7;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:#999;font-size:12px;">Настроение</span>
                <span style="font-weight:700;color:${col};">${e.value}%</span>
              </div>
              ${stateLabel ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#999;font-size:12px;">Состояние</span><span style="font-weight:600;color:#555;">${stateLabel}</span></div>` : ""}
              <div style="display:flex;justify-content:space-between;margin-bottom:${noteText?'10px':'0'};">
                <span style="color:#999;font-size:12px;">Время</span>
                <span style="color:#555;">${ds}</span>
              </div>
              ${noteText ? `<div style="border-top:1px solid rgba(0,0,0,0.06);padding-top:8px;"><div style="font-size:11px;color:#aaa;margin-bottom:4px;">📝 Заметка рядом</div><div style="color:#444;">${noteText}</div></div>` : ""}
            </div>
          </div>
        </div>`;
    }).join("");
  }

  container.innerHTML = `
    <div style="padding:4px 0 100px;">
      <div style="font-size:13px;color:#888;margin-bottom:16px;">Анализ эмоциональных колебаний</div>

      <div class="mo-section-title">📊 Показатели</div>
      <div class="mo-grid-2">
        <div class="mo-metric">${infoBtn("stab")}<div class="mo-metric-label">Устойчивость</div><div class="mo-metric-value" style="color:${sc(stability)}">${stability}%</div><div class="mo-metric-sub">${levelText}</div></div>
        <div class="mo-metric">${infoBtn("vol")}<div class="mo-metric-label">Волатильность</div><div class="mo-metric-value" style="color:${sc(100-volatility)}">${volatility}%</div><div class="mo-metric-sub">перепады</div></div>
        <div class="mo-metric">${infoBtn("avg14")}<div class="mo-metric-label">Среднее за 14 дней</div><div class="mo-metric-value" style="color:${avg14?mc(avg14):'#888'}">${avg14!==null?avg14+'%':'—'}</div><div class="mo-metric-sub">${hist14.length} записей</div></div>
        <div class="mo-metric">${infoBtn("trend")}<div class="mo-metric-label">Тренд</div><div class="mo-metric-value" style="font-size:16px;color:${trendColor}">${trendText}</div><div class="mo-metric-sub">по данным</div></div>
      </div>

      <div class="mo-section-title" style="margin-top:16px;">📈 Динамика за 14 дней</div>
      <div class="mo-metric" style="padding:12px;margin-bottom:16px;">
        <canvas id="stabilityChart14" height="120"></canvas>
      </div>

      <div class="mo-section-title">🕐 Последние 10 замеров настроения</div>
      <div style="font-size:12px;color:#aaa;margin:-6px 0 10px 2px;">Нажми на запись чтобы раскрыть детали</div>
      ${entryCards(last10)}
    </div>`;

  // Тултипы
  container.querySelectorAll(".mo-info-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const wasOpen = btn.classList.contains("open");
      container.querySelectorAll(".mo-info-btn").forEach(b=>b.classList.remove("open"));
      if (!wasOpen) btn.classList.add("open");
    });
  });

  // Раскрытие записей
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

  // График 14 дней
  requestAnimationFrame(() => {
    const canvas = document.getElementById("stabilityChart14");
    if (!canvas || !window.Chart) return;
    const ex = window.Chart.getChart(canvas);
    if (ex) ex.destroy();
    const sorted = hist14.slice().sort((a,b)=>a.time-b.time);
    canvas.width = canvas.parentElement.offsetWidth - 24;
    new window.Chart(canvas, {
      type:"line",
      data:{ labels:sorted.map(e=>{const d=new Date(e.time);return `${d.getDate()}.${d.getMonth()+1}`;}), datasets:[{data:sorted.map(e=>e.value),borderColor:"#4caf87",backgroundColor:"rgba(76,175,135,0.12)",tension:0.4,pointRadius:3,fill:true}]},
      options:{ plugins:{legend:{display:false}}, scales:{ y:{min:0,max:100,ticks:{font:{size:10}}}, x:{ticks:{font:{size:9},maxRotation:45}} }}
    });
  });
}