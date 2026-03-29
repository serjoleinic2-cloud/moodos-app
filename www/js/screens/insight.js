import { getMoodHistory } from "../services/memory.js";
import { calculateStabilityScore, calculateTrend, calculateGoldenHour } from "../services/analytics.js";
import { getEffectivenessRate, getAverageMoodLift, getEffectivenessByState, getFullSessionStats, getPersonalRecommendation, getEffectiveSessionCount, getPracticeComparison, getUserBaseline, compareToBaseline, TIME_HORIZONS } from "../services/session-analytics.js";
import { getStateLabel } from "../services/state-engine.js";
import SystemCore from "../system-core.js";
import { getMood } from "../state.js";
import { t } from "../i18n.js";
import { getYearComparison } from "../services/weekly-analytics.js";

function formatInsightValue(value) {
  if (value == null) return t('no_data');
  if (value === 'no_lift_data') return t('no_lift_data');
  return value;
}

let selectedTimeRange = localStorage.getItem("insight_period") || 'month';

function formatPracticeCard(practiceType, practiceData) {
  const d = practiceData[practiceType] || { rate: null, sessions: 0, effective: 0 };
  const comparison = getPracticeComparison(practiceType, TIME_HORIZONS[selectedTimeRange]);
  const { baseline, comparison: comp, current } = comparison;
  
  const MIN_SESSIONS_FOR_COMPARISON = 7;
  const hasEnoughData = baseline.sessionCount >= MIN_SESSIONS_FOR_COMPARISON;
  
  let mainDisplay = { value: '', type: 'neutral', subtitle: '' };
  let comparisonDisplay = { text: '', type: 'neutral' };
  
  // Определяем тип данных для отображения
  if (hasEnoughData && comp.trend !== null) {
    // Есть достаточно данных для сравнения - показываем сравнение
    if (comp.trend === 'improving') {
      const days = TIME_HORIZONS[selectedTimeRange];
      mainDisplay = {
        value: '+' + Math.abs(comp.liftDelta || 0) + t('pts'),
        type: 'improving',
        subtitle: t('baseline_improvement').replace('{{n}}', Math.abs(comp.liftDelta || 0)).replace('{{days}}', days)
      };
    } else if (comp.trend === 'declining') {
      mainDisplay = {
        value: Math.abs(comp.liftDelta || 0) + t('pts'),
        type: 'declining',
        subtitle: t('baseline_declining').replace('{{n}}', Math.abs(comp.liftDelta || 0))
      };
    } else {
      mainDisplay = {
        value: t('baseline_stable'),
        type: 'stable',
        subtitle: t('baseline_vs_period').replace('{{days}}', TIME_HORIZONS[selectedTimeRange])
      };
    }
    comparisonDisplay = { text: '', type: 'neutral' };
  } else {
    // Недостаточно данных - показываем абсолютные значения
    if (d.rate !== null) {
      mainDisplay = {
        value: d.rate + '%',
        type: d.rate >= 70 ? 'good' : (d.rate >= 40 ? 'mid' : 'low'),
        subtitle: ''
      };
    } else {
      mainDisplay = {
        value: '—',
        type: 'neutral',
        subtitle: ''
      };
    }
    
    if (baseline.sessionCount < 3) {
      comparisonDisplay = { text: t('baseline_learning'), type: 'learning' };
    } else {
      comparisonDisplay = { text: t('baseline_not_enough_compare'), type: 'insufficient' };
    }
  }
  
  const sessionsText = d.sessions > 0 ? d.sessions + ' ' + t("sessions_count") : t("no_data_short");
  
  return {
    mainDisplay,
    comparisonDisplay,
    sessionsText
  };
}

const STATE_RU = {
  "Low mood":"LOW","Stressed":"STRESSED","Neutral":"NEUTRAL","Good":"GOOD","Very good":"HIGH","Unknown":"—"
};

