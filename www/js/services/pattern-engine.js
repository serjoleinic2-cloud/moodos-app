// ⚠️ Использовать только через SystemCore
// ===============================
// Neyra Pattern Engine
// Поиск закономерностей и триггеров
// ===============================
import { getMoodHistory, getSessionHistory, getNotesHistory } from "./memory.js";

// ---- ЛУЧШЕЕ ВРЕМЯ ДНЯ ----
export function getBestHourOfDay() {
  const history = getMoodHistory();
  if (history.length < 5) return null;

  const byHour = {};
  history.forEach(entry => {
    const h = new Date(entry.time).getHours();
    if (!byHour[h]) byHour[h] = { sum: 0, count: 0 };
    byHour[h].sum += entry.value;
    byHour[h].count++;
  });

  let bestHour = null, bestAvg = -1;
  Object.keys(byHour).forEach(h => {
    const avg = byHour[h].sum / byHour[h].count;
    if (avg > bestAvg) { bestAvg = avg; bestHour = parseInt(h); }
  });
  return bestHour;
}

// ---- ЛУЧШИЙ ДЕНЬ НЕДЕЛИ ----
export function getBestDayOfWeek() {
  const history = getMoodHistory();
  if (history.length < 7) return null;

  const byDay = {};
  history.forEach(entry => {
    const d = new Date(entry.time).getDay();
    if (!byDay[d]) byDay[d] = { sum: 0, count: 0 };
    byDay[d].sum += entry.value;
    byDay[d].count++;
  });

  let bestDay = null, bestAvg = -1;
  Object.keys(byDay).forEach(d => {
    const avg = byDay[d].sum / byDay[d].count;
    if (avg > bestAvg) { bestAvg = avg; bestDay = parseInt(d); }
  });
  return bestDay;
}

// ---- ПАТТЕРН: ВЕЧЕРНЕЕ ПАДЕНИЕ ----
export function hasEveningDip() {
  const history = getMoodHistory();
  if (history.length < 10) return false;

  const morning = history.filter(e => { const h = new Date(e.time).getHours(); return h >= 9 && h < 14; });
  const evening = history.filter(e => { const h = new Date(e.time).getHours(); return h >= 18 && h < 23; });

  if (morning.length < 3 || evening.length < 3) return false;

  const avgMorning = morning.reduce((s, e) => s + e.value, 0) / morning.length;
  const avgEvening = evening.reduce((s, e) => s + e.value, 0) / evening.length;
  return avgEvening < avgMorning - 10;
}

// ---- ПАТТЕРН: НЕСТАБИЛЬНЫЕ ДНИ ----
export function getVolatileDaysRate() {
  const history = getMoodHistory();
  if (history.length < 5) return null;

  const byDay = {};
  history.forEach(entry => {
    const d = new Date(entry.time).toDateString();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(entry.value);
  });

  const days     = Object.keys(byDay);
  const volatile = days.filter(d => {
    const vals = byDay[d];
    return vals.length >= 2 && Math.max(...vals) - Math.min(...vals) > 30;
  });
  return Math.round((volatile.length / days.length) * 100);
}

// ---- ЭФФЕКТ ПРАКТИК ПО ВРЕМЕНИ ДНЯ ----
export function getBestPracticeTime(type) {
  const sessions = getSessionHistory().filter(s => s.type === type && s.result === "positive");
  if (sessions.length < 3) return null;

  const byPeriod = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  sessions.forEach(s => {
    const h = new Date(s.timestamp).getHours();
    let period;
    if      (h >= 6  && h < 12) period = "morning";
    else if (h >= 12 && h < 17) period = "afternoon";
    else if (h >= 17 && h < 22) period = "evening";
    else                         period = "night";
    byPeriod[period]++;
  });

  const best = Object.keys(byPeriod).reduce((a, b) => byPeriod[a] > byPeriod[b] ? a : b);
  const labels = { morning: "утром (6–12)", afternoon: "днём (12–17)", evening: "вечером (17–22)", night: "ночью" };
  return labels[best] || best;
}

