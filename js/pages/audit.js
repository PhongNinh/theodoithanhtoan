/**
 * audit.js - Audit Log (nhật ký hoạt động) — async/await, Table API
 * PayTrack Pro v3.0
 */

const PageAudit = (() => {
  'use strict';
  const e = Security.e;

  const ACTION_LABELS = {
    USER_LOGIN:      { label: 'Đăng nhập',         icon: 'fa-sign-in-alt',  color: '#28a745' },
    USER_LOGOUT:     { label: 'Đăng xuất',          icon: 'fa-sign-out-alt', color: '#6c757d' },
    CREATE_DOSSIER:  { label: 'Tạo hồ sơ',          icon: 'fa-plus-circle',  color: '#007bff' },
    UPDATE_DOSSIER:  { label: 'Sửa hồ sơ',          icon: 'fa-edit',         color: '#fd7e14' },
    DELETE_DOSSIER:  { label: 'Xóa hồ sơ',          icon: 'fa-trash',        color: '#dc3545' },
    STATUS_CHANGE:   { label: 'Đổi trạng thái',     icon: 'fa-exchange-alt', color: '#17a2b8' },
    ADD_COMMENT:     { label: 'Thêm bình luận',      icon: 'fa-comment',      color: '#6f42c1' },
    USER_CREATED:    { label: 'Tạo người dùng',      icon: 'fa-user-plus',    color: '#007bff' },
    UPDATE_USER:     { label: 'Sửa người dùng',      icon: 'fa-user-edit',    color: '#fd7e14' },
    DELETE_USER:     { label: 'Xóa người dùng',      icon: 'fa-user-minus',   color: '#dc3545' },
    PASSWORD_CHANGE: { label: 'Đổi mật khẩu',        icon: 'fa-key',          color: '#e83e8c' },
    LOGIN_FAILED:    { label: 'Đăng nhập thất bại',  icon: 'fa-times-circle', color: '#dc3545' }
  };

  let _limit        = 50;
  let _filterAction = '';
  let _filterUser   = '';
  let _search       = '';
  let _allUsers     = [];  // cache users để lookup trong loadLogs

  /* ─── Render khung (async) ─── */
  async function render() {
    if (!Auth.isLoggedIn()) return;

    document.getElementById('mainContent').innerHTML =
      `<div class="page-loader"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;

    // Tải users một lần để dùng trong filter dropdown và lookup
    _allUsers = await DB.users.getAll();
    const actions = Object.entries(ACTION_LABELS);

    const html = `
<div class="audit-page">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-history me-2"></i>Audit Log</h1>
    <button class="btn btn-outline" onclick="PageAudit.exportLog()">
      <i class="fas fa-download me-1"></i>Xuất CSV
    </button>
  </div>

  <div class="filter-bar card mb-3">
    <div class="filter-row">
      <div class="filter-group">
        <label>Loại hành động</label>
        <select id="auditFilterAction" onchange="PageAudit.applyFilter()">
          <option value="">Tất cả</option>
          ${actions.map(([k, v]) =>
            `<option value="${e(k)}" ${_filterAction === k ? 'selected' : ''}>${e(v.label)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Người thực hiện</label>
        <select id="auditFilterUser" onchange="PageAudit.applyFilter()">
          <option value="">Tất cả</option>
          ${_allUsers.map(u =>
            `<option value="${e(u.id)}" ${_filterUser === u.id ? 'selected' : ''}>${e(u.displayName)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="filter-group flex-1">
        <label>Tìm kiếm (target ID)</label>
        <input type="text" id="auditSearch" class="form-input"
          placeholder="DOS-001, u001..." value="${e(_search)}" oninput="PageAudit.onSearchInput()">
      </div>
      <div class="filter-group">
        <label>Hiển thị</label>
        <select id="auditLimit" onchange="PageAudit.applyFilter()">
          <option value="50"  ${_limit === 50  ? 'selected' : ''}>50 gần nhất</option>
          <option value="100" ${_limit === 100 ? 'selected' : ''}>100 gần nhất</option>
          <option value="200" ${_limit === 200 ? 'selected' : ''}>200 gần nhất</option>
        </select>
      </div>
    </div>
  </div>

  <div class="card" id="auditContainer">
    <div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Đang tải nhật ký...</div>
  </div>
</div>`;

    document.getElementById('mainContent').innerHTML = html;
    await loadLogs();
  }

  /* ─── Tải và hiển thị logs (async) ─── */
  async function loadLogs() {
    const container = document.getElementById('auditContainer');
    if (!container) return;

    container.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;

    let logs = await DB.auditLogs.getAll(_limit);

    if (_filterAction) logs = logs.filter(l => l.action === _filterAction);
    if (_filterUser)   logs = logs.filter(l => l.userId === _filterUser);
    if (_search)       logs = logs.filter(l =>
      (l.target || '').toLowerCase().includes(_search.toLowerCase()));

    if (!logs.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><p>Không có dữ liệu log</p></div>`;
      return;
    }

    const html = `
      <table class="table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Người thực hiện</th>
            <th>Hành động</th>
            <th>Đối tượng</th>
            <th>Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => {
            const actor  = _allUsers.find(u => u.id === log.userId);
            const action = ACTION_LABELS[log.action] || { label: log.action, icon: 'fa-circle', color: '#6c757d' };
            const details = buildDetails(log);
            const ts = log.ts || log.timestamp || log.created_at || '';

            return `
              <tr>
                <td class="text-nowrap">${e(Utils.fmt.datetime(ts))}</td>
                <td>
                  ${actor
                    ? `<div class="user-cell">
                        <div class="avatar-xs" style="background:${e(actor.color || '#6c757d')}">${e(actor.avatar || '?')}</div>
                        <span>${e(actor.displayName)}</span>
                       </div>`
                    : `<span class="text-muted">${e(log.userId || 'Hệ thống')}</span>`}
                </td>
                <td>
                  <span style="color:${e(action.color)}">
                    <i class="fas ${e(action.icon)} me-1"></i>${e(action.label)}
                  </span>
                </td>
                <td>
                  ${log.target ? `<span class="mono">${e(log.target)}</span>` : '—'}
                  <span class="text-muted small">${log.targetType ? `(${e(log.targetType)})` : ''}</span>
                </td>
                <td class="small">${details}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="p-3 text-muted small">Hiển thị ${e(String(logs.length))} bản ghi gần nhất</div>`;

    container.innerHTML = html;
  }

  /* ─── Parse details JSON ─── */
  function buildDetails(log) {
    let d = log.details;
    if (!d) return '—';
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch (_) { return Security.e(d).substring(0, 80); }
    }
    if (log.action === 'STATUS_CHANGE')  return `${Security.e(d.from || '')} → ${Security.e(d.to || '')}`;
    if (log.action === 'CREATE_DOSSIER') return `${Security.e(d.projectName || '')} · ${Security.e(Utils.fmt.currency(d.amount))}`;
    if (log.action === 'USER_CREATED')   return `${Security.e(d.username || '')} (${Security.e(d.role || '')})`;
    if (log.action === 'USER_LOGIN')     return `username: ${Security.e(d.username || '')}`;
    return Security.e(JSON.stringify(d).substring(0, 80));
  }

  /* ─── Filter (async) ─── */
  async function applyFilter() {
    _filterAction = document.getElementById('auditFilterAction')?.value || '';
    _filterUser   = document.getElementById('auditFilterUser')?.value   || '';
    _search       = document.getElementById('auditSearch')?.value       || '';
    _limit        = parseInt(document.getElementById('auditLimit')?.value || '50');
    await loadLogs();
  }

  function onSearchInput() {
    clearTimeout(window._auditSearchTimer);
    window._auditSearchTimer = setTimeout(applyFilter, 350);
  }

  /* ─── Export CSV (async) ─── */
  async function exportLog() {
    // Ensure users cache is populated
    if (!_allUsers.length) _allUsers = await DB.users.getAll();
    const logs = await DB.auditLogs.getAll(1000);
    const rows = logs.map(l => {
      const actor  = _allUsers.find(u => u.id === l.userId);
      const action = ACTION_LABELS[l.action] || { label: l.action };
      let details  = l.details || {};
      if (typeof details === 'string') { try { details = JSON.parse(details); } catch(_){} }
      return {
        'Thời gian':        Utils.fmt.datetime(l.ts || l.timestamp || l.created_at || ''),
        'Người thực hiện':  actor?.displayName || l.userId || 'Hệ thống',
        'Hành động':        action.label,
        'Đối tượng':        l.target  || '',
        'Loại':             l.targetType || '',
        'Chi tiết':         JSON.stringify(details)
      };
    });
    Utils.exportCSV(rows, `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
  }

  return { render, applyFilter, onSearchInput, exportLog };
})();

window.PageAudit = PageAudit;
