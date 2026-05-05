// Settings repository — currently just criteria weights.
//
// saveWeights validates the new map sums to 1.0 and recalculates
// c_score / dealer_tier / pilot_batch for every dealer using lib/scoring.js,
// so the dashboard reflects the new weights without restarting.

const { getDb } = require('../db');
const { calculateCScore, getTier, getBatch } = require('../scoring');

function db() { return getDb(); }

function getWeights() {
  const row = db().prepare(`SELECT value FROM settings WHERE key = 'criteria_weights'`).get();
  return JSON.parse(row.value);
}

function saveWeights(weightsObj) {
  const sum = Object.values(weightsObj).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1.0) > 0.001) throw new Error('Tổng hệ số phải bằng 1');

  const tx = db().transaction(() => {
    db().prepare(`UPDATE settings SET value = ? WHERE key = 'criteria_weights'`)
        .run(JSON.stringify(weightsObj));

    const dealers = db().prepare(`SELECT * FROM dealers`).all();
    const getScores = db().prepare(`SELECT criterion_code, score FROM dealer_scores WHERE dealer_id = ?`);
    const updateDealer = db().prepare(
      `UPDATE dealers SET c_score = ?, dealer_tier = ?, pilot_batch = ? WHERE dealer_id = ?`
    );

    for (const d of dealers) {
      const rows = getScores.all(d.dealer_id);
      const scoresMap = {};
      for (const r of rows) scoresMap[r.criterion_code] = r.score;

      const cScore = calculateCScore(scoresMap, weightsObj);
      const tier = getTier(cScore);
      const batch = getBatch(cScore, tier);
      updateDealer.run(cScore, tier, batch, d.dealer_id);
    }
  });

  tx();
}

module.exports = { getWeights, saveWeights };