// ---- ТРИГГЕРЫ ИЗ ЗАМЕТОК ----
export function getNoteTriggers() {
  const notes   = getNotesHistory();
  const history = getMoodHistory();
  if (notes.length < 5) return [];

  // Определяем язык по первым заметкам
  function detectLang(text) {
    if (/[іїєґ]/i.test(text))     return "uk";
    if (/[а-яё]/i.test(text))      return "ru";
    if (/[áéíóúñ¿¡]/i.test(text)) return "es";
    return "en";
  }

  const sampleText = notes.slice(0, 5).map(n => n.text || n.note || "").join(" ");
  const lang       = detectLang(sampleText);

  const keywords = [
    { ru: ["не спал", "мало сплю", "плохо спал", "не высплался", "бессонница", "просыпался", "разбитость", "тяжело встать"], en: ["didn't sleep", "bad sleep", "insomnia", "couldn't sleep", "woke up early", "exhausted morning"], es: ["no dormí", "mal dormir", "insomnio", "no pude dormir", "me desperté", "agotado"], uk: ["не спав", "мало сплю", "погано спав", "не виспався", "безсоння", "прокидався", "важко встати"], category: "sleep" },
    { ru: ["кофе", "кофеин", "энергетик", "много кофе", "без кофе"], en: ["coffee", "caffeine", "energy drink", "red bull", "too much coffee"], es: ["café", "cafeína", "bebida energética", "mucho café"], uk: ["кава", "кофеїн", "енергетик", "багато кави"], category: "caffeine" },
    { ru: ["не ел", "пропустил еду", "голод", "голодный", "переел", "фастфуд", "сладкое", "сахар"], en: ["didn't eat", "skipped meal", "hungry", "overate", "fast food", "junk food", "sugar"], es: ["no comí", "salté comida", "hambre", "comí de más", "comida rápida", "azúcar"], uk: ["не їв", "пропустив їжу", "голод", "голодний", "переїв", "фастфуд", "солодке", "цукор"], category: "food" },
    { ru: ["алкоголь", "выпил", "вино", "пиво", "похмелье", "после вечеринки"], en: ["alcohol", "drank", "wine", "beer", "hangover", "after party"], es: ["alcohol", "bebí", "vino", "cerveza", "resaca", "después de fiesta"], uk: ["алкоголь", "випив", "вино", "пиво", "похмілля", "після вечірки"], category: "alcohol" },
    { ru: ["дедлайн", "переработка", "завал", "выгорание", "совещание", "начальник", "не успеваю", "много задач"], en: ["deadline", "overwork", "burnout", "meeting", "boss", "overwhelmed", "too much work"], es: ["fecha límite", "sobrecarga", "agotamiento", "reunión", "jefe", "no llego"], uk: ["дедлайн", "переробка", "завал", "вигорання", "нарада", "начальник", "не встигаю"], category: "work" },
    { ru: ["один", "одна", "одиноко", "никого", "изоляция"], en: ["alone", "lonely", "loneliness", "no one", "isolated"], es: ["solo", "sola", "soledad", "nadie", "aislado"], uk: ["один", "одна", "самотньо", "нікого", "ізоляція"], category: "loneliness" },
    { ru: ["поругался", "ссора", "конфликт", "расстались", "разрыв", "игнорируют"], en: ["argument", "fight", "conflict", "breakup", "ignored", "rejected"], es: ["pelea", "discusión", "conflicto", "ruptura", "ignorado"], uk: ["посварився", "сварка", "конфлікт", "розійшлися", "розрив", "ігнорують"], category: "conflict" },
    { ru: ["много людей", "толпа", "шумно", "устал от общения"], en: ["too many people", "crowd", "noisy", "drained socially", "tired of people"], es: ["mucha gente", "multitud", "ruidoso", "cansado de gente"], uk: ["багато людей", "натовп", "шумно", "втомився від спілкування"], category: "social_overload" },
    { ru: ["голова болит", "мигрень", "болит спина", "зажат", "болею", "давление"], en: ["headache", "migraine", "back pain", "tense", "sick", "ill", "blood pressure"], es: ["dolor de cabeza", "migraña", "dolor de espalda", "tenso", "enfermo", "presión"], uk: ["болить голова", "мігрень", "болить спина", "затиснутий", "хворію", "тиск"], category: "physical" },
    { ru: ["пропустил тренировку", "нет спорта", "потренировался", "пробежка", "зал"], en: ["skipped workout", "no exercise", "worked out", "gym", "run", "training"], es: ["salté entreno", "sin ejercicio", "entrené", "gimnasio", "carrera"], uk: ["пропустив тренування", "немає спорту", "потренувався", "пробіжка", "зал"], category: "exercise" },
    { ru: ["тревога", "беспокойство", "паника", "нервничаю", "страх", "накручиваю"], en: ["anxiety", "worry", "panic", "nervous", "fear", "overthinking"], es: ["ansiedad", "preocupación", "pánico", "nervioso", "miedo", "dando vueltas"], uk: ["тривога", "занепокоєння", "паніка", "нервую", "страх", "накручую"], category: "anxiety" },
    { ru: ["апатия", "ничего не хочется", "нет сил", "нет мотивации", "пустота", "всё бесит"], en: ["apathy", "no motivation", "no energy", "emptiness", "irritated", "everything annoys"], es: ["apatía", "sin motivación", "sin energía", "vacío", "irritado", "todo molesta"], uk: ["апатія", "нічого не хочеться", "немає сил", "немає мотивації", "порожнеча", "все дратує"], category: "apathy" },
    { ru: ["дождь", "пасмурно", "холодно", "магнитная буря", "темно", "зима"], en: ["rain", "cloudy", "cold", "gloomy", "dark", "winter", "bad weather"], es: ["lluvia", "nublado", "frío", "oscuro", "invierno", "mal tiempo"], uk: ["дощ", "похмуро", "холодно", "магнітна буря", "темно", "зима"], category: "weather" },
    { ru: ["денег нет", "долг", "кредит", "финансы", "потратил лишнее"], en: ["no money", "debt", "loan", "finances", "overspent", "bills"], es: ["sin dinero", "deuda", "préstamo", "finanzas", "gasté de más"], uk: ["немає грошей", "борг", "кредит", "фінанси", "витратив зайве"], category: "money" },
    { ru: ["соцсети", "скролил", "новости", "ночью в телефоне", "не мог оторваться"], en: ["social media", "scrolling", "news", "phone at night", "doomscrolling", "couldn't stop"], es: ["redes sociales", "scrolleando", "noticias", "teléfono de noche", "no podía parar"], uk: ["соцмережі", "скролив", "новини", "вночі в телефоні", "не міг відірватися"], category: "screens" },
  ];

  const categoryLabels = {
    sleep:          { ru: "сон",             en: "sleep",          es: "sueño",        uk: "сон" },
    caffeine:       { ru: "кофе/кофеин",     en: "coffee/caffeine",es: "café/cafeína", uk: "кава/кофеїн" },
    food:           { ru: "питание",         en: "food",           es: "alimentación", uk: "харчування" },
    alcohol:        { ru: "алкоголь",        en: "alcohol",        es: "alcohol",      uk: "алкоголь" },
    work:           { ru: "работа/стресс",   en: "work/stress",    es: "trabajo",      uk: "робота/стрес" },
    loneliness:     { ru: "одиночество",     en: "loneliness",     es: "soledad",      uk: "самотність" },
    conflict:       { ru: "конфликт",        en: "conflict",       es: "conflicto",    uk: "конфлікт" },
    social_overload:{ ru: "соц. перегрузка", en: "social overload",es: "sobrecarga",   uk: "соц. перевантаження" },
    physical:       { ru: "самочувствие",    en: "physical state", es: "estado físico",uk: "самопочуття" },
    exercise:       { ru: "спорт",           en: "exercise",       es: "ejercicio",    uk: "спорт" },
    anxiety:        { ru: "тревога",         en: "anxiety",        es: "ansiedad",     uk: "тривога" },
    apathy:         { ru: "апатия",          en: "apathy",         es: "apatía",       uk: "апатія" },
    weather:        { ru: "погода",          en: "weather",        es: "clima",        uk: "погода" },
    money:          { ru: "финансы",         en: "finances",       es: "finanzas",     uk: "фінанси" },
    screens:        { ru: "экраны/соцсети",  en: "screens/social media", es: "pantallas", uk: "екрани/соцмережі" },
  };

  const results = [];

  keywords.forEach(kwObj => {
    const words = kwObj[lang] || kwObj.en;

    const matchingNotes = notes.filter(n =>
      words.some(w => (n.text || n.note || "").toLowerCase().includes(w))
    );
    if (matchingNotes.length < 2) return;

    const avgMoodWithKeyword = matchingNotes.reduce((sum, note) => {
      const ts       = note.timestamp || note.time;
      const day      = new Date(ts).toDateString();
      const dayEntries = history.filter(e => new Date(e.time).toDateString() === day);
      if (!dayEntries.length) return sum;
      return sum + dayEntries.reduce((s, e) => s + e.value, 0) / dayEntries.length;
    }, 0) / matchingNotes.length;

    if (!history.length) return;
    const globalAvg = history.reduce((s, e) => s + e.value, 0) / history.length;
    const diff      = Math.round(avgMoodWithKeyword - globalAvg);

    if (diff < -5) {
      results.push({
        keyword:  categoryLabels[kwObj.category][lang] || kwObj.category,
        category: kwObj.category,
        diff,
        count: matchingNotes.length
      });
    }
  });

  return results.sort((a, b) => a.diff - b.diff).slice(0, 3);
}

