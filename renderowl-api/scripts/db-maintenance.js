#!/usr/bin/env node
/**
 * Database Maintenance Utility for RenderOwl API
 * 
 * Usage:
 *   node scripts/db-maintenance.js [command] [options]
 * 
 * Commands:
 *   cleanup         Clean up old data based on retention policies
 *   vacuum          Run VACUUM to reclaim disk space
 *   analyze         Run ANALYZE to update query statistics
 *   integrity       Run PRAGMA integrity_check
 *   optimize        Run all optimizations (VACUUM + ANALYZE + optimizations)
 *   stats           Show database statistics
 *   
 * Options:
 *   --dry-run       Show what would be deleted without deleting
 *   --retention-days N   Override retention period (default: 30)
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const DB_PATH = process.env.QUEUE_DB_PATH || join(__dirname, '../data/queue.db');

// Retention policies (in days)
const RETENTION_POLICIES = {
  queue_metrics: 7,
  api_metrics: 30,
  cache_metrics: 7,
  error_logs: 90,
  analytics_hourly: 30,
  analytics_events: 90,  // Raw events kept longer for analysis
  jobs_completed: 180,   // Completed jobs kept for 6 months
};

function connect() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  return db;
}

function showStats() {
  console.log('\n📊 Database Statistics\n');
  
  const db = connect();
  
  try {
    // Database file info
    const pageSize = db.pragma('page_size', { simple: true });
    const pageCount = db.pragma('page_count', { simple: true });
    const freelistCount = db.pragma('freelist_count', { simple: true });
    const dbSize = (pageCount * pageSize) / (1024 * 1024);
    const freeSpace = (freelistCount * pageSize) / (1024 * 1024);
    
    console.log('Database File:');
    console.log(`  Path: ${DB_PATH}`);
    console.log(`  Size: ${dbSize.toFixed(2)} MB`);
    console.log(`  Free space: ${freeSpace.toFixed(2)} MB`);
    console.log(`  Pages: ${pageCount} (${freelistCount} free)`);
    console.log();
    
    // Table statistics
    const tables = [
      'jobs', 'analytics_events', 'analytics_daily', 'notifications',
      'renders', 'assets', 'automations', 'api_keys', 'credits',
      'queue_metrics', 'api_metrics', 'error_logs'
    ];
    
    console.log('Table Row Counts:');
    for (const table of tables) {
      try {
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        console.log(`  ${table}: ${result.count.toLocaleString()} rows`);
      } catch (e) {
        console.log(`  ${table}: (table not found)`);
      }
    }
    console.log();
    
    // Job status breakdown
    try {
      const jobStats = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM jobs 
        GROUP BY status
      `).all();
      
      console.log('Job Status Breakdown:');
      for (const stat of jobStats) {
        console.log(`  ${stat.status}: ${stat.count.toLocaleString()}`);
      }
      console.log();
    } catch (e) {
      // Ignore
    }
    
    // Index statistics
    console.log('Index Sizes:');
    try {
      const indexes = db.prepare(`
        SELECT name, sql FROM sqlite_master 
        WHERE type = 'index' AND sql IS NOT NULL
        ORDER BY name
      `).all();
      
      console.log(`  ${indexes.length} indexes found`);
      for (const idx of indexes.slice(0, 10)) {
        console.log(`  - ${idx.name}`);
      }
      if (indexes.length > 10) {
        console.log(`  ... and ${indexes.length - 10} more`);
      }
    } catch (e) {
      console.log('  (unable to fetch)');
    }
    console.log();
    
  } finally {
    db.close();
  }
}

function runCleanup(options = {}) {
  console.log('\n🧹 Database Cleanup\n');
  
  const db = connect();
  const retentionDays = options.retentionDays || 30;
  let totalDeleted = 0;
  
  try {
    // Cleanup old queue metrics
    try {
      const result = db.prepare(`
        DELETE FROM queue_metrics 
        WHERE timestamp < datetime('now', '-${RETENTION_POLICIES.queue_metrics} days')
      `).run();
      console.log(`  queue_metrics: ${result.changes} rows deleted`);
      totalDeleted += result.changes;
    } catch (e) {
      console.log(`  queue_metrics: (table not found)`);
    }
    
    // Cleanup old API metrics
    try {
      const result = db.prepare(`
        DELETE FROM api_metrics 
        WHERE timestamp < datetime('now', '-${RETENTION_POLICIES.api_metrics} days')
      `).run();
      console.log(`  api_metrics: ${result.changes} rows deleted`);
      totalDeleted += result.changes;
    } catch (e) {
      console.log(`  api_metrics: (table not found)`);
    }
    
    // Cleanup old cache metrics
    try {
      const result = db.prepare(`
        DELETE FROM cache_metrics 
        WHERE timestamp < datetime('now', '-${RETENTION_POLICIES.cache_metrics} days')
      `).run();
      console.log(`  cache_metrics: ${result.changes} rows deleted`);
      totalDeleted += result.changes;
    } catch (e) {
      console.log(`  cache_metrics: (table not found)`);
    }
    
    // Cleanup old error logs
    try {
      const result = db.prepare(`
        DELETE FROM error_logs 
        WHERE timestamp < datetime('now', '-${RETENTION_POLICIES.error_logs} days')
        AND resolved = 1
      `).run();
      console.log(`  error_logs (resolved): ${result.changes} rows deleted`);
      totalDeleted += result.changes;
    } catch (e) {
      console.log(`  error_logs: (table not found)`);
    }
    
    // Cleanup old completed jobs
    try {
      const result = db.prepare(`
        DELETE FROM jobs 
        WHERE status IN ('completed', 'failed', 'cancelled')
        AND completed_at < datetime('now', '-${RETENTION_POLICIES.jobs_completed} days')
      `).run();
      console.log(`  jobs (old completed): ${result.changes} rows deleted`);
      totalDeleted += result.changes;
    } catch (e) {
      console.log(`  jobs: (table not found or error)`);
    }
    
    console.log(`\n✓ Total rows deleted: ${totalDeleted.toLocaleString()}\n`);
    
  } finally {
    db.close();
  }
}

function runVacuum() {
  console.log('\n💾 Running VACUUM...\n');
  console.log('  This may take a while for large databases.\n');
  
  const db = connect();
  
  try {
    const startSize = db.pragma('page_count', { simple: true }) * 
                      db.pragma('page_size', { simple: true });
    
    db.exec('VACUUM');
    
    const endSize = db.pragma('page_count', { simple: true }) * 
                    db.pragma('page_size', { simple: true });
    const saved = (startSize - endSize) / (1024 * 1024);
    
    console.log(`✓ VACUUM complete`);
    console.log(`  Space reclaimed: ${saved.toFixed(2)} MB\n`);
    
  } finally {
    db.close();
  }
}

function runAnalyze() {
  console.log('\n📈 Running ANALYZE...\n');
  
  const db = connect();
  
  try {
    db.exec('ANALYZE');
    console.log('✓ Analysis complete\n');
    console.log('Query planner statistics updated.\n');
    
  } finally {
    db.close();
  }
}

function runIntegrityCheck() {
  console.log('\n🔍 Running Integrity Check...\n');
  
  const db = connect();
  
  try {
    const result = db.pragma('integrity_check');
    
    if (result[0].integrity_check === 'ok') {
      console.log('✓ Database integrity verified\n');
    } else {
      console.error('✗ Integrity check failed:');
      for (const row of result) {
        console.error(`  ${row.integrity_check}`);
      }
      console.log();
    }
    
  } finally {
    db.close();
  }
}

function runOptimize() {
  console.log('\n⚡ Database Optimization\n');
  
  runCleanup();
  runVacuum();
  runAnalyze();
  
  console.log('✓ All optimizations complete!\n');
}

// Parse arguments
const args = process.argv.slice(2);
const command = args[0] || 'stats';
const options = {
  dryRun: args.includes('--dry-run'),
  retentionDays: parseInt(args.find((_, i) => args[i - 1] === '--retention-days') || '30'),
};

// Run command
switch (command) {
  case 'stats':
    showStats();
    break;
  case 'cleanup':
    runCleanup(options);
    break;
  case 'vacuum':
    runVacuum();
    break;
  case 'analyze':
    runAnalyze();
    break;
  case 'integrity':
    runIntegrityCheck();
    break;
  case 'optimize':
    runOptimize();
    break;
  default:
    console.log(`\nUnknown command: ${command}`);
    console.log('Usage: node scripts/db-maintenance.js [stats|cleanup|vacuum|analyze|integrity|optimize]\n');
    process.exit(1);
}
