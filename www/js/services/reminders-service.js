import { t } from '../i18n.js';

const LS_KEY = 'med_reminders_v2';

function getLocalNotifications() {
  try {
    return window.Capacitor?.Plugins?.LocalNotifications;
  } catch(e) { return null; }
}

export function getReminders() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch(e) { return []; }
}

export function saveReminders(reminders) {
  localStorage.setItem(LS_KEY, JSON.stringify(reminders));
}

export function addReminder({ time, medName, days }) {
  const reminders = getReminders();
  const id = Date.now();
  reminders.push({ id, time, medName, days, active: true });
  saveReminders(reminders);
  scheduleNotification({ id, time, medName, days });
  return id;
}

export function updateReminder(id, { time, medName, days }) {
  const reminders = getReminders();
  const r = reminders.find(rem => rem.id === id);
  if (!r) return;
  r.time = time || r.time;
  r.medName = medName || r.medName;
  r.days = days || r.days;
  saveReminders(reminders);
  cancelNotification(id);
  if (r.active) scheduleNotification({ id, time: r.time, medName: r.medName, days: r.days });
}

export function deleteReminder(id) {
  const reminders = getReminders().filter(r => r.id !== id);
  saveReminders(reminders);
  cancelNotification(id);
}

export function toggleReminder(id) {
  const reminders = getReminders();
  const r = reminders.find(r => r.id === id);
  if (!r) return;
  r.active = !r.active;
  saveReminders(reminders);
  if (r.active) scheduleNotification(r);
  else cancelNotification(id);
}

async function scheduleNotification({ id, time, medName, days }) {
  try {
    const LocalNotifications = getLocalNotifications();
    if (!LocalNotifications) {
      console.warn('[reminders] LocalNotifications not available');
      return;
    }
    
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') {
        console.warn('[reminders] permission denied');
        return;
      }
    }

    try {
      await LocalNotifications.createChannel({
        id: 'med_reminders',
        name: 'Напоминания о лекарствах',
        description: 'Уведомления о приёме лекарств',
        importance: 5,
        sound: 'default',
        vibration: true,
        lights: true,
      });
    } catch(e) { /* канал уже существует */ }

    const [hours, minutes] = time.split(':').map(Number);
    const dayMap = { пн:1, вт:2, ср:3, чт:4, пт:5, сб:6, вс:0 };
    
    const notifications = [];
    const now = new Date();
    
    let idCounter = 0;
    days.forEach((day) => {
      const jsDow = dayMap[day];
      for (let week = 0; week < 8; week++) {
        const target = new Date();
        target.setHours(hours, minutes, 0, 0);
        const currentDow = now.getDay();
        let daysUntil = (jsDow - currentDow + 7) % 7;
        if (daysUntil === 0 && target.getTime() <= now.getTime() + 65000) daysUntil = 7;
        daysUntil += week * 7;
        target.setDate(target.getDate() + daysUntil);
        notifications.push({
          id: (id % 100000) * 1000 + idCounter++,
          title: t('reminder_notif_title') || '💊 Time to take your medication',
          body: medName || (t('reminder_notif_body') || "Don't forget to take your medication"),
          schedule: { at: target, allowWhileIdle: true, exact: true },
          sound: 'default',
          channelId: 'med_reminders',
        });
      }
    });
    
    await LocalNotifications.schedule({ notifications });
    console.log('[reminders] scheduled:', notifications.length);
  } catch(e) {
    console.warn('[reminders] schedule failed:', e);
  }
}

async function cancelNotification(id) {
  try {
    const LocalNotifications = getLocalNotifications();
    if (!LocalNotifications) return;
    
    const base = (id % 100000) * 1000;
    const ids = Array.from({ length: 56 }, (_, i) => ({ id: base + i }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch(e) {
    console.warn('[reminders] cancel failed:', e);
  }
}

export async function checkRemindersOnBoot() {
  try {
    const LocalNotifications = getLocalNotifications();
    if (!LocalNotifications) return;

    const reminders = getReminders().filter(r => r.active);
    if (!reminders.length) return;

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

    const pending = await LocalNotifications.getPending();
    const pendingIds = new Set(pending.notifications.map(n => n.id));

    for (const r of reminders) {
      const base = (r.id % 100000) * 1000;
      const remaining = Array.from({ length: 56 }, (_, i) => base + i)
        .filter(id => pendingIds.has(id)).length;
      if (remaining < 4) {
        await cancelNotification(r.id);
        await scheduleNotification(r);
      }
    }
    console.log('[reminders] boot check done');
  } catch(e) {
    console.warn('[reminders] boot check failed:', e);
  }
}