// ---- СВОДКА ПАТТЕРНОВ ----
export function getPatternSummary() {
  return {
    bestHour:       getBestHourOfDay(),
    bestDay:        getBestDayOfWeek(),
    eveningDip:     hasEveningDip(),
    volatileRate:   getVolatileDaysRate(),
    noteTriggers:   getNoteTriggers(),
    eventPatterns:  getEventPatterns(),
    eventCombos:    getEventCombinations(),
    bestBreathTime: getBestPracticeTime("breathing"),
    bestMeditTime:  getBestPracticeTime("meditation"),
  };
}

// ---- АНАЛИТИКА СОБЫТИЙ ПО ПЕРИОДАМ ДНЯ ----
export function getEventPatterns() {
  const history = getMoodHistory();
  if (history.length < 5) return [];

  const globalAvg = history.reduce((s, e) => s + e.value, 0) / history.length;
  const eventData = {};

  history.forEach(entry => {
    if (!entry.events || !entry.events.length) return;
    const hour = new Date(entry.time).getHours();
    const period = hour >= 6 && hour < 12 ? 'morning'
                 : hour >= 12 && hour < 17 ? 'afternoon'
                 : hour >= 17 && hour < 22 ? 'evening' : 'night';

    entry.events.forEach(eventId => {
      const key = `${eventId}::${period}`;
      if (!eventData[key]) eventData[key] = { sum: 0, count: 0, eventId, period };
      eventData[key].sum   += entry.value;
      eventData[key].count += 1;
    });
  });

  const periodLabel = {
    morning: { ru:"утром", en:"in the morning", es:"por la mañana", uk:"вранці", hi:"सुबह" },
    afternoon:{ ru:"днём",  en:"in the afternoon",es:"por la tarde", uk:"вдень",  hi:"दोपहर में" },
    evening: { ru:"вечером",en:"in the evening", es:"por la noche",  uk:"ввечері",hi:"शाम को" },
    night:   { ru:"ночью",  en:"at night",       es:"de noche",      uk:"вночі",  hi:"रात को" }
  };

  const eventLabel = {
    coffee: { ru:"кофе",     en:"coffee",   es:"café",     uk:"кава",    hi:"कॉफी" },
    walk:   { ru:"прогулка", en:"walking",  es:"caminar",  uk:"прогулянка",hi:"वॉक" },
    work:   { ru:"работа",   en:"work",     es:"trabajo",  uk:"робота",  hi:"काम" },
    sport:  { ru:"спорт",    en:"sport",    es:"deporte",  uk:"спорт",   hi:"स्पोर्ट" },
    social: { ru:"общение",  en:"socializing",es:"socializar",uk:"спілкування",hi:"मेलजोल" },
    sleep:  { ru:"сон",      en:"sleep",    es:"sueño",    uk:"сон",     hi:"नींद" },
    music:  { ru:"музыка",   en:"music",    es:"música",   uk:"музика",  hi:"संगीत" },
    food:   { ru:"еда",      en:"food",     es:"comida",   uk:"їжа",     hi:"खाना" },
    rest:   { ru:"отдых",    en:"rest",     es:"descanso", uk:"відпочинок",hi:"आराम" },
    stress: { ru:"стресс",   en:"stress",   es:"estrés",   uk:"стрес",   hi:"तनाव" },
    alcohol: { ru:"алкоголь", en:"alcohol",  es:"alcohol",  uk:"алкоголь",hi:"शराब" },
    nature: { ru:"природа",   en:"nature",   es:"naturaleza",uk:"природа", hi:"प्रकृति" },
    screen: { ru:"экраны",    en:"screens",  es:"pantallas",uk:"екрани",  hi:"स्क्रीन" },
    period: { ru:"цикл",      en:"cycle",    es:"ciclo",    uk:"цикл",    hi:"साइकिल" },
    creative:{ ru:"творчество",en:"creative",es:"creatividad",uk:"творчість",hi:"रचनात्मकता" }
  };

  const lang = localStorage.getItem('app_language') || 'ru';
  const insights = [];

  Object.values(eventData).forEach(d => {
    if (d.count < 2) return;
    const avg  = d.sum / d.count;
    const diff = Math.round(avg - globalAvg);
    if (Math.abs(diff) < 6) return;

    const evName  = eventLabel[d.eventId]?.[lang]  || d.eventId;
    const perName = periodLabel[d.period]?.[lang]   || d.period;
    const sign    = diff > 0 ? '+' : '';

    const text = {
      ru: `${evName.charAt(0).toUpperCase()+evName.slice(1)} ${perName} влияет на тебя ${diff > 0 ? 'хорошо' : 'тяжелее'} — настроение ${sign}${diff} пунктов`,
      en: `${evName.charAt(0).toUpperCase()+evName.slice(1)} ${perName} affects you ${diff > 0 ? 'positively' : 'negatively'} — mood ${sign}${diff} pts`,
      es: `${evName.charAt(0).toUpperCase()+evName.slice(1)} ${perName} te afecta ${diff > 0 ? 'bien' : 'negativamente'} — estado ${sign}${diff} pts`,
      uk: `${evName.charAt(0).toUpperCase()+evName.slice(1)} ${perName} впливає на тебе ${diff > 0 ? 'добре' : 'важче'} — настрій ${sign}${diff} балів`,
      hi: `${perName} ${evName} आपको ${diff > 0 ? 'अच्छा' : 'कठिन'} लगता है — मूड ${sign}${diff} पॉइंट`
    };

    insights.push({
      eventId: d.eventId,
      period:  d.period,
      diff,
      count:   d.count,
      text:    text[lang] || text.ru
    });
  });

  const byEvent = {};
  insights.forEach(i => {
    if (!byEvent[i.eventId]) byEvent[i.eventId] = [];
    byEvent[i.eventId].push(i);
  });

  const crossInsights = [];
  Object.entries(byEvent).forEach(([eventId, arr]) => {
    if (arr.length < 2) return;
    const sorted = [...arr].sort((a, b) => b.diff - a.diff);
    const best   = sorted[0];
    const worst  = sorted[sorted.length - 1];
    if (best.period === worst.period) return;
    if (Math.abs(best.diff - worst.diff) < 8) return;

    const evName    = eventLabel[eventId]?.[lang] || eventId;
    const bestPer   = periodLabel[best.period]?.[lang]  || best.period;
    const worstPer  = periodLabel[worst.period]?.[lang] || worst.period;

    const crossText = {
      ru: `Заметил: ${evName} ${bestPer} влияет на тебя лучше, чем ${worstPer}`,
      en: `Noticed: ${evName} ${bestPer} works better for you than ${worstPer}`,
      es: `Notado: ${evName} ${bestPer} te funciona mejor que ${worstPer}`,
      uk: `Помітив: ${evName} ${bestPer} впливає на тебе краще, ніж ${worstPer}`,
      hi: `देखा: ${evName} ${bestPer} आपके लिए ${worstPer} से बेहतर काम करता है`
    };

    crossInsights.push({
      eventId,
      text: crossText[lang] || crossText.ru,
      diff: best.diff - worst.diff
    });
  });

  return {
    single: insights.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 4),
    cross:  crossInsights.sort((a, b) => b.diff - a.diff).slice(0, 2)
  };
}

