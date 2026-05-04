/**
 * Dashboard Controller — dealer list, stats, filters, detail view rendering.
 *
 * Navigation goes through window.App.navigate (History API). DashboardController
 * is the data + render layer; routing is in app.js.
 */
window.DashboardController = {
  dealers: [],
  selectedIds: new Set(),
  filteredIds: [],
  MAX_PHOTOS_PER_DEALER: 5,

  init() {
    this.setupFilters();
    this.setupActions();
    this.loadDealers();
  },

  // ==================== INIT ====================

  setupFilters() {
    ['search-input', 'search-column', 'sort-score', 'filter-tier', 'filter-batch']
      .forEach(id => document.getElementById(id).addEventListener('input', () => this.renderTable()));
  },

  setupActions() {
    document.getElementById('btn-start-scoring').addEventListener('click', () => {
      window.App.navigate('/scoring');
    });

    document.getElementById('select-all-dealers').addEventListener('change', (e) => {
      if (e.target.checked) this.filteredIds.forEach(id => this.selectedIds.add(id));
      else this.filteredIds.forEach(id => this.selectedIds.delete(id));
      this.renderTable();
    });

    document.getElementById('btn-export-excel').addEventListener('click', () => {
      const ids = this.getExportIds();
      const label = this.selectedIds.size > 0
        ? `${ids.length} đại lý đã chọn`
        : (ids.length < this.dealers.length ? `${ids.length} đại lý đang lọc` : 'tất cả đại lý');
      window.App.toast(`📥 Đang tạo Excel cho ${label}...`, 'info');
      const filename = `DealerScoring_${new Date().toISOString().slice(0, 10)}.xlsx`;
      window.API.download('/api/exports/excel', { ids }, filename)
        .then(() => window.App.toast('✅ Đã tải xuống file Excel', 'success'))
        .catch(err => window.App.toast(`❌ ${err.message}`, 'error'));
    });
  },

  // Returns the dealer_ids that should go to an export. Priority:
  //   explicit selection > currently filtered view > nothing (all)
  getExportIds() {
    if (this.selectedIds.size > 0) {
      const valid = new Set(this.dealers.map(d => d.dealer_id));
      return [...this.selectedIds].filter(id => valid.has(id));
    }
    return [...this.filteredIds];
  },

  // ==================== DATA ====================

  async loadDealers() {
    try {
      const [dealersRes, statsRes] = await Promise.all([
        window.API.get('/api/dealers'),
        window.API.get('/api/dealers/stats')
      ]);
      if (dealersRes.success) {
        this.dealers = dealersRes.data;
        this.renderTable();
      }
      if (statsRes.success) this.renderStats(statsRes.data);
    } catch (err) {
      console.error('Load dealers error:', err);
    }
  },

  renderStats(stats) {
    document.querySelector('#stat-total .stat-value').textContent = stats.total;
    document.querySelector('#stat-tier-a .stat-value').textContent = stats.tierA;
    document.querySelector('#stat-tier-b .stat-value').textContent = stats.tierB;
    document.querySelector('#stat-tier-c .stat-value').textContent = stats.tierC;
    document.querySelector('#stat-tier-d .stat-value').textContent = stats.tierD;
  },

  // ==================== TABLE ====================

  renderTable() {
    const filtered = this.applyFilters(this.dealers);
    const tbody = document.getElementById('dealer-tbody');
    const emptyState = document.getElementById('empty-state');
    const tableEl = document.getElementById('dealer-table');

    if (filtered.length === 0 && this.dealers.length === 0) {
      tableEl.style.display = 'none';
      emptyState.classList.add('show');
      return;
    }
    tableEl.style.display = '';
    emptyState.classList.remove('show');

    this.filteredIds = filtered.map(d => d.dealer_id);
    tbody.innerHTML = filtered.map((d, idx) => this.renderRow(d, idx)).join('');

    tbody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) this.selectedIds.add(id);
        else this.selectedIds.delete(id);
        this.updateSelectAllState();
      });
    });
    this.updateSelectAllState();
  },

  applyFilters(dealers) {
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const searchCol = document.getElementById('search-column').value;
    const sortScore = document.getElementById('sort-score').value;
    const tierFilter = document.getElementById('filter-tier').value;
    const batchFilter = document.getElementById('filter-batch').value;

    let filtered = dealers;
    if (searchText) {
      filtered = filtered.filter(d => {
        if (searchCol === 'all') {
          return (d.ten_dl || '').toLowerCase().includes(searchText) ||
                 (d.dealer_id || '').toLowerCase().includes(searchText) ||
                 (d.sdt || '').includes(searchText) ||
                 (d.ten_chu || '').toLowerCase().includes(searchText) ||
                 (d.dia_chi || '').toLowerCase().includes(searchText);
        }
        return (d[searchCol] || '').toLowerCase().includes(searchText);
      });
    }
    if (tierFilter) filtered = filtered.filter(d => d.dealer_tier === tierFilter);
    if (batchFilter) filtered = filtered.filter(d => d.pilot_batch === batchFilter);
    if (sortScore === 'desc') filtered = [...filtered].sort((a, b) => (b.c_score || 0) - (a.c_score || 0));
    else if (sortScore === 'asc') filtered = [...filtered].sort((a, b) => (a.c_score || 0) - (b.c_score || 0));
    return filtered;
  },

  renderRow(d, idx) {
    const tierClass = window.ScoringEngine.getTierClass(d.dealer_tier || '');
    const installTeam = d.has_install_team
      ? '<span class="cell-yes">Có</span>'
      : '<span class="cell-no">Không</span>';
    const teamSize = d.has_install_team ? (d.est_team_size || 0) : '-';
    const dataPct = d.data_completeness != null ? `${d.data_completeness}%` : '-';
    const updatedShort = (d.updated_at || '').slice(0, 16);
    const checked = this.selectedIds.has(d.dealer_id) ? 'checked' : '';
    const id = ea(d.dealer_id);

    return `
      <tr data-id="${id}">
        <td class="col-checkbox"><input type="checkbox" class="row-checkbox" data-id="${id}" ${checked}></td>
        <td class="col-stt">${idx + 1}</td>
        <td class="col-id"><strong>${eh(d.dealer_id)}</strong></td>
        <td class="col-name">${eh(d.ten_dl)}</td>
        <td class="col-owner">${eh(d.ten_chu)}</td>
        <td class="col-phone cell-nowrap">${eh(d.sdt)}</td>
        <td class="col-address" title="${ea(d.dia_chi)}">${eh(d.dia_chi)}</td>
        <td class="col-area">${eh(d.area_code) || '-'}</td>
        <td class="col-tier"><span class="tier-badge ${tierClass}">${eh(d.dealer_tier) || '-'}</span></td>
        <td class="col-type">${eh(d.dealer_type) || '-'}</td>
        <td class="col-status"><span class="status-badge">${eh(d.dealer_status) || '-'}</span></td>
        <td class="col-category">${eh(d.category_stack) || '-'}</td>
        <td class="col-install cell-center">${installTeam}</td>
        <td class="col-team cell-center">${teamSize}</td>
        <td class="col-cscore cell-center"><strong>${d.c_score || 0}</strong></td>
        <td class="col-batch"><span class="batch-badge">${eh(d.pilot_batch) || '-'}</span></td>
        <td class="col-data cell-center">${dataPct}</td>
        <td class="col-updated cell-nowrap" title="${ea(d.updated_at)}">${eh(updatedShort) || '-'}</td>
        <td class="col-note" title="${ea(d.note)}">${eh(d.note) || '-'}</td>
        <td class="col-actions">
          <div class="actions-cell">
            <button class="action-btn" onclick="App.navigate('/dealer/${id}')" title="Xem chi tiết">👁</button>
            <button class="action-btn" onclick="App.navigate('/dealer/${id}/edit')" title="Sửa">✏️</button>
            <button class="action-btn" onclick="DashboardController.exportPdf('${id}')" title="Xuất PDF">📄</button>
            <button class="action-btn delete" onclick="DashboardController.deleteDealer('${id}')" title="Xóa">🗑</button>
          </div>
        </td>
      </tr>
    `;
  },

  updateSelectAllState() {
    const cb = document.getElementById('select-all-dealers');
    if (!cb) return;
    if (this.filteredIds.length === 0) {
      cb.checked = false;
      cb.indeterminate = false;
      return;
    }
    const allChecked = this.filteredIds.every(id => this.selectedIds.has(id));
    const someChecked = this.filteredIds.some(id => this.selectedIds.has(id));
    cb.checked = allChecked;
    cb.indeterminate = !allChecked && someChecked;
  },

  // ==================== DETAIL VIEW ====================

  // Loads + renders the detail view. Called by App.routeViewDealer; that
  // route handler is responsible for switching to the detail view. This
  // function only fills #detail-content.
  async viewDealer(dealerId) {
    try {
      const [result, photosRes] = await Promise.all([
        window.API.get(`/api/dealers/${dealerId}`),
        window.API.get(`/api/dealers/${dealerId}/photos`)
      ]);
      if (!result.success) throw new Error(result.error);
      const d = result.data;
      const photos = (photosRes && photosRes.success) ? photosRes.data : [];
      const scoreMap = {};
      (d.scores || []).forEach(s => { scoreMap[s.criterion_code] = s; });

      document.getElementById('detail-content').innerHTML = `
        ${this.renderDetailHeader(d)}
        ${this.renderDetailInfoGrid(d)}
        <h3 class="section-title">📊 Chi tiết chấm điểm</h3>
        ${this.renderScoreBreakdown(scoreMap)}
        ${this.renderResponsesSection(scoreMap)}
        <div id="photos-section" data-dealer-id="${ea(d.dealer_id)}">
          ${this.renderPhotosSection(d.dealer_id, photos)}
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="App.navigate('/')">← Quay lại</button>
          <button class="btn btn-outline" onclick="DashboardController.exportPdf('${ea(d.dealer_id)}')">📄 Xuất PDF</button>
          <button class="btn btn-primary" onclick="App.navigate('/dealer/${ea(d.dealer_id)}/edit')">✏️ Sửa</button>
        </div>
      `;
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  },

  renderDetailHeader(d) {
    const tierClass = window.ScoringEngine.getTierClass(d.dealer_tier || '');
    return `
      <div class="detail-header">
        <div>
          <h2>${eh(d.ten_dl)} <span class="detail-id-suffix">(${eh(d.dealer_id)})</span></h2>
        </div>
        <div class="detail-meta">
          <span class="tier-badge ${tierClass} tier-badge-lg">${eh(d.dealer_tier)}</span>
          <span class="batch-badge batch-badge-lg">${eh(d.pilot_batch)}</span>
          <span class="detail-cscore">${d.c_score}</span>
        </div>
      </div>
    `;
  },

  renderDetailInfoGrid(d) {
    const fields = [
      ['Chủ ĐL',         eh(d.ten_chu)],
      ['SĐT',            eh(d.sdt)],
      ['Loại ĐL',        eh(d.dealer_type)],
      ['Địa chỉ',        eh(d.dia_chi)],
      ['Mã địa danh',    eh(d.area_code)],
      ['Ngành hàng',     eh(d.category_stack)],
      ['Đội lắp đặt',    d.has_install_team ? `Có (${d.est_team_size || 0} thợ)` : 'Không'],
      ['Data hoàn thiện', `${d.data_completeness || 0}%`],
      ['Trạng thái',     eh(d.dealer_status)],
      ['Ngày tạo',       eh(d.created_at)],
      ['Cập nhật lúc',   eh(d.updated_at)]
    ];
    return `
      <div class="detail-info-grid">
        ${fields.map(([label, value]) => `
          <div class="detail-field">
            <span class="detail-field-label">${label}</span>
            <span class="detail-field-value">${value || '-'}</span>
          </div>
        `).join('')}
        <div class="detail-field detail-field-full">
          <span class="detail-field-label">Ghi chú</span>
          <span class="detail-field-value">${eh(d.note) || '-'}</span>
        </div>
      </div>
    `;
  },

  renderScoreBreakdown(scoreMap) {
    return `
      <div class="score-breakdown">
        ${window.CRITERIA.map(c => {
          const s = scoreMap[c.code];
          const score = s ? s.score : 0;
          const weighted = (score * c.weight * 50).toFixed(1);
          return `
            <div class="breakdown-row breakdown-row-detail">
              <span class="breakdown-code">${c.code}</span>
              <span class="breakdown-name">${eh(c.name)}</span>
              <span class="breakdown-score s${score}">${score}</span>
              <span class="breakdown-weighted">= ${weighted}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderResponsesSection(scoreMap) {
    const withResp = window.CRITERIA.filter(c => {
      const s = scoreMap[c.code];
      return s && s.response && s.response.trim();
    });
    if (withResp.length === 0) {
      return `
        <h3 class="section-title">💬 Câu trả lời chi tiết</h3>
        <p class="muted-note">Đại lý chưa có câu trả lời nào được ghi lại.</p>
      `;
    }
    return `
      <h3 class="section-title">
        💬 Câu trả lời chi tiết <span class="photo-count">${withResp.length}/9</span>
      </h3>
      <div class="responses-list">
        ${withResp.map(c => {
          const s = scoreMap[c.code];
          return `
            <div class="response-item">
              <div class="response-header">
                <span class="response-code">${c.code}</span>
                <span class="response-name">${eh(c.name)}</span>
                <span class="breakdown-score s${s.score}">${s.score}đ</span>
              </div>
              <blockquote class="response-text">${eh(s.response)}</blockquote>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // ==================== ACTIONS ====================

  async deleteDealer(dealerId) {
    if (!confirm(`Xác nhận xóa dealer ${dealerId}?`)) return;
    try {
      const result = await window.API.del(`/api/dealers/${dealerId}`);
      if (!result.success) throw new Error(result.error);
      window.App.toast('🗑 Đã xóa', 'success');
      this.selectedIds.delete(dealerId);
      this.loadDealers();
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  },

  async exportPdf(dealerId) {
    window.App.toast(`📄 Đang tạo PDF cho ${dealerId}...`, 'info');
    const filename = `Dealer_${dealerId}_${new Date().toISOString().slice(0, 10)}.pdf`;
    try {
      await window.API.download(`/api/exports/dealers/${dealerId}/pdf`, {}, filename);
      window.App.toast('✅ Đã tải PDF', 'success');
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  },

  // ==================== PHOTOS ====================

  renderPhotosSection(dealerId, photos) {
    const count = photos.length;
    const remaining = this.MAX_PHOTOS_PER_DEALER - count;
    const items = photos.map(p => `
      <div class="photo-item">
        <img src="/uploads/${ea(dealerId)}/${ea(p.filename)}" alt="${ea(p.original_name)}" loading="lazy">
        <button class="photo-delete" title="Xoá ảnh"
                onclick="DashboardController.deletePhoto('${ea(dealerId)}', ${p.id})">×</button>
      </div>
    `).join('');

    const addBtn = remaining > 0 ? `
      <label class="photo-add-btn" title="Thêm ảnh (còn ${remaining})">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple
               onchange="DashboardController.uploadPhotos('${ea(dealerId)}', this)">
        <span class="photo-add-icon">+</span>
        <span class="photo-add-label">Thêm ảnh</span>
      </label>
    ` : '';

    return `
      <h3 class="section-title">
        📷 Ảnh đại lý <span class="photo-count">${count}/${this.MAX_PHOTOS_PER_DEALER}</span>
      </h3>
      <div class="photo-gallery">${items}${addBtn}</div>
      <p class="muted-note">JPG / PNG / WEBP, tối đa 5MB/ảnh, ${this.MAX_PHOTOS_PER_DEALER} ảnh/đại lý.</p>
    `;
  },

  async refreshPhotos(dealerId) {
    const section = document.getElementById('photos-section');
    if (!section) return;
    const res = await window.API.get(`/api/dealers/${dealerId}/photos`);
    if (res.success) section.innerHTML = this.renderPhotosSection(dealerId, res.data);
  },

  async uploadPhotos(dealerId, input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    const fd = new FormData();
    files.forEach(f => fd.append('photos', f));

    window.App.toast(`📤 Đang tải lên ${files.length} ảnh...`, 'info');
    try {
      const result = await window.API.upload(`/api/dealers/${dealerId}/photos`, fd);
      if (!result.success) throw new Error(result.error);
      window.App.toast(`✅ Đã thêm ${result.data.length} ảnh${result.warning ? ' (' + result.warning + ')' : ''}`, 'success');
      await this.refreshPhotos(dealerId);
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    } finally {
      input.value = '';
    }
  },

  async deletePhoto(dealerId, photoId) {
    if (!confirm('Xoá ảnh này?')) return;
    try {
      const result = await window.API.del(`/api/dealers/${dealerId}/photos/${photoId}`);
      if (!result.success) throw new Error(result.error);
      window.App.toast('🗑 Đã xoá ảnh', 'success');
      await this.refreshPhotos(dealerId);
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  }
};

// ---- escape helpers (file-local; same scope as the controller) ----
const eh = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ea = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
