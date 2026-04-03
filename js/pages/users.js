/**
 * users.js - Quản lý người dùng (Admin only)
 */

const PageUsers = (() => {
  'use strict';
  const e = Security.e;

  function render() {
    if (!Auth.isAdmin()) {
      document.getElementById('mainContent').innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><p>Chỉ admin mới truy cập được trang này</p></div>`;
      return;
    }

    const result = API.users.list();
    if (!result.success) { Utils.showToast(result.error, 'error'); return; }
    const users = result.data;

    const html = `
<div class="users-page">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-users me-2"></i>Quản lý Người dùng</h1>
    <button class="btn btn-primary" onclick="PageUsers.openForm(null)">
      <i class="fas fa-user-plus me-1"></i>Thêm người dùng
    </button>
  </div>

  <div class="card">
    <div class="card-header">
      <span>Tổng cộng: <strong>${e(String(users.length))}</strong> tài khoản</span>
    </div>
    <div class="card-body p-0">
      <table class="table">
        <thead>
          <tr>
            <th>Avatar</th>
            <th>Họ tên / Username</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Phòng ban</th>
            <th>Trạng thái</th>
            <th>Đăng nhập cuối</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => renderRow(u)).join('')}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- User Form Modal -->
<div id="userFormModal" class="modal">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3 id="userFormTitle">Thêm người dùng</h3>
      <button class="modal-close" data-close-modal="userFormModal">×</button>
    </div>
    <div class="modal-body">
      <div id="userForm"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal="userFormModal">Hủy</button>
      <button id="userFormSubmitBtn" class="btn btn-primary" onclick="PageUsers.submitForm()">
        <i class="fas fa-save me-1"></i>Lưu
      </button>
    </div>
  </div>
</div>

<!-- Confirm Modal -->
<div id="confirmModal" class="modal">
  <div class="modal-dialog modal-sm">
    <div class="modal-header"><h3>Xác nhận</h3></div>
    <div class="modal-body"><p id="confirmMessage"></p></div>
    <div class="modal-footer">
      <button id="confirmCancel" class="btn btn-secondary" onclick="Utils.Modal.hide('confirmModal')">Hủy</button>
      <button id="confirmOk" class="btn btn-danger">Xác nhận</button>
    </div>
  </div>
</div>`;

    document.getElementById('mainContent').innerHTML = html;
  }

  function renderRow(u) {
    const roleInfo = Auth.ROLES[u.role] || {};
    const isSelf   = u.id === Auth.getCurrentUser().id;
    return `
      <tr>
        <td>
          <div class="avatar" style="background:${e(u.color || '#6c757d')};width:36px;height:36px">${e(u.avatar || '?')}</div>
        </td>
        <td>
          <div class="fw-bold">${e(u.displayName)}</div>
          <div class="text-muted small">@${e(u.username)}</div>
        </td>
        <td>${e(u.email || '—')}</td>
        <td>
          <span style="color:${e(roleInfo.color || '#6c757d')}">
            <i class="fas ${e(roleInfo.icon || 'fa-user')} me-1"></i>${e(roleInfo.label || u.role)}
          </span>
        </td>
        <td>${e(Auth.getDeptLabel(u.department))}</td>
        <td>
          <span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">
            ${u.active ? 'Hoạt động' : 'Đã khóa'}
          </span>
        </td>
        <td>${e(Utils.fmt.datetime(u.lastLogin) || '—')}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-xs btn-warning" onclick="PageUsers.openForm('${e(u.id)}')" title="Sửa">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-xs ${u.active ? 'btn-secondary' : 'btn-success'}" onclick="PageUsers.toggleActive('${e(u.id)}', ${!u.active})" title="${u.active ? 'Khóa' : 'Mở khóa'}">
              <i class="fas ${u.active ? 'fa-lock' : 'fa-unlock'}"></i>
            </button>
            ${!isSelf ? `
            <button class="btn btn-xs btn-danger" onclick="PageUsers.deleteUser('${e(u.id)}')" title="Xóa">
              <i class="fas fa-trash"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>`;
  }

  function openForm(id) {
    const user  = id ? DB.users.getById(id) : null;
    const title = document.getElementById('userFormTitle');
    if (title) title.textContent = user ? `Sửa: ${user.displayName}` : 'Thêm người dùng';

    const form = document.getElementById('userForm');
    if (!form) return;

    form.innerHTML = `
      <input type="hidden" id="uFormId" value="${e(user?.id || '')}">
      <div class="form-grid">
        <div class="form-group">
          <label class="required">Họ tên</label>
          <input type="text" id="uDisplayName" class="form-input" value="${e(user?.displayName || '')}" maxlength="100" required placeholder="Nguyễn Văn A">
        </div>
        <div class="form-group">
          <label class="required">Tên đăng nhập</label>
          <input type="text" id="uUsername" class="form-input" value="${e(user?.username || '')}" maxlength="50" ${user ? 'readonly' : ''} placeholder="nguyen_van_a">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="uEmail" class="form-input" value="${e(user?.email || '')}" maxlength="100" placeholder="email@company.vn">
        </div>
        <div class="form-group">
          <label>Điện thoại</label>
          <input type="text" id="uPhone" class="form-input" value="${e(user?.phone || '')}" maxlength="20" placeholder="0901234567">
        </div>
        <div class="form-group">
          <label class="required">Vai trò</label>
          <select id="uRole" class="form-input">
            ${Utils.dom.buildOptions([
              {value:'admin',label:'Quản trị viên'},
              {value:'telecom',label:'Nhân viên Viễn thông'},
              {value:'business',label:'Nhân viên Kinh doanh'},
              {value:'accounting',label:'Nhân viên Kế toán'}
            ], user?.role, null)}
          </select>
        </div>
        <div class="form-group">
          <label class="required">Phòng ban</label>
          <select id="uDept" class="form-input">
            ${Utils.dom.buildOptions([
              {value:'admin',label:'Ban Quản trị'},
              {value:'telecom',label:'Phòng Viễn thông'},
              {value:'business',label:'Phòng Kinh doanh'},
              {value:'accounting',label:'Phòng Kế toán'}
            ], user?.department, null)}
          </select>
        </div>
        ${!user ? `
        <div class="form-group">
          <label class="required">Mật khẩu</label>
          <input type="password" id="uPassword" class="form-input" minlength="6" maxlength="100" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="required">Xác nhận mật khẩu</label>
          <input type="password" id="uPasswordConfirm" class="form-input" placeholder="Nhập lại mật khẩu" autocomplete="new-password">
        </div>` : ''}
        <div class="form-group full-width">
          <label class="d-flex align-center gap-2">
            <input type="checkbox" id="uActive" ${(user?.active !== false) ? 'checked' : ''}>
            Tài khoản đang hoạt động
          </label>
        </div>
      </div>`;

    Utils.Modal.show('userFormModal');
  }

  async function submitForm() {
    const id = document.getElementById('uFormId')?.value;
    const btn = document.getElementById('userFormSubmitBtn');

    const data = {
      displayName: document.getElementById('uDisplayName')?.value || '',
      username:    document.getElementById('uUsername')?.value    || '',
      email:       document.getElementById('uEmail')?.value       || '',
      phone:       document.getElementById('uPhone')?.value       || '',
      role:        document.getElementById('uRole')?.value        || '',
      department:  document.getElementById('uDept')?.value        || '',
      active:      document.getElementById('uActive')?.checked    ?? true
    };

    Utils.dom.setLoading(btn, true);

    let result;
    if (id) {
      result = API.users.update(id, data);
    } else {
      const password = document.getElementById('uPassword')?.value || '';
      const confirm  = document.getElementById('uPasswordConfirm')?.value || '';
      if (password !== confirm) {
        Utils.showToast('Mật khẩu xác nhận không khớp', 'error');
        Utils.dom.setLoading(btn, false);
        return;
      }
      result = await API.users.create({ ...data, password });
    }

    Utils.dom.setLoading(btn, false);

    if (result.ok !== undefined) {
      // register returns {ok, user/reason}
      if (!result.ok) { Utils.showToast(result.reason, 'error'); return; }
      Utils.showToast('Đã tạo tài khoản mới!', 'success');
    } else if (result.success) {
      Utils.showToast('Đã cập nhật!', 'success');
    } else {
      Utils.showToast(result.error || 'Lỗi', 'error'); return;
    }

    Utils.Modal.hide('userFormModal');
    render();
  }

  function toggleActive(id, active) {
    const result = API.users.update(id, { active });
    if (result.success) {
      Utils.showToast(active ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản', 'success');
      render();
    } else {
      Utils.showToast(result.error, 'error');
    }
  }

  function deleteUser(id) {
    const user = DB.users.getById(id);
    Utils.Modal.confirm(
      `Xóa tài khoản "${user?.displayName || id}"? Hành động này không thể hoàn tác.`,
      () => {
        const result = API.users.delete(id);
        if (result.success) {
          Utils.showToast('Đã xóa tài khoản', 'success');
          render();
        } else {
          Utils.showToast(result.error, 'error');
        }
      }
    );
  }

  return { render, openForm, submitForm, toggleActive, deleteUser };
})();

window.PageUsers = PageUsers;
