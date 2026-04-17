const express = require('express');
const router = express.Router();
const db = require('../lib/database');

// GET /api/dealers — List all dealers
router.get('/', (req, res) => {
  try {
    const dealers = db.getAllDealers();
    res.json({ success: true, data: dealers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dealers/stats — Dashboard stats
router.get('/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dealers/weights — Get criteria weights
router.get('/weights', (req, res) => {
  try {
    const weights = db.getWeights();
    res.json({ success: true, data: weights });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dealers/weights — Save weights and trigger recalculation
router.post('/weights', (req, res) => {
  try {
    db.saveWeights(req.body);
    res.json({ success: true, message: 'Updated weights and recalculated all dealers.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
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
    const dealerId = db.createDealer(req.body);
    const dealer = db.getDealer(dealerId);
    res.status(201).json({ success: true, data: dealer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/dealers/:id — Update dealer
router.put('/:id', (req, res) => {
  try {
    const existing = db.getDealer(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Dealer not found' });
    }
    db.updateDealer(req.params.id, req.body);
    const dealer = db.getDealer(req.params.id);
    res.json({ success: true, data: dealer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
