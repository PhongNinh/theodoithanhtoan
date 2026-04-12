/**
 * auth.js - Xác thực & Phân quyền (async, Table API backed)
 * PayTrack Pro v3.0
 */

const Auth = (() => {
  'use strict';

  const ROLES = {
    admin:      { label: 'Quản trị viên',        color: '#dc3545', icon: 'fa-crown',           permissions: ['*'] },
    telecom:    { label: 'Nhân viên Viễn thông', color: '#007bff', icon: 'fa-network-wired',
                  permissions: ['dossier.view','dossier.update_status','workflow.verify','workflow.send_accounting','comment.create','comment.view','notification.view'] },
    business:   { label: 'Nhân viên Kinh doanh', color: '#fd7e14', icon: 'fa-briefcase',
                  permissions: ['dossier.view','dossier.create','dossier.update_own','dossier.submit','comment.create','comment.view','notification.view'] },
    accounting: { label: 'Nhân viên Kế toán',    color: '#28a745', icon: 'fa-calculator',
                  permissions: ['dossier.view','dossier.approve','dossier.mark_paid','dossier.archive','report.view','report.export','comment.create','comment.view','notification.view'] }
  };

  const DEPT_LABELS = {
    telecom: 'Phòng Viễn thông', business: 'Phòng Kinh doanh',
    accounting: 'Phòng Kế toán', admin: 'Ban Quản trị'
  };

  let _currentUser  = null;
  let _sessionToken = null;

  /* ─── Restore session ─── */
  async function init() {
    const saved = Security.SecureStorage.get('currentUser');
    const token = Security.SecureStorage.get('sessionToken');
    if (!saved || !token) return false;

    // Verify user still active
    try {
      const user = await DB.users.getById(saved.id);
      if (!user || user.active === false) { Security.SecureStorage.clear(); return false; }
      _currentUser  = saved;
      _sessionToken = token;
      Security.SessionManager.start();
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ─── Login ─── */
  async function login(username, password) {
    const cleanUser = Security.XSS.sanitizeInput(username).toLowerCase().trim();
    const cleanPass = Security.XSS.sanitizeInput(password);

    if (!cleanUser || !cleanPass) return { ok: false, reason: 'Vui lòng nhập đầy đủ thông tin' };

    const limitKey   = `login_${cleanUser}`;
    const limitCheck = Security.RateLimiter.check(limitKey);
    if (limitCheck.blocked) {
      return { ok: false, locked: true, remaining: limitCheck.remaining,
        reason: `Tài khoản tạm khóa. Thử lại sau ${Security.RateLimiter.formatRemaining(limitCheck.remaining)}` };
    }

    const passwordHash = await Security.Password.hash(cleanPass);

    const user = await DB.users.getByUsername(cleanUser);
    if (!user || user.active === false) {
      const rec = Security.RateLimiter.record(limitKey);
      Security.SecurityMonitor.logEvent('LOGIN_FAILED', { username: cleanUser });
      return { ok: false,
        reason: rec.blocked
          ? `Quá nhiều lần thất bại. Khóa ${Security.RateLimiter.formatRemaining(rec.remaining)}`
          : `Tên đăng nhập hoặc mật khẩu không đúng. Còn ${rec.remaining} lần thử`,
        attemptsLeft: rec.remaining };
    }

    if (user.passwordHash !== passwordHash) {
      const rec = Security.RateLimiter.record(limitKey);
      Security.SecurityMonitor.logEvent('LOGIN_WRONG_PASSWORD', { username: cleanUser });
      return { ok: false,
        reason: rec.blocked
          ? `Quá nhiều lần thất bại. Khóa ${Security.RateLimiter.formatRemaining(rec.remaining)}`
          : `Tên đăng nhập hoặc mật khẩu không đúng. Còn ${rec.remaining} lần thử`,
        attemptsLeft: rec.remaining };
    }

    // Success
    Security.RateLimiter.reset(limitKey);
    const token = crypto.randomUUID ? crypto.randomUUID() : genToken();

    const sessionUser = {
      id: user.id, username: user.username, displayName: user.displayName,
      email: user.email, role: user.role, department: user.department,
      avatar: user.avatar, color: user.color, loginAt: Date.now()
    };

    _currentUser  = sessionUser;
    _sessionToken = token;
    Security.SecureStorage.set('currentUser', sessionUser);
    Security.SecureStorage.set('sessionToken', token);

    // Update lastLogin async (không await để không chặn)
    DB.users.update(user.id, { lastLogin: new Date().toISOString(), loginCount: (Number(user.loginCount) || 0) + 1 });
    DB.auditLogs.log(user.id, 'USER_LOGIN', user.id, 'user', { username: user.username });
    Security.SecurityMonitor.logEvent('LOGIN_SUCCESS', { userId: user.id, role: user.role });
    Security.startSession(sessionUser);

    return { ok: true, user: sessionUser };
  }

  /* ─── Logout ─── */
  function logout(silent = false) {
    if (_currentUser) {
      DB.auditLogs.log(_currentUser.id, 'USER_LOGOUT', _currentUser.id, 'user', {});
      Security.endSession(_currentUser.id);
    }
    _currentUser  = null;
    _sessionToken = null;
    if (!silent && window.App) App.showLogin();
  }

  function genToken() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2,'0')).join('');
  }

  /* ─── RBAC ─── */
  function hasPermission(perm) {
    if (!_currentUser) return false;
    const role = ROLES[_currentUser.role];
    if (!role) return false;
    if (role.permissions.includes('*')) return true;
    return role.permissions.includes(perm);
  }

  function isAdmin() { return _currentUser?.role === 'admin'; }

  function canTransitionDossier(dossier, newStatus) {
    if (!_currentUser) return false;
    if (isAdmin()) return true;
    const check = DB.workflow.canTransition(dossier.status, newStatus, _currentUser.role);
    if (!check.ok) return false;
    if (_currentUser.role === 'business') return dossier.creatorId === _currentUser.id;
    return true;
  }

  function canEditDossier(dossier) {
    if (!_currentUser) return false;
    if (isAdmin()) return true;
    if (_currentUser.role === 'business')  return dossier.creatorId === _currentUser.id;
    if (_currentUser.role === 'telecom')   return true;
    return false;
  }

  function canViewDossier() {
    return hasPermission('dossier.view') || isAdmin();
  }

  /* ─── Change Password ─── */
  async function changePassword(oldPwd, newPwd) {
    if (!_currentUser) return { ok: false, reason: 'Chưa đăng nhập' };
    const validation = Security.Password.validate(newPwd);
    if (!validation.valid) return { ok: false, reason: validation.reason };

    const user    = await DB.users.getById(_currentUser.id);
    const oldHash = await Security.Password.hash(Security.XSS.sanitizeInput(oldPwd));
    const newHash = await Security.Password.hash(Security.XSS.sanitizeInput(newPwd));

    if (user.passwordHash !== oldHash) return { ok: false, reason: 'Mật khẩu cũ không đúng' };

    await DB.users.update(_currentUser.id, { passwordHash: newHash });
    DB.auditLogs.log(_currentUser.id, 'PASSWORD_CHANGE', _currentUser.id, 'user', {});
    return { ok: true };
  }

  /* ─── Register (Admin only) ─── */
  async function register(data) {
    if (!isAdmin()) return { ok: false, reason: 'Chỉ admin mới được tạo tài khoản' };

    const { username, password, displayName, email, role, department } = data;
    if (!username || !password || !displayName || !role) return { ok: false, reason: 'Vui lòng điền đầy đủ thông tin bắt buộc' };
    if (!Security.Validator.validate('username', username)) return { ok: false, reason: 'Tên đăng nhập không hợp lệ (3-50 ký tự, chữ/số/_)' };

    const existing = await DB.users.getByUsername(username.toLowerCase().trim());
    if (existing) return { ok: false, reason: 'Tên đăng nhập đã tồn tại' };

    const pwCheck = Security.Password.validate(password);
    if (!pwCheck.valid) return { ok: false, reason: pwCheck.reason };

    const passwordHash = await Security.Password.hash(Security.XSS.sanitizeInput(password));
    const colors = ['#007bff','#28a745','#fd7e14','#dc3545','#6f42c1','#17a2b8','#e83e8c'];
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const abbr   = displayName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const uid    = 'u' + Date.now().toString(36);

    const user = await DB.users.create({
      id: uid, username: username.toLowerCase().trim(),
      displayName: Security.XSS.sanitizeInput(displayName),
      email: Security.XSS.sanitizeInput(email || ''),
      role, department: department || role,
      passwordHash, active: true,
      avatar: abbr, color, loginCount: 0, lastLogin: ''
    });

    DB.auditLogs.log(_currentUser.id, 'USER_CREATED', uid, 'user', { username, role });
    return { ok: true, user };
  }

  /* ─── Public ─── */
  return {
    ROLES, DEPT_LABELS,
    init, login, logout, changePassword, register,
    getCurrentUser:  () => _currentUser,
    getSessionToken: () => _sessionToken,
    isLoggedIn:      () => !!_currentUser && !!_sessionToken,
    isAdmin,
    hasPermission,
    canTransitionDossier,
    canEditDossier,
    canViewDossier,
    getRoleLabel: (r) => ROLES[r]?.label  || r,
    getRoleColor: (r) => ROLES[r]?.color  || '#6c757d',
    getRoleIcon:  (r) => ROLES[r]?.icon   || 'fa-user',
    getDeptLabel: (d) => DEPT_LABELS[d]   || d
  };
})();

window.Auth = Auth;
