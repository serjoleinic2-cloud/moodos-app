// =====================================
// Neyra Checkpoint Manager
// Saves/restores app state for crash recovery
// =====================================

import { AppRuntime } from "./appRuntime.js";
import { getProfile } from "./user-profile.js";

const CHECKPOINT_KEY = "app_checkpoint";
const CHECKPOINT_VERSION = 1;

export const CheckpointManager = {
  
  saveCheckpoint(data = {}) {
    try {
      const checkpoint = {
        version: CHECKPOINT_VERSION,
        timestamp: Date.now(),
        screen: data.screen || null,
        module: data.module || null,
        appState: this._captureAppState(),
        profile: this._captureProfile(),
        session: this._captureSession(),
        ...data
      };
      
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
      console.log("[CHECKPOINT] Saved:", checkpoint.screen, checkpoint.module);
    } catch(e) {
      console.warn("[CHECKPOINT] Save failed:", e);
    }
  },
  
  restoreCheckpoint() {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      if (!raw) return null;
      
      const checkpoint = JSON.parse(raw);
      
      if (checkpoint.version !== CHECKPOINT_VERSION) {
        console.warn("[CHECKPOINT] Version mismatch, clearing");
        this.clearCheckpoint();
        return null;
      }
      
      const age = Date.now() - checkpoint.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        console.log("[CHECKPOINT] Too old, clearing");
        this.clearCheckpoint();
        return null;
      }
      
      console.log("[CHECKPOINT] Restored:", checkpoint.screen, checkpoint.module);
      return checkpoint;
    } catch(e) {
      console.warn("[CHECKPOINT] Restore failed:", e);
      this.clearCheckpoint();
      return null;
    }
  },
  
  clearCheckpoint() {
    try {
      localStorage.removeItem(CHECKPOINT_KEY);
      console.log("[CHECKPOINT] Cleared");
    } catch(e) {
      console.warn("[CHECKPOINT] Clear failed:", e);
    }
  },
  
  _captureAppState() {
    const state = {};
    const modules = ['meditation', 'home', 'insight', 'history', 'report', 'stability', 'settings'];
    
    for (const mod of modules) {
      const modState = AppRuntime.getState(mod);
      if (modState && Object.keys(modState).length > 0) {
        state[mod] = modState;
      }
    }
    
    return state;
  },
  
  _captureProfile() {
    const profile = getProfile();
    if (!profile) return null;
    
    return {
      isPremium: profile.isPremium,
      premium_type: profile.premium_type,
      premiumTrial: profile.premiumTrial,
      premiumPlan: profile.premiumPlan,
      premiumExpiresAt: profile.premiumExpiresAt,
      colorTheme: profile.colorTheme,
      updatedAt: profile.updatedAt
    };
  },
  
  _captureSession() {
    const session = {};
    
    if (window.systemState) {
      session.currentScreen = window.systemState.currentScreen;
      session.isPremium = window.systemState.premium;
    }
    
    return session;
  },
  
  restoreAppState(checkpoint) {
    if (!checkpoint || !checkpoint.appState) return;
    
    try {
      const state = checkpoint.appState;
      
      for (const [module, modState] of Object.entries(state)) {
        if (modState && typeof modState === 'object') {
          AppRuntime.setState(module, modState);
        }
      }
      
      console.log("[CHECKPOINT] App state restored");
    } catch(e) {
      console.warn("[CHECKPOINT] State restore failed:", e);
    }
  }
};

export function saveCheckpointOnExit(screen, module) {
  CheckpointManager.saveCheckpoint({
    screen,
    module,
    timestamp: Date.now()
  });
}

export function initCheckpointRecovery() {
  const checkpoint = CheckpointManager.restoreCheckpoint();
  if (checkpoint) {
    CheckpointManager.restoreAppState(checkpoint);
    return checkpoint;
  }
  return null;
}

export function clearCheckpoint() {
  CheckpointManager.clearCheckpoint();
}
