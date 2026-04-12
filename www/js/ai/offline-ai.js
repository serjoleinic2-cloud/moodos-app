// ===============================
// Neyra Offline AI — Coach Logic
// 4 языка: RU, EN, ES, UK
// ===============================

import { getMoodHistory } from "../services/memory.js";
import { t as i18n } from "../i18n.js";
import { isPremium } from "../services/user-profile.js";

// ---- ОПРЕДЕЛЕНИЕ ЯЗЫКА ----
function detectLang() {
  const saved = localStorage.getItem("app_language");
  if (saved) return saved;
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("uk")) return "uk";
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("es")) return "es";
  return "en";
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMoodLevel(mood) {
  if (mood <= 30) return 'low';
  if (mood <= 70) return 'mid';
  return 'high';
}

function getBaseTexts(moodLevel) {
  const keys = [
    `insight_base_${moodLevel}_1`,
    `insight_base_${moodLevel}_2`,
    `insight_base_${moodLevel}_3`
  ];
  return keys.map(k => i18n(k)).filter(Boolean);
}

function getEventText(eventId) {
  return i18n(`insight_event_${eventId}`);
}

function getAdvice(moodLevel) {
  return i18n(`insight_advice_${moodLevel}`);
}

function getCombinationInsight(moodLevel, events) {
  if (events.includes('stress') && moodLevel === 'low') {
    return i18n('insight_combo_stress_low');
  }
  if (events.includes('walk') && moodLevel === 'high') {
    return i18n('insight_combo_walk_high');
  }
  if (events.includes('sport') && moodLevel === 'high') {
    return i18n('insight_combo_sport_high');
  }
  if (events.includes('work') && moodLevel === 'low') {
    return i18n('insight_combo_work_low');
  }
  return null;
}

// ---- PATTERN ANALYSIS ----
function getRecentHistory(days = 7) {
  const all = getMoodHistory();
  console.log('[AI INPUT]', all.slice(-10));
  const now = Date.now();
  return all.filter(item => {
    return now - item.time < days * 24 * 60 * 60 * 1000;
  });
}

const EVENT_WEIGHTS = {
  sleep: 1.2,
  walk: 1.1,
  sport: 1.3,
  music: 1.0,
  coffee: 0.9,
  food: 0.9,
  rest: 1.1,
  social: 1.1,
  work: 0.9,
  stress: 0.8
};

function calculateBaseline(history) {
  const recent = history.slice(-20);
  if (recent.length === 0) return 50;
  const sum = recent.reduce((acc, e) => acc + (e.value || e.mood || 0), 0);
  return sum / recent.length;
}

function getEventKey(events) {
  if (!events || events.length === 0) return null;
  return events.slice().sort().join('+');
}

function savePatterns(patterns) {
  localStorage.setItem('neyra_patterns', JSON.stringify(patterns));
}

function getStoredPatterns() {
  try {
    return JSON.parse(localStorage.getItem('neyra_patterns') || '[]');
  } catch(e) {
    return [];
  }
}

function mergePatterns(newPatterns) {
  const old = getStoredPatterns();
  const map = {};

  [...old, ...newPatterns].forEach(p => {
    if (!map[p.key]) {
      map[p.key] = { ...p };
    } else {
      map[p.key].count += p.count;
      map[p.key].score = (map[p.key].score + p.score) / 2;
    }
  });

  return Object.values(map);
}

function isRelevant(pattern, history) {
  const recent = history.slice(-20);
  return recent.some(entry => {
    const key = getEventKey(entry.events);
    return key === pattern.key;
  });
}

