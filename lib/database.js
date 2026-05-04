const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'dealers.db');

let db;

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
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      synced_to_sharepoint INTEGER DEFAULT 0
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

  // Migrations: add columns added after initial release
  ensureColumn('dealers', 'area_code', 'TEXT');

  db.exec(`INSERT OR IGNORE INTO settings (key, value) VALUES ('criteria_weights', '{"C1":0.20,"C2":0.15,"C3":0.15,"C4":0.15,"C5":0.10,"C6":0.10,"C7":0.08,"C8":0.04,"C9":0.03}')`);
}

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * Generate next dealer_id: DL-0001, DL-0002, ...
 */
function generateDealerId() {
  const row = db.prepare(`SELECT dealer_id FROM dealers ORDER BY id DESC LIMIT 1`).get();
  if (!row) return 'DL-0001';
  const num = parseInt(row.dealer_id.replace('DL-', ''), 10);
  return `DL-${String(num + 1).padStart(4, '0')}`;
}

/**
 * Calculate data completeness percentage
 */
function calculateCompleteness(dealer, scores) {
  const fields = ['ten_dl', 'ten_chu', 'sdt', 'dia_chi', 'dealer_type', 'category_stack', 'area_code'];
  let filled = 0;
  let total = fields.length + 9; // 7 basic fields + 9 criteria = 16

  fields.forEach(f => {
    if (dealer[f] && dealer[f].toString().trim()) filled++;
  });

  // A criterion counts as filled when it has been scored (score 0/1/2 are all valid),
  // regardless of whether the optional response text was entered.
  if (scores && scores.length > 0) {
    scores.forEach(s => {
      if (s.score !== null && s.score !== undefined) filled++;
    });
  }

  return Math.round((filled / total) * 100);
}

/**
 * Create a new dealer with scores
 */
function createDealer(data) {
  const dealerId = generateDealerId();

  const insertDealer = db.prepare(`
    INSERT INTO dealers (dealer_id, ten_dl, ten_chu, sdt, dia_chi, dealer_type,
      category_stack, area_code, has_install_team, est_team_size, c_score, dealer_tier,
      pilot_batch, dealer_status, data_completeness, note)
    VALUES (@dealer_id, @ten_dl, @ten_chu, @sdt, @dia_chi, @dealer_type,
      @category_stack, @area_code, @has_install_team, @est_team_size, @c_score, @dealer_tier,
      @pilot_batch, @dealer_status, @data_completeness, @note)
  `);

  const insertScore = db.prepare(`
    INSERT INTO dealer_scores (dealer_id, criterion_code, score, response)
    VALUES (@dealer_id, @criterion_code, @score, @response)
  `);

  const transaction = db.transaction(() => {
    // Calculate completeness
    const completeness = calculateCompleteness(data, data.scores || []);

    insertDealer.run({
      dealer_id: dealerId,
      ten_dl: data.ten_dl || '',
      ten_chu: data.ten_chu || '',
      sdt: data.sdt || '',
      dia_chi: data.dia_chi || '',
      dealer_type: data.dealer_type || '',
      category_stack: data.category_stack || '',
      area_code: data.area_code || '',
      has_install_team: data.has_install_team ? 1 : 0,
      est_team_size: data.est_team_size || 0,
      c_score: data.c_score || 0,
      dealer_tier: data.dealer_tier || '',
      pilot_batch: data.pilot_batch || '',
      dealer_status: data.dealer_status || 'Active',
      data_completeness: completeness,
      note: data.note || ''
    });

    // Insert scores
    if (data.scores && Array.isArray(data.scores)) {
      for (const s of data.scores) {
        insertScore.run({
          dealer_id: dealerId,
          criterion_code: s.criterion_code,
          score: s.score,
          response: s.response || ''
        });
      }
    }

    return dealerId;
  });

  return transaction();
}

/**
 * Get all dealers with their scores
 */
