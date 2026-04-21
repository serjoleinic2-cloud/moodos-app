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

    const [hours, minutes] = time.split(':').map(Number);
    const dayMap = { пн:2, вт:3, ср:4, чт:5, пт:6, сб:7, вс:1 };
    
    const notifications = [];
    const now = new Date();
    
    days.forEach((day, i) => {
      const jsDow = dayMap[day];
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);
      
      const currentDow = now.getDay();
      let daysUntil = (jsDow - currentDow + 7) % 7;
      if (daysUntil === 0 && target.getTime() <= now.getTime() + 60000) daysUntil = 7;
      
      target.setDate(target.getDate() + daysUntil);
      
      notifications.push({
        id: id + i,
        title: '💊 Время принять лекарство',
        body: medName || 'Не забудьте принять лекарство',
        schedule: { at: target, allowWhileIdle: true },
        sound: null,
      });
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
    
    const ids = [0,1,2,3,4,5,6].map((_, i) => ({ id: id + i }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch(e) {
    console.warn('[reminders] cancel failed:', e);
  }
}