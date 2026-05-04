// Single source of truth for the 9 scoring criteria. Used by:
//   - PDF generation (routes/exports.js) for the score table
//   - The /api/criteria endpoint that hydrates the frontend on load
// The frontend keeps its own rich version (with rubrics + interview questions)
// in public/js/criteria.js — that file no longer needs to be in sync with the
// canonical metadata; only weights need to match (and weights are loaded from
// the DB via /api/settings/weights at runtime).
const CRITERIA = [
  { code: 'C1', name: 'Sở hữu khách hàng bền vững',          weight: 0.20, group: 1 },
  { code: 'C2', name: 'P&L độc lập + dòng tiền tự quản',     weight: 0.15, group: 1 },
  { code: 'C3', name: 'Quản lý đội thi công cơ hữu',         weight: 0.15, group: 1 },
  { code: 'C4', name: 'Trách nhiệm cuối (skin-in-the-game)', weight: 0.15, group: 1 },
  { code: 'C5', name: 'Động lực tham gia có nguồn gốc rõ',   weight: 0.10, group: 1 },
  { code: 'C6', name: 'Năng lực truyền thông & học hỏi',     weight: 0.10, group: 2 },
  { code: 'C7', name: 'Vị trí địa lý & thị trường',          weight: 0.08, group: 2 },
  { code: 'C8', name: 'Quan hệ ngành & uy tín',              weight: 0.04, group: 2 },
  { code: 'C9', name: 'Tài sản số / dữ liệu',                weight: 0.03, group: 2 }
];

module.exports = { CRITERIA };
