// ===============================
// MoodOS Pattern Engine
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
    bestBreathTime: getBestPracticeTime("breathing"),
    bestMeditTime:  getBestPracticeTime("meditation"),
  };
}