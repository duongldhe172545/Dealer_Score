/**
 * Form Controller — multi-step scoring form
 */
window.FormController = {
  currentStep: 1,
  editingDealerId: null,

  init() {
    this.setupStep1();
    this.setupStep2();
    this.setupStep3();
    this.renderCriteriaCards();
  },

  // ==================== STEP NAVIGATION ====================
  goToStep(step) {
    this.currentStep = step;
    // Update step indicators
    document.querySelectorAll('.step-item').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.remove('active', 'done');
      if (s === step) el.classList.add('active');
      else if (s < step) el.classList.add('done');
    });
    document.querySelectorAll('.step-line').forEach((el, i) => {
      el.classList.toggle('done', i < step - 1);
    });
    // Show step content
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
  },

  // ==================== STEP 1: BASIC INFO ====================
  setupStep1() {
    const installToggle = document.getElementById('f-install-team');
    const teamSizeGroup = document.getElementById('team-size-group');
    const toggleLabel = document.getElementById('toggle-label');

    installToggle.addEventListener('change', () => {
      teamSizeGroup.style.display = installToggle.checked ? '' : 'none';
      toggleLabel.textContent = installToggle.checked ? 'Có' : 'Không';
    });

    document.getElementById('btn-next-step1').addEventListener('click', () => {
      const name = document.getElementById('f-ten-dl').value.trim();
      const owner = document.getElementById('f-ten-chu').value.trim();
      const phone = document.getElementById('f-sdt').value.trim();
      const address = document.getElementById('f-dia-chi').value.trim();

      if (!name) {
        window.App.toast('Vui lòng nhập Tên đại lý', 'error');
        document.getElementById('f-ten-dl').focus();
        return;
      }
      if (!owner) {
        window.App.toast('Vui lòng nhập Tên chủ đại lý', 'error');
        document.getElementById('f-ten-chu').focus();
        return;
      }
      if (!phone) {
        window.App.toast('Vui lòng nhập Số điện thoại', 'error');
        document.getElementById('f-sdt').focus();
        return;
      }
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phone)) {
        window.App.toast('Số điện thoại không hợp lệ (phải chứa 10-11 chữ số)', 'error');
        document.getElementById('f-sdt').focus();
        return;
      }

      // Check if phone already exists
      if (window.DashboardController && window.DashboardController.dealers) {
        const isDuplicate = window.DashboardController.dealers.some(d => 
          d.sdt === phone && d.dealer_id !== window.FormController.editingDealerId
        );
        if (isDuplicate) {
          window.App.toast('Số điện thoại này đã tồn tại trong hệ thống', 'error');
          document.getElementById('f-sdt').focus();
          return;
        }
      }

      if (!address) {
        window.App.toast('Vui lòng nhập Địa chỉ', 'error');
        document.getElementById('f-dia-chi').focus();
        return;
      }

      this.goToStep(2);
    });

    document.getElementById('btn-cancel-form').addEventListener('click', () => {
      this.resetForm();
      window.App.showView('dashboard');
    });
  },

  getBasicInfo() {
    return {
      ten_dl: document.getElementById('f-ten-dl').value.trim(),
      ten_chu: document.getElementById('f-ten-chu').value.trim(),
      sdt: document.getElementById('f-sdt').value.trim(),
      dia_chi: document.getElementById('f-dia-chi').value.trim(),
      dealer_type: document.getElementById('f-dealer-type').value.trim(),
      category_stack: document.getElementById('f-category').value.trim(),
      has_install_team: document.getElementById('f-install-team').checked,
      est_team_size: parseInt(document.getElementById('f-team-size').value) || 0,
      note: document.getElementById('f-note').value.trim()
    };
  },

  // ==================== STEP 2: SCORING ====================
  setupStep2() {
    document.getElementById('btn-prev-step2').addEventListener('click', () => this.goToStep(1));
    document.getElementById('btn-next-step2').addEventListener('click', () => {
      this.showResults();
      this.goToStep(3);
    });
    document.getElementById('btn-ai-score-all').addEventListener('click', () => this.aiScoreAll());
  },

  renderCriteriaCards() {
    const group1 = document.getElementById('criteria-group-1');
    const group2 = document.getElementById('criteria-group-2');
    group1.innerHTML = '';
    group2.innerHTML = '';

    window.CRITERIA.forEach(c => {
      const card = document.createElement('div');
      card.className = 'criteria-card';
      card.id = `card-${c.code}`;

      card.innerHTML = `
        <div class="criteria-top">
          <div class="criteria-title">
            <span class="criteria-code">${c.code}</span>${c.name}
          </div>
          <span class="criteria-weight">${(c.weight * 100).toFixed(0)}%</span>
        </div>
        <div class="criteria-questions" style="margin: 1rem 0; padding: 1rem; background: var(--bg-body); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <strong style="display: block; margin-bottom: 0.5rem; color: var(--text-dark);">Gợi ý câu hỏi khảo sát / Suggested interview questions</strong>
          <ul style="margin: 0; padding-left: 1.5rem; color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">
            ${c.questions.map(q => `<li style="margin-bottom: 0.25rem;">${q}</li>`).join('')}
          </ul>
        </div>
        <div class="criteria-response">
          <textarea id="resp-${c.code}" placeholder="Ghi lại câu trả lời của đại lý..." rows="2"></textarea>
        </div>
        <div class="rubric-options">
          ${[0, 1, 2].map(s => `
            <label class="rubric-option">
              <input type="radio" name="score-${c.code}" value="${s}" data-score="${s}" data-code="${c.code}">
              <div class="rubric-label">
                <span class="rubric-score s${s}">${s}đ</span>
                ${c.rubric[s]}
              </div>
            </label>
          `).join('')}
        </div>
      `;

      // Listen for score changes — allow click-to-uncheck (toggle off)
      card.querySelectorAll('input[type=radio]').forEach(radio => {
        radio.addEventListener('click', function(e) {
          if (this.dataset.wasChecked === 'true') {
            this.checked = false;
            this.dataset.wasChecked = 'false';
            
            const code = this.dataset.code;
            const cardEl = document.getElementById(`card-${code}`);
            if (cardEl) {
              cardEl.classList.remove('scored', 'score-0', 'score-1', 'score-2');
              window.FormController.updateRunningTotal();
            }
          } else {
            // Unset tracking for all radios in this group
            document.querySelectorAll(`input[name="score-${this.dataset.code}"]`).forEach(r => {
              r.dataset.wasChecked = 'false';
            });
            this.dataset.wasChecked = 'true';
            window.FormController.onScoreChange(this.dataset.code, parseInt(this.value));
          }
        });
      });

      if (c.group === 1) group1.appendChild(card);
      else group2.appendChild(card);
    });
  },

  onScoreChange(code, score) {
    const card = document.getElementById(`card-${code}`);
    card.classList.remove('score-0', 'score-1', 'score-2');
    card.classList.add('scored', `score-${score}`);
    this.updateRunningTotal();
  },

  getScores() {
    const scores = {};
    window.CRITERIA.forEach(c => {
      const selected = document.querySelector(`input[name="score-${c.code}"]:checked`);
      scores[c.code] = selected ? parseInt(selected.value) : 0;
    });
    return scores;
  },

  getResponses() {
    const responses = {};
    window.CRITERIA.forEach(c => {
      responses[c.code] = document.getElementById(`resp-${c.code}`).value.trim();
    });
    return responses;
  },

  updateRunningTotal() {
    const scores = this.getScores();
    const { cScore } = window.ScoringEngine.calculate(scores);
    document.getElementById('running-score').textContent = cScore;
  },

  async aiScoreAll() {
    const responses = this.getResponses();

    // Find which criteria the user has NOT manually scored
    const manuallyScored = {};
    window.CRITERIA.forEach(c => {
      const selected = document.querySelector(`input[name="score-${c.code}"]:checked`);
      if (selected) manuallyScored[c.code] = true;
    });

    // Filter: only send unscored criteria to AI
    const unscoredCriteria = window.CRITERIA.filter(c => !manuallyScored[c.code]);

    if (unscoredCriteria.length === 0) {
      window.App.toast('Bạn đã chấm hết 9 câu rồi, không cần AI nữa 👍', 'info');
      return;
    }

    // Check if unscored criteria have responses to score
    const unscoredResponses = {};
    unscoredCriteria.forEach(c => { unscoredResponses[c.code] = responses[c.code]; });

    const hasAny = Object.values(unscoredResponses).some(r => r && r.length > 0);
    if (!hasAny) {
      window.App.toast(`Vui lòng nhập câu trả lời cho ${unscoredCriteria.length} câu chưa chấm để AI xử lý`, 'error');
      return;
    }

    const statusEl = document.getElementById('ai-status');
    const btn = document.getElementById('btn-ai-score-all');
    statusEl.style.display = 'flex';
    btn.disabled = true;

    try {
      const result = await window.API.post('/api/score-all', {
        responses: unscoredResponses,
        criteria: unscoredCriteria
      });

      if (!result.success) {
        throw new Error(result.error || 'AI scoring failed');
      }

      // Apply AI scores ONLY to unscored criteria
      const aiScores = result.data;
      let applied = 0;
      for (const [code, score] of Object.entries(aiScores)) {
        if (manuallyScored[code]) continue; // Safety: skip if user already scored
        const radio = document.querySelector(`input[name="score-${code}"][value="${score}"]`);
        if (radio) {
          document.querySelectorAll(`input[name="score-${code}"]`).forEach(r => r.dataset.wasChecked = 'false');
          radio.checked = true;
          radio.dataset.wasChecked = 'true';
          this.onScoreChange(code, score);
          applied++;
        }
      }

      const skipped = Object.keys(manuallyScored).length;
      window.App.toast(`✅ AI đã chấm ${applied} câu! (Giữ nguyên ${skipped} câu bạn đã chấm)`, 'success');
    } catch (err) {
      window.App.toast(`❌ ${err.message}`, 'error');
    } finally {
      statusEl.style.display = 'none';
      btn.disabled = false;
    }
  },

  // ==================== STEP 3: RESULTS ====================
  setupStep3() {
    document.getElementById('btn-prev-step3').addEventListener('click', () => this.goToStep(2));
    document.getElementById('btn-save-dealer').addEventListener('click', () => this.saveDealer());
  },

  showResults() {
    const info = this.getBasicInfo();
    const scores = this.getScores();
    const { cScore, tier, batch } = window.ScoringEngine.calculate(scores);

    // Dealer name
    document.getElementById('result-dealer-name').textContent = info.ten_dl;

    // Big score
    document.getElementById('result-cscore').textContent = cScore;

    // Tier & Batch badges
    const tierEl = document.getElementById('result-tier');
    tierEl.textContent = tier;
    tierEl.className = `tier-badge-big ${window.ScoringEngine.getTierClass(tier)}`;

    const batchEl = document.getElementById('result-batch');
    batchEl.textContent = batch;

    // Score breakdown
    const breakdownEl = document.getElementById('score-breakdown');
    breakdownEl.innerHTML = window.CRITERIA.map(c => {
      const s = scores[c.code] || 0;
      const weighted = (s * c.weight * 50).toFixed(1);
      return `
        <div class="breakdown-row">
          <span class="breakdown-code">${c.code}</span>
          <span class="breakdown-name">${c.name}</span>
          <span class="breakdown-score s${s}">${s}</span>
          <span class="breakdown-weighted">×${(c.weight * 100).toFixed(0)}% = ${weighted}</span>
        </div>
      `;
    }).join('');
  },

  async saveDealer() {
    const info = this.getBasicInfo();
    const rawScores = this.getScores();
    const responses = this.getResponses();
    const { cScore, tier, batch } = window.ScoringEngine.calculate(rawScores);

    const dealerData = {
      ...info,
      c_score: cScore,
      dealer_tier: tier,
      pilot_batch: batch,
      dealer_status: 'Active',
      scores: window.CRITERIA.map(c => ({
        criterion_code: c.code,
        score: rawScores[c.code] || 0,
        response: responses[c.code] || ''
      }))
    };

    try {
      let result;
      if (this.editingDealerId) {
        result = await window.API.put(`/api/dealers/${this.editingDealerId}`, dealerData);
      } else {
        result = await window.API.post('/api/dealers', dealerData);
      }

      if (!result.success) throw new Error(result.error);

      window.App.toast(`✅ Đã lưu ${info.ten_dl} thành công!`, 'success');
      this.resetForm();
      window.App.showView('dashboard');
      window.DashboardController.loadDealers();
    } catch (err) {
      window.App.toast(`❌ Lỗi: ${err.message}`, 'error');
    }
  },

  // ==================== LOAD FOR EDIT ====================
  loadDealer(dealer) {
    this.editingDealerId = dealer.dealer_id;

    // Step 1 fields
    document.getElementById('f-ten-dl').value = dealer.ten_dl || '';
    document.getElementById('f-ten-chu').value = dealer.ten_chu || '';
    document.getElementById('f-sdt').value = dealer.sdt || '';
    document.getElementById('f-dia-chi').value = dealer.dia_chi || '';
    document.getElementById('f-dealer-type').value = dealer.dealer_type || '';
    document.getElementById('f-category').value = dealer.category_stack || '';
    document.getElementById('f-note').value = dealer.note || '';

    const installToggle = document.getElementById('f-install-team');
    installToggle.checked = !!dealer.has_install_team;
    installToggle.dispatchEvent(new Event('change'));
    document.getElementById('f-team-size').value = dealer.est_team_size || 0;

    // Step 2 scores
    if (dealer.scores) {
      dealer.scores.forEach(s => {
        const textarea = document.getElementById(`resp-${s.criterion_code}`);
        if (textarea) textarea.value = s.response || '';

        const radio = document.querySelector(`input[name="score-${s.criterion_code}"][value="${s.score}"]`);
        if (radio) {
          document.querySelectorAll(`input[name="score-${s.criterion_code}"]`).forEach(r => r.dataset.wasChecked = 'false');
          radio.checked = true;
          radio.dataset.wasChecked = 'true';
          this.onScoreChange(s.criterion_code, s.score);
        }
      });
    }

    this.updateRunningTotal();
  },

  resetForm() {
    this.editingDealerId = null;
    this.goToStep(1);

    // Clear step 1
    ['f-ten-dl', 'f-ten-chu', 'f-sdt', 'f-dia-chi', 'f-dealer-type', 'f-category', 'f-note'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('f-install-team').checked = false;
    document.getElementById('f-install-team').dispatchEvent(new Event('change'));
    document.getElementById('f-team-size').value = 0;

    // Clear step 2
    window.CRITERIA.forEach(c => {
      document.getElementById(`resp-${c.code}`).value = '';
      document.querySelectorAll(`input[name="score-${c.code}"]`).forEach(r => {
        r.checked = false;
        r.dataset.wasChecked = 'false';
      });
      const card = document.getElementById(`card-${c.code}`);
      card.classList.remove('scored', 'score-0', 'score-1', 'score-2');
    });

    document.getElementById('running-score').textContent = '0';
  }
};
