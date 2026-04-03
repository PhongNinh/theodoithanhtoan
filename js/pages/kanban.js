/* ===========================
   Kanban Board Page
   =========================== */

window.KanbanPage = {
  async render() {
    document.getElementById('pageContainer').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const dossiers = await API.getDossiers();
    this._render(dossiers.filter(d=>!d.is_deleted));
  },

  _render(dossiers) {
    const grouped = {};
    WORKFLOW.steps.forEach(s => { grouped[s.key] = []; });
    dossiers.forEach(d => {
      if (grouped[d.status]) grouped[d.status].push(d);
    });

    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fas fa-columns" style="color:var(--primary)"></i> Kanban Board</div>
          <div class="page-subtitle">Kéo thả để xem luồng xử lý hồ sơ</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="KanbanPage.render()"><i class="fas fa-sync-alt"></i> Làm mới</button>
          ${Auth.can('create_dossier') ? `<button class="btn btn-primary" onclick="navigate('create',null)"><i class="fas fa-plus"></i> Tạo hồ sơ</button>` : ''}
        </div>
      </div>

      <div class="kanban-board">
        ${WORKFLOW.steps.map(step => this._renderColumn(step, grouped[step.key]||[])).join('')}
      </div>
    `;
  },

  _renderColumn(step, cards) {
    const colors = {
      created:'#64748b', submitted:'#2563eb', verified:'#0891b2',
      sent_accounting:'#7c3aed', approved:'#059669', paid:'#16a34a', archived:'#374151'
    };
    const color = colors[step.key] || '#94a3b8';

    return `
      <div class="kanban-col">
        <div class="kanban-col-header" style="border-top:3px solid ${color}">
          <div class="kanban-col-title">
            <i class="fas ${step.icon}" style="color:${color}"></i>
            ${step.label}
          </div>
          <span class="kanban-col-count" style="background:${color}20;color:${color}">${cards.length}</span>
        </div>
        <div class="kanban-cards">
          ${cards.length ? cards.map(d=>this._renderCard(d)).join('') : `
            <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">
              <i class="fas fa-inbox" style="font-size:24px;opacity:.3;display:block;margin-bottom:8px"></i>
              Không có hồ sơ
            </div>`}
        </div>
      </div>`;
  },

  _renderCard(d) {
    const overdue = Utils.isOverdue(d.deadline) && !['paid','archived'].includes(d.status);
    const days = Utils.daysUntilDeadline(d.deadline);
    const priorityColors = { high:'#dc2626', medium:'#d97706', low:'#059669' };
    const pColor = priorityColors[d.priority] || '#94a3b8';

    return `
      <div class="kanban-card" onclick="openDossierDetail('${d.id}')" style="border-left:3px solid ${pColor}">
        <div class="kc-code">${d.dossier_code}</div>
        <div class="kc-title">${Utils.truncate(d.project_name, 55)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${Utils.deptLabel(d.department)}</div>
        <div class="kc-meta">
          <div>
            <div class="kc-amount">${Utils.formatAmount(d.amount)} ₫</div>
            <div class="kc-deadline ${overdue?'overdue':''}">
              ${days===null?'—':overdue?`⚠️ Quá hạn ${Math.abs(days)}n`:days<=3&&days>=0?`⚠️ ${days} ngày nữa`:`📅 ${Utils.formatDate(d.deadline)}`}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            ${Auth.can('change_status') ? `<button class="btn btn-xs btn-outline" onclick="event.stopPropagation();openStatusChange('${d.id}')" title="Đổi trạng thái"><i class="fas fa-exchange-alt"></i></button>` : ''}
            <div class="kc-assignee" title="${d.assigned_to_name||'Chưa phân công'}">${Utils.getInitials(d.assigned_to_name||'?')}</div>
          </div>
        </div>
      </div>`;
  }
};
