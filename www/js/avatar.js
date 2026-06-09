/**
 * avatar.js — Neyra Avatar Module v3
 * Personalized + Context-aware + Priority system
 */

import { setAvatarState, getAvatarState } from './state.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const AVATAR_SIZE        = 60;
const SAFE_SIDE          = 8;
const SAFE_TOP           = 8;
const SAFE_BOTTOM        = 90;
const BUBBLE_DURATION    = 5000;
const IDLE_TIMEOUT       = 8000;
const PROACTIVE_COOLDOWN = 6 * 60 * 60 * 1000;
const ACTIVITY_TIMEOUT   = 10000;
const EFFECT_COOLDOWN    = 30000;
const SLIDER_COOLDOWN    = 5000;

// Cooldown по типу сообщения (мс)
const COOLDOWNS = {
  support : 10000,
  insight : 15000,
  idle    : 30000,
  practice: 45000,
  mood    : 60000,
  default : 10000,
};

// Приоритеты (меньше = важнее)
const PRIORITY = {
  practice: 1,
  mood    : 1,
  insight : 2,
  idle    : 3,
  tap     : 4,
};

const SILENT_SCREENS = ['meditation','breathing','tap-calm','visual-focus','mind-dump'];
const EFFECT_COLORS  = ['#ffd54f','#ff8a65','#81c784','#64b5f6','#ba68c8'];

// ─── Module state ─────────────────────────────────────────────────────────────

let _initialized      = false;
let _enabled          = true;
let _lastShowTime     = 0;
let _lastShowType     = 'default';
let lastSliderReaction = 0;
let _lastEffectTime   = 0;
let _lastActivityTime = 0;
let _currentPriority  = 99;
let _bubbleTimer      = null;
let _idleTimer        = null;
let _lastAction       = null; // 'practice_positive' | 'practice_negative' | 'insight' | 'idle'

// ─── Viewport ────────────────────────────────────────────────────────────────

function vw() { return window.visualViewport?.width  || window.innerWidth;  }
function vh() { return window.visualViewport?.height || window.innerHeight; }
function clampX(x) { return Math.max(SAFE_SIDE, Math.min(x, vw() - AVATAR_SIZE - SAFE_SIDE)); }
function clampY(y) { return Math.max(SAFE_TOP,  Math.min(y, vh() - AVATAR_SIZE - SAFE_BOTTOM)); }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLang()        { const l = localStorage.getItem('app_language'); return l && ['ru','en','es','uk','hi'].includes(l) ? l : 'ru'; }
function pickRandom(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }

function getMoodType(mood) {
  if (mood < 40) return 'low';
  if (mood < 70) return 'mid';
  return 'high';
}

function getMoodLabel(mood) {
  const lang = getLang();
  const map = {
    ru: { low: 'при тревоге', mid: 'в нейтральном состоянии', high: 'в хорошем настроении' },
    en: { low: 'when anxious', mid: 'in a neutral state', high: 'in a good mood' },
    es: { low: 'cuando ansioso', mid: 'en estado neutro', high: 'de buen humor' },
    uk: { low: 'при тривозі', mid: 'у нейтральному стані', high: 'у гарному настрої' },
    hi: { low: 'चिंता के समय', mid: 'तटस्थ स्थिति में', high: 'अच्छे मूड में' },
  };
  return (map[lang] || map.ru)[getMoodType(mood)];
}

function getLastMood() {
  try {
    const h = JSON.parse(localStorage.getItem('mood_history') || '[]');
    if (!h.length) return null;
    const s = [...h].sort((a,b) => (b.time||b.date) - (a.time||a.date));
    return s[0]?.value ?? null;
  } catch(_) { return null; }
}

function getTrend(prev, curr) {
  if (prev === null) return 'same';
  if (curr > prev + 5) return 'up';
  if (curr < prev - 5) return 'down';
  return 'same';
}

function getMostUsedPractice() {
  try {
    const h = JSON.parse(localStorage.getItem('practice_history') || '[]');
    if (h.length < 3) return null;
    const counts = {};
    h.slice(-20).forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
    return top && top[1] >= 3 ? top[0] : null;
  } catch(_) { return null; }
}

function isSilentScreen() {
  const el = document.querySelector('.screen.active');
  return el ? SILENT_SCREENS.includes(el.getAttribute('data-screen')) : false;
}

