const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// GET  /api/settings/weights — current criteria weights
router.get('/weights', (req, res) => {
  try {
    res.json({ success: true, data: db.getWeights() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/weights — update weights and recalculate all dealers
router.post('/weights', (req, res) => {
  try {
    db.saveWeights(req.body);
    res.json({ success: true, message: 'Đã cập nhật hệ số và tính lại điểm cho tất cả đại lý.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