function getAllDealers() {
  const dealers = db.prepare(`SELECT * FROM dealers ORDER BY created_at DESC`).all();
  const getScores = db.prepare(`SELECT * FROM dealer_scores WHERE dealer_id = ?`);

  return dealers.map(d => {
    d.scores = getScores.all(d.dealer_id);
    return d;
  });
}

/**
 * Get single dealer by dealer_id
 */
function getDealer(dealerId) {
  const dealer = db.prepare(`SELECT * FROM dealers WHERE dealer_id = ?`).get(dealerId);
  if (!dealer) return null;
  dealer.scores = db.prepare(`SELECT * FROM dealer_scores WHERE dealer_id = ?`).all(dealerId);
  return dealer;
}

/**
 * Update dealer
 */
function updateDealer(dealerId, data) {
  const updateDealerStmt = db.prepare(`
    UPDATE dealers SET
      ten_dl = @ten_dl, ten_chu = @ten_chu, sdt = @sdt, dia_chi = @dia_chi,
      dealer_type = @dealer_type, category_stack = @category_stack,
      area_code = @area_code,
      has_install_team = @has_install_team, est_team_size = @est_team_size,
      c_score = @c_score, dealer_tier = @dealer_tier, pilot_batch = @pilot_batch,
      dealer_status = @dealer_status, data_completeness = @data_completeness,
      note = @note, updated_at = datetime('now', 'localtime')
    WHERE dealer_id = @dealer_id
  `);

  const upsertScore = db.prepare(`
    INSERT INTO dealer_scores (dealer_id, criterion_code, score, response, updated_at)
    VALUES (@dealer_id, @criterion_code, @score, @response, datetime('now', 'localtime'))
    ON CONFLICT(dealer_id, criterion_code)
    DO UPDATE SET score = @score, response = @response, updated_at = datetime('now', 'localtime')
  `);

  const transaction = db.transaction(() => {
    const completeness = calculateCompleteness(data, data.scores || []);

    updateDealerStmt.run({
      dealer_id: dealerId,
      ten_dl: data.ten_dl || '',
      ten_chu: data.ten_chu || '',
      sdt: data.sdt || '',
      dia_chi: data.dia_chi || '',
      dealer_type: data.dealer_type || '',
      category_stack: data.category_stack || '',
      area_code: data.area_code || '',
      has_install_team: data.has_install_team ? 1 : 0,
      est_team_size: data.est_team_size || 0,
      c_score: data.c_score || 0,
      dealer_tier: data.dealer_tier || '',
      pilot_batch: data.pilot_batch || '',
      dealer_status: data.dealer_status || 'Active',
      data_completeness: completeness,
      note: data.note || ''
    });

    if (data.scores && Array.isArray(data.scores)) {
      for (const s of data.scores) {
        upsertScore.run({
          dealer_id: dealerId,
          criterion_code: s.criterion_code,
          score: s.score,
          response: s.response || ''
        });
      }
    }
  });

  transaction();
}

/**
 * Delete dealer (also removes photos from disk)
 */
