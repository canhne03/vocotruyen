'use strict';
// ===== HLV.JS — Trang quản lý dành cho Huấn luyện viên =====

const API_URL = window.location.origin;

const App = {
  voSinh: [],
  ranking: [],
  currentHLV: null,
  currentTab: 'profile',
  deleteTarget: null,
  deleteResetTarget: null,
  cropper: null,
  croppedImage: null,

  /* ── Khởi tạo ─────────────────────────────────── */
  async init() {
    this.setHeaderDate();
    const token = localStorage.getItem('vct_token');
    if (!token) {
      window.location.href = 'index.html';
      return;
    }
    await this.loadData();
    this.setupUI();
    this.renderAll();
    this.switchTab(this.currentTab);
  },

  /* ── Tiêu đề Ngày tháng ───────────────────────── */
  setHeaderDate() {
    const el = document.getElementById('header-date');
    if (!el) return;
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const formatted = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    el.innerHTML = `<i class="bi bi-calendar3 me-2 text-vct"></i> ${formatted}`;
  },

  /* ── Tải Dữ liệu ──────────────────────────────── */
  async loadData() {
    try {
      const token = localStorage.getItem('vct_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [hlv, vs, r] = await Promise.all([
        fetch(`${API_URL}/hlv/me`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_URL}/students`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_URL}/rankings`).then(r => r.json())
      ]);

      if (!hlv) {
        localStorage.removeItem('vct_token');
        window.location.href = 'index.html';
        return;
      }

      this.currentHLV = hlv;
      this.voSinh = vs;
      this.ranking = r;
    } catch (e) {
      this.toast('Lỗi kết nối máy chủ', true);
    }
  },

  async saveVoSinh() {
    // Với Backend, chúng ta không lưu toàn bộ mảng vào localStorage.
    // Chúng ta đã có các API endpoint cho việc cập nhật từng võ sinh.
    // Phương thức này có thể giữ lại để đảm bảo tính nhất quán của UI nếu cần ở nơi khác.
  },

  async saveHLV() {
    // Tương tự như saveVoSinh, chúng ta sử dụng các gọi API cụ thể như add_club.
  },

  /* ── Thiết lập Giao diện (UI Setup) ───────────── */
  setupUI() {
    // Xử lý Custom Popup
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const popup = e.target.closest('.vct-popup-overlay');
        if (popup) popup.classList.remove('show-popup');
      });
    });

    document.querySelectorAll('.vct-popup-overlay').forEach(overlay => {
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay && overlay.getAttribute('data-bs-backdrop') !== 'static') {
          overlay.classList.remove('show-popup');
        }
      });
    });

    // Đóng dropdown khi nhấp ra ngoài
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.actions-cell') && !e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
      }
    });

    // Điều hướng Sidebar
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    
    // Tự động tính MS khi đổi CLB (chỉ khi đang thêm mới)
    const vsClbSelect = document.getElementById('vs-clb');
    if (vsClbSelect) {
      vsClbSelect.addEventListener('change', (e) => {
        if (!document.getElementById('vs-edit-id').value) {
          document.getElementById('vs-ms').value = this.generateMsVS(e.target.value);
        }
      });
    }

    // Bật/tắt Sidebar (mobile)
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggle) toggle.addEventListener('click', () => this.toggleSidebar());
    if (overlay) overlay.addEventListener('click', () => this.closeSidebar());

    // Thông tin Huấn luyện viên
    if (this.currentHLV) {
      const initials = this.getInitials(this.currentHLV.tenHLV);
      const avatar = document.getElementById('coach-avatar');
      const name = document.getElementById('coach-name');
      if (avatar) avatar.textContent = initials;
      if (name) name.textContent = this.currentHLV.tenHLV;
    }

    // Nút thêm võ sinh
    document.getElementById('btn-add-vs')?.addEventListener('click', () => this.openAddVS());

    // Nút thêm lớp học
    document.getElementById('btn-add-class')?.addEventListener('click', () => this.openAddClass());

    // Biểu mẫu võ sinh (Student form)
    document.getElementById('form-vs')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveVS();
    });

    // Biểu mẫu lớp học (Class form)
    document.getElementById('form-class')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addClass();
    });

    // Nút lưu xác nhận cấp lại mật khẩu
    document.getElementById('btn-confirm-reset-save')?.addEventListener('click', () => {
      this.confirmReset();
    });

    // Tìm kiếm võ sinh
    document.getElementById('search-student')?.addEventListener('input', () => this.renderStudents());

    // Bộ lọc CLB (võ sinh)
    const filterClub = document.getElementById('filter-club');
    if (filterClub) {
      filterClub.addEventListener('change', () => this.renderStudents());
    }

    // Nút xác nhận xóa yêu cầu mật khẩu
    document.getElementById('btn-do-delete-req')?.addEventListener('click', () => {
      this.doRejectResetRequest();
    });

    // Nút xác nhận ngưng hoạt động
    document.getElementById('btn-do-suspend')?.addEventListener('click', () => {
      this.doSuspend();
    });

    // Điền dữ liệu cho các bộ lọc
    document.querySelector('.sidebar-back')?.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('vct_session');
      localStorage.removeItem('vct_token');
      window.location.href = '/';
    });

    // Ngày báo cáo đơn tháng
    document.getElementById('report-month')?.addEventListener('change', () => this.renderTuitionOverview());

    // --- Profile Listeners ---
    document.getElementById('sidebar-coach')?.addEventListener('click', () => {
      this.switchTab('profile');
    });
    
    document.getElementById('btn-trigger-upload')?.addEventListener('click', () => {
      document.getElementById('hlv-avatar-upload').click();
    });
    document.getElementById('hlv-avatar-upload')?.addEventListener('change', (e) => this.handleAvatarUpload(e));
    document.getElementById('btn-crop-save')?.addEventListener('click', () => this.saveCroppedAvatar());
    document.getElementById('btn-delete-avatar')?.addEventListener('click', () => this.deleteAvatar());
    document.getElementById('form-hlv-password')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.changeHLVPassword();
    });

    // Học phí - Khởi tạo bộ lọc tháng (Lịch thật)
    this.initTuitionFilters();

    // Điền dữ liệu cho các bộ lọc
    this.populateFilters();
  },

  initTuitionFilters() {
    const startInput = document.getElementById('tuition-month-start');
    const endInput = document.getElementById('tuition-month-end');
    if (!startInput || !endInput) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    startInput.value = currentMonth;
    endInput.value = currentMonth;

    [startInput, endInput].forEach(el => {
      el.addEventListener('change', () => this.renderTuition());
    });

    document.getElementById('tuition-club-filter')?.addEventListener('change', () => this.renderTuition());
    
    // Lắng nghe bộ lọc nợ phí
    document.getElementById('filter-debt-only')?.addEventListener('change', () => this.renderTuition());
  },

  /* ── Điền Dữ liệu Lọc ────────────────────────── */
  populateFilters() {
    const clubs = this.getClubs();
    const clubOptions = clubs.map(c => `<option value="${c.msCLB}">${c.tenCLB}</option>`).join('');

    // Bộ lọc võ sinh
    const filterClub = document.getElementById('filter-club');
    if (filterClub) {
      filterClub.innerHTML = clubOptions;
      if (clubs.length) filterClub.value = clubs[0].msCLB;
    }

    // Bộ lọc học phí
    const tuitionFilter = document.getElementById('tuition-club-filter');
    if (tuitionFilter && clubs.length) {
      tuitionFilter.innerHTML = clubOptions;
      tuitionFilter.value = clubs[0].msCLB;
    }

    // Bộ chọn tháng (cho các select cũ còn lại như Report/Overview)
    const months = this.getAllMonths();
    const monthOptions = months.map(m => `<option value="${m}">${this.formatMonth(m)}</option>`).join('');

    const overviewMonth = document.getElementById('overview-month');
    if (overviewMonth) {
      overviewMonth.innerHTML = monthOptions;
      overviewMonth.value = months[months.length - 1] || '';
    }

    const reportMonth = document.getElementById('report-month');
    if (reportMonth && months.length) reportMonth.value = months[months.length - 1];

    // Điền dữ liệu cho các select trong biểu mẫu
    this.populateFormSelects();
  },

  populateFormSelects() {
    const clubs = this.getClubs();

    // Select CLB trong biểu mẫu
    const vsClb = document.getElementById('vs-clb');
    if (vsClb) {
      vsClb.innerHTML = clubs.map(c => `<option value="${c.msCLB}">${c.tenCLB}</option>`).join('');
    }

    // Select Cấp đai
    const vsDangCap = document.getElementById('vs-dangcap');
    if (vsDangCap) {
      vsDangCap.innerHTML = this.ranking.map(r =>
        `<option value="${r.cap}">Cấp ${r.cap}</option>`
      ).join('');

      // Gán sự kiện change để đồng bộ Trình độ & Màu đai
      vsDangCap.onchange = (e) => this.updateRankingInfo(e.target.value);
    }
  },

  updateRankingInfo(cap) {
    const info = this.ranking.find(r => r.cap == cap);
    if (!info) return;

    // Cập nhật Trình độ (readonly) - Chỉ ghi giá trị thuộc tính, không thêm số sọc
    const vsTrinhdo = document.getElementById('vs-trinhdo');
    if (vsTrinhdo) {
      vsTrinhdo.value = info.trinhDo;
    }

    // Cập nhật ảnh đai thực tế (Compact layout)
    const vsBeltImg = document.getElementById('vs-belt-img');
    if (vsBeltImg) {
      vsBeltImg.src = `img/cap${info.cap}.jpg`;
      vsBeltImg.onerror = () => { vsBeltImg.src = 'img/default-belt.jpg'; };
    }
  },

  /* ── Điều hướng Tab ──────────────────────────── */
  switchTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach(el => {
      el.classList.toggle('active', el.id === `tab-${tab}`);
    });

    const titles = {
      overview: 'Tổng quan',
      students: 'Danh sách Võ sinh',
      tuition: 'Quản lý Học phí',
      classes: 'Lớp học',
      suspended: 'Ngưng hoạt động',
      'reset-password': 'Cấp lại Mật khẩu',
      profile: 'Hồ sơ HLV',
      security: 'Bảo mật'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[tab] || '';

    this.closeSidebar();

    // Render lại khi chuyển tab
    if (tab === 'overview') this.renderOverview();
    if (tab === 'students') this.renderStudents();
    if (tab === 'tuition') { this.renderTuition(); }
    if (tab === 'classes') this.renderClasses();
    if (tab === 'suspended') this.renderSuspended();
    if (tab === 'reset-password') this.loadResetRequests();
    if (tab === 'profile') this.renderProfile();
  },

  /* ── Hiển thị tất cả (Render All) ───────────── */
  renderAll() {
    this.renderOverview();
    this.renderStudents();
    this.renderTuition();
    this.renderTuitionOverview();
    this.renderClasses();
    this.renderSuspended();
    this.renderProfile();
  },

  /* ── Lấy danh sách Võ sinh của HLV hiện tại ─── */
  getMyStudents() {
    if (!this.currentHLV) return [];
    return this.voSinh.filter(vs => vs.msHLV === this.currentHLV.msHLV && vs.trangThai !== 'Ngưng hoạt động');
  },

  getAllMyStudents() {
    if (!this.currentHLV) return [];
    return this.voSinh.filter(vs => vs.msHLV === this.currentHLV.msHLV);
  },

  getClubs() {
    if (!this.currentHLV) return [];
    return this.currentHLV.clubs || [];
  },

  getAllMonths() {
    const months = new Set();
    this.getMyStudents().forEach(vs => {
      if (vs.hocPhi) {
        Object.keys(vs.hocPhi).forEach(m => months.add(m));
      }
    });
    return [...months].sort();
  },

  /* ── Tổng quan ───────────────────────────────── */
  renderOverview() {
    const students = this.getMyStudents();
    const clubs = this.getClubs();
    const month = document.getElementById('overview-month')?.value || this.getAllMonths().pop() || '';

    // Stats
    document.getElementById('stat-total-vs').textContent = students.length;
    document.getElementById('stat-clubs').textContent = clubs.length;

    let paid = 0, unpaid = 0;
    students.forEach(vs => {
      if (vs.hocPhi && vs.hocPhi[month]) paid++;
      else unpaid++;
    });
    document.getElementById('stat-paid').textContent = paid;
    document.getElementById('stat-unpaid').textContent = unpaid;

    // Tóm tắt theo Câu lạc bộ (CLB)
    const grid = document.getElementById('overview-clubs-grid');
    if (grid) {
      grid.innerHTML = clubs.map(club => {
        const clubStudents = students.filter(vs => vs.msCLB === club.msCLB);
        const clubPaid = clubStudents.filter(vs => vs.hocPhi && vs.hocPhi[month]).length;
        const total = clubStudents.length;
        const pct = total ? Math.round((clubPaid / total) * 100) : 0;
        return `
          <div class="club-summary-card">
            <h4>${club.tenCLB}</h4>
            <div class="club-addr">${club.diaChi}</div>
            <div class="club-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width:${pct}%"></div>
              </div>
              <span class="progress-text">${clubPaid}/${total} (${pct}%)</span>
            </div>
          </div>`;
      }).join('');
    }

    // Võ sinh mới nhập học
    const recent = document.getElementById('overview-recent');
    if (recent) {
      const sorted = [...students].sort((a, b) => (b.ngayNhapHoc || '').localeCompare(a.ngayNhapHoc || '')).slice(0, 6);
      recent.innerHTML = sorted.map(vs => {
        const rankInfo = this.ranking.find(r => r.cap === vs.cap) || this.ranking[0];
        return `
          <div class="recent-card">
            <div class="recent-avatar" style="background:${rankInfo.hexDai}">${this.getInitials(vs.tenVS)}</div>
            <div class="recent-info">
              <div class="recent-id">${vs.msVS}</div>
              <div class="recent-name">${vs.tenVS}</div>
              <div class="recent-meta">Cấp ${vs.cap} · ${this.formatDate(vs.ngayNhapHoc)}</div>
            </div>
          </div>`;
      }).join('');
    }
  },

  /* ── Danh sách Võ sinh ───────────────────────── */
  renderStudents() {
    const tbody = document.getElementById('student-tbody');
    const empty = document.getElementById('empty-students');
    if (!tbody) return;

    let students = this.getMyStudents();

    // Lọc theo CLB
    const club = document.getElementById('filter-club')?.value;
    if (club) students = students.filter(vs => vs.msCLB === club);

    // Lọc theo tìm kiếm
    const q = (document.getElementById('search-student')?.value || '').trim().toLowerCase();
    if (q) {
      students = students.filter(vs =>
        vs.tenVS.toLowerCase().includes(q) ||
        vs.msVS.includes(q)
      );
    }

    if (!students.length) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = students.map(vs => {
      const rankInfo = this.ranking.find(r => r.cap === vs.cap) || this.ranking[0];
      return `
        <tr>
          <td><div class="vs-id-sub">${vs.msVS}</div> <strong>${vs.tenVS}</strong></td>
          <td>${vs.namSinh || '—'}</td>
          <td>${vs.gioiTinh || '—'}</td>
          <td>
            <span class="belt-badge" style="background:${rankInfo.hexDai}15; color:${rankInfo.hexDai}">
              <span class="belt-dot" style="background:${rankInfo.hexDai}"></span>
              Cấp ${vs.cap} · ${rankInfo.colorName}
            </span>
          </td>
          <td>${vs.tenCLB || vs.msCLB}</td>
          <td>
            <div class="dropdown actions-cell">
              <button class="btn btn-sm btn-light border btn-dots" type="button" 
                data-bs-toggle="dropdown" 
                data-bs-boundary="viewport"
                data-bs-config='{"popperConfig": {"strategy": "fixed"}}'
                aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2" onclick="App.openViewVS('${vs.msVS}')">
                    <i class="bi bi-eye text-primary"></i> Xem chi tiết
                  </button>
                </li>
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2" onclick="App.openEditVS('${vs.msVS}')">
                    <i class="bi bi-pencil text-success"></i> Sửa
                  </button>
                </li>
                <li>
                  <button class="dropdown-item d-flex align-items-center gap-2 text-danger" onclick="App.suspendVS('${vs.msVS}')">
                    <i class="bi bi-person-x"></i> Ngưng hoạt động
                  </button>
                </li>
              </ul>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  renderSuspended() {
    const tbody = document.getElementById('suspended-tbody');
    const empty = document.getElementById('empty-suspended');
    if (!tbody) return;

    let students = this.getAllMyStudents().filter(vs => vs.trangThai === 'Ngưng hoạt động');

    if (!students.length) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = students.map(vs => {
      const rankInfo = this.ranking.find(r => r.cap === vs.cap) || this.ranking[0];
      const clubInfo = this.getClubs().find(c => c.msCLB === vs.msCLB);
      return `
          <td>
            <div class="vs-id-sub">${vs.msVS}</div> <strong>${vs.tenVS}</strong>
          </td>
          <td>${vs.namSinh || '—'}</td>
          <td>${vs.gioiTinh || '—'}</td>
          <td>
            <span class="belt-badge" style="background:${rankInfo.hexDai}15; color:${rankInfo.hexDai}">
              <span class="belt-dot" style="background:${rankInfo.hexDai}"></span>
              Cấp ${vs.cap}
            </span>
          </td>
          <td>${clubInfo ? clubInfo.tenCLB : vs.msCLB}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-sm btn-success d-flex align-items-center justify-content-center gap-2 btn-activate-vs" onclick="App.activateVS('${vs.msVS}')">
                <i class="bi bi-check-lg"></i>
                <span class="d-none d-sm-inline">Kích hoạt</span>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  toggleDropdown(e, id) {
    // Dựa vào dropdown gốc của Bootstrap
  },

  async suspendVS(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;

    const result = await Swal.fire({
      title: 'Ngưng hoạt động?',
      html: `Bạn có chắc chắn muốn cho võ sinh <strong>${vs.tenVS}</strong> ngưng hoạt động không?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6e7881',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      reverseButtons: true,
      width: '380px', /* Thiết lập trực tiếp trong JS để đảm bảo */
      customClass: { popup: 'vct-swal-popup' }
    });

    if (!result.isConfirmed) return;

    const oldStatus = vs.trangThai;
    vs.trangThai = 'Ngưng hoạt động';
    
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/students/${msVS}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(vs)
      });
      if (!res.ok) throw new Error();
      this.toast('Đã chuyển võ sinh sang Ngưng hoạt động!');
      this.renderAll();
    } catch (e) {
      vs.trangThai = oldStatus;
      this.toast('Lỗi khi cập nhật trạng thái', true);
    }
  },

  async doSuspend() {
    // Đã gộp vào suspendVS
  },

  async activateVS(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;
    const oldStatus = vs.trangThai;
    vs.trangThai = 'Đang học';
    
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/students/${msVS}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(vs)
      });
      if (!res.ok) throw new Error();
      this.toast('Đã kích hoạt lại võ sinh!');
      this.renderAll();
    } catch (e) {
      vs.trangThai = oldStatus;
      this.toast('Lỗi khi kích hoạt lại', true);
    }
  },

  /* ── CRUD: Thêm/Sửa Võ sinh ──────────────────── */
  openViewVS(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;

    const rankInfo = this.ranking.find(r => r.cap === vs.cap) || this.ranking[0];
    const clubInfo = this.getClubs().find(c => c.msCLB === vs.msCLB);

    let html = `
      <div class="student-profile-header mb-4 d-flex align-items-center gap-3 p-3 rounded bg-light border">
        <div class="profile-avatar-large" style="background:${rankInfo.hexDai}; width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:1.5rem; font-weight:bold; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          ${this.getInitials(vs.tenVS)}
        </div>
        <div>
          <h4 class="mb-1 fw-bold">${vs.tenVS}</h4>
          <div class="text-muted small"><i class="bi bi-person-badge me-1"></i> Mã số: <strong>${vs.msVS}</strong></div>
          <div class="mt-2">
            <span class="belt-badge" style="background:${rankInfo.hexDai}15; color:${rankInfo.hexDai}; border: 1px solid ${rankInfo.hexDai}30;">
              <span class="belt-dot" style="background:${rankInfo.hexDai}"></span>
              Cấp ${vs.cap} · ${rankInfo.colorName}
            </span>
          </div>
        </div>
      </div>
      
      <div class="profile-grid">
        <div class="profile-section">
          <h6 class="section-title border-bottom pb-2 mb-3"><i class="bi bi-info-circle me-2"></i>Thông tin cá nhân</h6>
          <div class="row g-3">
            <div class="col-6">
              <label class="info-label">Năm sinh</label>
              <div class="info-value">${vs.namSinh || '—'}</div>
            </div>
            <div class="col-6">
              <label class="info-label">Giới tính</label>
              <div class="info-value">${vs.gioiTinh || '—'}</div>
            </div>
            <div class="col-6">
              <label class="info-label">Số điện thoại</label>
              <div class="info-value"><strong>${vs.sdt || '—'}</strong></div>
            </div>
            <div class="col-12">
              <label class="info-label">Địa chỉ</label>
              <div class="info-value text-break">${vs.diaChi || '—'}</div>
            </div>
          </div>
        </div>

        <div class="profile-section mt-4">
          <h6 class="section-title border-bottom pb-2 mb-3"><i class="bi bi-activity me-2"></i>Hoạt động & Chuyên môn</h6>
          <div class="row g-3">
            <div class="col-6">
              <label class="info-label">Câu lạc bộ</label>
              <div class="info-value">${clubInfo ? clubInfo.tenCLB : vs.msCLB}</div>
            </div>
            <div class="col-6">
              <label class="info-label">Ngày nhập học</label>
              <div class="info-value">${this.formatDate(vs.ngayNhapHoc)}</div>
            </div>
            <div class="col-6">
              <label class="info-label">Ngày thi gần nhất</label>
              <div class="info-value">${this.formatDate(vs.ngayThi)}</div>
            </div>
            <div class="col-6">
              <label class="info-label">Trạng thái thi</label>
              <div class="info-value">
                ${vs.trangThaiThi === 0 ? '<span class="badge bg-secondary">Chưa thi</span>' : 
                  vs.trangThaiThi === 1 ? '<span class="badge bg-success">Đủ điều kiện</span>' :
                  vs.trangThaiThi === 2 ? '<span class="badge bg-warning">Chờ duyệt</span>' : '—'}
              </div>
            </div>
          </div>
        </div>

        <div class="profile-section mt-4">
          <h6 class="section-title border-bottom pb-2 mb-3"><i class="bi bi-shield-lock me-2"></i>Bảo mật</h6>
          <div class="row g-3">
            <div class="col-6">
              <label class="info-label">Mật khẩu</label>
              <div class="info-value"><code>${vs.password}</code></div>
            </div>
            <div class="col-6">
              <label class="info-label">Trạng thái đổi MK</label>
              <div class="info-value">${vs.doiPass ? '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Đã đổi</span>' : '<span class="text-muted">Mặc định</span>'}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (vs.thanhTich && vs.thanhTich.length) {
      html += `
        <div class="profile-section mt-4">
          <h6 class="section-title border-bottom pb-2 mb-3"><i class="bi bi-trophy me-2"></i>Thành tích thi đấu</h6>
          <div class="achievement-list">`;
      vs.thanhTich.forEach(t => { 
        html += `
          <div class="achievement-item d-flex align-items-center gap-2 mb-1 p-2 rounded bg-light border-start border-primary border-4">
            <i class="bi bi-award text-warning"></i>
            <span><strong>${t.giai}</strong> (${t.nam}) - Huy chương ${t.huyChuong} (${t.noiDung})</span>
          </div>`; 
      });
      html += `</div></div>`;
    }

    document.getElementById('view-vs-body').innerHTML = html;
    this.openModal('modal-view-vs');
  },

  openAddVS() {
    document.getElementById('modal-vs-title').textContent = 'Thêm Võ sinh mới';
    document.getElementById('vs-edit-id').value = '';
    document.getElementById('form-vs').reset();

    // Mở khóa trường tên, dọn/khóa mã số
    const tenInput = document.getElementById('vs-ten');
    tenInput.readOnly = false;
    tenInput.classList.remove('bg-light');
    
    document.getElementById('vs-ms').value = '';
    document.getElementById('vs-ms').placeholder = 'Tự động tạo';

    // Tự động tạo mã số và mật khẩu dựa trên CLB và Năm sinh
    this.populateFormSelects();
    const msVSInput = document.getElementById('vs-ms');
    const namSinhInput = document.getElementById('vs-namsinh');
    const clbSelect = document.getElementById('vs-clb');
    const passwordInput = document.getElementById('vs-password');

    // Khởi tạo mã số lần đầu
    msVSInput.value = this.generateMsVS(clbSelect.value);

    const updateAutoPassword = () => {
      const ms = msVSInput.value;
      const nam = namSinhInput.value;
      if (ms && nam.length === 4) {
        passwordInput.value = ms.slice(-4) + nam;
      }
    };

    clbSelect.onchange = () => {
      msVSInput.value = this.generateMsVS(clbSelect.value);
      updateAutoPassword();
    };

    namSinhInput.oninput = updateAutoPassword;

    // Ngày mặc định
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('vs-ngaynhaphoc').value = today;

    // Đồng bộ Cấp 1 mặc định
    document.getElementById('vs-dangcap').value = 1;
    this.updateRankingInfo(1);

    this.openModal('modal-vs');
  },

  openEditVS(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;

    document.getElementById('modal-vs-title').textContent = 'Chỉnh sửa Võ sinh';
    document.getElementById('vs-edit-id').value = msVS;
    
    // Điền dữ liệu
    const tenInput = document.getElementById('vs-ten');
    tenInput.value = vs.tenVS || '';
    
    // Khóa trường tên và mã khi sửa
    tenInput.readOnly = true;
    tenInput.classList.add('bg-light');

    const msInput = document.getElementById('vs-ms');
    msInput.value = vs.msVS || '';
    msInput.readOnly = true;
    msInput.classList.add('bg-light');

    document.getElementById('vs-namsinh').value = vs.namSinh || '';
    document.getElementById('vs-gioitinh').value = vs.gioiTinh || 'Nam';
    document.getElementById('vs-sdt').value = vs.sdt || '';
    document.getElementById('vs-diachi').value = vs.diaChi || '';
    document.getElementById('vs-ngaynhaphoc').value = vs.ngayNhapHoc || '';
    document.getElementById('vs-password').value = vs.password || '';

    this.populateFormSelects();
    const currentCap = vs.cap || 1;
    document.getElementById('vs-dangcap').value = currentCap;
    document.getElementById('vs-clb').value = vs.msCLB || '';

    // Đồng bộ Trình độ & Màu đai khi mở
    this.updateRankingInfo(currentCap);

    this.openModal('modal-vs');
  },

  async saveVS() {
    const editId = document.getElementById('vs-edit-id').value;
    const ten = document.getElementById('vs-ten').value.trim();
    const namSinh = document.getElementById('vs-namsinh').value;
    const gioiTinh = document.getElementById('vs-gioitinh').value;
    const sdt = document.getElementById('vs-sdt').value.trim();
    const cap = parseInt(document.getElementById('vs-dangcap').value);
    const msCLB = document.getElementById('vs-clb').value;
    const diaChi = document.getElementById('vs-diachi').value.trim();
    const ngayNhapHoc = document.getElementById('vs-ngaynhaphoc').value;
    const password = document.getElementById('vs-password').value.trim();
    
    if (!ten || !namSinh || !msCLB) {
      this.toast('Vui lòng điền đầy đủ thông tin bắt buộc', true);
      return;
    }

    const token = localStorage.getItem('vct_token');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    if (editId) {
      const idx = this.voSinh.findIndex(v => v.msVS === editId);
      if (idx === -1) return;
      
      const updatedData = {
        ...this.voSinh[idx],
        tenVS: ten, namSinh, gioiTinh, sdt, cap, msCLB, diaChi, ngayNhapHoc
      };
      if (password) updatedData.password = password;

      try {
        const res = await fetch(`${API_URL}/students/${editId}`, {
          method: 'PUT', headers, body: JSON.stringify(updatedData)
        });
        if (!res.ok) throw new Error();
        this.voSinh[idx] = await res.json();
        this.toast('Cập nhật võ sinh thành công!');
      } catch (e) {
        this.toast('Lỗi khi cập nhật võ sinh', true);
        return;
      }
    } else {
      const msVS = this.generateMsVS(msCLB);
      const newVS = {
        msVS, msCLB, msHLV: this.currentHLV?.msHLV || '001',
        tenVS: ten, gioiTinh, namSinh, sdt, diaChi, cap,
        ngayNhapHoc: ngayNhapHoc || new Date().toISOString().split('T')[0],
        ngayThi: null, avatar: null,
        password: password || (msVS.slice(-4) + namSinh),
        doiPass: false, hocPhi: {}, thanhTich: [], trangThaiThi: null, trangThai: "Đang học"
      };

      try {
        const res = await fetch(`${API_URL}/students`, {
          method: 'POST', headers, body: JSON.stringify(newVS)
        });
        if (!res.ok) throw new Error();
        const saved = await res.json();
        this.voSinh.push(saved);
        this.toast('Thêm võ sinh mới thành công!');
      } catch (e) {
        this.toast('Lỗi khi thêm võ sinh', true);
        return;
      }
    }

    this.closeModal('modal-vs');
    this.renderAll();
    this.populateFilters();
  },

  generateMsVS(msCLB) {
    if (!msCLB) return '';
    // Lọc lấy danh sách võ sinh của HLV hiện tại và thuộc CLB này
    const clubStudents = this.voSinh.filter(vs => vs.msCLB === msCLB);
    let maxNum = 0;
    clubStudents.forEach(vs => {
       // Tách lấy phần hậu tố (suffix) sau mã CLB
       const suffixStr = vs.msVS.substring(msCLB.length);
       const suffix = parseInt(suffixStr, 10);
       if (!isNaN(suffix) && suffix > maxNum) maxNum = suffix;
    });
    const nextNum = maxNum + 1;
    // Luôn đảm bảo hậu tố có đúng 4 chữ số theo quy tắc abcX0000
    const padded = String(nextNum).padStart(4, '0');
    return `${msCLB}${padded}`;
  },


  /* ── Học phí ─────────────────────────────────── */
  renderTuition() {
    const tbody = document.getElementById('tuition-tbody');
    const theadRow = document.getElementById('tuition-thead-row');
    const debtOnlyFilter = document.getElementById('filter-debt-only')?.checked;
    if (!tbody || !theadRow) return;

    const startMonth = document.getElementById('tuition-month-start')?.value || '';
    const endMonth = document.getElementById('tuition-month-end')?.value || '';
    const clubFilter = document.getElementById('tuition-club-filter')?.value || '';
    
    // Lấy danh sách các tháng cần hiển thị
    const monthsToShow = this.getMonthsBetween(startMonth, endMonth);

    // Cập nhật tiêu đề bảng
    let headHtml = `<th class="sticky-col">Họ tên Võ sinh</th>`;
    monthsToShow.forEach(m => {
      headHtml += `<th class="th-center th-month">${this.formatMonthShort(m)}</th>`;
    });
    theadRow.innerHTML = headHtml;

    let students = this.getMyStudents();
    if (clubFilter) students = students.filter(vs => vs.msCLB === clubFilter);

    // Xử lý logic nợ phí & Lọc
    const processedStudents = students.map(vs => {
      const unpaidMonths = monthsToShow.filter(m => !vs.hocPhi || vs.hocPhi[m] !== true);
      return { ...vs, unpaidMonths, hasDebt: unpaidMonths.length > 0 };
    });

    let displayStudents = processedStudents;
    if (debtOnlyFilter) {
      displayStudents = processedStudents.filter(vs => vs.hasDebt);
    }

    let paidCount = 0, unpaidCount = 0;
    const latestMonth = monthsToShow[monthsToShow.length - 1] || '';

    tbody.innerHTML = displayStudents.map(vs => {
      // Đếm dựa trên tháng mới nhất đang hiển thị cho thống kê tóm tắt
      const isLatestPaid = vs.hocPhi && vs.hocPhi[latestMonth];
      if (isLatestPaid) paidCount++; else unpaidCount++;

      let cellsHtml = `
        <td class="sticky-col">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <div class="vs-id-sub">${vs.msVS}</div> 
              <strong>${vs.tenVS}</strong>
            </div>
            ${vs.hasDebt ? `
              <button class="btn btn-sm btn-outline-danger border-0 p-1" title="Gửi lời nhắc đóng phí" 
                onclick="App.copyReminder('${vs.msVS}')">
                <i class="bi bi-chat-dots-fill"></i>
              </button>` : ''}
          </div>
        </td>`;
      
      monthsToShow.forEach(m => {
        const isPaid = vs.hocPhi && vs.hocPhi[m];
        cellsHtml += `
          <td class="td-tuition-status ${isPaid ? 'is-paid' : ''}">
            <div class="tuition-check">
              <input type="checkbox" ${isPaid ? 'checked' : ''}
                onchange="App.toggleTuition('${vs.msVS}', '${m}', this.checked)">
            </div>
          </td>`;
      });
      return `<tr class="${vs.hasDebt ? 'row-has-debt' : ''}">${cellsHtml}</tr>`;
    }).join('');

    // Stats
    const statsEl = document.getElementById('tuition-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="ts-paid">✓ ${paidCount} hoàn thành</span>
        <span class="ts-unpaid">✗ ${unpaidCount} chưa đóng</span>`;
    }
  },

  async copyReminder(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;

    const startMonth = document.getElementById('tuition-month-start')?.value || '';
    const endMonth = document.getElementById('tuition-month-end')?.value || '';
    const monthsToShow = this.getMonthsBetween(startMonth, endMonth);
    const unpaid = monthsToShow.filter(m => !vs.hocPhi || vs.hocPhi[m] !== true);

    if (unpaid.length === 0) {
      this.toast('Võ sinh này đã đóng đủ phí trong khoảng thời gian đang lọc');
      return;
    }

    const clubName = this.getClubs().find(c => c.msCLB === vs.msCLB)?.tenCLB || 'CLB';
    const monthStr = unpaid.map(m => this.formatMonthShort(m)).join(', ');
    const defaultMessage = `Chào Phụ huynh/Võ sinh ${vs.tenVS}, CLB ${clubName} xin gửi lời nhắc đóng học phí cho tháng [${monthStr}]. Trân trọng!`;

    const { value: customMessage } = await Swal.fire({
      title: 'Soạn nội dung nhắc phí',
      input: 'textarea',
      inputLabel: `Lời nhắc cho tháng ${monthStr}`,
      inputValue: defaultMessage,
      showCancelButton: true,
      confirmButtonText: 'Gửi thông báo',
      cancelButtonText: 'Hủy',
      inputAttributes: {
        'rows': 4
      }
    });

    if (!customMessage) return;

    try {
      await navigator.clipboard.writeText(customMessage);
      
      const token = localStorage.getItem('vct_token');
      const notifData = {
        id: 'notif_' + Date.now(),
        noiDung: customMessage,
        ngayTao: new Date().toISOString(),
        loai: 'hoc_phi',
        thang: unpaid, // Gửi danh sách các tháng chưa đóng (Array)
        daXem: false
      };
      
      await fetch(`${API_URL}/students/${msVS}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(notifData)
      });

      this.toast('Đã copy và gửi thông báo nhắc phí!');
    } catch (e) {
      console.error('Error sending notification:', e);
      this.toast('Lỗi khi gửi thông báo hệ thống', true);
    }
  },

  async toggleTuition(msVS, month, checked) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;
    if (!vs.hocPhi) vs.hocPhi = {};
    const oldVal = vs.hocPhi[month];
    vs.hocPhi[month] = checked;
    
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/students/${msVS}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(vs)
      });
      if (!res.ok) throw new Error();
      this.renderTuition();
      this.renderTuitionOverview();
      this.renderOverview();
    } catch (e) {
      vs.hocPhi[month] = oldVal;
      this.renderTuition();
      this.toast('Lỗi khi cập nhật học phí', true);
    }
  },

  /* ── Báo cáo Học phí đơn tháng ───────────────── */
  renderTuitionOverview() {
    const paidList = document.getElementById('report-paid-list');
    const unpaidList = document.getElementById('report-unpaid-list');
    if (!paidList || !unpaidList) return;

    const month = document.getElementById('report-month')?.value;
    if (!month) return;

    const students = this.getMyStudents();
    let paidHtml = '';
    let unpaidHtml = '';

    students.forEach(vs => {
      const isPaid = vs.hocPhi && vs.hocPhi[month];
      const clubCode = vs.msCLB;
      const clubName = this.getClubs().find(c => c.msCLB === clubCode)?.tenCLB || clubCode;
      
      const itemHtml = `<li><div class="report-info-col"><div class="report-id">${vs.msVS}</div><span class="report-name">${vs.tenVS}</span></div> <span class="report-club">${clubName}</span></li>`;
      if (isPaid) {
        paidHtml += itemHtml;
      } else {
        unpaidHtml += itemHtml;
      }
    });

    paidList.innerHTML = paidHtml || '<li class="empty-li">Chưa có dữ liệu</li>';
    unpaidList.innerHTML = unpaidHtml || '<li class="empty-li">Chưa có dữ liệu</li>';
  },

  /* ── Lớp học ─────────────────────────────────── */
  renderClasses() {
    const grid = document.getElementById('classes-grid');
    if (!grid) return;

    const clubs = this.getClubs();
    const students = this.getMyStudents();

    if (!clubs.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <p>Chưa có lớp học nào</p>
        </div>`;
      return;
    }

    grid.innerHTML = clubs.map(club => {
      const count = students.filter(vs => vs.msCLB === club.msCLB).length;
      return `
        <div class="class-card" onclick="App.viewClass('${club.msCLB}')">
          <div class="class-card-header">
            <h4>${club.tenCLB}</h4>
            <span class="class-code">${club.msCLB}</span>
          </div>
          <div class="class-address small text-muted mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-geo-alt"></i>
            <span>${club.diaChi}</span>
          </div>
          <div class="class-stat fw-bold small d-flex align-items-center gap-2">
            <i class="bi bi-people"></i>
            <span>${count} võ sinh</span>
          </div>
        </div>`;
    }).join('');
  },

  viewClass(msCLB) {
    this.switchTab('students');
    const filter = document.getElementById('filter-club');
    if (filter) {
      filter.value = msCLB;
      this.renderStudents();
    }
  },

  openAddClass() {
    document.getElementById('form-class').reset();
    document.getElementById('class-msclb').value = this.generateMsCLB();
    this.openModal('modal-class');
  },

  generateMsCLB() {
    if (!this.currentHLV) return '0001';
    const clubs = this.currentHLV.clubs || [];
    const nextIndex = clubs.length + 1;
    // Quy tắc: abcX (abc: mã HLV, X: số thứ tự lớp)
    return `${this.currentHLV.msHLV}${nextIndex}`;
  },

  async addClass() {
    const msclb = document.getElementById('class-msclb')?.value.trim();
    const tenclb = document.getElementById('class-tenclb')?.value.trim();
    const diachi = document.getElementById('class-diachi')?.value.trim();

    if (!msclb || !tenclb || !diachi) {
      this.toast('Vui lòng điền đầy đủ thông tin', true);
      return;
    }

    const token = localStorage.getItem('vct_token');
    try {
      const res = await fetch(`${API_URL}/hlv/club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ msCLB: msclb, tenCLB: tenclb, diaChi: diachi })
      });
      if (!res.ok) throw new Error();
      
      this.currentHLV.clubs.push({ msCLB: msclb, tenCLB: tenclb, diaChi: diachi });
      this.closeModal('modal-class');
      this.toast('Thêm lớp học thành công!');
      this.renderClasses();
      this.populateFilters();
      this.renderOverview();
    } catch (e) {
      this.toast('Lỗi khi thêm lớp học', true);
    }
  },

  /* ── Hỗ trợ Modal ────────────────────────────── */
  openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('show-popup');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show-popup');
  },

  /* ── Bật/tắt Sidebar ─────────────────────────── */
  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('show');
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  },

  /* ── Thông báo (Toast) ───────────────────────── */
  toast(msg, isError = false) {
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
      icon: isError ? 'error' : 'success',
      title: msg
    });
  },

  /* ── Tiện ích (Utilities) ────────────────────── */

  getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  },

  formatMonth(m) {
    // "2024-11" → "Tháng 11/2024"
    if (!m) return '';
    const [y, mo] = m.split('-');
    return `Tháng ${parseInt(mo)}/${y}`;
  },

  formatMonthShort(m) {
    // "2024-11" → "T11/24"
    if (!m) return '';
    const [y, mo] = m.split('-');
    return `T${parseInt(mo)}/${y.slice(-2)}`;
  },

  getMonthsBetween(start, end) {
    if (!start || !end) return [];
    let [y1, m1] = start.split('-').map(Number);
    let [y2, m2] = end.split('-').map(Number);
    
    // Đảm bảo start <= end
    if (y1 > y2 || (y1 === y2 && m1 > m2)) {
      [y1, y2, m1, m2] = [y2, y1, m2, m1];
      [start, end] = [end, start];
    }
    
    const res = [];
    let cy = y1, cm = m1;
    while (cy < y2 || (cy === y2 && cm <= m2)) {
      res.push(`${cy}-${String(cm).padStart(2, '0')}`);
      cm++;
      if (cm > 12) { cm = 1; cy++; }
    }
    return res;
  },

  /* ── Cấp lại Mật khẩu ────────────────────────── */
  async loadResetRequests() {
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/reset-password-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const requests = await res.json();
        this.renderResetRequests(requests);
      }
    } catch (e) {
      console.error('Error loading reset requests:', e);
    }
  },

  renderResetRequests(requests) {
    const tbody = document.getElementById('reset-tbody');
    const empty = document.getElementById('empty-reset');
    if (!tbody) return;

    if (!requests.length) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = requests.map(req => `
      <tr>
        <td>
          <div class="vs-id-sub">${req.msVS}</div>
          <strong>${req.tenVS}</strong>
        </td>
        <td>${req.msVS}</td>
        <td>${req.tenCLB}</td>
        <td>${this.formatDate(req.ngayYeuCau)}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-vct-primary btn-reset-action" onclick="App.openResetConfirm('${req.msVS}', '${req.tenVS}')">
              <i class="bi bi-check-circle"></i> 
              <span class="d-none d-sm-inline">Xác nhận</span>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-reset-action" onclick="App.rejectResetRequest('${req.msVS}')">
              <i class="bi bi-trash"></i> 
              <span class="d-none d-sm-inline">Xóa</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openResetConfirm(msVS, name) {
    this.resetTarget = { msVS, name };
    document.getElementById('reset-vs-name').textContent = name;
    document.getElementById('new-password-input').value = 'vct' + Math.floor(1000 + Math.random() * 9000);
    this.openModal('modal-reset-confirm');
  },

  async confirmReset() {
    if (!this.resetTarget) return;
    const newPassword = document.getElementById('new-password-input').value.trim();
    if (!newPassword) {
      this.toast('Vui lòng nhập mật khẩu mới', true);
      return;
    }

    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/reset-password-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ msVS: this.resetTarget.msVS, newPassword })
      });
      if (res.ok) {
        this.toast('Đã cấp lại mật khẩu mới cho ' + this.resetTarget.name);
        this.closeModal('modal-reset-confirm');
        this.loadResetRequests();
        this.loadData();
      } else {
        this.toast('Lỗi khi xác nhận cấp lại mật khẩu', true);
      }
    } catch (e) {
      this.toast('Lỗi kết nối', true);
    }
  },

  async rejectResetRequest(msVS) {
    const vs = (this.passwordRequests || []).find(r => r.msVS === msVS);
    const name = vs ? vs.name : 'Võ sinh';
    
    const res = await Swal.fire({
      title: 'Xóa yêu cầu?',
      text: `Bạn có chắc chắn muốn xóa yêu cầu cấp lại mật khẩu của ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6e7881',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      reverseButtons: true,
      customClass: { popup: 'vct-swal-popup' }
    });

    if (!res.isConfirmed) return;
    
    try {
      const token = localStorage.getItem('vct_token');
      const apiRes = await fetch(`${API_URL}/reset-password-request/${msVS}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (apiRes.ok) {
        this.toast('Đã xóa yêu cầu');
        this.loadResetRequests();
      }
    } catch (e) {
      this.toast('Lỗi khi xóa yêu cầu', true);
    }
  },

  async doRejectResetRequest() {
    // Để trống hoặc xóa nếu không còn dùng đến (đã gộp vào rejectResetRequest)
  },

  /* ── HỒ SƠ HLV (Render & Logic) ────────────────── */
  renderProfile() {
    const hlv = this.currentHLV;
    if (!hlv) return;

    // Ảnh đại diện
    const avatarEl = document.getElementById('main-hlv-avatar');
    if (avatarEl) {
      if (hlv.avatar) {
        avatarEl.innerHTML = `<img src="${hlv.avatar}" alt="Avatar">`;
        document.getElementById('li-delete-avatar').style.display = 'block';
      } else {
        avatarEl.textContent = this.getInitials(hlv.tenHLV);
        avatarEl.style.background = 'var(--vct-red)';
        document.getElementById('li-delete-avatar').style.display = 'none';
      }
    }

    // Hiển thị tên và mã số (bỏ chữ MSHLV)
    document.getElementById('hlv-display-name').textContent = hlv.tenHLV;
    document.getElementById('hlv-display-id').textContent = hlv.msHLV;
    
    // Tìm thông tin cấp bậc từ ranking
    const rankInfo = this.ranking.find(r => r.cap === hlv.cap) || { trinhDo: 'Huấn luyện viên', colorName: '—' };
    
    // Gán ảnh đai
    const beltImg = document.getElementById('hlv-belt-img');
    const beltImgMob = document.getElementById('hlv-belt-img-mobile');
    const beltSrc = `img/cap${hlv.cap}.jpg`;
    if (beltImg) beltImg.src = beltSrc;
    if (beltImgMob) beltImgMob.src = beltSrc;

    // Render Grid thông tin
    const grid = document.getElementById('hlv-info-grid');
    if (grid) {
      // Các mục cơ bản
      let html = `
        <div class="info-item">
          <div class="info-icon"><i class="bi bi-award-fill text-warning"></i></div>
          <div class="info-content">
            <div class="info-label">Trình độ</div>
            <div class="info-value">${rankInfo.trinhDo}</div>
          </div>
        </div>
        <div class="info-item">
          <div class="info-icon"><i class="bi bi-star-fill text-vct"></i></div>
          <div class="info-content">
            <div class="info-label">Cấp bậc</div>
            <div class="info-value">Cấp ${hlv.cap}</div>
          </div>
        </div>
        <div class="info-item">
          <div class="info-icon"><i class="bi bi-telephone-fill text-primary"></i></div>
          <div class="info-content">
            <div class="info-label">Số điện thoại</div>
            <div class="info-value">${hlv.sdt || '—'}</div>
          </div>
        </div>
        <div class="info-item">
          <div class="info-icon"><i class="bi bi-toggle-on text-success"></i></div>
          <div class="info-content">
            <div class="info-label">Trạng thái</div>
            <div class="info-value">${hlv.trangThai === 'hoat_dong' ? 'Đang hoạt động' : 'Ngưng hoạt động'}</div>
          </div>
        </div>
      `;

      // Thành tích
      if (hlv.thanhTich) {
        html += `
          <div class="info-item" style="grid-column: 1 / -1;">
            <div class="info-icon"><i class="bi bi-trophy-fill text-warning"></i></div>
            <div class="info-content">
              <div class="info-label">Thành tích</div>
              <div class="info-value">${hlv.thanhTich}</div>
            </div>
          </div>
        `;
      }

      // Câu lạc bộ
      if (hlv.clubs && hlv.clubs.length > 0) {
        hlv.clubs.forEach(c => {
          html += `
            <div class="info-item">
              <div class="info-icon"><i class="bi bi-house-door-fill text-primary"></i></div>
              <div class="info-content">
                <div class="info-label">Câu lạc bộ</div>
                <div class="info-value"><span class="badge bg-vct-subtle text-vct me-1">${c.msCLB}</span> ${c.tenCLB}</div>
              </div>
            </div>
          `;
        });
      }

      grid.innerHTML = html;
    }
  },

  handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast('Vui lòng chọn tệp hình ảnh!', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => this.initCropper(event.target.result);
    reader.readAsDataURL(file);
  },

  initCropper(imageSrc) {
    const imgEl = document.getElementById('image-to-crop');
    if (!imgEl) return;
    imgEl.src = imageSrc;
    this.openModal('modal-crop-avatar');
    setTimeout(() => {
      if (this.cropper) this.cropper.destroy();
      this.cropper = new Cropper(imgEl, {
        aspectRatio: 1,
        viewMode: 1,
        guides: true,
        background: false,
        autoCropArea: 1,
        responsive: true
      });
    }, 500);
  },

  async saveCroppedAvatar() {
    if (!this.cropper) return;
    const canvas = this.cropper.getCroppedCanvas({ width: 300, height: 300 });
    const base64Avatar = canvas.toDataURL('image/jpeg', 0.8);
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/hlv/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ avatar: base64Avatar })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentHLV = data.hlv;
        this.updateSidebarHLV();
        this.renderProfile();
        this.closeModal('modal-crop-avatar');
        this.toast('Cập nhật ảnh đại diện thành công!');
      }
    } catch (e) {
      this.toast('Lỗi khi tải ảnh lên', true);
    }
  },

  async deleteAvatar() {
    const result = await Swal.fire({
      title: 'Xóa ảnh đại diện?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6e7881',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      reverseButtons: true,
      customClass: { popup: 'vct-swal-popup' }
    });

    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/hlv/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deleteAvatar: true })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentHLV = data.hlv;
        this.updateSidebarHLV();
        this.renderProfile();
        this.toast('Đã xóa ảnh đại diện');
      }
    } catch (e) {
      this.toast('Lỗi khi xóa ảnh', true);
    }
  },

  updateSidebarHLV() {
    if (!this.currentHLV) return;
    const avatar = document.getElementById('coach-avatar');
    const name = document.getElementById('coach-name');
    if (avatar) {
      if (this.currentHLV.avatar) {
        avatar.innerHTML = `<img src="${this.currentHLV.avatar}" alt="Avatar">`;
      } else {
        avatar.textContent = this.getInitials(this.currentHLV.tenHLV);
        avatar.style.background = 'linear-gradient(135deg, var(--gold-bright), var(--gold-mid))';
      }
    }
    if (name) name.textContent = this.currentHLV.tenHLV;
  },

  async updateHLVProfile() {
    const phone = document.getElementById('edit-hlv-phone').value.trim();
    const bio = document.getElementById('edit-hlv-bio').value.trim();
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/hlv/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sdt: phone, thanhTich: bio })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentHLV = data.hlv;
        this.renderProfile();
        this.toast('Cập nhật thông tin thành công!');
      }
    } catch (e) {
      this.toast('Lỗi khi cập nhật thông tin', true);
    }
  },

  async changeHLVPassword() {
    const oldPass = document.getElementById('hlv-old-pass').value;
    const newPass = document.getElementById('hlv-new-pass').value;
    const confirmPass = document.getElementById('hlv-confirm-pass').value;
    if (newPass !== confirmPass) {
      this.toast('Mật khẩu xác nhận không khớp!', true);
      return;
    }
    try {
      const token = localStorage.getItem('vct_token');
      const res = await fetch(`${API_URL}/hlv/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
      });
      if (res.ok) {
        this.toast('Đổi mật khẩu thành công!');
        document.getElementById('form-hlv-password').reset();
        // Quay về trang hồ sơ sau khi đổi mật khẩu thành công
        setTimeout(() => this.switchTab('profile'), 500);
      } else {
        const data = await res.json();
        this.toast(data.detail || 'Mật khẩu cũ không đúng', true);
      }
    } catch (e) {
      this.toast('Lỗi kết nối', true);
    }
  }
};

/* ── Khởi động ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());
