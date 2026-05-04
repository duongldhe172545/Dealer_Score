const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const { dealerIdParam } = require('../lib/security');

// Length limits guard against abusive payloads while still leaving plenty of headroom.
const MAX = { ten_dl: 200, ten_chu: 200, sdt: 20, dia_chi: 500, area_code: 50,
              dealer_type: 100, category_stack: 100, note: 2000 };

function sanitizeDealerInput(body) {
  for (const [field, max] of Object.entries(MAX)) {
    if (typeof body[field] === 'string' && body[field].length > max) {
      throw new Error(`Trường ${field} quá dài (tối đa ${max} ký tự)`);
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
