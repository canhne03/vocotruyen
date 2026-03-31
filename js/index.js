const API_URL = window.location.origin;
let _searchTimer;

/* ── TRỢ GIÚP / LOGIC TÁI CẤU TRÚC ──────────────── */
const Utils = {
  initials(name) {
    if (!name) return '?';
    const p = name.trim().split(' ');
    if (p.length === 1) return p[0][0].toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  },
  formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
  },
  showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `vct-toast toast-${type}`;
    
    toast.innerHTML = `
      <div class="toast-body">
        <div class="toast-message">${msg}</div>
      </div>
    `;

    container.appendChild(toast);
    
    // Animation in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }
};

const DB = {
  ranking: [],
  loaded: false,
  async load() {
    if (this.loaded) return;
    try {
      const r = await fetch(`${API_URL}/rankings`).then(r => r.json());
      this.ranking = r;
      this.loaded = true;
    } catch (e) { console.error('DB Load Error:', e); }
  },
  async searchVS(q) {
    try {
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
      return await res.json();
    } catch (e) {
      console.error('Search Error:', e);
      return [];
    }
  }
};

const Auth = {
  getSession() {
    const s = localStorage.getItem('vct_session');
    return s ? JSON.parse(s) : null;
  },
  async tryLogin(username, password) {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) return { error: data.detail || 'Lỗi đăng nhập' };
      
      localStorage.setItem('vct_token', data.access_token);
      return data.user;
    } catch (e) { return { error: 'Không thể kết nối đến máy chủ backend.' }; }
  },
  logout() {
    localStorage.removeItem('vct_session');
    localStorage.removeItem('vct_token');
    window.location.reload();
  },
  redirectAfterLogin(user) {
    localStorage.setItem('vct_session', JSON.stringify(user));
    if (user.type === 'hlv') window.location.href = 'dashboard.html';
    else if (user.type === 'vs') window.location.href = 'vosinh.html';
    else window.location.reload();
  }
};

/* ── Khởi tạo ────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSearch();
  initLoginModal();
  initHeroSlider();
  initBioToggle();
  initContactFAB();
  initQCTabs();
  initCounterAnimation();
  loadUserSession();
});

/* ── Thanh điều hướng (Navbar) ─────────────────── */
function initNavbar() {
  const nav = document.getElementById('site-nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  const ham = document.getElementById('hamburger');
  if (ham) ham.addEventListener('click', toggleHamburger);

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  const mobileLoginBtn = document.querySelector('.mobile-login-btn');
  if (mobileLoginBtn) {
    mobileLoginBtn.addEventListener('click', () => {
      openLoginModal();
      closeMobileMenu();
    });
  }

  // Đóng menu/kết quả tìm kiếm khi nhấp ra ngoài thanh điều hướng
  document.addEventListener('click', (e) => {
    const navBar = document.getElementById('site-nav');
    const panel = document.getElementById('search-results');
    if (navBar && !navBar.contains(e.target)) {
      closeMobileMenu();
      if (panel) {
        panel.innerHTML = '';
        panel.classList.remove('has-results');
      }
    }
  });
}

function toggleHamburger() {
  document.getElementById('hamburger')?.classList.toggle('open');
  document.getElementById('mobile-menu')?.classList.toggle('open');
}

function closeMobileMenu() {
  document.getElementById('hamburger')?.classList.remove('open');
  document.getElementById('mobile-menu')?.classList.remove('open');
}

/* ── Tìm kiếm ──────────────────────────────────── */
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      console.log('Search input event triggered:', searchInput.value);
      searchClear?.classList.toggle('show', searchInput.value.length > 0);
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => {
        console.log('Debounced search triggered');
        doSearch();
      }, 350);
    });
    // Thêm sự kiện click để hiển thị lại kết quả nếu đã có văn bản
    searchInput.addEventListener('click', () => {
      if (searchInput.value.trim().length > 0) doSearch();
    });
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { clearTimeout(_searchTimer); doSearch(); }
      if (e.key === 'Escape') clearSearchResults();
    });
  }
  if (searchClear) searchClear.addEventListener('click', clearSearch);
}