// ---- ПАРНЫЕ ЗАВИСИМОСТИ ----
export function getEventCombinations() {
  const history = getMoodHistory().filter(e => e.events && e.events.length >= 2);
  if (history.length < 3) return [];

  const globalAvg = getMoodHistory().reduce((s, e) => s + e.value, 0) / getMoodHistory().length;
  const lang      = localStorage.getItem('app_language') || 'ru';
  const combos    = {};

  history.forEach(entry => {
    const evs = entry.events;
    for (let i = 0; i < evs.length; i++) {
      for (let j = i + 1; j < evs.length; j++) {
        const key = [evs[i], evs[j]].sort().join('+');
        if (!combos[key]) combos[key] = { sum: 0, count: 0 };
        combos[key].sum   += entry.value;
        combos[key].count += 1;
      }
    }
  });

  const eventEmoji = {
    coffee:"☕", walk:"🚶", work:"💼", sport:"🏃",
    social:"👥", sleep:"😴", music:"🎵", food:"🍽", rest:"😌", stress:"😤",
    alcohol:"🍷", nature:"🌿", screen:"📱", period:"🌸", creative:"🎨"
  };

  const results = [];
  Object.entries(combos).forEach(([key, d]) => {
    if (d.count < 2) return;
    const avg  = d.sum / d.count;
    const diff = Math.round(avg - globalAvg);
    if (Math.abs(diff) < 8) return;

    const [a, b] = key.split('+');
    const ea = eventEmoji[a] || '•', eb = eventEmoji[b] || '•';

    const text = {
      ru: `${ea}+${eb} вместе ${diff > 0 ? 'поднимают' : 'снижают'} настроение на ${Math.abs(diff)} пунктов`,
      en: `${ea}+${eb} together ${diff > 0 ? 'boost' : 'lower'} your mood by ${Math.abs(diff)} pts`,
      es: `${ea}+${eb} juntos ${diff > 0 ? 'suben' : 'bajan'} tu estado en ${Math.abs(diff)} pts`,
      uk: `${ea}+${eb} разом ${diff > 0 ? 'піднімають' : 'знижують'} настрій на ${Math.abs(diff)} балів`,
      hi: `${ea}+${eb} साथ में आपका मूड ${Math.abs(diff)} पॉइंट ${diff > 0 ? 'बढ़ाते' : 'घटाते'} हैं`
    };

    results.push({ combo: [a, b], diff, count: d.count, text: text[lang] || text.ru });
  });

  return results.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 3);
}

export async function detect(currentState) {
  return {
    summary: getPatternSummary(),
    bestTime: getBestHourOfDay()
  }
}