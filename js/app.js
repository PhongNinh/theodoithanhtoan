/* ===========================
   PayTrack Pro - Main App Controller
   =========================== */

/* ---- TOAST SYSTEM ---- */
window.Toast = {
  show(title, msg='', type='info', duration=4000) {
    const icons = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
    const container = document.getElementById('toastContainer');
    const id = 'toast_' + Date.now();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.id = id;
    el.innerHTML = `
      <i class="fas ${icons[type]||'fa-info-circle'} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${msg?`<div class="toast-msg">${msg}</div>`:''}
      </div>
      <button class="toast-close" onclick="document.getElementById('${id}').remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(el);
    setTimeout(() => { if(document.getElementById(id)) el.remove(); }, duration);
  }
};

/* ---- MODAL SYSTEM ---- */
window.openModal = function(id) {
  document.getElementById(id)?.classList.add('show');
};
window.closeModal = function(id) {
  document.getElementById(id)?.classList.remove('show');
};
window.closeModalOverlay = function(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
};

/* ---- NAVIGATION ---- */
const PAGE_MAP = {
  dashboard: { title:'Dashboard', render: () => DashboardPage.render() },
  dossiers:  { title:'Danh sách Hồ sơ', render: () => DossiersPage.render() },
  kanban:    { title:'Kanban Board', render: () => KanbanPage.render() },
  create:    { title:'Tạo Hồ sơ mới', render: () => CreateDossierPage.render() },
  audit:     { title:'Audit Log', render: () => AuditPage.render() },
  notifications: { title:'Thông báo', render: () => NotificationsPage.render() },
  reports:   { title:'Báo cáo', render: () => ReportsPage.render() },
  users:     { title:'Quản lý Người dùng', render: () => UsersPage.render() },
  settings:  { title:'Cài đặt', render: () => SettingsPage.render() },
};

window.navigate = function(page, linkEl) {
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
  });
  if (linkEl) {
    linkEl.classList.add('active');
  } else {
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  }

  // Update breadcrumb
  document.getElementById('breadcrumb').textContent = PAGE_MAP[page]?.title || page;

  // Mobile: close sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');

  // Render page
  PAGE_MAP[page]?.render();
};

/* ---- AUTH UI ---- */
window.doLogin = async function() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  if (!username || !password) {
    errEl.textContent = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';

  await new Promise(r => setTimeout(r, 600));
  const result = Auth.login(username, password);

  if (result.success) {
    errEl.style.display = 'none';
    showApp();
    Toast.show('Chào mừng!', `Xin chào ${result.user.full_name}!`, 'success');
  } else {
    errEl.textContent = result.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
  }
};

window.doLogout = function() {
  Auth.logout();
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
  document.body.classList.remove('is-admin','is-telecom','is-biz','is-acc');
};

window.fillDemo = function(u, p) {
  document.getElementById('loginUsername').value = u;
  document.getElementById('loginPassword').value = p;
  document.getElementById('loginError').style.display = 'none';
};

window.togglePwd = function(inputId='loginPassword') {
  const input = document.getElementById(inputId);
  const icon = inputId==='loginPassword' ? document.getElementById('eyeIcon') : input?.parentNode?.querySelector('i');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  if (icon) icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
};

/* ---- SHOW APP ---- */
function showApp() {
  const user = Auth.user;
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';

  // Set body role class
  document.body.classList.remove('is-admin','is-telecom','is-biz','is-acc');
  if (user.role === 'admin') document.body.classList.add('is-admin');
  else if (user.role === 'telecom_staff') document.body.classList.add('is-telecom');
  else if (user.role === 'business_staff') document.body.classList.add('is-biz');
  else if (user.role === 'accounting_staff') document.body.classList.add('is-acc');

  updateUserUI();
  updateNotifBadge();

  // Role-based nav visibility
  if (!Auth.can('create_dossier')) document.getElementById('navCreate')?.style && (document.getElementById('navCreate').style.display = 'none');

  // Init dashboard
  navigate('dashboard', document.querySelector('[data-page="dashboard"]'));
}

/* ---- UPDATE UI ---- */
window.updateUserUI = function() {
  const user = Auth.user;
  if (!user) return;
  const initials = Utils.getInitials(user.full_name);
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  // Sidebar
  const avatar = document.getElementById('sidebarAvatar');
  if (avatar) { avatar.textContent = initials; }
  const sName = document.getElementById('sidebarName');
  if (sName) sName.textContent = user.full_name;
  const sRole = document.getElementById('sidebarRole');
  if (sRole) sRole.textContent = roleLabel;

  // Topbar
  const tAvatar = document.getElementById('topbarAvatar');
  if (tAvatar) tAvatar.textContent = initials;
  const tName = document.getElementById('topbarName');
  if (tName) tName.textContent = user.full_name.split(' ').pop();
  const ddName = document.getElementById('ddName');
  if (ddName) ddName.textContent = user.full_name;
  const ddRole = document.getElementById('ddRole');
  if (ddRole) ddRole.textContent = roleLabel;
};

window.updateNotifBadge = function() {
  const count = API.getUnreadCount();
  const badge = document.getElementById('badgeNotif');
  if (badge) badge.textContent = count;
  const dot = document.getElementById('notifDot');
  if (dot) {
    if (count > 0) dot.classList.add('show');
    else dot.classList.remove('show');
  }
};

/* ---- SIDEBAR TOGGLE ---- */
window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('mainContent');

  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  }
};

/* ---- USER DROPDOWN ---- */
window.toggleUserMenu = function() {
  document.getElementById('userDropdown').classList.toggle('show');
};

document.addEventListener('click', e => {
  const dd = document.getElementById('userDropdown');
  if (dd && !e.target.closest('.topbar-user')) dd.classList.remove('show');

  const sr = document.getElementById('searchResults');
  if (sr && !e.target.closest('.search-bar')) sr.style.display = 'none';
});

/* ---- GLOBAL SEARCH ---- */
window.globalSearchHandler = Utils.debounce(function() {
  const q = document.getElementById('globalSearch')?.value?.trim();
  const sr = document.getElementById('searchResults');
  if (!sr) return;
  if (!q || q.length < 2) { sr.style.display = 'none'; return; }

  const results = DB.dossiers.filter(d =>
    !d.is_deleted && (
      d.dossier_code.toLowerCase().includes(q.toLowerCase()) ||
      d.project_name.toLowerCase().includes(q.toLowerCase()) ||
      (d.contract_number||'').toLowerCase().includes(q.toLowerCase())
    )
  ).slice(0,8);

  if (!results.length) {
    sr.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Không tìm thấy kết quả</div>';
  } else {
    sr.innerHTML = results.map(d=>`
      <div class="search-result-item" onclick="openDossierDetail('${d.id}');document.getElementById('searchResults').style.display='none'">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="sr-code">${d.dossier_code}</span>
          ${Utils.statusBadge(d.status)}
        </div>
        <div class="sr-name">${d.project_name}</div>
        <div class="sr-meta">${Utils.deptLabel(d.department)} · ${Utils.formatAmount(d.amount)} ₫ · ${Utils.formatDate(d.deadline)}</div>
      </div>`).join('');
  }
  sr.style.display = 'block';
}, 250);

/* ---- KEYBOARD SHORTCUTS ---- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    document.getElementById('userDropdown')?.classList.remove('show');
    document.getElementById('searchResults').style.display = 'none';
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('globalSearch')?.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n' && Auth.can('create_dossier')) {
    e.preventDefault();
    navigate('create', null);
  }
});

/* ---- DEADLINE ALERTS ---- */
function checkDeadlineAlerts() {
  const soon = DB.dossiers.filter(d => {
    if (d.is_deleted || ['paid','archived'].includes(d.status)) return false;
    const days = Utils.daysUntilDeadline(d.deadline);
    return days !== null && days >= 0 && days <= 2;
  });

  if (soon.length > 0 && Auth.user) {
    const relevant = soon.filter(d =>
      Auth.isAdmin ||
      d.created_by_id === Auth.userId ||
      d.assigned_to_id === Auth.userId
    );
    if (relevant.length > 0) {
      setTimeout(() => {
        Toast.show(
          `⚠️ ${relevant.length} hồ sơ sắp đến hạn`,
          relevant.map(d=>d.dossier_code).join(', '),
          'warning',
          6000
        );
      }, 2000);
    }
  }
}

/* ---- SIMULATED REAL-TIME ---- */
function startRealtimeSimulation() {
  setInterval(() => {
    updateNotifBadge();
    // Update badge counts
    const total = DB.dossiers.filter(d=>!d.is_deleted).length;
    const badgeDossiers = document.getElementById('badgeDossiers');
    if (badgeDossiers) badgeDossiers.textContent = total;
  }, 10000);
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  // Enter key login
  document.getElementById('loginPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginUsername')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // Check saved session
  if (Auth.init()) {
    showApp();
    checkDeadlineAlerts();
  } else {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
  }

  startRealtimeSimulation();
});

/* ---- WINDOW RESIZE ---- */
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
  }
});