function clearSearchResults() {
  const panel = document.getElementById('search-results');
  if (panel) { panel.innerHTML = ''; panel.classList.remove('has-results'); }
}

function clearSearch() {
  const input = document.getElementById('search-input');
  const btn   = document.getElementById('search-clear');
  if (input) { input.value = ''; input.focus(); }
  if (btn) btn.classList.remove('show');
  clearSearchResults();
}

/* ── Cửa sổ đăng nhập (Login Modal) ────────────── */
function initLoginModal() {
  document.getElementById('btn-nav-login')?.addEventListener('click', openLoginModal);
  document.querySelector('.modal-close-btn')?.addEventListener('click', closeLoginModal);
  document.getElementById('login-modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'login-modal-overlay') closeLoginModal();
  });
  document.getElementById('vs-detail-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'vs-detail-overlay') closeVODetails();
  });
  document.getElementById('btn-login')?.addEventListener('click', doLogin);
  document.getElementById('btn-forgot-pass')?.addEventListener('click', handleForgotPassword);
  document.querySelector('.toggle-pass')?.addEventListener('click', togglePass);

  const idInput   = document.getElementById('login-id');
  const idClearBtn = document.getElementById('login-id-clear');
  if (idInput && idClearBtn) {
    idClearBtn.addEventListener('click', () => clearInput('login-id', 'login-id-clear'));
    idInput.addEventListener('input', () => idClearBtn.classList.toggle('show', idInput.value.length > 0));
  }
}

function openLoginModal() {
  const overlay = document.getElementById('login-modal-overlay');
  const idInput = document.getElementById('login-id');
  const passInput = document.getElementById('login-pass');
  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';
  if (overlay) { overlay.classList.add('show'); document.body.style.overflow = 'hidden'; }
}

function closeLoginModal() {
  const overlay = document.getElementById('login-modal-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    const err = document.getElementById('login-error');
    if (err) { err.textContent = ''; err.classList.remove('show'); }
  }
}

function togglePass() {
  const inp = document.getElementById('login-pass');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

function clearInput(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (input) { input.value = ''; input.focus(); }
  if (btn) btn.classList.remove('show');
}

/* ── Các tab quy chế ───────────────────────────── */
function initQCTabs() {
  document.querySelectorAll('.qc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.qc-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.qc-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target)?.classList.add('active');
    });
  });
}


/* ── Tự động tải phiên làm việc ────────────────── */
function loadUserSession() {
  const s = Auth.getSession();
  const loginBtn = document.getElementById('btn-nav-login');
  if (!loginBtn) return;
  
  if (s) {
    loginBtn.textContent = `${s.name.split(' ').pop()} ▾`;
    const newBtn = loginBtn.cloneNode(true);
    loginBtn.replaceWith(newBtn);
    newBtn.addEventListener('click', () => Auth.logout());
  } else {
    loginBtn.textContent = 'Đăng nhập';
  }
}

/* ── Trình chiếu Hero (Slider) ─────────────────── */
let heroCurrentIdx = 0;
let heroSliderTimer = null;

