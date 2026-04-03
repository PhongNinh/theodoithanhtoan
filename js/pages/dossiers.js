/* ===========================
   Dossiers List & Detail Page
   =========================== */

window.DossiersPage = {
  filters: {},
  currentPage: 1,
  perPage: 10,
  allDossiers: [],

  async render() {
    document.getElementById('pageContainer').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    this.allDossiers = await API.getDossiers();
    this._render();
  },

  _render() {
    const filtered = Utils.filterDossiers(this.allDossiers.filter(d=>!d.is_deleted), this.filters);
    const total = filtered.length;
    const start = (this.currentPage-1)*this.perPage;
    const page = filtered.slice(start, start+this.perPage);

    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fas fa-folder-open" style="color:var(--primary)"></i> Danh sách Hồ sơ</div>
          <div class="page-subtitle">Tổng cộng <strong>${total}</strong> hồ sơ</div>
        </div>
        <div class="page-actions">
          ${Auth.can('create_dossier') ? `<button class="btn btn-primary" onclick="navigate('create',null)"><i class="fas fa-plus"></i> Tạo hồ sơ mới</button>` : ''}
          ${Auth.can('export') ? `<button class="btn btn-secondary" onclick="DossiersPage.exportData()"><i class="fas fa-download"></i> Xuất Excel</button>` : ''}
        </div>
      </div>

      <!-- FILTERS -->
      <div class="filters-bar">
        <div class="filter-group">
          <i class="fas fa-search" style="color:var(--text-muted)"></i>
          <input type="text" placeholder="Tìm mã HS, tên dự án..." id="fSearch" value="${this.filters.search||''}" oninput="DossiersPage.setFilter('search',this.value)" style="min-width:220px" />
        </div>
        <div class="filter-group">
          <label>Trạng thái</label>
          <select id="fStatus" onchange="DossiersPage.setFilter('status',this.value)">
            <option value="">Tất cả</option>
            ${WORKFLOW.steps.map(s=>`<option value="${s.key}" ${this.filters.status===s.key?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Phòng ban</label>
          <select id="fDept" onchange="DossiersPage.setFilter('department',this.value)">
            <option value="">Tất cả</option>
            <option value="vien_thong" ${this.filters.department==='vien_thong'?'selected':''}>Viễn thông</option>
            <option value="kinh_doanh" ${this.filters.department==='kinh_doanh'?'selected':''}>Kinh doanh</option>
            <option value="ke_toan" ${this.filters.department==='ke_toan'?'selected':''}>Kế toán</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Ưu tiên</label>
          <select id="fPriority" onchange="DossiersPage.setFilter('priority',this.value)">
            <option value="">Tất cả</option>
            <option value="high" ${this.filters.priority==='high'?'selected':''}>🔴 Cao</option>
            <option value="medium" ${this.filters.priority==='medium'?'selected':''}>🟡 Trung bình</option>
            <option value="low" ${this.filters.priority==='low'?'selected':''}>🟢 Thấp</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Từ ngày</label>
          <input type="date" id="fFrom" value="${this.filters.date_from||''}" onchange="DossiersPage.setFilter('date_from',this.value)" />
        </div>
        <div class="filter-group">
          <label>Đến ngày</label>
          <input type="date" id="fTo" value="${this.filters.date_to||''}" onchange="DossiersPage.setFilter('date_to',this.value)" />
        </div>
        <button class="btn btn-sm btn-secondary" onclick="DossiersPage.clearFilters()"><i class="fas fa-times"></i> Xóa filter</button>
      </div>

      <!-- TABLE -->
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>MÃ HỒ SƠ</th>
                <th>TÊN DỰ ÁN / HỢP ĐỒNG</th>
                <th>PHÒNG BAN</th>
                <th>TRẠNG THÁI</th>
                <th>ƯU TIÊN</th>
                <th>GIÁ TRỊ</th>
                <th>PHÂN CÔNG</th>
                <th>DEADLINE</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              ${page.length ? page.map(d=>this._renderRow(d)).join('') : `
                <tr><td colspan="9"><div class="empty-state"><i class="fas fa-search"></i><h3>Không tìm thấy hồ sơ</h3><p>Thử thay đổi bộ lọc</p></div></td></tr>
              `}
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <div class="pagination-info">Hiển thị ${Math.min(start+1,total)}–${Math.min(start+this.perPage,total)} / ${total} hồ sơ</div>
          <div class="pagination-btns">
            <button class="page-btn" onclick="DossiersPage.goPage(${this.currentPage-1})" ${this.currentPage<=1?'disabled':''}>
              <i class="fas fa-chevron-left"></i>
            </button>
            ${this._paginationBtns(Math.ceil(total/this.perPage))}
            <button class="page-btn" onclick="DossiersPage.goPage(${this.currentPage+1})" ${this.currentPage>=Math.ceil(total/this.perPage)?'disabled':''}>
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  _renderRow(d) {
    const overdue = Utils.isOverdue(d.deadline) && !['paid','archived'].includes(d.status);
    return `
      <tr style="${overdue?'background:#fff5f5':''}" onclick="openDossierDetail('${d.id}')" style="cursor:pointer">
        <td><span class="td-code">${d.dossier_code}</span></td>
        <td>
          <div style="font-weight:600;font-size:13px;max-width:240px">${Utils.truncate(d.project_name,50)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${d.contract_number||''}</div>
        </td>
        <td><span style="font-size:12px">${Utils.deptLabel(d.department)}</span></td>
        <td>${Utils.statusBadge(d.status)}</td>
        <td>${Utils.priorityBadge(d.priority)}</td>
        <td class="td-amount">${Utils.formatAmount(d.amount)} ₫</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            ${Utils.avatarHtml(d.assigned_to_name,24,9)}
            <span style="font-size:12px">${d.assigned_to_name||'—'}</span>
          </div>
        </td>
        <td>${Utils.deadlineHtml(d.deadline,true)}</td>
        <td onclick="event.stopPropagation()">
          <div class="td-actions">
            <button class="btn btn-xs btn-outline" onclick="openDossierDetail('${d.id}')"><i class="fas fa-eye"></i></button>
            ${Auth.can('edit_dossier') ? `<button class="btn btn-xs btn-secondary" onclick="openEditDossier('${d.id}')"><i class="fas fa-edit"></i></button>` : ''}
            ${Auth.can('change_status') ? `<button class="btn btn-xs btn-primary" onclick="openStatusChange('${d.id}')"><i class="fas fa-exchange-alt"></i></button>` : ''}
            ${Auth.can('delete_dossier') ? `<button class="btn btn-xs btn-danger" onclick="confirmDeleteDossier('${d.id}')"><i class="fas fa-trash"></i></button>` : ''}
          </div>
        </td>
      </tr>`;
  },

  _paginationBtns(totalPages) {
    if (totalPages <= 1) return '';
    let btns = '';
    for (let i=1;i<=Math.min(totalPages,7);i++) {
      btns += `<button class="page-btn ${i===this.currentPage?'active':''}" onclick="DossiersPage.goPage(${i})">${i}</button>`;
    }
    return btns;
  },

  setFilter(key, val) {
    this.filters[key] = val || undefined;
    if (!val) delete this.filters[key];
    this.currentPage = 1;
    this._render();
  },

  clearFilters() {
    this.filters = {};
    this.currentPage = 1;
    this._render();
  },

  goPage(p) {
    const filtered = Utils.filterDossiers(this.allDossiers.filter(d=>!d.is_deleted), this.filters);
    const max = Math.ceil(filtered.length/this.perPage);
    if (p<1||p>max) return;
    this.currentPage = p;
    this._render();
  },

  async exportData() {
    const filtered = Utils.filterDossiers(this.allDossiers.filter(d=>!d.is_deleted), this.filters);
    Utils.exportCSV(filtered, `HoSo_${Utils.formatDate(new Date().toISOString())}.csv`);
    Toast.show('Thành công','Đã xuất file Excel/CSV thành công!','success');
  }
};

/* ---- CREATE / EDIT DOSSIER ---- */
window.CreateDossierPage = {
  editId: null,
  editData: null,

  async render(editId=null) {
    this.editId = editId;
    this.editData = editId ? await API.getDossier(editId) : null;

    const isEdit = !!this.editId;
    const d = this.editData || {};
    const users = DB.users.filter(u=>u.is_active);

    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">${isEdit ? 'Chỉnh sửa Hồ sơ' : 'Tạo Hồ sơ Thanh toán mới'}</div>
          ${isEdit ? `<div class="page-subtitle">Mã: <strong>${d.dossier_code}</strong></div>` : ''}
        </div>
        <button class="btn btn-secondary" onclick="navigate('dossiers',null)"><i class="fas fa-arrow-left"></i> Quay lại</button>
      </div>

      <div style="max-width:800px">
        <div class="card">
          <form onsubmit="CreateDossierPage.submit(event)">
            <div class="detail-section">
              <h4><i class="fas fa-info-circle" style="color:var(--primary)"></i> Thông tin cơ bản</h4>
              <div class="form-row">
                <div class="form-group">
                  <label>Tên Dự án / Hợp đồng *</label>
                  <input type="text" name="project_name" required placeholder="Nhập tên dự án..." value="${Utils.escapeHtml(d.project_name||'')}" />
                </div>
                <div class="form-group">
                  <label>Số Hợp đồng</label>
                  <input type="text" name="contract_number" placeholder="HĐ-VT-2024-XXX" value="${Utils.escapeHtml(d.contract_number||'')}" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Phòng ban phụ trách *</label>
                  <select name="department" required>
                    <option value="">-- Chọn phòng ban --</option>
                    <option value="vien_thong" ${d.department==='vien_thong'?'selected':''}>Phòng Viễn thông</option>
                    <option value="kinh_doanh" ${d.department==='kinh_doanh'?'selected':''}>Phòng Kinh doanh</option>
                    <option value="ke_toan" ${d.department==='ke_toan'?'selected':''}>Phòng Kế toán</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Mức độ ưu tiên *</label>
                  <select name="priority" required>
                    <option value="low" ${d.priority==='low'||!d.priority?'selected':''}>🟢 Thấp</option>
                    <option value="medium" ${d.priority==='medium'?'selected':''}>🟡 Trung bình</option>
                    <option value="high" ${d.priority==='high'?'selected':''}>🔴 Cao</option>
                  </select>
                </div>
              </div>
            </div>

            <hr class="divider" />
            <div class="detail-section">
              <h4><i class="fas fa-money-bill-wave" style="color:var(--success)"></i> Thông tin tài chính</h4>
              <div class="form-row">
                <div class="form-group">
                  <label>Giá trị thanh toán (VND) *</label>
                  <input type="number" name="amount" required min="0" placeholder="0" value="${d.amount||''}" />
                </div>
                <div class="form-group">
                  <label>Deadline *</label>
                  <input type="datetime-local" name="deadline" required value="${d.deadline?d.deadline.slice(0,16):''}" />
                </div>
              </div>
            </div>

            <hr class="divider" />
            <div class="detail-section">
              <h4><i class="fas fa-user-tag" style="color:var(--warning)"></i> Phân công xử lý</h4>
              <div class="form-row">
                <div class="form-group">
                  <label>Giao cho người dùng</label>
                  <select name="assigned_to_id" onchange="CreateDossierPage.updateAssignee(this)">
                    <option value="">-- Chưa phân công --</option>
                    ${users.map(u=>`<option value="${u.id}" data-name="${u.full_name}" data-dept="${u.department}" ${d.assigned_to_id===u.id?'selected':''}>${u.full_name} (${ROLE_LABELS[u.role]})</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Phòng ban nhận hồ sơ</label>
                  <select name="assigned_department">
                    <option value="">-- Chọn --</option>
                    <option value="vien_thong" ${d.assigned_department==='vien_thong'?'selected':''}>Phòng Viễn thông</option>
                    <option value="kinh_doanh" ${d.assigned_department==='kinh_doanh'?'selected':''}>Phòng Kinh doanh</option>
                    <option value="ke_toan" ${d.assigned_department==='ke_toan'?'selected':''}>Phòng Kế toán</option>
                  </select>
                </div>
              </div>
            </div>

            <hr class="divider" />
            <div class="detail-section">
              <h4><i class="fas fa-align-left" style="color:var(--info)"></i> Mô tả & Ghi chú</h4>
              <div class="form-group">
                <label>Mô tả chi tiết</label>
                <textarea name="description" rows="4" placeholder="Nhập mô tả dự án, phạm vi công việc...">${Utils.escapeHtml(d.description||'')}</textarea>
              </div>
              <div class="form-group">
                <label>Ghi chú nội bộ</label>
                <textarea name="notes" rows="3" placeholder="Ghi chú nội bộ (chỉ xem nội bộ)...">${Utils.escapeHtml(d.notes||'')}</textarea>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onclick="navigate('dossiers',null)">Hủy</button>
              <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${isEdit?'Lưu thay đổi':'Tạo Hồ sơ'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  updateAssignee(sel) {
    const opt = sel.options[sel.selectedIndex];
    const dept = opt.getAttribute('data-dept');
    const deptSel = document.querySelector('select[name="assigned_department"]');
    if (dept && deptSel) deptSel.value = dept;
  },

  async submit(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);

    const payload = {
      project_name: fd.get('project_name'),
      contract_number: fd.get('contract_number'),
      department: fd.get('department'),
      priority: fd.get('priority'),
      amount: parseFloat(fd.get('amount')) || 0,
      deadline: fd.get('deadline') ? new Date(fd.get('deadline')).toISOString() : null,
      assigned_to_id: fd.get('assigned_to_id') || null,
      assigned_to_name: (() => {
        const sel = form.querySelector('select[name="assigned_to_id"]');
        const opt = sel?.options[sel.selectedIndex];
        return opt?.getAttribute('data-name') || '';
      })(),
      assigned_department: fd.get('assigned_department'),
      description: fd.get('description'),
      notes: fd.get('notes'),
    };

    try {
      if (this.editId) {
        await API.updateDossier(this.editId, payload);
        Toast.show('Thành công','Đã cập nhật hồ sơ!','success');
      } else {
        const d = await API.createDossier(payload);
        Toast.show('Thành công',`Đã tạo hồ sơ ${d.dossier_code}!`,'success');
      }
      DossiersPage.allDossiers = await API.getDossiers();
      navigate('dossiers', null);
    } catch(err) {
      Toast.show('Lỗi', err.message, 'error');
    }
  }
};

/* ---- DOSSIER DETAIL MODAL ---- */
window.openDossierDetail = async function(id) {
  const dossier = await API.getDossier(id);
  if (!dossier) return Toast.show('Lỗi','Không tìm thấy hồ sơ','error');

  const logs = await API.getAuditLogs(id);
  const comments = await API.getComments(id);

  document.getElementById('modalDetailTitle').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <span class="td-code" style="font-size:16px">${dossier.dossier_code}</span>
      ${Utils.statusBadge(dossier.status)}
      ${Utils.priorityBadge(dossier.priority)}
    </div>`;

  const allowed = WORKFLOW.allowedTransitions(Auth.role, dossier.status);

  document.getElementById('modalDetailBody').innerHTML = `
    <div class="dossier-detail-grid">
      <div>
        <!-- Basic Info -->
        <div class="detail-section">
          <h4>Thông tin hồ sơ</h4>
          <div class="detail-fields">
            <div class="detail-field"><div class="df-label">Tên dự án</div><div class="df-value" style="grid-column:span 2;font-weight:700">${dossier.project_name}</div></div>
            <div class="detail-field"><div class="df-label">Số HĐ</div><div class="df-value mono">${dossier.contract_number||'—'}</div></div>
            <div class="detail-field"><div class="df-label">Phòng ban</div><div class="df-value">${Utils.deptLabel(dossier.department)}</div></div>
            <div class="detail-field"><div class="df-label">Người tạo</div><div class="df-value">${dossier.created_by_name}</div></div>
            <div class="detail-field"><div class="df-label">Phân công</div><div class="df-value">${dossier.assigned_to_name||'—'}</div></div>
            <div class="detail-field"><div class="df-label">Giá trị TT</div><div class="df-value amount">${Utils.formatCurrency(dossier.amount)}</div></div>
            <div class="detail-field"><div class="df-label">Deadline</div><div class="df-value">${Utils.deadlineHtml(dossier.deadline)}</div></div>
            <div class="detail-field"><div class="df-label">Ngày tạo</div><div class="df-value">${Utils.formatDate(dossier.created_at)}</div></div>
          </div>
        </div>

        <!-- Workflow Progress -->
        <div class="detail-section">
          <h4>Tiến trình xử lý</h4>
          ${Utils.workflowProgress(dossier.status)}
        </div>

        <!-- Description -->
        ${dossier.description ? `<div class="detail-section"><h4>Mô tả</h4><p style="font-size:13px;color:var(--text-secondary);line-height:1.7">${Utils.escapeHtml(dossier.description)}</p></div>` : ''}
        ${dossier.notes ? `<div class="detail-section"><h4>Ghi chú nội bộ</h4><div class="tl-detail">${Utils.escapeHtml(dossier.notes)}</div></div>` : ''}

        <!-- Status Change Buttons -->
        ${allowed.length ? `
          <div class="detail-section">
            <h4>Chuyển trạng thái</h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${allowed.map(s=>{
                const step = WORKFLOW.getStep(s);
                return `<button class="btn btn-sm btn-outline" onclick="openStatusChange('${dossier.id}');closeModal('modalDossierDetail')"><i class="fas ${step?.icon||'fa-arrow-right'}"></i> → ${step?.label||s}</button>`;
              }).join('')}
            </div>
          </div>` : ''}

        <!-- Tags -->
        ${dossier.tags?.length ? `<div class="detail-section"><h4>Tags</h4><div style="display:flex;gap:6px;flex-wrap:wrap">${dossier.tags.map(t=>`<span style="background:var(--primary-light);color:var(--primary);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600">#${t}</span>`).join('')}</div></div>` : ''}

        <!-- Comments -->
        <div class="detail-section">
          <h4><i class="fas fa-comments"></i> Bình luận (${comments.length})</h4>
          <div id="commentsList">
            ${comments.map(c=>`
              <div class="comment-box">
                <div class="comment-author">
                  ${Utils.avatarHtml(c.user_name,28,10)}
                  <span class="comment-name">${c.user_name}</span>
                  ${c.is_internal?'<span class="badge badge-medium" style="font-size:9px">Nội bộ</span>':''}
                  <span class="comment-time">${Utils.timeAgo(c.created_at)}</span>
                </div>
                <div class="comment-text">${Utils.escapeHtml(c.content)}</div>
              </div>`).join('')}
          </div>
          <div class="comment-input-row mt-16">
            <textarea id="commentInput" placeholder="Viết bình luận..." rows="2"></textarea>
            <button class="btn btn-primary" onclick="submitComment('${dossier.id}')"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>

      <!-- SIDEBAR: History + QR -->
      <div>
        <!-- QR Code -->
        <div class="card" style="margin-bottom:16px;padding:16px">
          <div class="card-title" style="margin-bottom:12px"><i class="fas fa-qrcode"></i> QR Hồ sơ</div>
          <div class="qr-container">
            <div id="qrcode"></div>
            <div class="qr-label">${dossier.dossier_code}</div>
          </div>
        </div>

        <!-- History -->
        <div class="card" style="padding:16px">
          <div class="card-title" style="margin-bottom:12px"><i class="fas fa-history"></i> Lịch sử (${logs.length})</div>
          <div class="timeline">
            ${logs.map(log=>`
              <div class="timeline-item">
                <div class="timeline-icon ti-${log.action}"><i class="fas ${log.action==='create'?'fa-plus':log.action==='status_change'?'fa-exchange-alt':log.action==='comment'?'fa-comment':'fa-edit'}"></i></div>
                <div class="timeline-content">
                  <div class="tl-header">
                    <span class="tl-user">${log.user_name}</span>
                    <span class="tl-time">${Utils.timeAgo(log.timestamp)}</span>
                  </div>
                  ${log.old_value && log.new_value && log.action==='status_change'?`
                    <div class="tl-change">
                      <span class="tl-old">${STATUS_LABELS[log.old_value]||log.old_value}</span>
                      <span class="tl-arrow">→</span>
                      <span class="tl-new">${STATUS_LABELS[log.new_value]||log.new_value}</span>
                    </div>` : ''}
                  ${log.comment?`<div class="tl-detail" style="margin-top:6px">${Utils.escapeHtml(log.comment)}</div>`:''}
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Generate QR
  setTimeout(() => {
    const el = document.getElementById('qrcode');
    if (el && typeof QRCode !== 'undefined') {
      el.innerHTML = '';
      new QRCode(el, {
        text: Utils.generateQRData(dossier),
        width: 120, height: 120,
        colorDark: '#0f172a', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  }, 100);

  openModal('modalDossierDetail');
};

/* ---- STATUS CHANGE MODAL ---- */
window.openStatusChange = function(id) {
  const dossier = DB.dossiers.find(d=>d.id===id);
  if (!dossier) return;

  const allowed = WORKFLOW.allowedTransitions(Auth.role, dossier.status);

  document.getElementById('modalStatusBody').innerHTML = `
    <div class="detail-section">
      <h4>Hồ sơ: <span style="color:var(--primary)">${dossier.dossier_code}</span></h4>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">${Utils.truncate(dossier.project_name,60)}</p>
      <div style="margin-bottom:16px">
        <div class="df-label">Trạng thái hiện tại</div>
        <div style="margin-top:6px">${Utils.statusBadge(dossier.status)}</div>
      </div>
    </div>
    ${allowed.length ? `
      <div class="form-group">
        <label>Chuyển sang trạng thái *</label>
        <select id="newStatusSel">
          <option value="">-- Chọn trạng thái --</option>
          ${allowed.map(s=>`<option value="${s}">${WORKFLOW.getStep(s)?.label||s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Ghi chú / Lý do</label>
        <textarea id="statusComment" rows="3" placeholder="Nhập ghi chú cho thay đổi này..."></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('modalStatusChange')">Hủy</button>
        <button class="btn btn-primary" onclick="submitStatusChange('${id}')"><i class="fas fa-check"></i> Xác nhận chuyển</button>
      </div>` : `
      <div style="text-align:center;padding:20px;color:var(--text-muted)">
        <i class="fas fa-lock" style="font-size:32px;margin-bottom:12px;opacity:.3"></i>
        <p>Bạn không có quyền chuyển trạng thái hồ sơ này.</p>
      </div>`}
  `;
  openModal('modalStatusChange');
};

window.submitStatusChange = async function(id) {
  const newStatus = document.getElementById('newStatusSel').value;
  const comment = document.getElementById('statusComment').value;
  if (!newStatus) return Toast.show('Cảnh báo','Vui lòng chọn trạng thái!','warning');
  try {
    await API.changeStatus(id, newStatus, comment);
    closeModal('modalStatusChange');
    Toast.show('Thành công',`Hồ sơ đã chuyển sang: ${STATUS_LABELS[newStatus]}`,'success');
    DossiersPage.allDossiers = await API.getDossiers();
    if (document.querySelector('[data-page="dossiers"].active')) DossiersPage._render();
    if (document.querySelector('[data-page="kanban"].active')) KanbanPage.render();
    updateNotifBadge();
  } catch(err) {
    Toast.show('Lỗi', err.message, 'error');
  }
};

window.submitComment = async function(dossierId) {
  const input = document.getElementById('commentInput');
  const content = input?.value?.trim();
  if (!content) return Toast.show('Cảnh báo','Nhập nội dung bình luận!','warning');
  await API.addComment(dossierId, content);
  input.value = '';
  Toast.show('Thành công','Đã gửi bình luận!','success');

  // Reload comments in modal
  const comments = await API.getComments(dossierId);
  document.getElementById('commentsList').innerHTML = comments.map(c=>`
    <div class="comment-box">
      <div class="comment-author">
        ${Utils.avatarHtml(c.user_name,28,10)}
        <span class="comment-name">${c.user_name}</span>
        <span class="comment-time">${Utils.timeAgo(c.created_at)}</span>
      </div>
      <div class="comment-text">${Utils.escapeHtml(c.content)}</div>
    </div>`).join('');
};

window.openEditDossier = function(id) {
  navigate('create', null);
  setTimeout(() => CreateDossierPage.render(id), 50);
};

window.confirmDeleteDossier = function(id) {
  const d = DB.dossiers.find(x=>x.id===id);
  document.getElementById('confirmTitle').textContent = 'Xóa hồ sơ?';
  document.getElementById('confirmMessage').textContent = `Bạn chắc chắn muốn xóa hồ sơ "${d?.dossier_code}"? Hành động này không thể hoàn tác.`;
  document.getElementById('confirmOkBtn').onclick = async () => {
    await API.deleteDossier(id);
    closeModal('modalConfirm');
    Toast.show('Đã xóa','Hồ sơ đã được xóa','success');
    DossiersPage.allDossiers = await API.getDossiers();
    DossiersPage._render();
  };
  openModal('modalConfirm');
};
