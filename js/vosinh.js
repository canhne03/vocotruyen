'use strict';

const API_URL = window.location.origin;

const VSApp = {
  user: null,
  ranking: [],
  cropper: null,

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
    document.getElementById('btn-trigger-upload')?.addEventListener('click', () => {
      document.getElementById('avatar-upload').click();
    });
    document.getElementById('avatar-upload')?.addEventListener('change', (e) => this.handleAvatarUpload(e));
    document.getElementById('btn-crop-save')?.addEventListener('click', () => this.applyCropAvatar());

    // Delete avatar
    document.getElementById('btn-delete-avatar')?.addEventListener('click', () => this.deleteAvatar());

    // Clean up cropper when modal closed
    document.getElementById('modal-crop-avatar')?.addEventListener('hidden.bs.modal', () => {
      if (this.cropper) {
        this.cropper.destroy();
        this.cropper = null;
      }
    });

    // Notification toggle
    document.getElementById('notif-bell-trigger')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('notif-dropdown')?.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      document.getElementById('notif-dropdown')?.classList.remove('show');
    });

    document.getElementById('notif-dropdown')?.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.getElementById('btn-mark-all-read')?.addEventListener('click', () => this.markAllNotificationsRead());

    document.getElementById('form-change-password')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.changePassword();
    });

    // Thêm sự kiện click vào sidebar mini-profile để về trang hồ sơ
    const miniProfile = document.getElementById('student-mini-profile');
    if (miniProfile) {
      miniProfile.style.cursor = 'pointer';
      miniProfile.addEventListener('click', () => {
        this.switchTab('profile');
      });
    }

    // Khoảng thời gian học phí (Tuition Filter)
    this.initTuitionFilter();
  },

  initTuitionFilter() {
    const statusFilter = document.getElementById('tuition-status-filter');
    if (!statusFilter) return;

    // Listen for changes
    statusFilter.addEventListener('change', () => this.renderTuition());
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
    const rankInfo = this.ranking.find(r => r.cap === vs.cap) || this.ranking[0];
    
    // Avatar
    const initials = this.getInitials(vs.tenVS);
    const mainAvatar = document.getElementById('main-vs-avatar');
    const sideAvatar = document.getElementById('side-vs-avatar');
    const liDelete = document.getElementById('li-delete-avatar');
    
    if (vs.avatar) {
      mainAvatar.innerHTML = `<img src="${vs.avatar}" alt="Avatar">`;
      sideAvatar.innerHTML = `<img src="${vs.avatar}" alt="Avatar">`;
      mainAvatar.style.background = 'none';
      sideAvatar.style.background = 'none';
      if (liDelete) liDelete.style.display = 'block';
    } else {
      mainAvatar.textContent = initials;
      sideAvatar.textContent = initials;
      mainAvatar.style.background = rankInfo.hexDai;
      mainAvatar.style.color = '#fff';
      sideAvatar.style.background = '';
      if (liDelete) liDelete.style.display = 'none';
    }

    // Name & ID
    document.getElementById('vs-display-name').textContent = vs.tenVS;
    document.getElementById('vs-display-id').textContent = vs.msVS;
    document.getElementById('side-vs-name').textContent = vs.tenVS;
    document.getElementById('side-vs-id').textContent = vs.msVS;

    // Belt Images Header
    const beltUrl = `img/cap${vs.cap}.jpg`;
    const beltImg = document.getElementById('vs-belt-img');
    const beltImgMob = document.getElementById('vs-belt-img-mobile');
    if (beltImg) beltImg.src = beltUrl;
    if (beltImgMob) beltImgMob.src = beltUrl;

    // ── Personal Info ──
    document.getElementById('vs-level').textContent = rankInfo.trinhDo;
    document.getElementById('vs-rank').textContent = `Cấp ${vs.cap}`;
    document.getElementById('vs-belt-color').textContent = rankInfo.colorName;
    document.getElementById('vs-exam-date-personal').textContent = this.formatDate(vs.ngayThi);
    document.getElementById('vs-dob').textContent = vs.namSinh || '—';
    document.getElementById('vs-gender').textContent = vs.gioiTinh || '—';
    document.getElementById('vs-address').textContent = vs.diaChi || 'Chưa cập nhật';
    document.getElementById('vs-status').textContent = vs.trangThai || 'Đang học';
    
    // Placeholder for phone (not in DB yet)
    const phoneEl = document.getElementById('vs-phone');
    if (phoneEl) phoneEl.textContent = vs.sdt || 'Chưa cập nhật';

    // Gender icon fix
    const genderIcon = document.getElementById('vs-gender-icon');
    if (genderIcon) {
      genderIcon.className = 'bi';
      if (vs.gioiTinh === 'Nam') {
        genderIcon.classList.add('bi-gender-male', 'text-primary');
      } else if (vs.gioiTinh === 'Nữ') {
        genderIcon.classList.add('bi-gender-female', 'text-danger');
      } else {
        genderIcon.classList.add('bi-gender-ambiguous', 'text-muted');
      }
    }

    // ── Training Info ──
    document.getElementById('vs-club-name').textContent = vs.tenCLB || `CLB Mã: ${vs.msCLB}`;
    document.getElementById('vs-hlv-name').textContent = vs.tenHLV || `HLV Mã: ${vs.msHLV}`;
    document.getElementById('vs-enroll-date').textContent = this.formatDate(vs.ngayNhapHoc);

    // Exam status mapping
    const examStatusMap = {
      'cho_xac_nhan': '⏳ Chờ xác nhận',
      'da_xac_nhan': '✅ Đã xác nhận',
      'khong_dat': '❌ Không đạt',
      'dat': '✅ Đạt'
    };
    document.getElementById('vs-exam-status').textContent = vs.trangThaiThi ? (examStatusMap[vs.trangThaiThi] || vs.trangThaiThi) : 'Chưa có';
  },

  renderAll() {
    this.renderProfile();
    this.renderTuition();
    this.renderAchievements();
    this.renderNotifications();
  },

  renderNotifications() {
    const notifications = this.user.thongBao || [];
    
    // Tính toán số lượng thông báo cần chú ý (Unread + Unpaid Tuition)
    const visualUnreadNotifs = notifications.filter(n => {
      if (!n.daXem) return true; // Chưa đọc hoàn toàn
      
      // Nếu đã xem nhưng là nhắc học phí, kiểm tra xem có tháng nào chưa đóng không
      if (n.loai === 'hoc_phi' && n.thang && Array.isArray(n.thang)) {
        return n.thang.some(month => !this.user.hocPhi || this.user.hocPhi[month] !== true);
      }
      return false;
    });
    
    const unreadCount = visualUnreadNotifs.length;
    
    // Badge
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
      
      // Thêm hiệu ứng rung nếu có tin khẩn cấp
      const bell = document.querySelector('.bi-bell-fill');
      if (bell) {
        if (unreadCount > 0) bell.classList.add('bi-bell-fill-animated');
        else bell.classList.remove('bi-bell-fill-animated');
      }
    }

    // List
    const list = document.getElementById('notif-list');
    if (list) {
      if (notifications.length === 0) {
        list.innerHTML = '<div class="notif-empty">Chưa có thông báo nào</div>';
      } else {
        const sorted = [...notifications].sort((a,b) => (new Date(b.ngayTao || 0)) - (new Date(a.ngayTao || 0)));
        list.innerHTML = sorted.map(n => {
          // Xác định xem tin này có thuộc diện "Cần xử lý" (Persistent) không
          const isPersistent = n.loai === 'hoc_phi' && n.thang && Array.isArray(n.thang) && n.thang.some(m => !this.user.hocPhi || this.user.hocPhi[m] !== true);
          const needsAttention = !n.daXem || isPersistent;
          
          let displayTime = 'Vừa xong';
          if (n.ngayTao) {
             const d = new Date(n.ngayTao);
             if (!isNaN(d.getTime())) {
                const hours = d.getHours().toString().padStart(2, '0');
                const mins = d.getMinutes().toString().padStart(2, '0');
                const day = d.getDate().toString().padStart(2, '0');
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const year = d.getFullYear();
                displayTime = `${hours}:${mins} - ${day}/${month}/${year}`;
             }
          }

          return `
            <div class="notif-item ${needsAttention ? 'unread' : ''}" onclick="VSApp.markNotificationRead('${n.id}')">
              <div class="notif-main">
                <span class="notif-icon-inline ${n.loai || 'general'}">
                  <i class="bi ${n.loai === 'hoc_phi' ? 'bi-cash-stack' : 'bi-info-circle-fill'}"></i>
                </span>
                <span class="notif-text" style="${isPersistent && n.daXem ? 'color: var(--text-primary);' : ''}">
                  ${n.noiDung}
                  ${isPersistent && n.daXem ? '<small class="text-danger mt-1 d-block"><i class="bi bi-clock-history"></i> Đã xem - Chưa đóng phí</small>' : ''}
                </span>
              </div>
              <div class="notif-time">${displayTime}</div>
            </div>
          `;
        }).join('');
      }
    }
  },

  async markNotificationRead(id) {
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/vs/mark-notification-read/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const n = this.user.thongBao.find(not => not.id === id);
        if (n) n.daXem = true;
        this.renderNotifications();
      }
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  },

  async markAllNotificationsRead() {
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/vs/mark-all-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (this.user.thongBao) {
            this.user.thongBao.forEach(n => n.daXem = true);
        }
        this.renderNotifications();
        this.showToast('Đã xem tất cả thông báo');
      }
    } catch (e) {
      console.error('Error marking all notifications read:', e);
    }
  },

  renderTuition() {
    const grid = document.getElementById('tuition-grid');
    const summary = document.getElementById('tuition-summary');
    const statusFilter = document.getElementById('tuition-status-filter');
    if (!grid || !summary) return;

    const hocPhi = this.user.hocPhi || {};
    const ngayNhapHoc = this.user.ngayNhapHoc || '2024-01-01'; // Default if missing
    
    // Tạo danh sách tháng từ ngày nhập học đến hiện tại
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const start = new Date(ngayNhapHoc);
    const end = new Date();
    let allGeneratedMonths = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      allGeneratedMonths.push(key);
      current.setMonth(current.getMonth() + 1);
    }
    
    // Sắp xếp mới nhất lên đầu
    allGeneratedMonths.reverse();

    // 1. Summary Calculation (Luôn tính trên tất cả các tháng)
    const paidMonths = allGeneratedMonths.filter(m => hocPhi[m] === true).length;
    const unpaidMonths = allGeneratedMonths.length - paidMonths;
    const currentStatus = hocPhi[currentKey];

    // Filter by status if selected
    let displayedMonths = [...allGeneratedMonths];
    if (statusFilter?.value === 'paid') {
      displayedMonths = displayedMonths.filter(m => hocPhi[m] === true);
    } else if (statusFilter?.value === 'unpaid') {
      displayedMonths = displayedMonths.filter(m => hocPhi[m] !== true);
    }

    // Render Summary
    summary.innerHTML = `
      <div class="tuition-stat-card current-month-card-new shadow-sm">
        <div class="stat-icon-circle bg-warning-subtle text-warning shadow-sm">
          <i class="bi bi-calendar-event-fill"></i>
        </div>
        <div class="stat-info">
          <div class="text-muted small fw-bold text-uppercase">Tháng hiện tại</div>
          <div class="fs-5 fw-bold text-dark">${now.getMonth() + 1}/${now.getFullYear()}</div>
          <div class="small fw-bold ${currentStatus === true ? 'text-success' : (currentStatus === false ? 'text-danger' : 'text-muted')}">
            ${currentStatus === true ? '<i class="bi bi-patch-check-fill me-1"></i>Đã đóng' : (currentStatus === false ? '<i class="bi bi-exclamation-triangle-fill me-1"></i>Chưa đóng' : 'Chưa có thông tin')}
          </div>
        </div>
      </div>
      <div class="tuition-stat-card shadow-sm">
        <div class="stat-icon-circle bg-success-subtle text-success shadow-sm">
          <i class="bi bi-check-circle-fill"></i>
        </div>
        <div class="stat-info">
          <div class="text-muted small fw-bold text-uppercase">Đã hoàn tất</div>
          <div class="fs-4 fw-bold text-success">${paidMonths} <small class="fs-6 text-muted fw-normal">tháng</small></div>
        </div>
      </div>
      <div class="tuition-stat-card shadow-sm">
        <div class="stat-icon-circle bg-danger-subtle text-danger shadow-sm">
           <i class="bi bi-hourglass-split"></i>
        </div>
        <div class="stat-info">
          <div class="text-muted small fw-bold text-uppercase">Còn nợ</div>
          <div class="fs-4 fw-bold text-danger">${unpaidMonths} <small class="fs-6 text-muted fw-normal">tháng</small></div>
        </div>
      </div>
    `;

    // 2. Render History Slider
    if (displayedMonths.length === 0) {
      grid.innerHTML = `
        <div class="w-100 text-center py-3 text-muted bg-light rounded-4 border border-dashed">
          <i class="bi bi-calendar-x opacity-25" style="font-size: 2.5rem;"></i>
          <p class="mt-2 fw-semibold small">Không tìm thấy dữ liệu phù hợp với bộ lọc.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = displayedMonths.map(m => {
      const isPaid = hocPhi[m];
      const [year, month] = m.split('-');
      return `
        <div class="month-card-new ${isPaid ? 'paid' : 'unpaid'}">
          <div class="month-name">Tháng ${month}</div>
          <div class="year-name">${year}</div>
          <div class="status-badge">
            ${isPaid ? 'Đã đóng' : 'Chưa đóng'}
          </div>
        </div>
      `;
    }).join('');

    // Optional: Auto-scroll to first item
    grid.scrollLeft = 0;
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
      // Assuming t is a string or object based on hlv.js
      // In hlv.js, it expects t.giai, t.nam, t.huyChuong, t.noiDung
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

    if (file.size > 1024 * 1024 * 5) { // Tăng lên 5MB vì sẽ được crop lại
      this.showToast('Vui lòng chọn ảnh nhỏ hơn 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.getElementById('image-to-crop');
      img.src = event.target.result;
      
      const modal = new bootstrap.Modal(document.getElementById('modal-crop-avatar'));
      modal.show();

      // Khởi tạo Cropper sau khi modal hiển thị hoàn toàn
      document.getElementById('modal-crop-avatar').addEventListener('shown.bs.modal', () => {
        if (this.cropper) this.cropper.destroy();
        this.cropper = new Cropper(img, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 1,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
        });
      }, { once: true });
    };
    reader.readAsDataURL(file);
    // Reset input để có thể chọn lại cùng 1 file
    e.target.value = '';
  },

  async applyCropAvatar() {
    if (!this.cropper) return;

    const btn = document.getElementById('btn-crop-save');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Đang lưu...';

    try {
      const canvas = this.cropper.getCroppedCanvas({
        width: 400,
        height: 400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      const base64 = canvas.toDataURL('image/jpeg', 0.9);
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
        this.showToast('Cập nhật nội dung ảnh đại diện thành công!');
        bootstrap.Modal.getInstance(document.getElementById('modal-crop-avatar')).hide();
      } else {
        this.showToast(data.detail || 'Lỗi khi cập nhật ảnh.', 'error');
      }
    } catch (err) {
      this.showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async deleteAvatar() {
    const result = await Swal.fire({
      title: 'Xóa ảnh đại diện?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      reverseButtons: true,
      customClass: {
        popup: 'vct-swal-popup'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/vs/update-profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deleteAvatar: true })
      });
      
      const data = await res.json();
      if (res.ok) {
        this.user.avatar = null;
        this.renderProfile();
        this.showToast('Đã xóa ảnh đại diện.');
      } else {
        this.showToast(data.detail || 'Lỗi khi xóa ảnh.', 'error');
      }
    } catch (err) {
      this.showToast('Không thể kết nối đến máy chủ.', 'error');
      console.error(err);
    }
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
        // Quay về trang hồ sơ sau khi đổi mật khẩu thành công
        setTimeout(() => this.switchTab('profile'), 500);
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
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'vct-swal-toast'
      },
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    Toast.fire({
      icon: type === 'error' ? 'error' : 'success',
      title: msg
    });
  }
};

document.addEventListener('DOMContentLoaded', () => VSApp.init());
