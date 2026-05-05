require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./lib/database');
const { logger, httpLogger } = require('./lib/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
db.getDb();

// Middleware
app.use(httpLogger);  // attaches req.id + req.log to every request
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

// Public config — thresholds, file limits, enums. Loaded once on FE boot
// so we never have to keep magic numbers in sync between client and server.
app.get('/api/config', (req, res) => {
  const { publicConfig } = require('./lib/config');
  res.json({ success: true, data: publicConfig() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, `🏪 Dealer Scoring Tool running at http://localhost:${PORT}`);
});
