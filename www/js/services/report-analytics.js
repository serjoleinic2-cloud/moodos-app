export function getTriggerStats(filtered) {
  const stats = {};
  filtered.forEach(e => {
    if (!Array.isArray(e.events)) return;
    e.events.forEach(ev => {
      if (!stats[ev]) stats[ev] = { total:0, sum:0 };
      stats[ev].total++;
      stats[ev].sum += e.value;
    });
  });
  const allAvg = filtered.length
    ? Math.round(filtered.reduce((s,e) => s+e.value, 0) / filtered.length)
    : 50;
  return Object.entries(stats)
    .filter(([,s]) => s.total >= 2)
    .map(([trigger, s]) => {
      const avg  = Math.round(s.sum / s.total);
      const diff = avg - allAvg;
      return { trigger, total: s.total, avg, diff };
    })
    .sort((a,b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 8);
}

export function getTimeBucketStats(filtered) {
  const b = { morning:[], day:[], evening:[], night:[] };
  filtered.forEach(e => {
    const ts = e.time || e.timestamp || e.date; if (!ts) return;
    const h = new Date(ts).getHours();
    if      (h >= 5  && h < 12) b.morning.push(e.value);
    else if (h >= 12 && h < 17) b.day.push(e.value);
    else if (h >= 17 && h < 22) b.evening.push(e.value);
    else                         b.night.push(e.value);
  });
  const res = {};
  Object.entries(b).forEach(([k,v]) => {
    if (!v.length) return;
    res[k] = { avg: Math.round(v.reduce((a,b)=>a+b,0)/v.length), count: v.length };
  });
  return res;
}

export function getDowStats(filtered) {
  const dows = [[],[],[],[],[],[],[]];
  filtered.forEach(e => {
    const ts = e.time || e.timestamp || e.date; if (!ts) return;
    let d = new Date(ts).getDay();
    d = d === 0 ? 6 : d - 1;
    dows[d].push(e.value);
  });
  return dows.map(v => !v.length ? null : {
    avg:   Math.round(v.reduce((a,b)=>a+b,0)/v.length),
    count: v.length
  });
}

export function buildInsights({ triggerStats, timeBucketStats, dowStats, t, tEvent }) {
  const insights = [];

  const best  = triggerStats.filter(s => s.diff >= 8).slice(0, 2);
  const worst = triggerStats.filter(s => s.diff <= -8).slice(0, 2);

  best.forEach(s => insights.push({
    icon: '🟢',
    text: (t('report_insight_trigger_up') || '{ev} поднимает настроение на {n} пунктов в среднем.')
      .replace('{ev}', tEvent(s.trigger)).replace('{n}', '+' + s.diff)
  }));
  worst.forEach(s => insights.push({
    icon: '🔴',
    text: (t('report_insight_trigger_down') || 'После «{ev}» настроение снижается на {n} пунктов.')
      .replace('{ev}', tEvent(s.trigger)).replace('{n}', Math.abs(s.diff))
  }));

  const timeArr = Object.entries(timeBucketStats).sort((a,b)=>b[1].avg-a[1].avg);
  if (timeArr.length >= 2) {
    const [bestT] = timeArr;
    const [worstT] = [...timeArr].reverse();
    if (bestT[1].avg - worstT[1].avg >= 10) {
      insights.push({
        icon: '⏰',
        text: (t('report_insight_best_time') || 'Лучшее время — {t} (среднее {n}%).')
          .replace('{t}', t('time_' + bestT[0]) || bestT[0])
          .replace('{n}', bestT[1].avg)
      });
    }
  }

  const validDows = dowStats.map((d,i)=>({i,...d})).filter(d=>d&&d.count>=1);
  if (validDows.length >= 3) {
    const bestD  = validDows.reduce((a,b)=>a.avg>b.avg?a:b);
    const worstD = validDows.reduce((a,b)=>a.avg<b.avg?a:b);
    if (bestD.avg - worstD.avg >= 10) {
      const dn = ['dow_mon','dow_tue','dow_wed','dow_thu','dow_fri','dow_sat','dow_sun'];
      insights.push({
        icon: '📅',
        text: (t('report_insight_dow') || 'Лучший день — {d1} ({n}%), сложнее — {d2}.')
          .replace('{d1}', t(dn[bestD.i]) || bestD.i)
          .replace('{n}', bestD.avg)
          .replace('{d2}', t(dn[worstD.i]) || worstD.i)
      });
    }
  }

  if (!insights.length) insights.push({
    icon: '💡',
    text: t('report_insight_no_data') || 'Продолжай отслеживать — паттерны появятся через несколько недель.'
  });

  return insights.slice(0, 4);
}
