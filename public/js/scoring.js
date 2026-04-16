/**
 * Scoring Engine — calculates C_score, Tier, Batch
 */
window.ScoringEngine = {
  /**
   * Calculate C_score from individual scores
   * @param {Object} scores - { C1: 0|1|2, C2: 0|1|2, ... C9: 0|1|2 }
   * @returns {number} C_score (0-100 scale)
   */
  calculateCScore(scores) {
    let raw = 0;
    for (const c of window.CRITERIA) {
      const score = scores[c.code] || 0;
      raw += score * c.weight;
    }
    // raw is 0-2 range, multiply by 50 to get 0-100
    return Math.round(raw * 50 * 10) / 10;
  },

  /**
   * Determine Tier from C_score
   */
  getTier(cScore) {
    if (cScore >= 75) return 'TIER A (NODE)';
    if (cScore >= 50) return 'TIER B (HUB)';
    if (cScore >= 30) return 'TIER C (LINK)';
    return 'TIER D (SEED)';
  },

  /**
   * Determine Batch from C_score and Tier
   */
  getBatch(cScore, tier) {
    if (cScore >= 60 && (tier === 'TIER A (NODE)' || tier === 'TIER B (HUB)')) return 'BATCH1';
    if ((cScore >= 30 && cScore <= 59) || tier === 'TIER C (LINK)') return 'BATCH2';
    if (cScore < 30 || tier === 'TIER D (SEED)') return 'BATCH3';
    return 'BATCH2';
  },

  /**
   * Get tier CSS class
   */
  getTierClass(tier) {
    if (tier.includes('A')) return 'tier-a';
    if (tier.includes('B')) return 'tier-b';
    if (tier.includes('C')) return 'tier-c';
    return 'tier-d';
  },

  /**
   * Full calculation from scores object
   */
  calculate(scores) {
    const cScore = this.calculateCScore(scores);
    const tier = this.getTier(cScore);
    const batch = this.getBatch(cScore, tier);
    return { cScore, tier, batch };
  }
};