function analyzeEventImpact(history) {
  const single = {};
  const combo = {};

  const baseline = calculateBaseline(history);

  history.forEach(entry => {
    const mood = entry.value || entry.mood || 0;
    const events = (entry.events || []).slice().sort();
    if (events.length === 0) return;

    events.forEach(ev => {
      if (!single[ev]) single[ev] = { count: 0, totalMood: 0 };
      single[ev].count++;
      single[ev].totalMood += mood;
    });

    if (events.length >= 2) {
      for (let i = 0; i < events.length - 1; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const key = events[i] + '+' + events[j];
          if (!combo[key]) combo[key] = { count: 0, totalMood: 0, events: [events[i], events[j]] };
          combo[key].count++;
          combo[key].totalMood += mood;
        }
      }
    }
  });

  const results = [];

  Object.entries(single).forEach(([ev, data]) => {
    if (data.count < 2) return;
    const avgMood = data.totalMood / data.count;
    const score = avgMood - baseline;
    const weight = EVENT_WEIGHTS[ev] || 1.0;
    results.push({
      key: ev,
      events: [ev],
      event: ev,
      count: data.count,
      avgMood: Math.round(avgMood),
      score: Math.round(score * weight),
      isCombo: false
    });
  });

  Object.entries(combo).forEach(([key, data]) => {
    if (data.count < 2) return;
    const avgMood = data.totalMood / data.count;
    const score = avgMood - baseline;
    const mainEvent = data.events.reduce((a, b) =>
      (EVENT_WEIGHTS[a] || 1.0) >= (EVENT_WEIGHTS[b] || 1.0) ? a : b
    );
    results.push({
      key,
      events: data.events,
      event: mainEvent,
      count: data.count,
      avgMood: Math.round(avgMood),
      score: Math.round(score),
      isCombo: true
    });
  });

  results.sort((a, b) => {
    if (Math.abs(b.score) !== Math.abs(a.score)) {
      return Math.abs(b.score) - Math.abs(a.score);
    }
    if (a.isCombo !== b.isCombo) return a.isCombo ? -1 : 1;
    return b.count - a.count;
  });

  const merged = mergePatterns(results);
  savePatterns(merged);

  return results;
}

function findBestPatterns(patterns, limit = 1) {
  const filtered = patterns.filter(p => p.count >= 2 && Math.abs(p.score) >= 4);
  return filtered.slice(0, limit);
}

// Что помогало этому пользователю когда было плохо
function getRecommendationForLowMood(history) {
  const NEVER_RECOMMEND = ['stress', 'work'];

  const baseline = calculateBaseline(history);
  const lowEntries = history.filter(e => (e.value || 0) < baseline - 5);
  if (lowEntries.length < 3) return null;

  const improvements = {};
  for (let i = 0; i < history.length - 1; i++) {
    const curr = history[i];
    const next = history[i + 1];
    if (!curr || !next) continue;
    const currMood = curr.value || 0;
    const nextMood = next.value || 0;
    if (currMood >= baseline) continue;
    if (nextMood <= currMood) continue;
    const events = (next.events || []);
    events.forEach(ev => {
      if (NEVER_RECOMMEND.includes(ev)) return;
      if (!improvements[ev]) improvements[ev] = { count: 0, totalLift: 0 };
      improvements[ev].count++;
      improvements[ev].totalLift += (nextMood - currMood);
    });
  }

  const best = Object.entries(improvements)
    .filter(([, d]) => d.count >= 2)
    .sort((a, b) => (b[1].totalLift / b[1].count) - (a[1].totalLift / a[1].count))[0];

  if (!best) return null;
  return { event: best[0], avgLift: Math.round(best[1].totalLift / best[1].count) };
}

// Обнаружение: стресс + плохой сон + low mood повторяется
function detectWarningPattern(history) {
  const recent = history.slice(-10);
  if (recent.length < 4) return null;

  let stressLowCount = 0;
  let sleepLowCount = 0;

  recent.forEach(e => {
    const mood = e.value || 0;
    const events = e.events || [];
    if (mood < 45 && events.includes('stress')) stressLowCount++;
    if (mood < 45 && events.includes('sleep')) sleepLowCount++;
  });

  const hasBoth = recent.some(e => {
    const events = e.events || [];
    return (e.value || 0) < 45 && events.includes('stress') && events.includes('sleep');
  });

  if (hasBoth && stressLowCount >= 2) {
    return 'warning_stress_sleep';
  }
  if (stressLowCount >= 3) {
    return 'warning_stress_repeat';
  }
  if (sleepLowCount >= 3) {
    return 'warning_sleep_repeat';
  }
  return null;
}

