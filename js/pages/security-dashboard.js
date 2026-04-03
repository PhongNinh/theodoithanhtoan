/**
 * security-dashboard.js - Dashboard bảo mật (Admin only)
 */

const PageSecurity = (() => {
  'use strict';
  const e = Security.e;

  async function render() {
    if (!Auth.isAdmin()) {
      document.getElementById('mainContent').innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><p>Chỉ admin mới truy cập được trang này</p></div>`;
      return;
    }

    const secEvents = Security.SecurityMonitor.getEvents(100);
    const rateLimitData = Security.RateLimiter.attempts;

    // Phân tích events
    const eventCounts = {};
    secEvents.forEach(ev => {
      eventCounts[ev.type] = (eventCounts[ev.type] || 0) + 1;
    });

    const criticalEvents = secEvents.filter(ev =>
      ['BRUTE_FORCE_DETECTED', 'XSS_ATTEMPT', 'UNAUTHORIZED_ACCESS', 'SESSION_EXPIRED', 'CLICKJACKING_ATTEMPT'].includes(ev.type)
    );

    const html = `
<div class="security-page">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-shield-alt me-2"></i>Trung tâm Bảo mật</h1>
    <button class="btn btn-outline" onclick="PageSecurity.exportLog()">
      <i class="fas fa-download me-1"></i>Xuất Security Log
    </button>
  </div>

  <!-- Security Status -->
  <div class="kpi-grid mb-4">
    <div class="kpi-card kpi-green">
      <div class="kpi-icon"><i class="fas fa-shield-alt"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">HOẠT ĐỘNG</div>
        <div class="kpi-label">Trạng thái bảo mật</div>
      </div>
    </div>
    <div class="kpi-card kpi-blue">
      <div class="kpi-icon"><i class="fas fa-list"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${e(String(secEvents.length))}</div>
        <div class="kpi-label">Security events</div>
      </div>
    </div>
    <div class="kpi-card kpi-orange">
      <div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${e(String(criticalEvents.length))}</div>
        <div class="kpi-label">Sự kiện nghiêm trọng</div>
      </div>
    </div>
    <div class="kpi-card kpi-purple">
      <div class="kpi-icon"><i class="fas fa-user-shield"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">v${e(Security.VERSION)}</div>
        <div class="kpi-label">Security Module</div>
      </div>
    </div>
  </div>

  <!-- Security Features Status -->
  <div class="card mb-4">
    <div class="card-header"><h3><i class="fas fa-check-circle me-2"></i>Tính năng bảo mật đang hoạt động</h3></div>
    <div class="card-body">
      <div class="security-features-grid">
        ${[
          { icon: 'fa-code', label: 'XSS Protection', desc: 'Sanitize input/output, escape HTML entities', status: true },
          { icon: 'fa-lock', label: 'Rate Limiting', desc: `Khóa sau ${5} lần thử thất bại trong 15 phút`, status: true },
          { icon: 'fa-clock', label: 'Session Timeout', desc: '30 phút không hoạt động tự đăng xuất', status: true },
          { icon: 'fa-shield-alt', label: 'Content Security Policy', desc: 'CSP headers ngăn script injection', status: true },
          { icon: 'fa-key', label: 'SHA-256 Hashing', desc: 'Mật khẩu được hash trước khi lưu', status: true },
          { icon: 'fa-random', label: 'CSRF Token', desc: 'Token duy nhất mỗi phiên làm việc', status: true },
          { icon: 'fa-user-lock', label: 'RBAC', desc: '4 vai trò với phân quyền chi tiết', status: true },
          { icon: 'fa-history', label: 'Audit Logging', desc: 'Ghi nhận mọi hành động trong hệ thống', status: true },
          { icon: 'fa-window-restore', label: 'Clickjacking Protection', desc: 'Chặn hiển thị trong iframe', status: true },
          { icon: 'fa-database', label: 'Secure Storage', desc: 'Session data obfuscated trong sessionStorage', status: true },
          { icon: 'fa-filter', label: 'Input Validation', desc: 'Schema validation cho tất cả inputs', status: true },
          { icon: 'fa-eye-slash', label: 'NoSQL Injection Prevention', desc: 'Loại bỏ $operators trong queries', status: true }
        ].map(f => `
          <div class="security-feature ${f.status ? 'active' : 'inactive'}">
            <div class="sf-icon"><i class="fas ${e(f.icon)}"></i></div>
            <div class="sf-body">
              <div class="sf-label">${e(f.label)}</div>
              <div class="sf-desc">${e(f.desc)}</div>
            </div>
            <div class="sf-status">
              <i class="fas ${f.status ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}"></i>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Rate Limit Status -->
  <div class="card mb-4">
    <div class="card-header"><h3><i class="fas fa-user-lock me-2"></i>Trạng thái Rate Limit</h3></div>
    <div class="card-body">
      ${Object.keys(rateLimitData).length === 0 ? `<p class="text-muted">Không có tài khoản nào đang bị theo dõi</p>` : `
      <table class="table">
        <thead><tr><th>Key</th><th>Số lần thử</th><th>Trạng thái</th></tr></thead>
        <tbody>
          ${Object.entries(rateLimitData).map(([key, rec]) => {
            const isLocked = rec.lockedUntil > Date.now();
            return `
              <tr>
                <td><code>${e(key)}</code></td>
                <td>${e(String(rec.count))}</td>
                <td>
                  ${isLocked
                    ? `<span class="badge badge-danger">KHÓA - ${e(Security.RateLimiter.formatRemaining(rec.lockedUntil - Date.now()))}</span>`
                    : `<span class="badge badge-success">Bình thường</span>`}
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>
  </div>

  <!-- Critical Events -->
  ${criticalEvents.length ? `
  <div class="card mb-4">
    <div class="card-header alert-header">
      <h3 class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Sự kiện bảo mật nghiêm trọng</h3>
    </div>
    <div class="card-body p-0">
      <table class="table">
        <thead><tr><th>Thời gian</th><th>Loại sự kiện</th><th>Chi tiết</th></tr></thead>
        <tbody>
          ${criticalEvents.map(ev => `
            <tr class="row-danger">
              <td>${e(Utils.fmt.datetime(new Date(ev.timestamp).getTime()))}</td>
              <td><span class="badge badge-danger">${e(ev.type)}</span></td>
              <td class="small">${e(JSON.stringify(ev.details).substring(0, 100))}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- All Security Events -->
  <div class="card">
    <div class="card-header">
      <h3><i class="fas fa-list me-2"></i>Nhật ký Security Events (${e(String(secEvents.length))} gần nhất)</h3>
    </div>
    <div class="card-body p-0">
      <table class="table">
        <thead><tr><th>Thời gian</th><th>Loại</th><th>Chi tiết</th></tr></thead>
        <tbody>
          ${secEvents.slice(0, 50).map(ev => {
            const isCritical = ['BRUTE_FORCE_DETECTED', 'XSS_ATTEMPT', 'UNAUTHORIZED_ACCESS'].includes(ev.type);
            return `
              <tr class="${isCritical ? 'row-danger' : ''}">
                <td class="text-nowrap small">${e(new Date(ev.timestamp).toLocaleString('vi-VN'))}</td>
                <td><span class="badge ${isCritical ? 'badge-danger' : 'badge-secondary'} badge-xs">${e(ev.type)}</span></td>
                <td class="small text-muted">${e(JSON.stringify(ev.details).substring(0, 80))}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Security Tips -->
  <div class="card mt-4">
    <div class="card-header"><h3><i class="fas fa-lightbulb me-2"></i>Giới hạn bảo mật client-side</h3></div>
    <div class="card-body">
      <div class="security-limits">
        <div class="limit-item">
          <i class="fas fa-check-circle text-success me-2"></i>
          <span>Dữ liệu lưu trên server qua RESTful Table API — không còn phụ thuộc localStorage</span>
        </div>
        <div class="limit-item">
          <i class="fas fa-exclamation-circle text-warning me-2"></i>
          <span>SHA-256 hash client-side — yếu hơn bcrypt server-side nhưng đủ cho môi trường demo</span>
        </div>
        <div class="limit-item">
          <i class="fas fa-exclamation-circle text-warning me-2"></i>
          <span>Rate limiting chỉ ngăn brute-force tại UI — không ngăn API calls trực tiếp</span>
        </div>
        <div class="limit-item">
          <i class="fas fa-info-circle text-info me-2"></i>
          <span>Để bảo mật tối đa (production): triển khai backend Node.js + MongoDB với bcrypt, JWT, HTTPS</span>
        </div>
      </div>
    </div>
  </div>
</div>`;

    document.getElementById('mainContent').innerHTML = html;
  }

  function exportLog() {
    const events = Security.SecurityMonitor.getEvents(500);
    const rows   = events.map(ev => ({
      'Thời gian': new Date(ev.timestamp).toLocaleString('vi-VN'),
      'Loại': ev.type,
      'Chi tiết': JSON.stringify(ev.details),
      'URL': ev.url,
      'User Agent': ev.userAgent?.substring(0, 80) || ''
    }));
    Utils.exportCSV(rows, `security-log-${new Date().toISOString().split('T')[0]}.csv`);
  }

  return { render, exportLog };
})();

window.PageSecurity = PageSecurity;
