/**
 * App — main controller, view routing, toast.
 *
 * URL routing uses the History API. The server returns index.html for any
 * path (SPA fallback in server.js), so refreshing /dealer/DL-0001 still works.
 */
window.App = {
  async init() {
    await this.loadWeights();
    this.setupSettingsModal();
    window.FormController.init();
    window.DashboardController.init();
    this.setupNav();
    this.setupRouter();
    this.routeFromLocation();
  },

  async loadWeights() {
    try {
      const res = await window.API.get('/api/settings/weights');
      if (res && res.success) {
        const wMap = res.data;
        window.CRITERIA.forEach(c => {
          if (wMap[c.code] !== undefined) c.weight = parseFloat(wMap[c.code]);
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải hệ số:', err);
    }
  },

  setupSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const form = document.getElementById('weights-form');

    document.getElementById('nav-settings').addEventListener('click', () => {
      form.innerHTML = '';
      window.CRITERIA.forEach(c => {
        const div = document.createElement('div');
        div.className = 'weights-row';
        div.innerHTML = `
          <label>${c.code} - ${c.name}</label>
          <input type="number" step="0.01" min="0" max="1" data-code="${c.code}" value="${c.weight}">
        `;
        form.appendChild(div);
      });
      this.calcSum();
      form.addEventListener('input', () => this.calcSum());
      modal.style.display = 'flex';
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    document.getElementById('btn-save-weights').addEventListener('click', async () => {
      const inputs = Array.from(form.querySelectorAll('input'));
      let sum = 0;
      const payload = {};
      inputs.forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        sum += val;
        payload[inp.dataset.code] = val;
      });
      if (Math.abs(sum - 1.0) > 0.001) {
        return this.toast('Tổng hệ số phải bằng chính xác 100% (1.0)', 'error');
      }
      try {
        const res = await window.API.post('/api/settings/weights', payload);
        if (res.success) {
          this.toast(res.message, 'success');
          modal.style.display = 'none';
          await this.loadWeights();
          window.FormController.renderCriteriaCards();
          window.DashboardController.loadDealers();
        } else {
          this.toast(res.error, 'error');
        }
      } catch (_) {
        this.toast('Lỗi khi cập nhật hệ số', 'error');
      }
    });
  },

  calcSum() {
    const inputs = document.getElementById('weights-form').querySelectorAll('input');
    let sum = 0;
    inputs.forEach(i => sum += (parseFloat(i.value) || 0));
    const out = document.getElementById('weights-sum');
    out.textContent = (sum * 100).toFixed(1) + '%';
    out.style.color = Math.abs(sum - 1.0) < 0.001 ? 'var(--success)' : 'var(--danger)';
  },

  setupNav() {
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'dashboard') this.navigate('/');
        else if (view === 'scoring') this.navigate('/scoring');
      });
    });
  },

  // ==================== SPA ROUTER ====================

  setupRouter() {
    window.addEventListener('popstate', () => this.routeFromLocation());
  },

  // Push a new URL onto the history stack and render the matching view.
  navigate(path, replace = false) {
    if (window.location.pathname === path) return;
    if (replace) history.replaceState({}, '', path);
    else history.pushState({}, '', path);
    this.routeFromLocation();
  },

  routeFromLocation() {
    const p = window.location.pathname;

    // /dealer/:id/edit
    let m = p.match(/^\/dealer\/(DL-\d+)\/edit\/?$/);
    if (m) return this.routeEditDealer(m[1]);

    // /dealer/:id
    m = p.match(/^\/dealer\/(DL-\d+)\/?$/);
    if (m) return this.routeViewDealer(m[1]);

    // /scoring (new dealer)
    if (p === '/scoring' || p === '/scoring/') {
      window.FormController.resetForm();
      this.showView('scoring');
      return;
    }

    // / (default — dashboard)
    this.showView('dashboard');
  },

  async routeViewDealer(dealerId) {
    this.showView('detail');
    await window.DashboardController.viewDealer(dealerId);
  },

  async routeEditDealer(dealerId) {
    try {
      const res = await window.API.get(`/api/dealers/${dealerId}`);
      if (!res.success) throw new Error(res.error);
      window.FormController.resetForm();
      window.FormController.loadDealer(res.data);
      this.showView('scoring');
    } catch (err) {
      this.toast(`❌ ${err.message}`, 'error');
      this.navigate('/', true);
    }
  },

  // Show a view by name. Does NOT touch the URL — callers go through navigate()
  // for that. Keeping showView pure makes it safe to call from popstate too.
  showView(viewName) {
    const viewMap = {
      'dashboard': 'view-dashboard',
      'scoring':   'view-scoring',
      'detail':    'view-detail'
    };
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetId = viewMap[viewName];
    if (targetId) document.getElementById(targetId).classList.add('active');

    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    if (viewName === 'dashboard') window.DashboardController.loadDealers();
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