function hasOpenModal() {
  return !!document.querySelector('.health-modal-overlay') ||
    document.querySelector('#premium-modal[style*="flex"]') !== null ||
    document.querySelector('#menuPanel[style*="bottom: 0"]') !== null;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export function trackUserActivity() { _lastActivityTime = Date.now(); }
function isUserActive() { return (Date.now() - _lastActivityTime) < ACTIVITY_TIMEOUT; }

// ─── Messages ────────────────────────────────────────────────────────────────

const MSG = {
  practice: {
    ru: {
      positive: {
        low : ['Вижу, {practice} помогает тебе при тревоге', 'Это работает — особенно когда тяжело'],
        mid : ['Хороший выбор для этого момента', 'Ты нашёл что тебе подходит'],
        high: ['Отлично, ты в ресурсе', 'Это состояние стоит запомнить'],
      },
      negative: {
        low : ['Похоже, это не лучший вариант при грусти', 'Попробуем что-то другое?'],
        mid : ['Не всегда работает одно и то же', 'Давай попробуем другой подход'],
        high: ['Окей, попробуем другой вариант', 'Не страшно, найдём что подходит'],
      },
    },
    en: {
      positive: {
        low : ['I see {practice} helps you when anxious', 'This works — especially when it\'s tough'],
        mid : ['Good choice for this moment', 'You found what works for you'],
        high: ['Great, you\'re resourced', 'This state is worth remembering'],
      },
      negative: {
        low : ['Seems this isn\'t the best when sad', 'Want to try something else?'],
        mid : ['Not everything works the same way', 'Let\'s try a different approach'],
        high: ['Okay, let\'s try another option', 'No worries, we\'ll find what fits'],
      },
    },
    es: {
      positive: {
        low : ['Veo que {practice} te ayuda cuando estás ansioso', 'Esto funciona — especialmente cuando es difícil'],
        mid : ['Buena elección para este momento', 'Encontraste lo que te funciona'],
        high: ['Genial, tienes recursos', 'Vale la pena recordar este estado'],
      },
      negative: {
        low : ['Parece que esto no es lo mejor cuando estás triste', '¿Probamos otra cosa?'],
        mid : ['No siempre funciona lo mismo', 'Probemos un enfoque diferente'],
        high: ['Okay, probemos otra opción', 'No pasa nada, encontraremos lo que encaja'],
      },
    },
    uk: {
      positive: {
        low : ['Бачу, {practice} допомагає тобі при тривозі', 'Це працює — особливо коли важко'],
        mid : ['Хороший вибір для цього моменту', 'Ти знайшов що тобі підходить'],
        high: ['Чудово, ти у ресурсі', 'Цей стан варто запам\'ятати'],
      },
      negative: {
        low : ['Схоже, це не найкращий варіант при смутку', 'Спробуємо щось інше?'],
        mid : ['Не завжди працює одне й те саме', 'Давай спробуємо інший підхід'],
        high: ['Окей, спробуємо інший варіант', 'Нічого, знайдемо що підходить'],
      },
    },
    hi: {
      positive: {
        low : ['मैं देखता/देखती हूं {practice} चिंता में आपकी मदद करता है', 'यह काम करता है — खासकर जब कठिन होता है'],
        mid : ['इस पल के लिए अच्छी पसंद', 'आपने वो खोज लिया जो आपके लिए काम करता है'],
        high: ['बहुत बढ़िया, आप संसाधन में हैं', 'इस स्थिति को याद रखना worth है'],
      },
      negative: {
        low : ['ऐसा लगता है कि उदासी के समय यह सबसे अच्छा विकल्प नहीं', 'कुछ और आज़माते हैं?'],
        mid : ['हमेशा एक ही काम नहीं करता', 'आइए कोई अलग तरीका आज़माएं'],
        high: ['ठीक है, कोई और विकल्प आज़माते हैं', 'कोई बात नहीं, हम वो खोज लेंगे जो फिट बैठता है'],
      },
    },
  },

  memory: {
    ru: [
      'Ты часто выбираешь это — похоже, это работает для тебя',
      'Замечаю паттерн: тебе помогает этот подход',
      'Ты нашёл своё — это хорошо',
    ],
    en: [
      'You often choose this — seems it works for you',
      'I notice a pattern: this approach helps you',
      'You found your way — that\'s great',
    ],
    es: [
      'Eliges esto con frecuencia — parece que te funciona',
      'Noto un patrón: este enfoque te ayuda',
      'Encontraste tu camino — eso es genial',
    ],
    uk: [
      'Ти часто обираєш це — схоже, це працює для тебе',
      'Помічаю паттерн: тобі допомагає цей підхід',
      'Ти знайшов своє — це добре',
    ],
    hi: [
      'आप अक्सर यह चुनते/चुनती हैं — ऐसा लगता है यह आपके लिए काम करता है',
      'मैं एक पैटर्न देखता/देखती हूं: यह तरीका आपकी मदद करता है',
      'आपने अपना रास्ता खोज लिया — यह बढ़िया है',
    ],
  },

  insight: {
    ru : ['Интересно, правда?', 'Это стоит запомнить', 'Полезная находка'],
    en : ['Interesting, right?', 'Worth remembering', 'Useful finding'],
    es : ['Interesante, ¿verdad?', 'Vale la pena recordarlo', 'Hallazgo útil'],
    uk : ['Цікаво, правда?', 'Це варто запам\'ятати', 'Корисна знахідка'],
    hi : ['दिलचस्प, है ना?', 'याद रखना worth है', 'उपयोगी खोज'],
  },

  returnApp: {
    ru : ['Рад, что ты вернулся', 'Снова здесь — хорошо', 'Приятно видеть тебя снова'],
    en : ['Glad you\'re back', 'Here again — good', 'Nice to see you again'],
    es : ['Me alegra que hayas vuelto', 'Aquí de nuevo — bien', 'Qué bueno verte de nuevo'],
    uk : ['Радий, що ти повернувся', 'Знову тут — добре', 'Приємно бачити тебе знову'],
    hi : ['वापस आने पर खुशी', 'फिर से यहां — अच्छा', 'आपको फिर से देखकर अच्छा लगा'],
  },

  idle: {
    ru : ['Хочешь продолжить?', 'Я рядом, если нужно', 'Хочешь попробовать практику?'],
    en : ['Want to continue?', 'I\'m here if needed', 'Want to try a practice?'],
    es : ['¿Quieres continuar?', 'Estoy aquí si lo necesitas', '¿Quieres probar una práctica?'],
    uk : ['Хочеш продовжити?', 'Я поруч, якщо потрібно', 'Хочеш спробувати практику?'],
    hi : ['जारी रखना चाहते हैं?', 'ज़रूरत पड़ने पर मैं यहां हूं', 'अभ्यास आज़माना चाहेंगे?'],
  },

  tap: {
    ru: {
      practice_positive: ['Ты хорошо справился', 'Это помогло — запомни', 'Отличный выбор был'],
      practice_negative: ['Я рядом, если нужно', 'Попробуем другой подход?', 'Не страшно'],
      insight          : ['Это полезно, правда?', 'Стоит вернуться к этому', 'Интересная находка'],
      idle             : ['Я рядом, если нужно', 'Всё хорошо?', 'Как ты сейчас?'],
      default          : ['Я здесь', 'Ты справляешься', 'Как ты сейчас?', 'Продолжай'],
    },
    en: {
      practice_positive: ['You did well', 'That helped — remember it', 'Great choice'],
      practice_negative: ['I\'m here if needed', 'Want to try another approach?', 'No worries'],
      insight          : ['That\'s useful, right?', 'Worth coming back to', 'Interesting finding'],
      idle             : ['I\'m here if needed', 'Everything okay?', 'How are you now?'],
      default          : ['I\'m here', 'You\'re doing well', 'How are you now?', 'Keep going'],
    },
    es: {
      practice_positive: ['Lo hiciste bien', 'Eso ayudó — recuérdalo', 'Gran elección'],
      practice_negative: ['Estoy aquí si lo necesitas', '¿Probamos otro enfoque?', 'No pasa nada'],
      insight          : ['Eso es útil, ¿verdad?', 'Vale la pena volver', 'Hallazgo interesante'],
      idle             : ['Estoy aquí si lo necesitas', '¿Todo bien?', '¿Cómo estás ahora?'],
      default          : ['Estoy aquí', 'Lo estás haciendo bien', '¿Cómo estás ahora?', 'Continúa'],
    },
    uk: {
      practice_positive: ['Ти добре впорався', 'Це допомогло — запам\'ятай', 'Відмінний вибір'],
      practice_negative: ['Я поруч, якщо потрібно', 'Спробуємо інший підхід?', 'Нічого страшного'],
      insight          : ['Це корисно, правда?', 'Варто повернутись до цього', 'Цікава знахідка'],
      idle             : ['Я поруч, якщо потрібно', 'Все добре?', 'Як ти зараз?'],
      default          : ['Я тут', 'Ти справляєшся', 'Як ти зараз?', 'Продовжуй'],
    },
    hi: {
      practice_positive: ['आपने अच्छा किया', 'इसने मदद की — याद रखें', 'बढ़िया चुनाव'],
      practice_negative: ['ज़रूरत पड़ने पर मैं यहां हूं', 'कोई और तरीका आज़माना चाहेंगे?', 'कोई बात नहीं'],
      insight          : ['यह उपयोगी है, है ना?', 'इस पर वापस आना worth है', 'दिलचस्प खोज'],
      idle             : ['ज़रूरत पड़ने पर मैं यहां हूं', 'सब ठीक है?', 'अभी कैसे हैं?'],
      default          : ['मैं यहां हूं', 'आप अच्छा कर रहे हैं', 'अभी कैसे हैं?', 'जारी रखें'],
    },
  },

  mood: {
    ru: {
      low: [
        "Ты сейчас справляешься — это уже много",
        "Трудный момент пройдёт",
        "Я рядом — можно просто дышать"
      ],
      mid: ['Ты держишь баланс','Неплохое состояние','Можно зафиксировать это'],
      high: ['Хороший момент','Ты сейчас в ресурсе','Это важно — ты здесь']
    },
    en: {
      low: [
        "You're getting through it — that's already a lot",
        "This hard moment will pass",
        "I'm here — you can just breathe"
      ],
      mid: ["You're holding balance","Not bad","You can note this"],
      high: ["Good moment","You're resourced","This matters — you're here"]
    },
    es: {
      low: [
        "Lo estás superando — eso ya es mucho",
        "Este momento difícil pasará",
        "Estoy aquí — puedes simplemente respirar"
      ],
      mid: ['Mantienes el equilibrio','No está mal','Puedes anotar esto'],
      high: ['Buen momento','Estás con recursos','Esto importa — estás aquí']
    },
    uk: {
      low: [
        "Ти зараз справляєшся — це вже багато",
        "Важкий момент мине",
        "Я поруч — можна просто дихати"
      ],
      mid: ['Ти тримаєш баланс','Непоганий стан','Можна зафіксувати це'],
      high: ['Гарний момент','Ти зараз у ресурсі','Це важливо — ти тут']
    },
    hi: {
      low: [
        "आप इससे गुजर रहे हैं — यह पहले से बहुत है",
        "यह कठिन पल गुजर जाएगा",
        "मैं यहां हूं — बस सांस लें"
      ],
      mid: [
        "आप संतुलन बनाए हुए हैं",
        "ठीक-ठाक स्थिति है",
        "इसे नोट कर सकते हैं"
      ],
      high: [
        "अच्छा पल है",
        "यह स्थिति याद रखने लायक है",
        "आप अभी संसाधनपूर्ण हैं"
      ]
    }
  },

  trend: {
    ru: { up:['Стало легче','Есть движение вверх','Ты немного поднялся'], down:['Похоже, стало тяжелее','Небольшой спад — это нормально','Ты можешь немного замедлиться'] },
    en: { up:['Feeling lighter','Moving upward','You\'re a bit up'], down:['Seems a bit harder','Small dip — that\'s normal','You can slow down'] },
    es: { up:['Te sientes más ligero','Hay movimiento hacia arriba','Has subido un poco'], down:['Parece un poco más difícil','Pequeña caída — es normal','Puedes ralentizar'] },
    uk: { up:['Стало легше','Є рух вгору','Ти трохи піднявся'], down:['Схоже, стало важче','Невеликий спад — це нормально','Ти можеш трохи сповільнитись'] },
    hi: { up:['हल्का महसूस हो रहा है','ऊपर की ओर गति','आप थोड़े ऊपर हैं'], down:['थोड़ा कठिन लग रहा है','छोटी गिरावट — यह सामान्य है','आप धीमे हो सकते हैं'] },
  },

  proactive: {
    ru: {
      inactive: [
        "Давно не виделись — как ты сейчас?",
        "Зайди на минуту — зафиксируй как себя чувствуешь"
      ],
      noEntry: [
        "Сегодня ещё нет записи — как день прошёл?",
        "Одна отметка в день помогает замечать паттерны"
      ],
      decline: [
        "Последние дни чуть сложнее — и это нормально. Как сейчас?",
        "Замечаю небольшой спад — попробуй дыхание, обычно помогает"
      ]
    },
    en: {
      inactive: [
        "Haven't seen you in a while — how are you now?",
        "Drop in for a minute — note how you're feeling"
      ],
      noEntry: [
        "No entry today yet — how did the day go?",
        "One check-in a day helps you spot your patterns"
      ],
      decline: [
        "Past few days a bit harder — that's okay. How are you now?",
        "Noticing a small dip — try breathing, it usually helps"
      ]
    },
    es: {
      inactive: [
        "Hace tiempo que no te veo — ¿cómo estás ahora?",
        "Entra un momento — anota cómo te sientes"
      ],
      noEntry: [
        "Aún no hay registro hoy — ¿cómo fue el día?",
        "Un registro al día ayuda a notar tus patrones"
      ],
      decline: [
        "Los últimos días un poco más difíciles — es normal. ¿Cómo estás ahora?",
        "Noto una pequeña caída — prueba respiración, suele ayudar"
      ]
    },
    uk: {
      inactive: [
        "Давно не бачилися — як ти зараз?",
        "Зайди на хвилину — зафіксуй як себе почуваєш"
      ],
      noEntry: [
        "Сьогодні ще немає запису — як пройшов день?",
        "Одна відмітка на день допомагає помічати паттерни"
      ],
      decline: [
        "Останні дні трохи складніше — і це нормально. Як зараз?",
        "Помічаю невеликий спад — спробуй дихання, зазвичай допомагає"
      ]
    },
    hi: {
      inactive: [
        "काफी समय हो गया — आप अभी कैसे हैं?",
        "एक मिनट के लिए आएं — बताएं कैसा महसूस कर रहे हैं"
      ],
      noEntry: [
        "आज अभी तक कोई एंट्री नहीं — दिन कैसा रहा?",
        "दिन में एक चेक-इन आपके पैटर्न पहचानने में मदद करता है"
      ],
      decline: [
        "पिछले कुछ दिन थोड़े कठिन रहे — यह सामान्य है। अभी कैसे हैं?",
        "एक छोटी गिरावट दिख रही है — श्वास अभ्यास आज़माएं, आमतौर पर मदद करता है"
      ]
    }
  },

  afterSave: {
    ru: {
      withEvents: {
        walk:    ['Прогулка — хороший выбор!','Даже короткая прогулка работает'],
        coffee:  ['Кофе + фиксация = осознанность','Этот момент важен'],
        work:    ['Работа в фокусе — это сила','Хорошо, что замечаешь'],
        sport:   ['Спорт — это инвестиция в себя','Тело благодарит'],
        social:  ['Связи важны для настроения','Общение заряжает'],
        rest:    ['Отдых — это продуктивно','Правильный выбор'],
        music:   ['Музыка лечит','Отличный выбор для состояния'],
        food:    ['Забота о себе включает питание','Хорошо замечаешь'],
        sleep:   ['Сон — основа всего','Это важный момент'],
        stress:  ['Стресс бывает. Ты замечаешь — это важно','Ты справляешься']
      },
      noEvents: ['Зафиксировал — уже хорошо','Отмечай, что чувствуешь','Этот момент важен'],
      multiple: ['Интересное сочетание!','Вижу, что сегодня было насыщено']
    },
    en: {
      withEvents: {
        walk:    ['A walk — great choice!','Even a short walk works'],
        coffee:  ['Coffee + tracking = awareness','This moment matters'],
        work:    ['Work in focus — that\'s strength','Good that you notice'],
        sport:   ['Sport is an investment in yourself','Your body thanks you'],
        social:  ['Connections matter for mood','Socializing charges you'],
        rest:    ['Rest is productive','Right choice'],
        music:   ['Music heals','Great choice for your state'],
        food:    ['Self-care includes nutrition','Good that you notice'],
        sleep:   ['Sleep is the foundation','This is an important moment'],
        stress:  ['Stress happens. You notice — that\'s important','You\'re handling it']
      },
      noEvents: ['Tracked — that\'s already good','Note what you feel','This moment matters'],
      multiple: ['Interesting combination!','Looks like today was eventful']
    },
    es: {
      withEvents: {
        walk:    ['¡Un paseo — gran elección!','Incluso un paseo corto funciona'],
        coffee:  ['Café + seguimiento = conciencia','Este momento importa'],
        work:    ['Trabajo en enfoque — eso es fuerza','Bien que notes'],
        sport:   ['El deporte es una inversión en ti mismo','Tu cuerpo te agradece'],
        social:  ['Las conexiones importan para el ánimo','Lo social te carga'],
        rest:    ['El descanso es productivo','Elección correcta'],
        music:   ['La música cura','Gran elección para tu estado'],
        food:    ['El autocuidado incluye la alimentación','Bien que notes'],
        sleep:   ['El sueño es la base','Este es un momento importante'],
        stress:  ['El estrés pasa. Lo notas — eso es importante','Lo estás manejando']
      },
      noEvents: ['Rastreado — eso ya es bueno','Nota lo que sientes','Este momento importa'],
      multiple: ['¡Combinación interesante!','Parece que hoy fue animado']
    },
    uk: {
      withEvents: {
        walk:    ['Прогулянка — чудовий вибір!','Навіть коротка прогулянка працює'],
        coffee:  ['Кава + фіксація = усвідомленість','Цей момент важливий'],
        work:    ['Робота у фокусі — це сила','Добре, що помічаєш'],
        sport:   ['Спорт — це інвестиція в себе','Тіло дякує'],
        social:  ['Зв\'язки важливі для настрою','Спілкування заряджає'],
        rest:    ['Відпочинок — це продуктивно','Правильний вибір'],
        music:   ['Музика лікує','Чудовий вибір для стану'],
        food:    ['Піклування про себе включає харчування','Добре помічаєш'],
        sleep:   ['Сон — основа всього','Це важливий момент'],
        stress:  ['Стрес буває. Ти помічаєш — це важливо','Ти справляєшся']
      },
      noEvents: ['Зафіксував — вже добре','Відзначай, що відчуваєш','Цей момент важливий'],
      multiple: ['Цікаве поєднання!','Здається, сьогодні було насичено']
    },
    hi: {
      withEvents: {
        walk:    ['सैर — बढ़िया चुनाव!','एक छोटी सैर भी काम करती है'],
        coffee:  ['कॉफी + ट्रैकिंग = जागरूकता','यह पल मायने रखता है'],
        work:    ['फोकस में काम — यह ताकत है','यह नोट करना अच्छा है'],
        sport:   ['खेल अपने आप में निवेश है','आपका शरीर धन्यवाद देता है'],
        social:  ['रिश्ते मूड के लिए मायने रखते हैं','सामाजिकता आपको ऊर्जा देती है'],
        rest:    ['आराम उत्पादक है','सही चुनाव'],
        music:   ['संगीत ठीक करता है','आपकी स्थिति के लिए बढ़िया चुनाव'],
        food:    ['देखभाल में पोषण शामिल है','यह नोट करना अच्छा है'],
        sleep:   ['नींद आधार है','यह एक महत्वपूर्ण पल है'],
        stress:  ['तनाव होता है। आप इसे नोट करते हैं — यह महत्वपूर्ण है','आप इसे संभाल रहे हैं']
      },
      noEvents: ['ट्रैक किया — यह पहले से अच्छा है','नोट करें कि आप क्या महसूस करते हैं','यह पल मायने रखता है'],
      multiple: ['दिलचस्प संयोजन!','ऐसा लगता है आज काफी व्यस्त था']
    }
  },

  streak: {
    ru: ['Ты уже {n} дней подряд — это важно','Серия растёт! {n} дней','Продолжай в том же духе'],
    en: ['You\'ve been tracking for {n} days — that matters','Streak growing! {n} days','Keep it up'],
    es: ['Llevas {n} días seguidos — eso importa','¡La racha crece! {n} días','Sigue así'],
    uk: ['Ти вже {n} днів поспіль — це важливо','Серія росте! {n} днів','Продовжуй у тому ж дусі'],
    hi: ['आप {n} दिनों से ट्रैक कर रहे हैं — यह मायने रखता है','स्ट्रीक बढ़ रही है! {n} दिन','इसे जारी रखें']
  },

  improvement: {
    ru: ['Вижу, что стало легче','Настроение подросло — это хороший знак','Ты молодец, что отмечаешь','Есть движение вверх'],
    en: ['I see it got easier','Mood improved — that\'s a good sign','Good job tracking','There\'s upward movement'],
    es: ['Veo que se puso más fácil','El ánimo mejoró — buena señal','Buen trabajo registrando','Hay movimiento hacia arriba'],
    uk: ['Бачу, що стало легше','Настрій підріс — це хороший знак','Ти молодець, що відзначаєш','Є рух вгору'],
    hi: ['मैं देखता/देखती हूं कि आसान हो गया','मूड में सुधार — यह एक अच्छा संकेत है','ट्रैक करने पर बधाई','ऊपर की ओर गति है']
  },

  lowMood: {
    ru: ['Сегодня тяжелее — это нормально','Ты держишься, и это важно','Разреши себе отдохнуть'],
    en: ['Today is harder — that\'s normal','You\'re holding on, and that matters','Give yourself permission to rest'],
    es: ['Hoy es más difícil — eso es normal','Te sostienes, y eso importa','Date permiso para descansar'],
    uk: ['Сьогодні важче — це нормально','Ти тримаєшся, і це важливо','Дозволь собі відпочити'],
    hi: ['आज कठिन है — यह सामान्य है','आप बने हुए हैं, और यह मायने रखता है','खुद को आराम करने की अनुमति दें']
  },

  returnPause: {
    ru: ['Рад, что ты вернулся после паузы','Снова здесь — это важно','Продолжаем с того места'],
    en: ['Glad you\'re back after a pause','Here again — that matters','Picking up where we left off'],
    es: ['Me alegra que hayas vuelto después de una pausa','Aquí de nuevo — eso importa','Continuamos desde donde quedamos'],
    uk: ['Радий, що ти повернувся після паузи','Знову тут — це важливо','Продовжуємо з того місця'],
    hi: ['एक विराम के बाद वापस आने पर खुशी','फिर से यहां — यह मायने रखता है','जहां छोड़ा था वहां से जारी रखते हैं']
  },

  patternPositive: {
    ru: ['Похоже, ты нашёл что тебе помогает','Это важное наблюдение','Ты начинаешь понимать себя'],
    en: ['Looks like you found something that helps','This is an important observation','You\'re starting to understand yourself'],
    es: ['Parece que encontraste algo que te ayuda','Esta es una observación importante','Estás empezando a entenderte'],
    uk: ['Схоже, ти знайшов що тобі допомагає','Це важливе спостереження','Ти починаєш розуміти себе'],
    hi: ['ऐसा लगता है आपने कुछ खोज लिया जो मदद करता है','यह एक महत्वपूर्ण अवलोकन है','आप खुद को समझना शुरू कर रहे हैं']
  },

  patternNegative: {
    ru: ['Есть повторяющийся фактор — давай разберёмся','Интересная закономерность','Это стоит обдумать'],
    en: ['There\'s a repeating factor — let\'s figure it out','Interesting pattern','This is worth thinking about'],
    es: ['Hay un factor que se repite — analicemos','Patrón interesante','Esto vale la pena pensar'],
    uk: ['Є повторюваний фактор — давай розберемося','Цікава закономірність','Це варто обдумати'],
    hi: ['एक दोहरावदार कारक है — चलो समझते हैं','दिलचस्प पैटर्न','यह सोचने योग्य है']
  },

  actions: {
    ru: { low:[{label:'Подышать',action:'breathing'},{label:'Выгрузить',action:'mind-dump'}], high:[] },
    en: { low:[{label:'Breathe',action:'breathing'},{label:'Mind dump',action:'mind-dump'}], high:[] },
    es: { low:[{label:'Respirar',action:'breathing'},{label:'Vaciar mente',action:'mind-dump'}], high:[] },
    uk: { low:[{label:'Подихати',action:'breathing'},{label:'Вивантажити',action:'mind-dump'}], high:[] },
    hi: { low:[{label:'श्वास लें',action:'breathing'},{label:'मन खाली करें',action:'mind-dump'}], high:[] },
  },
};

const sliderHintMessages = MSG.mood;

// ─── Drag ─────────────────────────────────────────────────────────────────────

function _initDrag(container) {
  let dragging = false;
  let startClientX = 0, startClientY = 0;
  let startPosX = 0, startPosY = 0;
  let currentX  = 0, currentY  = 0;

  const saved = getAvatarState().position;
  currentX = clampX(saved?.x ?? (vw() - AVATAR_SIZE - 16));
  currentY = clampY(saved?.y ?? (vh() - AVATAR_SIZE - 90));
  _applyPosition(container, currentX, currentY);

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    dragging = true;
    const t = e.touches[0];
    startClientX = t.clientX; startClientY = t.clientY;
    startPosX = currentX;     startPosY    = currentY;
    container.classList.add('dragging');
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    currentX = clampX(startPosX + (t.clientX - startClientX));
    currentY = clampY(startPosY + (t.clientY - startClientY));
    _applyPosition(container, currentX, currentY);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('dragging');
    const t = e.changedTouches[0];
    _savePosition(currentX, currentY);
    if (Math.abs(t.clientX - startClientX) < 8 && Math.abs(t.clientY - startClientY) < 8) _onTap();
  }, { passive: true });

  container.addEventListener('mousedown', (e) => {
    dragging = true;
    startClientX = e.clientX; startClientY = e.clientY;
    startPosX = currentX;     startPosY    = currentY;
    container.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    currentX = clampX(startPosX + (e.clientX - startClientX));
    currentY = clampY(startPosY + (e.clientY - startClientY));
    _applyPosition(container, currentX, currentY);
  });

  document.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('dragging');
    _savePosition(currentX, currentY);
    if (Math.abs(e.clientX - startClientX) < 8 && Math.abs(e.clientY - startClientY) < 8) _onTap();
  });
}

