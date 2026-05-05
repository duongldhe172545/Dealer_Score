const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const { dealerIdParam } = require('../lib/security');
const { CONFIG } = require('../lib/config');

// Validates payload from POST /api/dealers and PUT /api/dealers/:id.
// Throws on the first violation so the route handler can surface a 400.
function sanitizeDealerInput(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Body không hợp lệ');
  }

  // ---- Length caps for free-text fields ----
  for (const [field, max] of Object.entries(CONFIG.FIELD_MAX_LEN)) {
    if (typeof body[field] === 'string' && body[field].length > max) {
      throw new Error(`Trường ${field} quá dài (tối đa ${max} ký tự)`);
    }
  }

  // ---- Phone format ----
  if (body.sdt && !/^[0-9]{10,11}$/.test(body.sdt)) {
    throw new Error('Số điện thoại không hợp lệ (10-11 chữ số)');
  }

  // ---- c_score in [0, 100] ----
  if (body.c_score != null) {
    const n = Number(body.c_score);
    if (!Number.isFinite(n) || n < CONFIG.C_SCORE_MIN || n > CONFIG.C_SCORE_MAX) {
      throw new Error(`c_score phải nằm trong ${CONFIG.C_SCORE_MIN}-${CONFIG.C_SCORE_MAX}`);
    }
  }

  // ---- Tier / batch / status enums ----
  if (body.dealer_tier && !CONFIG.TIERS.includes(body.dealer_tier)) {
    throw new Error(`dealer_tier không hợp lệ (chỉ chấp nhận: ${CONFIG.TIERS.join(', ')})`);
  }
  if (body.pilot_batch && !CONFIG.BATCHES.includes(body.pilot_batch)) {
    throw new Error(`pilot_batch không hợp lệ (chỉ chấp nhận: ${CONFIG.BATCHES.join(', ')})`);
  }
  if (body.dealer_status && !CONFIG.DEALER_STATUSES.includes(body.dealer_status)) {
    throw new Error(`dealer_status không hợp lệ (chỉ chấp nhận: ${CONFIG.DEALER_STATUSES.join(', ')})`);
  }

  // ---- Numeric / boolean coercion checks ----
  if (body.est_team_size != null) {
    const n = Number(body.est_team_size);
    if (!Number.isInteger(n) || n < 0) {
      throw new Error('est_team_size phải là số nguyên không âm');
    }
  }

  // ---- Per-criterion scores must be 0/1/2 ----
  if (Array.isArray(body.scores)) {
    for (const s of body.scores) {
      if (s && s.score != null && !CONFIG.CRITERION_SCORES.includes(Number(s.score))) {
        throw new Error(`Điểm tiêu chí ${s.criterion_code} phải là 0, 1 hoặc 2`);
      }
    }
  }
}

router.param('id', dealerIdParam);

// GET /api/dealers — List all dealers
router.get('/', (req, res) => {
  try {
    res.json({ success: true, data: db.getAllDealers() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dealers/stats — Dashboard stats
router.get('/stats', (req, res) => {
  try {
    res.json({ success: true, data: db.getStats() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dealers/:id — Get single dealer
router.get('/:id', (req, res) => {
  try {
    const dealer = db.getDealer(req.params.id);
    if (!dealer) {
      return res.status(404).json({ success: false, error: 'Dealer not found' });
    }
    res.json({ success: true, data: dealer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dealers — Create dealer
router.post('/', (req, res) => {
  try {
    sanitizeDealerInput(req.body);
    const dealerId = db.createDealer(req.body);
    const dealer = db.getDealer(dealerId);
    res.status(201).json({ success: true, data: dealer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/dealers/:id — Update dealer
router.put('/:id', (req, res) => {
  try {
    sanitizeDealerInput(req.body);
    const existing = db.getDealer(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Dealer not found' });
    }
    db.updateDealer(req.params.id, req.body);
    const dealer = db.getDealer(req.params.id);
    res.json({ success: true, data: dealer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/dealers/:id — Delete dealer
router.delete('/:id', (req, res) => {
  try {
    const existing = db.getDealer(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Dealer not found' });
    }
    db.deleteDealer(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
