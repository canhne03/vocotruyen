'use strict';
// ===== DASHBOARD.JS — Coach Management Dashboard =====

const App = {
  voSinh: [],
  hlv: [],
  ranking: [],
  currentHLV: null,
  currentTab: 'overview',
  deleteTarget: null,

  /* ── Init ─────────────────────────────────────── */
  async init() {
    this.setHeaderDate();
    await this.loadData();
    this.currentHLV = this.hlv[0] || null;
    this.setupUI();
    this.renderAll();
  },

  /* ── Date Header ──────────────────────────────── */
  setHeaderDate() {
    const el = document.getElementById('header-date');
    if (!el) return;
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const formatted = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${formatted}`;
  },

  /* ── Data Loading ─────────────────────────────── */
  async loadData() {
    try {
      const saved = localStorage.getItem('vct_voSinh');
      if (saved) {
        this.voSinh = JSON.parse(saved);
      } else {
        const res = await fetch('data/vo-sinh.json');
        this.voSinh = await res.json();
        this.saveVoSinh();
      }

      const savedHLV = localStorage.getItem('vct_hlv');
      if (savedHLV) {
        this.hlv = JSON.parse(savedHLV);
      } else {
        const res2 = await fetch('data/hlv.json');
        this.hlv = await res2.json();
        this.saveHLV();
      }

      const res3 = await fetch('data/ranking.json');
      this.ranking = await res3.json();
    } catch (e) {
      console.error('Error loading data:', e);
    }
  },

  saveVoSinh() {
    localStorage.setItem('vct_voSinh', JSON.stringify(this.voSinh));
  },

  saveHLV() {
    localStorage.setItem('vct_hlv', JSON.stringify(this.hlv));
  },

  /* ── UI Setup ─────────────────────────────────── */
  setupUI() {
    // Dropdown close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.actions-cell')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
      }
    });

    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Sidebar toggle (mobile)
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggle) toggle.addEventListener('click', () => this.toggleSidebar());
    if (overlay) overlay.addEventListener('click', () => this.closeSidebar());

    // Coach info
    if (this.currentHLV) {
      const initials = this.getInitials(this.currentHLV.tenHLV);
      const avatar = document.getElementById('coach-avatar');
      const name = document.getElementById('coach-name');
      if (avatar) avatar.textContent = initials;
      if (name) name.textContent = this.currentHLV.tenHLV;
    }

    // Add student button
    document.getElementById('btn-add-vs')?.addEventListener('click', () => this.openAddVS());

    // Add class button
    document.getElementById('btn-add-class')?.addEventListener('click', () => this.openAddClass());

    // Student form
    document.getElementById('form-vs')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveVS();
    });

    // Class form
    document.getElementById('form-class')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addClass();
    });

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal(overlay.id);
      });
    });

    // Search student
    document.getElementById('search-student')?.addEventListener('input', () => this.renderStudents());

    // Filter club (students)
    const filterClub = document.getElementById('filter-club');
    if (filterClub) {
      filterClub.addEventListener('change', () => this.renderStudents());
    }

    // Tuition time range selectors
    document.getElementById('tuition-month-start')?.addEventListener('change', () => this.renderTuition());
    document.getElementById('tuition-month-end')?.addEventListener('change', () => this.renderTuition());
    document.getElementById('tuition-club-filter')?.addEventListener('change', () => this.renderTuition());

    // Overview month
    document.getElementById('overview-month')?.addEventListener('change', () => this.renderOverview());

    // Single-month reportx` date
    document.getElementById('report-month')?.addEventListener('change', () => this.renderTuitionOverview());

    // Populate filters
    this.populateFilters();
  },

  /* ── Populate Filters ─────────────────────────── */
  populateFilters() {
    const clubs = this.getClubs();
    const clubOptions = clubs.map(c => `<option value="${c.msCLB}">${c.tenCLB}</option>`).join('');

    // Student filter
    const filterClub = document.getElementById('filter-club');
    if (filterClub) filterClub.innerHTML = `<option value="">Tất cả CLB</option>` + clubOptions;

    // Tuition filter
    const tuitionFilter = document.getElementById('tuition-club-filter');
    if (tuitionFilter && clubs.length) {
      tuitionFilter.innerHTML = clubOptions;
      tuitionFilter.value = clubs[0].msCLB;
    }

    // Month selectors
    const months = this.getAllMonths();
    const monthOptions = months.map(m => `<option value="${m}">${this.formatMonth(m)}</option>`).join('');

    const tuitionMonthStart = document.getElementById('tuition-month-start');
    const tuitionMonthEnd = document.getElementById('tuition-month-end');
    if (tuitionMonthStart && tuitionMonthEnd) {
      tuitionMonthStart.innerHTML = monthOptions;
      tuitionMonthEnd.innerHTML = monthOptions;
      // Default: show last 3 months if possible
      tuitionMonthStart.value = months[months.length - 3] || months[0] || '';
      tuitionMonthEnd.value = months[months.length - 1] || '';
    }

    const overviewMonth = document.getElementById('overview-month');
    if (overviewMonth) {
      overviewMonth.innerHTML = monthOptions;
      overviewMonth.value = months[months.length - 1] || '';
    }

    // Single-month report default
    const reportMonth = document.getElementById('report-month');
    if (reportMonth && months.length) reportMonth.value = months[months.length - 1];

    // Populate form selects
    this.populateFormSelects();
  },

  populateFormSelects() {
    const clubs = this.getClubs();

    // CLB select in form
    const vsClb = document.getElementById('vs-clb');
    if (vsClb) {
      vsClb.innerHTML = clubs.map(c => `<option value="${c.msCLB}">${c.tenCLB}</option>`).join('');
    }

    // Belt/rank select
    const vsDangCap = document.getElementById('vs-dangcap');
    if (vsDangCap) {
      vsDangCap.innerHTML = this.ranking.map(r =>
        `<option value="${r.cap}">Cấp ${r.cap} — ${r.colorName}${r.so ? ` · ${r.so} sọc` : ''} (${r.trinhDo})</option>`
      ).join('');
    }
  },

  /* ── Tab Navigation ───────────────────────────── */
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
      suspended: 'Ngưng hoạt động'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[tab] || '';

    this.closeSidebar();

    // Re-render on tab switch
    if (tab === 'overview') this.renderOverview();
    if (tab === 'students') this.renderStudents();
    if (tab === 'tuition') { this.renderTuition(); }
    if (tab === 'classes') this.renderClasses();
    if (tab === 'suspended') this.renderSuspended();
  },

  /* ── Render All ───────────────────────────────── */
  renderAll() {
    this.renderOverview();
    this.renderStudents();
    this.renderTuition();
    this.renderTuitionOverview();
    this.renderClasses();
    this.renderSuspended();
  },

  /* ── Get Students for current HLV ─────────────── */
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

  /* ── Overview ─────────────────────────────────── */
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

    // Club summaries
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

    // Recent students
    const recent = document.getElementById('overview-recent');
    if (recent) {
      const sorted = [...students].sort((a, b) => (b.ngayNhapHoc || '').localeCompare(a.ngayNhapHoc || '')).slice(0, 6);
      recent.innerHTML = sorted.map(vs => {
        const rankInfo = this.ranking.find(r => r.cap === vs.dangCap) || this.ranking[0];
        return `
          <div class="recent-card">
            <div class="recent-avatar" style="background:${rankInfo.hexDai}">${this.getInitials(vs.tenVS)}</div>
            <div class="recent-info">
              <div class="recent-id">${vs.msVS}</div>
              <div class="recent-name">${vs.tenVS}</div>
              <div class="recent-meta">Cấp ${vs.dangCap} · ${this.formatDate(vs.ngayNhapHoc)}</div>
            </div>
          </div>`;
      }).join('');
    }
  },

  /* ── Students List ────────────────────────────── */
  renderStudents() {
    const tbody = document.getElementById('student-tbody');
    const empty = document.getElementById('empty-students');
    if (!tbody) return;

    let students = this.getMyStudents();

    // Filter by club
    const club = document.getElementById('filter-club')?.value;
    if (club) students = students.filter(vs => vs.msCLB === club);

    // Filter by search
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
      const rankInfo = this.ranking.find(r => r.cap === vs.dangCap) || this.ranking[0];
      const clubInfo = this.getClubs().find(c => c.msCLB === vs.msCLB);
      return `
        <tr onclick="if(window.innerWidth <= 900) App.toggleDropdown(event, 'drop-${vs.msVS}')">
          <td><div class="vs-id-sub">${vs.msVS}</div> <strong>${vs.tenVS}</strong></td>
          <td>${vs.ngaySinh ? vs.ngaySinh.substring(0, 4) : '—'}</td>
          <td>${vs.gioiTinh || '—'}</td>
          <td>
            <span class="belt-badge" style="background:${rankInfo.hexDai}15; color:${rankInfo.hexDai}">
              <span class="belt-dot" style="background:${rankInfo.hexDai}"></span>
              Cấp ${vs.dangCap} · ${rankInfo.colorName}
            </span>
          </td>
          <td>${clubInfo ? clubInfo.tenCLB : vs.msCLB}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-dots" onclick="App.toggleDropdown(event, 'drop-${vs.msVS}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              <div class="dropdown-menu" id="drop-${vs.msVS}">
                <button class="dropdown-item" onclick="App.openViewVS('${vs.msVS}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> 
                  Xem chi tiết
                </button>
                <button class="dropdown-item" onclick="App.openEditVS('${vs.msVS}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 
                  Sửa
                </button>
                <div class="dropdown-sep"></div>
                <button class="dropdown-item item-warning" onclick="App.suspendVS('${vs.msVS}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  Ngưng hoạt động
                </button>
              </div>
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
      const rankInfo = this.ranking.find(r => r.cap === vs.dangCap) || this.ranking[0];
      const clubInfo = this.getClubs().find(c => c.msCLB === vs.msCLB);
      return `
        <tr>
          <td>
            <div class="vs-id-sub">${vs.msVS}</div> <strong>${vs.tenVS}</strong> <span class="status-badge suspended">Đã ngưng</span>
          </td>
          <td>${vs.ngaySinh ? vs.ngaySinh.substring(0, 4) : '—'}</td>
          <td>${vs.gioiTinh || '—'}</td>
          <td>
            <span class="belt-badge" style="background:${rankInfo.hexDai}15; color:${rankInfo.hexDai}">
              <span class="belt-dot" style="background:${rankInfo.hexDai}"></span>
              Cấp ${vs.dangCap}
            </span>
          </td>
          <td>${clubInfo ? clubInfo.tenCLB : vs.msCLB}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-success" style="padding: 6px 12px; font-size: 0.85rem; border-radius: var(--radius-sm); border: none; cursor: pointer; display: flex; align-items: center; gap: 6px;" onclick="App.activateVS('${vs.msVS}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="20 6 9 17 4 12"/></svg>
                Kích hoạt lại
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  toggleDropdown(e, id) {
    e.stopPropagation();
    const menu = document.getElementById(id);
    const isShowing = menu.classList.contains('show');

    // Close all others
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));

    if (!isShowing) {
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      menu.style.top = (rect.bottom + 4) + 'px';
      
      let leftPos = rect.right - 180; // 180px is menu width config
      if (leftPos < 10) leftPos = 10;
      
      menu.style.left = leftPos + 'px';
      menu.style.right = 'auto';
      menu.classList.add('show');
    }
  },

  suspendVS(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;
    vs.trangThai = 'Ngưng hoạt động';
    this.saveVoSinh();
    this.toast('Đã chuyển võ sinh sang Ngưng hoạt động!');
    this.renderAll();
    this.populateFilters();
  },

  activateVS(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;
    vs.trangThai = 'Đang học';
    this.saveVoSinh();
    this.toast('Đã kích hoạt lại võ sinh!');
    this.renderAll();
    this.populateFilters();
  },

  /* ── CRUD: Add/Edit Student ───────────────────── */
  openViewVS(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;

    const rankInfo = this.ranking.find(r => r.cap === vs.dangCap) || this.ranking[0];
    const clubInfo = this.getClubs().find(c => c.msCLB === vs.msCLB);

    let html = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">`;
    const addRow = (label, val) => {
      html += `<div><strong style="color: var(--text-muted); font-size: 0.85rem;">${label}</strong><div style="padding-top:4px; font-weight: 500; font-size: 0.95rem;">${val || '—'}</div></div>`;
    };

    addRow('Mã VS', vs.msVS);
    addRow('Họ tên', vs.tenVS);
    addRow('Ngày sinh', this.formatDate(vs.ngaySinh));
    addRow('Giới tính', vs.gioiTinh);
    
    // Belt badge HTML
    const beltHtml = `<span class="belt-badge" style="background:${rankInfo.hexDai}15; color:${rankInfo.hexDai}; padding:2px 8px; border-radius:12px; font-size:0.8rem;"><span class="belt-dot" style="background:${rankInfo.hexDai}"></span>Cấp ${vs.dangCap} · ${rankInfo.colorName}</span>`;
    addRow('Cấp đai', beltHtml);
    
    addRow('Câu lạc bộ', clubInfo ? clubInfo.tenCLB : vs.msCLB);
    addRow('Địa chỉ', vs.diaChi);
    addRow('Ngày nhập học', this.formatDate(vs.ngayNhapHoc));
    addRow('Ngày thi gần nhất', this.formatDate(vs.ngayThi));
    
    let statusText = 'Chưa xác định';
    if (vs.trangThaiThi === 0) statusText = 'Chưa thi';
    if (vs.trangThaiThi === 1) statusText = 'Đủ điều kiện thi';
    if (vs.trangThaiThi === 2) statusText = 'Đang chờ duyệt kết quả';
    addRow('Trạng thái thi', statusText);
    
    addRow('Mật khẩu', vs.password);
    addRow('Đổi mật khẩu', vs.doiPass ? 'Đã đổi' : 'Chức đổi (Mặc định)');

    html += `</div>`;

    if (vs.thanhTich && vs.thanhTich.length) {
      html += `<div style="margin-top: var(--space-5);"><strong style="color: var(--text-muted); font-size: 0.85rem;">Thành tích thi đấu</strong><ul style="padding-top:8px; padding-left:20px; font-size: 0.95rem; line-height: 1.6;">`;
      vs.thanhTich.forEach(t => { html += `<li><strong>${t.giai}</strong> (${t.nam}) - Huy chương ${t.huyChuong} (${t.noiDung})</li>`; });
      html += `</ul></div>`;
    }

    document.getElementById('view-vs-body').innerHTML = html;
    this.openModal('modal-view-vs');
  },

  openAddVS() {
    document.getElementById('modal-vs-title').textContent = 'Thêm Võ sinh mới';
    document.getElementById('vs-edit-id').value = '';
    document.getElementById('form-vs').reset();

    // Default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('vs-ngaynhaphoc').value = today;

    this.populateFormSelects();
    this.openModal('modal-vs');
  },

  openEditVS(msVS) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;

    document.getElementById('modal-vs-title').textContent = 'Chỉnh sửa Võ sinh';
    document.getElementById('vs-edit-id').value = msVS;
    document.getElementById('vs-ten').value = vs.tenVS || '';
    document.getElementById('vs-ngaysinh').value = vs.ngaySinh || '';
    document.getElementById('vs-gioitinh').value = vs.gioiTinh || 'Nam';
    document.getElementById('vs-diachi').value = vs.diaChi || '';
    document.getElementById('vs-ngaynhaphoc').value = vs.ngayNhapHoc || '';
    document.getElementById('vs-password').value = vs.password || '';

    this.populateFormSelects();
    document.getElementById('vs-dangcap').value = vs.dangCap || 1;
    document.getElementById('vs-clb').value = vs.msCLB || '';

    this.openModal('modal-vs');
  },

  saveVS() {
    const editId = document.getElementById('vs-edit-id').value;
    const ten = document.getElementById('vs-ten').value.trim();
    const ngaySinh = document.getElementById('vs-ngaysinh').value;
    const gioiTinh = document.getElementById('vs-gioitinh').value;
    const dangCap = parseInt(document.getElementById('vs-dangcap').value);
    const msCLB = document.getElementById('vs-clb').value;
    const diaChi = document.getElementById('vs-diachi').value.trim();
    const ngayNhapHoc = document.getElementById('vs-ngaynhaphoc').value;
    const password = document.getElementById('vs-password').value.trim();

    if (!ten || !ngaySinh || !msCLB) {
      this.toast('Vui lòng điền đầy đủ thông tin bắt buộc', true);
      return;
    }

    if (editId) {
      // Edit existing
      const idx = this.voSinh.findIndex(v => v.msVS === editId);
      if (idx !== -1) {
        this.voSinh[idx].tenVS = ten;
        this.voSinh[idx].ngaySinh = ngaySinh;
        this.voSinh[idx].gioiTinh = gioiTinh;
        this.voSinh[idx].dangCap = dangCap;
        this.voSinh[idx].msCLB = msCLB;
        this.voSinh[idx].diaChi = diaChi;
        this.voSinh[idx].ngayNhapHoc = ngayNhapHoc;
        if (password) this.voSinh[idx].password = password;
        this.toast('Cập nhật võ sinh thành công!');
      }
    } else {
      // Add new
      const msVS = this.generateMsVS(msCLB);
      const newVS = {
        msVS,
        msCLB,
        msHLV: this.currentHLV?.msHLV || '001',
        tenVS: ten,
        gioiTinh,
        ngaySinh,
        diaChi,
        dangCap,
        ngayNhapHoc: ngayNhapHoc || new Date().toISOString().split('T')[0],
        ngayThi: null,
        avatar: null,
        password: password || `vs${Date.now().toString().slice(-4)}`,
        doiPass: false,
        hocPhi: {},
        thanhTich: [],
        trangThaiThi: null
      };
      this.voSinh.push(newVS);
      this.toast('Thêm võ sinh mới thành công!');
    }

    this.saveVoSinh();
    this.closeModal('modal-vs');
    this.renderAll();
    this.populateFilters();
  },

  generateMsVS(msCLB) {
    const clubStudents = this.voSinh.filter(vs => vs.msCLB === msCLB);
    const nextNum = clubStudents.length + 1;
    const padded = String(nextNum).padStart(3, '0');
    return `${msCLB}${padded}1`;
  },


  /* ── Tuition ──────────────────────────────────── */
  renderTuition() {
    const tbody = document.getElementById('tuition-tbody');
    const theadRow = document.getElementById('tuition-thead-row');
    if (!tbody || !theadRow) return;

    const startMonth = document.getElementById('tuition-month-start')?.value || '';
    const endMonth = document.getElementById('tuition-month-end')?.value || '';
    const clubFilter = document.getElementById('tuition-club-filter')?.value || '';
    
    // Get list of months to show
    const monthsToShow = this.getMonthsBetween(startMonth, endMonth);

    // Update table header
    let headHtml = `<th class="sticky-col">Họ tên Võ sinh</th>`;
    monthsToShow.forEach(m => {
      headHtml += `<th class="th-center th-month">${this.formatMonthShort(m)}</th>`;
    });
    theadRow.innerHTML = headHtml;

    let students = this.getMyStudents();
    if (clubFilter) students = students.filter(vs => vs.msCLB === clubFilter);

    let paidCount = 0, unpaidCount = 0;

    tbody.innerHTML = students.map(vs => {
      // For stats, we count the latest month in the selected range
      const latestMonth = monthsToShow[monthsToShow.length - 1] || '';
      const isLatestPaid = vs.hocPhi && vs.hocPhi[latestMonth];
      if (isLatestPaid) paidCount++; else unpaidCount++;

      let cellsHtml = `<td class="sticky-col"><div class="vs-id-sub">${vs.msVS}</div> <strong>${vs.tenVS}</strong></td>`;
      
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
      return `<tr>${cellsHtml}</tr>`;
    }).join('');

    // Stats
    const statsEl = document.getElementById('tuition-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="ts-paid">✓ ${paidCount} đã đóng</span>
        <span class="ts-unpaid">✗ ${unpaidCount} chưa đóng</span>`;
    }
  },

  toggleTuition(msVS, month, checked) {
    const vs = this.voSinh.find(v => v.msVS === msVS);
    if (!vs) return;
    if (!vs.hocPhi) vs.hocPhi = {};
    vs.hocPhi[month] = checked;
    this.saveVoSinh();

    // Update stats without full re-render
    this.renderTuition();
    this.renderTuitionOverview();
  },

  /* ── Tuition Single-month Report ─────────────── */
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

  /* ── Classes ──────────────────────────────────── */
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
          <div class="class-address">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${club.diaChi}</span>
          </div>
          <div class="class-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span><strong>${count}</strong> võ sinh</span>
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
    if (!this.currentHLV || !this.currentHLV.clubs) return '0001';
    let max = 0;
    this.currentHLV.clubs.forEach(c => {
      const num = parseInt(c.msCLB);
      if (!isNaN(num) && num > max) max = num;
    });
    return String(max + 1).padStart(4, '0');
  },

  addClass() {
    const msclb = document.getElementById('class-msclb')?.value.trim();
    const tenclb = document.getElementById('class-tenclb')?.value.trim();
    const diachi = document.getElementById('class-diachi')?.value.trim();

    if (!msclb || !tenclb || !diachi) {
      this.toast('Vui lòng điền đầy đủ thông tin', true);
      return;
    }

    // Check duplicate
    if (this.currentHLV.clubs.some(c => c.msCLB === msclb)) {
      this.toast('Mã CLB đã tồn tại!', true);
      return;
    }

    this.currentHLV.clubs.push({ msCLB: msclb, tenCLB: tenclb, diaChi: diachi });
    this.saveHLV();

    this.closeModal('modal-class');
    document.getElementById('form-class').reset();
    this.toast('Thêm lớp học thành công!');
    this.renderClasses();
    this.populateFilters();
    this.renderOverview();
  },

  /* ── Modal Helpers ────────────────────────────── */
  openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('show');
      document.body.style.overflow = '';
    }
  },

  /* ── Sidebar Toggle ───────────────────────────── */
  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('show');
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  },

  /* ── Toast ────────────────────────────────────── */
  toast(msg, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast${isError ? ' toast-error' : ''}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  /* ── Utilities ────────────────────────────────── */
  setHeaderDate() {
    const el = document.getElementById('header-date');
    if (el) {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      el.textContent = now.toLocaleDateString('vi-VN', options);
    }
  },

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
    
    // Ensure start <= end
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
  }
};

/* ── Boot ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());
