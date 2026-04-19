/**
 * api.js - Internal API layer (async, validation, RBAC)
 * PayTrack Pro v3.0
 */

const API = (() => {
  'use strict';

  function ok(data, meta = {})    { return { success: true,  data, ...meta }; }
  function err(msg, code = 400)   { return { success: false, error: msg, code }; }
  function authCheck()             { return Auth.isLoggedIn() ? null : err('Chưa xác thực', 401); }

  /* ─── Enrich dossier with user names ─── */
  async function enrich(d, allUsers) {
    const creator  = allUsers.find(u => u.id === d.creatorId);
    const assignee = allUsers.find(u => u.id === d.assigneeId);
    return {
      ...d,
      dossierId:     d.dossierId || d.id,
      creatorName:   creator?.displayName   || 'N/A',
      assigneeName:  assignee?.displayName  || 'Chưa giao',
      creatorAvatar:  creator?.avatar,
      assigneeAvatar: assignee?.avatar,
      creatorColor:   creator?.color,
      assigneeColor:  assignee?.color,
      deadlineInfo:  Utils.deadlineStatus(d.deadline)
    };
  }

  /* ─── Sanitize output ─── */
  function safeUser(u) {
    if (!u) return null;
    const { passwordHash, _plainPwd, ...safe } = u;
    return safe;
  }

  /* ─── Dossiers ─── */
  const dossiers = {
    async list(filters = {}, sort = 'createdAt_desc', page = 1, limit = 20) {
      const ae = authCheck(); if (ae) return ae;
      const user  = Auth.getCurrentUser();
      const users = await DB.users.getAll();
      let list    = await DB.dossiers.getAll();

      // Filter by role
      if (user.role === 'business') {
        list = list.filter(d => d.creatorId === user.id || d.department === 'business');
      }

      // Apply filters
      if (filters.status)     list = list.filter(d => d.status     === filters.status);
      if (filters.department) list = list.filter(d => d.department === filters.department);
      if (filters.priority)   list = list.filter(d => d.priority   === filters.priority);
      if (filters.assigneeId) list = list.filter(d => d.assigneeId === filters.assigneeId);
      if (filters.creatorId)  list = list.filter(d => d.creatorId  === filters.creatorId);
      if (filters.search) {
        const q = Security.Validator.sanitizeQuery(filters.search).toLowerCase();
        list = list.filter(d =>
          (d.dossierId || d.id || '').toLowerCase().includes(q) ||
          (d.projectName || '').toLowerCase().includes(q) ||
          (d.contractNo  || '').toLowerCase().includes(q)
        );
      }
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom).getTime();
        list = list.filter(d => new Date(d.created_at || 0).getTime() >= from);
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo).getTime() + 86400000;
        list = list.filter(d => new Date(d.created_at || 0).getTime() <= to);
      }
      if (filters.overdue) {
        const now = Date.now();
        list = list.filter(d => d.deadline && new Date(d.deadline).getTime() < now && !['paid','archived'].includes(d.status));
      }

      // Sort
      const [sf, sd] = sort.split('_');
      const sortMap  = { createdAt: 'created_at', updatedAt: 'updated_at', amount: 'amount', deadline: 'deadline' };
      const sf2      = sortMap[sf] || sf;
      list.sort((a, b) => {
        let va = a[sf2], vb = b[sf2];
        if (sf === 'amount') { va = Number(va); vb = Number(vb); }
        if (va < vb) return sd === 'asc' ? -1 :  1;
        if (va > vb) return sd === 'asc' ?  1 : -1;
        return 0;
      });

      const total   = list.length;
      const paged   = list.slice((page - 1) * limit, page * limit);
      const enriched = await Promise.all(paged.map(d => enrich(d, users)));
      return ok(enriched, { total, page, limit, totalPages: Math.ceil(total / limit) });
    },

    async getById(id) {
      const ae = authCheck(); if (ae) return ae;
      const cleanId = Security.XSS.sanitizeInput(id);
      const dossier = await DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);

      const users    = await DB.users.getAll();
      const enriched = await enrich(dossier, users);
      enriched.history  = await DB.workflow.getHistory(dossier.dossierId || cleanId);
      const rawComments = await DB.comments.getByDossier(dossier.dossierId || cleanId);
      enriched.comments = rawComments.map(c => ({
        ...c,
        actor: users.find(u => u.id === c.userId) || null
      }));
      return ok(enriched);
    },

    async create(data) {
      const ae = authCheck(); if (ae) return ae;
      if (!Auth.hasPermission('dossier.create') && !Auth.isAdmin()) return err('Không có quyền tạo hồ sơ', 403);

      const clean = {
        projectName: Security.XSS.sanitizeInput(data.projectName || ''),
        contractNo:  Security.XSS.sanitizeInput(data.contractNo  || ''),
        department:  ['telecom','business','accounting'].includes(data.department) ? data.department : '',
        priority:    ['urgent','high','medium','low'].includes(data.priority) ? data.priority : 'medium',
        amount:      Math.min(Math.max(Number(data.amount) || 0, 0), 1e12),
        deadline:    data.deadline || '',
        assigneeId:  Security.XSS.sanitizeInput(data.assigneeId || ''),
        description: Security.XSS.sanitizeInput(data.description || ''),
        notes:       Security.XSS.sanitizeInput(data.notes || ''),
        tags:        Array.isArray(data.tags) ? data.tags.map(t => Security.XSS.sanitizeInput(t)).slice(0, 10) : [],
        creatorId:   Auth.getCurrentUser().id
      };

      if (!clean.projectName) return err('Tên dự án là bắt buộc');
      if (!clean.department)  return err('Vui lòng chọn phòng ban');

      const dossier = await DB.dossiers.create(clean);
      const dossierId = dossier.dossierId || dossier.id;

      // Create initial history
      await DB.workflow.transition(dossierId, 'created', clean.creatorId, 'Hồ sơ được tạo');

      // Notify assignee
      if (clean.assigneeId && clean.assigneeId !== clean.creatorId) {
        await DB.notifications.create({
          userId: clean.assigneeId, type: 'new_assignment',
          title: 'Hồ sơ mới được giao',
          message: `${dossierId} - ${clean.projectName} đã được giao cho bạn`,
          dossierRef: dossierId
        });
      }
      await DB.auditLogs.log(clean.creatorId, 'CREATE_DOSSIER', dossierId, 'dossier', { projectName: clean.projectName, amount: clean.amount });
      DB.invalidateAll();

      const users = await DB.users.getAll();
      return ok(await enrich(dossier, users));
    },

    async update(id, data) {
      const ae = authCheck(); if (ae) return ae;
      const cleanId = Security.XSS.sanitizeInput(id);
      const dossier = await DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);
      if (!Auth.canEditDossier(dossier) && !Auth.isAdmin()) return err('Không có quyền chỉnh sửa', 403);

      const { status, creatorId, id: _id, created_at, ...updateData } = data;
      const clean = {
        projectName: Security.XSS.sanitizeInput(updateData.projectName || dossier.projectName),
        contractNo:  Security.XSS.sanitizeInput(updateData.contractNo  || ''),
        department:  ['telecom','business','accounting'].includes(updateData.department) ? updateData.department : dossier.department,
        priority:    ['urgent','high','medium','low'].includes(updateData.priority) ? updateData.priority : dossier.priority,
        amount:      Math.min(Math.max(Number(updateData.amount) || 0, 0), 1e12),
        deadline:    updateData.deadline || '',
        assigneeId:  Security.XSS.sanitizeInput(updateData.assigneeId || ''),
        description: Security.XSS.sanitizeInput(updateData.description || ''),
        notes:       Security.XSS.sanitizeInput(updateData.notes || ''),
        tags:        Array.isArray(updateData.tags) ? updateData.tags.map(t => Security.XSS.sanitizeInput(t)).slice(0, 10) : []
      };

      const updated = await DB.dossiers.update(cleanId, clean);
      await DB.auditLogs.log(Auth.getCurrentUser().id, 'UPDATE_DOSSIER', cleanId, 'dossier', { fields: Object.keys(clean) });
      DB.invalidateAll();
      const users = await DB.users.getAll();
      return ok(await enrich({ ...dossier, ...clean }, users));
    },

    async delete(id) {
      const ae = authCheck(); if (ae) return ae;
      if (!Auth.isAdmin()) return err('Chỉ admin được xóa', 403);
      const cleanId = Security.XSS.sanitizeInput(id);
      const dossier = await DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);
      await DB.dossiers.delete(cleanId);
      await DB.auditLogs.log(Auth.getCurrentUser().id, 'DELETE_DOSSIER', cleanId, 'dossier', { projectName: dossier.projectName });
      DB.invalidateAll();
      return ok({ deleted: true });
    },

    async transition(id, newStatus, note) {
      const ae = authCheck(); if (ae) return ae;
      const cleanId     = Security.XSS.sanitizeInput(id);
      const cleanStatus = Security.XSS.sanitizeInput(newStatus);
      const cleanNote   = Security.XSS.sanitizeInput(note || '');

      const dossier = await DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);
      if (!Auth.canTransitionDossier(dossier, cleanStatus)) return err('Không có quyền thực hiện thao tác này', 403);

      const check = DB.workflow.canTransition(dossier.status, cleanStatus, Auth.getCurrentUser().role);
      if (!check.ok) return err(check.reason, 400);

      const user   = Auth.getCurrentUser();
      const dosId  = dossier.dossierId || cleanId;
      const result = await DB.workflow.transition(dosId, cleanStatus, user.id, cleanNote);
      if (!result.ok) return err(result.reason);

      await DB.auditLogs.log(user.id, 'STATUS_CHANGE', dosId, 'dossier', { from: dossier.status, to: cleanStatus, note: cleanNote });

      // Notify
      const actors = new Set([dossier.creatorId, dossier.assigneeId].filter(Boolean));
      actors.delete(user.id);
      const stepLabel = DB.WORKFLOW_STEPS.find(s => s.id === cleanStatus)?.label || cleanStatus;
      await Promise.all([...actors].map(uid =>
        DB.notifications.create({
          userId: uid, type: 'status_change',
          title: 'Trạng thái hồ sơ thay đổi',
          message: `${dosId} - ${dossier.projectName}: → ${stepLabel}`,
          dossierRef: dosId
        })
      ));

      DB.invalidateAll();
      const updatedDossier = await DB.dossiers.getById(cleanId);
      const users = await DB.users.getAll();
      return ok({ dossier: await enrich(updatedDossier, users), entry: result.entry });
    }
  };

  /* ─── Users ─── */
  const users = {
    async list() {
      const ae = authCheck(); if (ae) return ae;
      if (!Auth.isAdmin()) return err('Chỉ admin được xem danh sách', 403);
      const list = (await DB.users.getAll()).map(safeUser);
      return ok(list, { total: list.length });
    },

    async getById(id) {
      const ae = authCheck(); if (ae) return ae;
      const cleanId = Security.XSS.sanitizeInput(id);
      if (!Auth.isAdmin() && Auth.getCurrentUser().id !== cleanId) return err('Không có quyền', 403);
      const user = await DB.users.getById(cleanId);
      if (!user) return err('Không tìm thấy', 404);
      return ok(safeUser(user));
    },

    async create(data) { return Auth.register(data); },

    async update(id, data) {
      const ae = authCheck(); if (ae) return ae;
      if (!Auth.isAdmin()) return err('Chỉ admin được cập nhật', 403);
      const cleanId = Security.XSS.sanitizeInput(id);
      const user = await DB.users.getById(cleanId);
      if (!user) return err('Không tìm thấy', 404);
      const clean = {
        displayName: Security.XSS.sanitizeInput(data.displayName || user.displayName),
        email:       Security.XSS.sanitizeInput(data.email || user.email || ''),
        phone:       Security.XSS.sanitizeInput(data.phone || user.phone || ''),
        role:        ['admin','telecom','business','accounting'].includes(data.role) ? data.role : user.role,
        department:  data.department || user.department,
        active:      data.active !== undefined ? Boolean(data.active) : user.active
      };
      await DB.users.update(cleanId, clean);
      await DB.auditLogs.log(Auth.getCurrentUser().id, 'UPDATE_USER', cleanId, 'user', { fields: Object.keys(clean) });
      DB.invalidateAll();
      const updated = await DB.users.getById(cleanId);
      return ok(safeUser(updated));
    },

    async delete(id) {
      const ae = authCheck(); if (ae) return ae;
      if (!Auth.isAdmin()) return err('Chỉ admin được xóa', 403);
      const cleanId = Security.XSS.sanitizeInput(id);
      if (cleanId === Auth.getCurrentUser().id) return err('Không thể xóa tài khoản đang đăng nhập', 400);
      await DB.users.delete(cleanId);
      await DB.auditLogs.log(Auth.getCurrentUser().id, 'DELETE_USER', cleanId, 'user', {});
      DB.invalidateAll();
      return ok({ deleted: true });
    }
  };

  /* ─── Comments ─── */
  const comments = {
    async add(dossierId, text) {
      const ae = authCheck(); if (ae) return ae;
      const cleanId   = Security.XSS.sanitizeInput(dossierId);
      const cleanText = Security.XSS.sanitizeInput(text);
      if (!cleanText) return err('Nội dung không được rỗng');
      if (cleanText.length > 1000) return err('Bình luận quá dài');

      const dossier = await DB.dossiers.getById(cleanId);
      if (!dossier) return err('Không tìm thấy hồ sơ', 404);

      const user    = Auth.getCurrentUser();
      const comment = await DB.comments.add(dossier.dossierId || cleanId, user.id, cleanText);
      await DB.auditLogs.log(user.id, 'ADD_COMMENT', cleanId, 'dossier', { commentId: comment.id });
      return ok(comment);
    },

    async delete(commentApiId) {
      const ae = authCheck(); if (ae) return ae;
      await DB.comments.delete(commentApiId);
      return ok({ deleted: true });
    }
  };

  /* ─── Notifications ─── */
  const notifications = {
    async list() {
      const ae = authCheck(); if (ae) return ae;
      const user  = Auth.getCurrentUser();
      const list  = await DB.notifications.getByUser(user.id);
      const unread = list.filter(n => !n.read).length;
      return ok(list, { unread });
    },
    async markRead(id) {
      const ae = authCheck(); if (ae) return ae;
      await DB.notifications.markRead(Security.XSS.sanitizeInput(id));
      return ok({ marked: true });
    },
    async markAllRead() {
      const ae = authCheck(); if (ae) return ae;
      await DB.notifications.markAllRead(Auth.getCurrentUser().id);
      return ok({ marked: true });
    }
  };

  /* ─── Stats ─── */
  const stats = {
    async dashboard() {
      const ae = authCheck(); if (ae) return ae;
      const [byStatus, byDept, totalAmt, overdue, allDossiers] = await Promise.all([
        DB.stats.byStatus(), DB.stats.byDepartment(),
        DB.stats.totalAmount(), DB.stats.overdue(),
        DB.dossiers.getAll()
      ]);
      const total     = allDossiers.length;
      const completed = (byStatus.paid || 0) + (byStatus.archived || 0);
      const rate      = total > 0 ? Math.round(completed / total * 100) : 0;
      return ok({ byStatus, byDept, total, overdue: overdue.length, totalAmount: totalAmt, completionRate: rate });
    }
  };

  return { dossiers, users, comments, notifications, stats };
})();

window.API = API;
