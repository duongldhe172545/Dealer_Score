const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const path = require('path');
const db = require('../lib/database');


/**
 * GET /api/export-excel
 * Export all dealers to Excel file
 */
router.get('/export-excel', async (req, res) => {
  try {
    const dealers = db.getAllDealers();
    const workbook = new ExcelJS.Workbook();

    // --- Sheet 1: Dealer Data ---
    const ws = workbook.addWorksheet('Dealers');

    // Headers
    ws.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã ĐL', key: 'dealer_id', width: 12 },
      { header: 'Tên ĐL', key: 'ten_dl', width: 20 },
      { header: 'Tên chủ ĐL', key: 'ten_chu', width: 18 },
      { header: 'SĐT', key: 'sdt', width: 15 },
      { header: 'Địa chỉ', key: 'dia_chi', width: 35 },
      { header: 'Loại ĐL', key: 'dealer_type', width: 18 },
      { header: 'Ngành hàng', key: 'category_stack', width: 18 },
      { header: 'Có đội lắp đặt', key: 'has_install_team', width: 15 },
      { header: 'Số thợ', key: 'est_team_size', width: 10 },
      { header: 'C1', key: 'c1', width: 6 },
      { header: 'C2', key: 'c2', width: 6 },
      { header: 'C3', key: 'c3', width: 6 },
      { header: 'C4', key: 'c4', width: 6 },
      { header: 'C5', key: 'c5', width: 6 },
      { header: 'C6', key: 'c6', width: 6 },
      { header: 'C7', key: 'c7', width: 6 },
      { header: 'C8', key: 'c8', width: 6 },
      { header: 'C9', key: 'c9', width: 6 },
      { header: 'C_Score', key: 'c_score', width: 10 },
      { header: 'Tier', key: 'dealer_tier', width: 18 },
      { header: 'Batch', key: 'pilot_batch', width: 12 },
      { header: 'Trạng thái', key: 'dealer_status', width: 12 },
      { header: 'Data %', key: 'data_completeness', width: 10 },
      { header: 'Ghi chú', key: 'note', width: 25 },
      { header: 'Ngày tạo', key: 'created_at', width: 18 },
      { header: 'Cập nhật', key: 'updated_at', width: 18 }
    ];

    // Style header
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF2D3748' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Data rows
    dealers.forEach((d, i) => {
      const scoreMap = {};
      (d.scores || []).forEach(s => { scoreMap[s.criterion_code] = s.score; });

      ws.addRow({
        stt: i + 1,
        dealer_id: d.dealer_id,
        ten_dl: d.ten_dl,
        ten_chu: d.ten_chu,
        sdt: d.sdt,
        dia_chi: d.dia_chi,
        dealer_type: d.dealer_type,
        category_stack: d.category_stack,
        has_install_team: d.has_install_team ? 'Có' : 'Không',
        est_team_size: d.est_team_size,
        c1: scoreMap['C1'] ?? '',
        c2: scoreMap['C2'] ?? '',
        c3: scoreMap['C3'] ?? '',
        c4: scoreMap['C4'] ?? '',
        c5: scoreMap['C5'] ?? '',
        c6: scoreMap['C6'] ?? '',
        c7: scoreMap['C7'] ?? '',
        c8: scoreMap['C8'] ?? '',
        c9: scoreMap['C9'] ?? '',
        c_score: d.c_score,
        dealer_tier: d.dealer_tier,
        pilot_batch: d.pilot_batch,
        dealer_status: d.dealer_status,
        data_completeness: d.data_completeness ? `${d.data_completeness}%` : '',
        note: d.note,
        created_at: d.created_at,
        updated_at: d.updated_at
      });
    });

    // Auto-filter
    ws.autoFilter = { from: 'A1', to: `AA${dealers.length + 1}` };

    // --- Sheet 2: Scoring Responses ---
    const ws2 = workbook.addWorksheet('Responses');
    
    // Create columns: Mã ĐL | Tên ĐL | C1 Điểm | C1 Trả lời | C2 Điểm | C2 Trả lời | ...
    const respCols = [
      { header: 'Mã ĐL', key: 'dealer_id', width: 12 },
      { header: 'Tên ĐL', key: 'ten_dl', width: 20 }
    ];
    for (let i = 1; i <= 9; i++) {
      respCols.push({ header: `C${i} Điểm`, key: `c${i}_score`, width: 8 });
      respCols.push({ header: `C${i} Trả lời`, key: `c${i}_resp`, width: 40 });
    }
    ws2.columns = respCols;

    const headerRow2 = ws2.getRow(1);
    headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow2.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF2D3748' }
    };
    headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };

    dealers.forEach(d => {
      const rowData = { dealer_id: d.dealer_id, ten_dl: d.ten_dl };
      (d.scores || []).forEach(s => {
        const cCode = s.criterion_code.toLowerCase(); // c1, c2..
        rowData[`${cCode}_score`] = s.score;
        rowData[`${cCode}_resp`] = s.response;
      });
      ws2.addRow(rowData);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Format: ChamDiem_DaiLy_2026-04-16_173015.xlsx
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `ChamDiem_DaiLy_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sync-sharepoint
 * Sync dealer(s) to Power Automate webhook
 */
router.post('/sync-sharepoint', async (req, res) => {
  try {
    const webhookUrl = process.env.POWER_AUTOMATE_URL;
    if (!webhookUrl) throw new Error('Chưa cấu hình POWER_AUTOMATE_URL trong file .env');

    const { dealer_id, type } = req.body;
    let targetDealers = [];

    if (type === 'all') {
       targetDealers = db.getAllDealers();
    } else if (dealer_id) {
       const d = db.getDealerById(dealer_id);
       if (d) targetDealers.push(d);
    } else {
       throw new Error('Thiếu tham số dealer_id hoặc type=all');
    }

    if (targetDealers.length === 0) {
      return res.json({ success: true, message: 'Không có dữ liệu cần đồng bộ' });
    }

    const payload = targetDealers.map(d => {
       const p = {
           dealer_id: d.dealer_id,
           ten_dl: d.ten_dl,
           ten_chu: d.ten_chu,
           sdt: d.sdt,
           dia_chi: d.dia_chi,
           dealer_type: d.dealer_type,
           category_stack: d.category_stack,
           has_install_team: d.has_install_team ? 'Yes' : 'No',
           est_team_size: d.est_team_size,
           c_score: d.c_score,
           dealer_tier: d.dealer_tier,
           pilot_batch: d.pilot_batch,
           note: d.note
       };
       (d.scores || []).forEach(s => {
          const cCode = s.criterion_code.toLowerCase();
          p[`${cCode}_score`] = s.score;
          p[`${cCode}_response`] = s.response;
       });
       return p;
    });

    const bodyData = (payload.length === 1 && !type) ? payload[0] : payload;

    const fetchResult = await fetch(webhookUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(bodyData)
    });

    if (!fetchResult.ok) {
       throw new Error(`Flow HTTP Status: ${fetchResult.status}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('SharePoint Sync Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
