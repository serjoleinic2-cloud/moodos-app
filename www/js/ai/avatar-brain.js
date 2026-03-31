/**
 * avatar-brain.js — Neyra Avatar Brain
 * Реактивный слой для Avatar
 * Генерирует сообщения на основе состояния системы
 * 
 * ПРИОРИТЕТ: mood > analytics result
 */

import { t } from '../i18n.js';

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
