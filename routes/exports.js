const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const db = require('../lib/database');
const { CRITERIA } = require('../lib/criteria');
const { dealerIdParam } = require('../lib/security');

const router = express.Router();

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_REG = path.join(FONT_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Roboto-Bold.ttf');
const UPLOAD_BASE = path.join(__dirname, '..', 'data', 'uploads');

// =====================================================================
// POST /api/exports/excel
// Body: { ids?: string[] }   — empty/missing = export all dealers
// =====================================================================
router.post('/excel', async (req, res) => {
  try {
    const { ids } = req.body || {};
    let dealers = db.getAllDealers();
    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids);
      dealers = dealers.filter(d => idSet.has(d.dealer_id));
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Dealers');
    ws.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã ĐL', key: 'dealer_id', width: 12 },
      { header: 'Tên ĐL', key: 'ten_dl', width: 20 },
      { header: 'Tên chủ ĐL', key: 'ten_chu', width: 18 },
      { header: 'SĐT', key: 'sdt', width: 15 },
      { header: 'Địa chỉ', key: 'dia_chi', width: 35 },
      { header: 'Mã địa danh', key: 'area_code', width: 16 },
      { header: 'Loại ĐL', key: 'dealer_type', width: 18 },
      { header: 'Ngành hàng', key: 'category_stack', width: 18 },
      { header: 'Có đội lắp đặt', key: 'has_install_team', width: 15 },
      { header: 'Số thợ', key: 'est_team_size', width: 10 },
      ...CRITERIA.map(c => ({ header: c.code, key: c.code.toLowerCase(), width: 6 })),
      { header: 'C_Score', key: 'c_score', width: 10 },
      { header: 'Tier', key: 'dealer_tier', width: 18 },
      { header: 'Batch', key: 'pilot_batch', width: 12 },
      { header: 'Trạng thái', key: 'dealer_status', width: 12 },
      { header: 'Data %', key: 'data_completeness', width: 10 },
      { header: 'Ghi chú', key: 'note', width: 25 },
      { header: 'Ngày tạo', key: 'created_at', width: 18 },
      { header: 'Cập nhật', key: 'updated_at', width: 18 }
    ];
    styleHeaderRow(ws.getRow(1));

    dealers.forEach((d, i) => {
      const scoreMap = {};
      (d.scores || []).forEach(s => { scoreMap[s.criterion_code] = s.score; });
      const row = {
        stt: i + 1,
        dealer_id: d.dealer_id,
        ten_dl: d.ten_dl,
        ten_chu: d.ten_chu,
        sdt: d.sdt,
        dia_chi: d.dia_chi,
        area_code: d.area_code,
        dealer_type: d.dealer_type,
        category_stack: d.category_stack,
        has_install_team: d.has_install_team ? 'Có' : 'Không',
        est_team_size: d.est_team_size,
        c_score: d.c_score,
        dealer_tier: d.dealer_tier,
        pilot_batch: d.pilot_batch,
        dealer_status: d.dealer_status,
        data_completeness: d.data_completeness ? `${d.data_completeness}%` : '',
        note: d.note,
        created_at: d.created_at,
        updated_at: d.updated_at
      };
      CRITERIA.forEach(c => { row[c.code.toLowerCase()] = scoreMap[c.code] ?? ''; });
      ws.addRow(row);
    });
    ws.autoFilter = { from: 'A1', to: { row: dealers.length + 1, column: ws.columns.length } };

    const ws2 = workbook.addWorksheet('Responses');
    const respCols = [
      { header: 'Mã ĐL', key: 'dealer_id', width: 12 },
      { header: 'Tên ĐL', key: 'ten_dl', width: 20 }
    ];
    CRITERIA.forEach(c => {
      respCols.push({ header: `${c.code} Điểm`,    key: `${c.code.toLowerCase()}_score`, width: 8 });
      respCols.push({ header: `${c.code} Trả lời`, key: `${c.code.toLowerCase()}_resp`,  width: 40 });
    });
    ws2.columns = respCols;
    styleHeaderRow(ws2.getRow(1));

    dealers.forEach(d => {
      const rowData = { dealer_id: d.dealer_id, ten_dl: d.ten_dl };
      (d.scores || []).forEach(s => {
        const k = s.criterion_code.toLowerCase();
        rowData[`${k}_score`] = s.score;
        rowData[`${k}_resp`] = s.response;
      });
      ws2.addRow(rowData);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `ChamDiem_DaiLy_${formatTimestamp(new Date())}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================================
// POST /api/exports/pdf
// Body: { ids?: string[] } — multi-dealer tabular PDF (matches dashboard
// columns; no per-criterion scores or photos). Empty ids = export all.
// =====================================================================
router.post('/pdf', async (req, res) => {
  try {
    const { ids } = req.body || {};
    let dealers = db.getAllDealers();
    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids);
      dealers = dealers.filter(d => idSet.has(d.dealer_id));
    }

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 36, bottom: 36, left: 28, right: 28 },
      info: { Title: 'Danh sách đại lý', Author: 'ADG Dealer Scoring Tool' }
    });
    doc.registerFont('Reg', FONT_REG);
    doc.registerFont('Bold', FONT_BOLD);
    doc.font('Reg');

    const filename = `DealerScoring_${formatTimestamp(new Date())}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    pdfListTitle(doc, dealers.length);
    pdfDealerListTable(doc, dealers);

    doc.end();
  } catch (err) {
    console.error('PDF list export error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    else res.end();
  }
});

// =====================================================================
// POST /api/exports/dealers/:id/pdf — single-dealer PDF (full detail
// with C1–C9 breakdown, responses, and photos). Used by the detail page.
// =====================================================================
router.param('id', dealerIdParam);

router.post('/dealers/:id/pdf', async (req, res) => {
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

    const filename = `Dealer_${dealer.dealer_id}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    pdfHeader(doc, dealer);
    pdfInfoGrid(doc, dealer);
    pdfScoreTable(doc, scoreMap);
    pdfPhotos(doc, dealer.dealer_id, photos);

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

function styleHeaderRow(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
}

function formatTimestamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function pdfHeader(doc, d) {
  doc.font('Bold').fontSize(18).fillColor('#1a202c').text('HỒ SƠ ĐẠI LÝ', { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Bold').fontSize(14).fillColor('#2d3748').text(d.ten_dl || '-', { align: 'center' });
  doc.font('Reg').fontSize(10).fillColor('#718096').text(`Mã: ${d.dealer_id}`, { align: 'center' });
  doc.moveDown(0.6);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const w = right - left;
  const colW = w / 3;
  const y = doc.y;
  pdfMetric(doc, left,            y, colW, 'C_SCORE',     `${d.c_score ?? '-'}`,  '#6366f1');
  pdfMetric(doc, left + colW,     y, colW, 'TIER',        d.dealer_tier || '-',   '#10b981');
  pdfMetric(doc, left + colW * 2, y, colW, 'PILOT BATCH', d.pilot_batch || '-',   '#f59e0b');
  doc.y = y + 56;
  doc.moveDown(0.4);
}

function pdfMetric(doc, x, y, w, label, value, color) {
  doc.save();
  doc.roundedRect(x + 6, y, w - 12, 50, 6).lineWidth(1).strokeColor('#e2e8f0').stroke();
  doc.font('Reg').fontSize(8).fillColor('#718096')
     .text(label, x + 6, y + 8, { width: w - 12, align: 'center' });
  doc.font('Bold').fontSize(14).fillColor(color)
     .text(value, x + 6, y + 22, { width: w - 12, align: 'center' });
  doc.restore();
}

function pdfInfoGrid(doc, d) {
  pdfSectionTitle(doc, 'Thông tin chung');
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

function pdfScoreTable(doc, scoreMap) {
  pdfSectionTitle(doc, 'Chi tiết chấm điểm');
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const totalW = right - left;
  const colCode = 40, colScore = 50, colWeight = 60, colWeighted = 70;
  const colName = totalW - colCode - colScore - colWeight - colWeighted;

  let y = doc.y;
  doc.save().rect(left, y, totalW, 22).fill('#2d3748').restore();
  doc.font('Bold').fontSize(9).fillColor('#fff');
  doc.text('Mã',       left + 6,                                          y + 7, { width: colCode - 6 });
  doc.text('Tiêu chí', left + colCode + 4,                                y + 7, { width: colName - 4 });
  doc.text('Điểm',     left + colCode + colName,                          y + 7, { width: colScore, align: 'center' });
  doc.text('Trọng số', left + colCode + colName + colScore,               y + 7, { width: colWeight, align: 'center' });
  doc.text('= Quy đổi', left + colCode + colName + colScore + colWeight,  y + 7, { width: colWeighted, align: 'center' });
  y += 22;

  let totalWeighted = 0;
  CRITERIA.forEach((c, i) => {
    const rec = scoreMap[c.code];
    const score = rec ? rec.score : 0;
    const weighted = score * c.weight * 50;
    totalWeighted += weighted;
    const rowH = 22;

    if (i % 2 === 0) doc.save().rect(left, y, totalW, rowH).fill('#f7fafc').restore();
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

  doc.save().rect(left, y, totalW, 22).fill('#edf2f7').restore();
  doc.font('Bold').fontSize(9.5).fillColor('#1a202c')
     .text('TỔNG C_SCORE', left + 6, y + 7, { width: colCode + colName + colScore + colWeight - 6, align: 'right' });
  doc.font('Bold').fontSize(11).fillColor('#6366f1')
     .text(totalWeighted.toFixed(1), left + colCode + colName + colScore + colWeight, y + 6, { width: colWeighted, align: 'center' });
  y += 22;
  doc.y = y + 10;

  const withResponses = CRITERIA.filter(c => scoreMap[c.code] && scoreMap[c.code].response && scoreMap[c.code].response.trim());
  if (withResponses.length > 0) {
    if (doc.y > doc.page.height - 200) doc.addPage();
    pdfSectionTitle(doc, 'Câu trả lời của đại lý');
    withResponses.forEach(c => {
      const rec = scoreMap[c.code];
      doc.font('Bold').fontSize(9).fillColor('#4a5568').text(`${c.code} — ${c.name}`);
      doc.font('Reg').fontSize(9).fillColor('#1a202c').text(`"${rec.response}"`, { indent: 8 });
      doc.moveDown(0.4);
    });
  }
}

function pdfPhotos(doc, dealerId, photos) {
  if (!photos || photos.length === 0) return;
  if (doc.y > doc.page.height - 240) doc.addPage();
  pdfSectionTitle(doc, `Ảnh đại lý (${photos.length})`);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const totalW = right - left;
  const cols = 2;
  const gap = 10;
  const cellW = (totalW - gap * (cols - 1)) / cols;
  const cellH = cellW * 0.75;

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
    } catch (_) {
      doc.font('Reg').fontSize(8).fillColor('#dc2626')
         .text(`(Không hỗ trợ ${p.mime_type || 'định dạng này'})`, x, y + cellH / 2 - 5, { width: cellW, align: 'center' });
    }
    const col = i % cols;
    if (col === cols - 1) { x = left; y += cellH + gap; }
    else x += cellW + gap;
  });
  doc.y = y + (photos.length % cols !== 0 ? cellH + gap : 0);
}

function pdfSectionTitle(doc, text) {
  doc.moveDown(0.4);
  doc.font('Bold').fontSize(11).fillColor('#1a202c').text(text);
  const y = doc.y;
  doc.moveTo(doc.page.margins.left, y + 2)
     .lineTo(doc.page.width - doc.page.margins.right, y + 2)
     .lineWidth(1).strokeColor('#6366f1').stroke();
  doc.moveDown(0.4);
}

// ----- list (tabular, multi-dealer) PDF helpers -----

const LIST_FONT_SIZE = 7.5;
const LIST_PAD_X = 4;
const LIST_PAD_Y = 5;
const LIST_LINE_GAP = 1;

// Column widths sum to 786pt — matches the usable A4-landscape page width
// after 28pt left+right margins (842 - 56). "Đội lắp đặt" and "Số thợ" are
// merged into a single column ("Có (N thợ)" / "Không") to leave more room
// for free-text columns; row and header heights grow dynamically so nothing
// gets clipped.
const LIST_COLS = [
  { label: 'STT',         width: 22, get: (d, i) => String(i + 1) },
  { label: 'Mã ĐL',       width: 48, get: d => d.dealer_id },
  { label: 'Tên ĐL',      width: 70, get: d => d.ten_dl },
  { label: 'Chủ ĐL',      width: 50, get: d => d.ten_chu },
  { label: 'SĐT',         width: 55, get: d => d.sdt },
  { label: 'Địa chỉ',     width: 83, get: d => d.dia_chi },
  { label: 'Mã địa danh', width: 50, get: d => d.area_code },
  { label: 'Tier',        width: 55, get: d => d.dealer_tier },
  { label: 'Loại ĐL',     width: 50, get: d => d.dealer_type },
  { label: 'Trạng thái',  width: 45, get: d => d.dealer_status },
  { label: 'Ngành hàng',  width: 50, get: d => d.category_stack },
  { label: 'Đội lắp đặt', width: 50, get: d => d.has_install_team ? `Có (${d.est_team_size || 0} thợ)` : 'Không' },
  { label: 'C_Score',     width: 42, get: d => String(d.c_score ?? '-') },
  { label: 'Batch',       width: 42, get: d => d.pilot_batch },
  { label: 'Data %',      width: 36, get: d => d.data_completeness != null ? `${d.data_completeness}%` : '-' },
  { label: 'Ghi chú',     width: 38, get: d => d.note }
];

function pdfListTitle(doc, count) {
  doc.font('Bold').fontSize(16).fillColor('#1a202c').text('DANH SÁCH ĐẠI LÝ', { align: 'center' });
  const stamp = new Date().toLocaleString('vi-VN');
  doc.font('Reg').fontSize(9).fillColor('#718096')
     .text(`${count} đại lý — Xuất ngày ${stamp}`, { align: 'center' });
  doc.moveDown(0.6);
}

// Returns the height needed to render the longest cell in this row at full
// width. Used for both data rows and the header row (just call with a getter
// that returns the column label).
function measureRowHeight(doc, cols, getter, font) {
  doc.font(font).fontSize(LIST_FONT_SIZE);
  let max = LIST_FONT_SIZE; // single-line baseline
  for (const col of cols) {
    const text = String(getter(col) || '-');
    const h = doc.heightOfString(text, {
      width: col.width - LIST_PAD_X * 2,
      lineGap: LIST_LINE_GAP
    });
    if (h > max) max = h;
  }
  return Math.ceil(max + LIST_PAD_Y * 2);
}

function drawCell(doc, x, y, w, h, text, font, color) {
  doc.font(font).fontSize(LIST_FONT_SIZE).fillColor(color);
  doc.text(String(text || '-'), x + LIST_PAD_X, y + LIST_PAD_Y, {
    width: w - LIST_PAD_X * 2,
    height: h - LIST_PAD_Y * 2,
    lineGap: LIST_LINE_GAP
  });
}

function drawListHeader(doc, x, y, totalW, headerH) {
  doc.save().rect(x, y, totalW, headerH).fill('#2d3748').restore();
  let cx = x;
  for (const col of LIST_COLS) {
    drawCell(doc, cx, y, col.width, headerH, col.label, 'Bold', '#ffffff');
    cx += col.width;
  }
}

function drawListRow(doc, x, y, cols, dealer, idx, rowH) {
  if (idx % 2 === 1) {
    const totalW = cols.reduce((s, c) => s + c.width, 0);
    doc.save().rect(x, y, totalW, rowH).fill('#f7fafc').restore();
  }
  let cx = x;
  for (const col of cols) {
    drawCell(doc, cx, y, col.width, rowH, col.get(dealer, idx), 'Reg', '#1a202c');
    cx += col.width;
  }
}

function pdfDealerListTable(doc, dealers) {
  const x = doc.page.margins.left;
  const totalW = LIST_COLS.reduce((s, c) => s + c.width, 0);
  const maxY = doc.page.height - doc.page.margins.bottom;

  const headerH = measureRowHeight(doc, LIST_COLS, (col) => col.label, 'Bold');

  drawListHeader(doc, x, doc.y, totalW, headerH);
  let y = doc.y + headerH;

  for (let i = 0; i < dealers.length; i++) {
    const dealer = dealers[i];
    const rowH = measureRowHeight(doc, LIST_COLS, (col) => col.get(dealer, i), 'Reg');

    if (y + rowH > maxY) {
      doc.addPage();
      y = doc.page.margins.top;
      drawListHeader(doc, x, y, totalW, headerH);
      y += headerH;
    }
    drawListRow(doc, x, y, LIST_COLS, dealer, i, rowH);
    y += rowH;
  }

  doc.y = y;
}

module.exports = router;