function _applyPosition(container, x, y) {
  container.style.left = x + 'px';
  container.style.top  = y + 'px';
  _updateBubblePosition(x, y);
}

function _savePosition(x, y) {
  setAvatarState({ position: { x, y } });
}

// ─── Bubble positioning ───────────────────────────────────────────────────────

function _updateBubblePosition(x, y) {
  const bubble = document.getElementById('avatar-bubble');
  if (!bubble) return;

  // Горизонталь
  const toRight = x > vw() / 2;
  bubble.classList.toggle('left',  toRight);
  bubble.classList.toggle('right', !toRight);

  // Вертикаль — если аватар в верхней трети экрана, bubble идёт вниз
  const isNearTop = y < vh() / 3;
  bubble.classList.toggle('below', isNearTop);
}

// ─── Tap ──────────────────────────────────────────────────────────────────────

function _onTap() {
  const container = document.getElementById('avatar-container');
  if (container) {
    container.classList.remove('tapped');
    void container.offsetWidth; // reflow
    container.classList.add('tapped');
    setTimeout(() => container.classList.remove('tapped'), 400);
  }

  if (window.SystemCore) {
    window.SystemCore.dispatch('AVATAR_TAP');
  } else {
    const lang = getLang();
    const pool = MSG.tap[lang] || MSG.tap.ru;
    const msgs = pool[_lastAction] || pool.default;
    showAvatar(pickRandom(msgs), true, null, 'tap');
  }
}

