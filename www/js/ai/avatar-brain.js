/**
 * avatar-brain.js — Neyra Avatar Brain
 * Реактивный слой для Avatar
 * Генерирует сообщения на основе состояния системы
 * 
 * ПРИОРИТЕТ: mood > analytics result
 */

import { t } from '../i18n.js';

const eventReactions = {
  ru: {
    alcohol:  ["Алкоголь отмечен — буду учитывать в паттерне", "Зафиксировал"],
    nature:   ["Природа — хороший выбор для восстановления", "Зафиксировал"],
    screen:   ["Много экранного времени — отмечено", "Зафиксировал"],
    period:   ["Зафиксировал — это важно для понимания паттернов", "Отмечено"],
    creative: ["Творчество отмечено — посмотрим как влияет", "Зафиксировал"],
  },
  en: {
    alcohol:  ["Alcohol noted — I'll factor this in", "Logged"],
    nature:   ["Nature — good choice for recovery", "Logged"],
    screen:   ["Screen time noted", "Logged"],
    period:   ["Noted — important for understanding your patterns", "Logged"],
    creative: ["Creative time noted — let's see how it affects you", "Logged"],
  },
  es: {
    alcohol:  ["Alcohol anotado — lo tendré en cuenta", "Registrado"],
    nature:   ["Naturaleza — buena elección para recuperarte", "Registrado"],
    screen:   ["Tiempo de pantalla anotado", "Registrado"],
    period:   ["Anotado — importante para entender tus patrones", "Registrado"],
    creative: ["Tiempo creativo anotado — veamos cómo te afecta", "Registrado"],
  },
  uk: {
    alcohol:  ["Алкоголь відмічено — врахую в паттерні", "Зафіксував"],
    nature:   ["Природа — гарний вибір для відновлення", "Зафіксував"],
    screen:   ["Багато екранного часу — відмічено", "Зафіксував"],
    period:   ["Зафіксував — це важливо для розуміння паттернів", "Відмічено"],
    creative: ["Творчість відмічено — подивимось як впливає", "Зафіксував"],
  }
};

export function generateAvatarMessage(data) {
  const { mood, insight, result, practice } = data;

  // ПРИОРИТЕТ 1: mood если есть
  if (mood != null) {
    if (mood >= 70) {
      return t('avatar_positive');
    }
    if (mood < 40) {
      return t('avatar_negative');
    }
  }

  // ПРИОРИТЕТ 2: result от практик
  if (result == null) {
    return t('avatar_no_data');
  }

  if (result > 0) {
    return t('avatar_positive');
  }

  if (result < 0) {
    return t('avatar_negative');
  }

  return t('avatar_neutral');
}

export function createAvatarUpdateEvent(insightResult) {
  if (!insightResult) return null;
  
  return {
    type: 'AVATAR_UPDATE',
    mood: insightResult.mood,
    insight: insightResult.insight,
    result: insightResult.result,
    practice: insightResult.practice,
    timestamp: Date.now()
  };
}

export function shouldShowAvatarInsight(insightResult) {
  if (!insightResult) return false;
  return insightResult.result != null || insightResult.insight;
}
