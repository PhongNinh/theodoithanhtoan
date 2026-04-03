/* ===========================
   PayTrack Pro - Utilities
   =========================== */

window.Utils = {
  /* ---- FORMATTING ---- */
  formatCurrency(amount) {
    if (!amount && amount !== 0) return '—';
    return new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(amount);
  },

  formatAmount(amount) {
    if (!amount) return '0';
    if (amount >= 1e9) return (amount/1e9).toFixed(1) + ' tỷ';
    if (amount >= 1e6) return (amount/1e6).toFixed(0) + ' triệu';
    return amount.toLocaleString('vi-VN');
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  },

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff/86400)} ngày trước`;
    return this.formatDate(dateStr);
  },

  isOverdue(deadlineStr) {
    if (!deadlineStr) return false;
    return new Date(deadlineStr) < new Date();
  },

  daysUntilDeadline(deadlineStr) {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr) - new Date();
    return Math.ceil(diff / 86400000);
  },

  /* ---- STATUS & BADGE ---- */
  statusBadge(status) {
    const label = STATUS_LABELS[status] || status;
    return `<span class="badge badge-${status}">${label}</span>`;
  },

  priorityBadge(priority) {
    const label = PRIORITY_LABELS[priority] || priority;
    const icons = { high:'🔴', medium:'🟡', low:'🟢' };
    return `<span class="badge badge-${priority}">${icons[priority]||''} ${label}</span>`;
  },

  roleBadge(role) {
    const label = ROLE_LABELS[role] || role;
    const cls = { admin:'badge-admin', telecom_staff:'badge-telecom', business_staff:'badge-biz', accounting_staff:'badge-acc' };
    return `<span class="badge ${cls[role]||''}">${label}</span>`;
  },

  deptLabel(dept) { return DEPT_LABELS[dept] || dept; },

  /* ---- PROGRESS BAR ---- */
  workflowProgress(status) {
    const steps = WORKFLOW.steps;
    const currentIdx = WORKFLOW.getStepIndex(status);
    return `
      <div class="progress-track">
        ${steps.map((s,i) => `<div class="progress-step ${i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending'}" title="${s.label}"></div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:4px;">
        <span>${steps[0].label}</span>
        <span style="color:var(--primary);font-weight:700">${steps[currentIdx]?.label||''}</span>
        <span>${steps[steps.length-1].label}</span>
      </div>`;
  },

  /* ---- AVATAR ---- */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  },

  avatarHtml(name, size=32, fontSize=12) {
    const initials = this.getInitials(name);
    return `<div style="width:${size}px;height:${size}px;border-radius:${Math.floor(size*0.3)}px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;flex-shrink:0;">${initials}</div>`;
  },

  /* ---- DEADLINE DISPLAY ---- */
  deadlineHtml(deadlineStr, compact=false) {
    const days = this.daysUntilDeadline(deadlineStr);
    if (days === null) return '—';
    const dateStr = this.formatDate(deadlineStr);
    if (days < 0) return `<span style="color:var(--danger);font-weight:700">${compact?'':'📍 '}Quá hạn ${Math.abs(days)} ngày</span>`;
    if (days === 0) return `<span style="color:var(--warning);font-weight:700">${compact?'':'⚠️ '}Hôm nay!</span>`;
    if (days <= 3) return `<span style="color:var(--warning);font-weight:700">${compact?'':'⚠️ '}${dateStr} (còn ${days} ngày)</span>`;
    return `<span>${compact?'':'📅 '}${dateStr}${!compact?' (còn '+days+' ngày)':''}</span>`;
  },

  /* ---- SEARCH / FILTER ---- */
  filterDossiers(dossiers, filters) {
    return dossiers.filter(d => {
      if (d.is_deleted) return false;
      if (filters.status && d.status !== filters.status) return false;
      if (filters.department && d.department !== filters.department) return false;
      if (filters.priority && d.priority !== filters.priority) return false;
      if (filters.assigned_to && d.assigned_to_id !== filters.assigned_to) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!d.dossier_code.toLowerCase().includes(q) &&
            !d.project_name.toLowerCase().includes(q) &&
            !(d.contract_number||'').toLowerCase().includes(q)) return false;
      }
      if (filters.date_from) {
        if (new Date(d.created_at) < new Date(filters.date_from)) return false;
      }
      if (filters.date_to) {
        if (new Date(d.created_at) > new Date(filters.date_to + 'T23:59:59')) return false;
      }
      return true;
    });
  },

  /* ---- QR CODE ---- */
  generateQRData(dossier) {
    return JSON.stringify({
      id: dossier.dossier_code,
      project: dossier.project_name,
      status: dossier.status,
      amount: dossier.amount,
      url: window.location.origin + '?dossier=' + dossier.id
    });
  },

  /* ---- EXPORT CSV ---- */
  exportCSV(dossiers, filename='dossiers.csv') {
    const headers = ['Mã HS','Tên dự án','Phòng ban','Trạng thái','Ưu tiên','Giá trị (VND)','Người tạo','Phân công','Deadline','Ngày tạo'];
    const rows = dossiers.map(d => [
      d.dossier_code,
      `"${d.project_name}"`,
      DEPT_LABELS[d.department] || d.department,
      STATUS_LABELS[d.status] || d.status,
      PRIORITY_LABELS[d.priority] || d.priority,
      d.amount || 0,
      d.created_by_name,
      d.assigned_to_name,
      this.formatDate(d.deadline),
      this.formatDate(d.created_at)
    ]);
    const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },

  /* ---- MISC ---- */
  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  debounce(fn, delay=300) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(()=>fn.apply(this,args), delay);
    };
  },

  truncate(str, len=60) {
    if (!str) return '';
    return str.length > len ? str.slice(0,len)+'...' : str;
  }
};
