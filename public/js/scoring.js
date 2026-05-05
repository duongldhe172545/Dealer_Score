/**
 * Scoring Engine — calculates C_score, Tier, Batch.
 *
 * Thresholds come from window.CONFIG (loaded once at boot from /api/config),
 * so they always match the backend. Hardcoded fallbacks below are only used
 * if config failed to load.
 */
window.ScoringEngine = {
  // Resolve thresholds at call-time so the values reflect whatever is in
  // window.CONFIG at the moment (may load asynchronously).
  _tierThresholds() {
    return (window.CONFIG && window.CONFIG.TIER_THRESHOLDS) || { A: 75, B: 50, C: 30 };
  },
  _batch1Min() {
    return (window.CONFIG && window.CONFIG.BATCH_THRESHOLDS && window.CONFIG.BATCH_THRESHOLDS.BATCH1_MIN_SCORE) || 60;
  },

  // Calculate C_score from individual scores: { C1: 0|1|2, ..., C9: 0|1|2 }.
  // Returns a number in the 0-100 range with 0.1 precision.
  calculateCScore(scores) {
    let raw = 0;
    for (const c of window.CRITERIA) {
      const score = scores[c.code] || 0;
      raw += score * c.weight;
    }
    return Math.round(raw * 50 * 10) / 10;
  },

  getTier(cScore) {
    const t = this._tierThresholds();
    if (cScore >= t.A) return 'TIER A (NODE)';
    if (cScore >= t.B) return 'TIER B (HUB)';
    if (cScore >= t.C) return 'TIER C (LINK)';
    return 'TIER D (SEED)';
  },

  getBatch(cScore, tier) {
    const t = this._tierThresholds();
    const min1 = this._batch1Min();
    if (cScore >= min1 && (tier === 'TIER A (NODE)' || tier === 'TIER B (HUB)')) return 'BATCH1';
    if ((cScore >= t.C && cScore < min1) || tier === 'TIER C (LINK)') return 'BATCH2';
    return 'BATCH3';
  },

  getTierClass(tier) {
    if (!tier) return 'tier-d';
    if (tier.includes('A')) return 'tier-a';
    if (tier.includes('B')) return 'tier-b';
    if (tier.includes('C')) return 'tier-c';
    return 'tier-d';
  },

  calculate(scores) {
    const cScore = this.calculateCScore(scores);
    const tier = this.getTier(cScore);
    const batch = this.getBatch(cScore, tier);
    return { cScore, tier, batch };
  }
};
