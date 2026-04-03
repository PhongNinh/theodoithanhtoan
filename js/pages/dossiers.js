/**
 * dossiers.js - Quản lý hồ sơ (list, create, detail, edit)
 */

const PageDossiers = (() => {
  'use strict';

  const e = Security.e;
  let _filters = { status: '', department: '', priority: '', search: '', dateFrom: '', dateTo: '' };
  let _page    = 1;
  const LIMIT  = 10;
  let _sort    = 'createdAt_desc';

  /* ─── List view ─── */
  function render(params = {}) {
    if (params.filters) _filters = { ..._filters, ...params.filters };
    _page = params.page || 1;

    const html = `
<div class="dossiers-page">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-folder-open me-2"></i>Danh sách Hồ sơ</h1>
    <div class="header-actions">
      ${Auth.hasPermission('dossier.create') || Auth.isAdmin() ? `
      <button class="btn btn-primary" onclick="App.navigate('dossier_new')">
        <i class="fas fa-plus me-1"></i>Tạo hồ sơ
      </button>` : ''}
      <button class="btn btn-outline" onclick="PageDossiers.exportList()">
        <i class="fas fa-download me-1"></i>Xuất CSV
      </button>
    </div>
  </div>

  <!-- Filters -->
  <div class="filter-bar card mb-3">
    <div class="filter-row">
      <div class="filter-group">
        <label>Trạng thái</label>
        <select id="filterStatus" onchange="PageDossiers.applyFilter()">
          <option value="">Tất cả</option>
          ${DB.WORKFLOW_STEPS.map(s => `<option value="${e(s.id)}" ${_filters.status === s.id ? 'selected' : ''}>${e(s.label)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Phòng ban</label>
        <select id="filterDept" onchange="PageDossiers.applyFilter()">
          <option value="">Tất cả</option>
          <option value="telecom"   ${_filters.department === 'telecom'   ? 'selected' : ''}>Viễn thông</option>
          <option value="business"  ${_filters.department === 'business'  ? 'selected' : ''}>Kinh doanh</option>
          <option value="accounting"${_filters.department === 'accounting'? 'selected' : ''}>Kế toán</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Ưu tiên</label>
        <select id="filterPriority" onchange="PageDossiers.applyFilter()">
          <option value="">Tất cả</option>
          <option value="urgent" ${_filters.priority === 'urgent' ? 'selected' : ''}>🔴 Khẩn cấp</option>
          <option value="high"   ${_filters.priority === 'high'   ? 'selected' : ''}>🟠 Cao</option>
          <option value="medium" ${_filters.priority === 'medium' ? 'selected' : ''}>🟡 Trung bình</option>
          <option value="low"    ${_filters.priority === 'low'    ? 'selected' : ''}>🟢 Thấp</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Từ ngày</label>
        <input type="date" id="filterDateFrom" value="${e(_filters.dateFrom)}" onchange="PageDossiers.applyFilter()">
      </div>
      <div class="filter-group">
        <label>Đến ngày</label>
        <input type="date" id="filterDateTo" value="${e(_filters.dateTo)}" onchange="PageDossiers.applyFilter()">
      </div>
      <div class="filter-group flex-1">
        <label>Tìm kiếm</label>
        <input type="text" id="filterSearch" placeholder="Mã HS, tên dự án..." value="${e(_filters.search)}" oninput="PageDossiers.onSearchInput()">
      </div>
      <button class="btn btn-sm btn-secondary" onclick="PageDossiers.clearFilters()">
        <i class="fas fa-times me-1"></i>Xóa lọc
      </button>
    </div>
  </div>

  <!-- Sort bar -->
  <div class="sort-bar d-flex align-center gap-2 mb-2">
    <span class="text-muted small">Sắp xếp:</span>
    ${[
      ['createdAt_desc', 'Mới nhất'], ['createdAt_asc', 'Cũ nhất'],
      ['amount_desc', 'Giá trị ↓'],  ['deadline_asc', 'Deadline']
    ].map(([val, lbl]) => `
      <button class="sort-btn ${_sort === val ? 'active' : ''}" onclick="PageDossiers.setSort('${e(val)}')">${e(lbl)}</button>
    `).join('')}
  </div>

  <!-- Table -->
  <div class="card">
    <div id="dossierTableContainer">
      <div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>
    </div>
  </div>
</div>

<!-- Detail Modal -->
${buildDetailModal()}
<!-- Form Modal -->
${buildFormModal()}
<!-- Transition Modal -->
${buildTransitionModal()}
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
    loadTable();
  }

  function loadTable() {
    const result = API.dossiers.list(_filters, _sort, _page, LIMIT);
    const container = document.getElementById('dossierTableContainer');
    if (!container) return;

    if (!result.success) {
      container.innerHTML = `<div class="error-state"><p>${e(result.error)}</p></div>`;
      return;
    }

    const { data, total, page, totalPages } = result;

    if (!data.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>Không có hồ sơ nào</p></div>`;
      return;
    }

    const tableHTML = `
      <div class="table-meta p-3 text-muted small">Hiển thị ${e(String(Math.min(data.length, LIMIT)))} / ${e(String(total))} hồ sơ</div>
      <table class="table">
        <thead>
          <tr>
            <th>Mã HS</th>
            <th>Tên dự án / Hợp đồng</th>
            <th>Phòng ban</th>
            <th>Trạng thái</th>
            <th>Ưu tiên</th>
            <th>Giá trị</th>
            <th>Deadline</th>
            <th>Người xử lý</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(d => renderRow(d)).join('')}
        </tbody>
      </table>
      ${Utils.buildPagination(total, page, LIMIT, (p) => { _page = p; loadTable(); })}`;

    container.innerHTML = tableHTML;
  }

  function renderRow(d) {
    const sb  = Utils.statusBadge(d.status);
    const pb  = Utils.priorityBadge(d.priority);
    const dl  = Utils.deadlineStatus(d.deadline);
    const canEdit = Auth.canEditDossier(d) || Auth.isAdmin();
    const deptMap = { telecom: 'Viễn thông', business: 'Kinh doanh', accounting: 'Kế toán' };

    return `
      <tr class="table-row ${dl.status === 'overdue' ? 'row-overdue' : ''}" onclick="PageDossiers.openDetail('${e(d.id)}')">
        <td><span class="mono">${e(d.id)}</span></td>
        <td>
          <div class="project-name">${e(d.projectName)}</div>
          ${d.contractNo ? `<div class="contract-no text-muted small">${e(d.contractNo)}</div>` : ''}
        </td>
        <td>${e(deptMap[d.department] || d.department)}</td>
        <td><span class="badge ${e(sb.class)}">${e(sb.label)}</span></td>
        <td><span class="badge ${e(pb.class)}">${e(pb.label)}</span></td>
        <td class="text-right">${e(Utils.fmt.currency(d.amount))}</td>
        <td><span class="${e(dl.class)}">${e(dl.label)}</span></td>
        <td>
          ${d.assigneeId ? `
          <div class="assignee-cell">
            <div class="avatar-sm" style="background:${e(d.assigneeColor || '#6c757d')}">${e(d.assigneeAvatar || '?')}</div>
            <span>${e(d.assigneeName || 'N/A')}</span>
          </div>` : '<span class="text-muted">Chưa giao</span>'}
        </td>
        <td onclick="event.stopPropagation()">
          <div class="action-btns">
            <button class="btn btn-xs btn-info" onclick="PageDossiers.openDetail('${e(d.id)}')" title="Xem chi tiết">
              <i class="fas fa-eye"></i>
            </button>
            ${canEdit ? `
            <button class="btn btn-xs btn-warning" onclick="PageDossiers.openEdit('${e(d.id)}')" title="Chỉnh sửa">
              <i class="fas fa-edit"></i>
            </button>` : ''}
            ${Auth.isAdmin() ? `
            <button class="btn btn-xs btn-danger" onclick="PageDossiers.deleteDossier('${e(d.id)}')" title="Xóa">
              <i class="fas fa-trash"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>`;
  }

  /* ─── Detail Modal ─── */
  function openDetail(id) {
    const result = API.dossiers.getById(id);
    if (!result.success) { Utils.showToast(result.error, 'error'); return; }
    const d = result.data;

    const sb  = Utils.statusBadge(d.status);
    const pb  = Utils.priorityBadge(d.priority);
    const dl  = Utils.deadlineStatus(d.deadline);
    const user = Auth.getCurrentUser();
    const deptMap = { telecom: 'Phòng Viễn thông', business: 'Phòng Kinh doanh', accounting: 'Phòng Kế toán' };

    // Workflow progress
    const steps   = DB.WORKFLOW_STEPS;
    const curIdx  = steps.findIndex(s => s.id === d.status);
    const wfHTML  = steps.map((step, i) => `
      <div class="wf-step ${i < curIdx ? 'done' : i === curIdx ? 'current' : 'pending'}">
        <div class="wf-dot"><i class="fas ${e(step.icon)}"></i></div>
        <div class="wf-step-label">${e(step.label)}</div>
      </div>`).join('<div class="wf-line"></div>');

    // Available transitions
    const nextSteps = DB.workflow.getNextSteps(d.status);
    const canTransBtn = nextSteps.filter(s => Auth.canTransitionDossier(d, s));

    // History
    const histHTML = d.history.slice().reverse().map(h => {
      const actor = DB.users.getById(h.actorId);
      const step  = steps.find(s => s.id === h.status);
      return `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:${e(step?.color || '#6c757d')}"></div>
          <div class="timeline-content">
            <div class="timeline-action">${e(step?.label || h.status)}</div>
            <div class="timeline-meta">
              ${actor ? `<span>${e(actor.displayName)}</span> · ` : ''}
              <span>${e(Utils.fmt.datetime(h.timestamp))}</span>
            </div>
            ${h.note ? `<div class="timeline-note">${e(h.note)}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    // Comments
    const commentsHTML = d.comments.map(c => `
      <div class="comment-item">
        <div class="comment-avatar" style="background:${e(c.actor?.color || '#6c757d')}">${e(c.actor?.avatar || '?')}</div>
        <div class="comment-body">
          <div class="comment-meta">
            <strong>${e(c.actor?.displayName || 'N/A')}</strong>
            <span class="text-muted small">${e(Utils.fmt.timeAgo(c.createdAt))}</span>
          </div>
          <div class="comment-text">${e(c.text)}</div>
        </div>
      </div>`).join('') || '<p class="text-muted">Chưa có bình luận</p>';

    const modal = document.getElementById('detailModal');
    const body  = document.getElementById('detailModalBody');
    if (!modal || !body) return;

    body.innerHTML = `
      <!-- QR + ID -->
      <div class="detail-header">
        <div>
          <h2 class="detail-id">${e(d.id)}</h2>
          <h3 class="detail-name">${e(d.projectName)}</h3>
          ${d.contractNo ? `<p class="text-muted">${e(d.contractNo)}</p>` : ''}
        </div>
        <div id="qrCode_${e(d.id)}" class="qr-container"></div>
      </div>

      <!-- Badges -->
      <div class="detail-badges mb-3">
        <span class="badge ${e(sb.class)} badge-lg">${e(sb.label)}</span>
        <span class="badge ${e(pb.class)} badge-lg">${e(pb.label)}</span>
        <span class="badge badge-dept">${e(deptMap[d.department] || d.department)}</span>
        <span class="${e(dl.class)}">${e(dl.label)}</span>
      </div>

      <!-- Workflow bar -->
      <div class="workflow-bar mb-4">${wfHTML}</div>

      <!-- Transition buttons -->
      ${canTransBtn.length ? `
      <div class="transition-bar mb-3">
        <span class="text-muted me-2 small">Chuyển sang:</span>
        ${canTransBtn.map(s => {
          const step = steps.find(x => x.id === s);
          return `<button class="btn btn-sm btn-outline" style="border-color:${e(step?.color)};color:${e(step?.color)}"
            onclick="PageDossiers.openTransition('${e(d.id)}','${e(s)}','${e(step?.label || s)}')">
            <i class="fas ${e(step?.icon || 'fa-arrow-right')} me-1"></i>${e(step?.label || s)}
          </button>`;
        }).join('')}
      </div>` : ''}

      <!-- Detail grid -->
      <div class="detail-grid">
        <div class="detail-item">
          <label>Người tạo</label>
          <value>${e(d.creatorName)}</value>
        </div>
        <div class="detail-item">
          <label>Người xử lý</label>
          <value>${e(d.assigneeName)}</value>
        </div>
        <div class="detail-item">
          <label>Giá trị hợp đồng</label>
          <value class="amount">${e(Utils.fmt.currency(d.amount))}</value>
        </div>
        <div class="detail-item">
          <label>Deadline</label>
          <value>${e(Utils.fmt.date(d.deadline))} <span class="${e(dl.class)}">(${e(dl.label)})</span></value>
        </div>
        <div class="detail-item">
          <label>Ngày tạo</label>
          <value>${e(Utils.fmt.datetime(d.createdAt))}</value>
        </div>
        <div class="detail-item">
          <label>Cập nhật</label>
          <value>${e(Utils.fmt.datetime(d.updatedAt))}</value>
        </div>
        ${d.description ? `<div class="detail-item full-width"><label>Mô tả</label><value>${e(d.description)}</value></div>` : ''}
        ${d.notes ? `<div class="detail-item full-width"><label>Ghi chú nội bộ</label><value>${e(d.notes)}</value></div>` : ''}
        ${d.tags?.length ? `<div class="detail-item full-width"><label>Nhãn</label><value>${d.tags.map(t => `<span class="tag">${e(t)}</span>`).join('')}</value></div>` : ''}
      </div>

      <!-- Tabs: History | Comments -->
      <div class="detail-tabs mt-4">
        <div class="tab-header">
          <button class="tab-btn active" data-tab="history">
            <i class="fas fa-history me-1"></i>Lịch sử (${e(String(d.history.length))})
          </button>
          <button class="tab-btn" data-tab="comments">
            <i class="fas fa-comments me-1"></i>Bình luận (${e(String(d.comments.length))})
          </button>
        </div>
        <div class="tab-body">
          <div id="tabHistory" class="tab-panel active">
            <div class="timeline">${histHTML || '<p class="text-muted">Chưa có lịch sử</p>'}</div>
          </div>
          <div id="tabComments" class="tab-panel hidden">
            <div class="comments-list">${commentsHTML}</div>
            <div class="comment-form mt-3">
              <textarea id="newComment" placeholder="Nhập bình luận..." rows="3" class="form-input w-full"></textarea>
              <button class="btn btn-primary mt-2" onclick="PageDossiers.addComment('${e(d.id)}')">
                <i class="fas fa-paper-plane me-1"></i>Gửi
              </button>
            </div>
          </div>
        </div>
      </div>`;

    Utils.Modal.show('detailModal');

    // Generate QR
    setTimeout(() => Utils.generateQR(`qrCode_${d.id}`, `PAYTRACK:${d.id}:${d.projectName}`, 100), 100);

    // Tab switching
    body.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        body.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        body.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(`tab${btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)}`)?.classList.remove('hidden');
      });
    });
  }

  function addComment(dossierId) {
    const textarea = document.getElementById('newComment');
    const text = textarea?.value?.trim();
    if (!text) { Utils.showToast('Vui lòng nhập nội dung bình luận', 'warning'); return; }

    const result = API.comments.add(dossierId, text);
    if (result.success) {
      Utils.showToast('Đã thêm bình luận', 'success');
      openDetail(dossierId); // refresh
    } else {
      Utils.showToast(result.error, 'error');
    }
  }

  /* ─── Transition Modal ─── */
  function openTransition(dossierId, newStatus, statusLabel) {
    const modal = document.getElementById('transitionModal');
    if (!modal) return;

    document.getElementById('transitionDossierId').value  = dossierId;
    document.getElementById('transitionNewStatus').value  = newStatus;
    document.getElementById('transitionStatusLabel').textContent = statusLabel;
    document.getElementById('transitionNote').value = '';

    Utils.Modal.show('transitionModal');
  }

  function submitTransition() {
    const dossierId  = document.getElementById('transitionDossierId')?.value;
    const newStatus  = document.getElementById('transitionNewStatus')?.value;
    const note       = document.getElementById('transitionNote')?.value;
    const btn        = document.getElementById('transitionSubmitBtn');

    if (!dossierId || !newStatus) return;

    Utils.dom.setLoading(btn, true, 'Đang xử lý...');
    const result = API.dossiers.transition(dossierId, newStatus, note);
    Utils.dom.setLoading(btn, false);

    if (result.success) {
      Utils.showToast('Đã chuyển trạng thái thành công!', 'success');
      Utils.Modal.hide('transitionModal');
      Utils.Modal.hide('detailModal');
      loadTable();
      App.loadNotificationBadge();
    } else {
      Utils.showToast(result.error, 'error');
    }
  }

  /* ─── Create / Edit Form ─── */
  function renderNew() {
    if (!Auth.hasPermission('dossier.create') && !Auth.isAdmin()) {
      Utils.showToast('Bạn không có quyền tạo hồ sơ', 'error');
      App.navigate('dossiers');
      return;
    }
    render();
    setTimeout(() => openForm(null), 150);
  }

  function openForm(id) {
    const dossier = id ? DB.dossiers.getById(id) : null;
    const users   = DB.users.getAll();
    const modal   = document.getElementById('dossierFormModal');
    if (!modal) return;

    const title = document.getElementById('formModalTitle');
    if (title) title.textContent = dossier ? `Chỉnh sửa: ${dossier.id}` : 'Tạo Hồ sơ mới';

    const form = document.getElementById('dossierForm');
    if (!form) return;

    form.innerHTML = `
      <input type="hidden" id="formDossierId" value="${e(dossier?.id || '')}">
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="required">Tên dự án / Hợp đồng</label>
          <input type="text" id="fProjectName" class="form-input" value="${e(dossier?.projectName || '')}" maxlength="200" required placeholder="Nhập tên dự án...">
        </div>
        <div class="form-group">
          <label>Số hợp đồng</label>
          <input type="text" id="fContractNo" class="form-input" value="${e(dossier?.contractNo || '')}" maxlength="50" placeholder="HĐ-2024-XXX">
        </div>
        <div class="form-group">
          <label class="required">Phòng ban</label>
          <select id="fDepartment" class="form-input">
            ${Utils.dom.buildOptions([
              {value:'telecom',label:'Phòng Viễn thông'},
              {value:'business',label:'Phòng Kinh doanh'},
              {value:'accounting',label:'Phòng Kế toán'}
            ], dossier?.department, '-- Chọn phòng ban --')}
          </select>
        </div>
        <div class="form-group">
          <label class="required">Ưu tiên</label>
          <select id="fPriority" class="form-input">
            ${Utils.dom.buildOptions([
              {value:'urgent',label:'🔴 Khẩn cấp'},
              {value:'high',  label:'🟠 Cao'},
              {value:'medium',label:'🟡 Trung bình'},
              {value:'low',   label:'🟢 Thấp'}
            ], dossier?.priority || 'medium', null)}
          </select>
        </div>
        <div class="form-group">
          <label class="required">Giá trị (VNĐ)</label>
          <input type="number" id="fAmount" class="form-input" value="${e(String(dossier?.amount || ''))}" min="0" max="1000000000000" placeholder="0">
        </div>
        <div class="form-group">
          <label>Deadline</label>
          <input type="date" id="fDeadline" class="form-input" value="${e(dossier?.deadline || '')}">
        </div>
        <div class="form-group">
          <label>Người xử lý</label>
          <select id="fAssignee" class="form-input">
            ${Utils.dom.buildOptions(
              users.filter(u => u.active).map(u => ({ value: u.id, label: `${u.displayName} (${Auth.getRoleLabel(u.role)})` })),
              dossier?.assigneeId, '-- Chưa giao --'
            )}
          </select>
        </div>
        <div class="form-group full-width">
          <label>Mô tả</label>
          <textarea id="fDescription" class="form-input" rows="3" maxlength="2000" placeholder="Mô tả chi tiết...">${e(dossier?.description || '')}</textarea>
        </div>
        <div class="form-group full-width">
          <label>Ghi chú nội bộ</label>
          <textarea id="fNotes" class="form-input" rows="2" maxlength="1000" placeholder="Ghi chú...">${e(dossier?.notes || '')}</textarea>
        </div>
        <div class="form-group full-width">
          <label>Nhãn (tags, cách nhau bởi dấu phẩy)</label>
          <input type="text" id="fTags" class="form-input" value="${e((dossier?.tags || []).join(', '))}" placeholder="mạng, VNPT, hạ tầng">
        </div>
      </div>`;

    Utils.Modal.show('dossierFormModal');
  }

  function openEdit(id) {
    const dossier = DB.dossiers.getById(id);
    if (!dossier) { Utils.showToast('Không tìm thấy hồ sơ', 'error'); return; }
    if (!Auth.canEditDossier(dossier) && !Auth.isAdmin()) {
      Utils.showToast('Bạn không có quyền chỉnh sửa hồ sơ này', 'error');
      return;
    }
    openForm(id);
  }

  function submitForm() {
    const id = document.getElementById('formDossierId')?.value;

    const data = {
      projectName:  document.getElementById('fProjectName')?.value || '',
      contractNo:   document.getElementById('fContractNo')?.value  || '',
      department:   document.getElementById('fDepartment')?.value  || '',
      priority:     document.getElementById('fPriority')?.value    || 'medium',
      amount:       parseFloat(document.getElementById('fAmount')?.value || '0'),
      deadline:     document.getElementById('fDeadline')?.value    || '',
      assigneeId:   document.getElementById('fAssignee')?.value    || '',
      description:  document.getElementById('fDescription')?.value || '',
      notes:        document.getElementById('fNotes')?.value       || '',
      tags:         (document.getElementById('fTags')?.value || '').split(',').map(t => t.trim()).filter(Boolean)
    };

    const btn = document.getElementById('formSubmitBtn');
    Utils.dom.setLoading(btn, true);

    let result;
    if (id) {
      result = API.dossiers.update(id, data);
    } else {
      result = API.dossiers.create(data);
    }

    Utils.dom.setLoading(btn, false);

    if (result.success) {
      Utils.showToast(id ? 'Đã cập nhật hồ sơ!' : 'Đã tạo hồ sơ mới!', 'success');
      Utils.Modal.hide('dossierFormModal');
      loadTable();
      App.loadNotificationBadge();
    } else {
      Utils.showToast(result.error, 'error');
    }
  }

  function deleteDossier(id) {
    Utils.Modal.confirm(
      `Bạn có chắc muốn xóa hồ sơ ${id}? Hành động này không thể hoàn tác.`,
      () => {
        const result = API.dossiers.delete(id);
        if (result.success) {
          Utils.showToast('Đã xóa hồ sơ', 'success');
          loadTable();
        } else {
          Utils.showToast(result.error, 'error');
        }
      }
    );
  }

  /* ─── Filter / Sort ─── */
  function applyFilter() {
    _filters.status     = document.getElementById('filterStatus')?.value  || '';
    _filters.department = document.getElementById('filterDept')?.value    || '';
    _filters.priority   = document.getElementById('filterPriority')?.value|| '';
    _filters.dateFrom   = document.getElementById('filterDateFrom')?.value || '';
    _filters.dateTo     = document.getElementById('filterDateTo')?.value   || '';
    _filters.search     = document.getElementById('filterSearch')?.value   || '';
    _page = 1;
    loadTable();
  }

  function onSearchInput() {
    clearTimeout(window._dossierSearchTimer);
    window._dossierSearchTimer = setTimeout(applyFilter, 350);
  }

  function clearFilters() {
    _filters = { status: '', department: '', priority: '', search: '', dateFrom: '', dateTo: '' };
    render();
  }

  function setSort(sort) {
    _sort = sort;
    _page = 1;
    render();
  }

  function exportList() {
    const result = API.dossiers.list(_filters, _sort, 1, 9999);
    if (!result.success) { Utils.showToast('Không thể xuất dữ liệu', 'error'); return; }
    const deptMap = { telecom: 'Viễn thông', business: 'Kinh doanh', accounting: 'Kế toán' };
    const rows = result.data.map(d => ({
      'Mã HS': d.id, 'Tên dự án': d.projectName,
      'Số HĐ': d.contractNo || '', 'Phòng ban': deptMap[d.department] || d.department,
      'Trạng thái': Utils.statusBadge(d.status).label,
      'Ưu tiên': Utils.priorityBadge(d.priority).label,
      'Giá trị': d.amount, 'Deadline': d.deadline || '',
      'Người tạo': d.creatorName, 'Người xử lý': d.assigneeName,
      'Ngày tạo': Utils.fmt.datetime(d.createdAt)
    }));
    Utils.exportCSV(rows, `ho-so-${new Date().toISOString().split('T')[0]}.csv`);
  }

  /* ─── Modal HTML builders ─── */
  function buildDetailModal() {
    return `
      <div id="detailModal" class="modal">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-file-alt me-2"></i>Chi tiết Hồ sơ</h3>
            <button class="modal-close" data-close-modal="detailModal">×</button>
          </div>
          <div class="modal-body" id="detailModalBody">
            <div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-close-modal="detailModal">Đóng</button>
          </div>
        </div>
      </div>`;
  }

  function buildFormModal() {
    return `
      <div id="dossierFormModal" class="modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 id="formModalTitle">Tạo Hồ sơ mới</h3>
            <button class="modal-close" data-close-modal="dossierFormModal">×</button>
          </div>
          <div class="modal-body">
            <div id="dossierForm"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-close-modal="dossierFormModal">Hủy</button>
            <button id="formSubmitBtn" class="btn btn-primary" onclick="PageDossiers.submitForm()">
              <i class="fas fa-save me-1"></i>Lưu
            </button>
          </div>
        </div>
      </div>`;
  }

  function buildTransitionModal() {
    return `
      <div id="transitionModal" class="modal">
        <div class="modal-dialog modal-sm">
          <div class="modal-header">
            <h3><i class="fas fa-exchange-alt me-2"></i>Chuyển trạng thái</h3>
            <button class="modal-close" data-close-modal="transitionModal">×</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="transitionDossierId">
            <input type="hidden" id="transitionNewStatus">
            <p>Chuyển sang: <strong id="transitionStatusLabel"></strong></p>
            <div class="form-group">
              <label>Ghi chú (tùy chọn)</label>
              <textarea id="transitionNote" class="form-input" rows="3" placeholder="Lý do, ghi chú..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-close-modal="transitionModal">Hủy</button>
            <button id="transitionSubmitBtn" class="btn btn-primary" onclick="PageDossiers.submitTransition()">
              <i class="fas fa-check me-1"></i>Xác nhận
            </button>
          </div>
        </div>
      </div>`;
  }

  /* ─── Public ─── */
  return {
    render, renderNew,
    openDetail, openEdit, openForm,
    submitForm, submitTransition, openTransition,
    addComment, deleteDossier,
    applyFilter, onSearchInput, clearFilters, setSort,
    exportList, loadTable
  };
})();

window.PageDossiers = PageDossiers;
