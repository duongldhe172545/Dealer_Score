// Dealer photos repository — pure DB queries.
// Disk-side cleanup lives in routes/photos.js (closer to multer state).

const { getDb } = require('../db');

function db() { return getDb(); }

function getDealerPhotos(dealerId) {
  return db()
    .prepare(`SELECT * FROM dealer_photos WHERE dealer_id = ? ORDER BY uploaded_at ASC, id ASC`)
    .all(dealerId);
}

function getDealerPhoto(photoId) {
  return db().prepare(`SELECT * FROM dealer_photos WHERE id = ?`).get(photoId);
}

function addDealerPhoto({ dealer_id, filename, original_name, mime_type, size }) {
  const info = db().prepare(`
    INSERT INTO dealer_photos (dealer_id, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `).run(dealer_id, filename, original_name || '', mime_type || '', size || 0);
  return getDealerPhoto(info.lastInsertRowid);
}

// Batch insert wrapped in a single transaction. Either every photo lands in
// the DB, or none do — caller is responsible for cleaning up the disk files
// on the throw branch (see routes/photos.js).
function addDealerPhotosBatch(files) {
  const insert = db().prepare(`
    INSERT INTO dealer_photos (dealer_id, filename, original_name, mime_type, size)
    VALUES (@dealer_id, @filename, @original_name, @mime_type, @size)
  `);
  const tx = db().transaction((batch) => {
    const ids = [];
    for (const f of batch) {
      const info = insert.run({
        dealer_id: f.dealer_id,
        filename: f.filename,
        original_name: f.original_name || '',
        mime_type: f.mime_type || '',
        size: f.size || 0
      });
      ids.push(info.lastInsertRowid);
    }
    return ids;
  });
  const ids = tx(files);
  return ids.map(id => getDealerPhoto(id));
}

function deleteDealerPhoto(photoId) {
  db().prepare(`DELETE FROM dealer_photos WHERE id = ?`).run(photoId);
}

module.exports = {
  getDealerPhotos,
  getDealerPhoto,
  addDealerPhoto,
  addDealerPhotosBatch,
  deleteDealerPhoto
};
