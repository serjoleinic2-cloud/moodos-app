/**
 * SYSTEM CORE — SINGLE ENTRY POINT
 *
 * Все изменения state, memory и запуск engines
 * ДОЛЖНЫ проходить только через SystemCore.
 *
 * Запрещено:
 * - вызывать engines напрямую из UI
 * - изменять state вне SystemCore
 * - писать в memory вне SystemCore
 */

// system-core.js — Orchestrator

import { update, getMood } from './state.js'
import * as StateEngine from './services/state-engine.js'
import * as InsightEngine from './services/insight-engine.js'
import * as PatternEngine from './services/pattern-engine.js'
import * as ResilienceEngine from './services/resilience-engine.js'
import * as Memory from './services/memory.js'
import { showAvatarForMood, showAvatar } from './avatar.js'
import { t } from './i18n.js'
import { analyzeText } from './ai/offline-ai.js'
import { saveVoiceNote } from './services/memory.js'
import { scheduleCloudSync } from './services/cloud-sync.js'

const SystemCore = {

  processingEvents: new Set(),

  async handleMoodFlow(payload) {
    const mood = typeof payload === 'object' ? payload.mood : payload;
    const events = typeof payload === 'object' ? (payload.events || []) : [];
    
    console.log('[DEBUG EVENTS]', { mood, events });

    try {

      const stateResult = await StateEngine.analyze(mood)
      const newState = update({
        mood,
        ...stateResult
      })

      const insights = await InsightEngine.generate(newState)
      const patterns = await PatternEngine.detect(newState)
      const resilience = await ResilienceEngine.evaluate(newState)

      Memory.save({
        mood,
        state: newState,
        insights,
        patterns,
        resilience,
        events
      })

      return {
        state: newState,
        insights,
        patterns,
        resilience,
        events
      }

    } catch (error) {

      console.error('Mood flow error:', error)

      return {
        error: true,
        message: error.message
      }
    }
  },

  async analyzeMood(mood) {
    return await StateEngine.analyze(mood)
  },

  async analyzeMoodOnly(mood) {
    try {
      const stateResult = await StateEngine.analyze(mood)
      return stateResult
    } catch (error) {
      console.error('analyzeMoodOnly error:', error)
      return null
    }
  },

  async getInsight(state) {
    try {
      return await InsightEngine.generate(state)
    } catch (error) {
      console.error('getInsight error:', error)
      return null
    }
  },

  async getPatterns(state) {
    try {
      return await PatternEngine.detect(state)
    } catch (error) {
      console.error('getPatterns error:', error)
      return null
    }
  },

  async getResilience(state) {
    try {
      return await ResilienceEngine.evaluate(state)
    } catch (error) {
      console.error('getResilience error:', error)
      return null
    }
  },

  saveEvent(data) {
    if (data.type === 'note') {
      const history = Memory.getNotesHistory();
      history.push({
        text: data.text,
        mood: data.mood,
        result: data.result,
        time: Date.now(),
        timestamp: Date.now()
      });
      if (history.length > 500) history.splice(0, history.length - 500);
      Memory.saveNotesHistory(history);
    }
  },

  async dispatch(event, payload) {
    console.log('[SYSTEM] dispatch:', event, payload);

    if (this.processingEvents.has(event)) {
      console.warn('[SYSTEM] Blocked duplicate event:', event)
      return { duplicate: true }
    }

    this.processingEvents.add(event)

    let result = null

    try {

      switch (event) {

        case 'MOOD_SUBMIT':
          console.log('[AVATAR DEBUG] MOOD_SUBMIT with payload:', payload);
          const moodValue = typeof payload === 'object' ? payload.mood : payload;
          result = await this.handleMoodFlow(payload)
          showAvatarForMood(moodValue)
          scheduleCloudSync()
          break

        case 'SAVE_NOTE':
          if (payload?.type === 'reflection') {
            const { saveReflection } = await import('./services/memory.js');
            saveReflection({
              text: payload.text,
              mood: payload.mood,
              time: payload.time || Date.now()
            });
            result = { success: true };
          } else {
            result = await this.saveEvent({
              type: 'note',
              ...payload
            })
          }
          scheduleCloudSync()
          break

        case 'SAVE_REFLECTION':
          console.log('[SYSTEM] SAVE_REFLECTION payload:', payload);
          if (payload?.text) {
            const { saveReflection } = await import('./services/memory.js');
            saveReflection({
              text: payload.text,
              mood: payload.mood,
              time: payload.time
            });
          }
          result = { success: true };
          scheduleCloudSync()
          break

        case 'AVATAR_UPDATE':
          console.log('[AVATAR] AVATAR_UPDATE event:', payload);
          if (payload?.text) {
            showAvatar({
              text: payload.text,
              source: payload.source || 'system',
              force: true
            });
          }
          result = { success: true };
          break

        case 'AVATAR_TEST':
          console.log('[AVATAR DEBUG] AVATAR_TEST event');
          showAvatar({
            text: 'Тестовая реакция 👀',
            source: 'test',
            force: true
          });
          result = { success: true };
          break

        case 'AVATAR_TAP':
          console.log('[AVATAR DEBUG] AVATAR_TAP event');
          showAvatar({
            text: this.getTapMessage(),
            source: 'tap',
            force: true
          });
          result = { success: true };
          break

        case 'VOICE_START':
          console.log('[VOICE] Voice recording started');
          result = { success: true };
          break

        case 'VOICE_SAVE':
          console.log('[VOICE] Saving voice note:', payload);
          if (payload && payload.audio) {
            saveVoiceNote({
              audio: payload.audio,
              duration: payload.duration || 0,
              mood: payload.mood || 50,
              date: payload.date || Date.now()
            });
            result = { success: true, saved: true };
          } else {
            result = { success: false, error: 'No audio data' };
          }
          scheduleCloudSync()
          break

        case 'REFLECTION_START':
          console.log('[REFLECTION] Daily reflection started');
          showAvatar({ 
            text: t('reflection_prompt') || 'Как твой день? Напиши несколько слов.', 
            source: 'reflection', 
            force: true 
          });
          result = { success: true };
          break

        case 'GENERATE_INSIGHT':
          console.log('[INSIGHT] Generating insight for:', payload);
          const mood = getMood();
          const analysis = await StateEngine.analyze(mood);
          let insightResult;
          
          if (payload.type === 'note' && payload.text) {
            const textAnalysis = analyzeText(payload.text, payload.mood || mood);
            insightResult = {
              insight: textAnalysis.insight,
              emotion: textAnalysis.emotion
            };
            if (insightResult?.insight) {
              Memory.save({ lastInsight: insightResult.insight });
            }
          } else if (payload.type === 'reflection') {
            return { success: true, insight: null };
          } else {
            insightResult = await InsightEngine.generate({
              type: payload.type,
              source: payload.source,
              result: payload.result,
              mood,
              state: analysis?.state
            });
            if (insightResult?.insight) {
              Memory.save({ lastInsight: insightResult.insight });
              showAvatar({
                text: insightResult.insight,
                source: 'insight',
                force: true
              });
            }
          }
          result = { success: true, insight: insightResult };
          break

        case 'USER_INACTIVE':
        case 'SCREEN_ENTER':
        case 'FIRST_OPEN_TODAY':
          console.log('[AVATAR DEBUG]', event, 'event received');
          showAvatar({
            text: this.getInactivityMessage(),
            source: event,
            force: true
          });
          result = { success: true };
          break

        default:
          console.warn('[SYSTEM] Unknown event:', event)
      }

      if (result?.error) {
        console.warn('[SYSTEM] Handled error in event:', event)
      }

    } finally {
      this.processingEvents.delete(event)
    }

    return result
  },

  getTapMessage() {
    const lang = localStorage.getItem('app_language') || 'ru';
    const msgs = {
      ru: ['Я здесь', 'Можешь продолжить', 'Попробуй ещё раз зафиксировать состояние'],
      en: ["I'm here", "You can continue", "Try to note your state again"],
      es: ["Estoy aquí", "Puedes continuar", "Intenta notar tu estado de nuevo"],
      uk: ["Я тут", "Можеш продовжити", "Спробуй ще раз зафіксувати стан"],
      hi: ["मैं यहां हूं", "आप जारी रख सकते हैं", "अपनी स्थिति फिर से नोट करने की कोशिश करें"]
    };
    const langMsgs = msgs[lang] || msgs.ru;
    return langMsgs[Math.floor(Math.random() * langMsgs.length)];
  },

  getInactivityMessage() {
    const lang = localStorage.getItem('app_language') || 'ru';
    const msgs = {
      ru: ['Я рядом, если что', 'Ты давно не заходил', 'Можешь зафиксировать состояние'],
      en: ["I'm here if you need", "You haven't been here for a while", "You can note your state"],
      es: ["Estoy aquí si necesitas", "Hace tiempo que no vienes", "Puedes anotar tu estado"],
      uk: ["Я поруч, якщо що", "Ти давно не заходив", "Можеш зафіксувати стан"],
      hi: ["ज़रूरत पड़ने पर मैं यहां हूं", "आप काफी समय से यहां नहीं आए", "आप अपनी स्थिति नोट कर सकते हैं"]
    };
    const langMsgs = msgs[lang] || msgs.ru;
    return langMsgs[Math.floor(Math.random() * langMsgs.length)];
  }

}

export default SystemCore