// БАГ 4 ИСПРАВЛЕН: унифицировано на "support_texts" (нижнее подчёркивание)
const PRACTICES = [
  { key: "breathing",     icon: "🫁", labelKey: "breathing_lbl" },
  { key: "meditation",    icon: "🧘", labelKey: "meditation_lbl" },
  { key: "visual-focus",  icon: "👁", labelKey: "tools_visual" },
  { key: "mind-dump",     icon: "🧠", labelKey: "tools_mind" },
  { key: "tap-calm",      icon: "✋", labelKey: "tools_tap" },
  { key: "support_texts", icon: "💬", labelKey: "support_texts_title" },
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
  if (!g) return formatInsightValue(null);
  if (typeof g === "object" && g.start !== undefined) return g.start + ":00–" + g.end + ":00";
  const m = g.match(/\d{2}:\d{2}[–\-]\d{2}:\d{2}/);
  return m ? m[0] : g;
}

function buildDailyMood(history) {
  const byDay = {};
  history.forEach(e => {
    const d = new Date(e.time);
    const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e.value);
  });
  return Object.keys(byDay).sort().map(date => ({
    date, avg: Math.round(byDay[date].reduce((a,b)=>a+b,0)/byDay[date].length)
  }));
}

// БАГ 4 ИСПРАВЛЕН: добавлен "support_texts" в маппинг
function practiceShortLabel(key) {
  const map = {
    "breathing":     t("tools_breathing"),
    "meditation":    t("tools_meditation"),
    "visual-focus":  t("tools_visual"),
    "mind-dump":     t("tools_mind"),
    "tap-calm":      t("tools_tap"),
    "support_texts": t("support_texts_title"),
    "support-texts": t("support_texts_title"),
  };
  return (map[key] || key).replace(/^[^\s]+\s/, "");
}

function pluralMonths(n) {
  if (n % 10 === 1 && n % 100 !== 11) return t("months_1") || "месяц";
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return t("months_234") || "месяца";
  return t("months_5") || "месяцев";
}
function pluralDays(n) {
  if (n % 10 === 1 && n % 100 !== 11) return t("days_1") || "день";
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return t("days_234") || "дня";
  return t("days_5") || "дней";
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
  if (monthsAgo >= 2) timeAgo = monthsAgo + " " + pluralMonths(monthsAgo) + " " + t("time_ago");
  else if (weeksAgo >= 2) timeAgo = weeksAgo + " " + t("weeks_ago");
  else timeAgo = t("week_ago");
  return { timeAgo, daysToRecover: best.days };
}

