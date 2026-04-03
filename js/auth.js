/* ===========================
   PayTrack Pro - Authentication
   =========================== */

window.Auth = {
  currentUser: null,
  SESSION_KEY: 'paytrack_session',

  init() {
    const saved = localStorage.getItem(this.SESSION_KEY);
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        return true;
      } catch(e) {
        localStorage.removeItem(this.SESSION_KEY);
      }
    }
    return false;
  },

  login(username, password) {
    const user = DB.users.find(u =>
      u.username === username && u.password === password && u.is_active
    );
    if (!user) return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
    this.currentUser = { ...user };
    delete this.currentUser.password;
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentUser));
    return { success: true, user: this.currentUser };
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.SESSION_KEY);
  },

  get user() { return this.currentUser; },
  get role() { return this.currentUser?.role || ''; },
  get userId() { return this.currentUser?.id || ''; },
  get isAdmin() { return this.role === 'admin'; },
  get isTelecom() { return this.role === 'telecom_staff'; },
  get isBusiness() { return this.role === 'business_staff'; },
  get isAccounting() { return this.role === 'accounting_staff'; },

  can(action) {
    const role = this.role;
    const perms = {
      create_dossier: ['admin','business_staff','telecom_staff'],
      edit_dossier:   ['admin','telecom_staff','business_staff'],
      delete_dossier: ['admin'],
      change_status:  ['admin','telecom_staff','business_staff','accounting_staff'],
      approve:        ['admin','accounting_staff'],
      mark_paid:      ['admin','accounting_staff'],
      archive:        ['admin','accounting_staff'],
      manage_users:   ['admin'],
      view_all:       ['admin'],
      view_audit:     ['admin','telecom_staff','accounting_staff'],
      export:         ['admin','accounting_staff'],
    };
    return (perms[action] || []).includes(role);
  },

  canViewDossier(dossier) {
    if (this.isAdmin) return true;
    if (this.isTelecom) return dossier.department === 'vien_thong' || dossier.assigned_department === 'vien_thong' || dossier.assigned_to_id === this.userId;
    if (this.isBusiness) return dossier.created_by_id === this.userId || dossier.department === 'kinh_doanh';
    if (this.isAccounting) return dossier.assigned_department === 'ke_toan' || ['sent_accounting','approved','paid','archived'].includes(dossier.status);
    return false;
  }
};
