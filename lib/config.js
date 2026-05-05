// Centralized configuration. All magic numbers and business thresholds live
// here so the values can't drift between routes/, lib/, and public/js/.
//
// Constants exposed via GET /api/config are loaded by the frontend at boot
// (see public/js/app.js -> loadConfig). Backend code imports CONFIG directly.

const CONFIG = {
  // ---- Tier thresholds (c_score → tier label) ----
  TIER_THRESHOLDS: {
    A: 75,  // c_score >= A   -> TIER A (NODE)
    B: 50,  // c_score >= B   -> TIER B (HUB)
    C: 30   // c_score >= C   -> TIER C (LINK), else D (SEED)
  },

  // ---- Pilot batch thresholds ----
  BATCH_THRESHOLDS: {
    BATCH1_MIN_SCORE: 60   // BATCH1 = c_score >= 60 AND tier in (A, B)
                            // BATCH2 = (30 <= c_score <= 59) OR tier C
                            // BATCH3 = c_score < 30 OR tier D
  },

  // ---- Allowed enum values (for server-side validation) ----
  TIERS: ['TIER A (NODE)', 'TIER B (HUB)', 'TIER C (LINK)', 'TIER D (SEED)'],
  BATCHES: ['BATCH1', 'BATCH2', 'BATCH3'],
  DEALER_STATUSES: ['Active', 'Inactive', 'Pending', 'Archived'],

  // ---- Photo upload limits ----
  MAX_PHOTOS_PER_DEALER: 5,
  MAX_PHOTO_SIZE: 5 * 1024 * 1024,           // 5 MB per file
  ALLOWED_PHOTO_MIME: ['image/jpeg', 'image/png', 'image/webp'],

  // ---- Field length caps for dealer record ----
  FIELD_MAX_LEN: {
    ten_dl: 200,
    ten_chu: 200,
    sdt: 20,
    dia_chi: 500,
    area_code: 50,
    dealer_type: 100,
    category_stack: 100,
    note: 2000
  },

  // ---- Score / response value ranges ----
  C_SCORE_MIN: 0,
  C_SCORE_MAX: 100,
  CRITERION_SCORES: [0, 1, 2],

  // ---- AI scoring (Gemini) ----
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
  GEMINI_TEMPERATURE: 0.1
};

// Subset that's safe to send to the browser. Excludes server-only values
// (Gemini config, anything reading process.env directly).
function publicConfig() {
  return {
    TIER_THRESHOLDS: CONFIG.TIER_THRESHOLDS,
    BATCH_THRESHOLDS: CONFIG.BATCH_THRESHOLDS,
    TIERS: CONFIG.TIERS,
    BATCHES: CONFIG.BATCHES,
    MAX_PHOTOS_PER_DEALER: CONFIG.MAX_PHOTOS_PER_DEALER,
    MAX_PHOTO_SIZE: CONFIG.MAX_PHOTO_SIZE,
    ALLOWED_PHOTO_MIME: CONFIG.ALLOWED_PHOTO_MIME,
    FIELD_MAX_LEN: CONFIG.FIELD_MAX_LEN,
    C_SCORE_MIN: CONFIG.C_SCORE_MIN,
    C_SCORE_MAX: CONFIG.C_SCORE_MAX
  };
}

module.exports = { CONFIG, publicConfig };
