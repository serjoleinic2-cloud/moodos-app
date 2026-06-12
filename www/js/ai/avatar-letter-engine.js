// ============================================================
// avatar-letter-engine.js — Логика генерации и хранения писем
// ============================================================

import { triggerKeyMap } from './avatar-letters-ru.js';

async function getLettersForLang() {
  const lang = localStorage.getItem('app_language') || 'ru';
  try {
    const mod = await import(`./avatar-letters-${lang}.js`);
    return mod.letters;
  } catch (e) {
    const fallback = await import('./avatar-letters-ru.js');
    return fallback.letters;
  }
}

const LETTER_STORAGE_KEY = 'neyra_letters';
const LETTER_CHECK_KEY   = 'neyra_letter_last_check';
const CHECK_INTERVAL     = 1 * 24 * 60 * 60 * 1000; // 1 день

// ─── Сезон ───────────────────────────────────────────────────

function getSeason() {
  const m = new Date().getMonth(); // 0-11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'autumn'; // зима → используем autumn письма
}

// ─── Анализ истории ──────────────────────────────────────────

function getRecentTriggers(days = 5) {
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    const cutoff  = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent  = history.filter(e => (e.time || e.date) > cutoff);

    const counts = {};
    recent.forEach(entry => {
      (entry.events || []).forEach(ev => {
        counts[ev] = (counts[ev] || 0) + 1;
      });
    });

    // Сортируем по частоте
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);
  } catch (e) {
    return [];
  }
}

function getUsedLetterTypes(triggerKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(LETTER_STORAGE_KEY) || '[]');
    return stored
      .filter(l => l.trigger === triggerKey)
      .map(l => l.type);
  } catch (e) {
    return [];
  }
}

// ─── Выбор типа письма ───────────────────────────────────────

function pickLetterType(triggerKey) {
  const used    = getUsedLetterTypes(triggerKey);
  const season  = getSeason();
  const sitTypes = ['s1', 's2', 's3'];

  // Первый раз — всегда general
  if (!used.includes('general')) return 'general';

  // Сезонное если не показывалось в этом сезоне
  if (!used.includes(season)) return season;

  // Ситуационные которые ещё не показывались
  const unusedSit = sitTypes.filter(t => !used.includes(t));
  if (unusedSit.length > 0) {
    return unusedSit[Math.floor(Math.random() * unusedSit.length)];
  }

  // Все показаны — сбрасываем ситуационные и начинаем заново
  const allTypes = ['general', ...sitTypes, season];
  return allTypes[Math.floor(Math.random() * allTypes.length)];
}

// ─── Генерация письма ────────────────────────────────────────

export async function generateLetter() {
  const letters = await getLettersForLang();
  const triggers = getRecentTriggers(5);
  if (!triggers.length) return null;

  // Берём самый частый триггер для которого есть письма
  let triggerKey = null;
  for (const t of triggers) {
    const mapped = triggerKeyMap[t];
    if (mapped && letters[mapped]) {
      triggerKey = mapped;
      break;
    }
  }
  if (!triggerKey) return null;

  const type = pickLetterType(triggerKey);
  const text = letters[triggerKey][type];
  if (!text) return null;

  const lang = localStorage.getItem('app_language') || 'ru';
  const letter = {
    id:        Date.now(),
    trigger:   triggerKey,
    type,
    text,
    lang,
    season:    getSeason(),
    createdAt: Date.now(),
    read:      false,
  };

  saveLetter(letter);
  localStorage.setItem(LETTER_CHECK_KEY, String(Date.now()));
  return letter;
}

// ─── Проверка: пора ли писать новое письмо ───────────────────

export function shouldGenerateLetter() {
  const lastCheck = parseInt(localStorage.getItem(LETTER_CHECK_KEY) || '0');
  if (Date.now() - lastCheck < CHECK_INTERVAL) return false;

  // Есть ли непрочитанное НА ТЕКУЩЕМ языке — не спамим
  const currentLang = localStorage.getItem('app_language') || 'ru';
  const unread = getUnreadLetters().filter(l => (l.lang || 'ru') === currentLang);
  if (unread.length > 0) return false;

  // Есть ли вообще триггеры за последние 5 дней
  const triggers = getRecentTriggers(5);
  return triggers.length > 0;
}

// ─── Хранение ────────────────────────────────────────────────

function saveLetter(letter) {
  try {
    const stored = JSON.parse(localStorage.getItem(LETTER_STORAGE_KEY) || '[]');
    stored.unshift(letter); // новые сверху
    // Храним максимум 30 писем
    const trimmed = stored.slice(0, 30);
    localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[LETTERS] save error:', e);
  }
}

export function getAllLetters() {
  try {
    return JSON.parse(localStorage.getItem(LETTER_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function getUnreadLetters() {
  return getAllLetters().filter(l => !l.read);
}

export function markLetterRead(id) {
  try {
    const stored = JSON.parse(localStorage.getItem(LETTER_STORAGE_KEY) || '[]');
    const updated = stored.map(l => l.id === id ? { ...l, read: true } : l);
    localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[LETTERS] markRead error:', e);
  }
}

// ─── Инициализация — вызывать при старте приложения ──────────

export async function initLetterEngine() {
  // Если сменился язык и нет непрочитанных на новом языке — сбрасываем таймер
  // чтобы новое письмо сгенерировалось на текущем языке (история других языков сохраняется)
  const currentLang = localStorage.getItem('app_language') || 'ru';
  const storedLang  = localStorage.getItem('neyra_letter_lang') || 'ru';
  if (currentLang !== storedLang) {
    localStorage.setItem('neyra_letter_lang', currentLang);
    const unreadCurrent = getUnreadLetters().filter(l => (l.lang || 'ru') === currentLang);
    if (unreadCurrent.length === 0) {
      // Сбрасываем только таймер — история писем не трогается
      localStorage.removeItem(LETTER_CHECK_KEY);
    }
  }
  if (shouldGenerateLetter()) {
    await generateLetter();
  }
}
