// ⚠️ Использовать только через SystemCore
// ===============================
// Neyra Insight Engine
// Объяснения состояния, прогнозы, микро-привычки
// ===============================
import { getMoodHistory, getSessionHistory } from "./memory.js";
import { getPatternSummary, hasEveningDip } from "./pattern-engine.js";
import { getResilienceSummary, getResilienceTrend } from "./resilience-engine.js";
import { getBestToolForState, getPersonalRecommendation } from "./session-analytics.js";
import { showAvatarForInsight } from "../avatar.js";
import { generateAvatarMessage, shouldShowAvatarInsight } from "../ai/avatar-brain.js";
import { getMedContext } from "./user-profile.js";
import { t } from "../i18n.js";

// ---- ОБЪЯСНЕНИЕ ТЕКУЩЕГО СОСТОЯНИЯ ----
export function explainCurrentState(currentMood) {
  const history = getMoodHistory();
  const reasons = [];

  if (history.length < 3) return [t('insight_exp_not_enough') || "Продолжай отслеживать — скоро появятся наблюдения."];

  const sorted    = [...history].sort((a, b) => b.time - a.time);
  const recent    = sorted.slice(0, 5);
  const avgRecent = recent.reduce((s, e) => s + e.value, 0) / recent.length;

  if (currentMood < avgRecent - 15) {
    reasons.push(t('insight_exp_dip') || "Сегодня чуть сложнее чем обычно — это нормально.");
  }

  const hour = new Date().getHours();
  if (hour >= 18 && currentMood < 50) {
    if (hasEveningDip()) {
      reasons.push(t('insight_exp_evening_pattern') || "Вечером у тебя обычно чуть тише — ты это уже знаешь о себе.");
    } else {
      reasons.push(t('insight_exp_evening') || "К вечеру энергия естественно снижается — это физиология.");
    }
  }

  const lastThreeDays = sorted.filter(e => Date.now() - e.time < 3 * 24 * 3600000);
  if (lastThreeDays.length >= 3) {
    const avgThree = lastThreeDays.reduce((s, e) => s + e.value, 0) / lastThreeDays.length;
    if (avgThree < 50) reasons.push(t('insight_exp_tired') || "Последние дни требовали усилий — дай себе восстановиться.");
  }

  const sessions    = getSessionHistory();
  const lastSession = sessions.sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!lastSession || Date.now() - lastSession.timestamp > 3 * 24 * 3600000) {
    reasons.push(t('insight_exp_no_practice') || "Практика помогает — попробуй уделить себе несколько минут.");
  }

  if (!reasons.length) {
    reasons.push(currentMood >= 60
      ? (t('insight_exp_stable_good') || "Состояние стабильное — хороший знак.")
      : (t('insight_exp_stable') || "Обычные колебания — ты справляешься.")
    );
  }

  const medContext = getMedContext();
  if (medContext) reasons.push(medContext);

return reasons;
}

// ---- ПРОГНОЗ НА СЕГОДНЯ ----
export function getTodayForecast() {
  const history = getMoodHistory();
  if (history.length < 7) return null;

  const patterns = getPatternSummary();
  const now      = new Date();
  const today    = now.getDay();
  const hour     = now.getHours();
  const lines    = [];

  if (patterns.bestDay !== null && patterns.bestDay === today) {
    lines.push(t('forecast_best_day') || "Сегодня обычно твой хороший день");
  }

  if (patterns.eveningDip && hour < 17) {
    lines.push(t('forecast_evening_dip') || "Вечером возможно снижение — запланируй практику заранее");
  }

  if (patterns.bestHour !== null && Math.abs(patterns.bestHour - hour) <= 1) {
    lines.push(
      (t('forecast_peak_hour') || "Сейчас твоё пиковое время (около {h}:00)")
        .replace('{h}', patterns.bestHour)
    );
  }

  const sorted  = [...history].sort((a, b) => b.time - a.time);
  const recent3 = sorted.filter(e => Date.now() - e.time < 3 * 24 * 3600000);
  if (recent3.length >= 2) {
    const avg3      = recent3.reduce((s, e) => s + e.value, 0) / recent3.length;
    const globalAvg = history.reduce((s, e) => s + e.value, 0) / history.length;
    if (avg3 < globalAvg - 10) {
      lines.push(t('forecast_harder_days') || "Последние дни чуть сложнее — продолжай замечать себя");
    }
  }

  if (!lines.length) return t('forecast_normal') || "День выглядит обычным по твоей истории.";
  return lines.join(". ") + ".";
}

