// Backward-compatible facade that re-exports from the split modules.
// Existing routes still do `require('../lib/database')` and call methods
// like `db.createDealer(...)`. New code should import directly from
// lib/db, lib/repo/dealers, lib/repo/photos, lib/repo/settings.

const { getDb } = require('./db');
const dealers = require('./repo/dealers');
const photos = require('./repo/photos');
const settings = require('./repo/settings');

module.exports = {
  // Connection
  getDb,

  // Dealers
  generateDealerId: dealers.generateDealerId,
  createDealer:     dealers.createDealer,
  getAllDealers:    dealers.getAllDealers,
  getDealer:        dealers.getDealer,
  updateDealer:     dealers.updateDealer,
  deleteDealer:     dealers.deleteDealer,
  getStats:         dealers.getStats,

  // Photos
  getDealerPhotos:      photos.getDealerPhotos,
  getDealerPhoto:       photos.getDealerPhoto,
  addDealerPhoto:       photos.addDealerPhoto,
  addDealerPhotosBatch: photos.addDealerPhotosBatch,
  deleteDealerPhoto:    photos.deleteDealerPhoto,

  // Settings
  getWeights:  settings.getWeights,
  saveWeights: settings.saveWeights
};
