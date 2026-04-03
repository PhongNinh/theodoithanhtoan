/* ===========================
   Settings Page
   =========================== */

window.SettingsPage = {
  render() {
    const u = Auth.user;
    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div class="page-title"><i class="fas fa-cog" style="color:var(--primary)"></i> Cài đặt Hệ thống</div>
      </div>

      <div style="max-width:800px;display:flex;flex-direction:column;gap:24px">

        <!-- PROFILE -->
        <div class="card">
          <div class="settings-section" style="margin-bottom:0">
            <h3><i class="fas fa-user-circle" style="color:var(--primary)"></i> Hồ sơ cá nhân</h3>
            <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px">
              ${Utils.avatarHtml(u.full_name, 64, 22)}
              <div>
                <div style="font-size:18px;font-weight:700">${u.full_name}</div>
                <div style="color:var(--text-muted)">${u.email}</div>
                <div style="margin-top:6px">${Utils.roleBadge(u.role)}</div>
              </div>
            </div>
            <div class="settings-grid">
              <div class="form-group">
                <label>Họ và tên</label>
                <input type="text" id="profileName" value="${u.full_name}" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="profileEmail" value="${u.email}" />
              </div>
              <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" value="${u.username}" readonly style="opacity:.6" />
              </div>
              <div class="form-group">
                <label>Phòng ban</label>
                <input type="text" value="${Utils.deptLabel(u.department)}" readonly style="opacity:.6" />
              </div>
            </div>
            <div class="form-group" style="max-width:300px">
              <label>Mật khẩu mới (để trống = không đổi)</label>
              <div class="password-wrapper">
                <input type="password" id="newPwd" placeholder="Nhập mật khẩu mới..." />
                <button type="button" class="toggle-pwd" onclick="togglePwd('newPwd')"><i class="fas fa-eye"></i></button>
              </div>
            </div>
            <button class="btn btn-primary" onclick="SettingsPage.saveProfile()"><i class="fas fa-save"></i> Lưu thay đổi</button>
          </div>
        </div>

        <!-- SYSTEM INFO -->
        <div class="card">
          <div class="settings-section" style="margin-bottom:0">
            <h3><i class="fas fa-server" style="color:var(--info)"></i> Thông tin Hệ thống</h3>
            <div class="settings-grid">
              ${this._infoRow('Phiên bản','PayTrack Pro v1.0.0')}
              ${this._infoRow('Tổng hồ sơ', DB.dossiers.filter(d=>!d.is_deleted).length + ' hồ sơ')}
              ${this._infoRow('Người dùng', DB.users.filter(u=>u.is_active).length + ' tài khoản')}
              ${this._infoRow('Audit Logs', DB.auditLogs.length + ' bản ghi')}
              ${this._infoRow('Thông báo', DB.notifications.length + ' thông báo')}
              ${this._infoRow('Môi trường','Production (Simulated)')}
            </div>
          </div>
        </div>

        <!-- DATABASE SCHEMA (Admin only) -->
        ${Auth.isAdmin ? `
        <div class="card">
          <div class="settings-section" style="margin-bottom:0">
            <h3><i class="fas fa-database" style="color:var(--success)"></i> Cấu trúc Cơ sở dữ liệu</h3>
            ${this._renderSchema()}
          </div>
        </div>` : ''}

        <!-- WORKFLOW CONFIG -->
        <div class="card">
          <div class="settings-section" style="margin-bottom:0">
            <h3><i class="fas fa-stream" style="color:var(--warning)"></i> Luồng xử lý Workflow</h3>
            <div class="table-wrapper schema-table">
              <table>
                <thead><tr><th>BƯỚC</th><th>TRẠNG THÁI</th><th>MÔ TẢ</th><th>NGƯỜI XỬ LÝ</th></tr></thead>
                <tbody>
                  ${WORKFLOW.steps.map((s,i)=>`
                    <tr>
                      <td style="font-weight:700">${i+1}</td>
                      <td>${Utils.statusBadge(s.key)}</td>
                      <td>${s.label}</td>
                      <td style="font-size:11px;color:var(--text-muted)">${this._stepOwner(s.key)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- DANGER ZONE (Admin) -->
        ${Auth.isAdmin ? `
        <div class="card" style="border-color:var(--danger)">
          <div class="settings-section" style="margin-bottom:0">
            <h3 style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i> Vùng nguy hiểm</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Các hành động không thể hoàn tác.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-danger" onclick="SettingsPage.resetDemo()"><i class="fas fa-redo"></i> Reset dữ liệu demo</button>
              <button class="btn btn-secondary" onclick="SettingsPage.exportBackup()"><i class="fas fa-download"></i> Backup toàn bộ data</button>
            </div>
          </div>
        </div>` : ''}
      </div>
    `;
  },

  _infoRow(label, value) {
    return `<div><div class="df-label">${label}</div><div class="df-value">${value}</div></div>`;
  },

  _renderSchema() {
    const tables = [
      { name:'users', fields:['id','username','full_name','email','role','department','is_active'] },
      { name:'dossiers', fields:['id','dossier_code','project_name','status','priority','amount','deadline','department','assigned_to_id'] },
      { name:'audit_logs', fields:['id','dossier_id','user_id','action','old_value','new_value','timestamp'] },
      { name:'notifications', fields:['id','user_id','type','title','is_read','priority'] },
      { name:'comments', fields:['id','dossier_id','user_id','content','is_internal'] },
    ];
    return tables.map(t=>`
      <div style="margin-bottom:16px">
        <div style="font-weight:700;font-size:12px;color:var(--primary);margin-bottom:8px"><i class="fas fa-table"></i> ${t.name}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${t.fields.map(f=>`<code style="background:var(--surface-2);padding:3px 8px;border-radius:4px;font-size:11px;border:1px solid var(--border)">${f}</code>`).join('')}
        </div>
      </div>`).join('');
  },

  _stepOwner(status) {
    const owners = {
      created: 'Kinh doanh / Viễn thông',
      submitted: 'Kinh doanh / Viễn thông',
      verified: 'Phòng Viễn thông',
      sent_accounting: 'Phòng Kế toán',
      approved: 'Phòng Kế toán',
      paid: 'Phòng Kế toán',
      archived: 'Admin / Kế toán',
    };
    return owners[status] || '—';
  },

  saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const pwd = document.getElementById('newPwd').value;
    if (!name || !email) return Toast.show('Lỗi','Vui lòng điền đầy đủ!','error');
    const idx = DB.users.findIndex(u=>u.id===Auth.userId);
    if (idx > -1) {
      DB.users[idx].full_name = name;
      DB.users[idx].email = email;
      if (pwd) DB.users[idx].password = pwd;
      Auth.currentUser.full_name = name;
      Auth.currentUser.email = email;
      localStorage.setItem(Auth.SESSION_KEY, JSON.stringify(Auth.currentUser));
      Toast.show('Thành công','Đã cập nhật hồ sơ cá nhân!','success');
      updateUserUI();
    }
  },

  resetDemo() {
    document.getElementById('confirmTitle').textContent = 'Reset dữ liệu?';
    document.getElementById('confirmMessage').textContent = 'Tất cả dữ liệu sẽ được đặt lại về trạng thái demo ban đầu. Bạn xác nhận?';
    document.getElementById('confirmOkBtn').onclick = () => {
      closeModal('modalConfirm');
      location.reload();
    };
    openModal('modalConfirm');
  },

  exportBackup() {
    const backup = JSON.stringify({ users: DB.users, dossiers: DB.dossiers, auditLogs: DB.auditLogs, notifications: DB.notifications, comments: DB.comments, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([backup], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`PayTrack_Backup_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    Toast.show('Thành công','Đã xuất backup!','success');
  }
};