function initHeroSlider() {
  const slider = document.querySelector('.hero-visuals');
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dots .dot');
  const prevBtn = document.querySelector('.hero-nav.prev');
  const nextBtn = document.querySelector('.hero-nav.next');

  if (!slides.length) return;

  function update() {
    const track = document.querySelector('.hero-track');
    if (track) track.style.transform = `translateX(-${heroCurrentIdx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === heroCurrentIdx));
  }

  function next() { heroCurrentIdx = (heroCurrentIdx + 1) % slides.length; update(); }
  function prev() { heroCurrentIdx = (heroCurrentIdx - 1 + slides.length) % slides.length; update(); }

  function startAuto() {
    if (heroSliderTimer) clearInterval(heroSliderTimer);
    heroSliderTimer = setInterval(next, 5000);
  }

  prevBtn?.addEventListener('click', () => { prev(); startAuto(); });
  nextBtn?.addEventListener('click', () => { next(); startAuto(); });

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => { heroCurrentIdx = idx; update(); startAuto(); });
  });

  // Hỗ trợ vuốt (swipe)
  let touchStartX = 0;
  if (slider) {
    slider.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); startAuto(); }
    }, { passive: true });
  }

  update();
  startAuto();
}

/* ── Logic Tìm kiếm ────────────────────────────── */
function _renderResults(container, found) {
  if (!found.length) {
    container.innerHTML = `
      <div class="empty-state-search">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <h4>Không tìm thấy kết quả</h4>
        <p>Thử nhập mã số võ sinh hoặc tên chính xác hơn</p>
      </div>`;
    return;
  }
  container.innerHTML = `<div class="search-result-count">Tìm thấy <strong>${found.length}</strong> kết quả</div>`;
  
  for (const vs of found) {
    const card = document.createElement('div');
    card.className = 'vs-result-card simple';
    card.innerHTML = `
      <div class="vs-result-info">
        <div class="vs-res-name">${vs.tenVS}</div>
        <div class="vs-res-id">MSVS: ${vs.msVS}</div>
      </div>
      <div class="vs-res-arrow">❯</div>`;
    
    card.addEventListener('click', () => showVODetails(vs));
    container.appendChild(card);
  }
}

async function showVODetails(vs) {
  // Lấy thông tin xếp hạng
  await DB.load();
  const info = DB.ranking.find(r => r.cap === vs.dangCap) || DB.ranking[0];

  // Điền dữ liệu
  const nameEl = document.getElementById('det-name');
  const msEl = document.getElementById('det-ms');
  const namsinhEl = document.getElementById('det-namsinh');
  const gioitinhEl = document.getElementById('det-gioitinh');
  const trinhdoEl = document.getElementById('det-trinhdo');
  const maudaiEl = document.getElementById('det-maudai');
  const beltImgEl = document.getElementById('det-belt-img');
  const rankNameEl = document.getElementById('det-rank-name');
  const achievementsList = document.getElementById('det-achievements');
  const achievementsWrap = document.getElementById('det-achievements-wrap');

  if (nameEl) nameEl.textContent = vs.tenVS;
  if (msEl) msEl.textContent = `MSVS: ${vs.msVS}`;
  
  // Trích xuất năm sinh
  const year = vs.ngaySinh ? vs.ngaySinh.split('-')[0] : '—';
  if (namsinhEl) namsinhEl.textContent = year;
  
  if (gioitinhEl) gioitinhEl.textContent = vs.gioiTinh || '—';
  if (trinhdoEl) trinhdoEl.textContent = info.trinhDo;
  if (maudaiEl) maudaiEl.textContent = vs.tenCLB || info.colorName;
  if (beltImgEl) beltImgEl.src = `img/cap${vs.dangCap}.jpg`;
  if (rankNameEl) rankNameEl.textContent = `Cấp ${vs.dangCap} · ${info.trinhDo}`;

  // Xử lý thành tích
  if (achievementsList) {
    achievementsList.innerHTML = '';
    if (vs.thanhTich && vs.thanhTich.length > 0) {
      vs.thanhTich.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        achievementsList.appendChild(li);
      });
      if (achievementsWrap) achievementsWrap.style.display = 'block';
    } else {
      if (achievementsWrap) achievementsWrap.style.display = 'none';
    }
  }

  // Hiển thị modal
  const overlay = document.getElementById('vs-detail-overlay');
  if (overlay) {
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeVODetails() {
  const overlay = document.getElementById('vs-detail-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }
}

async function doSearch() {
  await DB.load();
  const input = document.getElementById('search-input');
  const panel = document.getElementById('search-results');
  if (!input || !panel) return;

  const q = input.value.trim();
  if (!q) { clearSearchResults(); return; }

  const res = await DB.searchVS(q);
  if (!res.length) {
    panel.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.9rem;">Không tìm thấy kết quả</div>';
    panel.classList.add('has-results');
    return;
  }
  _renderResults(panel, res);
  panel.classList.add('has-results');
}

async function doLogin() {
  const modal  = document.querySelector('.login-modal');
  const id     = document.getElementById('login-id');
  const pass   = document.getElementById('login-pass');
  const errBox = document.getElementById('login-error');
  const btn    = document.getElementById('btn-login');

  if (!id || !pass || !errBox || !btn) return;

  const idVal   = id.value.trim();
  const passVal = pass.value;

  function showError(msg) {
    errBox.textContent = msg;
    errBox.classList.add('show');
    if (modal) {
      modal.classList.add('error-shake');
      setTimeout(() => modal.classList.remove('error-shake'), 450);
    }
  }

  if (!idVal || !passVal) { showError('Vui lòng nhập đầy đủ thông tin.'); return; }

  btn.classList.add('loading');
  btn.disabled = true;

  await DB.load();
  const result = await Auth.tryLogin(idVal, passVal);

  if (result?.error) {
    btn.disabled = false;
    btn.classList.remove('loading');
    showError(result.error);
    Utils.showToast(result.error, 'error');
    return;
  }

  errBox.classList.remove('show');
  Utils.showToast('Đăng nhập thành công!', 'success');
  setTimeout(() => Auth.redirectAfterLogin(result), 800);
}

async function handleForgotPassword() {
  const idInput = document.getElementById('login-id');
  const msVS = idInput?.value.trim();
  const errBox = document.getElementById('login-error');

  if (!msVS) {
    if (errBox) {
      errBox.textContent = 'Vui lòng nhập Mã số võ sinh trước.';
      errBox.classList.add('show');
    }
    return;
  }

  try {
    const res = await fetch(`${API_URL}/reset-password-request?msVS=${encodeURIComponent(msVS)}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok) {
      const isPending = data.message.includes('chờ');
      Utils.showToast(data.message, isPending ? 'error' : 'warning');
      if (errBox) errBox.classList.remove('show');
    } else {
      if (errBox) {
        errBox.textContent = data.detail || 'Lỗi gửi yêu cầu.';
        errBox.classList.add('show');
      }
      Utils.showToast(data.detail || 'Lỗi gửi yêu cầu.', 'error');
    }
  } catch (e) {
    if (errBox) {
      errBox.textContent = 'Không thể kết nối đến máy chủ.';
      errBox.classList.add('show');
    }
    Utils.showToast('Không thể kết nối đến máy chủ.', 'error');
  }
}