// ─── renderAvatar ─────────────────────────────────────────────────────────────

export function renderAvatar() {
  const container = document.getElementById('avatar-container');
  if (!container) return;

  const s = getAvatarState();
  container.classList.toggle('idle', !!s.isIdle);

  const textEl    = document.getElementById('avatar-text');
  const actionsEl = document.getElementById('avatar-actions');
  const bubble    = document.getElementById('avatar-bubble');

  if (s.visible) {
    if (textEl) textEl.textContent = s.message || '';
    if (actionsEl) {
      actionsEl.innerHTML = '';
      const actions = (s.actions || []).slice(0, 2);
      if (actions.length > 0) {
        const textEl = document.createElement('div');
        textEl.style.cssText = 'font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;line-height:1.5;';
        textEl.textContent = actions.map(a => a.label).join(' · ');
        actionsEl.appendChild(textEl);
      }
    }
    container.classList.add('active');
    if (bubble) bubble.classList.add('visible');
    if (_bubbleTimer) clearTimeout(_bubbleTimer);
    _bubbleTimer = setTimeout(_hideBubble, BUBBLE_DURATION);
  } else {
    container.classList.remove('active');
    if (bubble) bubble.classList.remove('visible');
  }
}

function _hideBubble() {
  if (_bubbleTimer) { clearTimeout(_bubbleTimer); _bubbleTimer = null; }
  setAvatarState({ visible: false });
  const container = document.getElementById('avatar-container');
  const bubble    = document.getElementById('avatar-bubble');
  if (container) container.classList.remove('active');
  if (bubble)    bubble.classList.remove('visible');
}