function buildPatternInsight(pattern, currentMood) {
  if (!pattern) return null;
  if (!pattern.key || pattern.count < 2) return null;

  const label = i18n(`event_${pattern.event}`) || pattern.event;
  if (!label || label.includes('event_')) {
    console.warn('[i18n] missing key for', pattern.event);
    return null;
  }

  const moodIsGood = currentMood >= 65;
  const moodIsLow  = currentMood < 45;

  let type, params;

  if (moodIsGood) {
    if (pattern.score >= 0) {
      type = pattern.isCombo ? 'pattern_combo_positive' : 'pattern_positive';
    } else {
      return null;
    }
  } else if (moodIsLow) {
    const NEVER_RECOMMEND = ['stress', 'work'];
    if (pattern.score > 5 && !NEVER_RECOMMEND.includes(pattern.event)) {
      type = 'pattern_recommend_low';
    } else if (pattern.score < -5) {
      type = humanizePattern(pattern) || 'pattern_negative';
    } else {
      return null;
    }
  } else {
    if (pattern.score > 7) {
      type = 'pattern_positive';
    } else if (pattern.score > 3) {
      type = 'pattern_mild_positive';
    } else if (pattern.score < -7) {
      type = humanizePattern(pattern) || 'pattern_negative';
    } else {
      return null;
    }
  }

  params = { label };

  return {
    type,
    params,
    meta: {
      count: pattern.count,
      avg: pattern.avgMood,
      impact: pattern.score
    }
  };
}

function buildFollowUp(pattern) {
  if (!pattern) return null;
  if (pattern.score > 10) {
    return { type: 'followup_positive' };
  }
  if (pattern.score < -10) {
    return { type: 'followup_negative' };
  }
  return { type: 'followup_neutral' };
}

// ---- SAFE GENERATE INSIGHT ----
export async function safeGenerateInsight(payload) {
  let resolved = false;

  const timeout = new Promise(resolve => {
    setTimeout(() => {
      if (!resolved) {
        resolve({
          insightText: "Попробуй описать чуть подробнее — я пока не смог понять.",
          fallback: true,
          pattern: null,
          meta: null,
          followup: null
        });
      }
    }, 2000);
  });

  const ai = Promise.resolve(generateInsight(payload)).then(res => {
    resolved = true;
    return res;
  });

  return Promise.race([ai, timeout]);
}

function humanizePattern(pattern) {
  if (!pattern) return null;
  
  if (pattern.score < 0) {
    const contextKeys = {
      food: 'pattern_food_negative',
      work: 'pattern_work_negative',
      stress: 'pattern_stress_negative'
    };
    return contextKeys[pattern.event] || 'pattern_negative';
  }

  return 'pattern_positive';
}

// ---- GENERATE INSIGHT (i18n-based) ----
export function generateInsight(data) {
  if (data.type === 'reflection') {
    return generateReflectionInsight(data);
  }

  return generatePatternInsight(data);
}

function generateReflectionInsight({ text, mood }) {
  if (!text || text.trim().length < 5) {
    return {
      insightText: i18n('reflection_fallback') || "Попробуй описать подробнее."
    };
  }

  const lower = text.toLowerCase();

  if (lower.includes('стресс') || lower.includes('напряж') || lower.includes('тревог') || lower.includes('устал') || lower.includes('перегруж')) {
    return {
      insightText: i18n('reflection_stress') || "Похоже, это был напряжённый момент."
    };
  }

  if (lower.includes('хорош') || lower.includes('рад') || lower.includes('классно') || lower.includes('отлично') || lower.includes('прекрасно')) {
    return {
      insightText: i18n('reflection_positive') || "Звучит как хороший опыт."
    };
  }

  if (lower.includes('плохо') || lower.includes('ужасно') || lower.includes('грустно') || lower.includes('тоскливо')) {
    return {
      insightText: i18n('reflection_negative') || "День был непростым."
    };
  }

  return {
    insightText: i18n('reflection_neutral') || "Ты фиксируешь состояние — это важный шаг."
  };
}

