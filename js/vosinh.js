'use strict';

const API_URL = window.location.origin;

const VSApp = {
  user: null,
  ranking: [],

  async init() {
    const token = localStorage.getItem('vct_token');
    if (!token) {
      window.location.href = 'index.html';
      return;
    }

    this.setHeaderDate();
    await this.loadData();
    this.setupUI();
    this.renderAll();
  },

  setHeaderDate() {
    const el = document.getElementById('header-date');
    if (!el) return;
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const formatted = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    el.innerHTML = `<i class="bi bi-calendar3 me-2 text-danger"></i> ${formatted}`;
  },

  async loadData() {
    try {
      const token = localStorage.getItem('vct_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [vs, r] = await Promise.all([
        fetch(`${API_URL}/vs/me`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_URL}/rankings`).then(r => r.json())
      ]);

      if (!vs) {
        localStorage.removeItem('vct_token');
        localStorage.removeItem('vct_session');
        window.location.href = 'index.html';
        return;
      }

      this.user = vs;
      this.ranking = r;
    } catch (e) {
      console.error('Error loading data:', e);
      this.showToast('Lỗi kết nối máy chủ', 'error');
    }
  },

  setupUI() {
    // Tab switching
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Mobile sidebar toggle
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggle) toggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      overlay.classList.toggle('show');
    });
    if (overlay) overlay.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      overlay.classList.remove('show');
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('vct_token');
      localStorage.removeItem('vct_session');
      window.location.href = '/';
    });

    // Avatar upload
    document.getElementById('avatar-upload')?.addEventListener('change', (e) => this.handleAvatarUpload(e));

    // Change password form
    document.getElementById('form-change-password')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.changePassword();
    });
  },

  switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach(el => {
      el.classList.toggle('active', el.id === `tab-${tab}`);
    });

    const titles = {
      profile: 'Hồ sơ cá nhân',
      tuition: 'Lịch sử Học phí',
      achievements: 'Thành tích',
      security: 'Bảo mật tài khoản'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[tab] || '';

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
  },

  renderAll() {
    if (!this.user) return;
    this.renderProfile();
    this.renderTuition();
    this.renderAchievements();
  },

  renderProfile() {
    const vs = this.user;
    const rankInfo = this.ranking.find(r => r.cap === vs.dangCap) || this.ranking[0];
    
    // Header
    const initials = this.getInitials(vs.tenVS);
    const mainAvatar = document.getElementById('main-vs-avatar');
    const sideAvatar = document.getElementById('side-vs-avatar');
    
    if (vs.avatar) {
      const imgHtml = `<img src="${vs.avatar}" alt="Avatar">`;
      mainAvatar.innerHTML = imgHtml;
      sideAvatar.innerHTML = imgHtml;
    } else {
      mainAvatar.textContent = initials;
      sideAvatar.textContent = initials;
      mainAvatar.style.background = rankInfo.hexDai;
      mainAvatar.style.color = '#fff';
    }

    document.getElementById('vs-display-name').textContent = vs.tenVS;
    document.getElementById('vs-display-id').textContent = `MSVS: ${vs.msVS}`;
    document.getElementById('side-vs-name').textContent = vs.tenVS;
    document.getElementById('side-vs-id').textContent = `MSVS: ${vs.msVS}`;

    // Belt Card
    const beltCard = document.getElementById('belt-card');
    if (beltCard) {
      beltCard.style.background = `linear-gradient(135deg, ${rankInfo.hexDai}, ${this.adjustColor(rankInfo.hexDai, -20)})`;
    }
    document.getElementById('vs-rank-text').textContent = `Cấp ${vs.dangCap} · ${rankInfo.colorName} (${rankInfo.trinhDo})`;
    document.getElementById('vs-club-text').textContent = vs.tenCLB ? `Câu lạc bộ: ${vs.tenCLB}` : `Mã CLB: ${vs.msCLB}`;

    // Info Grid
    document.getElementById('vs-dob').textContent = this.formatDate(vs.ngaySinh);
    document.getElementById('vs-gender').textContent = vs.gioiTinh || '—';
    document.getElementById('vs-address').textContent = vs.diaChi || 'Chưa cập nhật';
    document.getElementById('vs-enroll-date').textContent = this.formatDate(vs.ngayNhapHoc);
  },

  renderTuition() {
    const grid = document.getElementById('tuition-grid');
    if (!grid) return;

    const hocPhi = this.user.hocPhi || {};
    const months = Object.keys(hocPhi).sort().reverse();

    if (months.length === 0) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">
          <i class="bi bi-calendar-x opacity-25" style="font-size: 3rem;"></i>
          <p class="mt-2">Chưa có dữ liệu học phí.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = months.map(m => {
      const isPaid = hocPhi[m];
      const [year, month] = m.split('-');
      return `
        <div class="col-sm-6 col-lg-4 col-xl-3">
          <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
            <div class="p-3 d-flex align-items-center justify-content-between ${isPaid ? 'bg-success-subtle' : 'bg-danger-subtle'}">
              <div class="fw-bold text-dark">Tháng ${month}/${year}</div>
              <div class="badge ${isPaid ? 'bg-success' : 'bg-danger'} rounded-pill">
                ${isPaid ? 'Đã đóng' : 'Chưa đóng'}
              </div>
            </div>
            <div class="p-3">
              <div class="d-flex align-items-center text-muted small mb-2">
                <i class="bi bi-clock-history me-2"></i> Trạng thái thanh toán
              </div>
              <div class="fw-semibold ${isPaid ? 'text-success' : 'text-danger'}">
                ${isPaid ? 'Hoàn thành' : 'Chờ thanh toán'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderAchievements() {
    const list = document.getElementById('achievements-list');
    if (!list) return;

    const achievements = this.user.thanhTich || [];
    if (achievements.length === 0) {
      list.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">
          <i class="bi bi-trophy opacity-25" style="font-size: 3rem;"></i>
          <p class="mt-2">Chưa có thông tin thành tích được ghi nhận.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = achievements.map(t => {
      // Assuming t is a string or object based on dashboard.js lines 632-642
      // In dashboard.js, it expects t.giai, t.nam, t.huyChuong, t.noiDung
      // But in models.py it's List[str]
      // Let's handle both
      let title = '', subtitle = '';
      if (typeof t === 'string') {
        title = t;
        subtitle = 'Thành tích võ thuật';
      } else {
        title = `${t.giai} (${t.nam})`;
        subtitle = `Huy chương ${t.huyChuong} - ${t.noiDung}`;
      }

      return `
        <div class="col-md-6">
          <div class="d-flex align-items-center gap-3 p-3 rounded-4 bg-light border-start border-warning border-4 shadow-sm h-100">
            <div class="stat-icon bg-warning text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; flex-shrink: 0;">
              <i class="bi bi-award-fill fs-4"></i>
            </div>
            <div>
              <div class="fw-bold">${title}</div>
              <div class="small text-muted">${subtitle}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) { // 2MB
      this.showToast('Vui lòng chọn ảnh nhỏ hơn 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      
      try {
        const token = localStorage.getItem('vct_token');
        const res = await fetch(`${API_URL}/vs/update-profile`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ avatar: base64 })
        });
        
        const data = await res.json();
        if (res.ok) {
          this.user.avatar = base64;
          this.renderProfile();
          this.showToast('Cập nhật ảnh đại diện thành công!');
        } else {
          this.showToast(data.detail || 'Lỗi khi cập nhật ảnh.', 'error');
        }
      } catch (err) {
        this.showToast('Không thể kết nối đến máy chủ.', 'error');
      }
    };
    reader.readAsDataURL(file);
  },

  async changePassword() {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;
    const btn = document.getElementById('btn-save-pass');

    if (newPass !== confirmPass) {
      this.showToast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Đang xử lý...';

    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/vs/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
      });
      
      const data = await res.json();
      if (res.ok) {
        this.showToast('Đổi mật khẩu thành công!');
        document.getElementById('form-change-password').reset();
      } else {
        this.showToast(data.detail || 'Lỗi khi đổi mật khẩu.', 'error');
      }
    } catch (err) {
      this.showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Lưu mật khẩu mới';
    }
  },

  /* ── Helpers ─────────────────────────────────── */
  getInitials(name) {
    if (!name) return '?';
    const p = name.trim().split(' ');
    if (p.length === 1) return p[0][0].toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  },

  formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
  },

  formatMonth(m) {
    if (!m) return '';
    const [y, mm] = m.split('-');
    return `Tháng ${mm}/${y}`;
  },

  adjustColor(col, amt) {
    let usePound = false;
    if (col[0] == "#") {
      col = col.slice(1);
      usePound = true;
    }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  },

  showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `vct-toast toast-${type === 'error' ? 'error' : 'success'} show`;
    toast.innerHTML = `
      <div class="toast-body">
        <div class="toast-message">${msg}</div>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => VSApp.init());
