require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./lib/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
db.getDb();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

// Routes — namespaced by domain
app.use('/api/dealers',  require('./routes/photos'));   // /api/dealers/:id/photos[...]
app.use('/api/dealers',  require('./routes/dealers'));  // /api/dealers (CRUD + stats)
app.use('/api/exports',  require('./routes/exports'));  // /api/exports/excel, /api/exports/dealers/:id/pdf
app.use('/api/ai',       require('./routes/ai'));       // /api/ai/score
app.use('/api/settings', require('./routes/settings')); // /api/settings/weights
// Static metadata: criteria list (single source of truth for the frontend)
app.get('/api/criteria', (req, res) => {
  const { CRITERIA } = require('./lib/criteria');
  res.json({ success: true, data: CRITERIA });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏪 Dealer Scoring Tool running at http://localhost:${PORT}\n`);
});
