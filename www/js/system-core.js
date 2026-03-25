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

import { update } from './state.js'
import * as StateEngine from './services/state-engine.js'
import * as InsightEngine from './services/insight-engine.js'
import * as PatternEngine from './services/pattern-engine.js'
import * as ResilienceEngine from './services/resilience-engine.js'
import * as Memory from './services/memory.js'

const SystemCore = {

  processingEvents: new Set(),

  async handleMoodFlow(mood) {

    try {

      const stateResult = await StateEngine.analyze(mood)
      const newState = update(stateResult)

      const insights = await InsightEngine.generate(newState)
      const patterns = await PatternEngine.detect(newState)
      const resilience = await ResilienceEngine.evaluate(newState)

      Memory.save({
        mood,
        state: newState,
        insights,
        patterns,
        resilience
      })

      return {
        state: newState,
        insights,
        patterns,
        resilience
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
      Memory.saveNotesHistory(history);
    }
  },

  async dispatch(event, payload) {

    if (this.processingEvents.has(event)) {
      console.warn('Blocked duplicate event:', event)
      return null
    }

    this.processingEvents.add(event)

    let result = null

    try {

      switch (event) {

        case 'MOOD_SUBMIT':
          result = await this.handleMoodFlow(payload)
          break

        case 'SAVE_NOTE':
          result = await this.saveEvent({
            type: 'note',
            ...payload
          })
          break

        default:
          console.warn('Unknown event:', event)
      }

      if (result?.error) {
        console.warn('Handled error in event:', event)
      }

    } finally {
      this.processingEvents.delete(event)
    }

    return result
  }

}

export default SystemCore