// ─── showAvatar — core ────────────────────────────────────────────────────────

export function showAvatar(message, immediate = false, actions = null, type = 'default') {
  if (!_enabled) return;
  const now      = Date.now();
  const config   = typeof message === 'object' ? message : { text: message };
  const force    = config.force || immediate;
  const msgType  = config.type || type;
  const priority = PRIORITY[msgType] || PRIORITY.tap;
  const cooldown = COOLDOWNS[msgType] || COOLDOWNS.default;

  if (!force) {
    if (now - _lastShowTime < cooldown) return;
    if (priority > _currentPriority) return; // текущее важнее
  }

  _lastShowTime    = now;
  _lastShowType    = msgType;
  _currentPriority = priority;

  const text       = config.text || message;
  const actionList = config.actions || actions;

  setAvatarState({ visible: true, message: text, type: msgType, actions: actionList, timestamp: now, isIdle: false });
  if (_idleTimer) clearTimeout(_idleTimer);

  const doShow = () => {
    renderAvatar();
    _idleTimer = setTimeout(() => {
      setAvatarState({ isIdle: true });
      renderAvatar();
      _currentPriority = 99;
    }, IDLE_TIMEOUT);
  };

  if (force) {
    doShow();
  } else {
    setTimeout(() => {
      if (!isUserActive() && !isSilentScreen() && !hasOpenModal()) doShow();
    }, 2000);
  }
}

