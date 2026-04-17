// =====================================
// Neyra Exit Guard Service
// Protects against data loss
// =====================================

const EXIT_WARNING_DAYS = 7;

export function setupExitGuard() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      checkBackupBeforeExit();
    }
  });
  
  window.addEventListener("beforeunload", (e) => {
    if (window._restoreInProgress) return;
    if (shouldWarnBeforeExit()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

export function disableExitGuardForReload() {
  window._restoreInProgress = true;
}

function shouldWarnBeforeExit() {
  const mood = JSON.parse(localStorage.getItem('mood_history') || '[]');
  if (!mood.length) return false;
  
  const lastBackup = localStorage.getItem('last_backup_time');
  if (!lastBackup) return true;
  
  const now = Date.now();
  const daysSince = (now - Number(lastBackup)) / (1000 * 60 * 60 * 24);
  return daysSince > EXIT_WARNING_DAYS;
}

function checkBackupBeforeExit() {
  if (!shouldWarnBeforeExit()) return;
  if (localStorage.getItem('exit_warning_shown_today')) return;
  
  localStorage.setItem('exit_warning_shown_today', '1');
  setTimeout(() => {
    localStorage.removeItem('exit_warning_shown_today');
  }, 24 * 60 * 60 * 1000);
}

export function showExitWarning(onExport) {
  if (localStorage.getItem('exit_warning_dismissed')) return;
  
  const mood = JSON.parse(localStorage.getItem('mood_history') || '[]');
  if (!mood.length || !shouldWarnBeforeExit()) return;
  
  const ok = confirm(
    "Вы давно не сохраняли данные.\n\nРекомендуем создать резервную копию перед выходом."
  );
  
  if (ok && onExport) {
    onExport();
  }
  
  localStorage.setItem('exit_warning_dismissed', '1');
  setTimeout(() => {
    localStorage.removeItem('exit_warning_dismissed');
  }, 60 * 60 * 1000);
}

export function showRecoveryPrompt(onImport) {
  const ok = confirm(
    "У вас нет данных.\n\nВы можете восстановить их из резервной копии."
  );
  
  if (ok && onImport) {
    onImport();
  }
}

export function shouldShowRecoveryPrompt() {
  const mood = JSON.parse(localStorage.getItem('mood_history') || '[]');
  if (mood.length) return false;
  if (localStorage.getItem('recovery_prompt_shown')) return false;
  return true;
}

export function markRecoveryPromptShown() {
  localStorage.setItem('recovery_prompt_shown', '1');
}

export function getDataDirty() {
  return localStorage.getItem('data_dirty') === '1';
}

export function markDataDirty() {
  localStorage.setItem('data_dirty', '1');
}

export function clearDataDirty() {
  localStorage.removeItem('data_dirty');
}