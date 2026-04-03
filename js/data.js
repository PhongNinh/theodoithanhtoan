/**
 * data.js - Database layer (localStorage + API fallback)
 * PayTrack Pro - Hệ thống Quản lý Hồ sơ Thanh toán
 */

const DB = (() => {
  'use strict';

  const DB_KEY = 'paytrack_db_v3';
  const DB_VERSION = 3;

  /* ─── Workflow Definition ─── */
  const WORKFLOW_STEPS = [
    { id: 'created',           label: 'Đã tạo',               icon: 'fa-plus-circle',      color: '#6c757d', allowedRoles: ['all'] },
    { id: 'submitted',         label: 'Đã nộp',               icon: 'fa-paper-plane',      color: '#007bff', allowedRoles: ['business', 'telecom', 'admin'] },
    { id: 'verified',          label: 'Đã xác minh',          icon: 'fa-check-double',     color: '#17a2b8', allowedRoles: ['telecom', 'admin'] },
    { id: 'sent_to_accounting',label: 'Gửi Kế toán',          icon: 'fa-share-square',     color: '#fd7e14', allowedRoles: ['telecom', 'admin'] },
    { id: 'approved',          label: 'Đã duyệt',             icon: 'fa-thumbs-up',        color: '#28a745', allowedRoles: ['accounting', 'admin'] },
    { id: 'paid',              label: 'Đã thanh toán',        icon: 'fa-money-bill-wave',  color: '#20c997', allowedRoles: ['accounting', 'admin'] },
    { id: 'archived',          label: 'Lưu trữ',              icon: 'fa-archive',          color: '#6f42c1', allowedRoles: ['accounting', 'admin'] }
  ];

  const STATUS_TRANSITIONS = {
    created:            ['submitted'],
    submitted:          ['verified', 'created'],
    verified:           ['sent_to_accounting', 'submitted'],
    sent_to_accounting: ['approved', 'verified'],
    approved:           ['paid', 'sent_to_accounting'],
    paid:               ['archived', 'approved'],
    archived:           []
  };

  /* ─── Default Data ─── */
  function buildDefaultData() {
    const now   = Date.now();
    const day   = 86400000;
    const hour  = 3600000;
    const salt  = 'paytrack_salt_2024';

    // Users - _plainPwd sẽ được hash async sau khi load
    // plaintext passwords lưu tạm để hash lần đầu
    const users = [
      {
        id: 'u001', username: 'admin', displayName: 'Quản trị viên',
        email: 'admin@paytrack.vn', phone: '0900000001',
        role: 'admin', department: 'admin',
        _plainPwd: 'admin123',
        passwordHash: '', // sẽ được fill bởi initPasswords()
        active: true, createdAt: now - 90*day, lastLogin: now - 1*day, loginCount: 145,
        avatar: 'AD', color: '#dc3545'
      },
      {
        id: 'u002', username: 'vt_tuan', displayName: 'Nguyễn Văn Tuấn',
        email: 'tuan.vt@paytrack.vn', phone: '0900000002',
        role: 'telecom', department: 'telecom',
        _plainPwd: '123456', passwordHash: '',
        active: true, createdAt: now - 60*day, lastLogin: now - 2*day, loginCount: 89,
        avatar: 'VT', color: '#007bff'
      },
      {
        id: 'u003', username: 'vt_lan', displayName: 'Trần Thị Lan',
        email: 'lan.vt@paytrack.vn', phone: '0900000003',
        role: 'telecom', department: 'telecom',
        _plainPwd: '123456', passwordHash: '',
        active: true, createdAt: now - 55*day, lastLogin: now - 3*day, loginCount: 67,
        avatar: 'TL', color: '#17a2b8'
      },
      {
        id: 'u004', username: 'kd_minh', displayName: 'Lê Minh Đức',
        email: 'minh.kd@paytrack.vn', phone: '0900000004',
        role: 'business', department: 'business',
        _plainPwd: '123456', passwordHash: '',
        active: true, createdAt: now - 45*day, lastLogin: now - 1*day, loginCount: 112,
        avatar: 'LM', color: '#fd7e14'
      },
      {
        id: 'u005', username: 'kd_huong', displayName: 'Phạm Thị Hương',
        email: 'huong.kd@paytrack.vn', phone: '0900000005',
        role: 'business', department: 'business',
        _plainPwd: '123456', passwordHash: '',
        active: true, createdAt: now - 40*day, lastLogin: now - 4*day, loginCount: 78,
        avatar: 'PH', color: '#e83e8c'
      },
      {
        id: 'u006', username: 'kt_hung', displayName: 'Hoàng Văn Hùng',
        email: 'hung.kt@paytrack.vn', phone: '0900000006',
        role: 'accounting', department: 'accounting',
        _plainPwd: '123456', passwordHash: '',
        active: true, createdAt: now - 35*day, lastLogin: now - 1*day, loginCount: 95,
        avatar: 'HH', color: '#28a745'
      },
      {
        id: 'u007', username: 'kt_nga', displayName: 'Ngô Thị Nga',
        email: 'nga.kt@paytrack.vn', phone: '0900000007',
        role: 'accounting', department: 'accounting',
        _plainPwd: '123456', passwordHash: '',
        active: true, createdAt: now - 30*day, lastLogin: now - 5*day, loginCount: 54,
        avatar: 'NN', color: '#6f42c1'
      }
    ];

    const dossiers = [
      {
        id: 'DOS-001', projectName: 'Nâng cấp hạ tầng mạng VNPT Q1',
        contractNo: 'HĐ-2024-001', department: 'telecom',
        creatorId: 'u002', assigneeId: 'u006',
        status: 'approved', priority: 'high',
        amount: 450000000, currency: 'VND',
        deadline: new Date(now + 5*day).toISOString().split('T')[0],
        description: 'Nâng cấp toàn bộ hệ thống mạng nội bộ và đường truyền Internet cho văn phòng Q1',
        notes: 'Đã hoàn tất giai đoạn 1, đang xử lý thanh toán',
        tags: ['mạng', 'VNPT', 'hạ tầng'],
        createdAt: now - 20*day, updatedAt: now - 2*day
      },
      {
        id: 'DOS-002', projectName: 'Mua sắm thiết bị văn phòng Q4/2024',
        contractNo: 'HĐ-2024-002', department: 'business',
        creatorId: 'u004', assigneeId: 'u002',
        status: 'submitted', priority: 'medium',
        amount: 125000000, currency: 'VND',
        deadline: new Date(now + 10*day).toISOString().split('T')[0],
        description: 'Mua sắm máy tính, máy in và thiết bị văn phòng phục vụ hoạt động Q4',
        notes: 'Đã có báo giá 3 nhà cung cấp',
        tags: ['mua sắm', 'văn phòng'],
        createdAt: now - 15*day, updatedAt: now - 1*day
      },
      {
        id: 'DOS-003', projectName: 'Triển khai hệ thống camera an ninh',
        contractNo: 'HĐ-2024-003', department: 'telecom',
        creatorId: 'u003', assigneeId: 'u006',
        status: 'paid', priority: 'high',
        amount: 280000000, currency: 'VND',
        deadline: new Date(now - 3*day).toISOString().split('T')[0],
        description: 'Lắp đặt 24 camera IP và hệ thống giám sát tập trung cho 3 tòa nhà',
        notes: 'Đã thanh toán 70%, còn 30% sau nghiệm thu',
        tags: ['camera', 'an ninh', 'lắp đặt'],
        createdAt: now - 30*day, updatedAt: now - 1*day
      },
      {
        id: 'DOS-004', projectName: 'Hợp đồng thuê trụ sở chi nhánh HCM',
        contractNo: 'HĐ-2024-004', department: 'business',
        creatorId: 'u005', assigneeId: 'u002',
        status: 'verified', priority: 'urgent',
        amount: 1200000000, currency: 'VND',
        deadline: new Date(now + 2*day).toISOString().split('T')[0],
        description: 'Thanh toán tiền đặt cọc và 6 tháng đầu tiên cho văn phòng mới tại TP.HCM',
        notes: 'Ưu tiên cao - hạn chủ nhà 2 ngày nữa',
        tags: ['bất động sản', 'chi nhánh', 'HCM'],
        createdAt: now - 8*day, updatedAt: now - 4*3600000
      },
      {
        id: 'DOS-005', projectName: 'Dịch vụ bảo trì máy chủ 2024',
        contractNo: 'HĐ-2024-005', department: 'telecom',
        creatorId: 'u002', assigneeId: 'u007',
        status: 'sent_to_accounting', priority: 'low',
        amount: 85000000, currency: 'VND',
        deadline: new Date(now + 20*day).toISOString().split('T')[0],
        description: 'Hợp đồng bảo trì, vá lỗi và cập nhật phần mềm cho 15 máy chủ',
        notes: 'Hợp đồng năm, thanh toán theo quý',
        tags: ['bảo trì', 'máy chủ', 'IT'],
        createdAt: now - 12*day, updatedAt: now - 3*day
      },
      {
        id: 'DOS-006', projectName: 'Đào tạo kỹ năng chuyển đổi số',
        contractNo: 'HĐ-2024-006', department: 'business',
        creatorId: 'u004', assigneeId: 'u003',
        status: 'created', priority: 'medium',
        amount: 65000000, currency: 'VND',
        deadline: new Date(now + 30*day).toISOString().split('T')[0],
        description: 'Khóa đào tạo 2 ngày về chuyển đổi số cho 50 nhân viên',
        notes: 'Đang chờ xác nhận lịch học',
        tags: ['đào tạo', 'chuyển đổi số'],
        createdAt: now - 5*day, updatedAt: now - 5*day
      },
      {
        id: 'DOS-007', projectName: 'Mua license phần mềm Microsoft 365',
        contractNo: 'HĐ-2024-007', department: 'telecom',
        creatorId: 'u003', assigneeId: 'u006',
        status: 'archived', priority: 'medium',
        amount: 95000000, currency: 'VND',
        deadline: new Date(now - 10*day).toISOString().split('T')[0],
        description: 'Gia hạn 100 license Microsoft 365 Business Premium cho năm 2025',
        notes: 'Đã hoàn tất. Hóa đơn VAT đã nhận',
        tags: ['phần mềm', 'Microsoft', 'license'],
        createdAt: now - 45*day, updatedAt: now - 8*day
      },
      {
        id: 'DOS-008', projectName: 'Xây dựng website thương mại điện tử',
        contractNo: 'HĐ-2024-008', department: 'business',
        creatorId: 'u005', assigneeId: 'u002',
        status: 'submitted', priority: 'high',
        amount: 320000000, currency: 'VND',
        deadline: new Date(now + 15*day).toISOString().split('T')[0],
        description: 'Phát triển website TMĐT tích hợp thanh toán online và quản lý kho',
        notes: 'Đã chọn nhà thầu, chờ duyệt ngân sách',
        tags: ['website', 'TMĐT', 'phát triển'],
        createdAt: now - 7*day, updatedAt: now - 2*day
      },
      {
        id: 'DOS-009', projectName: 'Lắp đặt điều hòa phòng máy chủ',
        contractNo: 'HĐ-2024-009', department: 'telecom',
        creatorId: 'u002', assigneeId: 'u007',
        status: 'approved', priority: 'high',
        amount: 155000000, currency: 'VND',
        deadline: new Date(now + 7*day).toISOString().split('T')[0],
        description: 'Lắp đặt 4 điều hòa chính xác (precision cooling) cho phòng máy chủ',
        notes: 'Đã xác nhận nhà thầu Daikin',
        tags: ['điều hòa', 'phòng máy chủ', 'cơ điện'],
        createdAt: now - 18*day, updatedAt: now - 2*day
      },
      {
        id: 'DOS-010', projectName: 'Chi phí tổ chức sự kiện ra mắt sản phẩm',
        contractNo: 'HĐ-2024-010', department: 'business',
        creatorId: 'u004', assigneeId: 'u006',
        status: 'created', priority: 'low',
        amount: 45000000, currency: 'VND',
        deadline: new Date(now + 45*day).toISOString().split('T')[0],
        description: 'Tổ chức sự kiện ra mắt dòng sản phẩm mới Q1/2025, dự kiến 200 khách mời',
        notes: 'Đang lập kế hoạch chi tiết',
        tags: ['sự kiện', 'marketing', 'ra mắt'],
        createdAt: now - 2*day, updatedAt: now - 2*day
      }
    ];

    // Status history cho mỗi dossier
    const statusHistory = {};
    dossiers.forEach(d => {
      statusHistory[d.id] = generateHistory(d);
    });

    // Notifications
    const notifications = [
      {
        id: 'n001', userId: 'u006', type: 'new_assignment',
        title: 'Hồ sơ mới được giao',
        message: 'DOS-001 - Nâng cấp hạ tầng mạng VNPT Q1 đã được giao cho bạn',
        dossierRef: 'DOS-001', read: false,
        createdAt: now - 2*day
      },
      {
        id: 'n002', userId: 'u002', type: 'status_change',
        title: 'Trạng thái hồ sơ thay đổi',
        message: 'DOS-002 đã được chuyển sang trạng thái "Đã nộp"',
        dossierRef: 'DOS-002', read: false,
        createdAt: now - 1*day
      },
      {
        id: 'n003', userId: 'u004', type: 'deadline_alert',
        title: '⚠️ Cảnh báo deadline',
        message: 'DOS-004 - Hợp đồng thuê trụ sở HCM sẽ hết hạn sau 2 ngày!',
        dossierRef: 'DOS-004', read: false,
        createdAt: now - 4*hour
      },
      {
        id: 'n004', userId: 'u006', type: 'approval_required',
        title: 'Cần phê duyệt',
        message: 'DOS-009 - Lắp đặt điều hòa đang chờ bạn phê duyệt',
        dossierRef: 'DOS-009', read: true,
        createdAt: now - 2*day
      },
      {
        id: 'n005', userId: 'u002', type: 'system',
        title: 'Hệ thống bảo mật',
        message: 'Đã đăng nhập thành công từ thiết bị mới',
        dossierRef: null, read: true,
        createdAt: now - 1*day
      }
    ];

    // Audit logs
    const auditLogs = [
      {
        id: 'al001', userId: 'u002', action: 'CREATE_DOSSIER',
        target: 'DOS-001', targetType: 'dossier',
        details: { projectName: 'Nâng cấp hạ tầng mạng VNPT Q1', amount: 450000000 },
        ip: '192.168.1.10', timestamp: now - 20*day
      },
      {
        id: 'al002', userId: 'u002', action: 'STATUS_CHANGE',
        target: 'DOS-001', targetType: 'dossier',
        details: { from: 'created', to: 'submitted' },
        ip: '192.168.1.10', timestamp: now - 19*day
      },
      {
        id: 'al003', userId: 'u002', action: 'STATUS_CHANGE',
        target: 'DOS-001', targetType: 'dossier',
        details: { from: 'submitted', to: 'verified' },
        ip: '192.168.1.10', timestamp: now - 18*day
      },
      {
        id: 'al004', userId: 'u001', action: 'USER_LOGIN',
        target: 'u001', targetType: 'user',
        details: { username: 'admin' },
        ip: '192.168.1.1', timestamp: now - 1*day
      },
      {
        id: 'al005', userId: 'u004', action: 'CREATE_DOSSIER',
        target: 'DOS-002', targetType: 'dossier',
        details: { projectName: 'Mua sắm thiết bị văn phòng Q4/2024', amount: 125000000 },
        ip: '192.168.1.15', timestamp: now - 15*day
      }
    ];

    // Comments
    const comments = {
      'DOS-001': [
        { id: 'c001', userId: 'u002', text: 'Đã gửi báo giá chi tiết qua email cho phòng kế toán', createdAt: now - 18*day },
        { id: 'c002', userId: 'u006', text: 'Đã nhận báo giá, đang xem xét. Cần thêm bảng phân tích chi phí', createdAt: now - 17*day },
        { id: 'c003', userId: 'u002', text: 'Đã bổ sung bảng phân tích. Vui lòng xem file đính kèm', createdAt: now - 16*day }
      ],
      'DOS-004': [
        { id: 'c004', userId: 'u005', text: 'CHỦ NHÀ YÊU CẦU CỌC TRƯỚC NGÀY MAI - CẦN DUYỆT GẤP!', createdAt: now - 1*day },
        { id: 'c005', userId: 'u002', text: 'Đã báo cáo ban giám đốc, đang chờ phê duyệt khẩn', createdAt: now - 20*hour }
      ]
    };

    return { users, dossiers, statusHistory, notifications, auditLogs, comments, version: DB_VERSION };
  }

  function generateHistory(dossier) {
    const DAY  = 86400000;
    const steps   = ['created', 'submitted', 'verified', 'sent_to_accounting', 'approved', 'paid', 'archived'];
    const curIdx  = steps.indexOf(dossier.status);
    const history = [];
    const actors  = { created: dossier.creatorId, submitted: dossier.creatorId,
                      verified: 'u002', sent_to_accounting: 'u002',
                      approved: dossier.assigneeId, paid: dossier.assigneeId, archived: dossier.assigneeId };

    for (let i = 0; i <= curIdx; i++) {
      history.push({
        id: `h_${dossier.id}_${i}`,
        status: steps[i],
        actorId: actors[steps[i]] || dossier.creatorId,
        note: `Chuyển sang trạng thái "${WORKFLOW_STEPS[i]?.label || steps[i]}"`,
        timestamp: dossier.createdAt + i * (2 * DAY + Math.floor(Math.random() * DAY))
      });
    }
    return history;
  }

  /* ─── Storage ─── */
  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return null;
      const db = JSON.parse(raw);
      if (db.version !== DB_VERSION) return null; // migration nếu cần
      return db;
    } catch (e) {
      console.warn('[DB] Load error:', e.message);
      return null;
    }
  }

  function save(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify({ ...db, savedAt: Date.now() }));
    } catch (e) {
      console.warn('[DB] Save error:', e.message);
    }
  }

  // Khởi tạo
  let _db = load() || buildDefaultData();

  /**
   * Hash passwords cho users có _plainPwd (chạy async sau khi Security module sẵn sàng)
   */
  async function initPasswords() {
    let changed = false;
    for (const user of (_db.users || [])) {
      if (user._plainPwd && !user.passwordHash) {
        user.passwordHash = await Security.Password.hash(user._plainPwd);
        delete user._plainPwd;
        changed = true;
      }
    }
    if (changed) save(_db);
  }

  // Gọi ngay (async - không block)
  setTimeout(() => initPasswords(), 0);
  save(_db);

  /* ─── Generic CRUD ─── */
  function getCollection(name) { return _db[name] || []; }

  function findById(col, id) {
    return getCollection(col).find(item => item.id === id) || null;
  }

  function insertItem(col, item) {
    if (!_db[col]) _db[col] = [];
    _db[col].push(item);
    save(_db);
    return item;
  }

  function updateItem(col, id, updates) {
    const idx = getCollection(col).findIndex(item => item.id === id);
    if (idx === -1) return null;
    _db[col][idx] = { ..._db[col][idx], ...updates, updatedAt: Date.now() };
    save(_db);
    return _db[col][idx];
  }

  function deleteItem(col, id) {
    const idx = getCollection(col).findIndex(item => item.id === id);
    if (idx === -1) return false;
    _db[col].splice(idx, 1);
    save(_db);
    return true;
  }

  /* ─── ID Generation ─── */
  function generateDossierId() {
    const existing = getCollection('dossiers').map(d => d.id);
    let num = existing.length + 1;
    while (existing.includes(`DOS-${String(num).padStart(3, '0')}`)) num++;
    return `DOS-${String(num).padStart(3, '0')}`;
  }

  function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  /* ─── Workflow ─── */
  function canTransition(currentStatus, targetStatus, userRole) {
    const allowed = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) return { ok: false, reason: 'Chuyển trạng thái không hợp lệ' };

    const step = WORKFLOW_STEPS.find(s => s.id === targetStatus);
    if (!step) return { ok: false, reason: 'Trạng thái không tồn tại' };

    if (!step.allowedRoles.includes('all') && !step.allowedRoles.includes(userRole)) {
      return { ok: false, reason: `Vai trò ${userRole} không được phép thực hiện thao tác này` };
    }
    return { ok: true };
  }

  /* ─── Public API ─── */
  return {
    WORKFLOW_STEPS,
    STATUS_TRANSITIONS,

    // Users
    users: {
      getAll: ()       => getCollection('users').filter(u => !u.deleted),
      getById: (id)    => findById('users', id),
      getByUsername: (u) => getCollection('users').find(x => x.username === u && !x.deleted) || null,
      create: (data)   => insertItem('users', { id: generateId('u'), createdAt: Date.now(), loginCount: 0, ...data }),
      update: (id, d)  => updateItem('users', id, d),
      delete: (id)     => updateItem('users', id, { deleted: true, active: false }),
      hardDelete: (id) => deleteItem('users', id)
    },

    // Dossiers
    dossiers: {
      getAll: ()       => getCollection('dossiers').filter(d => !d.deleted),
      getById: (id)    => findById('dossiers', id),
      create: (data)   => {
        const id = generateDossierId();
        const now2 = Date.now();
        const dossier = { id, createdAt: now2, updatedAt: now2, status: 'created', ...data };
        insertItem('dossiers', dossier);
        // Khởi tạo history
        if (!_db.statusHistory) _db.statusHistory = {};
        _db.statusHistory[id] = [{
          id: generateId('h'),
          status: 'created',
          actorId: data.creatorId,
          note: 'Hồ sơ được tạo',
          timestamp: now2
        }];
        save(_db);
        return dossier;
      },
      update: (id, d)  => updateItem('dossiers', id, d),
      delete: (id)     => updateItem('dossiers', id, { deleted: true }),
      hardDelete: (id) => deleteItem('dossiers', id)
    },

    // Workflow
    workflow: {
      canTransition,
      getSteps: () => WORKFLOW_STEPS,
      getNextSteps: (status) => STATUS_TRANSITIONS[status] || [],
      transition: (dossierId, newStatus, actorId, note) => {
        const dossier = findById('dossiers', dossierId);
        if (!dossier) return { ok: false, reason: 'Không tìm thấy hồ sơ' };

        if (!_db.statusHistory) _db.statusHistory = {};
        if (!_db.statusHistory[dossierId]) _db.statusHistory[dossierId] = [];

        const histEntry = {
          id: generateId('h'),
          status: newStatus,
          actorId,
          note: note || `Chuyển sang ${newStatus}`,
          timestamp: Date.now()
        };
        _db.statusHistory[dossierId].push(histEntry);
        updateItem('dossiers', dossierId, { status: newStatus });
        save(_db);
        return { ok: true, entry: histEntry };
      },
      getHistory: (dossierId) => (_db.statusHistory || {})[dossierId] || []
    },

    // Notifications
    notifications: {
      getByUser: (userId) => getCollection('notifications')
        .filter(n => n.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt),
      getUnreadCount: (userId) => getCollection('notifications')
        .filter(n => n.userId === userId && !n.read).length,
      create: (data) => insertItem('notifications', { id: generateId('n'), createdAt: Date.now(), read: false, ...data }),
      markRead: (id) => updateItem('notifications', id, { read: true }),
      markAllRead: (userId) => {
        getCollection('notifications')
          .filter(n => n.userId === userId && !n.read)
          .forEach(n => updateItem('notifications', n.id, { read: true }));
      },
      delete: (id) => deleteItem('notifications', id)
    },

    // Audit Logs
    auditLogs: {
      getAll: (limit = 100) => getCollection('auditLogs')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit),
      getByDossier: (id) => getCollection('auditLogs')
        .filter(l => l.target === id)
        .sort((a, b) => b.timestamp - a.timestamp),
      log: (userId, action, target, targetType, details) => insertItem('auditLogs', {
        id: generateId('al'),
        userId, action, target, targetType, details,
        ip: '127.0.0.1', // client-side fallback
        timestamp: Date.now()
      })
    },

    // Comments
    comments: {
      getByDossier: (dossierId) => ((_db.comments || {})[dossierId] || []).sort((a, b) => a.createdAt - b.createdAt),
      add: (dossierId, userId, text) => {
        if (!_db.comments) _db.comments = {};
        if (!_db.comments[dossierId]) _db.comments[dossierId] = [];
        const comment = { id: generateId('c'), userId, text, createdAt: Date.now() };
        _db.comments[dossierId].push(comment);
        save(_db);
        return comment;
      },
      delete: (dossierId, commentId) => {
        if (_db.comments && _db.comments[dossierId]) {
          _db.comments[dossierId] = _db.comments[dossierId].filter(c => c.id !== commentId);
          save(_db);
        }
      }
    },

    // Stats / Reports
    stats: {
      byStatus: () => {
        const dossiers = getCollection('dossiers').filter(d => !d.deleted);
        const result = {};
        WORKFLOW_STEPS.forEach(s => { result[s.id] = 0; });
        dossiers.forEach(d => { if (result[d.status] !== undefined) result[d.status]++; });
        return result;
      },
      byDepartment: () => {
        const dossiers = getCollection('dossiers').filter(d => !d.deleted);
        const result = { telecom: 0, business: 0, accounting: 0 };
        dossiers.forEach(d => { if (result[d.department] !== undefined) result[d.department]++; });
        return result;
      },
      totalAmount: () => getCollection('dossiers').filter(d => !d.deleted)
        .reduce((sum, d) => sum + (d.amount || 0), 0),
      overdue: () => {
        const today = Date.now();
        return getCollection('dossiers').filter(d =>
          !d.deleted && d.deadline &&
          new Date(d.deadline).getTime() < today &&
          !['paid', 'archived'].includes(d.status)
        );
      }
    },

    // Utilities
    reset: () => {
      _db = buildDefaultData();
      save(_db);
      setTimeout(() => initPasswords(), 0);
    },
    export: () => ({ ..._db }),
    import: (data) => { _db = data; save(_db); },

    // Đảm bảo passwords đã hash (gọi trước login)
    _ensurePasswords: () => initPasswords()
  };
})();

window.DB = DB;