// ─── Public reactions ─────────────────────────────────────────────────────────

export function showAvatarForMood(mood) {
  const prev  = getLastMood();
  const trend = getTrend(prev, mood);
  const type  = getMoodType(mood);
  const lang  = getLang();
  let text;
  if (trend !== 'same') {
    text = pickRandom((MSG.trend[lang] || MSG.trend.ru)[trend]);
  } else {
    text = pickRandom((MSG.mood[lang] || MSG.mood.ru)[type]);
  }
  let actions = null;
  if (type !== 'mid') actions = (MSG.actions[lang] || MSG.actions.ru)[type] || null;
  showAvatar(text, true, actions, 'support');

  if (Date.now() - _lastEffectTime > EFFECT_COOLDOWN) {
    _lastEffectTime = Date.now();
    if (trend === 'up'   || type === 'high') _showConfetti();
    if (trend === 'down' || type === 'low')  _showCloud();
  }
}

export function showAvatarHint(mood) {
  const now = Date.now();
  if (now - lastSliderReaction < SLIDER_COOLDOWN) return;
  lastSliderReaction = now;

  const lang = getLang();
  const msgs = sliderHintMessages[lang] || sliderHintMessages.ru;

  let type = 'mid';
  if (mood < 30) type = 'low';
  else if (mood >= 70) type = 'high';

  const typeMsgs = msgs[type] || msgs.mid;
  const text = typeMsgs[Math.floor(Math.random() * typeMsgs.length)];

  showAvatar(text, true);

  if (mood >= 70) showConfetti();
  else if (mood < 30) showCloud();
}

