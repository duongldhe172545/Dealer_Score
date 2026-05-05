// Database connection + schema bootstrap.
// Exports getDb() (lazy singleton) and migration helpers.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'dealers.db');

let db = null;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dealers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_id TEXT UNIQUE NOT NULL,
      ten_dl TEXT NOT NULL,
      ten_chu TEXT,
      sdt TEXT,
      dia_chi TEXT,
      dealer_type TEXT,
      category_stack TEXT,
      has_install_team INTEGER DEFAULT 0,
      est_team_size INTEGER DEFAULT 0,
      c_score REAL,
      dealer_tier TEXT,
      pilot_batch TEXT,
      dealer_status TEXT DEFAULT 'Active',
      data_completeness REAL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS dealer_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_id TEXT NOT NULL,
      criterion_code TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      response TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id) ON DELETE CASCADE,
      UNIQUE(dealer_id, criterion_code)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS dealer_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dealer_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      mime_type TEXT,
      size INTEGER,
      uploaded_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (dealer_id) REFERENCES dealers(dealer_id) ON DELETE CASCADE
    );
  `);

  // Migrations applied to pre-existing DBs.
  ensureColumn('dealers', 'area_code', 'TEXT');
  dropColumn('dealers', 'synced_to_sharepoint'); // feature removed

  db.exec(
    `INSERT OR IGNORE INTO settings (key, value) ` +
    `VALUES ('criteria_weights', '{"C1":0.20,"C2":0.15,"C3":0.15,"C4":0.15,"C5":0.10,"C6":0.10,"C7":0.08,"C8":0.04,"C9":0.03}')`
  );
}

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Idempotent column drop. SQLite 3.35+ supports DROP COLUMN natively; the
// better-sqlite3 v11 we ship bundles SQLite 3.45+, so this works on Railway.
function dropColumn(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}

module.exports = { getDb, ensureColumn, dropColumn, DB_PATH, DATA_DIR };
