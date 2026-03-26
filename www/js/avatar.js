let avatarEnabled = true;
let lastShowTime = 0;
const MIN_INTERVAL = 30000;

const avatarMessages = [
  "Я вижу, как меняется твоё состояние",
  "Ты сейчас сделал важную вещь для себя",
  "Давай закрепим это ощущение"
];

export function showAvatar(message) {
  if (!avatarEnabled) return;
  
  const now = Date.now();
  if (now - lastShowTime < MIN_INTERVAL) return;
  lastShowTime = now;
  
  const container = document.getElementById('avatar-container');
  const bubble = document.getElementById('avatar-bubble');
  const face = document.getElementById('avatar-face');
  
  if (!container || !bubble) return;
  
  bubble.textContent = message || getRandomMessage();
  container.classList.add('active');
  
  setTimeout(() => {
    container.classList.remove('active');
  }, 4000);
}

function getRandomMessage() {
  const lang = localStorage.getItem('app_language') || 'ru';
  const messages = {
    ru: [
      "Я вижу, как меняется твоё состояние",
      "Ты сейчас сделал важную вещь для себя",
      "Давай закрепим это ощущение"
    ],
    en: [
      "I can see your mood changing",
      "You just did something important for yourself",
      "Let's lock in this feeling"
    ],
    es: [
      "Veo cómo cambia tu estado",
      "Acabas de hacer algo importante para ti",
      "Fijemos esta sensación"
    ],
    uk: [
      "Я бачу, як змінюється твій стан",
      "Ти зараз зробив важливу річ для себе",
      "Давай закріпимо це відчуття"
    ]
  };
  
  const msgs = messages[lang] || messages.ru;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function setAvatarEnabled(enabled) {
  avatarEnabled = enabled;
}

export function isAvatarEnabled() {
  return avatarEnabled;
}
