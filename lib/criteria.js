// Single source of truth for the 9 scoring criteria.
// Names + weights match the spec sheet "Tiêu chí phân loại Dealer.xlsx".
// Used by:
//   - PDF generation (routes/exports.js) for the score table
//   - The /api/criteria endpoint that hydrates the frontend on load
// The rubric/interview-question rich version still lives in
// public/js/criteria.js for the form UI; names here MUST match that file.
const CRITERIA = [
  { code: 'C1', name: 'Sở hữu khách hàng bền vững',                    weight: 0.20, group: 1 },
  { code: 'C2', name: 'P&L độc lập + dòng tiền tự quản',               weight: 0.15, group: 1 },
  { code: 'C3', name: 'Quản lý đội thi công cơ hữu',                   weight: 0.15, group: 1 },
  { code: 'C4', name: 'Trách nhiệm cuối (skin-in-the-game)',           weight: 0.15, group: 1 },
  { code: 'C5', name: 'Động lực tham gia có nguồn gốc rõ',             weight: 0.10, group: 1 },
  { code: 'C6', name: 'Kiểm soát địa bàn vật lý',                      weight: 0.10, group: 2 },
  { code: 'C7', name: 'Kỷ luật dữ liệu (tạo evidence)',                weight: 0.08, group: 2 },
  { code: 'C8', name: 'Kiểm soát chuỗi cung ứng ngược (S_ID)',         weight: 0.04, group: 2 },
  { code: 'C9', name: 'Sức ảnh hưởng cộng đồng (network multiplier)',  weight: 0.03, group: 2 }
];

module.exports = { CRITERIA };
