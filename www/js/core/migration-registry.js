// =====================================
// Neyra Migration Registry
// Versioned backup migrations + safe upgrade path
// =====================================

const LS_MIGRATION_STATE = "neyra_migration_state";

export const BackupVersion = {
  V1: 1,
  V2: 2,
  V3: 3
};

const MIGRATIONS = [
  {
    version: 2,
    name: 'add_backup_metadata',
    description: 'Added backup type, range, and counts to backup structure',
    migrate: async (data) => {
      if (data.version && data.version >= 2) return data;
      
      const profile = data.user_profile || {};
      
      return {
        ...data,
        version: 2,
        backupType: profile.isPremium ? 'premium' : 'free',
        backupRange: 'all',
        moodCount: data.mood_history?.length || 0,
        notesCount: data.notes_history?.length || 0,
        sessionCount: data.session_history?.length || 0
      };
    }
  },
  {
    version: 3,
    name: 'add_backup_checksum',
    description: 'Added checksum field for backup integrity',
    migrate: async (data) => {
      if (data.version && data.version >= 3) return data;
      
      const checksum = data.checksum || null;
      
      return {
        ...data,
        version: 3,
        checksum
      };
    }
  }
];

class MigrationRegistry {
  constructor() {
    this.state = this.loadState();
    this.pending = [];
  }

  loadState() {
    try {
      const raw = localStorage.getItem(LS_MIGRATION_STATE);
      return raw ? JSON.parse(raw) : {
        lastMigratedVersion: 0,
        appliedMigrations: [],
        failedMigrations: []
      };
    } catch(e) {
      return {
        lastMigratedVersion: 0,
        appliedMigrations: [],
        failedMigrations: []
      };
    }
  }

  saveState() {
    try {
      localStorage.setItem(LS_MIGRATION_STATE, JSON.stringify(this.state));
    } catch(e) {}
  }

  getCurrentVersion() {
    return this.state.lastMigratedVersion;
  }

  getTargetVersion() {
    return BackupVersion.V3;
  }

  needsMigration() {
    return this.getCurrentVersion() < this.getTargetVersion();
  }

  async applyMigrations(data) {
    const startVersion = data.version || 0;
    const targetVersion = this.getTargetVersion();
    
    if (startVersion >= targetVersion) {
      return { success: true, data, migrationsApplied: 0 };
    }
    
    const applied = [];
    const errors = [];
    
    for (const migration of MIGRATIONS) {
      if (migration.version <= startVersion) continue;
      if (migration.version > targetVersion) continue;
      
      if (this.state.appliedMigrations.includes(migration.name)) {
        continue;
      }
      
      try {
        const beforeData = { ...data };
        data = await migration.migrate(data);
        
        this.state.appliedMigrations.push(migration.name);
        this.state.lastMigratedVersion = migration.version;
        this.saveState();
        
        applied.push({
          name: migration.name,
          version: migration.version,
          description: migration.description
        });
        
      } catch(e) {
        errors.push({
          name: migration.name,
          error: e.message
        });
        
        this.state.failedMigrations.push({
          name: migration.name,
          error: e.message,
          timestamp: Date.now()
        });
        this.saveState();
        
        console.error('[MIGRATION] Failed:', migration.name, e);
      }
    }
    
    return {
      success: errors.length === 0,
      data,
      migrationsApplied: applied.length,
      applied,
      errors
    };
  }

  reset() {
    this.state = {
      lastMigratedVersion: 0,
      appliedMigrations: [],
      failedMigrations: []
    };
    this.saveState();
  }

  getMigrationHistory() {
    return {
      currentVersion: this.getCurrentVersion(),
      targetVersion: this.getTargetVersion(),
      applied: this.state.appliedMigrations.map(name => {
        const migration = MIGRATIONS.find(m => m.name === name);
        return {
          name,
          version: migration?.version,
          description: migration?.description
        };
      }),
      failed: this.state.failedMigrations
    };
  }

  addPendingMigration(migration) {
    this.pending.push(migration);
  }
}

export const migrationRegistry = new MigrationRegistry();

export async function migrateBackupData(data) {
  return migrationRegistry.applyMigrations(data);
}

export function getMigrationInfo() {
  return migrationRegistry.getMigrationHistory();
}
