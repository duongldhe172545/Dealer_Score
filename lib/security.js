const fs = require('fs');

// dealer_id is server-generated as DL-XXXX. Reject anything else early so a
// malicious value like "../../etc" can't escape upload/font directories via path.join.
const DEALER_ID_RE = /^DL-\d{4,}$/;

function dealerIdParam(req, res, next, id) {
  if (!DEALER_ID_RE.test(id)) {
    return res.status(400).json({ success: false, error: 'Invalid dealer_id format' });
  }
  next();
}

// Verify a freshly-uploaded file's first bytes match its claimed MIME type.
// We only support 3 image formats — checking magic bytes is small enough to
// inline rather than pull in an extra dependency.
function detectImageType(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);

  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  // WEBP: "RIFF" .... "WEBP"
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

module.exports = { dealerIdParam, detectImageType, DEALER_ID_RE };
