// ===============================
// MoodOS Pattern Engine
// Поиск закономерностей и триггеров
// ===============================
import { getMoodHistory, getSessionHistory, getNotesHistory } from "./memory.js";

// ---- ЛУЧШЕЕ ВРЕМЯ ДНЯ ----
// Возвращает час суток с наивысшим средним настроением
export function getBestHourOfDay() {
  const history = getMoodHistory();
  if (history.length < 5) return null;

  const byHour = {};
  history.forEach(entry => {
    const h = new Date(entry.time).getHours();
    if (!byHour[h]) byHour[h] = { sum: 0, count: 0 };
    byHour[h].sum += entry.value;
    byHour[h].count++;
  });

  let bestHour = null;
  let bestAvg  = -1;
  Object.keys(byHour).forEach(h => {
    const avg = byHour[h].sum / byHour[h].count;
    if (avg > bestAvg) {
      bestAvg  = avg;
      bestHour = parseInt(h);
    }
  });

  return bestHour; // число 0-23
}

// ---- ЛУЧШИЙ ДЕНЬ НЕДЕЛИ ----
// Возвращает 0 (вс) – 6 (сб) с наивысшим средним настроением
export function getBestDayOfWeek() {
  const history = getMoodHistory();
  if (history.length < 7) return null;

  const byDay = {};
  history.forEach(entry => {
    const d = new Date(entry.time).getDay();
    if (!byDay[d]) byDay[d] = { sum: 0, count: 0 };
    byDay[d].sum += entry.value;
    byDay[d].count++;
  });

  let bestDay = null;
  let bestAvg = -1;
  Object.keys(byDay).forEach(d => {
    const avg = byDay[d].sum / byDay[d].count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestDay = parseInt(d);
    }
  });

  return bestDay;
}

// ---- ПАТТЕРН: ВЕЧЕРНЕЕ ПАДЕНИЕ ----
// Проверяет, падает ли настроение после 18:00
export function hasEveningDip() {
  const history = getMoodHistory();
  if (history.length < 10) return false;

  const morning = history.filter(e => {
    const h = new Date(e.time).getHours();
    return h >= 9 && h < 14;
  });
  const evening = history.filter(e => {
    const h = new Date(e.time).getHours();
    return h >= 18 && h < 23;
  });

  if (morning.length < 3 || evening.length < 3) return false;

  const avgMorning = morning.reduce((s, e) => s + e.value, 0) / morning.length;
  const avgEvening = evening.reduce((s, e) => s + e.value, 0) / evening.length;

  return avgEvening < avgMorning - 10; // падение больше 10 пунктов
}

// ---- ПАТТЕРН: НЕСТАБИЛЬНЫЕ ДНИ ----
// Возвращает % дней с высокой волатильностью (разброс > 30)
export function getVolatileDaysRate() {
  const history = getMoodHistory();
  if (history.length < 5) return null;

  const byDay = {};
  history.forEach(entry => {
    const d = new Date(entry.time).toDateString();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(entry.value);
  });

  const days     = Object.keys(byDay);
  const volatile = days.filter(d => {
    const vals = byDay[d];
    if (vals.length < 2) return false;
    return Math.max(...vals) - Math.min(...vals) > 30;
  });

  return Math.round((volatile.length / days.length) * 100);
}

// ---- ЭФФЕКТ ПРАКТИК ПО ВРЕМЕНИ ДНЯ ----
// Когда практики работают лучше всего
export function getBestPracticeTime(type) {
  const sessions = getSessionHistory().filter(s => s.type === type && s.result === "positive");
  if (sessions.length < 3) return null;

  const byPeriod = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const counts   = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  sessions.forEach(s => {
    const h = new Date(s.timestamp).getHours();
    let period;
    if (h >= 6  && h < 12) period = "morning";
    else if (h >= 12 && h < 17) period = "afternoon";
    else if (h >= 17 && h < 22) period = "evening";
    else period = "night";
    byPeriod[period]++;
    counts[period]++;
  });

  const best = Object.keys(byPeriod).reduce((a, b) =>
    byPeriod[a] > byPeriod[b] ? a : b
  );

  const labels = {
    morning:   "утром (6–12)",
    afternoon: "днём (12–17)",
    evening:   "вечером (17–22)",
    night:     "ночью"
  };

  return labels[best] || best;
}

// ---- ТРИГГЕРЫ ИЗ ЗАМЕТОК ----
// Ищет слова-паттерны которые коррелируют с низким настроением
export function getNoteTriggers() {
  const notes   = getNotesHistory();
  const history = getMoodHistory();
  if (notes.length < 5) return [];

  // Ключевые слова для поиска
  const keywords = [
    "кофе", "coffee",
    "сон", "sleep", "не спал", "мало сплю",
    "работа", "work", "дедлайн", "deadline",
    "один", "одна", "одиноко",
    "устал", "устала", "усталость",
    "тревог", "anxiety", "беспокой",
    "конфликт", "ссор", "поругал",
    "еда", "не ел", "голод",
  ];

  const results = [];

  keywords.forEach(keyword => {
    const matchingNotes = notes.filter(n =>
      (n.text || n.note || "").toLowerCase().includes(keyword)
    );
    if (matchingNotes.length < 2) return;

    // Среднее настроение в те дни когда есть это слово
    const avgMoodWithKeyword = matchingNotes.reduce((sum, note) => {
      const ts   = note.timestamp || note.time;
      const day  = new Date(ts).toDateString();
      const dayEntries = history.filter(e => new Date(e.time).toDateString() === day);
      if (!dayEntries.length) return sum;
      const avg = dayEntries.reduce((s, e) => s + e.value, 0) / dayEntries.length;
      return sum + avg;
    }, 0) / matchingNotes.length;

    // Общее среднее настроение
    if (!history.length) return;
    const globalAvg = history.reduce((s, e) => s + e.value, 0) / history.length;

    const diff = Math.round(avgMoodWithKeyword - globalAvg);
    if (diff < -5) {
      results.push({ keyword, diff, count: matchingNotes.length });
    }
  });

  return results.sort((a, b) => a.diff - b.diff).slice(0, 3);
}

// ---- СВОДКА ПАТТЕРНОВ ----
export function getPatternSummary() {
  return {
    bestHour:        getBestHourOfDay(),
    bestDay:         getBestDayOfWeek(),
    eveningDip:      hasEveningDip(),
    volatileRate:    getVolatileDaysRate(),
    noteTriggers:    getNoteTriggers(),
    bestBreathTime:  getBestPracticeTime("breathing"),
    bestMeditTime:   getBestPracticeTime("meditation"),
  };
}
