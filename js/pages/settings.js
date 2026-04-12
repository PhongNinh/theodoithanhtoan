/**
 * settings.js - Cài đặt hệ thống (async/await, Table API)
 * PayTrack Pro v3.0
 */

const PageSettings = (() => {
  'use strict';
  const e = Security.e;

  /* ─── Render chính (async) ─── */
  async function render() {
    document.getElementById('mainContent').innerHTML =
      `<div class="page-loader"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;

    const user = Auth.getCurrentUser();

    // Stats (admin only)
    let dossierCount = '—', userCount = '—', auditCount = '—';
    if (Auth.isAdmin()) {
      const [dos, usrs, auds] = await Promise.all([
        DB.dossiers.getAll(),
        DB.users.getAll(),
        DB.auditLogs.getAll(9999)
      ]);
      dossierCount = String(dos.length);
      userCount    = String(usrs.length);
      auditCount   = String(auds.length);
    }

    const html = `
<div class="settings-page">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-cog me-2"></i>Cài đặt Hệ thống</h1>
  </div>

  <!-- Profile Section -->
  <div class="card mb-4">
    <div class="card-header"><h3><i class="fas fa-user me-2"></i>Thông tin cá nhân</h3></div>
    <div class="card-body">
      <div class="profile-section">
        <div class="avatar-large" style="background:${e(user.color || '#6c757d')}">
          ${e(user.avatar || '?')}
        </div>
        <div class="profile-info">
          <h2>${e(user.displayName)}</h2>
          <p class="text-muted">@${e(user.username)} · ${e(Auth.getRoleLabel(user.role))} · ${e(Auth.getDeptLabel(user.department))}</p>
          <p class="text-muted small">${e(user.email || 'Chưa có email')}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Change Password -->
  <div class="card mb-4">
    <div class="card-header"><h3><i class="fas fa-key me-2"></i>Đổi mật khẩu</h3></div>
    <div class="card-body">
      <div class="form-grid" style="max-width:500px">
        <div class="form-group full-width">
          <label>Mật khẩu hiện tại</label>
          <input type="password" id="oldPassword" class="form-input"
            placeholder="Nhập mật khẩu hiện tại" autocomplete="current-password">
        </div>
        <div class="form-group">
          <label>Mật khẩu mới</label>
          <input type="password" id="newPassword" class="form-input"
            placeholder="Tối thiểu 6 ký tự" autocomplete="new-password">
          <div id="pwdStrength" class="pwd-strength mt-1"></div>
        </div>
        <div class="form-group">
          <label>Xác nhận mật khẩu mới</label>
          <input type="password" id="confirmPassword" class="form-input"
            placeholder="Nhập lại mật khẩu mới" autocomplete="new-password">
        </div>
        <div class="form-group full-width">
          <button id="changePwdBtn" class="btn btn-primary" onclick="PageSettings.changePassword()">
            <i class="fas fa-save me-1"></i>Cập nhật mật khẩu
          </button>
        </div>
      </div>
    </div>
  </div>

  ${Auth.isAdmin() ? `
  <!-- System Info (Admin only) -->
  <div class="card mb-4">
    <div class="card-header"><h3><i class="fas fa-info-circle me-2"></i>Thông tin hệ thống</h3></div>
    <div class="card-body">
      <table class="table table-sm">
        <tbody>
          <tr><td>Phiên bản</td><td>PayTrack Pro v3.0</td></tr>
          <tr><td>Security Module</td><td>v${e(Security.VERSION || '2.0.0')}</td></tr>
          <tr><td>Lưu trữ</td><td>RESTful Table API (server-side, persistent)</td></tr>
          <tr><td>Tổng hồ sơ</td><td>${e(dossierCount)}</td></tr>
          <tr><td>Tổng người dùng</td><td>${e(userCount)}</td></tr>
          <tr><td>Audit logs</td><td>${e(auditCount)}</td></tr>
          <tr><td>Bảo mật</td><td>SHA-256, Rate Limiting, Session Timeout, XSS Protection, CSP</td></tr>
        </tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- Session Info -->
  <div class="card">
    <div class="card-header"><h3><i class="fas fa-shield-alt me-2"></i>Phiên làm việc hiện tại</h3></div>
    <div class="card-body">
      <table class="table table-sm">
        <tbody>
          <tr><td>Đăng nhập lúc</td><td>${e(Utils.fmt.datetime(user.loginAt))}</td></tr>
          <tr><td>Session timeout</td><td>30 phút không hoạt động</td></tr>
          <tr><td>CSRF Token</td><td><code class="mono">${e(Security.CSRF.get().substring(0, 16))}...</code></td></tr>
        </tbody>
      </table>
      <button class="btn btn-danger mt-2"
        onclick="Utils.Modal.confirm('Bạn có chắc muốn đăng xuất?', () => Auth.logout())">
        <i class="fas fa-sign-out-alt me-1"></i>Đăng xuất ngay
      </button>
    </div>
  </div>
</div>`;

    document.getElementById('mainContent').innerHTML = html;

    // Password strength indicator
    const newPwd = document.getElementById('newPassword');
    if (newPwd) {
      newPwd.addEventListener('input', () => {
        const strength = Security.Password.checkStrength(newPwd.value);
        const el = document.getElementById('pwdStrength');
        if (!el) return;
        const colors = ['', '#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997'];
        el.innerHTML = newPwd.value ? `
          <div class="strength-bar">
            <div style="width:${(strength.score / 5 * 100)}%;background:${colors[strength.score]};height:4px;border-radius:2px;transition:all 0.3s"></div>
          </div>
          <span style="color:${colors[strength.score]};font-size:12px">${Security.e(strength.level)}</span>
        ` : '';
      });
    }
  }

  /* ─── Đổi mật khẩu (async) ─── */
  async function changePassword() {
    const oldPwd  = document.getElementById('oldPassword')?.value;
    const newPwd  = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    const btn     = document.getElementById('changePwdBtn');

    if (!oldPwd || !newPwd || !confirm) {
      Utils.showToast('Vui lòng điền đầy đủ thông tin', 'warning');
      return;
    }
    if (newPwd !== confirm) {
      Utils.showToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    Utils.dom.setLoading(btn, true, 'Đang cập nhật...');
    const result = await Auth.changePassword(oldPwd, newPwd);
    Utils.dom.setLoading(btn, false);

    if (result.ok) {
      Utils.showToast('Đã cập nhật mật khẩu thành công!', 'success');
      document.getElementById('oldPassword').value     = '';
      document.getElementById('newPassword').value     = '';
      document.getElementById('confirmPassword').value = '';
    } else {
      Utils.showToast(result.reason || 'Lỗi đổi mật khẩu', 'error');
    }
  }

  return { render, changePassword };
})();

window.PageSettings = PageSettings;