function deleteDealer(dealerId) {
  // Collect photo filenames before deletion so we can clean up files after the transaction commits.
  const photos = db.prepare(`SELECT filename FROM dealer_photos WHERE dealer_id = ?`).all(dealerId);

  const transaction = db.transaction(() => {
    db.prepare(`DELETE FROM dealer_photos WHERE dealer_id = ?`).run(dealerId);
    db.prepare(`DELETE FROM dealer_scores WHERE dealer_id = ?`).run(dealerId);
    db.prepare(`DELETE FROM dealers WHERE dealer_id = ?`).run(dealerId);
  });
  transaction();

  // Best-effort cleanup of files on disk
  const dealerDir = path.join(__dirname, '..', 'data', 'uploads', dealerId);
  for (const p of photos) {
    const filePath = path.join(dealerDir, p.filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
  }
  try { if (fs.existsSync(dealerDir)) fs.rmdirSync(dealerDir); } catch (_) {}
}

// ==================== PHOTOS ====================

function getDealerPhotos(dealerId) {
  return db.prepare(`SELECT * FROM dealer_photos WHERE dealer_id = ? ORDER BY uploaded_at ASC, id ASC`).all(dealerId);
}

function getDealerPhoto(photoId) {
  return db.prepare(`SELECT * FROM dealer_photos WHERE id = ?`).get(photoId);
}

function addDealerPhoto({ dealer_id, filename, original_name, mime_type, size }) {
  const info = db.prepare(`
    INSERT INTO dealer_photos (dealer_id, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `).run(dealer_id, filename, original_name || '', mime_type || '', size || 0);
  return getDealerPhoto(info.lastInsertRowid);
}

function deleteDealerPhoto(photoId) {
  db.prepare(`DELETE FROM dealer_photos WHERE id = ?`).run(photoId);
}


/**
 * Get stats for dashboard
 */
function getStats() {
  const total = db.prepare(`SELECT COUNT(*) as count FROM dealers`).get().count;
  const tierA = db.prepare(`SELECT COUNT(*) as count FROM dealers WHERE dealer_tier = 'TIER A (NODE)'`).get().count;
  const tierB = db.prepare(`SELECT COUNT(*) as count FROM dealers WHERE dealer_tier = 'TIER B (HUB)'`).get().count;
  const tierC = db.prepare(`SELECT COUNT(*) as count FROM dealers WHERE dealer_tier = 'TIER C (LINK)'`).get().count;
  const tierD = db.prepare(`SELECT COUNT(*) as count FROM dealers WHERE dealer_tier = 'TIER D (SEED)'`).get().count;
  return { total, tierA, tierB, tierC, tierD };
}

/**
 * Settings: Get Weights
 */
function getWeights() {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'criteria_weights'`).get();
  return JSON.parse(row.value);
}

/**
 * Settings: Save weights and recalculate all dealers
 */
function saveWeights(weightsObj) {
  // Validate sum = 1.0 (approximated for floats)
  const sum = Object.values(weightsObj).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1.0) > 0.001) throw new Error("Tổng hệ số phải bằng 1");

  const transaction = db.transaction(() => {
    // 1. Update settings
    db.prepare(`UPDATE settings SET value = ? WHERE key = 'criteria_weights'`).run(JSON.stringify(weightsObj));

    // 2. Recalculate all dealers
    const dealers = db.prepare(`SELECT * FROM dealers`).all();
    const getScores = db.prepare(`SELECT * FROM dealer_scores WHERE dealer_id = ?`);
    const updateDealer = db.prepare(`UPDATE dealers SET c_score = ?, dealer_tier = ?, pilot_batch = ? WHERE dealer_id = ?`);

    for (const d of dealers) {
      const scores = getScores.all(d.dealer_id);
      let raw = 0;
      for (const s of scores) {
        const w = weightsObj[s.criterion_code] || 0;
        raw += s.score * w;
      }
      
      const cScore = Math.round(raw * 50 * 10) / 10;
      let tier = 'TIER D (SEED)';
      if (cScore >= 75) tier = 'TIER A (NODE)';
      else if (cScore >= 50) tier = 'TIER B (HUB)';
      else if (cScore >= 30) tier = 'TIER C (LINK)';
      
      let batch = 'BATCH2';
      if (cScore >= 60 && (tier === 'TIER A (NODE)' || tier === 'TIER B (HUB)')) batch = 'BATCH1';
      else if ((cScore >= 30 && cScore <= 59) || tier === 'TIER C (LINK)') batch = 'BATCH2';
      else if (cScore < 30 || tier === 'TIER D (SEED)') batch = 'BATCH3';

      updateDealer.run(cScore, tier, batch, d.dealer_id);
    }
  });

  transaction();
}

module.exports = {
  getDb,
  generateDealerId,
  createDealer,
  getAllDealers,
  getDealer,
  updateDealer,
  deleteDealer,
  getStats,
  getWeights,
  saveWeights,
  getDealerPhotos,
  getDealerPhoto,
  addDealerPhoto,
  deleteDealerPhoto
};
