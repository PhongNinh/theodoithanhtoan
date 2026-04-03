/**
 * api.js - Lớp API nội bộ với validation và bảo mật
 * PayTrack Pro
 *
 * Tất cả dữ liệu vào/ra đều được:
 * - Validate schema
 * - Sanitize XSS
 * - Kiểm tra quyền truy cập (RBAC)
 * - Audit logged
 */

const API = (() => {
  'use strict';

  /* ─── Response helpers ─── */
  function ok(data, meta = {}) {
    return { success: true, data, ...meta };
  }

  function err(message, code = 400) {
    return { success: false, error: message, code };
  }

  function authCheck() {
    if (!Auth.isLoggedIn()) return err('Chưa xác thực. Vui lòng đăng nhập lại', 401);
    return null;
  }

  /* ─── Input validation schemas ─── */
  const schemas = {
    dossier: {
      projectName:  { type: 'string', required: true, maxLen: 200 },
      contractNo:   { type: 'string', required: false, maxLen: 50 },
      department:   { type: 'enum',   required: true, values: ['telecom', 'business', 'accounting'] },
      priority:     { type: 'enum',   required: true, values: ['urgent', 'high', 'medium', 'low'] },
      amount:       { type: 'number', required: true, min: 0, max: 1e12 },
      deadline:     { type: 'date',   required: false },
      description:  { type: 'string', required: false, maxLen: 2000 },
      notes:        { type: 'string', required: false, maxLen: 1000 },
      assigneeId:   { type: 'string', required: false, maxLen: 50 }
    },
    user: {
      username:     { type: 'string', required: true, maxLen: 50, pattern: /^[a-zA-Z0-9_\.]{3,50}$/ },
      displayName:  { type: 'string', required: true, maxLen: 100 },
      email:        { type: 'string', required: false, maxLen: 100 },
      role:         { type: 'enum',   required: true, values: ['admin', 'telecom', 'business', 'accounting'] },
      department:   { type: 'enum',   required: true, values: ['admin', 'telecom', 'business', 'accounting'] },
      password:     { type: 'string', required: true, minLen: 6, maxLen: 100 }
    },
    statusChange: {
      newStatus: { type: 'string', required: true, maxLen: 50 },
      note:      { type: 'string', required: false, maxLen: 500 }
    },
    comment: {
      text: { type: 'string', required: true, maxLen: 1000 }
    }
  };

  /**
   * Validate dữ liệu theo schema
   */
  function validateSchema(data, schemaName) {
    const schema = schemas[schemaName];
    if (!schema) return { valid: true, data };

    const errors = [];
    const clean  = {};

    for (const [field, rules] of Object.entries(schema)) {
      let value = data[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Trường "${field}" là bắt buộc`);
        continue;
      }

      if (value === undefined || value === null || value === '') {
        clean[field] = value;
        continue;
      }

      // Type validation
      switch (rules.type) {
        case 'string':
          value = Security.XSS.sanitizeInput(String(value));
          if (rules.maxLen && value.length > rules.maxLen) {
            value = value.substring(0, rules.maxLen);
          }
          if (rules.minLen && value.length < rules.minLen) {
            errors.push(`"${field}" cần ít nhất ${rules.minLen} ký tự`);
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`"${field}" không hợp lệ`);
          }
          break;

        case 'number':
          value = parseFloat(value);
          if (isNaN(value)) { errors.push(`"${field}" phải là số`); continue; }
          if (rules.min !== undefined && value < rules.min) errors.push(`"${field}" không được nhỏ hơn ${rules.min}`);
          if (rules.max !== undefined && value > rules.max) errors.push(`"${field}" không được lớn hơn ${rules.max}`);
          break;

        case 'enum':
          if (!rules.values.includes(value)) {
            errors.push(`"${field}" không hợp lệ. Phải là: ${rules.values.join(', ')}`);
          }
          break;

        case 'date':
          if (value && isNaN(new Date(value).getTime())) {
            errors.push(`"${field}" không phải ngày hợp lệ`);
          }
          break;

        case 'bool':
          value = Boolean(value);
          break;
      }

      clean[field] = value;
    }

    if (errors.length) return { valid: false, errors };
    return { valid: true, data: clean };
  }

  /* ─── Dossier API ─── */
  const dossiers = {
    /**
     * Lấy danh sách hồ sơ với filter, sort, pagination
     */
    list(filters = {}, sort = 'createdAt_desc', page = 1, limit = 20) {
      const authErr = authCheck();
      if (authErr) return authErr;

      let list = DB.dossiers.getAll();

      // Filter theo quyền role
      const user = Auth.getCurrentUser();
      if (user.role === 'business') {
        // Business chỉ thấy dossier của phòng business HOẶC do mình tạo
        list = list.filter(d => d.creatorId === user.id || d.department === 'business');
      }

      // Apply filters
      if (filters.status)     list = list.filter(d => d.status === filters.status);
      if (filters.department) list = list.filter(d => d.department === filters.department);
      if (filters.priority)   list = list.filter(d => d.priority === filters.priority);
      if (filters.assigneeId) list = list.filter(d => d.assigneeId === filters.assigneeId);
      if (filters.creatorId)  list = list.filter(d => d.creatorId === filters.creatorId);
      if (filters.search) {
        const q = Security.Validator.sanitizeQuery(filters.search).toLowerCase();
        list = list.filter(d =>
          d.id.toLowerCase().includes(q) ||
          d.projectName.toLowerCase().includes(q) ||
          (d.contractNo || '').toLowerCase().includes(q)
        );
      }
      if (filters.dateFrom) list = list.filter(d => d.createdAt >= new Date(filters.dateFrom).getTime());
      if (filters.dateTo)   list = list.filter(d => d.createdAt <= new Date(filters.dateTo).getTime() + 86400000);
      if (filters.overdue) {
        const today = Date.now();
        list = list.filter(d => d.deadline && new Date(d.deadline).getTime() < today && !['paid', 'archived'].includes(d.status));
      }

      // Sort
      const [sortField, sortDir] = sort.split('_');
      list.sort((a, b) => {
        let va = a[sortField], vb = b[sortField];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      const total  = list.length;
      const offset = (page - 1) * limit;
      const paged  = list.slice(offset, offset + limit);

      // Enrich với user info
      const enriched = paged.map(d => enrichDossier(d));

      return ok(enriched, { total, page, limit, totalPages: Math.ceil(total / limit) });
    },

    /**
     * Lấy chi tiết một hồ sơ
     */
    getById(id) {
      const authErr = authCheck();
      if (authErr) return authErr;

      const cleanId = Security.XSS.sanitizeInput(id);
      const dossier = DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);
      if (!Auth.canViewDossier(dossier)) return err('Không có quyền xem hồ sơ này', 403);

      const enriched = enrichDossier(dossier);
      enriched.history  = DB.workflow.getHistory(cleanId);
      enriched.comments = DB.comments.getByDossier(cleanId).map(c => ({
        ...c,
        actor: DB.users.getById(c.userId) ? {
          displayName: DB.users.getById(c.userId).displayName,
          avatar: DB.users.getById(c.userId).avatar,
          color:  DB.users.getById(c.userId).color
        } : null
      }));

      return ok(enriched);
    },

    /**
     * Tạo hồ sơ mới
     */
    create(data) {
      const authErr = authCheck();
      if (authErr) return authErr;

      if (!Auth.hasPermission('dossier.create') && !Auth.isAdmin()) {
        return err('Bạn không có quyền tạo hồ sơ', 403);
      }

      const validation = validateSchema(data, 'dossier');
      if (!validation.valid) return err(validation.errors.join('; '));

      const user = Auth.getCurrentUser();
      const dossier = DB.dossiers.create({
        ...validation.data,
        creatorId: user.id,
        tags: Array.isArray(data.tags) ? data.tags.map(t => Security.XSS.sanitizeInput(t)).slice(0, 10) : []
      });

      DB.auditLogs.log(user.id, 'CREATE_DOSSIER', dossier.id, 'dossier', {
        projectName: dossier.projectName, amount: dossier.amount
      });

      // Thông báo cho assignee nếu có
      if (dossier.assigneeId && dossier.assigneeId !== user.id) {
        DB.notifications.create({
          userId: dossier.assigneeId, type: 'new_assignment',
          title: 'Hồ sơ mới được giao',
          message: `${dossier.id} - ${dossier.projectName} đã được giao cho bạn`,
          dossierRef: dossier.id
        });
      }

      return ok(enrichDossier(dossier));
    },

    /**
     * Cập nhật hồ sơ
     */
    update(id, data) {
      const authErr = authCheck();
      if (authErr) return authErr;

      const cleanId = Security.XSS.sanitizeInput(id);
      const dossier = DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);
      if (!Auth.canEditDossier(dossier)) return err('Không có quyền chỉnh sửa hồ sơ này', 403);

      // Không cho phép thay đổi status qua update thông thường
      const { status, creatorId, id: _id, createdAt, ...updateData } = data;

      const validation = validateSchema(updateData, 'dossier');
      if (!validation.valid) return err(validation.errors.join('; '));

      const user    = Auth.getCurrentUser();
      const updated = DB.dossiers.update(cleanId, validation.data);
      DB.auditLogs.log(user.id, 'UPDATE_DOSSIER', cleanId, 'dossier', { fields: Object.keys(validation.data) });

      return ok(enrichDossier(updated));
    },

    /**
     * Xóa hồ sơ (soft delete)
     */
    delete(id) {
      const authErr = authCheck();
      if (authErr) return authErr;
      if (!Auth.isAdmin()) return err('Chỉ admin mới được xóa hồ sơ', 403);

      const cleanId = Security.XSS.sanitizeInput(id);
      const dossier = DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);

      DB.dossiers.delete(cleanId);
      DB.auditLogs.log(Auth.getCurrentUser().id, 'DELETE_DOSSIER', cleanId, 'dossier', { projectName: dossier.projectName });

      return ok({ deleted: true });
    },

    /**
     * Chuyển trạng thái workflow
     */
    transition(id, newStatus, note) {
      const authErr = authCheck();
      if (authErr) return authErr;

      const cleanId     = Security.XSS.sanitizeInput(id);
      const cleanStatus = Security.XSS.sanitizeInput(newStatus);
      const cleanNote   = Security.XSS.sanitizeInput(note || '');

      const dossier = DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);

      if (!Auth.canTransitionDossier(dossier, cleanStatus)) {
        return err('Bạn không có quyền thực hiện thao tác này với trạng thái hiện tại', 403);
      }

      const check = DB.workflow.canTransition(dossier.status, cleanStatus, Auth.getCurrentUser().role);
      if (!check.ok) return err(check.reason, 400);

      const user   = Auth.getCurrentUser();
      const result = DB.workflow.transition(cleanId, cleanStatus, user.id, cleanNote);
      if (!result.ok) return err(result.reason);

      DB.auditLogs.log(user.id, 'STATUS_CHANGE', cleanId, 'dossier', {
        from: dossier.status, to: cleanStatus, note: cleanNote
      });

      // Thông báo
      const actors = new Set([dossier.creatorId, dossier.assigneeId].filter(Boolean));
      actors.delete(user.id);
      actors.forEach(uid => {
        DB.notifications.create({
          userId: uid, type: 'status_change',
          title: 'Trạng thái hồ sơ thay đổi',
          message: `${dossier.id} - ${dossier.projectName}: ${dossier.status} → ${cleanStatus}`,
          dossierRef: cleanId
        });
      });

      return ok({ dossier: enrichDossier(DB.dossiers.getById(cleanId)), entry: result.entry });
    }
  };

  /* ─── User API ─── */
  const users = {
    list() {
      const authErr = authCheck();
      if (authErr) return authErr;
      if (!Auth.isAdmin()) return err('Chỉ admin được xem danh sách người dùng', 403);

      const list = DB.users.getAll().map(u => sanitizeUserOutput(u));
      return ok(list, { total: list.length });
    },

    getById(id) {
      const authErr = authCheck();
      if (authErr) return authErr;
      const cleanId = Security.XSS.sanitizeInput(id);
      if (!Auth.isAdmin() && Auth.getCurrentUser().id !== cleanId) {
        return err('Không có quyền xem thông tin này', 403);
      }
      const user = DB.users.getById(cleanId);
      if (!user) return err('Không tìm thấy người dùng', 404);
      return ok(sanitizeUserOutput(user));
    },

    async create(data) {
      return Auth.register(data);
    },

    update(id, data) {
      const authErr = authCheck();
      if (authErr) return authErr;
      if (!Auth.isAdmin()) return err('Chỉ admin được cập nhật người dùng', 403);

      const cleanId = Security.XSS.sanitizeInput(id);
      const user = DB.users.getById(cleanId);
      if (!user) return err('Không tìm thấy người dùng', 404);

      const { password, passwordHash, ...updateData } = data;
      const clean = {
        displayName: Security.XSS.sanitizeInput(updateData.displayName || user.displayName),
        email:       Security.XSS.sanitizeInput(updateData.email || user.email || ''),
        phone:       Security.XSS.sanitizeInput(updateData.phone || user.phone || ''),
        role:        updateData.role && ['admin', 'telecom', 'business', 'accounting'].includes(updateData.role) ? updateData.role : user.role,
        department:  updateData.department || user.department,
        active:      updateData.active !== undefined ? Boolean(updateData.active) : user.active
      };

      const updated = DB.users.update(cleanId, clean);
      DB.auditLogs.log(Auth.getCurrentUser().id, 'UPDATE_USER', cleanId, 'user', { fields: Object.keys(clean) });

      return ok(sanitizeUserOutput(updated));
    },

    delete(id) {
      const authErr = authCheck();
      if (authErr) return authErr;
      if (!Auth.isAdmin()) return err('Chỉ admin được xóa người dùng', 403);

      const cleanId = Security.XSS.sanitizeInput(id);
      if (cleanId === Auth.getCurrentUser().id) return err('Không thể xóa tài khoản đang đăng nhập', 400);

      DB.users.delete(cleanId);
      DB.auditLogs.log(Auth.getCurrentUser().id, 'DELETE_USER', cleanId, 'user', {});
      return ok({ deleted: true });
    }
  };

  /* ─── Comment API ─── */
  const comments = {
    add(dossierId, text) {
      const authErr = authCheck();
      if (authErr) return authErr;

      const cleanId   = Security.XSS.sanitizeInput(dossierId);
      const cleanText = Security.XSS.sanitizeInput(text);

      if (!cleanText || cleanText.length < 1) return err('Nội dung bình luận không được rỗng');
      if (cleanText.length > 1000) return err('Bình luận quá dài (tối đa 1000 ký tự)');

      const dossier = DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);

      const user    = Auth.getCurrentUser();
      const comment = DB.comments.add(cleanId, user.id, cleanText);
      DB.auditLogs.log(user.id, 'ADD_COMMENT', cleanId, 'dossier', { commentId: comment.id });

      return ok(comment);
    },

    delete(dossierId, commentId) {
      const authErr = authCheck();
      if (authErr) return authErr;

      const cleanDId = Security.XSS.sanitizeInput(dossierId);
      const cleanCId = Security.XSS.sanitizeInput(commentId);

      const user     = Auth.getCurrentUser();
      const comments = DB.comments.getByDossier(cleanDId);
      const comment  = comments.find(c => c.id === cleanCId);

      if (!comment) return err('Không tìm thấy bình luận', 404);
      if (comment.userId !== user.id && !Auth.isAdmin()) return err('Chỉ có thể xóa bình luận của chính mình', 403);

      DB.comments.delete(cleanDId, cleanCId);
      return ok({ deleted: true });
    }
  };

  /* ─── Notification API ─── */
  const notifications = {
    list() {
      const authErr = authCheck();
      if (authErr) return authErr;
      const user = Auth.getCurrentUser();
      const list = DB.notifications.getByUser(user.id);
      return ok(list, { unread: DB.notifications.getUnreadCount(user.id) });
    },

    markRead(id) {
      const authErr = authCheck();
      if (authErr) return authErr;
      DB.notifications.markRead(Security.XSS.sanitizeInput(id));
      return ok({ marked: true });
    },

    markAllRead() {
      const authErr = authCheck();
      if (authErr) return authErr;
      DB.notifications.markAllRead(Auth.getCurrentUser().id);
      return ok({ marked: true });
    }
  };

  /* ─── Stats API ─── */
  const stats = {
    dashboard() {
      const authErr = authCheck();
      if (authErr) return authErr;

      const byStatus   = DB.stats.byStatus();
      const byDept     = DB.stats.byDepartment();
      const total      = DB.dossiers.getAll().length;
      const overdue    = DB.stats.overdue();
      const totalAmt   = DB.stats.totalAmount();

      // Tính tỷ lệ hoàn thành (paid + archived / total)
      const completed  = (byStatus.paid || 0) + (byStatus.archived || 0);
      const rate       = total > 0 ? Math.round(completed / total * 100) : 0;

      return ok({ byStatus, byDept, total, overdue: overdue.length, totalAmount: totalAmt, completionRate: rate });
    }
  };

  /* ─── Private helpers ─── */
  function enrichDossier(d) {
    if (!d) return null;
    const creator  = DB.users.getById(d.creatorId);
    const assignee = DB.users.getById(d.assigneeId);
    return {
      ...d,
      creatorName:  creator?.displayName  || 'N/A',
      assigneeName: assignee?.displayName || 'Chưa giao',
      creatorAvatar:  creator?.avatar,
      assigneeAvatar: assignee?.avatar,
      creatorColor:   creator?.color,
      assigneeColor:  assignee?.color,
      deadlineInfo: Utils.deadlineStatus(d.deadline)
    };
  }

  function sanitizeUserOutput(u) {
    if (!u) return null;
    // Không trả về passwordHash
    const { passwordHash, ...safe } = u;
    return safe;
  }

  /* ─── Public ─── */
  return { dossiers, users, comments, notifications, stats };
})();

window.API = API;
