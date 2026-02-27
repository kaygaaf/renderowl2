#!/usr/bin/env node
/**
 * Database Migration Runner for RenderOwl API
 * 
 * Usage:
 *   node scripts/migrate.js [options]
 * 
 * Options:
 *   --up          Run all pending migrations (default)
 *   --down N      Rollback N migrations
 *   --status      Show migration status
 *   --force       Force run even if already applied
 *   --dry-run     Show what would be executed without running
 */

import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const DB_PATH = process.env.QUEUE_DB_PATH || join(__dirname, '../data/queue.db');
const MIGRATIONS_DIR = join(__dirname, '../data/migrations');

// Migration table schema
const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_migrations_applied 
  ON migrations(applied_at);
`;

function calculateChecksum(content) {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function getMigrations() {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    return files.map(filename => ({
      filename,
      path: join(MIGRATIONS_DIR, filename),
      content: readFileSync(join(MIGRATIONS_DIR, filename), 'utf-8'),
    }));
  } catch (error) {
    console.error('Error reading migrations:', error.message);
    return [];
  }
}

function initMigrationsTable(db) {
  db.exec(MIGRATION_TABLE_SQL);
}

function getAppliedMigrations(db) {
  initMigrationsTable(db);
  return db.prepare('SELECT filename, checksum, applied_at FROM migrations ORDER BY applied_at').all();
}

async function runMigration(db, migration) {
  const startTime = Date.now();
  const checksum = await calculateChecksum(migration.content);
  
  try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');
    
    // Run the migration
    db.exec(migration.content);
    
    // Record migration
    db.prepare(`
      INSERT INTO migrations (filename, checksum, execution_time_ms, success)
      VALUES (?, ?, ?, 1)
    `).run(migration.filename, checksum, Date.now() - startTime);
    
    // Commit
    db.exec('COMMIT');
    
    console.log(`  ✓ ${migration.filename} (${Date.now() - startTime}ms)`);
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    
    // Record failed migration
    try {
      db.prepare(`
        INSERT INTO migrations (filename, checksum, execution_time_ms, success)
        VALUES (?, ?, ?, 0)
      `).run(migration.filename, checksum, Date.now() - startTime);
    } catch (e) {
      // Ignore duplicate key errors
    }
    
    console.error(`  ✗ ${migration.filename}: ${error.message}`);
    return false;
  }
}

async function migrateUp(options = {}) {
  console.log('\n📊 Database Migration Runner\n');
  console.log(`Database: ${DB_PATH}`);
  console.log(`Migrations dir: ${MIGRATIONS_DIR}\n`);
  
  const db = new Database(DB_PATH);
  
  try {
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    
    const appliedMigrations = getAppliedMigrations(db);
    const allMigrations = getMigrations();
    
    console.log(`Applied migrations: ${appliedMigrations.length}`);
    console.log(`Available migrations: ${allMigrations.length}\n`);
    
    // Find pending migrations
    const appliedMap = new Map(appliedMigrations.map(m => [m.filename, m]));
    const pendingMigrations = allMigrations.filter(m => !appliedMap.has(m.filename));
    
    if (pendingMigrations.length === 0) {
      console.log('✓ Database is up to date!\n');
      return;
    }
    
    console.log(`Running ${pendingMigrations.length} pending migration(s):\n`);
    
    if (options.dryRun) {
      for (const migration of pendingMigrations) {
        console.log(`  [DRY-RUN] ${migration.filename}`);
      }
      console.log('\n');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const migration of pendingMigrations) {
      const success = await runMigration(db, migration);
      if (success) {
        successCount++;
      } else {
        failCount++;
        if (!options.continueOnError) {
          console.log('\n⚠️  Migration failed. Stopping. Use --continue-on-error to proceed.\n');
          break;
        }
      }
    }
    
    console.log(`\n✓ Migrations complete: ${successCount} successful, ${failCount} failed\n`);
    
    // Run ANALYZE to update query planner statistics
    if (successCount > 0 && !options.skipAnalyze) {
      console.log('Running ANALYZE for query optimizer...');
      db.exec('ANALYZE');
      console.log('✓ Analysis complete\n');
    }
    
  } finally {
    db.close();
  }
}

function showStatus() {
  console.log('\n📊 Migration Status\n');
  
  const db = new Database(DB_PATH);
  
  try {
    const appliedMigrations = getAppliedMigrations(db);
    const allMigrations = getMigrations();
    const appliedMap = new Map(appliedMigrations.map(m => [m.filename, m]));
    
    console.log('Migration Files:\n');
    
    for (const migration of allMigrations) {
      const applied = appliedMap.get(migration.filename);
      if (applied) {
        console.log(`  ✓ ${migration.filename}`);
        console.log(`    Applied: ${applied.applied_at}`);
      } else {
        console.log(`  ⏳ ${migration.filename}`);
        console.log(`    Status: Pending`);
      }
    }
    
    const pendingCount = allMigrations.length - appliedMigrations.length;
    console.log(`\n${appliedMigrations.length} applied, ${pendingCount} pending\n`);
    
  } finally {
    db.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  continueOnError: args.includes('--continue-on-error'),
  skipAnalyze: args.includes('--skip-analyze'),
};

// Run appropriate command
if (args.includes('--status')) {
  showStatus();
} else if (args.includes('--down')) {
  console.log('Rollback not yet implemented. Coming soon!\n');
} else {
  migrateUp(options);
}
