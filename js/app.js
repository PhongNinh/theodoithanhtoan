/**
 * app.js - Khởi tạo ứng dụng, routing, và layout chính
 * PayTrack Pro
 */

const App = (() => {
  'use strict';

  let _currentPage = null;
  let _searchTimeout = null;

  /* ─── Pages registry ─── */
  const PAGES = {
    dashboard:    { title: 'Dashboard',          icon: 'fa-tachometer-alt', fn: () => PageDashboard.render() },
    dossiers:     { title: 'Danh sách Hồ sơ',   icon: 'fa-folder-open',    fn: () => PageDossiers.render() },
    dossier_new:  { title: 'Tạo Hồ sơ mới',     icon: 'fa-plus',           fn: () => PageDossiers.renderNew() },
    kanban:       { title: 'Kanban Board',        icon: 'fa-columns',        fn: () => PageKanban.render() },
    audit:        { title: 'Audit Log',           icon: 'fa-history',        fn: () => PageAudit.render() },
    notifications:{ title: 'Thông báo',          icon: 'fa-bell',           fn: () => PageNotifications.render() },
    reports:      { title: 'Báo cáo & Xuất',     icon: 'fa-chart-bar',      fn: () => PageReports.render() },
    users:        { title: 'Quản lý Người dùng', icon: 'fa-users',          fn: () => PageUsers.render(), adminOnly: true },
    settings:     { title: 'Cài đặt Hệ thống',  icon: 'fa-cog',            fn: () => PageSettings.render(), adminOnly: true },
    security:     { title: 'Bảo mật',            icon: 'fa-shield-alt',     fn: () => PageSecurity.render(), adminOnly: true }
  };

  /* ─── Bootstrap ─── */
  function init() {
    // Khởi tạo bảo mật đầu tiên
    if (window.Security) Security.init();

    // Restore session
    const loggedIn = Auth.init();

    if (loggedIn) {
      showApp();
    } else {
      showLogin();
    }

    // Setup global handlers
    setupEventHandlers();
    setupSearch();
    startDeadlineChecker();

    console.info('[App] PayTrack Pro initialized');
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
    const e = Security.e;
    const avatarEl = document.getElementById('userAvatar');
    const nameEl   = document.getElementById('userName');
    const roleEl   = document.getElementById('userRole');

    if (avatarEl) {
      avatarEl.textContent = e(user.avatar || '?');
      avatarEl.style.background = e(user.color || '#6c757d');
    }
    if (nameEl) nameEl.textContent = user.displayName;
    if (roleEl) roleEl.textContent = Auth.getRoleLabel(user.role);

    // Body class for role-based CSS
    document.body.className = `role-${e(user.role)}`;
    if (Auth.isAdmin()) document.body.classList.add('is-admin');
  }

  function updateSidebarPermissions(user) {
    // Hiển thị/ẩn các mục admin
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = Auth.isAdmin() ? '' : 'none';
    });

    // Ẩn nút tạo hồ sơ nếu không có quyền
    const createBtn = document.getElementById('navCreateDossier');
    if (createBtn) {
      createBtn.style.display = Auth.hasPermission('dossier.create') || Auth.isAdmin() ? '' : 'none';
    }

    // Cập nhật badge số hồ sơ
    const count = DB.dossiers.getAll().length;
    const badge = document.getElementById('dossierCount');
    if (badge) badge.textContent = count;
  }

  /* ─── Login Form ─── */
  function setupLoginForm() {
    const form      = document.getElementById('loginForm');
    const submitBtn = document.getElementById('loginBtn');
    const errorEl   = document.getElementById('loginError');
    const lockoutEl = document.getElementById('lockoutTimer');

    if (!form) return;

    // Quick-fill demo accounts
    document.querySelectorAll('.demo-account').forEach(btn => {
      btn.addEventListener('click', () => {
        const usernameEl = document.getElementById('loginUsername');
        const passwordEl = document.getElementById('loginPassword');
        if (usernameEl) usernameEl.value = Security.e(btn.dataset.user);
        if (passwordEl) passwordEl.value = btn.dataset.pass;
        // Không auto-submit để user thấy thông tin
      });
    });

    // Toggle password visibility
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
        showFormError(errorEl, 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
        return;
      }

      Utils.dom.setLoading(submitBtn, true, 'Đang xác thực...');
      hideFormError(errorEl);

      const result = await Auth.login(username, password);

      Utils.dom.setLoading(submitBtn, false);

      if (result.ok) {
        showApp();
      } else {
        showFormError(errorEl, result.reason);

        // Hiển thị đếm ngược nếu bị khóa
        if (result.locked && lockoutEl) {
          lockoutEl.classList.remove('hidden');
          startLockoutCountdown(result.remaining, lockoutEl, submitBtn, username);
        }
      }
    });
  }

  function showFormError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function hideFormError(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.textContent = '';
  }

  function startLockoutCountdown(remainingMs, timerEl, submitBtn, username) {
    submitBtn.disabled = true;
    const end = Date.now() + remainingMs;

    const interval = setInterval(() => {
      const left = end - Date.now();
      if (left <= 0) {
        clearInterval(interval);
        timerEl.classList.add('hidden');
        submitBtn.disabled = false;
        timerEl.textContent = '';
        return;
      }
      timerEl.textContent = `Thử lại sau: ${Security.RateLimiter.formatRemaining(left)}`;
    }, 1000);
  }

  /* ─── Navigation / Routing ─── */
  function navigate(pageId, params = {}) {
    const page = PAGES[pageId];
    if (!page) { navigate('dashboard'); return; }

    // Admin-only check
    if (page.adminOnly && !Auth.isAdmin()) {
      Utils.showToast('Bạn không có quyền truy cập trang này', 'error');
      return;
    }

    _currentPage = pageId;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });

    // Update breadcrumb / page title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = page.title;

    // Render page
    const content = document.getElementById('mainContent');
    if (content) {
      content.innerHTML = '<div class="page-loader"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';
    }

    // Small delay for UX
    setTimeout(() => {
      try {
        page.fn(params);
      } catch (err) {
        console.error('[App] Page render error:', err);
        if (content) {
          content.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Lỗi tải trang. Vui lòng thử lại.</p></div>`;
        }
      }
    }, 50);
  }

  /* ─── Global Event Handlers ─── */
  function setupEventHandlers() {
    // Sidebar navigation
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('[data-page]');
      if (navItem && navItem.dataset.page) {
        e.preventDefault();
        navigate(navItem.dataset.page);
        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');
      }

      // Logout button
      if (e.target.closest('#logoutBtn')) {
        e.preventDefault();
        Utils.Modal.confirm('Bạn có chắc muốn đăng xuất?', () => {
          Auth.logout();
          showLogin();
        });
      }

      // Mobile sidebar toggle
      if (e.target.closest('#sidebarToggle')) {
        document.getElementById('sidebar')?.classList.toggle('open');
      }

      // Close sidebar on overlay click
      if (e.target.closest('#sidebarOverlay')) {
        document.getElementById('sidebar')?.classList.remove('open');
      }

      // Notification bell
      if (e.target.closest('#notifBell')) {
        navigate('notifications');
      }

      // Modal close buttons
      const closeModal = e.target.closest('[data-close-modal]');
      if (closeModal) {
        Utils.Modal.hide(closeModal.dataset.closeModal);
      }

      // Modal backdrop click
      const modal = e.target.closest('.modal');
      if (modal && e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+K = Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
      }
      // Escape = close modals
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => {
          m.classList.remove('active');
          document.body.style.overflow = '';
        });
        document.getElementById('searchResults')?.classList.add('hidden');
      }
      // Ctrl+N = New dossier
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && Auth.isLoggedIn()) {
        e.preventDefault();
        navigate('dossier_new');
      }
    });
  }

  /* ─── Global Search ─── */
  function setupSearch() {
    const searchInput  = document.getElementById('globalSearch');
    const searchResult = document.getElementById('searchResults');
    if (!searchInput || !searchResult) return;

    searchInput.addEventListener('input', Utils.debounce(() => {
      const q = Security.Validator.sanitizeQuery(searchInput.value).trim();
      if (q.length < 2) { searchResult.classList.add('hidden'); return; }

      const result = API.dossiers.list({ search: q }, 'createdAt_desc', 1, 8);
      if (!result.success || !result.data.length) {
        searchResult.innerHTML = '<div class="search-item no-result">Không tìm thấy kết quả</div>';
        searchResult.classList.remove('hidden');
        return;
      }

      const html = result.data.map(d => {
        const sb = Utils.statusBadge(d.status);
        return `
          <div class="search-item" data-id="${Security.e(d.id)}">
            <span class="search-id">${Security.e(d.id)}</span>
            <span class="search-name">${Utils.highlight(d.projectName, q)}</span>
            <span class="badge ${Security.e(sb.class)}">${Security.e(sb.label)}</span>
          </div>`;
      }).join('');

      searchResult.innerHTML = html;
      searchResult.classList.remove('hidden');

      // Click kết quả
      searchResult.querySelectorAll('.search-item[data-id]').forEach(el => {
        el.addEventListener('click', () => {
          searchInput.value = '';
          searchResult.classList.add('hidden');
          navigate('dossiers');
          setTimeout(() => PageDossiers.openDetail(el.dataset.id), 100);
        });
      });
    }, 350));

    // Click ngoài để đóng
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResult.contains(e.target)) {
        searchResult.classList.add('hidden');
      }
    });
  }

  /* ─── Notification Badge ─── */
  function loadNotificationBadge() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const count  = DB.notifications.getUnreadCount(user.id);
    const badge  = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  /* ─── Deadline Checker ─── */
  function startDeadlineChecker() {
    const check = () => {
      if (!Auth.isLoggedIn()) return;
      const overdue = DB.stats.overdue();
      if (overdue.length > 0) {
        const badge = document.getElementById('overdueBadge');
        if (badge) {
          badge.textContent = overdue.length;
          badge.style.display = 'flex';
        }
      }
    };
    check();
    setInterval(check, 5 * 60 * 1000); // check mỗi 5 phút
  }

  /* ─── Public ─── */
  return {
    init,
    navigate,
    showLogin,
    showApp,
    loadNotificationBadge,
    getCurrentPage: () => _currentPage,
    PAGES
  };
})();

window.App = App;

// Khởi động khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => App.init());
