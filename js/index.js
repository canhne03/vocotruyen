'use strict';
// ===== INDEX.JS — Võ Cổ Truyền Tây Ninh =====

let _searchTimer = null;

/* ── Initialization ────────────────────────────── */
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

/* ── Navbar ────────────────────────────────────── */
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

  // Close menu/search when clicking outside navbar
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

/* ── Search ────────────────────────────────────── */
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchClear?.classList.toggle('show', searchInput.value.length > 0);
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(doSearch, 350);
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

/* ── Login Modal ───────────────────────────────── */
function initLoginModal() {
  document.getElementById('btn-nav-login')?.addEventListener('click', openLoginModal);
  document.querySelector('.modal-close-btn')?.addEventListener('click', closeLoginModal);
  document.getElementById('login-modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'login-modal-overlay') closeLoginModal();
  });
  document.getElementById('btn-login')?.addEventListener('click', doLogin);
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

/* ── QC Tabs ───────────────────────────────────── */
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


/* ── Session Auto-load ─────────────────────────── */
function loadUserSession() {
  const s = Auth.getSession();
  if (!s) return;
  const loginBtn = document.getElementById('btn-nav-login');
  if (!loginBtn) return;
  loginBtn.textContent = `${s.name.split(' ').pop()} ▾`;
  const newBtn = loginBtn.cloneNode(true);
  loginBtn.replaceWith(newBtn);
  newBtn.addEventListener('click', () => Auth.logout());
}

/* ── Hero Slider ───────────────────────────────── */
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

  // Swipe support
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

/* ── Search Logic ──────────────────────────────── */
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
    const info = DB.ranking.find(r => r.cap === vs.dangCap) || DB.ranking[0];
    const card = document.createElement('div');
    card.className = 'vs-result-card';
    card.style.cssText = `--belt-color:${info.hexDai}`;
    card.innerHTML = `
      <div class="vs-result-avatar">${Utils.initials(vs.tenVS)}</div>
      <div class="vs-result-info">
        <div class="vs-name-big"><span class="vs-id-prefix">${vs.msVS}</span><br>${vs.tenVS}</div>
        <div class="vs-meta-row">
          <span class="badge badge-muted">${vs.msVS}</span>
          <span class="badge badge-belt ${info.mauDai}">${info.colorName}${info.so ? ` · ${info.so} sọc` : ''}</span>
          <span class="vs-rank-text">${info.trinhDo}</span>
        </div>
        <div class="vs-clb-info">CLB: ${vs.msCLB} · Ngày thi: ${Utils.formatDate(vs.ngayThi)}</div>
      </div>`;
    container.appendChild(card);
  }
}

async function doSearch() {
  await DB.load();
  const input = document.getElementById('search-input');
  const panel = document.getElementById('search-results');
  if (!input || !panel) return;

  const q = input.value.trim();
  if (!q) { clearSearchResults(); return; }

  const res = DB.searchVS(q);
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
    return;
  }

  errBox.classList.remove('show');
  Auth.redirectAfterLogin(result);
}

/* ── Biography Collapsible ─────────────────────── */
function initBioToggle() {
  const toggleBtn  = document.getElementById('bio-toggle');
  const bioContent = document.getElementById('bio-content');
  if (!toggleBtn || !bioContent) return;

  toggleBtn.addEventListener('click', () => {
    const isExpanded = bioContent.classList.toggle('expanded');
    toggleBtn.classList.toggle('expanded', isExpanded);
    if (!isExpanded) {
      document.querySelector('.mp-bio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}




/* ── Feature C: Counter Animation ─────────────── */
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
/* ── Contact FAB ───────────────────────────────── */
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

  // Close when clicking outside (just in case)
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      cerrarMenu();
    }
  });
}