export function analyzeReflection(text) {
  const lower = text.toLowerCase();

  if (lower.includes('стресс') || lower.includes('напряж') || lower.includes('устал')) {
    return i18n('reflection_stress') || "Похоже, это был напряжённый момент.";
  }

  if (lower.includes('хорош') || lower.includes('рад')) {
    return i18n('reflection_positive') || "Звучит как хороший опыт.";
  }

  if (lower.includes('плохо') || lower.includes('грустно')) {
    return i18n('reflection_negative') || "День был непростым.";
  }

  return i18n('reflection_neutral') || "Ты фиксируешь состояние — это важный шаг.";
}
  }

  if (lower.includes('стресс') || lower.includes('напряж') || lower.includes('тревог') || lower.includes('волнен')) {
    return {
      insightText: i18n('reflection_stress') || "Похоже, был стресс. Попробуй найти способ разгрузиться."
    };
  }

  if (lower.includes('плохо') || lower.includes('ужасно') || lower.includes('грустно') || lower.includes('тоскливо')) {
    return {
      insightText: i18n('reflection_negative') || "День был непростым. Я рядом, если хочешь поговорить."
    };
  }

  return {
    insightText: i18n('reflection_generic') || "Похоже, день был непростым. Хочешь разобраться подробнее?"
  };
}

function generatePatternInsight({ mood, events = [] }) {
  const moodLevel = getMoodLevel(mood);
  const recentHistory = getRecentHistory(14);

  const base = pickRandom(getBaseTexts(moodLevel));
  const combo = getCombinationInsight(moodLevel, events);

  let eventText = null;
  if (!combo && events.length > 0) {
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    eventText = getEventText(randomEvent);
  }

  const advice = getAdvice(moodLevel);

  const patterns = analyzeEventImpact(recentHistory);
  const limit = isPremium() ? 3 : 1;
  const bestPatterns = findBestPatterns(patterns, limit);
  let patternResult = bestPatterns.length > 0
    ? buildPatternInsight(bestPatterns[0], mood)
    : null;

  let patternText = null;
  if (patternResult) {
    const template = i18n(patternResult.type) || patternResult.type;
    if (template && patternResult.params) {
      let text = template;
      Object.keys(patternResult.params).forEach(key => {
        text = text.replace(`{{${key}}}`, patternResult.params[key]);
        text = text.replace(`{${key}}`, patternResult.params[key]);
      });
      patternText = text;
    }
  }

  let recommendText = null;
  if (moodLevel === 'low' || moodLevel === 'mid') {
    const rec = getRecommendationForLowMood(recentHistory);
    if (rec) {
      const label = i18n(`event_${rec.event}`) || rec.event;
      recommendText = i18n('pattern_recommend_low')?.replace('{event}', label)
        || `Раньше тебе помогало — ${label}. Попробуй сейчас.`;
    }
  }

  let warningText = null;
  const warning = detectWarningPattern(recentHistory);
  if (warning) {
    warningText = i18n(warning) || null;
  }

  const parts = [
    warningText || base,
    combo || eventText,
    patternText,
    recommendText || advice
  ].filter(Boolean);

  return {
    insightText: parts.join(' '),
    moodLevel: moodLevel,
    events: events,
    pattern: bestPatterns[0] || null,
    patterns: bestPatterns,
    meta: patternResult?.meta || null,
    followup: buildFollowUp(bestPatterns[0]),
    warning
  };
}

// ---- БАЗЫ ОТВЕТОВ ----

