/**
 * Dashboard Controller — dealer list, stats, filters
 */
window.DashboardController = {
  dealers: [],
  selectedIds: new Set(),
  filteredIds: [],

  init() {
    this.setupFilters();
    this.setupActions();
    this.loadDealers();
  },

  setupFilters() {
    document.getElementById('search-input').addEventListener('input', () => this.renderTable());
    document.getElementById('search-column').addEventListener('change', () => this.renderTable());
    document.getElementById('sort-score').addEventListener('change', () => this.renderTable());
    document.getElementById('filter-tier').addEventListener('change', () => this.renderTable());
    document.getElementById('filter-batch').addEventListener('change', () => this.renderTable());
  },

  setupActions() {
    document.getElementById('btn-start-scoring').addEventListener('click', () => {
      window.App.showView('scoring');
    });

    document.getElementById('btn-sync-all').addEventListener('click', () => {
      this.syncAllDealers();
    });

    document.getElementById('select-all-dealers').addEventListener('change', (e) => {
      if (e.target.checked) {
        this.filteredIds.forEach(id => this.selectedIds.add(id));
      } else {
        this.filteredIds.forEach(id => this.selectedIds.delete(id));
      }
      this.renderTable();
    });

    document.getElementById('btn-export-excel').addEventListener('click', async () => {
      const ids = this.getExportIds();
      const label = this.selectedIds.size > 0
        ? `${ids.length} đại lý đã chọn`
        : (ids.length < this.dealers.length ? `${ids.length} đại lý đang lọc` : 'tất cả đại lý');
      window.App.toast(`📥 Đang tạo Excel cho ${label}...`, 'info');
      try {
        const res = await fetch('/api/export-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DealerScoring_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        window.App.toast('✅ Đã tải xuống file Excel', 'success');
      } catch (err) {
        window.App.toast(`❌ ${err.message}`, 'error');
      }
    });
  },

  // Returns the list of dealer_ids that will be exported.
  // Priority: explicit selection (checkboxes) > current filtered view.
  getExportIds() {
    if (this.selectedIds.size > 0) {
      const valid = new Set(this.dealers.map(d => d.dealer_id));
      return [...this.selectedIds].filter(id => valid.has(id));
    }
    return [...this.filteredIds];
  },

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

      if (statsRes.success) {
        this.renderStats(statsRes.data);
      }
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

  renderTable() {
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const searchCol = document.getElementById('search-column').value;
    const sortScore = document.getElementById('sort-score').value;
    const tierFilter = document.getElementById('filter-tier').value;
    const batchFilter = document.getElementById('filter-batch').value;

    let filtered = this.dealers;

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
    if (tierFilter) {
      filtered = filtered.filter(d => d.dealer_tier === tierFilter);
    }
    if (batchFilter) {
      filtered = filtered.filter(d => d.pilot_batch === batchFilter);
    }
    if (sortScore === 'desc') {
      filtered = [...filtered].sort((a, b) => (b.c_score || 0) - (a.c_score || 0));
    } else if (sortScore === 'asc') {
      filtered = [...filtered].sort((a, b) => (a.c_score || 0) - (b.c_score || 0));
    }

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

    const esc = (s) => String(s ?? '').replace(/"/g, '&quot;');

    this.filteredIds = filtered.map(d => d.dealer_id);

    tbody.innerHTML = filtered.map((d, idx) => {
      const tierClass = window.ScoringEngine.getTierClass(d.dealer_tier || '');
      const installTeam = d.has_install_team
        ? '<span class="cell-yes">Có</span>'
        : '<span class="cell-no">Không</span>';
      const teamSize = d.has_install_team ? (d.est_team_size || 0) : '-';
      const dataPct = d.data_completeness != null ? `${d.data_completeness}%` : '-';
      const updatedShort = (d.updated_at || '').slice(0, 16); // "YYYY-MM-DD HH:MM"
      const checked = this.selectedIds.has(d.dealer_id) ? 'checked' : '';

      return `
        <tr data-id="${d.dealer_id}">
          <td class="col-checkbox"><input type="checkbox" class="row-checkbox" data-id="${d.dealer_id}" ${checked}></td>
          <td class="col-stt">${idx + 1}</td>
          <td class="col-id"><strong>${d.dealer_id}</strong></td>
          <td class="col-name">${d.ten_dl || ''}</td>
          <td class="col-owner">${d.ten_chu || ''}</td>
          <td class="col-phone cell-nowrap">${d.sdt || ''}</td>
          <td class="col-address" title="${esc(d.dia_chi)}">${d.dia_chi || ''}</td>
          <td class="col-area">${d.area_code || '-'}</td>
          <td class="col-tier"><span class="tier-badge ${tierClass}">${d.dealer_tier || '-'}</span></td>
          <td class="col-type">${d.dealer_type || '-'}</td>
          <td class="col-status"><span class="status-badge">${d.dealer_status || '-'}</span></td>
          <td class="col-category">${d.category_stack || '-'}</td>
          <td class="col-install cell-center">${installTeam}</td>
          <td class="col-team cell-center">${teamSize}</td>
          <td class="col-cscore cell-center"><strong>${d.c_score || 0}</strong></td>
          <td class="col-batch"><span class="batch-badge">${d.pilot_batch || '-'}</span></td>
          <td class="col-data cell-center">${dataPct}</td>
          <td class="col-updated cell-nowrap" title="${esc(d.updated_at)}">${updatedShort || '-'}</td>
          <td class="col-note" title="${esc(d.note)}">${d.note || '-'}</td>
          <td class="col-actions">
            <div class="actions-cell">
              <button class="action-btn" onclick="DashboardController.viewDealer('${d.dealer_id}')" title="Xem chi tiết">👁</button>
              <button class="action-btn" onclick="DashboardController.editDealer('${d.dealer_id}')" title="Sửa">✏️</button>
              <button class="action-btn" onclick="DashboardController.exportPdf('${d.dealer_id}')" title="Xuất PDF">📄</button>
              <button class="action-btn delete" onclick="DashboardController.deleteDealer('${d.dealer_id}')" title="Xóa">🗑</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

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

  async viewDealer(dealerId) {
    try {
      const [result, photosRes] = await Promise.all([
        window.API.get(`/api/dealers/${dealerId}`),
        window.API.get(`/api/dealers/${dealerId}/photos`)
      ]);
      if (!result.success) throw new Error(result.error);

      const d = result.data;
      const photos = (photosRes && photosRes.success) ? photosRes.data : [];
      const tierClass = window.ScoringEngine.getTierClass(d.dealer_tier || '');
      const scoreMap = {};
      (d.scores || []).forEach(s => { scoreMap[s.criterion_code] = s; });

      document.getElementById('detail-content').innerHTML = `
        <div class="detail-header">
          <div>
            <h2>${d.ten_dl} <span style="color:var(--text-muted);font-weight:400">(${d.dealer_id})</span></h2>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="tier-badge ${tierClass}" style="font-size:0.9rem;padding:6px 14px">${d.dealer_tier}</span>
            <span class="batch-badge" style="font-size:0.85rem;padding:6px 12px">${d.pilot_batch}</span>
            <span style="font-size:1.8rem;font-weight:800;color:var(--accent-light);margin-left:8px">${d.c_score}</span>
          </div>
        </div>
        <div class="detail-info-grid">
          <div class="detail-field"><span class="detail-field-label">Chủ ĐL</span><span class="detail-field-value">${d.ten_chu || '-'}</span></div>
          <div class="detail-field"><span class="detail-field-label">SĐT</span><span class="detail-field-value">${d.sdt || '-'}</span></div>
          <div class="detail-field"><span class="detail-field-label">Loại ĐL</span><span class="detail-field-value">${d.dealer_type || '-'}</span></div>
          <div class="detail-field"><span class="detail-field-label">Địa chỉ</span><span class="detail-field-value">${d.dia_chi || '-'}</span></div>
          <div class="detail-field"><span class="detail-field-label">Mã địa danh</span><span class="detail-field-value">${d.area_code || '-'}</span></div>
          <div class="detail-field"><span class="detail-field-label">Ngành hàng</span><span class="detail-field-value">${d.category_stack || '-'}</span></div>
          <div class="detail-field"><span class="detail-field-label">Đội lắp đặt</span><span class="detail-field-value">${d.has_install_team ? `Có (${d.est_team_size} thợ)` : 'Không'}</span></div>
          <div class="detail-field"><span class="detail-field-label">Data hoàn thiện</span><span class="detail-field-value">${d.data_completeness || 0}%</span></div>
          <div class="detail-field"><span class="detail-field-label">Trạng thái</span><span class="detail-field-value">${d.dealer_status}</span></div>
          <div class="detail-field"><span class="detail-field-label">Ngày tạo</span><span class="detail-field-value">${d.created_at || '-'}</span></div>
          <div class="detail-field"><span class="detail-field-label">Cập nhật lúc</span><span class="detail-field-value">${d.updated_at || '-'}</span></div>
          <div class="detail-field" style="grid-column: 1 / -1;"><span class="detail-field-label">Ghi chú</span><span class="detail-field-value">${d.note || '-'}</span></div>
        </div>
        <h3 style="margin:1.5rem 0 1rem;font-size:1rem;color:var(--text-secondary)">📊 Chi tiết chấm điểm</h3>
        <div class="score-breakdown">
          ${window.CRITERIA.map(c => {
            const s = scoreMap[c.code];
            const score = s ? s.score : 0;
            const weighted = (score * c.weight * 50).toFixed(1);
            return `
              <div class="breakdown-row" style="grid-template-columns:50px 1fr 50px 70px;border-bottom:1px solid rgba(255,255,255,0.05);padding:12px 8px">
                <span class="breakdown-code">${c.code}</span>
                <span class="breakdown-name">${c.name}</span>
                <span class="breakdown-score s${score}">${score}</span>
                <span class="breakdown-weighted">= ${weighted}</span>
              </div>
            `;
          }).join('')}
        </div>

        ${this.renderResponsesSection(scoreMap)}

        <div id="photos-section" data-dealer-id="${d.dealer_id}">
          ${this.renderPhotosSection(d.dealer_id, photos)}
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" onclick="App.showView('dashboard')">← Quay lại</button>
          <button class="btn btn-outline" onclick="DashboardController.exportPdf('${d.dealer_id}')">📄 Xuất PDF</button>
          <button class="btn btn-primary" onclick="DashboardController.editDealer('${d.dealer_id}')">✏️ Sửa</button>
        </div>
      `;

      window.App.showView('detail');
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  },

  async editDealer(dealerId) {
    try {
      const result = await window.API.get(`/api/dealers/${dealerId}`);
      if (!result.success) throw new Error(result.error);

      window.FormController.resetForm();
      window.FormController.loadDealer(result.data);
      window.App.showView('scoring');
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  },

  async deleteDealer(dealerId) {
    if (!confirm(`Xác nhận xóa dealer ${dealerId}?`)) return;
    try {
      const result = await window.API.del(`/api/dealers/${dealerId}`);
      if (!result.success) throw new Error(result.error);
      window.App.toast('🗑 Đã xóa', 'success');
      this.loadDealers();
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  },

  async syncDealer(dealerId) {
    try {
      window.App.toast(`☁️ Đang đồng bộ đại lý ${dealerId}...`, 'info');
      const res = await fetch('/api/sync-sharepoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealer_id: dealerId })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      window.App.toast(`✅ Đồng bộ ${dealerId} thành công!`, 'success');
    } catch (err) {
      window.App.toast(`❌ Lỗi đồng bộ: ${err.message}`, 'error');
    }
  },

  async exportPdf(dealerId) {
    window.App.toast(`📄 Đang tạo PDF cho ${dealerId}...`, 'info');
    try {
      const res = await fetch(`/api/dealers/${dealerId}/export-pdf`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 100)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dealer_${dealerId}_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      window.App.toast('✅ Đã tải PDF', 'success');
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  },

  async syncAllDealers() {
    if (!confirm('Đồng bộ TẤT CẢ đại lý chưa đồng bộ lên SharePoint?')) return;
    try {
      window.App.toast(`☁️ Đang đồng bộ hệ thống...`, 'info');
      const res = await fetch('/api/sync-sharepoint', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ type: 'all' })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      window.App.toast(`✅ Đã đồng bộ xong!`, 'success');
    } catch (err) {
      window.App.toast(`❌ Lỗi đồng bộ: ${err.message}`, 'error');
    }
  },

  renderResponsesSection(scoreMap) {
    const withResp = window.CRITERIA.filter(c => {
      const s = scoreMap[c.code];
      return s && s.response && s.response.trim();
    });
    if (withResp.length === 0) {
      return `
        <h3 style="margin:1.5rem 0 0.6rem;font-size:1rem;color:var(--text-secondary)">💬 Câu trả lời chi tiết</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0">
          Đại lý chưa có câu trả lời nào được ghi lại.
        </p>
      `;
    }
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <h3 style="margin:1.5rem 0 1rem;font-size:1rem;color:var(--text-secondary)">
        💬 Câu trả lời chi tiết <span class="photo-count">${withResp.length}/9</span>
      </h3>
      <div class="responses-list">
        ${withResp.map(c => {
          const s = scoreMap[c.code];
          return `
            <div class="response-item">
              <div class="response-header">
                <span class="response-code">${c.code}</span>
                <span class="response-name">${c.name}</span>
                <span class="breakdown-score s${s.score}">${s.score}đ</span>
              </div>
              <blockquote class="response-text">${esc(s.response)}</blockquote>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // ==================== PHOTOS ====================

  MAX_PHOTOS_PER_DEALER: 5,

  renderPhotosSection(dealerId, photos) {
    const count = photos.length;
    const remaining = this.MAX_PHOTOS_PER_DEALER - count;
    const items = photos.map(p => `
      <div class="photo-item">
        <img src="/uploads/${dealerId}/${p.filename}" alt="${p.original_name || ''}" loading="lazy">
        <button class="photo-delete" title="Xoá ảnh"
                onclick="DashboardController.deletePhoto('${dealerId}', ${p.id})">×</button>
      </div>
    `).join('');

    const addBtn = remaining > 0 ? `
      <label class="photo-add-btn" title="Thêm ảnh (còn ${remaining})">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple
               onchange="DashboardController.uploadPhotos('${dealerId}', this)">
        <span class="photo-add-icon">+</span>
        <span class="photo-add-label">Thêm ảnh</span>
      </label>
    ` : '';

    return `
      <h3 style="margin:1.5rem 0 1rem;font-size:1rem;color:var(--text-secondary)">
        📷 Ảnh đại lý <span class="photo-count">${count}/${this.MAX_PHOTOS_PER_DEALER}</span>
      </h3>
      <div class="photo-gallery">
        ${items}
        ${addBtn}
      </div>
      <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.5rem">
        JPG / PNG / WEBP, tối đa 5MB/ảnh, ${this.MAX_PHOTOS_PER_DEALER} ảnh/đại lý.
      </p>
    `;
  },

  async refreshPhotos(dealerId) {
    const section = document.getElementById('photos-section');
    if (!section) return;
    const res = await window.API.get(`/api/dealers/${dealerId}/photos`);
    if (res.success) {
      section.innerHTML = this.renderPhotosSection(dealerId, res.data);
    }
  },

  async uploadPhotos(dealerId, input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const fd = new FormData();
    files.forEach(f => fd.append('photos', f));

    window.App.toast(`📤 Đang tải lên ${files.length} ảnh...`, 'info');
    try {
      const res = await fetch(`/api/dealers/${dealerId}/photos`, { method: 'POST', body: fd });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      window.App.toast(`✅ Đã thêm ${result.data.length} ảnh`, 'success');
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
      const res = await fetch(`/api/dealers/${dealerId}/photos/${photoId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      window.App.toast('🗑 Đã xoá ảnh', 'success');
      await this.refreshPhotos(dealerId);
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    }
  }
};