function buildYearComparisonBlock() {
  const yc = getYearComparison();
  if (!yc) return "";
  if (!yc.lastYear) {
    return '<div class="insight-section">' +
      '<div class="insight-section-title">📅 ' + t("year_ago") + '</div>' +
      '<div style="padding:16px;border-radius:18px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;color:#aaa;font-size:14px;text-align:center;">' +
        t("year_data_collecting") +
      '</div>' +
    '</div>';
  }

  const cur  = yc.current;
  const prev = yc.lastYear;
  const diff = yc.improvement;

  const diffColor  = diff > 0 ? "#4caf87" : diff < 0 ? "#e05555" : "#888";
  const diffSign   = diff > 0 ? "+" : "";
  const diffEmoji  = diff > 3 ? "📈" : diff < -3 ? "📉" : "➡️";
  const diffText   = diff > 3 ? t("year_better") : diff < -3 ? t("year_harder") : t("year_same");

  const curMoodColor  = cur  ? mColor(cur.averageMood)  : "#888";
  const prevMoodColor = prev ? mColor(prev.averageMood) : "#888";
  const curMood  = cur  ? cur.averageMood  + "%" : "—";
  const prevMood = prev ? prev.averageMood + "%" : "—";
  const curEntries  = cur  ? cur.entries  + " " + t("entries_count")  : "—";
  const prevEntries = prev ? prev.entries + " " + t("entries_count")  : "—";
  const curSessions  = cur  ? cur.sessions  + " " + t("sessions_count") : "—";
  const prevSessions = prev ? prev.sessions + " " + t("sessions_count") : "—";

  return '<div class="insight-section">' +
    '<div class="insight-section-title">' + t("week_vs_year") + '</div>' +
    '<div style="padding:18px;border-radius:18px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;">' +
      '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;padding:14px;border-radius:14px;background:rgba(220,228,218,0.6);box-shadow:inset 2px 2px 5px #c4c9c2,inset -2px -2px 5px #ffffff;">' +
          '<div style="font-size:11px;color:#aaa;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">' + t("year_ago") + '</div>' +
          '<div style="font-size:26px;font-weight:700;color:' + prevMoodColor + ';margin-bottom:4px;">' + prevMood + '</div>' +
          '<div style="font-size:12px;color:#888;">' + prevEntries + '</div>' +
          '<div style="font-size:12px;color:#888;">' + prevSessions + '</div>' +
        '</div>' +
        '<div style="flex:1;padding:14px;border-radius:14px;background:rgba(220,228,218,0.6);box-shadow:inset 2px 2px 5px #c4c9c2,inset -2px -2px 5px #ffffff;">' +
          '<div style="font-size:11px;color:#aaa;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">' + t("now_label") + '</div>' +
          '<div style="font-size:26px;font-weight:700;color:' + curMoodColor + ';margin-bottom:4px;">' + curMood + '</div>' +
          '<div style="font-size:12px;color:#888;">' + curEntries + '</div>' +
          '<div style="font-size:12px;color:#888;">' + curSessions + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:rgba(232,237,230,0.9);box-shadow:3px 3px 7px #b8c4b4,-3px -3px 7px #ffffff;">' +
        '<div style="font-size:28px;">' + diffEmoji + '</div>' +
        '<div>' +
          '<div style="font-size:16px;font-weight:700;color:' + diffColor + ';">' + diffSign + diff + ' ' + t("pts") + ' — ' + diffText + '</div>' +
          '<div style="font-size:12px;color:#888;margin-top:2px;">' + t("year_mood_change") + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

export async function onEnter() {
  const container = document.getElementById("insight-content");
  if (!container) return;

  const history = getMoodHistory();
  const mood    = getMood();
  const state   = (await SystemCore.analyzeMoodOnly(mood)).state;
  const stats   = getFullSessionStats();

  if (!history || history.length === 0) {
    container.innerHTML = '<div style="text-align:center;margin-top:60px;color:#888;"><div style="font-size:48px;">📊</div><div style="margin-top:12px;">' + t("no_data_insight") + '</div></div>';
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
      effective: 0,
    };
  });
  if (stats) {
    practiceData["breathing"].sessions     = stats.breathingSessions     || 0;
    practiceData["meditation"].sessions    = stats.meditationSessions    || 0;
    practiceData["visual-focus"].sessions   = stats.visualFocusSessions   || 0;
    practiceData["mind-dump"].sessions      = stats.mindDumpSessions      || 0;
    practiceData["tap-calm"].sessions       = stats.tapCalmSessions       || 0;
    practiceData["support_texts"].sessions  = stats.supportTextsSessions  || 0;
    practiceData["breathing"].effective     = stats.breathingEffective     || 0;
    practiceData["meditation"].effective    = stats.meditationEffective    || 0;
    practiceData["visual-focus"].effective  = stats.visualFocusEffective   || 0;
    practiceData["mind-dump"].effective     = stats.mindDumpEffective      || 0;
    practiceData["tap-calm"].effective      = stats.tapCalmEffective       || 0;
    practiceData["support_texts"].effective = stats.supportTextsEffective  || 0;
  }

  const activePractices = PRACTICES.filter(p => practiceData[p.key].rate !== null);
  const stateCode = STATE_RU[getStateLabel(state)] || state;
  const stateLabelTr = t("state_" + stateCode.toLowerCase()) || getStateLabel(state);

  let memoryBlockHTML = "";
  if (mood <= 40) {
    const memory = findEmotionalMemory(history, mood);
    if (memory) {
      memoryBlockHTML =
        '<div class="insight-section" id="emotional-memory-block">' +
          '<div class="insight-section-title">🧠 ' + t("emotional_memory_title") + '</div>' +
          '<div style="padding:18px;border-radius:18px;background:rgba(159,122,234,0.12);box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;">' +
            '<div style="font-size:15px;color:#444;line-height:1.7;">' +
              t("memory_had_similar") + ' <strong style="color:#9f7aea;">' + memory.timeAgo + '</strong>.<br>' +
              t("memory_recovered_in") + ' <strong style="color:#4caf87;">' + memory.daysToRecover + ' ' + pluralDays(memory.daysToRecover) + '</strong> ' + t("memory_state_improved") + '.' +
            '</div>' +
            '<div style="margin-top:12px;font-size:13px;color:#9f7aea;line-height:1.5;">💜 ' + t("memory_its_temporary") + '</div>' +
          '</div>' +
        '</div>';
    }
  }

  const yearComparisonHTML = buildYearComparisonBlock();

  // Period selector HTML
  const periodSelectorHTML = 
    '<div class="period-selector" style="display:flex;gap:8px;margin-bottom:16px;justify-content:center;">' +
      '<button class="period-btn' + (selectedTimeRange === 'week' ? ' active' : '') + '" data-period="week" style="padding:8px 16px;border:none;border-radius:12px;background:' + (selectedTimeRange === 'week' ? '#4caf87' : 'rgba(232,237,230,0.9)') + ';color:' + (selectedTimeRange === 'week' ? 'white' : '#555') + ';font-size:13px;font-weight:600;cursor:pointer;">' + t("period_7d") + '</button>' +
      '<button class="period-btn' + (selectedTimeRange === 'month' ? ' active' : '') + '" data-period="month" style="padding:8px 16px;border:none;border-radius:12px;background:' + (selectedTimeRange === 'month' ? '#4caf87' : 'rgba(232,237,230,0.9)') + ';color:' + (selectedTimeRange === 'month' ? 'white' : '#555') + ';font-size:13px;font-weight:600;cursor:pointer;">' + t("period_30d") + '</button>' +
      '<button class="period-btn' + (selectedTimeRange === 'quarter' ? ' active' : '') + '" data-period="quarter" style="padding:8px 16px;border:none;border-radius:12px;background:' + (selectedTimeRange === 'quarter' ? '#4caf87' : 'rgba(232,237,230,0.9)') + ';color:' + (selectedTimeRange === 'quarter' ? 'white' : '#555') + ';font-size:13px;font-weight:600;cursor:pointer;">' + t("period_90d") + '</button>' +
      '<button class="period-btn' + (selectedTimeRange === 'year' ? ' active' : '') + '" data-period="year" style="padding:8px 16px;border:none;border-radius:12px;background:' + (selectedTimeRange === 'year' ? '#4caf87' : 'rgba(232,237,230,0.9)') + ';color:' + (selectedTimeRange === 'year' ? 'white' : '#555') + ';font-size:13px;font-weight:600;cursor:pointer;">' + t("period_365d") + '</button>' +
    '</div>';

  // ПРАВИЛА ОТОБРАЖЕНИЯ ПРАКТИК
  const practicesHTML = activePractices.length > 0 ? (
    '<div class="insight-section">' +
      '<div class="insight-section-title">' + t("practices_eff") + '</div>' +
      periodSelectorHTML +
      activePractices.map(function(p) {
        const cardData = formatPracticeCard(p.key, practiceData);
        
        // Цвет для основного значения
        let valueColor = '#888';
        if (cardData.mainDisplay.type === 'improving') valueColor = '#4caf87';
        else if (cardData.mainDisplay.type === 'declining') valueColor = '#e05555';
        else if (cardData.mainDisplay.type === 'stable') valueColor = '#7b4fa0';
        else if (cardData.mainDisplay.type === 'good') valueColor = '#4caf87';
        else if (cardData.mainDisplay.type === 'mid') valueColor = '#7b4fa0';
        else if (cardData.mainDisplay.type === 'low') valueColor = '#e05555';
        
        // Цвет для подзаголовка сравнения
        let subtitleColor = '#888';
        if (cardData.comparisonDisplay.type === 'learning') subtitleColor = '#888';
        else if (cardData.comparisonDisplay.type === 'insufficient') subtitleColor = '#888';
        
        return '<div class="flip-wrap" id="flip-' + p.key + '">' +
          '<div class="flip-inner">' +
            '<div class="flip-front">' +
              '<div class="flip-label">' + p.icon + ' ' + practiceShortLabel(p.key) + '</div>' +
              '<div class="flip-value" style="color:' + valueColor + '">' + cardData.mainDisplay.value + '</div>' +
              (cardData.mainDisplay.subtitle ? '<div class="flip-sub" style="color:' + valueColor + '">' + cardData.mainDisplay.subtitle + '</div>' : '') +
              (cardData.comparisonDisplay.text ? '<div class="flip-sub" style="color:' + subtitleColor + ';font-size:11px;">' + cardData.comparisonDisplay.text + '</div>' : '') +
              '<div style="font-size:12px;color:#999;margin-top:4px;">' + cardData.sessionsText + '</div>' +
              '<div class="flip-hint">' + t("tap_for_details") + '</div>' +
            '</div>' +
            '<div class="flip-back"><canvas id="chart-' + p.key + '" width="150" height="150"></canvas></div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="insight-section">' +
      '<div class="insight-section-title">' + t("state_helps") + '</div>' +
      buildStateTable(activePractices, practiceData) +
    '</div>'
  ) : (
    '<div class="insight-section">' +
      '<div class="rec-card" style="text-align:center;color:#888;">' + t("no_sessions") + '</div>' +
    '</div>'
  );

  container.innerHTML =
    '<style>' +
    '.insight-section{margin-bottom:24px;}' +
    '.insight-section-title{font-size:13px;color:#888;font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;}' +
    '.flip-wrap{perspective:1000px;margin-bottom:12px;cursor:pointer;}' +
    '.flip-inner{position:relative;width:100%;transform-style:preserve-3d;transition:transform 0.5s ease;border-radius:18px;}' +
    '.flip-wrap.flipped .flip-inner{transform:rotateY(180deg);}' +
    '.flip-front,.flip-back{backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:18px;padding:16px;box-sizing:border-box;background:rgba(232,237,230,0.9);box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;}' +
    '.flip-front{position:relative;}' +
    '.flip-back{position:absolute;top:0;left:0;width:100%;height:100%;transform:rotateY(180deg);display:flex;align-items:center;justify-content:center;flex-direction:column;}' +
    '.flip-label{font-size:12px;color:#999;margin-bottom:4px;}' +
    '.flip-value{font-size:28px;font-weight:700;color:#3a3530;}' +
    '.flip-sub{font-size:13px;color:#777;margin-top:4px;}' +
    '.flip-hint{font-size:11px;color:#4caf87;font-weight:600;text-align:right;margin-top:8px;}' +
    '.rec-card{padding:16px;border-radius:18px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;margin-bottom:12px;}' +
    '.state-row{display:flex;align-items:center;gap:6px;padding:10px 12px;border-radius:12px;background:rgba(232,237,230,0.9);box-shadow:3px 3px 7px #b8c4b4,-3px -3px 7px #ffffff;margin-bottom:8px;font-size:13px;color:#555;}' +
    '.state-cell{flex:1;text-align:center;font-weight:600;font-size:13px;}' +
    '.state-name{flex:2;font-size:13px;}' +
    '.state-header{display:flex;align-items:center;gap:6px;padding:0 12px 6px;font-size:11px;color:#aaa;}' +
    '.state-header-name{flex:2;}' +
    '.state-header-cell{flex:1;text-align:center;}' +
    '</style>' +

    '<div style="padding:4px 0 100px 0;">' +
      '<h2 style="margin-bottom:6px;">' + t("insight_title") + '</h2>' +
      '<div style="font-size:13px;color:#888;margin-bottom:20px;">' + t("current_state") + ': <strong style="color:#3a3530;">' + stateLabelTr + '</strong></div>' +

      memoryBlockHTML +

      '<div class="insight-section">' +
        '<div class="insight-section-title">' + t("personal_rec") + '</div>' +
        '<div class="rec-card"><div style="font-size:15px;color:#444;line-height:1.5;">' + recommendation + '</div></div>' +
      '</div>' +

      '<div class="insight-section">' +
        '<div class="insight-section-title">' + t("key_metrics") + '</div>' +

        '<div class="flip-wrap" id="flip-stability">' +
          '<div class="flip-inner">' +
            '<div class="flip-front">' +
              '<div class="flip-label">' + t("stability_lbl") + '</div>' +
              '<div class="flip-value" style="color:' + sColor(stability) + '">' + (stability !== null ? stability : formatInsightValue(null)) + '%</div>' +
              '<div class="flip-sub">' + sText(stability) + '</div>' +
              '<div class="flip-hint">' + t("tap_for_details") + '</div>' +
            '</div>' +
            '<div class="flip-back"><canvas id="chartStability" style="width:100%;height:160px;"></canvas></div>' +
          '</div>' +
        '</div>' +

        '<div class="flip-wrap" id="flip-mood">' +
          '<div class="flip-inner">' +
            '<div class="flip-front">' +
              '<div class="flip-label">' + t("avg_mood_lbl") + '</div>' +
              '<div class="flip-value" style="color:' + mColor(avgMood) + '">' + avgMood + '%</div>' +
              '<div class="flip-sub">' + mText(avgMood) + '</div>' +
              '<div class="flip-hint">' + t("tap_for_details") + '</div>' +
            '</div>' +
            '<div class="flip-back"><canvas id="chartMood" style="width:100%;height:160px;"></canvas></div>' +
          '</div>' +
        '</div>' +

        '<div class="flip-wrap" id="flip-trend">' +
          '<div class="flip-inner">' +
            '<div class="flip-front">' +
              '<div class="flip-label">' + t("trend_lbl") + '</div>' +
              '<div class="flip-value" style="font-size:20px;color:#3a3530;">' + trendLabel(trend) + '</div>' +
              '<div class="flip-sub">' + t("trend_sub") + '</div>' +
              '<div class="flip-hint">' + t("tap_for_details") + '</div>' +
            '</div>' +
            '<div class="flip-back" style="padding:20px;">' +
              '<div style="font-size:15px;color:#555;text-align:center;line-height:1.6;">' + trendExplain(trend) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="flip-wrap" id="flip-golden">' +
          '<div class="flip-inner">' +
            '<div class="flip-front">' +
              '<div class="flip-label">' + t("golden_lbl") + '</div>' +
              '<div class="flip-value" style="font-size:18px;">⭐ ' + (golden ? goldenShort(golden) : formatInsightValue(null)) + '</div>' +
              '<div class="flip-sub">' + t("golden_sub") + '</div>' +
              '<div class="flip-hint">' + t("tap_for_details") + '</div>' +
            '</div>' +
            '<div class="flip-back"><canvas id="chartHours" style="width:100%;height:160px;"></canvas></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      yearComparisonHTML +
      practicesHTML +

    '</div>';

  document.querySelectorAll(".flip-wrap").forEach(function(wrap) {
    wrap.addEventListener("click", function() {
      const wasFlipped = wrap.classList.contains("flipped");
      document.querySelectorAll(".flip-wrap").forEach(function(w) { w.classList.remove("flipped"); });
      if (!wasFlipped) {
        wrap.classList.add("flipped");
        const front = wrap.querySelector(".flip-front");
        const inner = wrap.querySelector(".flip-inner");
        if (front && inner) inner.style.minHeight = front.offsetHeight + "px";
        setTimeout(function() { initChartFor(wrap.id, history, stats, practiceData); }, 320);
      }
    });
  });

  // Period selector handlers
  document.querySelectorAll(".period-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      const period = btn.getAttribute("data-period");
      if (period && TIME_HORIZONS[period]) {
        selectedTimeRange = period;
        localStorage.setItem("insight_period", period);
        onEnter();
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
      pts.push({label:d.getDate()+"."+( d.getMonth()+1),value:st});
    }
    new Chart(c,{type:"line",data:{labels:pts.map(function(p){return p.label;}),datasets:[{data:pts.map(function(p){return p.value;}),borderColor:"#4caf87",backgroundColor:"rgba(76,175,135,0.12)",tension:0.4,pointRadius:3,fill:true}]},options:lineOpts});
  }
  if (id === "flip-mood") {
    destroyChart("chartMood");
    const c = document.getElementById("chartMood"); if (!c) return;
    c.width = c.parentElement.offsetWidth - 16;
    const daily = buildDailyMood(history);
    new Chart(c,{type:"line",data:{labels:daily.map(function(d){return d.date.slice(5);}),datasets:[{data:daily.map(function(d){return d.avg;}),borderColor:"#4db8ff",backgroundColor:"rgba(77,184,255,0.12)",tension:0.4,pointRadius:3,fill:true}]},options:lineOpts});
  }
  if (id === "flip-golden") {
    destroyChart("chartHours");
    const c = document.getElementById("chartHours"); if (!c) return;
    c.width = c.parentElement.offsetWidth - 16;
    const hours={};
    history.forEach(function(e){const h=new Date(e.time).getHours();if(!hours[h])hours[h]={total:0,count:0};hours[h].total+=e.value;hours[h].count++;});
    const labels=Object.keys(hours).sort(function(a,b){return a-b;});
    const data=labels.map(function(h){return Math.round(hours[h].total/hours[h].count);});
    new Chart(c,{type:"bar",data:{labels:labels.map(function(h){return h+":00";}),datasets:[{data:data,backgroundColor:data.map(function(v){return v>=70?"#4caf87":v>=40?"#f0a500":"#e05555";}),borderRadius:6}]},options:lineOpts});
  }

  const practiceKey = id.replace("flip-", "");
  if (practiceData[practiceKey]) {
    const canvasId = "chart-" + practiceKey;
    destroyChart(canvasId);
    const rate = practiceData[practiceKey].rate !== null ? practiceData[practiceKey].rate : 0;
    const colors = {
      "breathing":    "#4db8ff",
      "meditation":   "#9f7aea",
      "visual-focus": "#4caf87",
      "mind-dump":    "#f0a500",
      "tap-calm":     "#e05555",
      "support_texts":"#f59e0b",
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
    plugins:[{id:"ct",afterDraw:function(chart){
      const ctx=chart.ctx, chartArea=chart.chartArea;
      const width=chartArea.width, height=chartArea.height;
      const left=chartArea.left, top=chartArea.top;
      ctx.save(); ctx.font="bold 20px sans-serif"; ctx.fillStyle="#3a3530";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText((rate !== null ? rate : 0)+"%", left+width/2, top+height/2); ctx.restore();
    }}]
  });
}

function buildStateTable(activePractices, practiceData) {
  const states = ["LOW","STRESSED","NEUTRAL","GOOD","HIGH"];
  const activeStates = states.filter(function(state) {
    return activePractices.some(function(p) { return practiceData[p.key].byState[state]; });
  });
  if (!activeStates.length) {
    return '<div style="color:#888;font-size:14px;">' + t("no_state_data") + '</div>';
  }
  const groups = [];
  for (let i = 0; i < activePractices.length; i += 3) {
    groups.push(activePractices.slice(i, i + 3));
  }
  return groups.map(function(group) {
    return '<div style="margin-bottom:16px;overflow-x:auto;">' +
      '<div class="state-header">' +
        '<div class="state-header-name">' + t("state_col") + '</div>' +
        group.map(function(p) { return '<div class="state-header-cell">' + p.icon + '</div>'; }).join('') +
      '</div>' +
      activeStates.map(function(state) {
        return '<div class="state-row">' +
          '<div class="state-name">' + t("state_"+state.toLowerCase()) + '</div>' +
          group.map(function(p) {
            const d = practiceData[p.key].byState[state];
            return '<div class="state-cell" style="color:' + rColor(d ? d.rate : null) + '">' + (d ? d.rate+"%" : "—") + '</div>';
          }).join('') +
        '</div>';
      }).join('') +
    '</div>';
  }).join('');
}

document.addEventListener("languageChanged", () => { onEnter(); });
