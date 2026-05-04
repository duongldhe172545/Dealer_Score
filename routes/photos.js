const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../lib/database');

const router = express.Router();

const UPLOAD_BASE = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_BASE)) fs.mkdirSync(UPLOAD_BASE, { recursive: true });

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PER_DEALER = 5;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_BASE, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error(`Định dạng ${file.mimetype} không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP.`));
    }
    cb(null, true);
  }
});

// GET list photos
router.get('/:id/photos', (req, res) => {
  try {
    const dealer = db.getDealer(req.params.id);
    if (!dealer) return res.status(404).json({ success: false, error: 'Dealer not found' });
    const photos = db.getDealerPhotos(req.params.id);
    res.json({ success: true, data: photos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST upload photos (multipart, field name "photos")
router.post('/:id/photos', (req, res) => {
  const dealerId = req.params.id;
  const dealer = db.getDealer(dealerId);
  if (!dealer) return res.status(404).json({ success: false, error: 'Dealer not found' });

  const existing = db.getDealerPhotos(dealerId).length;
  const remaining = MAX_PER_DEALER - existing;
  if (remaining <= 0) {
    return res.status(400).json({ success: false, error: `Đã đạt giới hạn ${MAX_PER_DEALER} ảnh/đại lý` });
  }

  upload.array('photos', remaining)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File quá lớn (tối đa 5MB/ảnh)' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, error: `Chỉ được upload tối đa ${remaining} ảnh nữa` });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Không có file nào được upload' });
    }
    const saved = req.files.map(f => db.addDealerPhoto({
      dealer_id: dealerId,
      filename: f.filename,
      original_name: f.originalname,
      mime_type: f.mimetype,
      size: f.size
    }));
    res.json({ success: true, data: saved });
  });
});

// DELETE one photo
router.delete('/:id/photos/:photoId', (req, res) => {
  try {
    const { id: dealerId, photoId } = req.params;
    const photo = db.getDealerPhoto(photoId);
    if (!photo || photo.dealer_id !== dealerId) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }
    const filePath = path.join(UPLOAD_BASE, dealerId, photo.filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
    db.deleteDealerPhoto(photoId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