const responses = {

  ru: {
    neutral: [
      "Ты справился с сегодняшним днём лучше, чем кажется.",
      "Иногда просто удержаться — это уже победа.",
      "Твоё состояние замечено. Ты не один с этим.",
      "Что-то важное происходит внутри. Дай себе время понять.",
      "Не каждый день должен быть продуктивным. Иногда достаточно просто быть.",
      "Ты замечаешь своё состояние — это уже большой шаг.",
      "Небольшой отдых сейчас может изменить весь вечер.",
      "Похоже ты что-то важное переосмысливаешь прямо сейчас.",
      "Даже в тихих днях есть своя ценность.",
      "Твоя эмоциональная система работает. Ей просто нужно немного пространства.",
      "Прогресс не всегда виден — но он есть.",
      "Иногда мозгу нужно просто погулять без задачи.",
      "Ты обращаешь внимание на себя. Это важнее чем кажется.",
      "Попробуй сделать три медленных вдоха. Серьёзно.",
      "Сегодняшний день добавит что-то к тому кем ты становишься.",
    ],
    low: [
      "Тяжёлые дни приходят — и они уходят. Ты уже проходил через это.",
      "Сейчас можно просто отдыхать. Без задач и ожиданий.",
      "Это состояние временное — даже если сейчас так не ощущается.",
      "Позаботься о себе как о ком-то кого любишь.",
      "Ничего не нужно решать прямо сейчас. Просто дыши.",
      "Иногда слёзы — это не слабость, а сброс давления.",
      "Ты выдерживаешь больше чем думаешь. Это видно.",
      "Маленький шаг сейчас лучше чем большой план завтра.",
      "Что сейчас могло бы дать тебе хотя бы 10% облегчения?",
      "Тело устало. Это нормально — дай ему восстановиться.",
    ],
    high: [
      "Сегодня у тебя хорошая энергия. Используй её на что-то важное.",
      "Этот момент стоит запомнить — ты в ресурсе.",
      "Хорошее состояние — отличное время для сложных разговоров.",
      "Когда внутри светло — это хороший момент что-то создать.",
      "Ты на подъёме. Запиши что тебе помогло — пригодится.",
      "Это одно из тех состояний которые стоит изучить изнутри.",
    ],
    keywords: {
      сон: "Качество сна очень влияет на эмоции. Возможно стоит лечь раньше.",
      устал: "Усталость накапливается незаметно. Тело просит остановки.",
      работа: "Рабочий стресс умеет проникать во всё остальное. Попробуй отделить.",
      тревога: "Тревога — сигнал, не приговор. Что именно беспокоит больше всего?",
      одиноко: "Одиночество бывает громким. Маленький контакт с кем-то близким может помочь.",
      злость: "Злость говорит о чём-то важном для тебя. Что именно задело?",
      счастл: "Хорошо когда есть такие моменты. Что именно принесло это ощущение?",
    }
  },

  en: {
    neutral: [
      "You handled more today than you realize.",
      "Sometimes just staying steady is the win.",
      "Your state is noticed. You're not alone in this.",
      "Something important is processing inside. Give it time.",
      "Not every day needs to be productive. Sometimes existing is enough.",
      "Noticing how you feel is already a big step.",
      "A small rest now can shift the whole evening.",
      "It seems like you're rethinking something important right now.",
      "Even quiet days have their own value.",
      "Your emotional system is working. It just needs some space.",
      "Progress isn't always visible — but it's there.",
      "Sometimes the brain just needs to wander without a task.",
      "You're paying attention to yourself. That matters more than it seems.",
      "Try three slow deep breaths. Seriously.",
      "Today is adding something to who you're becoming.",
    ],
    low: [
      "Hard days come — and they pass. You've been through this before.",
      "Right now you can just rest. No tasks, no expectations.",
      "This feeling is temporary — even if it doesn't feel that way.",
      "Take care of yourself like someone you love.",
      "Nothing needs to be solved right now. Just breathe.",
      "Sometimes emotions need to move through, not be pushed away.",
      "You're carrying more than you think. That shows.",
      "One small step now beats a big plan tomorrow.",
      "What could give you even 10% relief right now?",
      "Your body is tired. That's okay — let it recover.",
    ],
    high: [
      "You have good energy today. Use it on something that matters.",
      "This moment is worth remembering — you're resourced.",
      "Good state is a great time for hard conversations.",
      "When things feel bright inside — it's a good moment to create.",
      "You're on a rise. Write down what helped — you'll need it.",
      "This is one of those states worth exploring from the inside.",
    ],
    keywords: {
      sleep: "Sleep quality strongly affects emotions. Maybe try going to bed earlier.",
      tired: "Fatigue builds up quietly. Your body is asking for a pause.",
      work: "Work stress has a way of bleeding into everything else. Try to separate.",
      anxious: "Anxiety is a signal, not a sentence. What's worrying you most?",
      lonely: "Loneliness can feel loud. A small moment of connection might help.",
      angry: "Anger points to something important to you. What was it that touched a nerve?",
      happy: "Good that you have moments like this. What brought this feeling?",
    }
  },

  es: {
    neutral: [
      "Hoy manejaste más de lo que te das cuenta.",
      "A veces simplemente mantenerse firme ya es una victoria.",
      "Tu estado está siendo observado. No estás solo en esto.",
      "Algo importante está procesándose dentro. Dale tiempo.",
      "No todos los días necesitan ser productivos. A veces es suficiente con existir.",
      "Notar cómo te sientes ya es un gran paso.",
      "Un pequeño descanso ahora puede cambiar toda la tarde.",
      "Parece que estás repensando algo importante ahora mismo.",
      "Incluso los días tranquilos tienen su propio valor.",
      "Tu sistema emocional está funcionando. Solo necesita algo de espacio.",
      "El progreso no siempre se ve — pero está ahí.",
      "A veces el cerebro solo necesita vagar sin una tarea.",
      "Te estás prestando atención. Eso importa más de lo que parece.",
      "Intenta tres respiraciones lentas y profundas. En serio.",
      "Hoy está añadiendo algo a quien te estás convirtiendo.",
    ],
    low: [
      "Los días difíciles llegan — y pasan. Ya has pasado por esto.",
      "Ahora mismo puedes simplemente descansar. Sin tareas ni expectativas.",
      "Este sentimiento es temporal — aunque ahora no lo parezca.",
      "Cuídate como cuidarías a alguien que amas.",
      "No hay nada que resolver ahora mismo. Solo respira.",
      "Las emociones a veces necesitan moverse, no ser suprimidas.",
      "Estás cargando más de lo que crees. Se nota.",
      "Un pequeño paso ahora supera un gran plan para mañana.",
      "¿Qué podría darte aunque sea un 10% de alivio ahora mismo?",
      "Tu cuerpo está cansado. Está bien — déjalo recuperarse.",
    ],
    high: [
      "Tienes buena energía hoy. Úsala en algo que importe.",
      "Este momento vale la pena recordarlo — estás en un buen lugar.",
      "Un buen estado es un gran momento para conversaciones difíciles.",
      "Cuando las cosas se sienten brillantes por dentro — es un buen momento para crear.",
      "Estás en ascenso. Anota lo que te ayudó — lo necesitarás.",
      "Este es uno de esos estados que vale la pena explorar desde adentro.",
    ],
    keywords: {
      sueño: "La calidad del sueño afecta mucho las emociones. Quizás intenta acostarte antes.",
      cansado: "La fatiga se acumula silenciosamente. Tu cuerpo pide una pausa.",
      trabajo: "El estrés laboral tiene forma de filtrarse en todo. Intenta separarlo.",
      ansiedad: "La ansiedad es una señal, no una sentencia. ¿Qué te preocupa más?",
      soledad: "La soledad puede sentirse fuerte. Un pequeño momento de conexión puede ayudar.",
      enojo: "El enojo apunta a algo importante para ti. ¿Qué fue lo que tocó una fibra?",
      feliz: "Bien que tengas momentos así. ¿Qué trajo esta sensación?",
    }
  },

  uk: {
    neutral: [
      "Ти впорався з сьогоднішнім днем краще, ніж здається.",
      "Іноді просто триматися — це вже перемога.",
      "Твій стан помічено. Ти не один з цим.",
      "Щось важливе відбувається всередині. Дай собі час зрозуміти.",
      "Не кожен день має бути продуктивним. Іноді достатньо просто бути.",
      "Ти помічаєш свій стан — це вже великий крок.",
      "Невеликий відпочинок зараз може змінити весь вечір.",
      "Схоже ти щось важливе переосмислюєш прямо зараз.",
      "Навіть у тихих днях є своя цінність.",
      "Твоя емоційна система працює. Їй просто потрібно трохи простору.",
      "Прогрес не завжди видно — але він є.",
      "Іноді мозку потрібно просто погуляти без завдання.",
      "Ти звертаєш увагу на себе. Це важливіше ніж здається.",
      "Спробуй зробити три повільних вдихи. Серйозно.",
      "Сьогоднішній день додасть щось до того ким ти стаєш.",
    ],
    low: [
      "Важкі дні приходять — і вони минають. Ти вже проходив через це.",
      "Зараз можна просто відпочивати. Без завдань і очікувань.",
      "Цей стан тимчасовий — навіть якщо зараз так не відчувається.",
      "Піклуйся про себе як про когось кого любиш.",
      "Нічого не потрібно вирішувати прямо зараз. Просто дихай.",
      "Іноді сльози — це не слабкість, а скидання тиску.",
      "Ти витримуєш більше ніж думаєш. Це видно.",
      "Маленький крок зараз краще ніж великий план завтра.",
      "Що зараз могло б дати тобі хоча б 10% полегшення?",
      "Тіло втомилося. Це нормально — дай йому відновитися.",
    ],
    high: [
      "Сьогодні у тебе гарна енергія. Використай її на щось важливе.",
      "Цей момент варто запам'ятати — ти в ресурсі.",
      "Гарний стан — чудовий час для складних розмов.",
      "Коли всередині світло — це гарний момент щось створити.",
      "Ти на підйомі. Запиши що тобі допомогло — знадобиться.",
      "Це один з тих станів які варто вивчити зсередини.",
    ],
    keywords: {
      сон: "Якість сну дуже впливає на емоції. Можливо варто лягти раніше.",
      втома: "Втома накопичується непомітно. Тіло просить зупинки.",
      робота: "Робочий стрес вміє проникати у все інше. Спробуй відокремити.",
      тривога: "Тривога — сигнал, не вирок. Що саме турбує найбільше?",
      самотньо: "Самотність буває гучною. Маленький контакт з кимось близьким може допомогти.",
      злість: "Злість говорить про щось важливе для тебе. Що саме зачепило?",
      щасливий: "Добре коли є такі моменти. Що саме принесло це відчуття?",
    }
  }
};

