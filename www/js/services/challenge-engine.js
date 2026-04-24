// =====================================
// Neyra Challenge Engine
// Сегодняшний вызов — генерация локально
// =====================================
import { getPatternSummary } from './pattern-engine.js';
import { getMoodHistory, getSessionHistory } from './memory.js';
import { getProfile } from './user-profile.js';
import { t } from '../i18n.js';

const CHALLENGE_KEY = 'neyra_daily_challenge';

// =====================================
// ПОЛУЧИТЬ ИЛИ СГЕНЕРИРОВАТЬ ВЫЗОВ ДНЯ
// =====================================
export function getTodayChallenge() {
  const today = new Date().toDateString();
  const currentLang = localStorage.getItem('app_language') || 'ru';
  try {
    const saved = JSON.parse(localStorage.getItem(CHALLENGE_KEY) || 'null');
    // Пересоздаём если другой день ИЛИ сменился язык
    if (saved && saved.date === today && saved.lang === currentLang) return saved;
  } catch(e) {}

  const challenge = generateChallenge();
  challenge.date = today;
  challenge.lang = currentLang; // сохраняем язык генерации
  challenge.completed = false;
  challenge.completedAt = null;

  try {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenge));
  } catch(e) {}

  return challenge;
}

export function completeChallenge() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHALLENGE_KEY) || 'null');
    if (!saved) return;
    saved.completed = true;
    saved.completedAt = Date.now();
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(saved));

    // Увеличиваем счётчик для медалей
    const count = parseInt(localStorage.getItem('challenges_completed') || '0') + 1;
    localStorage.setItem('challenges_completed', String(count));
  } catch(e) {}
}

export function isChallengeCompleted() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHALLENGE_KEY) || 'null');
    const today = new Date().toDateString();
    return saved && saved.date === today && saved.completed === true;
  } catch(e) { return false; }
}

// =====================================
// ГЕНЕРАЦИЯ ВЫЗОВА ПО ПАТТЕРНАМ
// =====================================
function generateChallenge() {
  try {
    const patterns = getPatternSummary();
    const history = getMoodHistory();
    const sessions = getSessionHistory();
    const profile = getProfile();
    const hour = new Date().getHours();

    // Среднее настроение за последние 3 дня
    const recent = history
      .filter(e => Date.now() - e.time < 3 * 86400000)
      .map(e => e.value);
    const recentAvg = recent.length
      ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
      : 50;

    // Самая эффективная практика юзера
    const practiceCount = {};
    sessions.forEach(s => {
      if (s.type) practiceCount[s.type] = (practiceCount[s.type] || 0) + 1;
    });
    const topPractice = Object.keys(practiceCount)
      .sort((a, b) => practiceCount[b] - practiceCount[a])[0] || null;

    const practiceLabels = {
      'breathing':     () => t('challenge_do_breathing'),
      'meditation':    () => t('challenge_do_meditation'),
      'visual-focus':  () => t('challenge_do_visual'),
      'mind-dump':     () => t('challenge_do_minddump'),
      'tap-calm':      () => t('challenge_do_tap'),
      'support_texts': () => t('challenge_do_support'),
    };

    const pool = [];

    // 1. Вечернее падение — предупреди заранее
    if (patterns.eveningDip && hour >= 14 && hour < 18) {
      pool.push({
        type: 'practice',
        icon: '⏰',
        practice: 'breathing',
        textKey: 'challenge_evening_dip',
        deadline: '18:00',
        priority: 10,
      });
    }

    // 2. Лучшая практика юзера
    if (topPractice && practiceLabels[topPractice]) {
      pool.push({
        type: 'practice',
        icon: '⚡',
        practice: topPractice,
        textKey: 'challenge_top_practice_' + topPractice,
        priority: 8,
      });
    }

    // 3. Низкое настроение — предложи помощь
    if (recentAvg < 45) {
      pool.push({
        type: 'practice',
        icon: '💙',
        practice: 'support_texts',
        textKey: 'challenge_low_mood',
        priority: 9,
      });
    }

    // 4. Давно не было практик
    const lastSession = sessions.sort((a, b) => b.timestamp - a.timestamp)[0];
    const daysSinceSession = lastSession
      ? Math.floor((Date.now() - lastSession.timestamp) / 86400000)
      : 99;
    if (daysSinceSession >= 2) {
      pool.push({
        type: 'practice',
        icon: '🔄',
        practice: 'breathing',
        textKey: 'challenge_no_practice',
        priority: 7,
      });
    }

    // 5. Утренняя запись
    if (hour >= 6 && hour < 11) {
      pool.push({
        type: 'mood',
        icon: '🌅',
        textKey: 'challenge_morning_checkin',
        priority: 6,
      });
    }

    // 6. Вечерняя запись
    if (hour >= 20 && hour < 23) {
      pool.push({
        type: 'mood',
        icon: '🌙',
        textKey: 'challenge_evening_checkin',
        priority: 6,
      });
    }

    // 7. Принимает лекарства — проверь эффект
    if (profile?.takesMeds && profile.takesMeds !== 'нет' && profile.takesMeds !== 'не_скажу') {
      pool.push({
        type: 'awareness',
        icon: '💊',
        textKey: 'challenge_med_effect',
        priority: 5,
      });
    }

    // 8. Универсальные запасные
    const fallbacks = [
      { type: 'practice', icon: '🫁', practice: 'breathing', textKey: 'challenge_fallback_breathing', priority: 1 },
      { type: 'practice', icon: '🧘', practice: 'meditation', textKey: 'challenge_fallback_meditation', priority: 1 },
      { type: 'mood',     icon: '📝', textKey: 'challenge_fallback_note', priority: 1 },
    ];
    pool.push(...fallbacks);

    // Берём с наибольшим приоритетом
    pool.sort((a, b) => b.priority - a.priority);
    const chosen = pool[0];

    return {
      icon: chosen.icon,
      text: t(chosen.textKey) || chosen.textKey,
      type: chosen.type,
      practice: chosen.practice || null,
    };
  } catch(e) {
    return {
      icon: '🫁',
      text: t('challenge_fallback_breathing'),
      type: 'practice',
      practice: 'breathing',
    };
  }
}