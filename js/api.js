/* ===========================
   PayTrack Pro - API Layer
   Simulates backend REST API
   =========================== */

window.API = {
  /* ---- DOSSIERS ---- */
  async getDossiers(filters={}) {
    await this._delay(100);
    let data = [...DB.dossiers];
    if (!Auth.isAdmin) {
      data = data.filter(d => Auth.canViewDossier(d));
    }
    return Utils.filterDossiers(data, filters);
  },

  async getDossier(id) {
    await this._delay(80);
    return DB.dossiers.find(d => d.id === id && !d.is_deleted) || null;
  },

  async createDossier(payload) {
    await this._delay(200);
    const newId = DB.newId();
    const code = DB.getNextDossierCode();
    const dossier = {
      id: newId,
      dossier_code: code,
      is_deleted: false,
      status: 'created',
      created_by_id: Auth.userId,
      created_by_name: Auth.user.full_name,
      created_at: new Date().toISOString(),
      ...payload
    };
    DB.dossiers.push(dossier);

    // Audit log
    this._addAuditLog({
      dossier_id: newId,
      dossier_code: code,
      action: 'create',
      field_changed: 'status',
      old_value: null,
      new_value: 'created',
      comment: `Tạo hồ sơ mới: ${dossier.project_name}`
    });

    // Notify assigned user
    if (payload.assigned_to_id && payload.assigned_to_id !== Auth.userId) {
      this._addNotification({
        user_id: payload.assigned_to_id,
        dossier_id: newId,
        dossier_code: code,
        type: 'assignment',
        title: 'Hồ sơ mới được giao',
        message: `Hồ sơ ${code} "${dossier.project_name}" đã được giao cho bạn.`,
        priority: payload.priority || 'medium'
      });
    }

    return dossier;
  },

  async updateDossier(id, payload) {
    await this._delay(150);
    const idx = DB.dossiers.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Không tìm thấy hồ sơ');
    const old = { ...DB.dossiers[idx] };
    DB.dossiers[idx] = { ...old, ...payload, updated_at: new Date().toISOString() };

    // Log changed fields
    Object.keys(payload).forEach(key => {
      if (old[key] !== payload[key] && key !== 'updated_at') {
        this._addAuditLog({
          dossier_id: id,
          dossier_code: old.dossier_code,
          action: 'edit',
          field_changed: key,
          old_value: String(old[key] || ''),
          new_value: String(payload[key] || ''),
          comment: `Cập nhật trường: ${key}`
        });
      }
    });

    return DB.dossiers[idx];
  },

  async changeStatus(id, newStatus, comment='') {
    await this._delay(200);
    const idx = DB.dossiers.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Không tìm thấy hồ sơ');
    const dossier = DB.dossiers[idx];
    const oldStatus = dossier.status;

    // Validate transition
    const allowed = WORKFLOW.allowedTransitions(Auth.role, oldStatus);
    if (!allowed.includes(newStatus)) {
      throw new Error(`Không được phép chuyển từ "${STATUS_LABELS[oldStatus]}" sang "${STATUS_LABELS[newStatus]}"`);
    }

    DB.dossiers[idx].status = newStatus;
    DB.dossiers[idx].updated_at = new Date().toISOString();

    // Audit log
    this._addAuditLog({
      dossier_id: id,
      dossier_code: dossier.dossier_code,
      action: 'status_change',
      field_changed: 'status',
      old_value: oldStatus,
      new_value: newStatus,
      comment: comment || `Chuyển trạng thái: ${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[newStatus]}`
    });

    // Notify creator
    if (dossier.created_by_id !== Auth.userId) {
      this._addNotification({
        user_id: dossier.created_by_id,
        dossier_id: id,
        dossier_code: dossier.dossier_code,
        type: 'status_change',
        title: 'Trạng thái hồ sơ thay đổi',
        message: `${dossier.dossier_code} đã chuyển sang: ${STATUS_LABELS[newStatus]}`,
        priority: dossier.priority
      });
    }

    // Notify assigned user when sent to accounting
    if (newStatus === 'sent_accounting') {
      DB.users.filter(u => u.role === 'accounting_staff').forEach(u => {
        this._addNotification({
          user_id: u.id,
          dossier_id: id,
          dossier_code: dossier.dossier_code,
          type: 'assignment',
          title: 'Hồ sơ chờ phê duyệt',
          message: `${dossier.dossier_code} "${dossier.project_name}" đã được chuyển sang Kế toán.`,
          priority: 'high'
        });
      });
    }

    return DB.dossiers[idx];
  },

  async deleteDossier(id) {
    await this._delay(150);
    const idx = DB.dossiers.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Không tìm thấy hồ sơ');
    DB.dossiers[idx].is_deleted = true;
    this._addAuditLog({
      dossier_id: id,
      dossier_code: DB.dossiers[idx].dossier_code,
      action: 'delete',
      field_changed: 'is_deleted',
      old_value: 'false',
      new_value: 'true',
      comment: 'Xóa hồ sơ'
    });
    return true;
  },

  /* ---- AUDIT LOGS ---- */
  async getAuditLogs(dossierId=null) {
    await this._delay(80);
    let logs = [...DB.auditLogs];
    if (dossierId) logs = logs.filter(l => l.dossier_id === dossierId);
    return logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  /* ---- COMMENTS ---- */
  async getComments(dossierId) {
    await this._delay(60);
    return DB.comments.filter(c => c.dossier_id === dossierId && !c.is_deleted)
      .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  },

  async addComment(dossierId, content, isInternal=false) {
    await this._delay(150);
    const dossier = DB.dossiers.find(d => d.id === dossierId);
    const comment = {
      id: DB.newId(),
      dossier_id: dossierId,
      user_id: Auth.userId,
      user_name: Auth.user.full_name,
      user_role: Auth.role,
      content,
      is_internal: isInternal,
      is_deleted: false,
      created_at: new Date().toISOString()
    };
    DB.comments.push(comment);

    this._addAuditLog({
      dossier_id: dossierId,
      dossier_code: dossier?.dossier_code || '',
      action: 'comment',
      field_changed: 'comments',
      old_value: '',
      new_value: Utils.truncate(content, 50),
      comment: content
    });

    return comment;
  },

  /* ---- NOTIFICATIONS ---- */
  async getNotifications(userId=null) {
    await this._delay(60);
    const uid = userId || Auth.userId;
    return DB.notifications
      .filter(n => n.user_id === uid || Auth.isAdmin)
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async markNotificationRead(id) {
    const n = DB.notifications.find(n => n.id === id);
    if (n) n.is_read = true;
  },

  async markAllRead() {
    DB.notifications.filter(n => n.user_id === Auth.userId).forEach(n => n.is_read = true);
  },

  getUnreadCount() {
    return DB.notifications.filter(n => n.user_id === Auth.userId && !n.is_read).length;
  },

  /* ---- USERS ---- */
  async getUsers() {
    await this._delay(80);
    return DB.users.map(u => ({ ...u, password: undefined }));
  },

  async createUser(payload) {
    await this._delay(200);
    if (DB.users.find(u => u.username === payload.username)) {
      throw new Error('Tên đăng nhập đã tồn tại');
    }
    const id = DB.newId();
    const user = {
      id, ...payload,
      avatar: Utils.getInitials(payload.full_name),
      is_active: true,
      created_at: new Date().toISOString()
    };
    DB.users.push(user);
    return { ...user, password: undefined };
  },

  async updateUser(id, payload) {
    await this._delay(150);
    const idx = DB.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Không tìm thấy người dùng');
    DB.users[idx] = { ...DB.users[idx], ...payload };
    return { ...DB.users[idx], password: undefined };
  },

  async deleteUser(id) {
    await this._delay(150);
    const idx = DB.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Không tìm thấy người dùng');
    if (id === Auth.userId) throw new Error('Không thể xóa tài khoản đang đăng nhập');
    DB.users[idx].is_active = false;
    return true;
  },

  /* ---- DASHBOARD STATS ---- */
  async getDashboardStats() {
    await this._delay(100);
    const allDossiers = DB.dossiers.filter(d => !d.is_deleted);
    const now = new Date();

    const byStatus = {};
    WORKFLOW.steps.forEach(s => { byStatus[s.key] = 0; });
    allDossiers.forEach(d => { if (byStatus[d.status] !== undefined) byStatus[d.status]++; });

    const overdue = allDossiers.filter(d =>
      d.deadline && new Date(d.deadline) < now &&
      !['paid','archived'].includes(d.status)
    );

    const totalAmount = allDossiers.reduce((s,d) => s + (d.amount||0), 0);
    const paidAmount = allDossiers.filter(d=>d.status==='paid').reduce((s,d)=>s+(d.amount||0),0);

    const byDept = {};
    allDossiers.forEach(d => {
      byDept[d.department] = (byDept[d.department]||0)+1;
    });

    const byPriority = { high:0, medium:0, low:0 };
    allDossiers.forEach(d => { byPriority[d.priority]++; });

    const recentActivity = DB.auditLogs
      .sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp))
      .slice(0,8);

    return {
      total: allDossiers.length,
      byStatus,
      overdue: overdue.length,
      overdueList: overdue.slice(0,5),
      totalAmount,
      paidAmount,
      byDept,
      byPriority,
      recentActivity,
      users: DB.users.filter(u=>u.is_active).length
    };
  },

  /* ---- PRIVATE ---- */
  _addAuditLog(data) {
    DB.auditLogs.push({
      id: DB.newId(),
      user_id: Auth.userId,
      user_name: Auth.user?.full_name || 'System',
      user_role: Auth.role,
      ip_address: '127.0.0.1',
      timestamp: new Date().toISOString(),
      ...data
    });
  },

  _addNotification(data) {
    DB.notifications.push({
      id: DB.newId(),
      is_read: false,
      created_at: new Date().toISOString(),
      ...data
    });
  },

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
};