// Вызывается после завершения практики
export function showAvatarForPractice(practiceType, result, mood) {
  _lastAction = result === 'positive' ? 'practice_positive' : 'practice_negative';
  const lang      = getLang();
  const moodType  = getMoodType(mood ?? 50);
  const pool      = ((MSG.practice[lang] || MSG.practice.ru)[result] || {})[moodType] || [];
  let   text      = pickRandom(pool) || '';
  const moodLabel = getMoodLabel(mood ?? 50);
  text = text.replace('{practice}', practiceType || '').replace('{mood}', moodLabel);

  // Проверяем паттерн — часто используемая практика
  const top = getMostUsedPractice();
  if (top && top === practiceType && result === 'positive') {
    text = pickRandom(MSG.memory[lang] || MSG.memory.ru);
  }

  showAvatar(text, true, null, 'practice');
  if (result === 'positive') _showConfetti();
  else _showCloud();
}

// Вызывается после показа инсайта
export function showAvatarForInsight() {
  _lastAction = 'insight';
  const lang = getLang();
  const text = pickRandom(MSG.insight[lang] || MSG.insight.ru);
  showAvatar(text, true, null, 'insight');
}

// Вызывается при возврате в приложение (visibilitychange)
export function showAvatarOnReturn() {
  const lang = getLang();
  const text = pickRandom(MSG.returnApp[lang] || MSG.returnApp.ru);
  showAvatar(text, false, null, 'support');
}

// Вызывается после сохранения записи с событиями
export function showAvatarAfterSave({ mood, events = [], previousMood = null, pattern = null }) {
  const lang = getLang();
  let text = '';
  
  // Паттерны имеют приоритет
  if (pattern) {
    if (pattern.type === 'positive') {
      text = pickRandom(MSG.patternPositive[lang] || MSG.patternPositive.en);
    } else if (pattern.type === 'negative') {
      text = pickRandom(MSG.patternNegative[lang] || MSG.patternNegative.en);
    }
    showAvatar(text, true, null, 'support');
    return;
  }
  
  // Анализ улучшения
  if (previousMood !== null && mood > previousMood + 10) {
    text = pickRandom(MSG.improvement[lang] || MSG.improvement.en);
    showAvatar(text, true, null, 'support');
    return;
  }
  
  // Анализ низкого настроения
  if (mood < 40) {
    text = pickRandom(MSG.lowMood[lang] || MSG.lowMood.en);
    showAvatar(text, true, null, 'support');
    return;
  }
  
  // Анализ событий
  if (events.length > 0) {
    const afterSave = MSG.afterSave[lang] || MSG.afterSave.en;
    
    if (events.length === 1) {
      const eventMsgs = afterSave.withEvents[events[0]];
      if (eventMsgs) {
        text = pickRandom(eventMsgs);
      } else {
        text = pickRandom(afterSave.noEvents);
      }
    } else {
      text = pickRandom(afterSave.multiple);
    }
  } else {
    const afterSave = MSG.afterSave[lang] || MSG.afterSave.en;
    text = pickRandom(afterSave.noEvents);
  }
  
  showAvatar(text, true, null, 'support');
}

// Проверяет и показывает streak
export function checkAndShowStreak() {
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    if (history.length < 3) return;
    
    const sorted = [...history].sort((a, b) => (b.time || b.date) - (a.time || a.date));
    const now = new Date();
    let streak = 1;
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(parseInt(sorted[i - 1].time || sorted[i - 1].date));
      const curr = new Date(parseInt(sorted[i].time || sorted[i].date));
      
      const diffDays = Math.floor((prev - curr) / (24 * 60 * 60 * 1000));
      
      if (diffDays <= 1) {
        streak++;
      } else {
        break;
      }
    }
    
    if (streak >= 3) {
      const lang = getLang();
      let text = pickRandom(MSG.streak[lang] || MSG.streak.en);
      text = text.replace('{n}', streak);
      showAvatar(text, false, null, 'support');
    }
  } catch (e) {
    console.warn('[AVATAR] streak check error:', e);
  }
}

// Проверяет возврат после паузы
export function checkAndShowReturnAfterPause() {
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    if (history.length < 2) return;
    
    const sorted = [...history].sort((a, b) => (b.time || b.date) - (a.time || a.date));
    const lastTime = parseInt(sorted[0]?.time || sorted[0]?.date);
    const daysSince = (Date.now() - lastTime) / (24 * 60 * 60 * 1000);
    
    if (daysSince >= 3) {
      const lang = getLang();
      const text = pickRandom(MSG.returnPause[lang] || MSG.returnPause.en);
      showAvatar(text, false, null, 'support');
    }
  } catch (e) {
    console.warn('[AVATAR] return after pause check error:', e);
  }
}

