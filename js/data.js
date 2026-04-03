/* ===========================
   PayTrack Pro - Static Data Store
   Simulates backend data layer
   =========================== */

window.DB = {
  /* ---- USERS ---- */
  users: [
    { id:'u001', username:'admin', full_name:'Nguyễn Quản Trị', email:'admin@company.vn', password:'admin123', role:'admin', department:'admin', avatar:'NQ', is_active:true },
    { id:'u002', username:'vt_tuan', full_name:'Trần Văn Tuấn', email:'tuan.vt@company.vn', password:'123456', role:'telecom_staff', department:'vien_thong', avatar:'TV', is_active:true },
    { id:'u003', username:'vt_huong', full_name:'Lê Thị Hương', email:'huong.vt@company.vn', password:'123456', role:'telecom_staff', department:'vien_thong', avatar:'LH', is_active:true },
    { id:'u004', username:'kd_minh', full_name:'Phạm Văn Minh', email:'minh.kd@company.vn', password:'123456', role:'business_staff', department:'kinh_doanh', avatar:'PM', is_active:true },
    { id:'u005', username:'kd_lan', full_name:'Nguyễn Thị Lan', email:'lan.kd@company.vn', password:'123456', role:'business_staff', department:'kinh_doanh', avatar:'NL', is_active:true },
    { id:'u006', username:'kt_hung', full_name:'Đỗ Quốc Hùng', email:'hung.kt@company.vn', password:'123456', role:'accounting_staff', department:'ke_toan', avatar:'DH', is_active:true },
    { id:'u007', username:'kt_mai', full_name:'Vũ Thị Mai', email:'mai.kt@company.vn', password:'123456', role:'accounting_staff', department:'ke_toan', avatar:'VM', is_active:true },
  ],

  /* ---- DOSSIERS ---- */
  dossiers: [
    {
      id:'d001', dossier_code:'HS-2024-001',
      project_name:'Nâng cấp hạ tầng mạng 5G khu vực Hà Nội',
      contract_number:'HĐ-VT-2024-001', department:'vien_thong',
      created_by_id:'u002', created_by_name:'Trần Văn Tuấn',
      assigned_to_id:'u006', assigned_to_name:'Đỗ Quốc Hùng',
      assigned_department:'ke_toan',
      status:'approved', priority:'high', amount:2500000000,
      deadline:'2024-04-15T17:00:00Z',
      description:'Dự án nâng cấp hạ tầng mạng 5G cho khu vực nội thành Hà Nội, bao gồm 50 trạm BTS mới và hệ thống truyền dẫn quang.',
      notes:'Ưu tiên xử lý ngay do deadline cuối tháng. Đã có đủ hồ sơ nghiệm thu.',
      tags:['5G','hạ tầng','Hà Nội'],
      is_deleted:false, created_at:'2024-03-20T08:00:00Z'
    },
    {
      id:'d002', dossier_code:'HS-2024-002',
      project_name:'Triển khai hệ thống FTTH tại TP.HCM',
      contract_number:'HĐ-VT-2024-002', department:'vien_thong',
      created_by_id:'u004', created_by_name:'Phạm Văn Minh',
      assigned_to_id:'u002', assigned_to_name:'Trần Văn Tuấn',
      assigned_department:'vien_thong',
      status:'verified', priority:'high', amount:1800000000,
      deadline:'2024-04-20T17:00:00Z',
      description:'Dự án triển khai cáp quang FTTH cho 10,000 hộ gia đình tại TP.HCM, giai đoạn 1.',
      notes:'Đã hoàn thiện hồ sơ kỹ thuật. Chờ xác nhận từ phòng Viễn thông.',
      tags:['FTTH','TP.HCM','cáp quang'],
      is_deleted:false, created_at:'2024-03-22T09:00:00Z'
    },
    {
      id:'d003', dossier_code:'HS-2024-003',
      project_name:'Mua sắm thiết bị viễn thông Q2/2024',
      contract_number:'HĐ-KD-2024-003', department:'kinh_doanh',
      created_by_id:'u004', created_by_name:'Phạm Văn Minh',
      assigned_to_id:'u003', assigned_to_name:'Lê Thị Hương',
      assigned_department:'vien_thong',
      status:'submitted', priority:'medium', amount:950000000,
      deadline:'2024-04-30T17:00:00Z',
      description:'Mua sắm thiết bị switch, router và các phụ kiện viễn thông cho quý 2.',
      notes:'',
      tags:['thiết bị','mua sắm'],
      is_deleted:false, created_at:'2024-03-25T10:00:00Z'
    },
    {
      id:'d004', dossier_code:'HS-2024-004',
      project_name:'Thanh lý hợp đồng dịch vụ internet doanh nghiệp',
      contract_number:'HĐ-KD-2024-004', department:'kinh_doanh',
      created_by_id:'u005', created_by_name:'Nguyễn Thị Lan',
      assigned_to_id:'u005', assigned_to_name:'Nguyễn Thị Lan',
      assigned_department:'kinh_doanh',
      status:'created', priority:'low', amount:320000000,
      deadline:'2024-05-15T17:00:00Z',
      description:'Thanh lý và quyết toán hợp đồng dịch vụ internet cho 200 doanh nghiệp vừa và nhỏ.',
      notes:'Cần bổ sung thêm biên bản nghiệm thu từ khách hàng.',
      tags:['internet','doanh nghiệp','thanh lý'],
      is_deleted:false, created_at:'2024-03-28T14:00:00Z'
    },
    {
      id:'d005', dossier_code:'HS-2024-005',
      project_name:'Thanh toán dịch vụ cloud hosting năm 2024',
      contract_number:'HĐ-VT-2024-005', department:'vien_thong',
      created_by_id:'u002', created_by_name:'Trần Văn Tuấn',
      assigned_to_id:'u007', assigned_to_name:'Vũ Thị Mai',
      assigned_department:'ke_toan',
      status:'paid', priority:'high', amount:4200000000,
      deadline:'2024-03-31T17:00:00Z',
      description:'Thanh toán phí dịch vụ cloud hosting và backup dữ liệu cho toàn bộ hệ thống năm 2024.',
      notes:'Đã chuyển khoản thành công ngày 31/03/2024. Số chứng từ: CT-2024-0331.',
      tags:['cloud','hosting','2024'],
      is_deleted:false, created_at:'2024-03-10T08:00:00Z'
    },
    {
      id:'d006', dossier_code:'HS-2024-006',
      project_name:'Bảo trì hệ thống truyền dẫn quang miền Bắc',
      contract_number:'HĐ-VT-2024-006', department:'vien_thong',
      created_by_id:'u003', created_by_name:'Lê Thị Hương',
      assigned_to_id:'u006', assigned_to_name:'Đỗ Quốc Hùng',
      assigned_department:'ke_toan',
      status:'sent_accounting', priority:'medium', amount:780000000,
      deadline:'2024-04-25T17:00:00Z',
      description:'Bảo trì định kỳ hệ thống truyền dẫn quang cho khu vực miền Bắc, 15 tuyến cáp.',
      notes:'Đã nghiệm thu kỹ thuật xong. Chờ kế toán phê duyệt.',
      tags:['bảo trì','quang','miền Bắc'],
      is_deleted:false, created_at:'2024-03-18T11:00:00Z'
    },
    {
      id:'d007', dossier_code:'HS-2024-007',
      project_name:'Hợp đồng cung cấp SIM doanh nghiệp Samsung',
      contract_number:'HĐ-KD-2024-007', department:'kinh_doanh',
      created_by_id:'u004', created_by_name:'Phạm Văn Minh',
      assigned_to_id:'u004', assigned_to_name:'Phạm Văn Minh',
      assigned_department:'kinh_doanh',
      status:'created', priority:'medium', amount:150000000,
      deadline:'2024-05-30T17:00:00Z',
      description:'Cung cấp 5000 SIM doanh nghiệp cho đối tác tập đoàn Samsung Việt Nam.',
      notes:'',
      tags:['SIM','doanh nghiệp','Samsung'],
      is_deleted:false, created_at:'2024-03-30T09:00:00Z'
    },
    {
      id:'d008', dossier_code:'HS-2024-008',
      project_name:'Quyết toán dự án số hóa bưu điện tỉnh',
      contract_number:'HĐ-VT-2024-008', department:'vien_thong',
      created_by_id:'u002', created_by_name:'Trần Văn Tuấn',
      assigned_to_id:'u006', assigned_to_name:'Đỗ Quốc Hùng',
      assigned_department:'ke_toan',
      status:'archived', priority:'low', amount:680000000,
      deadline:'2024-03-01T17:00:00Z',
      description:'Quyết toán và lưu trữ dự án số hóa 63 bưu điện tỉnh thành trên cả nước.',
      notes:'Hoàn thành và lưu trữ. Hồ sơ đã được số hóa và upload lên hệ thống.',
      tags:['số hóa','bưu điện','quyết toán'],
      is_deleted:false, created_at:'2024-02-01T08:00:00Z'
    },
    {
      id:'d009', dossier_code:'HS-2024-009',
      project_name:'Nâng cấp tổng đài IP-PBX trụ sở chính',
      contract_number:'HĐ-VT-2024-009', department:'vien_thong',
      created_by_id:'u003', created_by_name:'Lê Thị Hương',
      assigned_to_id:'u003', assigned_to_name:'Lê Thị Hương',
      assigned_department:'vien_thong',
      status:'submitted', priority:'high', amount:1200000000,
      deadline:'2024-04-10T17:00:00Z',
      description:'Nâng cấp hệ thống tổng đài IP-PBX và tích hợp call center tại trụ sở chính.',
      notes:'',
      tags:['IP-PBX','tổng đài','call center'],
      is_deleted:false, created_at:'2024-03-26T10:00:00Z'
    },
    {
      id:'d010', dossier_code:'HS-2024-010',
      project_name:'Thuê kênh truyền số liệu quốc tế',
      contract_number:'HĐ-KD-2024-010', department:'kinh_doanh',
      created_by_id:'u005', created_by_name:'Nguyễn Thị Lan',
      assigned_to_id:'u007', assigned_to_name:'Vũ Thị Mai',
      assigned_department:'ke_toan',
      status:'approved', priority:'high', amount:3600000000,
      deadline:'2024-04-05T17:00:00Z',
      description:'Thuê kênh truyền số liệu quốc tế kết nối Việt Nam - Singapore - USA, băng thông 10Gbps.',
      notes:'',
      tags:['quốc tế','kênh truyền','băng thông'],
      is_deleted:false, created_at:'2024-03-15T08:00:00Z'
    }
  ],

  /* ---- AUDIT LOGS ---- */
  auditLogs: [
    { id:'al001', dossier_id:'d001', dossier_code:'HS-2024-001', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', action:'create', field_changed:'status', old_value:null, new_value:'created', comment:'Tạo hồ sơ mới - Nâng cấp 5G HN', timestamp:'2024-03-20T08:00:00Z' },
    { id:'al002', dossier_id:'d001', dossier_code:'HS-2024-001', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', action:'status_change', field_changed:'status', old_value:'created', new_value:'submitted', comment:'Chuyển sang Viễn thông xác thực', timestamp:'2024-03-21T09:30:00Z' },
    { id:'al003', dossier_id:'d001', dossier_code:'HS-2024-001', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', action:'status_change', field_changed:'status', old_value:'submitted', new_value:'verified', comment:'Đã xác minh hồ sơ hợp lệ, đầy đủ chứng từ', timestamp:'2024-03-25T14:00:00Z' },
    { id:'al004', dossier_id:'d001', dossier_code:'HS-2024-001', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', action:'status_change', field_changed:'status', old_value:'verified', new_value:'sent_accounting', comment:'Chuyển sang Kế toán phê duyệt', timestamp:'2024-03-28T10:00:00Z' },
    { id:'al005', dossier_id:'d001', dossier_code:'HS-2024-001', user_id:'u006', user_name:'Đỗ Quốc Hùng', user_role:'accounting_staff', action:'status_change', field_changed:'status', old_value:'sent_accounting', new_value:'approved', comment:'Phê duyệt thanh toán - đã kiểm tra hồ sơ đầy đủ', timestamp:'2024-04-01T11:00:00Z' },
    { id:'al006', dossier_id:'d005', dossier_code:'HS-2024-005', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', action:'create', field_changed:'status', old_value:null, new_value:'created', comment:'Tạo hồ sơ thanh toán cloud hosting', timestamp:'2024-03-10T08:00:00Z' },
    { id:'al007', dossier_id:'d005', dossier_code:'HS-2024-005', user_id:'u007', user_name:'Vũ Thị Mai', user_role:'accounting_staff', action:'status_change', field_changed:'status', old_value:'approved', new_value:'paid', comment:'Đã chuyển khoản thành công ngày 31/03/2024. Số CT: CT-2024-0331', timestamp:'2024-03-31T15:30:00Z' },
    { id:'al008', dossier_id:'d002', dossier_code:'HS-2024-002', user_id:'u004', user_name:'Phạm Văn Minh', user_role:'business_staff', action:'create', field_changed:'status', old_value:null, new_value:'created', comment:'Tạo hồ sơ FTTH TP.HCM', timestamp:'2024-03-22T09:00:00Z' },
    { id:'al009', dossier_id:'d002', dossier_code:'HS-2024-002', user_id:'u004', user_name:'Phạm Văn Minh', user_role:'business_staff', action:'status_change', field_changed:'status', old_value:'created', new_value:'submitted', comment:'Nộp hồ sơ cho phòng Viễn thông xem xét', timestamp:'2024-03-24T10:00:00Z' },
    { id:'al010', dossier_id:'d002', dossier_code:'HS-2024-002', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', action:'status_change', field_changed:'status', old_value:'submitted', new_value:'verified', comment:'Xác minh hồ sơ FTTH - đạt yêu cầu kỹ thuật', timestamp:'2024-03-30T14:00:00Z' },
    { id:'al011', dossier_id:'d006', dossier_code:'HS-2024-006', user_id:'u003', user_name:'Lê Thị Hương', user_role:'telecom_staff', action:'create', field_changed:'status', old_value:null, new_value:'created', comment:'Tạo hồ sơ bảo trì quang miền Bắc', timestamp:'2024-03-18T11:00:00Z' },
    { id:'al012', dossier_id:'d006', dossier_code:'HS-2024-006', user_id:'u003', user_name:'Lê Thị Hương', user_role:'telecom_staff', action:'status_change', field_changed:'status', old_value:'created', new_value:'submitted', comment:'Nộp hồ sơ', timestamp:'2024-03-20T09:00:00Z' },
    { id:'al013', dossier_id:'d006', dossier_code:'HS-2024-006', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', action:'status_change', field_changed:'status', old_value:'submitted', new_value:'verified', comment:'Đã kiểm tra và xác nhận', timestamp:'2024-03-25T15:00:00Z' },
    { id:'al014', dossier_id:'d006', dossier_code:'HS-2024-006', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', action:'status_change', field_changed:'status', old_value:'verified', new_value:'sent_accounting', comment:'Chuyển Kế toán', timestamp:'2024-03-28T16:00:00Z' },
    { id:'al015', dossier_id:'d008', dossier_code:'HS-2024-008', user_id:'u006', user_name:'Đỗ Quốc Hùng', user_role:'accounting_staff', action:'status_change', field_changed:'status', old_value:'paid', new_value:'archived', comment:'Lưu trữ hồ sơ hoàn thành', timestamp:'2024-03-15T10:00:00Z' },
  ],

  /* ---- COMMENTS ---- */
  comments: [
    { id:'c001', dossier_id:'d001', user_id:'u006', user_name:'Đỗ Quốc Hùng', user_role:'accounting_staff', content:'Hồ sơ đã đầy đủ. Tôi sẽ xem xét và phê duyệt trong ngày hôm nay.', is_internal:false, created_at:'2024-04-01T10:00:00Z' },
    { id:'c002', dossier_id:'d001', user_id:'u002', user_name:'Trần Văn Tuấn', user_role:'telecom_staff', content:'Cảm ơn! Vui lòng ưu tiên vì đây là dự án quan trọng cần thanh toán trước 15/04.', is_internal:false, created_at:'2024-04-01T10:30:00Z' },
    { id:'c003', dossier_id:'d002', user_id:'u004', user_name:'Phạm Văn Minh', user_role:'business_staff', content:'Bổ sung thêm biên bản nghiệm thu giai đoạn 1 đính kèm.', is_internal:false, created_at:'2024-03-23T11:00:00Z' },
    { id:'c004', dossier_id:'d003', user_id:'u003', user_name:'Lê Thị Hương', user_role:'telecom_staff', content:'Cần kiểm tra lại danh sách thiết bị - một số model không còn sản xuất.', is_internal:true, created_at:'2024-03-26T14:00:00Z' },
  ],

  /* ---- NOTIFICATIONS ---- */
  notifications: [
    { id:'n001', user_id:'u006', dossier_id:'d001', dossier_code:'HS-2024-001', type:'assignment', title:'Hồ sơ mới được giao', message:'Hồ sơ HS-2024-001 "Nâng cấp 5G HN" đã được giao cho bạn phê duyệt.', is_read:false, priority:'high', created_at:'2024-03-28T10:00:00Z' },
    { id:'n002', user_id:'u004', dossier_id:'d003', dossier_code:'HS-2024-003', type:'deadline', title:'Deadline sắp đến hạn', message:'Hồ sơ HS-2024-003 sẽ hết hạn vào ngày 30/04/2024. Vui lòng xử lý sớm.', is_read:false, priority:'high', created_at:'2024-04-01T08:00:00Z' },
    { id:'n003', user_id:'u002', dossier_id:'d002', dossier_code:'HS-2024-002', type:'status_change', title:'Trạng thái hồ sơ thay đổi', message:'HS-2024-002 đã được xác minh (Verified) bởi Trần Văn Tuấn.', is_read:true, priority:'medium', created_at:'2024-03-30T14:00:00Z' },
    { id:'n004', user_id:'u001', dossier_id:'d005', dossier_code:'HS-2024-005', type:'approval', title:'Thanh toán hoàn tất', message:'HS-2024-005 "Cloud hosting 2024" đã được thanh toán thành công.', is_read:false, priority:'medium', created_at:'2024-03-31T15:30:00Z' },
    { id:'n005', user_id:'u006', dossier_id:'d006', dossier_code:'HS-2024-006', type:'assignment', title:'Hồ sơ chờ phê duyệt', message:'HS-2024-006 "Bảo trì quang miền Bắc" đã được chuyển sang Kế toán xử lý.', is_read:false, priority:'medium', created_at:'2024-03-28T16:00:00Z' },
  ],

  /* ---- COUNTERS ---- */
  _dossierCounter: 10,
  _userCounter: 7,

  /* ---- HELPERS ---- */
  getNextDossierCode() {
    this._dossierCounter++;
    return `HS-2024-${String(this._dossierCounter).padStart(3,'0')}`;
  },
  getNextId(prefix) {
    if (prefix==='d') { return 'd' + (this.dossiers.length + 1).toString().padStart(3,'0'); }
    if (prefix==='u') { this._userCounter++; return 'u' + String(this._userCounter).padStart(3,'0'); }
    return prefix + Date.now();
  },
  newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
};

/* ---- WORKFLOW CONFIG ---- */
window.WORKFLOW = {
  steps: [
    { key:'created',         label:'Khởi tạo',       icon:'fa-plus',          color:'#64748b' },
    { key:'submitted',       label:'Nộp hồ sơ',      icon:'fa-paper-plane',   color:'#2563eb' },
    { key:'verified',        label:'Xác minh',        icon:'fa-check-circle',  color:'#0891b2' },
    { key:'sent_accounting', label:'Chuyển Kế toán',  icon:'fa-exchange-alt',  color:'#7c3aed' },
    { key:'approved',        label:'Phê duyệt',       icon:'fa-thumbs-up',     color:'#059669' },
    { key:'paid',            label:'Đã thanh toán',   icon:'fa-money-check',   color:'#16a34a' },
    { key:'archived',        label:'Lưu trữ',         icon:'fa-archive',       color:'#374151' },
  ],

  /* Which transitions are allowed per role */
  transitions: {
    admin: {
      created:         ['submitted','archived'],
      submitted:       ['verified','created','archived'],
      verified:        ['sent_accounting','submitted','archived'],
      sent_accounting: ['approved','verified','archived'],
      approved:        ['paid','sent_accounting','archived'],
      paid:            ['archived'],
      archived:        []
    },
    telecom_staff: {
      created:         ['submitted'],
      submitted:       ['verified','created'],
      verified:        ['sent_accounting'],
      sent_accounting: [],
      approved:        [],
      paid:            [],
      archived:        []
    },
    business_staff: {
      created:         ['submitted'],
      submitted:       ['created'],
      verified:        [],
      sent_accounting: [],
      approved:        [],
      paid:            [],
      archived:        []
    },
    accounting_staff: {
      created:         [],
      submitted:       [],
      verified:        [],
      sent_accounting: ['approved','verified'],
      approved:        ['paid'],
      paid:            ['archived'],
      archived:        []
    }
  },

  getStepIndex(key) { return this.steps.findIndex(s=>s.key===key); },
  getStep(key) { return this.steps.find(s=>s.key===key); },

  allowedTransitions(role, currentStatus) {
    return (this.transitions[role]?.[currentStatus]) || [];
  }
};

/* ---- ROLE LABELS ---- */
window.ROLE_LABELS = {
  admin: 'Quản trị viên',
  telecom_staff: 'Nhân viên Viễn thông',
  business_staff: 'Nhân viên Kinh doanh',
  accounting_staff: 'Nhân viên Kế toán',
};

window.DEPT_LABELS = {
  vien_thong: 'Phòng Viễn thông',
  kinh_doanh: 'Phòng Kinh doanh',
  ke_toan: 'Phòng Kế toán',
  admin: 'Quản trị',
};

window.STATUS_LABELS = {
  created: 'Khởi tạo',
  submitted: 'Đã nộp',
  verified: 'Đã xác minh',
  sent_accounting: 'Chờ kế toán',
  approved: 'Đã phê duyệt',
  paid: 'Đã thanh toán',
  archived: 'Lưu trữ',
};

window.PRIORITY_LABELS = {
  low: 'Thấp', medium: 'Trung bình', high: 'Cao'
};
