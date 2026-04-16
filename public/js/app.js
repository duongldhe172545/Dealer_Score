/**
 * App — main controller, view routing, toast
 */
window.App = {
  async init() {
    await this.loadWeights();
    this.setupSettingsModal();
    
    window.FormController.init();
    window.DashboardController.init();
    this.setupNav();
  },

  async loadWeights() {
    try {
      const res = await window.API.get('/api/dealers/weights');
      if (res && res.success) {
        const wMap = res.data;
        window.CRITERIA.forEach(c => {
          if (wMap[c.code] !== undefined) {
             c.weight = parseFloat(wMap[c.code]);
          }
        });
      }
    } catch(err) {
      console.error('Lỗi khi tải hệ số:', err);
    }
  },

  setupSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const form = document.getElementById('weights-form');

    document.getElementById('nav-settings').addEventListener('click', () => {
      // Build form
      form.innerHTML = '';
      window.CRITERIA.forEach(c => {
         const div = document.createElement('div');
         div.className = 'form-group';
         div.style.flexDirection = 'row';
         div.style.justifyContent = 'space-between';
         div.style.alignItems = 'center';
         div.style.marginBottom = '6px';
         div.innerHTML = `
           <label style="flex:1;">${c.code} - ${c.name}</label>
           <input type="number" step="0.01" min="0" max="1" data-code="${c.code}" value="${c.weight}" style="width:100px; text-align:right;">
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
        const res = await window.API.post('/api/dealers/weights', payload);
        if (res.success) {
          this.toast(res.message, 'success');
          modal.style.display = 'none';
          // Reload everything
          await this.loadWeights();
          window.FormController.renderCriteriaCards(); 
          window.DashboardController.loadDealers(); 
        } else {
          this.toast(res.error, 'error');
        }
      } catch(err) {
        this.toast('Lỗi khi cập nhật hệ số', 'error');
      }
    });
  },

  calcSum() {
    const inputs = document.getElementById('weights-form').querySelectorAll('input');
    let sum = 0;
    inputs.forEach(i => sum += (parseFloat(i.value) || 0));
    document.getElementById('weights-sum').textContent = (sum * 100).toFixed(1) + '%';
    document.getElementById('weights-sum').style.color = Math.abs(sum - 1.0) < 0.001 ? 'var(--success)' : 'var(--danger)';
  },

  setupNav() {
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'scoring') {
          window.FormController.resetForm();
        }
        this.showView(view);
      });
    });
  },

  showView(viewName) {
    // Map nav names to view IDs
    const viewMap = {
      'dashboard': 'view-dashboard',
      'scoring': 'view-scoring',
      'detail': 'view-detail'
    };

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Show target view
    const targetId = viewMap[viewName];
    if (targetId) {
      document.getElementById(targetId).classList.add('active');
    }

    // Update nav
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Reload dashboard data when switching to it
    if (viewName === 'dashboard') {
      window.DashboardController.loadDealers();
    }
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
