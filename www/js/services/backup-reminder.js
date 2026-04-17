// =====================================
// Neyra Backup Reminder Service
// Smart reminders for backup
// =====================================

const BACKUP_REMINDER_DAYS = 7;
const FREE_BACKUP_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function shouldShowBackupReminder() {
  if (localStorage.getItem('backup_reminder_dismissed')) {
    return false;
  }

  const lastBackup = localStorage.getItem('last_backup_time');
  const mood = JSON.parse(localStorage.getItem('mood_history') || '[]');

  if (!mood || mood.length === 0) {
    return false;
  }

  const now = Date.now();

  if (!lastBackup) {
    return true;
  }

  const diffDays = (now - Number(lastBackup)) / (1000 * 60 * 60 * 24);
  return diffDays > BACKUP_REMINDER_DAYS;
}

export function canExportBackup() {
  const isPremium = window.isPremium?.() || false;
  
  if (isPremium) {
    return { allowed: true, reason: null };
  }

  const lastBackup = localStorage.getItem('last_backup_time');
  if (!lastBackup) {
    return { allowed: true, reason: null };
  }

  const now = Date.now();
  const diff = now - Number(lastBackup);

  if (diff < FREE_BACKUP_COOLDOWN_MS) {
    const remainingHours = Math.ceil((FREE_BACKUP_COOLDOWN_MS - diff) / (1000 * 60 * 60));
    return { 
      allowed: false, 
      reason: 'cooldown',
      remainingHours: remainingHours
    };
  }

  return { allowed: true, reason: null };
}

export function dismissBackupReminder() {
  localStorage.setItem('backup_reminder_dismissed', '1');
}

export function showBackupReminderModal(onExport) {
  if (localStorage.getItem('backup_reminder_dismissed')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'health-modal-overlay';
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">📦 Резервная копия</div>
      <div style="text-align:center; padding: 16px 0; font-size:14px; color:#555; line-height:1.6;">
        <p>Вы давно не сохраняли данные.</p>
        <p>Резервная копия поможет не потерять<br>ваши записи при переустановке.</p>
      </div>
      <button class="modal-save-btn" id="backupReminderExport" style="background: linear-gradient(145deg, #4caf87, #45a070);">
        📦 Создать копию
      </button>
      <div class="modal-cancel" id="backupReminderDismiss">Напомнить позже</div>
    </div>`;
  
  document.body.appendChild(overlay);

  overlay.querySelector('#backupReminderExport')?.addEventListener('click', () => {
    overlay.remove();
    localStorage.removeItem('backup_reminder_dismissed');
    // Add confirm before calling export
    const ok = confirm(
      "Сохраните копию ваших данных в безопасном месте.\nВы сами отвечаете за её сохранность."
    );
    if (!ok) return;
    if (onExport) onExport();
  });

  overlay.querySelector('#backupReminderDismiss')?.addEventListener('click', () => {
    overlay.remove();
    localStorage.setItem('backup_reminder_dismissed', '1');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      localStorage.setItem('backup_reminder_dismissed', '1');
    }
  });
}

export function showFirstBackupHint() {
  if (localStorage.getItem('first_backup_hint')) {
    return;
  }

  if (localStorage.getItem('onboarding_done') !== 'true') {
    return;
  }

  const mood = JSON.parse(localStorage.getItem('mood_history') || '[]');
  if (!mood || mood.length < 3) {
    return;
  }

  setTimeout(() => {
    const overlay = document.createElement('div');
    overlay.className = 'health-modal-overlay';
    overlay.innerHTML = `
      <div class="health-modal">
        <div class="modal-title">💡 Совет</div>
        <div style="text-align:center; padding: 16px 0; font-size:14px; color:#555; line-height:1.6;">
          <p>Вы можете сохранить все свои данные<br>с помощью резервной копии.</p>
          <p style="color:#888; font-size:12px;">Настройки → Резервное копирование</p>
        </div>
        <button class="modal-save-btn" id="firstBackupGotIt">Понятно</button>
      </div>`;
    
    document.body.appendChild(overlay);

    overlay.querySelector('#firstBackupGotIt')?.addEventListener('click', () => {
      overlay.remove();
      localStorage.setItem('first_backup_hint', '1');
    });
  }, 5000);
}

export function markBackupSuccess() {
  localStorage.setItem('last_backup_time', Date.now());
  localStorage.removeItem('backup_reminder_dismissed');
}
