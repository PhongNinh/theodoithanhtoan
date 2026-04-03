/**
 * kanban.js - Kanban Board (async/await, Table API)
 * PayTrack Pro v3.0
 */

const PageKanban = (() => {
  'use strict';
  const e = Security.e;

  let _allUsers = [];

  /* ─── Render chính (async) ─── */
  async function render() {
    document.getElementById('mainContent').innerHTML =
      `<div class="page-loader"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;

    const steps = DB.WORKFLOW_STEPS;
    const user  = Auth.getCurrentUser();

    // Tải song song
    const [dossiers, allUsers] = await Promise.all([
      DB.dossiers.getAll(),
      DB.users.getAll()
    ]);
    _allUsers = allUsers;

    // Filter theo role
    let filtered = dossiers;
    if (user.role === 'business') {
      filtered = dossiers.filter(d => d.creatorId === user.id || d.department === 'business');
    }

    const html = `
<div class="kanban-page">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-columns me-2"></i>Kanban Board</h1>
    <div class="header-actions">
      <div class="kanban-filter">
        <select id="kanbanDept" onchange="PageKanban.applyFilter()" class="form-input form-input-sm">
          <option value="">Tất cả phòng ban</option>
          <option value="telecom">Viễn thông</option>
          <option value="business">Kinh doanh</option>
          <option value="accounting">Kế toán</option>
        </select>
      </div>
    </div>
  </div>
  <div class="kanban-board" id="kanbanBoard">
    ${steps.map(step => {
      const cards = filtered.filter(d => d.status === step.id);
      return `
        <div class="kanban-col" data-status="${e(step.id)}">
          <div class="kanban-col-header" style="border-top:3px solid ${e(step.color)}">
            <span class="kanban-col-title">
              <i class="fas ${e(step.icon)} me-1" style="color:${e(step.color)}"></i>${e(step.label)}
            </span>
            <span class="kanban-badge" style="background:${e(step.color)}20;color:${e(step.color)}">${e(String(cards.length))}</span>
          </div>
          <div class="kanban-cards" id="kanbanCol_${e(step.id)}">
            ${cards.length
              ? cards.map(d => buildCard(d)).join('')
              : `<div class="kanban-empty">Không có hồ sơ</div>`}
          </div>
        </div>`;
    }).join('')}
  </div>
</div>`;

    document.getElementById('mainContent').innerHTML = html;
  }

  function buildCard(d) {
    const pb  = Utils.priorityBadge(d.priority);
    const dl  = Utils.deadlineStatus(d.deadline);
    const creator  = _allUsers.find(u => u.id === d.creatorId);
    const assignee = _allUsers.find(u => u.id === d.assigneeId);
    const deptColors = { telecom: '#007bff', business: '#fd7e14', accounting: '#28a745' };
    const did = d.dossierId || d.id || '';

    return `
      <div class="kanban-card ${dl.status === 'overdue' ? 'card-overdue' : ''}"
        onclick="PageKanban.openCard('${e(did)}')">
        <div class="card-top">
          <span class="card-id">${e(did)}</span>
          <span class="badge ${e(pb.class)} badge-xs">${e(pb.label)}</span>
        </div>
        <div class="card-name">${e(d.projectName || '')}</div>
        ${d.deadline
          ? `<div class="card-deadline ${e(dl.class)}"><i class="fas fa-clock me-1"></i>${e(dl.label)}</div>`
          : ''}
        <div class="card-amount">${e(Utils.fmt.currency(d.amount))}</div>
        <div class="card-footer">
          <div class="card-dept-dot" style="background:${e(deptColors[d.department] || '#6c757d')}"
            title="${e(d.department || '')}"></div>
          <div class="card-avatars">
            ${creator
              ? `<div class="avatar-xs" style="background:${e(creator.color || '#6c757d')}"
                  title="${e(creator.displayName)}">${e(creator.avatar || '?')}</div>`
              : ''}
            ${assignee && assignee.id !== d.creatorId
              ? `<div class="avatar-xs" style="background:${e(assignee.color || '#6c757d')}"
                  title="${e(assignee.displayName)}">${e(assignee.avatar || '?')}</div>`
              : ''}
          </div>
        </div>
      </div>`;
  }

  function openCard(id) {
    App.navigate('dossiers');
    setTimeout(() => PageDossiers.openDetail(id), 150);
  }

  /* ─── Filter (async) ─── */
  async function applyFilter() {
    const dept = document.getElementById('kanbanDept')?.value || '';
    const user = Auth.getCurrentUser();

    let all = await DB.dossiers.getAll();
    if (dept) all = all.filter(d => d.department === dept);
    if (user.role === 'business') {
      all = all.filter(d => d.creatorId === user.id || d.department === 'business');
    }

    DB.WORKFLOW_STEPS.forEach(step => {
      const col = document.getElementById(`kanbanCol_${step.id}`);
      if (!col) return;
      const cards = all.filter(d => d.status === step.id);
      col.innerHTML = cards.length
        ? cards.map(d => buildCard(d)).join('')
        : `<div class="kanban-empty">Không có hồ sơ</div>`;

      const badge = col.closest('.kanban-col')?.querySelector('.kanban-badge');
      if (badge) badge.textContent = cards.length;
    });
  }

  return { render, openCard, applyFilter };
})();

window.PageKanban = PageKanban;
