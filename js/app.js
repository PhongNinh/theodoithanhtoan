/**
 * app.js - Khởi tạo ứng dụng, routing (async-aware)
 * PayTrack Pro v3.0
 */

const App = (() => {
  'use strict';

  let _currentPage = null;

  const PAGES = {
    dashboard:     { title: 'Dashboard',          fn: () => PageDashboard.render() },
    dossiers:      { title: 'Danh sách Hồ sơ',   fn: () => PageDossiers.render() },
    dossier_new:   { title: 'Tạo Hồ sơ mới',     fn: () => PageDossiers.renderNew() },
    kanban:        { title: 'Kanban Board',        fn: () => PageKanban.render() },
    audit:         { title: 'Audit Log',           fn: () => PageAudit.render() },
    notifications: { title: 'Thông báo',          fn: () => PageNotifications.render() },
    reports:       { title: 'Báo cáo & Xuất',     fn: () => PageReports.render() },
    users:         { title: 'Quản lý Người dùng', fn: () => PageUsers.render(), adminOnly: true },
    settings:      { title: 'Cài đặt Hệ thống',  fn: () => PageSettings.render(), adminOnly: true },
    security:      { title: 'Bảo mật',            fn: () => PageSecurity.render(), adminOnly: true }
  };

  /* ─── Bootstrap ─── */
  async function init() {
    if (window.Security) Security.init();

    // Show loading while checking session
    document.getElementById('loginPage')?.classList.add('hidden');
    document.getElementById('appPage')?.classList.add('hidden');
    showLoading(true);

    try {
      const loggedIn = await Auth.init();
      showLoading(false);
      if (loggedIn) {
        showApp();
      } else {
        showLogin();
      }
    } catch (e) {
      showLoading(false);
      showLogin();
      console.error('[App] Init error:', e);
    }

    setupEventHandlers();
    setupSearch();
    startDeadlineChecker();
    console.info('[App] PayTrack Pro v3.0 initialized');
  }

  function showLoading(show) {
    const el = document.getElementById('appLoading');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  /* ─── Auth UI ─── */
  function showLogin() {
    document.getElementById('loginPage')?.classList.remove('hidden');
    document.getElementById('appPage')?.classList.add('hidden');
    setupLoginForm();
  }

  function showApp() {
    document.getElementById('loginPage')?.classList.add('hidden');
    document.getElementById('appPage')?.classList.remove('hidden');
    const user = Auth.getCurrentUser();
    updateUserInfo(user);
    updateSidebarPermissions(user);
    loadNotificationBadge();
    navigate('dashboard');
  }

  function updateUserInfo(user) {
    if (!user) return;
    const avatarEl = document.getElementById('userAvatar');
    const nameEl   = document.getElementById('userName');
    const roleEl   = document.getElementById('userRole');
    if (avatarEl) { avatarEl.textContent = user.avatar || '?'; avatarEl.style.background = user.color || '#6c757d'; }
    if (nameEl)   nameEl.textContent = user.displayName;
    if (roleEl)   roleEl.textContent = Auth.getRoleLabel(user.role);
    document.body.className = `role-${user.role}`;
    if (Auth.isAdmin()) document.body.classList.add('is-admin');
  }

  function updateSidebarPermissions(user) {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = Auth.isAdmin() ? '' : 'none';
    });
    const createBtn = document.getElementById('navCreateDossier');
    if (createBtn) createBtn.style.display = (Auth.hasPermission('dossier.create') || Auth.isAdmin()) ? '' : 'none';
  }

  /* ─── Login Form ─── */
  function setupLoginForm() {
    const form      = document.getElementById('loginForm');
    const submitBtn = document.getElementById('loginBtn');
    const errorEl   = document.getElementById('loginError');
    const lockoutEl = document.getElementById('lockoutTimer');
    if (!form) return;

    document.querySelectorAll('.demo-account').forEach(btn => {
      btn.addEventListener('click', () => {
        const uEl = document.getElementById('loginUsername');
        const pEl = document.getElementById('loginPassword');
        if (uEl) uEl.value = btn.dataset.user;
        if (pEl) pEl.value = btn.dataset.pass;
      });
    });

    const toggleBtn = document.getElementById('togglePassword');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const pwd = document.getElementById('loginPassword');
        if (!pwd) return;
        const isText = pwd.type === 'text';
        pwd.type = isText ? 'password' : 'text';
        toggleBtn.querySelector('i').className = `fas ${isText ? 'fa-eye' : 'fa-eye-slash'}`;
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername')?.value || '';
      const password = document.getElementById('loginPassword')?.value || '';
      if (!username.trim() || !password) {
        showErr(errorEl, 'Vui lòng nhập đầy đủ thông tin');
        return;
      }
      Utils.dom.setLoading(submitBtn, true, 'Đang xác thực...');
      hideErr(errorEl);
      lockoutEl?.classList.add('hidden');

      const result = await Auth.login(username, password);
      Utils.dom.setLoading(submitBtn, false);

      if (result.ok) {
        showApp();
      } else {
        showErr(errorEl, result.reason);
        if (result.locked && lockoutEl) {
          lockoutEl.classList.remove('hidden');
          startLockoutCountdown(result.remaining, lockoutEl, submitBtn);
        }
      }
    });
  }

  function showErr(el, msg) { if (el) { el.textContent = msg; el.classList.remove('hidden'); } }
  function hideErr(el)      { if (el) { el.classList.add('hidden'); el.textContent = ''; } }

  function startLockoutCountdown(ms, timerEl, btn) {
    btn.disabled = true;
    const end = Date.now() + ms;
    const iv  = setInterval(() => {
      const left = end - Date.now();
      if (left <= 0) {
        clearInterval(iv);
        timerEl.classList.add('hidden');
        btn.disabled = false;
        return;
      }
      timerEl.textContent = `Thử lại sau: ${Security.RateLimiter.formatRemaining(left)}`;
    }, 1000);
  }

  /* ─── Navigation ─── */
  function navigate(pageId, params = {}) {
    const page = PAGES[pageId];
    if (!page) { navigate('dashboard'); return; }
    if (page.adminOnly && !Auth.isAdmin()) {
      Utils.showToast('Bạn không có quyền truy cập trang này', 'error');
      return;
    }

    _currentPage = pageId;
    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.page === pageId));
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = page.title;

    const content = document.getElementById('mainContent');
    if (content) content.innerHTML = '<div class="page-loader"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';

    setTimeout(async () => {
      try {
        await page.fn(params);
      } catch (err) {
        console.error('[App] Page render error:', err);
        if (content) content.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Lỗi tải trang: ${Security.e(err.message || '')}</p></div>`;
      }
    }, 30);
  }

  /* ─── Event Handlers ─── */
  function setupEventHandlers() {
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('[data-page]');
      if (navItem?.dataset.page) { e.preventDefault(); navigate(navItem.dataset.page); document.getElementById('sidebar')?.classList.remove('open'); }

      if (e.target.closest('#logoutBtn')) {
        e.preventDefault();
        Utils.Modal.confirm('Bạn có chắc muốn đăng xuất?', () => { Auth.logout(); showLogin(); });
      }
      if (e.target.closest('#sidebarToggle')) document.getElementById('sidebar')?.classList.toggle('open');
      if (e.target.closest('#sidebarOverlay')) document.getElementById('sidebar')?.classList.remove('open');
      if (e.target.closest('#notifBell')) navigate('notifications');

      const cm = e.target.closest('[data-close-modal]');
      if (cm) Utils.Modal.hide(cm.dataset.closeModal);

      const modal = e.target.closest('.modal');
      if (modal && e.target === modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => { m.classList.remove('active'); document.body.style.overflow = ''; });
        document.getElementById('searchResults')?.classList.add('hidden');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && Auth.isLoggedIn()) { e.preventDefault(); navigate('dossier_new'); }
    });
  }

  /* ─── Search ─── */
  function setupSearch() {
    const si = document.getElementById('globalSearch');
    const sr = document.getElementById('searchResults');
    if (!si || !sr) return;

    si.addEventListener('input', Utils.debounce(async () => {
      const q = Security.Validator.sanitizeQuery(si.value).trim();
      if (q.length < 2) { sr.classList.add('hidden'); return; }

      sr.innerHTML = '<div class="search-item"><i class="fas fa-spinner fa-spin me-2"></i>Đang tìm...</div>';
      sr.classList.remove('hidden');

      const result = await API.dossiers.list({ search: q }, 'created_at_desc', 1, 8);
      if (!result.success || !result.data.length) {
        sr.innerHTML = '<div class="search-item no-result">Không tìm thấy kết quả</div>';
        return;
      }
      sr.innerHTML = result.data.map(d => {
        const sb = Utils.statusBadge(d.status);
        return `<div class="search-item" data-id="${Security.e(d.dossierId || d.id)}">
          <span class="search-id">${Security.e(d.dossierId || d.id)}</span>
          <span class="search-name">${Utils.highlight(d.projectName, q)}</span>
          <span class="badge ${Security.e(sb.class)}">${Security.e(sb.label)}</span>
        </div>`;
      }).join('');

      sr.querySelectorAll('.search-item[data-id]').forEach(el => {
        el.addEventListener('click', () => {
          si.value = ''; sr.classList.add('hidden');
          navigate('dossiers');
          setTimeout(() => PageDossiers.openDetail(el.dataset.id), 150);
        });
      });
    }, 400));

    document.addEventListener('click', (e) => {
      if (!si.contains(e.target) && !sr.contains(e.target)) sr.classList.add('hidden');
    });
  }

  /* ─── Notification Badge ─── */
  async function loadNotificationBadge() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    try {
      const count = await DB.notifications.getUnreadCount(user.id);
      const badge = document.getElementById('notifBadge');
      if (badge) { badge.textContent = count > 9 ? '9+' : count; badge.style.display = count > 0 ? 'flex' : 'none'; }
    } catch (e) { /* ignore */ }
  }

  /* ─── Deadline Checker ─── */
  async function startDeadlineChecker() {
    const check = async () => {
      if (!Auth.isLoggedIn()) return;
      try {
        const overdue = await DB.stats.overdue();
        const badge   = document.getElementById('overdueBadge');
        if (badge) { badge.textContent = overdue.length; badge.style.display = overdue.length ? 'flex' : 'none'; }
      } catch (e) { /* ignore */ }
    };
    await check();
    setInterval(check, 5 * 60 * 1000);
  }

  /* ─── Dossier count badge ─── */
  async function updateDossierCount() {
    try {
      const all   = await DB.dossiers.getAll();
      const badge = document.getElementById('dossierCount');
      if (badge) badge.textContent = all.length;
    } catch (e) { /* ignore */ }
  }

  return {
    init, navigate, showLogin, showApp,
    loadNotificationBadge, updateDossierCount,
    getCurrentPage: () => _currentPage,
    PAGES
  };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
