// =====================================
// Neyra User ID Abstraction
// Provides unified user identification
// =====================================

const LS_USER_ID = 'neyra_user_id';

export function getUserId() {
  const stored = localStorage.getItem(LS_USER_ID);
  if (stored) return stored;
  
  const generated = 'local_' + Date.now();
  localStorage.setItem(LS_USER_ID, generated);
  return generated;
}

export function setGoogleUserId(googleUid) {
  if (googleUid) {
    localStorage.setItem(LS_USER_ID, googleUid);
  }
}

export function isGoogleUser() {
  const id = getUserId();
  return id && !id.startsWith('local_');
}

export function clearUserId() {
  localStorage.removeItem(LS_USER_ID);
}
