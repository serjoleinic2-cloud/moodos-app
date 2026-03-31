// =====================================
// Neyra Weekly Analytics
// Недельные сводки для быстрой аналитики
// =====================================
// Структура блока:
// {
//   weekKey:       "2026-W12",       // год + номер недели
//   weekStart:     1741824000000,    // timestamp понедельника
//   weekEnd:       1742428799000,    // timestamp воскресенья
//   averageMood:   68,               // среднее настроение
//   minMood:       42,               // минимум
//   maxMood:       91,               // максимум
//   entries:       14,               // количество замеров
//   activeDays:    5,                // дней с хотя бы одной записью
//   dominantState: "GOOD",           // самое частое состояние
//   sessions:      3,                // количество практик
//   updatedAt:     1742000000000     // когда последний раз обновлялся
// }

import { getMoodHistory, getSessionHistory } from "./memory.js";

const LS_KEY = "weekly_history";

// ─── Вспомогательные ──────────────────────────────────────────

function getWeekKey(date) {
  const d    = new Date(date);
  const year = d.getFullYear();
  // ISO номер недели
  const jan1     = new Date(year, 0, 1);
  const weekNum  = Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekBounds(date) {
  const d   = new Date(date);
  const day = d.getDay(); // 0=вс, 1=пн...
  const diff = (day === 0 ? -6 : 1 - day); // сдвиг до понедельника
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.getTime(), end: sunday.getTime() };
}

function getDominantState(entries) {
  if (!entries.length) return "NEUTRAL";
  const counts = {};
  entries.forEach(e => {
    const s = e.state || "NEUTRAL";
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

// ─── Чтение / запись ──────────────────────────────────────────

export function getWeeklyHistory() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    localStorage.removeItem(LS_KEY);
    return [];
  }
}

export function saveWeeklyHistory(blocks) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(blocks));
  } catch(e) {
    console.warn("saveWeeklyHistory failed:", e.message);
  }
}

// ─── Генерация блока для конкретной недели ────────────────────

function buildWeekBlock(weekKey, moodEntries, sessionEntries) {
  if (!moodEntries.length) return null;

  const values = moodEntries.map(e => e.value);
  const avg    = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const min    = Math.min(...values);
  const max    = Math.max(...values);

  // Уникальные дни с записями
  const days = new Set(moodEntries.map(e => new Date(e.time).toDateString()));

  const { start, end } = getWeekBounds(moodEntries[0].time);

  return {
    weekKey,
    weekStart:     start,
    weekEnd:       end,
    averageMood:   avg,
    minMood:       min,
    maxMood:       max,
    entries:       moodEntries.length,
    activeDays:    days.size,
    dominantState: getDominantState(moodEntries),
    sessions:      sessionEntries.length,
    updatedAt:     Date.now(),
  };
}

// ─── Главная функция: обновить недельные блоки ────────────────

/**
 * Пересчитывает недельные блоки на основе mood_history и session_history.
 * Вызывать при каждом запуске приложения (тихо, в фоне).
 * Обновляет только текущую и прошлую неделю — не пересчитывает всё.
 */
export function updateWeeklyBlocks() {
  try {
    const moodHistory    = getMoodHistory();
    const sessionHistory = getSessionHistory();

    if (!moodHistory.length) return;

    // Группируем mood по неделям
    const moodByWeek = {};
    moodHistory.forEach(e => {
      const key = getWeekKey(e.time);
      if (!moodByWeek[key]) moodByWeek[key] = [];
      moodByWeek[key].push(e);
    });

    // Группируем sessions по неделям
    const sessionsByWeek = {};
    sessionHistory.forEach(e => {
      const key = getWeekKey(e.timestamp || e.time || Date.now());
      if (!sessionsByWeek[key]) sessionsByWeek[key] = [];
      sessionsByWeek[key].push(e);
    });

    // Загружаем существующие блоки
    const existing = getWeeklyHistory();
    const blockMap  = {};
    existing.forEach(b => { blockMap[b.weekKey] = b; });

    // Текущая и прошлая неделя — всегда пересчитываем
    const currentWeek = getWeekKey(Date.now());
    const lastWeekDate = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lastWeek     = getWeekKey(lastWeekDate);
    const alwaysUpdate = new Set([currentWeek, lastWeek]);

    // Обновляем блоки
    Object.keys(moodByWeek).forEach(weekKey => {
      // Пропускаем старые недели если блок уже есть и не нужно обновлять
      if (blockMap[weekKey] && !alwaysUpdate.has(weekKey)) return;

      const block = buildWeekBlock(
        weekKey,
        moodByWeek[weekKey],
        sessionsByWeek[weekKey] || []
      );
      if (block) blockMap[weekKey] = block;
    });

    // Сортируем по дате и сохраняем
    const sorted = Object.values(blockMap).sort((a, b) => a.weekStart - b.weekStart);
    saveWeeklyHistory(sorted);

  } catch(e) {
    console.warn("updateWeeklyBlocks error:", e.message);
  }
}

// ─── Запросы к недельным данным ───────────────────────────────

/**
 * Последние N недельных блоков.
 */
export function getRecentWeeks(n = 8) {
  const blocks = getWeeklyHistory();
  return blocks.slice(-n);
}

/**
 * Блок для конкретной недели (по дате).
 */
export function getWeekBlock(date = Date.now()) {
  const key    = getWeekKey(date);
  const blocks = getWeeklyHistory();
  return blocks.find(b => b.weekKey === key) || null;
}

/**
 * Сравнение текущей недели с той же неделей год назад.
 * Используется для Year Pattern Comparison (Feature 4).
 */
export function getYearComparison() {
  const now         = Date.now();
  const oneYearAgo  = now - 365 * 24 * 60 * 60 * 1000;
  const currentWeek = getWeekBlock(now);
  const lastYearWeek = getWeekBlock(oneYearAgo);

  if (!currentWeek && !lastYearWeek) return null;

  return {
    current:     currentWeek,
    lastYear:    lastYearWeek,
    improvement: currentWeek && lastYearWeek
      ? currentWeek.averageMood - lastYearWeek.averageMood
      : null,
  };
}

/**
 * Тренд по последним 4 неделям.
 * Возвращает: "up" | "down" | "stable" | null
 */
export function getWeeklyTrend() {
  const recent = getRecentWeeks(4);
  if (recent.length < 2) return null;

  const first = recent[0].averageMood;
  const last  = recent[recent.length - 1].averageMood;
  const diff  = last - first;

  if (diff > 3)  return "up";
  if (diff < -3) return "down";
  return "stable";
}
