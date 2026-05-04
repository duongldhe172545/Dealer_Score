const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const db = require('../lib/database');

const router = express.Router();

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_REG = path.join(FONT_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Roboto-Bold.ttf');
const UPLOAD_BASE = path.join(__dirname, '..', 'data', 'uploads');

// Hard-coded criteria metadata for the score table (the canonical list lives in
// public/js/criteria.js but is browser-side; we duplicate the minimum needed here).
const CRITERIA = [
  { code: 'C1', name: 'Sở hữu khách hàng bền vững',         weight: 0.20 },
  { code: 'C2', name: 'P&L độc lập + dòng tiền tự quản',    weight: 0.15 },
  { code: 'C3', name: 'Quản lý đội thi công cơ hữu',        weight: 0.15 },
  { code: 'C4', name: 'Trách nhiệm cuối (skin-in-the-game)',weight: 0.15 },
  { code: 'C5', name: 'Động lực tham gia có nguồn gốc rõ',  weight: 0.10 },
  { code: 'C6', name: 'Năng lực truyền thông & học hỏi',    weight: 0.10 },
  { code: 'C7', name: 'Vị trí địa lý & thị trường',         weight: 0.08 },
  { code: 'C8', name: 'Quan hệ ngành & uy tín',             weight: 0.04 },
  { code: 'C9', name: 'Tài sản số / dữ liệu',               weight: 0.03 }
];

router.get('/:id/export-pdf', async (req, res) => {
  try {
    const dealer = db.getDealer(req.params.id);
    if (!dealer) return res.status(404).json({ success: false, error: 'Dealer not found' });
    const photos = db.getDealerPhotos(req.params.id);
    const scoreMap = {};
    (dealer.scores || []).forEach(s => { scoreMap[s.criterion_code] = s; });

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 48, left: 48, right: 48 },
      info: {
        Title: `Hồ sơ đại lý ${dealer.dealer_id}`,
        Author: 'ADG Dealer Scoring Tool',
        Subject: dealer.ten_dl
      }
    });

    doc.registerFont('Reg', FONT_REG);
    doc.registerFont('Bold', FONT_BOLD);
    doc.font('Reg');

    const filename = `Dealer_${dealer.dealer_id}_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    renderHeader(doc, dealer);
    renderInfoGrid(doc, dealer);
    renderScoreTable(doc, scoreMap);
    renderPhotos(doc, dealer.dealer_id, photos);

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.end();
    }
  }
});

// ---------- helpers ----------

function renderHeader(doc, d) {
  doc.font('Bold').fontSize(18).fillColor('#1a202c')
     .text('HỒ SƠ ĐẠI LÝ', { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Bold').fontSize(14).fillColor('#2d3748')
     .text(d.ten_dl || '-', { align: 'center' });
  doc.font('Reg').fontSize(10).fillColor('#718096')
     .text(`Mã: ${d.dealer_id}`, { align: 'center' });
  doc.moveDown(0.6);

  // Top metrics row: Score | Tier | Batch
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const w = right - left;
  const colW = w / 3;
  const y = doc.y;
  drawMetric(doc, left,             y, colW, 'C_SCORE',     `${d.c_score ?? '-'}`,        '#6366f1');
  drawMetric(doc, left + colW,      y, colW, 'TIER',        d.dealer_tier || '-',         '#10b981');
  drawMetric(doc, left + colW * 2,  y, colW, 'PILOT BATCH', d.pilot_batch || '-',         '#f59e0b');
  doc.y = y + 56;
  doc.moveDown(0.4);
}

function drawMetric(doc, x, y, w, label, value, color) {
  doc.save();
  doc.roundedRect(x + 6, y, w - 12, 50, 6).lineWidth(1).strokeColor('#e2e8f0').stroke();
  doc.font('Reg').fontSize(8).fillColor('#718096')
     .text(label, x + 6, y + 8, { width: w - 12, align: 'center' });
  doc.font('Bold').fontSize(14).fillColor(color)
     .text(value, x + 6, y + 22, { width: w - 12, align: 'center' });
  doc.restore();
}

function renderInfoGrid(doc, d) {
  sectionTitle(doc, 'Thông tin chung');
  const fields = [
    ['Chủ đại lý',      d.ten_chu],
    ['Số điện thoại',   d.sdt],
    ['Địa chỉ',         d.dia_chi],
    ['Mã địa danh',     d.area_code],
    ['Loại đại lý',     d.dealer_type],
    ['Ngành hàng',      d.category_stack],
    ['Đội lắp đặt',     d.has_install_team ? `Có (${d.est_team_size || 0} thợ)` : 'Không'],
    ['Trạng thái',      d.dealer_status],
    ['Data hoàn thiện', d.data_completeness != null ? `${d.data_completeness}%` : '-'],
    ['Ngày tạo',        d.created_at],
    ['Cập nhật cuối',   d.updated_at],
    ['Ghi chú',         d.note]
  ];

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const colW = (right - left) / 2;
  const labelW = 90;
  const valueW = colW - labelW - 12;
  const rowH = 18;

  let y = doc.y;
  fields.forEach((f, i) => {
    const col = i % 2;
    const x = left + col * colW;
    if (col === 0 && i > 0) y += rowH;

    doc.font('Reg').fontSize(8.5).fillColor('#718096')
       .text(f[0], x + 4, y + 3, { width: labelW });
    doc.font('Reg').fontSize(9.5).fillColor('#1a202c')
       .text(f[1] || '-', x + labelW + 4, y + 3, { width: valueW, height: rowH - 4, ellipsis: true });
  });
  doc.y = y + rowH + 8;
}

function renderScoreTable(doc, scoreMap) {
  sectionTitle(doc, 'Chi tiết chấm điểm');
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const totalW = right - left;
  const colCode = 40, colScore = 50, colWeight = 60, colWeighted = 70;
  const colName = totalW - colCode - colScore - colWeight - colWeighted;

  let y = doc.y;
  // Header row
  doc.save().rect(left, y, totalW, 22).fill('#2d3748').restore();
  doc.font('Bold').fontSize(9).fillColor('#fff');
  doc.text('Mã',     left + 6,                                     y + 7, { width: colCode - 6 });
  doc.text('Tiêu chí', left + colCode + 4,                          y + 7, { width: colName - 4 });
  doc.text('Điểm',  left + colCode + colName,                      y + 7, { width: colScore, align: 'center' });
  doc.text('Trọng số', left + colCode + colName + colScore,        y + 7, { width: colWeight, align: 'center' });
  doc.text('= Quy đổi', left + colCode + colName + colScore + colWeight, y + 7, { width: colWeighted, align: 'center' });
  y += 22;

  let totalWeighted = 0;
  CRITERIA.forEach((c, i) => {
    const rec = scoreMap[c.code];
    const score = rec ? rec.score : 0;
    const weighted = score * c.weight * 50;
    totalWeighted += weighted;
    const rowH = 22;

    if (i % 2 === 0) {
      doc.save().rect(left, y, totalW, rowH).fill('#f7fafc').restore();
    }
    const scoreColor = score === 0 ? '#dc2626' : score === 1 ? '#d97706' : '#16a34a';

    doc.font('Bold').fontSize(9).fillColor('#4a5568').text(c.code, left + 6, y + 7, { width: colCode - 6 });
    doc.font('Reg').fontSize(9).fillColor('#1a202c').text(c.name, left + colCode + 4, y + 7, {
      width: colName - 4, height: rowH - 4, ellipsis: true
    });
    doc.font('Bold').fontSize(10).fillColor(scoreColor)
       .text(String(score), left + colCode + colName, y + 6, { width: colScore, align: 'center' });
    doc.font('Reg').fontSize(9).fillColor('#4a5568')
       .text(`${(c.weight * 100).toFixed(0)}%`, left + colCode + colName + colScore, y + 7, { width: colWeight, align: 'center' });
    doc.font('Reg').fontSize(9).fillColor('#1a202c')
       .text(weighted.toFixed(1), left + colCode + colName + colScore + colWeight, y + 7, { width: colWeighted, align: 'center' });
    y += rowH;
  });

  // Total row
  doc.save().rect(left, y, totalW, 22).fill('#edf2f7').restore();
  doc.font('Bold').fontSize(9.5).fillColor('#1a202c')
     .text('TỔNG C_SCORE', left + 6, y + 7, { width: colCode + colName + colScore + colWeight - 6, align: 'right' });
  doc.font('Bold').fontSize(11).fillColor('#6366f1')
     .text(totalWeighted.toFixed(1), left + colCode + colName + colScore + colWeight, y + 6, { width: colWeighted, align: 'center' });
  y += 22;

  doc.y = y + 10;

  // Responses (only for criteria that have a non-empty response)
  const withResponses = CRITERIA.filter(c => scoreMap[c.code] && scoreMap[c.code].response && scoreMap[c.code].response.trim());
  if (withResponses.length > 0) {
    if (doc.y > doc.page.height - 200) doc.addPage();
    sectionTitle(doc, 'Câu trả lời của đại lý');
    withResponses.forEach(c => {
      const rec = scoreMap[c.code];
      doc.font('Bold').fontSize(9).fillColor('#4a5568').text(`${c.code} — ${c.name}`, { continued: false });
      doc.font('Reg').fontSize(9).fillColor('#1a202c').text(`"${rec.response}"`, { indent: 8 });
      doc.moveDown(0.4);
    });
  }
}

function renderPhotos(doc, dealerId, photos) {
  if (!photos || photos.length === 0) return;
  if (doc.y > doc.page.height - 240) doc.addPage();
  sectionTitle(doc, `Ảnh đại lý (${photos.length})`);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const totalW = right - left;
  const cols = 2;
  const gap = 10;
  const cellW = (totalW - gap * (cols - 1)) / cols;
  const cellH = cellW * 0.75; // 4:3 ratio

  let x = left, y = doc.y;
  photos.forEach((p, i) => {
    const filePath = path.join(UPLOAD_BASE, dealerId, p.filename);
    if (!fs.existsSync(filePath)) return;

    if (y + cellH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      x = left;
      y = doc.page.margins.top;
    }
    try {
      doc.image(filePath, x, y, { fit: [cellW, cellH], align: 'center', valign: 'center' });
      doc.lineWidth(0.5).strokeColor('#cbd5e0').rect(x, y, cellW, cellH).stroke();
    } catch (e) {
      // pdfkit only supports JPEG and PNG natively — webp will throw here.
      doc.font('Reg').fontSize(8).fillColor('#dc2626')
         .text(`(Không hỗ trợ ${p.mime_type || 'định dạng này'})`, x, y + cellH / 2 - 5, { width: cellW, align: 'center' });
    }
    const col = i % cols;
    if (col === cols - 1) {
      x = left;
      y += cellH + gap;
    } else {
      x += cellW + gap;
    }
  });
  doc.y = y + (photos.length % cols !== 0 ? cellH + gap : 0);
}

function sectionTitle(doc, text) {
  doc.moveDown(0.4);
  doc.font('Bold').fontSize(11).fillColor('#1a202c').text(text);
  const y = doc.y;
  doc.moveTo(doc.page.margins.left, y + 2)
     .lineTo(doc.page.width - doc.page.margins.right, y + 2)
     .lineWidth(1).strokeColor('#6366f1').stroke();
  doc.moveDown(0.4);
}

module.exports = router;
