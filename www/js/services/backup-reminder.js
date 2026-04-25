// =====================================
// Neyra Backup Reminder Service
// Smart reminders for backup
// =====================================

import { t } from '../i18n.js';

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
      <div class="modal-title">📦 ${t('backup_reminder_title')}</div>
      <div style="text-align:center; padding: 16px 0; font-size:14px; color:#555; line-height:1.6;">
        <p>${t('backup_reminder_body1')}</p>
        <p>${t('backup_reminder_body2')}</p>
      </div>
      <button class="modal-save-btn" id="backupReminderExport" style="background: linear-gradient(145deg, #4caf87, #45a070);">
        📦 ${t('backup_reminder_btn')}
      </button>
      <div class="modal-cancel" id="backupReminderDismiss">${t('backup_reminder_later')}</div>
    </div>`;
  
  document.body.appendChild(overlay);

  overlay.querySelector('#backupReminderExport')?.addEventListener('click', () => {
    overlay.remove();
    localStorage.removeItem('backup_reminder_dismissed');
    const ok = confirm(t('backup_confirm_responsibility'));
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
        <div class="modal-title">💡 ${t('backup_hint_title')}</div>
        <div style="text-align:center; padding: 16px 0; font-size:14px; color:#555; line-height:1.6;">
          <p>${t('backup_hint_body')}</p>
          <p style="color:#888; font-size:12px;">${t('backup_hint_path')}</p>
        </div>
        <button class="modal-save-btn" id="firstBackupGotIt">${t('backup_hint_ok')}</button>
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