/* ── Tiểu sử (Biography Collapsible) ───────────── */
function initBioToggle() {
  const toggleBtn  = document.getElementById('bio-toggle');
  const bioContent = document.getElementById('bio-content');
  const mpBio      = document.querySelector('.mp-bio');
  if (!toggleBtn || !bioContent) return;

  const doToggle = (forceClose = false) => {
    const wasExpanded = bioContent.classList.contains('expanded');
    const shouldExpand = forceClose ? false : !wasExpanded;

    bioContent.classList.toggle('expanded', shouldExpand);
    toggleBtn.classList.toggle('expanded', shouldExpand);

    if (wasExpanded && !shouldExpand) {
      mpBio?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    doToggle();
  });

  // Nhấp vào bất kỳ đâu trên thẻ tiểu sử để thu gọn nếu đang mở rộng
  mpBio?.addEventListener('click', () => {
    if (bioContent.classList.contains('expanded')) {
      doToggle(true);
    }
  });
}




/* ── Tính năng C: Hiệu ứng đếm số ──────────────── */
function initCounterAnimation() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  if (!counters.length) return;

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();

    const step = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const value = Math.floor(ease * target);
      el.textContent = target >= 1000
        ? value.toLocaleString('vi-VN') + suffix
        : value + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target >= 1000
        ? target.toLocaleString('vi-VN') + suffix
        : target + suffix;
    };
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}
/* ── Nút liên hệ nổi (FAB) ─────────────────────── */
function initContactFAB() {
  const toggle  = document.getElementById('contact-toggle');
  const menu    = document.getElementById('social-menu');
  const overlay = document.getElementById('fab-overlay');
  if (!toggle || !menu || !overlay) return;

  function abrirMenu() {
    toggle.classList.add('active');
    menu.classList.add('show');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function cerrarMenu() {
    toggle.classList.remove('active');
    menu.classList.remove('show');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = menu.classList.contains('show');
    if (isExpanded) cerrarMenu();
    else abrirMenu();
  });

  overlay.addEventListener('click', cerrarMenu);

  // Đóng khi nhấp ra ngoài (phòng hờ)
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      cerrarMenu();
    }
  });
}
