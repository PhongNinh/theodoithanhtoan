/* ===========================
   Audit Log Page
   =========================== */

window.AuditPage = {
  async render() {
    document.getElementById('pageContainer').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const logs = await API.getAuditLogs();
    this._render(logs);
  },

  _render(logs) {
    const actionIcons = {
      create: { icon:'fa-plus', cls:'ti-create', label:'Tạo mới' },
      status_change: { icon:'fa-exchange-alt', cls:'ti-status_change', label:'Đổi trạng thái' },
      comment: { icon:'fa-comment', cls:'ti-comment', label:'Bình luận' },
      edit: { icon:'fa-edit', cls:'ti-edit', label:'Chỉnh sửa' },
      delete: { icon:'fa-trash', cls:'ti-status_change', label:'Xóa' },
      assign: { icon:'fa-user-tag', cls:'ti-assign', label:'Phân công' },
    };

    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fas fa-history" style="color:var(--primary)"></i> Audit Log</div>
          <div class="page-subtitle">Lịch sử toàn bộ hoạt động — <strong>${logs.length}</strong> bản ghi (bất biến)</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="AuditPage.render()"><i class="fas fa-sync-alt"></i> Làm mới</button>
          ${Auth.can('export') ? `<button class="btn btn-secondary" onclick="AuditPage.exportLogs()"><i class="fas fa-download"></i> Xuất Log</button>` : ''}
        </div>
      </div>

      <!-- FILTERS -->
      <div class="filters-bar">
        <div class="filter-group">
          <label>Thao tác</label>
          <select id="auditFilter" onchange="AuditPage.filter()">
            <option value="">Tất cả</option>
            <option value="create">Tạo mới</option>
            <option value="status_change">Đổi trạng thái</option>
            <option value="comment">Bình luận</option>
            <option value="edit">Chỉnh sửa</option>
            <option value="delete">Xóa</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Người dùng</label>
          <select id="auditUserFilter" onchange="AuditPage.filter()">
            <option value="">Tất cả</option>
            ${DB.users.map(u=>`<option value="${u.id}">${u.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Hồ sơ (mã)</label>
          <input type="text" id="auditDossierFilter" placeholder="HS-2024-..." oninput="AuditPage.filter()" style="min-width:160px" />
        </div>
      </div>

      <div class="card">
        <div id="auditTimeline">
          ${this._renderTimeline(logs, actionIcons)}
        </div>
      </div>
    `;
    this._allLogs = logs;
    this._actionIcons = actionIcons;
  },

  filter() {
    const action = document.getElementById('auditFilter')?.value;
    const userId = document.getElementById('auditUserFilter')?.value;
    const code = document.getElementById('auditDossierFilter')?.value?.toLowerCase();

    let filtered = this._allLogs;
    if (action) filtered = filtered.filter(l=>l.action===action);
    if (userId) filtered = filtered.filter(l=>l.user_id===userId);
    if (code) filtered = filtered.filter(l=>l.dossier_code?.toLowerCase().includes(code));

    document.getElementById('auditTimeline').innerHTML = this._renderTimeline(filtered, this._actionIcons);
  },

  _renderTimeline(logs, actionIcons) {
    if (!logs.length) return `<div class="empty-state"><i class="fas fa-search"></i><h3>Không có kết quả</h3></div>`;

    return `<div class="timeline">
      ${logs.map(log => {
        const ai = actionIcons[log.action] || { icon:'fa-circle', cls:'ti-edit', label:log.action };
        return `
          <div class="timeline-item">
            <div class="timeline-icon ${ai.cls}"><i class="fas ${ai.icon}"></i></div>
            <div class="timeline-content">
              <div class="tl-header">
                ${Utils.avatarHtml(log.user_name,28,10)}
                <span class="tl-user">${log.user_name}</span>
                <span class="tl-action">${ai.label}</span>
                ${log.dossier_code ? `<a href="#" onclick="openDossierDetail('${log.dossier_id}');return false" class="td-code" style="font-size:12px">${log.dossier_code}</a>` : ''}
                <span style="margin-left:auto;display:flex;align-items:center;gap:6px">
                  ${Utils.roleBadge(log.user_role)}
                  <span class="tl-time" title="${Utils.formatDateTime(log.timestamp)}">${Utils.timeAgo(log.timestamp)}</span>
                </span>
              </div>
              ${log.old_value !== null && log.new_value && log.action==='status_change' ? `
                <div class="tl-change mt-16" style="margin-top:8px">
                  <span class="tl-old">${STATUS_LABELS[log.old_value]||log.old_value||'—'}</span>
                  <span class="tl-arrow"><i class="fas fa-long-arrow-alt-right"></i></span>
                  <span class="tl-new">${STATUS_LABELS[log.new_value]||log.new_value}</span>
                </div>` : ''}
              ${log.comment ? `<div class="tl-detail" style="margin-top:8px">${Utils.escapeHtml(log.comment)}</div>` : ''}
              <div style="font-size:10px;color:var(--text-muted);margin-top:6px">
                <i class="fas fa-clock"></i> ${Utils.formatDateTime(log.timestamp)}
                <span style="margin-left:8px"><i class="fas fa-network-wired"></i> ${log.ip_address||'—'}</span>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
  },

  exportLogs() {
    const headers = ['Thời gian','Người dùng','Vai trò','Thao tác','Hồ sơ','Trước','Sau','Ghi chú'];
    const rows = (this._allLogs||[]).map(l=>[
      Utils.formatDateTime(l.timestamp),
      `"${l.user_name}"`,
      ROLE_LABELS[l.user_role]||l.user_role,
      l.action,
      l.dossier_code||'',
      STATUS_LABELS[l.old_value]||l.old_value||'',
      STATUS_LABELS[l.new_value]||l.new_value||'',
      `"${(l.comment||'').replace(/"/g,"'")}"`
    ]);
    const csv = [headers.join(','),...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`AuditLog_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    Toast.show('Thành công','Đã xuất Audit Log!','success');
  }
};
