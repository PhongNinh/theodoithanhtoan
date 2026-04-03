/* ===========================
   Dashboard Page
   =========================== */

window.DashboardPage = {
  charts: {},

  async render() {
    const container = document.getElementById('pageContainer');
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const stats = await API.getDashboardStats();
    this._render(stats);
  },

  _render(stats) {
    const user = Auth.user;
    const greeting = this._getGreeting();
    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">${greeting}, <span>${user.full_name.split(' ').pop()}</span>! 👋</div>
          <div class="page-subtitle">${ROLE_LABELS[user.role]} • ${DEPT_LABELS[user.department]} • ${Utils.formatDate(new Date().toISOString())}</div>
        </div>
        <div class="page-actions">
          ${Auth.can('create_dossier') ? `<button class="btn btn-primary" onclick="navigate('create',null)"><i class="fas fa-plus"></i> Tạo Hồ sơ mới</button>` : ''}
          <button class="btn btn-secondary" onclick="DashboardPage.render()"><i class="fas fa-sync-alt"></i> Làm mới</button>
        </div>
      </div>

      <!-- STATS -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon"><i class="fas fa-folder-open"></i></div>
          <div class="stat-info">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Tổng Hồ sơ</div>
          </div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon"><i class="fas fa-clock"></i></div>
          <div class="stat-info">
            <div class="stat-value">${(stats.byStatus.submitted||0)+(stats.byStatus.verified||0)+(stats.byStatus.sent_accounting||0)}</div>
            <div class="stat-label">Đang xử lý</div>
          </div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
          <div class="stat-info">
            <div class="stat-value">${(stats.byStatus.approved||0)+(stats.byStatus.paid||0)}</div>
            <div class="stat-label">Đã phê duyệt/TT</div>
          </div>
        </div>
        <div class="stat-card danger">
          <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="stat-info">
            <div class="stat-value">${stats.overdue}</div>
            <div class="stat-label">Quá hạn</div>
          </div>
        </div>
        <div class="stat-card info">
          <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
          <div class="stat-info">
            <div class="stat-value">${Utils.formatAmount(stats.paidAmount)}</div>
            <div class="stat-label">Đã thanh toán</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon"><i class="fas fa-users"></i></div>
          <div class="stat-info">
            <div class="stat-value">${stats.users}</div>
            <div class="stat-label">Người dùng</div>
          </div>
        </div>
      </div>

      <!-- STATUS PIPELINE -->
      <div class="card mb-24">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-stream"></i> Luồng xử lý hồ sơ</div>
        </div>
        <div style="overflow-x:auto;padding:8px 0">
          <div class="workflow-steps" id="workflowStepsBar"></div>
        </div>
      </div>

      <!-- CHARTS + LISTS -->
      <div class="charts-grid">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-chart-doughnut"></i> Hồ sơ theo trạng thái</div>
          </div>
          <div class="chart-container"><canvas id="chartStatus"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-chart-bar"></i> Giá trị theo phòng ban</div>
          </div>
          <div class="chart-container"><canvas id="chartDept"></canvas></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;" class="dashboard-bottom">
        <!-- OVERDUE -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i> Hồ sơ quá hạn / sắp hạn</div>
            <button class="btn btn-sm btn-secondary" onclick="navigate('dossiers',null)">Xem tất cả</button>
          </div>
          <div id="overdueList">
            ${this._renderOverdue(stats.overdueList)}
          </div>
        </div>

        <!-- ACTIVITY FEED -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-history"></i> Hoạt động gần đây</div>
            <button class="btn btn-sm btn-secondary" onclick="navigate('audit',null)">Xem đầy đủ</button>
          </div>
          <div class="activity-feed">
            ${this._renderActivity(stats.recentActivity)}
          </div>
        </div>
      </div>

      <!-- PRIORITY BREAKDOWN -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-flag"></i> Phân bố theo Mức độ ưu tiên</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
          ${this._renderPriorityCard('high','Cao','var(--danger)',stats.byPriority.high,'fas fa-arrow-up')}
          ${this._renderPriorityCard('medium','Trung bình','var(--warning)',stats.byPriority.medium,'fas fa-minus')}
          ${this._renderPriorityCard('low','Thấp','var(--success)',stats.byPriority.low,'fas fa-arrow-down')}
        </div>
      </div>
    `;

    this._renderWorkflowBar(stats.byStatus);
    this._renderCharts(stats);
  },

  _renderWorkflowBar(byStatus) {
    const el = document.getElementById('workflowStepsBar');
    if (!el) return;
    el.innerHTML = WORKFLOW.steps.map((step,i) => {
      const count = byStatus[step.key] || 0;
      return `
        <div class="wf-step" style="flex:1;min-width:80px">
          ${i < WORKFLOW.steps.length-1 ? '' : ''}
          <div class="wf-step-circle" style="width:48px;height:48px;font-size:16px;border:2px solid ${step.color};color:${step.color};background:white;position:relative;z-index:1">
            <i class="fas ${step.icon}" style="font-size:16px"></i>
          </div>
          <div style="font-weight:800;font-size:20px;color:${step.color};margin-top:6px">${count}</div>
          <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:2px;max-width:80px">${step.label}</div>
          ${i < WORKFLOW.steps.length-1 ? `<div style="position:absolute;top:24px;left:calc(50% + 28px);right:calc(-50% + 28px);height:2px;background:${count>0?step.color:'var(--border)'};z-index:0"></div>` : ''}
        </div>`;
    }).join('');
    // Fix positioning
    el.querySelectorAll('.wf-step').forEach(el => { el.style.position = 'relative'; });
  },

  _renderOverdue(list) {
    if (!list.length) return `<div class="empty-state" style="padding:30px"><i class="fas fa-check-circle" style="color:var(--success)"></i><p>Không có hồ sơ quá hạn!</p></div>`;

    // Also include nearly due (3 days)
    const nearlyDue = DB.dossiers.filter(d =>
      !d.is_deleted && !['paid','archived'].includes(d.status) &&
      Utils.daysUntilDeadline(d.deadline) !== null &&
      Utils.daysUntilDeadline(d.deadline) >= 0 &&
      Utils.daysUntilDeadline(d.deadline) <= 5
    ).slice(0,3);

    const items = [...list, ...nearlyDue].slice(0,6);

    return items.map(d => {
      const days = Utils.daysUntilDeadline(d.deadline);
      const isOv = days !== null && days < 0;
      return `<div class="overdue-item" onclick="openDossierDetail('${d.id}')" style="cursor:pointer">
        <div class="overdue-dot ${d.priority}"></div>
        <div class="overdue-info">
          <div class="overdue-code">${d.dossier_code}</div>
          <div class="overdue-name">${Utils.truncate(d.project_name, 40)}</div>
          <div class="overdue-days">${isOv ? `Quá hạn ${Math.abs(days)} ngày` : `Còn ${days} ngày`}</div>
        </div>
        ${Utils.statusBadge(d.status)}
      </div>`;
    }).join('');
  },

  _renderActivity(logs) {
    if (!logs.length) return '<p style="color:var(--text-muted);font-size:13px">Chưa có hoạt động</p>';
    const actionMap = {
      create: 'đã tạo hồ sơ',
      status_change: 'đã cập nhật trạng thái',
      comment: 'đã bình luận',
      edit: 'đã chỉnh sửa',
      delete: 'đã xóa hồ sơ',
      assign: 'đã phân công'
    };
    return logs.map(log => `
      <div class="activity-item">
        <div class="activity-dot" style="background:${log.action==='status_change'?'var(--primary)':log.action==='create'?'var(--success)':'var(--warning)'}"></div>
        <div>
          <div class="activity-text">
            <strong>${log.user_name}</strong> ${actionMap[log.action]||log.action}
            <a href="#" onclick="openDossierDetail('${log.dossier_id}');return false" style="color:var(--primary);font-weight:700"> ${log.dossier_code}</a>
            ${log.old_value && log.new_value ? `<br><small style="color:var(--text-muted)">${STATUS_LABELS[log.old_value]||log.old_value} → <strong style="color:var(--primary)">${STATUS_LABELS[log.new_value]||log.new_value}</strong></small>` : ''}
          </div>
          <div class="activity-time">${Utils.timeAgo(log.timestamp)}</div>
        </div>
      </div>`).join('');
  },

  _renderPriorityCard(priority, label, color, count, icon) {
    return `
      <div style="background:var(--surface-2);border-radius:10px;padding:20px;text-align:center;border:1px solid var(--border)">
        <i class="fas ${icon}" style="font-size:24px;color:${color};margin-bottom:10px"></i>
        <div style="font-size:32px;font-weight:800;color:${color}">${count}</div>
        <div style="font-size:12px;color:var(--text-muted);font-weight:600">${label}</div>
      </div>`;
  },

  _renderCharts(stats) {
    // Destroy old charts
    Object.values(this.charts).forEach(c => { try { c.destroy(); } catch(e) {} });
    this.charts = {};

    const doughnut = document.getElementById('chartStatus');
    if (doughnut) {
      this.charts.status = new Chart(doughnut, {
        type: 'doughnut',
        data: {
          labels: WORKFLOW.steps.map(s=>s.label),
          datasets: [{
            data: WORKFLOW.steps.map(s=>stats.byStatus[s.key]||0),
            backgroundColor: ['#94a3b8','#3b82f6','#06b6d4','#8b5cf6','#10b981','#16a34a','#6b7280'],
            borderWidth: 2, borderColor: '#fff'
          }]
        },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ padding:12, font:{ size:11 } } } }, cutout:'60%' }
      });
    }

    const bar = document.getElementById('chartDept');
    if (bar) {
      const depts = Object.entries(stats.byDept);
      this.charts.dept = new Chart(bar, {
        type: 'bar',
        data: {
          labels: depts.map(([k])=>DEPT_LABELS[k]||k),
          datasets: [{
            label: 'Số hồ sơ',
            data: depts.map(([,v])=>v),
            backgroundColor: ['#3b82f6','#f59e0b','#10b981'],
            borderRadius: 8, borderSkipped: false
          }]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display:false } },
          scales:{ y:{ beginAtZero:true, ticks:{ stepSize:1 }, grid:{ color:'#f1f5f9' } }, x:{ grid:{ display:false } } }
        }
      });
    }
  },

  _getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }
};
