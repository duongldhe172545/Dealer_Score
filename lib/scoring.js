// Shared scoring helpers — used by lib/database.js (when recalculating all
// dealers after a weight change) and indirectly by the frontend (which has
// its own copy in public/js/scoring.js; thresholds here are the source of
// truth and exposed to the browser via /api/config).

const { CONFIG } = require('./config');

// raw = Σ(score * weight)  (score ∈ {0,1,2}, weight ∈ [0,1], Σweights = 1)
// c_score = round(raw * 50, 0.1) → 0..100 scale.
function calculateCScore(scores, weights) {
  let raw = 0;
  for (const code of Object.keys(weights)) {
    const s = scores[code];
    if (typeof s === 'number') raw += s * weights[code];
  }
  return Math.round(raw * 50 * 10) / 10;
}

function getTier(cScore) {
  const t = CONFIG.TIER_THRESHOLDS;
  if (cScore >= t.A) return 'TIER A (NODE)';
  if (cScore >= t.B) return 'TIER B (HUB)';
  if (cScore >= t.C) return 'TIER C (LINK)';
  return 'TIER D (SEED)';
}

function getBatch(cScore, tier) {
  const min1 = CONFIG.BATCH_THRESHOLDS.BATCH1_MIN_SCORE;
  if (cScore >= min1 && (tier === 'TIER A (NODE)' || tier === 'TIER B (HUB)')) return 'BATCH1';
  if ((cScore >= CONFIG.TIER_THRESHOLDS.C && cScore < min1) || tier === 'TIER C (LINK)') return 'BATCH2';
  return 'BATCH3';
}

// Used by detail page CSS class hint (frontend mirror exists in scoring.js).
function getTierClass(tier) {
  if (!tier) return 'tier-d';
  if (tier.includes('A')) return 'tier-a';
  if (tier.includes('B')) return 'tier-b';
  if (tier.includes('C')) return 'tier-c';
  return 'tier-d';
}

// "How filled-in is this dealer record" — 7 basic fields + 9 criterion scores
// = 16 slots total. A criterion counts as filled the moment it's been scored
// (0/1/2 are all valid scores); the optional response text doesn't matter.
const COMPLETENESS_FIELDS = [
  'ten_dl', 'ten_chu', 'sdt', 'dia_chi', 'dealer_type', 'category_stack', 'area_code'
];

function calculateCompleteness(dealer, scores) {
  let filled = 0;
  const total = COMPLETENESS_FIELDS.length + 9;

  for (const f of COMPLETENESS_FIELDS) {
    if (dealer[f] && dealer[f].toString().trim()) filled++;
  }
  if (Array.isArray(scores)) {
    for (const s of scores) {
      if (s && s.score !== null && s.score !== undefined) filled++;
    }
  }
  return Math.round((filled / total) * 100);
}

module.exports = {
  calculateCScore,
  getTier,
  getBatch,
  getTierClass,
  calculateCompleteness,
  COMPLETENESS_FIELDS
};
