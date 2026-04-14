// =====================================
// Neyra Auth Service
// Google Sign-In via Firebase
// =====================================

import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider, isFirebaseConfigured } from "./firebase-init.js";

let currentUser = null;
let authListeners = [];

export function initAuthListener(onChange) {
  if (!isFirebaseConfigured()) {
    console.log('[AUTH] Firebase not configured, skipping listener');
    return;
  }
  
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    console.log('[AUTH]', user ? 'LOGGED IN: ' + user.email : 'LOGGED OUT');
    
    authListeners.forEach(cb => cb(user));
    if (onChange) onChange(user);
  });
}

export function addAuthListener(callback) {
  authListeners.push(callback);
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

export async function loginWithGoogle() {
  if (!isFirebaseConfigured()) {
    console.warn('[AUTH] Firebase not configured');
    return null;
  }
  
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('[AUTH] Login success:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    throw error;
  }
}

export async function logout() {
  if (!isFirebaseConfigured()) {
    console.warn('[AUTH] Firebase not configured');
    return;
  }
  
  try {
    await signOut(auth);
    console.log('[AUTH] Logged out');
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
  }
}

export function getUser() {
  return currentUser;
}

export function isLoggedIn() {
  return !!currentUser;
}

export function getUserId() {
  return currentUser?.uid || null;
}

export function getUserEmail() {
  return currentUser?.email || null;
}

export function getUserPhoto() {
  return currentUser?.photoURL || null;
}
