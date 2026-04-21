import { LocalNotifications } from '@capacitor/local-notifications';

const LS_KEY = 'med_reminders_v2';

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
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;
    
    const [hours, minutes] = time.split(':').map(Number);
    const dayMap = { пн:2, вт:3, ср:4, чт:5, пт:6, сб:7, вс:1 };
    
    const notifications = days.map((day, i) => ({
      id: id + i,
      title: '💊 Время принять лекарство',
      body: medName || 'Не забудьте принять лекарство',
      schedule: {
        on: { weekday: dayMap[day], hour: hours, minute: minutes }
      },
      sound: null,
      smallIcon: 'ic_stat_icon_config_sample',
    }));
    
    await LocalNotifications.schedule({ notifications });
  } catch(e) {
    console.warn('[reminders] schedule failed:', e);
  }
}

async function cancelNotification(id) {
  try {
    const ids = [0,1,2,3,4,5,6].map((_, i) => ({ id: id + i }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch(e) {}
}