// ---- ГЛАВНАЯ ФУНКЦИЯ ----

export function analyzeText(text, mood) {
  const t = (text || "").toLowerCase();

  // detect negative text
  const isNegative =
  t.includes("плохо") ||
  t.includes("хреново") ||
  t.includes("тревога") ||
  t.includes("устал") ||
  t.includes("депресс") ||
  t.includes("нет сил");

  // detect positive text
  const isPositive =
  t.includes("хорошо") ||
  t.includes("отлично") ||
  t.includes("рад") ||
  t.includes("спокойно");

  // PRIORITY: TEXT > SLIDER

  if (isNegative) {
    return {
      insight: "Ты отмечаешь высокий уровень по шкале, но по ощущениям тебе тяжело. Это важный сигнал — попробуй снизить нагрузку и уделить внимание себе.",
      emotion: "low",
      confidence: 0.9,
      tags: ["text_priority", "negative"]
    };
  }

  if (isPositive) {
    return {
      insight: "Ты чувствуешь себя хорошо — продолжай в том же духе и закрепляй это состояние.",
      emotion: "positive",
      confidence: 0.9,
      tags: ["text_priority", "positive"]
    };
  }

  const lang = detectLang();
  const bank = responses[lang] || responses.en;

  if (!text || text.length < 3) {
    const emptyMsg = {
      ru: "Напиши немного больше — я пойму лучше.",
      en: "Write a little more so I can understand.",
      es: "Escribe un poco más para entenderte mejor.",
      uk: "Напиши трохи більше — я зрозумію краще.",
    };
    return {
      insight: emptyMsg[lang] || emptyMsg.en,
      emotion: "neutral", confidence: 0.3, tags: ["low_input"]
    };
  }

  // fallback to slider
  if (mood >= 70) {
    return {
      insight: "Состояние стабильное. Поддерживай этот уровень.",
      emotion: "positive",
      confidence: 0.75,
      tags: ["offline_ai", "mood_high"]
    };
  }

  if (mood <= 40) {
    return {
      insight: "Есть признаки снижения состояния. Попробуй отдохнуть или переключиться.",
      emotion: "low",
      confidence: 0.75,
      tags: ["offline_ai", "mood_low"]
    };
  }

  return {
    insight: "Состояние нейтральное. Продолжай наблюдать.",
    emotion: "neutral",
    confidence: 0.75,
    tags: ["offline_ai", "mood_neutral"]
  };
}