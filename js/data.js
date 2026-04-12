/**
 * data.js - Database layer sử dụng Table API (persistent, shared)
 * PayTrack Pro v3.0
 *
 * Tất cả dữ liệu lưu trên server qua RESTful Table API:
 *   GET/POST/PUT/PATCH/DELETE tables/{table}
 *
 * Tables: pt_users, pt_dossiers, pt_history,
 *         pt_notifications, pt_audit, pt_comments
 */

const DB = (() => {
  'use strict';

  /* ─── Workflow Definition ─── */
  const WORKFLOW_STEPS = [
    { id: 'created',            label: 'Đã tạo',          icon: 'fa-plus-circle',     color: '#6c757d' },
    { id: 'submitted',          label: 'Đã nộp',           icon: 'fa-paper-plane',     color: '#007bff' },
    { id: 'verified',           label: 'Đã xác minh',      icon: 'fa-check-double',    color: '#17a2b8' },
    { id: 'sent_to_accounting', label: 'Gửi Kế toán',      icon: 'fa-share-square',    color: '#fd7e14' },
    { id: 'approved',           label: 'Đã duyệt',         icon: 'fa-thumbs-up',       color: '#28a745' },
    { id: 'paid',               label: 'Đã thanh toán',    icon: 'fa-money-bill-wave', color: '#20c997' },
    { id: 'archived',           label: 'Lưu trữ',          icon: 'fa-archive',         color: '#6f42c1' }
  ];

  const STATUS_TRANSITIONS = {
    created:            ['submitted'],
    submitted:          ['verified', 'created'],
    verified:           ['sent_to_accounting', 'submitted'],
    sent_to_accounting: ['approved', 'verified'],
    approved:           ['paid', 'sent_to_accounting'],
    paid:               ['archived'],
    archived:           []
  };

  /* ─── API Base ─── */
  async function apiFetch(path, method = 'GET', body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (res.status === 204) return null;
    return res.json();
  }

  /* ─── Generic helpers ─── */
  async function listAll(table, params = '') {
    const r = await apiFetch(`tables/${table}?limit=500${params}`);
    return r?.data || [];
  }

  /* ─── Find the Table API's internal UUID for a business-id record ─── */
  async function findApiId(table, businessId, field = 'id') {
    // The Table API record's primary key is stored as `id` from the API perspective,
    // but our seeded data stores business IDs in the `id` field.
    // We search for a row where the field matches, then use its API-level record id.
    const rows = await listAll(table);
    const found = rows.find(r => r[field] === businessId);
    // Table API returns its own UUID as `id` in all responses,
    // but since we POST with our own `id`, the API id == our business id in most cases.
    // However for safety we use the row directly.
    return found ? found : null;
  }

  async function createRow(table, data) {
    return apiFetch(`tables/${table}`, 'POST', data);
  }

  async function updateRow(table, rowId, data) {
    return apiFetch(`tables/${table}/${rowId}`, 'PATCH', data);
  }

  async function deleteRow(table, rowId) {
    return apiFetch(`tables/${table}/${rowId}`, 'DELETE');
  }

  /* ─── ID Generation ─── */
  function genId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  async function nextDossierId() {
    const all = await listAll('pt_dossiers', '&sort=dossierId');
    const nums = all.map(d => parseInt((d.dossierId || d.id || '0').replace('DOS-', '')) || 0);
    const max  = nums.length ? Math.max(...nums) : 0;
    return `DOS-${String(max + 1).padStart(3, '0')}`;
  }

  /* ─── Cache layer (in-memory, 30s TTL) ─── */
  const _cache = {};
  function getCache(key) {
    const c = _cache[key];
    if (c && Date.now() - c.t < 30000) return c.v;
    return null;
  }
  function setCache(key, val) { _cache[key] = { v: val, t: Date.now() }; }
  function invalidate(key) { delete _cache[key]; }
  function invalidateAll() { Object.keys(_cache).forEach(k => delete _cache[k]); }

  /* ─── Password init ─── */
  // Nếu passwordHash bắt đầu bằng __plain__ thì hash và update
  async function ensurePasswordHashed(user) {
    if (user.passwordHash && user.passwordHash.startsWith('__plain__')) {
      const plain = user.passwordHash.replace('__plain__', '');
      const hash  = await Security.Password.hash(plain);
      await updateRow('pt_users', user.id, { passwordHash: hash });
      user.passwordHash = hash;
    }
    return user;
  }

  /* ─── USERS ─── */
  const users = {
    async getAll() {
      const cached = getCache('users');
      if (cached) return cached;
      const rows = await listAll('pt_users');
      const list = rows.filter(u => !u.deleted);
      setCache('users', list);
      return list;
    },

    async getById(id) {
      const all = await this.getAll();
      return all.find(u => u.id === id) || null;
    },

    async getByUsername(username) {
      const all = await this.getAll();
      const user = all.find(u => u.username === username && u.active !== false);
      if (!user) return null;
      return ensurePasswordHashed(user);
    },

    async create(data) {
      const row = await createRow('pt_users', data);
      invalidate('users');
      return row;
    },

    async update(id, data) {
      // id có thể là business-id (u001) hoặc API UUID
      const all   = await listAll('pt_users');
      // Tìm theo trường 'id' (business id) hoặc trực tiếp bằng API UUID
      const found = all.find(u => u.id === id);
      if (!found) return null;
      // Dùng API UUID của record (nếu API trả về gs_id hoặc id khác business id)
      // Table API thực sự dùng chính trường 'id' làm PK khi seeded với id tường minh
      const row = await updateRow('pt_users', found.id, data);
      invalidate('users');
      return row;
    },

    async delete(id) {
      await this.update(id, { deleted: true, active: false });
      invalidate('users');
    }
  };

  /* ─── DOSSIERS ─── */
  const dossiers = {
    async getAll() {
      const cached = getCache('dossiers');
      if (cached) return cached;
      const rows = await listAll('pt_dossiers');
      const list = rows.filter(d => !d.deleted);
      setCache('dossiers', list);
      return list;
    },

    async getById(id) {
      const all = await this.getAll();
      return all.find(d => d.dossierId === id || d.id === id) || null;
    },

    async create(data) {
      const dossierId = await nextDossierId();
      const row = await createRow('pt_dossiers', {
        ...data,
        dossierId,
        id: dossierId,
        status: 'created',
        deleted: false
      });
      invalidate('dossiers');
      return { ...row, dossierId: row.dossierId || dossierId };
    },

    async update(id, data) {
      const all   = await listAll('pt_dossiers');
      const found = all.find(d => d.dossierId === id || d.id === id);
      if (!found) return null;
      // Sử dụng dossierId hoặc id của record tìm được
      const apiId = found.id;
      const row = await updateRow('pt_dossiers', apiId, data);
      invalidate('dossiers');
      return row;
    },

    async delete(id) {
      await this.update(id, { deleted: true });
      invalidate('dossiers');
    }
  };

  /* ─── WORKFLOW HISTORY ─── */
  const workflow = {
    canTransition(currentStatus, targetStatus, userRole) {
      const allowed = STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(targetStatus)) return { ok: false, reason: 'Chuyển trạng thái không hợp lệ' };

      const roleMap = {
        created:            ['all'],
        submitted:          ['business', 'telecom', 'admin'],
        verified:           ['telecom', 'admin'],
        sent_to_accounting: ['telecom', 'admin'],
        approved:           ['accounting', 'admin'],
        paid:               ['accounting', 'admin'],
        archived:           ['accounting', 'admin']
      };
      const allowed2 = roleMap[targetStatus] || [];
      if (!allowed2.includes('all') && !allowed2.includes(userRole)) {
        return { ok: false, reason: `Vai trò của bạn không được phép chuyển sang trạng thái này` };
      }
      return { ok: true };
    },

    getSteps:    () => WORKFLOW_STEPS,
    getNextSteps: (status) => STATUS_TRANSITIONS[status] || [],

    async getHistory(dossierId) {
      const rows = await listAll('pt_history', `&search=${dossierId}`);
      return rows
        .filter(h => h.dossierId === dossierId)
        .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    },

    async transition(dossierId, newStatus, actorId, note) {
      const dossier = await dossiers.getById(dossierId);
      if (!dossier) return { ok: false, reason: 'Không tìm thấy hồ sơ' };

      const ts = new Date().toISOString();
      const entry = await createRow('pt_history', {
        id: genId('h'),
        dossierId,
        status: newStatus,
        actorId,
        note: note || '',
        ts
      });
      await dossiers.update(dossierId, { status: newStatus });
      invalidate('dossiers');
      return { ok: true, entry };
    }
  };

  /* ─── NOTIFICATIONS ─── */
  const notifications = {
    async getByUser(userId) {
      const rows = await listAll('pt_notifications');
      return rows
        .filter(n => n.userId === userId)
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    },

    async getUnreadCount(userId) {
      const all = await this.getByUser(userId);
      return all.filter(n => !n.read).length;
    },

    async create(data) {
      return createRow('pt_notifications', {
        id: genId('n'),
        ts: new Date().toISOString(),
        read: false,
        ...data
      });
    },

    async markRead(recordId) {
      return updateRow('pt_notifications', recordId, { read: true });
    },

    async markAllRead(userId) {
      const all = await this.getByUser(userId);
      await Promise.all(
        all.filter(n => !n.read).map(n => updateRow('pt_notifications', n.id, { read: true }))
      );
    },

    async delete(recordId) {
      return deleteRow('pt_notifications', recordId);
    }
  };

  /* ─── AUDIT LOGS ─── */
  const auditLogs = {
    async getAll(limit = 100) {
      const rows = await listAll('pt_audit');
      return rows
        .sort((a, b) => new Date(b.ts) - new Date(a.ts))
        .slice(0, limit);
    },

    async getByDossier(dossierId) {
      const rows = await listAll('pt_audit');
      return rows
        .filter(l => l.target === dossierId)
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    },

    async log(userId, action, target, targetType, details) {
      return createRow('pt_audit', {
        id: genId('al'),
        userId: userId || '',
        action,
        target: target || '',
        targetType: targetType || '',
        details: JSON.stringify(details || {}),
        ts: new Date().toISOString()
      });
    }
  };

  /* ─── COMMENTS ─── */
  const comments = {
    async getByDossier(dossierId) {
      const rows = await listAll('pt_comments');
      return rows
        .filter(c => c.dossierId === dossierId)
        .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    },

    async add(dossierId, userId, text) {
      return createRow('pt_comments', {
        id: genId('c'),
        dossierId,
        userId,
        text,
        ts: new Date().toISOString()
      });
    },

    async delete(commentApiId) {
      return deleteRow('pt_comments', commentApiId);
    }
  };

  /* ─── STATS ─── */
  const stats = {
    async byStatus() {
      const all = await dossiers.getAll();
      const result = {};
      WORKFLOW_STEPS.forEach(s => { result[s.id] = 0; });
      all.forEach(d => { if (result[d.status] !== undefined) result[d.status]++; });
      return result;
    },

    async byDepartment() {
      const all = await dossiers.getAll();
      const result = { telecom: 0, business: 0, accounting: 0 };
      all.forEach(d => { if (result[d.department] !== undefined) result[d.department]++; });
      return result;
    },

    async totalAmount() {
      const all = await dossiers.getAll();
      return all.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    },

    async overdue() {
      const all  = await dossiers.getAll();
      const today = Date.now();
      return all.filter(d =>
        d.deadline &&
        new Date(d.deadline).getTime() < today &&
        !['paid', 'archived'].includes(d.status)
      );
    }
  };

  /* ─── Default Users (seed lần đầu) ─── */
  const DEFAULT_USERS = [
    { id: 'u_admin',   username: 'admin',   displayName: 'Quản trị viên',     role: 'admin',      department: 'admin',      avatar: 'AD', color: '#dc3545', password: 'admin123' },
    { id: 'u_phongnx', username: 'phongnx', displayName: 'Ninh Xuân Phong',   role: 'telecom',    department: 'telecom',    avatar: 'NP', color: '#007bff', password: '123456' },
    { id: 'u_ductt',   username: 'ductt',   displayName: 'Trần Tuấn Đức',     role: 'telecom',    department: 'telecom',    avatar: 'TĐ', color: '#17a2b8', password: '123456' },
    { id: 'u_datnt',   username: 'datnt',   displayName: 'Nguyễn Tiến Đạt',   role: 'telecom',    department: 'telecom',    avatar: 'NĐ', color: '#6f42c1', password: '123456' },
    { id: 'u_quyetph', username: 'quyetph', displayName: 'Phạm Hoàng Quyết',  role: 'accounting', department: 'accounting', avatar: 'PQ', color: '#28a745', password: '123456' },
    { id: 'u_hanhn',   username: 'hanhn',   displayName: 'Hồ Ngọc Hân',       role: 'accounting', department: 'accounting', avatar: 'NH', color: '#e83e8c', password: '123456' }
  ];

  async function seedDefaultUsers() {
    const existing = await listAll('pt_users');
    const existingNames = new Set(existing.map(u => u.username));
    for (const u of DEFAULT_USERS) {
      if (!existingNames.has(u.username)) {
        await createRow('pt_users', {
          id: u.id, username: u.username, displayName: u.displayName,
          role: u.role, department: u.department,
          passwordHash: '__plain__' + u.password,
          avatar: u.avatar, color: u.color,
          active: true, loginCount: 0, lastLogin: '', email: ''
        });
      }
    }
    invalidate('users');
  }

  /* ─── Public API ─── */
  return {
    WORKFLOW_STEPS,
    STATUS_TRANSITIONS,
    users,
    dossiers,
    workflow,
    notifications,
    auditLogs,
    comments,
    stats,
    invalidateAll,
    seedDefaultUsers,
    _ensurePasswords: async () => {
      const all = await listAll('pt_users');
      for (const u of all) {
        if (u.passwordHash?.startsWith('__plain__')) {
          await ensurePasswordHashed(u);
        }
      }
      invalidate('users');
    }
  };
})();

window.DB = DB;
