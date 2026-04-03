/* ===========================
   User Management Page (Admin only)
   =========================== */

window.UsersPage = {
  async render() {
    if (!Auth.isAdmin) {
      document.getElementById('pageContainer').innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><h3>Không có quyền truy cập</h3><p>Chỉ Admin mới có thể quản lý người dùng.</p></div>`;
      return;
    }
    document.getElementById('pageContainer').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const users = await API.getUsers();
    this._render(users);
  },

  _render(users) {
    const roleGroups = {
      admin: users.filter(u=>u.role==='admin'),
      telecom_staff: users.filter(u=>u.role==='telecom_staff'),
      business_staff: users.filter(u=>u.role==='business_staff'),
      accounting_staff: users.filter(u=>u.role==='accounting_staff'),
    };

    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fas fa-users-cog" style="color:var(--primary)"></i> Quản lý Người dùng</div>
          <div class="page-subtitle">Tổng cộng ${users.length} người dùng trong hệ thống</div>
        </div>
        <button class="btn btn-primary" onclick="UsersPage.openCreateUser()"><i class="fas fa-user-plus"></i> Thêm người dùng</button>
      </div>

      <!-- STATS -->
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        ${Object.entries(roleGroups).map(([role,list])=>`
          <div class="stat-card ${role==='admin'?'primary':role==='telecom_staff'?'info':role==='business_staff'?'warning':'success'}">
            <div class="stat-icon"><i class="fas ${role==='admin'?'fa-crown':role==='telecom_staff'?'fa-broadcast-tower':role==='business_staff'?'fa-briefcase':'fa-calculator'}"></i></div>
            <div class="stat-info"><div class="stat-value">${list.length}</div><div class="stat-label">${ROLE_LABELS[role]}</div></div>
          </div>`).join('')}
      </div>

      <!-- USER GROUPS -->
      ${Object.entries(roleGroups).map(([role,list])=>list.length?`
        <div class="mb-24">
          <div style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <i class="fas fa-circle" style="color:var(--primary);font-size:8px;margin-right:8px"></i>${ROLE_LABELS[role]}
          </div>
          <div class="users-grid">
            ${list.map(u=>this._renderUserCard(u)).join('')}
          </div>
        </div>`:''
      ).join('')}
    `;
  },

  _renderUserCard(u) {
    const dossierCount = DB.dossiers.filter(d=>!d.is_deleted&&(d.created_by_id===u.id||d.assigned_to_id===u.id)).length;
    return `
      <div class="user-card">
        <div class="user-card-avatar">${u.avatar||Utils.getInitials(u.full_name)}</div>
        <div class="user-card-info">
          <div class="user-card-name">${u.full_name}</div>
          <div class="user-card-email"><i class="fas fa-envelope" style="font-size:10px;margin-right:4px"></i>${u.email}</div>
          <div class="user-card-meta">
            ${Utils.roleBadge(u.role)}
            <span class="badge" style="background:var(--surface-2);color:var(--text-secondary)">${Utils.deptLabel(u.department)}</span>
            <span style="font-size:11px;color:var(--text-muted)">${dossierCount} hồ sơ</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="btn btn-xs btn-secondary" onclick="UsersPage.openEditUser('${u.id}')"><i class="fas fa-edit"></i></button>
          ${u.id !== Auth.userId ? `<button class="btn btn-xs btn-danger" onclick="UsersPage.deactivateUser('${u.id}','${Utils.escapeHtml(u.full_name)}')"><i class="fas fa-ban"></i></button>` : ''}
          <div class="badge ${u.is_active?'badge-approved':'badge-archived'}" style="font-size:9px">${u.is_active?'Active':'Inactive'}</div>
        </div>
      </div>`;
  },

  openCreateUser() {
    document.getElementById('modalUserTitle').textContent = 'Thêm người dùng mới';
    document.getElementById('modalUserBody').innerHTML = this._userForm();
    openModal('modalUser');
  },

  openEditUser(id) {
    const u = DB.users.find(x=>x.id===id);
    if (!u) return;
    document.getElementById('modalUserTitle').textContent = 'Chỉnh sửa người dùng';
    document.getElementById('modalUserBody').innerHTML = this._userForm(u);
    openModal('modalUser');
  },

  _userForm(u={}) {
    return `
      <div class="form-group">
        <label>Họ và tên *</label>
        <input type="text" id="uFullName" value="${u.full_name||''}" placeholder="Nguyễn Văn A" required />
      </div>
      <div class="form-group">
        <label>Tên đăng nhập *</label>
        <input type="text" id="uUsername" value="${u.username||''}" placeholder="nguyenvana" ${u.id?'readonly':''} required />
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" id="uEmail" value="${u.email||''}" placeholder="email@company.vn" required />
      </div>
      <div class="form-group">
        <label>Mật khẩu ${u.id?'(để trống = không đổi)':' *'}</label>
        <input type="password" id="uPassword" placeholder="Nhập mật khẩu..." ${u.id?'':'required'} />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Vai trò *</label>
          <select id="uRole" onchange="UsersPage.syncDept(this)">
            <option value="telecom_staff" ${u.role==='telecom_staff'?'selected':''}>Nhân viên Viễn thông</option>
            <option value="business_staff" ${u.role==='business_staff'?'selected':''}>Nhân viên Kinh doanh</option>
            <option value="accounting_staff" ${u.role==='accounting_staff'?'selected':''}>Nhân viên Kế toán</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>Quản trị viên</option>
          </select>
        </div>
        <div class="form-group">
          <label>Phòng ban *</label>
          <select id="uDept">
            <option value="vien_thong" ${u.department==='vien_thong'?'selected':''}>Phòng Viễn thông</option>
            <option value="kinh_doanh" ${u.department==='kinh_doanh'?'selected':''}>Phòng Kinh doanh</option>
            <option value="ke_toan" ${u.department==='ke_toan'?'selected':''}>Phòng Kế toán</option>
            <option value="admin" ${u.department==='admin'?'selected':''}>Quản trị</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('modalUser')">Hủy</button>
        <button class="btn btn-primary" onclick="UsersPage.saveUser('${u.id||''}')"><i class="fas fa-save"></i> Lưu</button>
      </div>`;
  },

  syncDept(sel) {
    const roleMap = { telecom_staff:'vien_thong', business_staff:'kinh_doanh', accounting_staff:'ke_toan', admin:'admin' };
    const dept = roleMap[sel.value];
    const deptSel = document.getElementById('uDept');
    if (dept && deptSel) deptSel.value = dept;
  },

  async saveUser(id) {
    const payload = {
      full_name: document.getElementById('uFullName').value.trim(),
      username: document.getElementById('uUsername').value.trim(),
      email: document.getElementById('uEmail').value.trim(),
      role: document.getElementById('uRole').value,
      department: document.getElementById('uDept').value,
    };
    const pwd = document.getElementById('uPassword').value;
    if (pwd) payload.password = pwd;

    if (!payload.full_name || !payload.username || !payload.email) {
      return Toast.show('Lỗi','Vui lòng điền đầy đủ thông tin bắt buộc!','error');
    }

    try {
      if (id) {
        await API.updateUser(id, payload);
        Toast.show('Thành công','Đã cập nhật người dùng!','success');
      } else {
        if (!pwd) return Toast.show('Lỗi','Vui lòng nhập mật khẩu!','error');
        await API.createUser(payload);
        Toast.show('Thành công','Đã thêm người dùng mới!','success');
      }
      closeModal('modalUser');
      const users = await API.getUsers();
      this._render(users);
    } catch(err) {
      Toast.show('Lỗi', err.message, 'error');
    }
  },

  deactivateUser(id, name) {
    document.getElementById('confirmTitle').textContent = 'Vô hiệu hoá tài khoản?';
    document.getElementById('confirmMessage').textContent = `Bạn chắc chắn muốn vô hiệu hoá tài khoản của "${name}"?`;
    document.getElementById('confirmOkBtn').onclick = async () => {
      await API.deleteUser(id);
      closeModal('modalConfirm');
      Toast.show('Thành công','Đã vô hiệu hoá tài khoản!','success');
      const users = await API.getUsers();
      this._render(users);
    };
    openModal('modalConfirm');
  }
};