// ---- ЭМОЦИОНАЛЬНАЯ АМНЕЗИЯ ----
export function getAmnesiaReminder(currentMood) {
  const history = getMoodHistory();
  if (history.length < 14) return null;

  const sorted   = [...history].sort((a, b) => a.time - b.time);
  const now      = Date.now();
  const oneMonth = 30 * 24 * 3600000;

  const similar = sorted.filter(e =>
    Math.abs(e.value - currentMood) <= 10 && now - e.time > oneMonth
  );
  if (!similar.length) return null;

  const pastEntry = similar[similar.length - 1];

  const afterPast = sorted.filter(e =>
    e.time > pastEntry.time &&
    e.time < pastEntry.time + 14 * 24 * 3600000 &&
    e.value > pastEntry.value + 15
  );
  if (!afterPast.length) return null;

  return {
    daysAgo:      Math.round((now - pastEntry.time) / (24 * 3600000)),
    daysToRecover: Math.round((afterPast[0].time - pastEntry.time) / (24 * 3600000)),
    pastMood:     pastEntry.value,
    recoveredTo:  afterPast[0].value
  };
}

// ---- МИКРО-ПРИВЫЧКИ ----
export function getMicroHabit(currentState) {
  const patterns = getPatternSummary();
  const bestTool = getBestToolForState(currentState);
  const hour     = new Date().getHours();

  const toolNames = () => ({
    "breathing":      t("tools_breathing").replace(/^[^\s]+\s/, ""),
    "meditation":     t("tools_meditation").replace(/^[^\s]+\s/, ""),
    "visual-focus":   t("tools_visual").replace(/^[^\s]+\s/, ""),
    "mind-dump":      t("tools_mind").replace(/^[^\s]+\s/, ""),
    "tap-calm":       t("tools_tap").replace(/^[^\s]+\s/, ""),
    "support_texts":  t("support_texts_title").replace(/^[^\s]+\s/, "")
  });

  if (bestTool) {
    const name = toolNames()[bestTool] || bestTool;
    return t('insight_micro_best')?.replace('{tool}', name)
      || `${name} — это твой лучший инструмент прямо сейчас`;
  }

  if (patterns.eveningDip && hour >= 15 && hour <= 17) {
    return t('insight_micro_evening') || "Сейчас хороший момент для короткой практики";
  }

  if (patterns.bestBreathTime) {
    return (t('insight_micro_breath_time') || "Дыхание лучше работает у тебя {time}")
      .replace('{time}', patterns.bestBreathTime);
  }

  return getPersonalRecommendation(currentState);
}

// ---- ПОДДЕРЖКА: ТЕКСТЫ ----
export function getSupportTextInsight(result, category) {
  if (result === 'positive') {
    const categoryNames = {
      "calm": "тексты спокойствия",
      "affirmations": "аффирмации",
      "prayer": "молитвы"
    };
    return `Тебе помогают ${categoryNames[category] || 'тексты поддержки'} — используй их, когда нужно.`;
  } else {
    return "Тексты помогают не всегда — в следующий раз попробуй активные практики: дыхание или медитацию.";
  }
}

// ---- ПОЛНЫЙ ИНСАЙТ ----
export function getFullInsight(currentMood, currentState) {
  const resilience = getResilienceSummary();
  const trend      = getResilienceTrend();

  return {
    reasons:        explainCurrentState(currentMood),
    forecast:       getTodayForecast(),
    amnesia:        getAmnesiaReminder(currentMood),
    microHabit:     getMicroHabit(currentState),
    resilience,
    trendDirection: trend ? trend.direction : "stable"
  };
}

export async function generate(currentState) {
  let result;
  
  if (currentState?.type === 'practice' && currentState?.source === 'support_texts') {
    result = {
      insight: getSupportTextInsight(currentState.result, currentState.source),
      type: 'practice',
      result: currentState.result,
      practice: currentState.source
    };
  } else if (currentState?.type === 'support_text' || currentState?.source === 'support_texts') {
    result = {
      insight: getSupportTextInsight(currentState.result, currentState.category || currentState.source),
      type: 'support_text',
      result: currentState.result,
      practice: currentState.source
    };
  } else {
    const explanation = explainCurrentState()
    const full = getFullInsight(null, currentState)
    result = { explanation, full }
  }
  
  if (shouldShowAvatarInsight(result)) {
    const avatarMessage = generateAvatarMessage({
      mood: currentState?.mood,
      insight: result.insight,
      result: result.result,
      practice: result.practice
    });
    if (avatarMessage) {
      showAvatarForInsight();
    }
    
    if (window.SystemCore) {
      window.SystemCore.dispatch('AVATAR_UPDATE', result);
    }
  }
  
  return result;
}