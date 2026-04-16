require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
db.getDb();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/dealers', require('./routes/dealers'));
app.use('/api', require('./routes/scoring'));
app.use('/api', require('./routes/sync'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏪 Dealer Scoring Tool running at http://localhost:${PORT}\n`);
});
