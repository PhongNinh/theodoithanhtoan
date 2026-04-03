/**
 * auth.js - Hệ thống xác thực và phân quyền
 * PayTrack Pro
 *
 * Bảo mật:
 * - SHA-256 password hashing (client-side)
 * - Rate limiting / brute-force protection
 * - Session management với auto-timeout
 * - RBAC (Role-Based Access Control)
 * - Secure session token (random UUID)
 * - Audit logging mọi sự kiện đăng nhập
 */

const Auth = (() => {
  'use strict';

  /* ─── Role Definitions ─── */
  const ROLES = {
    admin: {
      label: 'Quản trị viên', color: '#dc3545', icon: 'fa-crown',
      permissions: ['*'] // toàn quyền
    },
    telecom: {
      label: 'Nhân viên Viễn thông', color: '#007bff', icon: 'fa-network-wired',
      permissions: [
        'dossier.view', 'dossier.update_status',
        'workflow.verify', 'workflow.send_accounting',
        'comment.create', 'comment.view',
        'notification.view'
      ]
    },
    business: {
      label: 'Nhân viên Kinh doanh', color: '#fd7e14', icon: 'fa-briefcase',
      permissions: [
        'dossier.view', 'dossier.create', 'dossier.update_own',
        'dossier.submit',
        'comment.create', 'comment.view',
        'notification.view'
      ]
    },
    accounting: {
      label: 'Nhân viên Kế toán', color: '#28a745', icon: 'fa-calculator',
      permissions: [
        'dossier.view', 'dossier.approve', 'dossier.mark_paid',
        'dossier.archive', 'report.view', 'report.export',
        'comment.create', 'comment.view',
        'notification.view'
      ]
    }
  };

  const DEPT_LABELS = {
    telecom:    'Phòng Viễn thông',
    business:   'Phòng Kinh doanh',
    accounting: 'Phòng Kế toán',
    admin:      'Ban Quản trị'
  };

  let _currentUser = null;
  let _sessionToken = null;

  /* ─── Session restore ─── */
  function restoreSession() {
    if (!window.Security) return false;
    const saved = Security.SecureStorage.get('currentUser');
    const token = Security.SecureStorage.get('sessionToken');
    if (!saved || !token) return false;

    // Xác minh user vẫn còn tồn tại trong DB
    const user = DB.users.getById(saved.id);
    if (!user || !user.active) {
      Security.SecureStorage.clear();
      return false;
    }

    _currentUser   = saved;
    _sessionToken  = token;
    Security.SessionManager.start();
    return true;
  }

  /* ─── Login ─── */
  async function login(username, password) {
    // Validate input trước
    const cleanUsername = Security.XSS.sanitizeInput(username).toLowerCase().trim();
    const cleanPassword = Security.XSS.sanitizeInput(password);

    if (!cleanUsername || !cleanPassword) {
      return { ok: false, reason: 'Vui lòng nhập đầy đủ thông tin' };
    }

    // Kiểm tra rate limit
    const limitKey = `login_${cleanUsername}`;
    const limitCheck = Security.RateLimiter.check(limitKey);
    if (limitCheck.blocked) {
      return {
        ok: false,
        reason: `Tài khoản tạm khóa. Thử lại sau ${Security.RateLimiter.formatRemaining(limitCheck.remaining)}`,
        locked: true,
        remaining: limitCheck.remaining
      };
    }

    // Hash mật khẩu
    const passwordHash = await Security.Password.hash(cleanPassword);

    // Đảm bảo passwords đã được khởi tạo
    await DB._ensurePasswords();

    // Tìm user
    const user = DB.users.getByUsername(cleanUsername);
    if (!user) {
      Security.RateLimiter.record(limitKey);
      Security.SecurityMonitor.logEvent('LOGIN_FAILED_USER_NOT_FOUND', { username: cleanUsername });
      DB.auditLogs.log(null, 'LOGIN_FAILED', cleanUsername, 'user', { reason: 'user_not_found' });

      // Trả về thông báo chung để không lộ thông tin
      const rec = Security.RateLimiter.record(limitKey);
      return {
        ok: false,
        reason: rec.blocked
          ? `Quá nhiều lần thất bại. Tài khoản bị khóa ${Security.RateLimiter.formatRemaining(rec.remaining)}`
          : `Tên đăng nhập hoặc mật khẩu không đúng. Còn ${rec.remaining} lần thử`,
        attemptsLeft: rec.remaining
      };
    }

    if (!user.active) {
      Security.SecurityMonitor.logEvent('LOGIN_FAILED_INACTIVE', { username: cleanUsername });
      return { ok: false, reason: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên' };
    }

    // So sánh hash
    if (user.passwordHash !== passwordHash) {
      const rec = Security.RateLimiter.record(limitKey);
      Security.SecurityMonitor.logEvent('LOGIN_FAILED_WRONG_PASSWORD', { username: cleanUsername });
      DB.auditLogs.log(user.id, 'LOGIN_FAILED', user.id, 'user', { reason: 'wrong_password' });

      return {
        ok: false,
        reason: rec.blocked
          ? `Quá nhiều lần thất bại. Tài khoản bị khóa ${Security.RateLimiter.formatRemaining(rec.remaining)}`
          : `Tên đăng nhập hoặc mật khẩu không đúng. Còn ${rec.remaining} lần thử`,
        attemptsLeft: rec.remaining
      };
    }

    // Đăng nhập thành công
    Security.RateLimiter.reset(limitKey);

    // Tạo session token
    const token = generateSessionToken();
    const sessionUser = {
      id: user.id, username: user.username,
      displayName: user.displayName, email: user.email,
      role: user.role, department: user.department,
      avatar: user.avatar, color: user.color,
      loginAt: Date.now()
    };

    _currentUser  = sessionUser;
    _sessionToken = token;

    // Lưu session an toàn
    Security.SecureStorage.set('currentUser', sessionUser);
    Security.SecureStorage.set('sessionToken', token);

    // Cập nhật lastLogin trong DB
    DB.users.update(user.id, { lastLogin: Date.now(), loginCount: (user.loginCount || 0) + 1 });

    // Audit log
    DB.auditLogs.log(user.id, 'USER_LOGIN', user.id, 'user', { username: user.username });
    Security.SecurityMonitor.logEvent('LOGIN_SUCCESS', { userId: user.id, role: user.role });

    // Tạo thông báo đăng nhập
    DB.notifications.create({
      userId: user.id, type: 'system',
      title: 'Đăng nhập thành công',
      message: `Bạn đã đăng nhập vào hệ thống lúc ${new Date().toLocaleTimeString('vi-VN')}`,
      dossierRef: null
    });

    // Bắt đầu session monitoring
    Security.startSession(sessionUser);

    return { ok: true, user: sessionUser };
  }

  /* ─── Logout ─── */
  function logout(silent = false) {
    if (_currentUser) {
      DB.auditLogs.log(_currentUser.id, 'USER_LOGOUT', _currentUser.id, 'user', {
        duration: _currentUser.loginAt ? Date.now() - _currentUser.loginAt : 0
      });
      Security.endSession(_currentUser.id);
    }

    _currentUser  = null;
    _sessionToken = null;

    if (!silent && window.App) {
      App.showLogin();
    }
  }

  /* ─── Helpers ─── */
  function generateSessionToken() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ─── RBAC ─── */
  function hasPermission(permission) {
    if (!_currentUser) return false;
    const role = ROLES[_currentUser.role];
    if (!role) return false;
    if (role.permissions.includes('*')) return true;
    return role.permissions.includes(permission);
  }

  function isAdmin() { return _currentUser?.role === 'admin'; }

  function canTransitionDossier(dossier, newStatus) {
    if (!_currentUser) return false;
    if (isAdmin()) return true;

    // Kiểm tra workflow
    const check = DB.workflow.canTransition(dossier.status, newStatus, _currentUser.role);
    if (!check.ok) return false;

    // Business staff chỉ được thao tác dossier của mình
    if (_currentUser.role === 'business') {
      return dossier.creatorId === _currentUser.id;
    }

    return true;
  }

  function canEditDossier(dossier) {
    if (!_currentUser) return false;
    if (isAdmin()) return true;
    if (_currentUser.role === 'business') return dossier.creatorId === _currentUser.id;
    if (_currentUser.role === 'telecom') return dossier.department === 'telecom' || dossier.assigneeId === _currentUser.id;
    return false;
  }

  function canViewDossier(dossier) {
    if (!_currentUser) return false;
    if (isAdmin()) return true;
    // Tất cả đều thấy dossier (theo phân quyền role)
    return hasPermission('dossier.view');
  }

  /* ─── Change Password ─── */
  async function changePassword(oldPassword, newPassword) {
    if (!_currentUser) return { ok: false, reason: 'Chưa đăng nhập' };

    const user = DB.users.getById(_currentUser.id);
    if (!user) return { ok: false, reason: 'Không tìm thấy tài khoản' };

    // Validate mật khẩu mới
    const validation = Security.Password.validate(newPassword);
    if (!validation.valid) return { ok: false, reason: validation.reason };

    // Hash cả hai
    const oldHash = await Security.Password.hash(Security.XSS.sanitizeInput(oldPassword));
    const newHash = await Security.Password.hash(Security.XSS.sanitizeInput(newPassword));

    if (user.passwordHash !== oldHash) {
      return { ok: false, reason: 'Mật khẩu cũ không đúng' };
    }

    DB.users.update(user.id, { passwordHash: newHash });
    DB.auditLogs.log(user.id, 'PASSWORD_CHANGE', user.id, 'user', {});
    Security.SecurityMonitor.logEvent('PASSWORD_CHANGED', { userId: user.id });

    return { ok: true };
  }

  /* ─── Register (Admin only) ─── */
  async function register(data) {
    if (!isAdmin()) return { ok: false, reason: 'Chỉ admin mới được tạo tài khoản' };

    const { username, password, displayName, email, role, department } = data;

    // Validate
    if (!username || !password || !displayName || !role) {
      return { ok: false, reason: 'Vui lòng điền đầy đủ thông tin bắt buộc' };
    }
    if (!Security.Validator.validate('username', username)) {
      return { ok: false, reason: 'Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới (3-50 ký tự)' };
    }

    // Kiểm tra trùng username
    const existing = DB.users.getByUsername(username.toLowerCase().trim());
    if (existing) return { ok: false, reason: 'Tên đăng nhập đã tồn tại' };

    const passwordValidation = Security.Password.validate(password);
    if (!passwordValidation.valid) return { ok: false, reason: passwordValidation.reason };

    const passwordHash = await Security.Password.hash(Security.XSS.sanitizeInput(password));

    const colors = ['#007bff', '#28a745', '#fd7e14', '#dc3545', '#6f42c1', '#17a2b8', '#e83e8c'];
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const abbr   = displayName.trim().split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

    const user = DB.users.create({
      username: username.toLowerCase().trim(),
      displayName: Security.XSS.sanitizeInput(displayName),
      email: Security.XSS.sanitizeInput(email || ''),
      role, department: department || role,
      passwordHash, active: true,
      avatar: abbr, color, loginCount: 0
    });

    DB.auditLogs.log(_currentUser.id, 'USER_CREATED', user.id, 'user', {
      username: user.username, role: user.role
    });

    return { ok: true, user };
  }

  /* ─── Public API ─── */
  return {
    ROLES,
    DEPT_LABELS,

    init:    restoreSession,
    login,
    logout,
    changePassword,
    register,

    getCurrentUser: () => _currentUser,
    getSessionToken: () => _sessionToken,

    isLoggedIn:     () => !!_currentUser && !!_sessionToken,
    isAdmin,
    hasPermission,
    canTransitionDossier,
    canEditDossier,
    canViewDossier,

    getRoleLabel:  (role) => ROLES[role]?.label || role,
    getRoleColor:  (role) => ROLES[role]?.color || '#6c757d',
    getRoleIcon:   (role) => ROLES[role]?.icon  || 'fa-user',
    getDeptLabel:  (dept) => DEPT_LABELS[dept]  || dept
  };
})();

window.Auth = Auth;
