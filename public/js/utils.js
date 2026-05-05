/**
 * Shared frontend utilities — escape helpers + photo gallery renderer.
 * Imported globally as `window.U`. Both form.js and dashboard.js were
 * defining their own escape helpers / gallery markup; this is the
 * single source of truth.
 */
window.U = (function () {

  // ---- HTML escaping ----
  // escHtml: for body text (between tags). Need to escape &, <, >.
  // escAttr: for attribute values. Need to escape & and the quote we used,
  //          plus < > for defense-in-depth (safe even if a string is later
  //          inserted somewhere expecting body text).
  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---- Photo gallery renderer ----
  //
  // Both the scoring form (Step 1) and the detail view need to render a grid
  // of photos. They differ only in two ways:
  //   1. The scoring form supports staged-but-not-uploaded photos ("Mới" tag).
  //   2. The delete/add handlers point to different controllers.
  //
  // Pass options:
  //   dealerId       -- string, used to build /uploads/:id/:filename URLs.
  //                     May be null/empty for new dealers (no existing photos).
  //   maxPhotos      -- number, photo cap.
  //   existing       -- array of {id, filename, original_name, ...} from API.
  //   pending        -- array of {file, previewUrl} for staged uploads. Optional.
  //   onDelete       -- onclick string for existing photos. Use `{ID}` as the
  //                     placeholder for the photo's DB id, e.g.:
  //                       "FormController.deleteExistingPhoto({ID})"
  //                       "DashboardController.deletePhoto('DL-0001', {ID})"
  //   onRemoveStaged -- onclick string for staged photos. Use `{IDX}` for the
  //                     index. Optional (only for forms supporting staging).
  //   onAdd          -- onchange string for the file input, no placeholder.
  //   helpText       -- optional small caption under the grid.
  function renderPhotoGrid(opts) {
    const {
      dealerId = '',
      maxPhotos = 5,
      existing = [],
      pending = [],
      onDelete = '',
      onRemoveStaged = '',
      onAdd = '',
      helpText = `JPG / PNG / WEBP, tối đa 5MB/ảnh, ${maxPhotos} ảnh/đại lý.`
    } = opts;

    const totalCount = existing.length + pending.length;
    const remaining = maxPhotos - totalCount;
    const idAttr = escAttr(dealerId);

    const existingHtml = existing.map(p => `
      <div class="photo-item">
        <img src="/uploads/${idAttr}/${escAttr(p.filename)}" alt="${escAttr(p.original_name)}" loading="lazy">
        <button type="button" class="photo-delete" title="Xoá ảnh"
                onclick="${onDelete.replace('{ID}', p.id)}">×</button>
      </div>
    `).join('');

    const pendingHtml = pending.map((p, idx) => `
      <div class="photo-item photo-staged">
        <img src="${escAttr(p.previewUrl)}" alt="">
        <button type="button" class="photo-delete" title="Bỏ chọn"
                onclick="${onRemoveStaged.replace('{IDX}', idx)}">×</button>
        <span class="photo-staged-tag">Mới</span>
      </div>
    `).join('');

    const addBtn = remaining > 0 && onAdd ? `
      <label class="photo-add-btn" title="Thêm ảnh (còn ${remaining})">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple
               onchange="${onAdd}">
        <span class="photo-add-icon">+</span>
        <span class="photo-add-label">Thêm ảnh</span>
      </label>
    ` : '';

    return {
      count: totalCount,
      max: maxPhotos,
      html: `
        <div class="photo-gallery">${existingHtml}${pendingHtml}${addBtn}</div>
        <p class="muted-note" style="margin-top:0.5rem">${escHtml(helpText)}</p>
      `
    };
  }

  return { escHtml, escAttr, renderPhotoGrid };
})();
