// ============================================================
// neyra-reactions.js — Живые реакции Нейры после отметки
// ============================================================

const reactions = {
  ru: {
    // Возвращение после перерыва
    return_after_break: [
      'Ты вернулся. Я рада.',
      'Несколько дней без тебя. Рада что ты здесь.',
      'Давно не виделись. Как ты?',
    ],
    // Серия дней
    streak_3: [
      'Три дня подряд. Это уже привычка.',
      'Ты здесь три дня. Продолжай.',
    ],
    streak_7: [
      'Неделя каждый день. Я это замечаю.',
      'Семь дней подряд — это серьёзно.',
    ],
    streak_14: [
      'Две недели. Ты многое о себе узнал за это время.',
      'Четырнадцать дней. Ты молодец.',
    ],
    // Высокое настроение
    mood_high: [
      'Хорошо. Рада это видеть.',
      'Сегодня хороший день. Запомни это ощущение.',
      'Так держать.',
      'Приятно когда так. Что помогло?',
    ],
    // Среднее настроение
    mood_mid: [
      'Обычный день. Они тоже важны.',
      'Не плохо, не отлично — и это нормально.',
      'Середина — стабильное место.',
    ],
    // Низкое настроение
    mood_low: [
      'Тяжело сегодня. Я здесь.',
      'Бывают такие дни. Ты не один.',
      'Слышу тебя. Это пройдёт.',
      'Спасибо что отметил. Это смелость.',
    ],
    // Очень низкое
    mood_very_low: [
      'Я рядом. Никуда не ухожу.',
      'Тяжёлый момент. Ты справишься — я видела это раньше.',
      'Просто побудь здесь. Это уже что-то.',
    ],
    // Триггеры — позитивные
    trigger_walk: [
      'Прогулка — хороший выбор.',
      'Свежий воздух делает своё дело.',
      'Движение помогает. Хорошо.',
    ],
    trigger_sport: [
      'Тело говорит спасибо.',
      'Спорт сегодня — это уже победа.',
    ],
    trigger_sleep: [
      'Сон важен. Рада что ты его замечаешь.',
      'Хороший сон меняет всё.',
    ],
    trigger_nature: [
      'Природа лечит. Хорошо что ты там был.',
      'Зелень и воздух — лучшее.',
    ],
    trigger_social: [
      'Люди рядом — это ресурс.',
      'Общение заряжает. Хорошо.',
    ],
    trigger_music: [
      'Музыка меняет состояние. Знаешь это.',
      'Хороший выбор — музыка.',
    ],
    trigger_creative: [
      'Творчество разгружает. Хорошо.',
      'Создавать что-то — это особое.',
    ],
    trigger_rest: [
      'Отдых это не слабость. Хорошо.',
      'Пауза нужна. Ты правильно делаешь.',
    ],
    // Триггеры — требующие внимания
    trigger_stress: [
      'Стресс сегодня. Что помогает тебе?',
      'Замечаю стресс. Дай себе паузу.',
      'Тяжело. Попробуй подышать.',
    ],
    trigger_alcohol: [
      'Замечаю. Как ты сейчас на самом деле?',
      'Слышу. Что стоит за этим сегодня?',
    ],
    trigger_screen: [
      'Много экранов сегодня. Как голова?',
      'Экраны устают. Как ты?',
    ],
    // Время суток
    time_night: [
      'Поздно. Позволь себе отдохнуть.',
      'Ночная запись. Как ты?',
    ],
    time_morning: [
      'С утра — хороший знак.',
      'Начать день с себя — правильно.',
    ],
    // Первая запись дня
    first_today: [
      'Первая запись сегодня. Хорошее начало.',
    ],
  },

  en: {
    return_after_break: [
      'You came back. I am glad.',
      'A few days without you. Good to see you here.',
      'It has been a while. How are you?',
    ],
    streak_3: [
      'Three days in a row. This is becoming a habit.',
      'You have been here three days. Keep going.',
    ],
    streak_7: [
      'A week every day. I notice.',
      'Seven days straight — that is real.',
    ],
    streak_14: [
      'Two weeks. You have learned a lot about yourself.',
      'Fourteen days. You are doing well.',
    ],
    mood_high: [
      'Good. I am glad to see this.',
      'A good day today. Remember this feeling.',
      'Keep it up.',
      'Nice when it feels like this. What helped?',
    ],
    mood_mid: [
      'An ordinary day. Those matter too.',
      'Not bad, not great — and that is okay.',
      'Middle ground — a stable place.',
    ],
    mood_low: [
      'Hard day. I am here.',
      'Some days are like this. You are not alone.',
      'I hear you. This will pass.',
      'Thank you for noting it. That takes courage.',
    ],
    mood_very_low: [
      'I am right here. Not going anywhere.',
      'A hard moment. You will get through — I have seen it.',
      'Just be here. That is already something.',
    ],
    trigger_walk: [
      'A walk — good choice.',
      'Fresh air does its thing.',
      'Movement helps. Good.',
    ],
    trigger_sport: [
      'Your body is grateful.',
      'Sport today — already a win.',
    ],
    trigger_sleep: [
      'Sleep matters. Glad you notice it.',
      'Good sleep changes everything.',
    ],
    trigger_nature: [
      'Nature heals. Good that you were there.',
      'Green and air — the best.',
    ],
    trigger_social: [
      'People around — that is a resource.',
      'Connection charges you. Good.',
    ],
    trigger_music: [
      'Music shifts your state. You know this.',
      'Good choice — music.',
    ],
    trigger_creative: [
      'Creating unloads the mind. Good.',
      'Making something — that is special.',
    ],
    trigger_rest: [
      'Rest is not weakness. Good.',
      'A pause is needed. You are doing it right.',
    ],
    trigger_stress: [
      'Stress today. What helps you?',
      'I notice the stress. Give yourself a pause.',
      'Hard. Try breathing.',
    ],
    trigger_alcohol: [
      'I notice. How are you really right now?',
      'I hear you. What is behind it today?',
    ],
    trigger_screen: [
      'A lot of screens today. How is your head?',
      'Screens tire you. How are you?',
    ],
    time_night: [
      'Late. Let yourself rest.',
      'A night entry. How are you?',
    ],
    time_morning: [
      'In the morning — a good sign.',
      'Starting the day with yourself — right.',
    ],
    first_today: [
      'First entry today. Good start.',
    ],
  },

  es: {
    return_after_break: [
      'Volviste. Me alegra.',
      'Unos días sin ti. Me alegra que estés aquí.',
      'Ha pasado un tiempo. ¿Cómo estás?',
    ],
    streak_3: [
      'Tres días seguidos. Esto ya es un hábito.',
      'Llevas tres días aquí. Sigue así.',
    ],
    streak_7: [
      'Una semana cada día. Lo noto.',
      'Siete días seguidos — eso es serio.',
    ],
    streak_14: [
      'Dos semanas. Has aprendido mucho sobre ti.',
      'Catorce días. Lo estás haciendo bien.',
    ],
    mood_high: [
      'Bien. Me alegra verlo.',
      'Un buen día hoy. Recuerda esta sensación.',
      'Así se hace.',
      'Agradable cuando se siente así. ¿Qué ayudó?',
    ],
    mood_mid: [
      'Un día normal. Esos también importan.',
      'Ni mal ni bien — y eso está bien.',
      'El punto medio es un lugar estable.',
    ],
    mood_low: [
      'Día difícil. Estoy aquí.',
      'Algunos días son así. No estás solo.',
      'Te escucho. Esto pasará.',
      'Gracias por anotarlo. Eso requiere valor.',
    ],
    mood_very_low: [
      'Estoy justo aquí. No me voy a ningún lado.',
      'Un momento difícil. Saldrás — lo he visto.',
      'Solo quédate aquí. Eso ya es algo.',
    ],
    trigger_walk: ['Un paseo — buena elección.', 'El aire fresco hace su trabajo.'],
    trigger_sport: ['Tu cuerpo te lo agradece.', 'Deporte hoy — ya es una victoria.'],
    trigger_sleep: ['El sueño importa. Me alegra que lo notes.'],
    trigger_nature: ['La naturaleza sana. Bien que hayas estado allí.'],
    trigger_social: ['Personas cerca — eso es un recurso.'],
    trigger_music: ['La música cambia tu estado. Lo sabes.'],
    trigger_creative: ['Crear descarga la mente. Bien.'],
    trigger_rest: ['Descansar no es debilidad. Bien.'],
    trigger_stress: ['Estrés hoy. ¿Qué te ayuda?', 'Noto el estrés. Date una pausa.'],
    trigger_alcohol: ['Lo noto. ¿Cómo estás realmente ahora?'],
    trigger_screen: ['Muchas pantallas hoy. ¿Cómo está tu cabeza?'],
    time_night: ['Tarde. Permítete descansar.'],
    time_morning: ['Por la mañana — buena señal.'],
    first_today: ['Primera nota hoy. Buen comienzo.'],
  },

  uk: {
    return_after_break: [
      'Ти повернувся. Я рада.',
      'Кілька днів без тебе. Рада що ти тут.',
      'Давно не бачились. Як ти?',
    ],
    streak_3: [
      'Три дні поспіль. Це вже звичка.',
      'Ти тут три дні. Продовжуй.',
    ],
    streak_7: [
      'Тиждень щодня. Я це помічаю.',
      'Сім днів поспіль — це серйозно.',
    ],
    streak_14: [
      'Два тижні. Ти багато дізнався про себе.',
      'Чотирнадцять днів. Молодець.',
    ],
    mood_high: [
      'Добре. Рада це бачити.',
      'Сьогодні гарний день. Запамʼятай це відчуття.',
      'Так тримати.',
    ],
    mood_mid: [
      'Звичайний день. Вони теж важливі.',
      'Не погано, не чудово — і це нормально.',
    ],
    mood_low: [
      'Важко сьогодні. Я тут.',
      'Бувають такі дні. Ти не один.',
      'Чую тебе. Це мине.',
    ],
    mood_very_low: [
      'Я поруч. Нікуди не йду.',
      'Важкий момент. Ти впораєшся.',
    ],
    trigger_walk: ['Прогулянка — хороший вибір.', 'Свіже повітря робить своє.'],
    trigger_sport: ['Тіло дякує.', 'Спорт сьогодні — вже перемога.'],
    trigger_sleep: ['Сон важливий. Рада що помічаєш.'],
    trigger_nature: ['Природа лікує. Добре що ти там був.'],
    trigger_social: ['Люди поруч — це ресурс.'],
    trigger_music: ['Музика змінює стан. Знаєш це.'],
    trigger_creative: ['Творчість розвантажує. Добре.'],
    trigger_rest: ['Відпочинок — не слабкість. Добре.'],
    trigger_stress: ['Стрес сьогодні. Що допомагає тобі?', 'Зроби паузу.'],
    trigger_alcohol: ['Помічаю. Як ти насправді?'],
    trigger_screen: ['Багато екранів сьогодні. Як голова?'],
    time_night: ['Пізно. Дозволь собі відпочити.'],
    time_morning: ['З ранку — хороший знак.'],
    first_today: ['Перший запис сьогодні. Гарний початок.'],
  },

  hi: {
    return_after_break: [
      'आप वापस आए। मुझे खुशी है।',
      'कुछ दिन बिना आपके। अच्छा लगा कि आप यहाँ हैं।',
      'काफी समय हो गया। आप कैसे हैं?',
    ],
    streak_3: [
      'तीन दिन लगातार। यह आदत बन रही है।',
      'आप तीन दिनों से यहाँ हैं। जारी रखें।',
    ],
    streak_7: [
      'एक हफ्ता हर दिन। मैं नोटिस करती हूँ।',
      'सात दिन लगातार — यह गंभीर है।',
    ],
    streak_14: [
      'दो हफ्ते। आपने खुद के बारे में बहुत कुछ सीखा।',
      'चौदह दिन। आप अच्छा कर रहे हैं।',
    ],
    mood_high: [
      'अच्छा। यह देखकर खुशी हुई।',
      'आज अच्छा दिन है। इस एहसास को याद रखें।',
      'ऐसे ही चलते रहें।',
    ],
    mood_mid: [
      'एक साधारण दिन। वे भी मायने रखते हैं।',
      'न बुरा न अच्छा — और यह ठीक है।',
    ],
    mood_low: [
      'आज मुश्किल है। मैं यहाँ हूँ।',
      'कुछ दिन ऐसे होते हैं। आप अकेले नहीं।',
      'आपको सुन रही हूँ। यह गुजर जाएगा।',
    ],
    mood_very_low: [
      'मैं यहाँ हूँ। कहीं नहीं जा रही।',
      'मुश्किल पल है। आप निकलेंगे।',
    ],
    trigger_walk: ['टहलना — अच्छा चुनाव।', 'ताजी हवा अपना काम करती है।'],
    trigger_sport: ['आपका शरीर आभारी है।'],
    trigger_sleep: ['नींद मायने रखती है। अच्छा कि आप ध्यान दे रहे हैं।'],
    trigger_nature: ['प्रकृति ठीक करती है। अच्छा कि आप वहाँ थे।'],
    trigger_social: ['लोग पास — यह एक संसाधन है।'],
    trigger_music: ['संगीत स्थिति बदलता है। आप यह जानते हैं।'],
    trigger_creative: ['बनाना मन को हल्का करता है।'],
    trigger_rest: ['आराम कमजोरी नहीं है।'],
    trigger_stress: ['आज तनाव। क्या मदद करता है?', 'एक पल रुकें।'],
    trigger_alcohol: ['नोटिस कर रही हूँ। आप सच में कैसे हैं?'],
    trigger_screen: ['आज बहुत स्क्रीन। सिर कैसा है?'],
    time_night: ['देर हो गई। खुद को आराम दें।'],
    time_morning: ['सुबह — अच्छा संकेत।'],
    first_today: ['आज पहली एंट्री। अच्छी शुरुआत।'],
  },
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getNeyraReaction({ mood, events = [], timeBucket, dayStreak, daysSinceLastEntry }) {
  const lang = localStorage.getItem('app_language') || 'ru';
  const r = reactions[lang] || reactions.ru;

  // 1. Возвращение после перерыва (приоритет)
  if (daysSinceLastEntry >= 3) {
    return pick(r.return_after_break);
  }

  // 2. Серия дней
  if (dayStreak >= 14) return pick(r.streak_14);
  if (dayStreak >= 7)  return pick(r.streak_7);
  if (dayStreak >= 3)  return pick(r.streak_3);

  // 3. Триггеры — стресс и алкоголь имеют приоритет
  if (events.includes('stress'))   return pick(r.trigger_stress);
  if (events.includes('alcohol'))  return pick(r.trigger_alcohol);

  // 4. Настроение очень низкое
  if (mood < 25) return pick(r.mood_very_low);

  // 5. Позитивные триггеры
  const positiveTriggers = {
    walk: 'trigger_walk', sport: 'trigger_sport', sleep: 'trigger_sleep',
    nature: 'trigger_nature', social: 'trigger_social', music: 'trigger_music',
    creative: 'trigger_creative', rest: 'trigger_rest',
  };
  for (const ev of events) {
    if (positiveTriggers[ev] && r[positiveTriggers[ev]]) {
      return pick(r[positiveTriggers[ev]]);
    }
  }

  // 6. Экраны
  if (events.includes('screen')) return pick(r.trigger_screen);

  // 7. Настроение
  if (mood >= 70) return pick(r.mood_high);
  if (mood < 40)  return pick(r.mood_low);

  // 8. Время суток
  if (timeBucket === 'night')   return pick(r.time_night);
  if (timeBucket === 'morning') return pick(r.time_morning);

  // 9. Среднее
  return pick(r.mood_mid);
}
