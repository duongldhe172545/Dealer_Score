/**
 * Dashboard Controller — dealer list, stats, filters
 */
window.DashboardController = {
  dealers: [],

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

    document.getElementById('btn-export-excel').addEventListener('click', async () => {
      window.App.toast('📥 Đang tạo file Excel...', 'info');
      try {
        const res = await fetch('/api/export-excel');
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

    tbody.innerHTML = filtered.map(d => {
      const tierClass = window.ScoringEngine.getTierClass(d.dealer_tier || '');
      const addr = (d.dia_chi || '').length > 30 ? d.dia_chi.substring(0, 30) + '...' : (d.dia_chi || '');

      return `
        <tr data-id="${d.dealer_id}">
          <td><strong>${d.dealer_id}</strong></td>
          <td>${d.ten_dl || ''}</td>
          <td>${d.ten_chu || ''}</td>
          <td>${d.sdt || ''}</td>
          <td title="${d.dia_chi || ''}">${addr}</td>
          <td><strong>${d.c_score || 0}</strong></td>
          <td><span class="tier-badge ${tierClass}">${d.dealer_tier || '-'}</span></td>
          <td><span class="batch-badge">${d.pilot_batch || '-'}</span></td>
          <td>
            <div class="actions-cell">
              <button class="action-btn" onclick="DashboardController.viewDealer('${d.dealer_id}')" title="Xem chi tiết">👁</button>
              <button class="action-btn" onclick="DashboardController.editDealer('${d.dealer_id}')" title="Sửa">✏️</button>
              <button class="action-btn" onclick="DashboardController.syncDealer('${d.dealer_id}')" title="Đồng bộ SP">☁️</button>
              <button class="action-btn delete" onclick="DashboardController.deleteDealer('${d.dealer_id}')" title="Xóa">🗑</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async viewDealer(dealerId) {
    try {
      const result = await window.API.get(`/api/dealers/${dealerId}`);
      if (!result.success) throw new Error(result.error);

      const d = result.data;
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
            const response = s ? s.response : '';
            const weighted = (score * c.weight * 50).toFixed(1);
            return `
              <div class="breakdown-row" style="grid-template-columns:50px 1fr 50px 70px;border-bottom:1px solid rgba(255,255,255,0.05);padding:12px 8px">
                <span class="breakdown-code">${c.code}</span>
                <span>
                  <span class="breakdown-name">${c.name}</span>
                  ${response ? `<br><span style="font-size:0.78rem;color:var(--text-muted);font-style:italic">"${response}"</span>` : ''}
                </span>
                <span class="breakdown-score s${score}">${score}</span>
                <span class="breakdown-weighted">= ${weighted}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="App.showView('dashboard')">← Quay lại</button>
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
  }
};