export function maybeShowAvatarProactive() {
  const now           = Date.now();
  const lastProactive = parseInt(localStorage.getItem('avatar_last_proactive') || '0');

  // ПРИОРИТЕТ 0: 3+ дня подряд ниже 35% — режим мягкой поддержки
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    const lang = getLang();

    if (history.length >= 3) {
      const sorted = [...history].sort((a, b) => (b.time || b.date) - (a.time || a.date));

      const dayMap = {};
      sorted.forEach(e => {
        const day = new Date(e.time || e.date).toDateString();
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(e.value);
      });

      const days = Object.keys(dayMap).slice(0, 3);
      const allLow = days.length >= 3 && days.every(day => {
        const avg = dayMap[day].reduce((s, v) => s + v, 0) / dayMap[day].length;
        return avg < 35;
      });

      if (allLow) {
        const lastSupport = parseInt(localStorage.getItem('avatar_last_support') || '0');
        if (now - lastSupport > 12 * 60 * 60 * 1000) {
          const supportMessages = {
            ru: [
              "Последние дни даются тяжело — это я вижу. Ты не один с этим.",
              "Три дня непросто — это требует сил. Попробуй дыхательную практику, она реально помогает.",
              "Я замечаю что тебе сейчас тяжело. Один маленький шаг — уже много.",
              "Тяжёлые дни проходят. Хочешь попробовать что-то что помогало раньше?"
            ],
            en: [
              "These past days have been hard — I see that. You're not alone in this.",
              "Three tough days takes real strength. Try a breathing practice — it genuinely helps.",
              "I notice things have been heavy lately. One small step is already a lot.",
              "Hard days pass. Want to try something that helped before?"
            ],
            es: [
              "Los últimos días han sido difíciles — lo veo. No estás solo en esto.",
              "Tres días difíciles requieren mucha fuerza. Prueba la práctica de respiración.",
              "Noto que las cosas han estado pesadas últimamente. Un pequeño paso ya es mucho.",
              "Los días difíciles pasan. ¿Quieres intentar algo que ayudó antes?"
            ],
            uk: [
              "Останні дні даються важко — я це бачу. Ти не один з цим.",
              "Три дні непросто — це потребує сил. Спробуй дихальну практику.",
              "Я помічаю що тобі зараз важко. Один маленький крок — це вже багато.",
              "Важкі дні минають. Хочеш спробувати щось що допомагало раніше?"
            ],
            hi: [
              "पिछले कुछ दिन कठिन रहे हैं — मैं यह देख रहा हूं। आप इसमें अकेले नहीं हैं।",
              "तीन कठिन दिन बहुत ताकत लेते हैं। श्वास अभ्यास आज़माएं — यह सच में मदद करता है।",
              "मैं देख रहा हूं कि चीजें भारी हैं। एक छोटा कदम भी बहुत है।",
              "कठिन दिन गुजर जाते हैं। कुछ आज़माना चाहते हैं जो पहले मदद करता था?"
            ]
          };

          const msgs = supportMessages[lang] || supportMessages.ru;
          const text = msgs[Math.floor(Math.random() * msgs.length)];

          localStorage.setItem('avatar_last_support', String(now));
          localStorage.setItem('avatar_last_proactive', String(now));
          showAvatar({ text, force: true, source: 'support' });
          return;
        }
      }
    }
  } catch(e) {
    console.warn('[avatar] support check error:', e);
  }

  if (now - lastProactive < PROACTIVE_COOLDOWN) return;
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    const lang    = getLang();
    let   type    = null;
    if (!history.length) {
      type = 'inactive';
    } else {
      const sorted   = [...history].sort((a,b) => (b.time||b.date) - (a.time||a.date));
      const lastTime = sorted[0]?.time || sorted[0]?.date;
      if (lastTime && (now - parseInt(lastTime)) > 6 * 60 * 60 * 1000) {
        type = 'inactive';
      } else {
        const today = new Date().toDateString();
        const hasToday = sorted.some(e => {
          const t = e.time || e.date;
          return t && new Date(parseInt(t)).toDateString() === today;
        });
        if (!hasToday) {
          type = 'noEntry';
        } else if (sorted.length >= 2) {
          const last = sorted[0]?.value, prev = sorted[1]?.value;
          if (last != null && prev != null && last < prev - 10) type = 'decline';
        }
      }
    }
    if (type) {
      const msgs = (MSG.proactive[lang] || MSG.proactive.ru)[type];
      showAvatar(pickRandom(msgs), false, null, 'idle');
      localStorage.setItem('avatar_last_proactive', String(now));
    }
  } catch(e) { console.warn('[AVATAR] proactive error:', e); }
}

// ─── Idle trigger (бездействие) ───────────────────────────────────────────────

export function showAvatarIdle() {
  _lastAction = 'idle';
  const lang = getLang();
  const text = pickRandom(MSG.idle[lang] || MSG.idle.ru);
  showAvatar(text, false, null, 'idle');
}

// ─── Effects ──────────────────────────────────────────────────────────────────

function showConfetti() { _showConfetti(); }
function showCloud() { _showCloud(); }

function _showConfetti() {
  const c = document.getElementById('avatar-effects');
  if (!c) return;
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className  = 'confetti';
    el.style.left = Math.random() * 40 + 'px';
    el.style.background = EFFECT_COLORS[Math.floor(Math.random() * EFFECT_COLORS.length)];
    c.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

function _showCloud() {
  const c = document.getElementById('avatar-effects');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'cloud'; el.textContent = '☁️';
  c.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ─── Enable / disable ────────────────────────────────────────────────────────

export function setAvatarEnabled(enabled) { _enabled = enabled; }
export function isAvatarEnabled()          { return _enabled;   }

// ─── initAvatar ───────────────────────────────────────────────────────────────

export function initAvatar() {
  if (_initialized) { console.warn('[AVATAR] Already initialized'); return; }
  _initialized = true;

  const container = document.getElementById('avatar-container');
  if (!container) { console.error('[AVATAR] #avatar-container not found'); return; }

  container.style.position    = 'fixed';
  container.style.zIndex      = '9000';
  container.style.touchAction = 'none';

  _initDrag(container);
  setAvatarState({ visible: false, isIdle: true });
  renderAvatar();

  // Слушаем возврат в приложение
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) showAvatarOnReturn();
  });

  console.log('[AVATAR] initAvatar v3 complete');
}

export { initAvatar as initAvatarTap };
