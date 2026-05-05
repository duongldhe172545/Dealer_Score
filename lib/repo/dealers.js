// Dealers repository — CRUD + stats. Pure DB queries, no HTTP/file-system
// concerns aside from cleaning up the upload directory when a dealer is
// deleted (so we don't leave orphan photos on disk).

const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const { calculateCompleteness } = require('../scoring');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

function db() { return getDb(); }

// Generates DL-0001, DL-0002, ... by incrementing the latest dealer_id.
//
// NOTE: this is read-then-write outside any transaction, so concurrent POSTs
// could in theory both compute the same id. At current scale (one user, dealers
// created manually) this is acceptable; revisit if we ever go multi-tenant.
function generateDealerId() {
  const row = db().prepare(`SELECT dealer_id FROM dealers ORDER BY id DESC LIMIT 1`).get();
  if (!row) return 'DL-0001';
  const num = parseInt(row.dealer_id.replace('DL-', ''), 10);
  return `DL-${String(num + 1).padStart(4, '0')}`;
}

function createDealer(data) {
  const dealerId = generateDealerId();

  const insertDealer = db().prepare(`
    INSERT INTO dealers (dealer_id, ten_dl, ten_chu, sdt, dia_chi, dealer_type,
      category_stack, area_code, has_install_team, est_team_size, c_score, dealer_tier,
      pilot_batch, dealer_status, data_completeness, note)
    VALUES (@dealer_id, @ten_dl, @ten_chu, @sdt, @dia_chi, @dealer_type,
      @category_stack, @area_code, @has_install_team, @est_team_size, @c_score, @dealer_tier,
      @pilot_batch, @dealer_status, @data_completeness, @note)
  `);

  const insertScore = db().prepare(`
    INSERT INTO dealer_scores (dealer_id, criterion_code, score, response)
    VALUES (@dealer_id, @criterion_code, @score, @response)
  `);

  const tx = db().transaction(() => {
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

    if (Array.isArray(data.scores)) {
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

  return tx();
}

function getAllDealers() {
  const dealers = db().prepare(`SELECT * FROM dealers ORDER BY created_at DESC`).all();
  const getScores = db().prepare(`SELECT * FROM dealer_scores WHERE dealer_id = ?`);
  return dealers.map(d => {
    d.scores = getScores.all(d.dealer_id);
    return d;
  });
}

function getDealer(dealerId) {
  const dealer = db().prepare(`SELECT * FROM dealers WHERE dealer_id = ?`).get(dealerId);
  if (!dealer) return null;
  dealer.scores = db().prepare(`SELECT * FROM dealer_scores WHERE dealer_id = ?`).all(dealerId);
  return dealer;
}

function updateDealer(dealerId, data) {
  const updateStmt = db().prepare(`
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

  const upsertScore = db().prepare(`
    INSERT INTO dealer_scores (dealer_id, criterion_code, score, response, updated_at)
    VALUES (@dealer_id, @criterion_code, @score, @response, datetime('now', 'localtime'))
    ON CONFLICT(dealer_id, criterion_code)
    DO UPDATE SET score = @score, response = @response, updated_at = datetime('now', 'localtime')
  `);

  const tx = db().transaction(() => {
    const completeness = calculateCompleteness(data, data.scores || []);

    updateStmt.run({
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

    if (Array.isArray(data.scores)) {
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

  tx();
}

// Delete dealer + all related data (scores cascade via FK; photos deleted
// explicitly, plus disk cleanup as best-effort).
function deleteDealer(dealerId) {
  const photos = db().prepare(`SELECT filename FROM dealer_photos WHERE dealer_id = ?`).all(dealerId);

  const tx = db().transaction(() => {
    db().prepare(`DELETE FROM dealer_photos WHERE dealer_id = ?`).run(dealerId);
    db().prepare(`DELETE FROM dealer_scores WHERE dealer_id = ?`).run(dealerId);
    db().prepare(`DELETE FROM dealers WHERE dealer_id = ?`).run(dealerId);
  });
  tx();

  const dealerDir = path.join(UPLOADS_DIR, dealerId);
  for (const p of photos) {
    const filePath = path.join(dealerDir, p.filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
  }
  try { if (fs.existsSync(dealerDir)) fs.rmdirSync(dealerDir); } catch (_) {}
}

function getStats() {
  const total = db().prepare(`SELECT COUNT(*) as count FROM dealers`).get().count;
  const tierA = db().prepare(`SELECT COUNT(*) as count FROM dealers WHERE dealer_tier = 'TIER A (NODE)'`).get().count;
  const tierB = db().prepare(`SELECT COUNT(*) as count FROM dealers WHERE dealer_tier = 'TIER B (HUB)'`).get().count;
  const tierC = db().prepare(`SELECT COUNT(*) as count FROM dealers WHERE dealer_tier = 'TIER C (LINK)'`).get().count;
  const tierD = db().prepare(`SELECT COUNT(*) as count FROM dealers WHERE dealer_tier = 'TIER D (SEED)'`).get().count;
  return { total, tierA, tierB, tierC, tierD };
}

module.exports = {
  generateDealerId,
  createDealer,
  getAllDealers,
  getDealer,
  updateDealer,
  deleteDealer,
  getStats
};
