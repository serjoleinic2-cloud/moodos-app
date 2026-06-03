const greetingsByLang = {
  ru: {
    morning: [
      'Доброе утро. Как ты сегодня?',
      'Утро — хорошее время начать день осознанно.',
      'С добрым утром. Отметь как ты прямо сейчас.',
      'Новый день. Что ты чувствуешь с утра?',
      'Привет. Утро задаёт тон всему дню — как ты?',
    ],
    day: [
      'Привет. Как проходит день?',
      'День в самом разгаре — как ты себя чувствуешь?',
      'Хорошее время сделать паузу и отметить настроение.',
      'Как ты сейчас? Отметь и я запомню.',
      'Привет. Середина дня — хороший момент чтобы остановиться.',
    ],
    evening: [
      'Добрый вечер. Как прошёл день?',
      'Вечер — время подвести итоги. Как ты?',
      'Привет. День заканчивается — что осталось от него внутри?',
      'Хороший вечер для честной отметки настроения.',
      'Как ты сейчас? Вечером особенно важно это замечать.',
    ],
    night: [
      'Ты ещё не спишь. Как ты?',
      'Поздно — но раз ты здесь, отметь как себя чувствуешь.',
      'Ночное настроение тоже важно. Как ты сейчас?',
      'Привет. Тихая ночь — хороший момент побыть честным с собой.',
      'Ночь. Отметь состояние и позволь себе отдохнуть.',
    ],
  },
  en: {
    morning: [
      'Good morning. How are you today?',
      'Morning is a great time to start the day mindfully.',
      'Good morning. Note how you feel right now.',
      'A new day. What do you feel this morning?',
      'Hi. The morning sets the tone for the day — how are you?',
    ],
    day: [
      'Hi. How is your day going?',
      'The day is in full swing — how do you feel?',
      'A good time to pause and note your mood.',
      'How are you right now? Note it and I will remember.',
      'Hi. Midday — a good moment to stop and check in.',
    ],
    evening: [
      'Good evening. How did your day go?',
      'Evening — time to reflect. How are you?',
      'Hi. The day is ending — what is left inside?',
      'A good evening for an honest mood check.',
      'How are you now? Evenings are especially important to notice.',
    ],
    night: [
      'You are still awake. How are you?',
      'It is late — but since you are here, note how you feel.',
      'A night mood matters too. How are you right now?',
      'Hi. A quiet night — a good moment to be honest with yourself.',
      'Night. Note your state and let yourself rest.',
    ],
  },
  es: {
    morning: [
      'Buenos días. ¿Cómo estás hoy?',
      'La mañana es un buen momento para comenzar el día con consciencia.',
      'Buenos días. Anota cómo te sientes ahora mismo.',
      'Un nuevo día. ¿Qué sientes esta mañana?',
      'Hola. La mañana marca el tono del día — ¿cómo estás?',
    ],
    day: [
      'Hola. ¿Cómo va tu día?',
      'El día está en pleno apogeo — ¿cómo te sientes?',
      'Un buen momento para hacer una pausa y anotar tu estado.',
      '¿Cómo estás ahora? Anótalo y lo recordaré.',
      'Hola. Es mediodía — un buen momento para detenerte.',
    ],
    evening: [
      'Buenas noches. ¿Cómo fue tu día?',
      'La tarde — momento de reflexión. ¿Cómo estás?',
      'Hola. El día termina — ¿qué queda dentro de ti?',
      'Una buena noche para un chequeo honesto del estado de ánimo.',
      '¿Cómo estás ahora? Las noches son especialmente importantes para notarlo.',
    ],
    night: [
      'Todavía estás despierto. ¿Cómo estás?',
      'Es tarde — pero ya que estás aquí, anota cómo te sientes.',
      'El estado de ánimo nocturno también importa. ¿Cómo estás?',
      'Hola. Una noche tranquila — buen momento para ser honesto contigo.',
      'Noche. Anota tu estado y permítete descansar.',
    ],
  },
  uk: {
    morning: [
      'Доброго ранку. Як ти сьогодні?',
      'Ранок — хороший час почати день усвідомлено.',
      'Доброго ранку. Відзнач як ти зараз.',
      'Новий день. Що ти відчуваєш зранку?',
      'Привіт. Ранок задає тон усьому дню — як ти?',
    ],
    day: [
      'Привіт. Як проходить день?',
      'День у самому розпалі — як ти себе почуваєш?',
      'Хороший момент зробити паузу і відзначити настрій.',
      'Як ти зараз? Відзнач і я запамʼятаю.',
      'Привіт. Середина дня — хороший момент зупинитися.',
    ],
    evening: [
      'Добрий вечір. Як пройшов день?',
      'Вечір — час підбити підсумки. Як ти?',
      'Привіт. День закінчується — що залишилось всередині?',
      'Хороший вечір для чесного відстеження настрою.',
      'Як ти зараз? Ввечері особливо важливо це помічати.',
    ],
    night: [
      'Ти ще не спиш. Як ти?',
      'Пізно — але раз ти тут, відзнач як себе почуваєш.',
      'Нічний настрій теж важливий. Як ти зараз?',
      'Привіт. Тиха ніч — хороший момент побути чесним із собою.',
      'Ніч. Відзнач стан і дозволь собі відпочити.',
    ],
  },
  hi: {
    morning: [
      'सुप्रभात। आज आप कैसे हैं?',
      'सुबह का समय दिन की शुरुआत सचेत रूप से करने का है।',
      'सुप्रभात। अभी आप कैसा महसूस कर रहे हैं, नोट करें।',
      'नया दिन। सुबह आप क्या महसूस करते हैं?',
      'नमस्ते। सुबह पूरे दिन का स्वर निर्धारित करती है — आप कैसे हैं?',
    ],
    day: [
      'नमस्ते। दिन कैसा जा रहा है?',
      'दिन अपने चरम पर है — आप कैसा महसूस कर रहे हैं?',
      'एक पल रुककर अपना मूड नोट करने का अच्छा समय है।',
      'अभी आप कैसे हैं? नोट करें और मैं याद रखूंगी।',
      'नमस्ते। दोपहर — रुकने और जांचने का अच्छा क्षण।',
    ],
    evening: [
      'शुभ संध्या। आपका दिन कैसा रहा?',
      'शाम — विचार करने का समय। आप कैसे हैं?',
      'नमस्ते। दिन खत्म हो रहा है — अंदर क्या बचा है?',
      'मूड की ईमानदार जाँच के लिए अच्छी शाम।',
      'अभी आप कैसे हैं? शाम को यह नोट करना विशेष रूप से महत्वपूर्ण है।',
    ],
    night: [
      'आप अभी भी जागे हैं। आप कैसे हैं?',
      'देर हो गई — लेकिन चूंकि आप यहाँ हैं, नोट करें।',
      'रात का मूड भी मायने रखता है। अभी आप कैसे हैं?',
      'नमस्ते। शांत रात — खुद के प्रति ईमानदार होने का अच्छा क्षण।',
      'रात। अपनी स्थिति नोट करें और आराम करें।',
    ],
  },
};

export function getGreeting(timeBucket) {
  const lang = localStorage.getItem('app_language') || 'ru';
  const langData = greetingsByLang[lang] || greetingsByLang.ru;
  const list = langData[timeBucket] || langData.day;
  return list[Math.floor(Math.random() * list.length)];
}
