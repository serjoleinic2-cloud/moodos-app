// ===============================
// Neyra Offline AI — Coach Logic
// 4 языка: RU, EN, ES, UK
// ===============================

import { getMoodHistory } from "../services/memory.js";
import { t as i18n } from "../i18n.js";

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
  const now = Date.now();
  return all.filter(item => {
    return now - item.time < days * 24 * 60 * 60 * 1000;
  });
}

function analyzeEventImpact(history) {
  const stats = {};
  
  history.forEach(entry => {
    if (!entry.events || entry.events.length === 0) return;
    
    entry.events.forEach(e => {
      if (!stats[e]) {
        stats[e] = { total: 0, sum: 0 };
      }
      stats[e].total += 1;
      stats[e].sum += entry.value;
    });
  });
  
  Object.keys(stats).forEach(e => {
    stats[e].avg = stats[e].sum / stats[e].total;
  });
  
  return stats;
}

function findStrongPatterns(stats) {
  const result = [];
  
  Object.entries(stats).forEach(([event, data]) => {
    if (data.total < 3) return;
    
    if (data.avg > 70) {
      result.push({
        type: 'positive',
        event,
        value: data.avg,
        count: data.total
      });
    }
    
    if (data.avg < 40) {
      result.push({
        type: 'negative',
        event,
        value: data.avg,
        count: data.total
      });
    }
  });
  
  return result;
}

function buildPatternInsight(patterns) {
  if (!patterns.length) return null;
  
  const p = patterns[Math.floor(Math.random() * patterns.length)];
  const label = i18n(`event_${p.event}`) || p.event;
  
  if (p.type === 'positive') {
    return i18n('pattern_positive').replace('{event}', label);
  }
  
  if (p.type === 'negative') {
    return i18n('pattern_negative').replace('{event}', label);
  }
  
  return null;
}

// ---- GENERATE INSIGHT (i18n-based) ----
export function generateInsight({ mood, events = [], history = null }) {
  const moodLevel = getMoodLevel(mood);
  
  const base = pickRandom(getBaseTexts(moodLevel));
  const combo = getCombinationInsight(moodLevel, events);
  
  let eventText = null;
  if (!combo && events.length > 0) {
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    eventText = getEventText(randomEvent);
  }
  
  const advice = getAdvice(moodLevel);
  
  // Паттерны с cooldown (показываем ~40% времени)
  let patternText = null;
  if (Math.random() < 0.4) {
    const recentHistory = getRecentHistory(7);
    const stats = analyzeEventImpact(recentHistory);
    const patterns = findStrongPatterns(stats);
    patternText = buildPatternInsight(patterns);
  }
  
  const parts = [base, combo || eventText, patternText, advice].filter(Boolean);
  
  return {
    insightText: parts.join(' '),
    moodLevel: moodLevel,
    events: events,
    pattern: patternText ? patterns?.[0] || null : null
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