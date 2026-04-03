/**
 * dashboard.js - Trang tổng quan
 */

const PageDashboard = (() => {
  'use strict';

  let _charts = {};

  function destroyCharts() {
    Object.values(_charts).forEach(c => { try { c.destroy(); } catch(e){} });
    _charts = {};
  }

  function render() {
    const user   = Auth.getCurrentUser();
    const e      = Security.e;
    const statsR = API.stats.dashboard();
    if (!statsR.success) { Utils.showToast('Lỗi tải dữ liệu dashboard', 'error'); return; }

    const stats  = statsR.data;
    const overdue = DB.stats.overdue();
    const dossiers = DB.dossiers.getAll();

    // Recent (5 mới nhất)
    const recent = [...dossiers].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

    const html = `
<div class="dashboard-page">
  <!-- Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Xin chào, ${e(user.displayName)} 👋</h1>
      <p class="page-subtitle">${e(Auth.getRoleLabel(user.role))} · ${Utils.fmt.datetime(Date.now())}</p>
    </div>
    ${Auth.hasPermission('dossier.create') || Auth.isAdmin() ? `
    <button class="btn btn-primary" onclick="App.navigate('dossier_new')">
      <i class="fas fa-plus me-2"></i>Tạo Hồ sơ mới
    </button>` : ''}
  </div>

  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card kpi-blue">
      <div class="kpi-icon"><i class="fas fa-folder-open"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${e(String(stats.total))}</div>
        <div class="kpi-label">Tổng hồ sơ</div>
      </div>
    </div>
    <div class="kpi-card kpi-orange">
      <div class="kpi-icon"><i class="fas fa-clock"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${e(String(stats.overdue))}</div>
        <div class="kpi-label">Quá hạn</div>
      </div>
    </div>
    <div class="kpi-card kpi-green">
      <div class="kpi-icon"><i class="fas fa-check-circle"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${e(String(stats.completionRate))}%</div>
        <div class="kpi-label">Tỷ lệ hoàn thành</div>
      </div>
    </div>
    <div class="kpi-card kpi-purple">
      <div class="kpi-icon"><i class="fas fa-money-bill-wave"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${formatShortAmount(stats.totalAmount)}</div>
        <div class="kpi-label">Tổng giá trị</div>
      </div>
    </div>
  </div>

  <!-- Charts row -->
  <div class="charts-row">
    <div class="chart-card">
      <h3 class="chart-title"><i class="fas fa-chart-pie me-2"></i>Hồ sơ theo trạng thái</h3>
      <div style="height:260px"><canvas id="chartStatus"></canvas></div>
    </div>
    <div class="chart-card">
      <h3 class="chart-title"><i class="fas fa-chart-bar me-2"></i>Hồ sơ theo phòng ban</h3>
      <div style="height:260px"><canvas id="chartDept"></canvas></div>
    </div>
  </div>

  <!-- Workflow Progress -->
  <div class="card mb-4">
    <div class="card-header"><h3><i class="fas fa-stream me-2"></i>Tiến trình Workflow</h3></div>
    <div class="card-body">
      <div class="workflow-overview">
        ${DB.WORKFLOW_STEPS.map(step => {
          const count = stats.byStatus[step.id] || 0;
          const pct   = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
          return `
            <div class="workflow-step-stat">
              <div class="wf-icon" style="background:${e(step.color)}20;color:${e(step.color)}">
                <i class="fas ${e(step.icon)}"></i>
              </div>
              <div class="wf-info">
                <div class="wf-label">${e(step.label)}</div>
                <div class="wf-count">${e(String(count))} hồ sơ</div>
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" style="width:${e(String(pct))}%;background:${e(step.color)}"></div>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>
  </div>

  <!-- Overdue alert -->
  ${overdue.length ? `
  <div class="alert alert-danger mb-4">
    <i class="fas fa-exclamation-triangle me-2"></i>
    <strong>${e(String(overdue.length))} hồ sơ quá hạn!</strong>
    <button class="btn btn-sm btn-danger ms-3" onclick="App.navigate('dossiers')">Xem ngay</button>
  </div>` : ''}

  <!-- Recent dossiers -->
  <div class="card">
    <div class="card-header d-flex justify-between align-center">
      <h3><i class="fas fa-history me-2"></i>Hồ sơ gần đây</h3>
      <button class="btn btn-sm btn-outline" onclick="App.navigate('dossiers')">Xem tất cả →</button>
    </div>
    <div class="card-body p-0">
      <table class="table">
        <thead>
          <tr>
            <th>Mã HS</th><th>Tên dự án</th><th>Trạng thái</th>
            <th>Ưu tiên</th><th>Giá trị</th><th>Cập nhật</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map(d => {
            const sb = Utils.statusBadge(d.status);
            const pb = Utils.priorityBadge(d.priority);
            return `
              <tr class="table-row clickable" onclick="App.navigate('dossiers');setTimeout(()=>PageDossiers.openDetail('${e(d.id)}'),100)">
                <td><span class="mono">${e(d.id)}</span></td>
                <td>${e(d.projectName)}</td>
                <td><span class="badge ${e(sb.class)}">${e(sb.label)}</span></td>
                <td><span class="badge ${e(pb.class)}">${e(pb.label)}</span></td>
                <td>${e(Utils.fmt.currency(d.amount))}</td>
                <td>${e(Utils.fmt.timeAgo(d.updatedAt))}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</div>`;

    document.getElementById('mainContent').innerHTML = html;

    // Render charts sau khi DOM ready
    destroyCharts();
    renderStatusChart(stats.byStatus);
    renderDeptChart(stats.byDept);
  }

  function renderStatusChart(byStatus) {
    const ctx = document.getElementById('chartStatus');
    if (!ctx || !window.Chart) return;

    const steps  = DB.WORKFLOW_STEPS;
    const labels = steps.map(s => s.label);
    const data   = steps.map(s => byStatus[s.id] || 0);
    const colors = steps.map(s => s.color);

    _charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { font: { size: 12 }, padding: 12 } } }
      }
    });
  }

  function renderDeptChart(byDept) {
    const ctx = document.getElementById('chartDept');
    if (!ctx || !window.Chart) return;

    const labels = ['Viễn thông', 'Kinh doanh', 'Kế toán'];
    const data   = [byDept.telecom || 0, byDept.business || 0, byDept.accounting || 0];
    const colors = ['#007bff', '#fd7e14', '#28a745'];

    _charts.dept = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Số hồ sơ', data, backgroundColor: colors, borderRadius: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  function formatShortAmount(amount) {
    if (!amount) return '0 đ';
    if (amount >= 1e9)  return (amount / 1e9).toFixed(1) + ' Tỷ';
    if (amount >= 1e6)  return (amount / 1e6).toFixed(1) + ' Tr';
    return Utils.fmt.currency(amount);
  }

  return { render };
})();

window.PageDashboard = PageDashboard;
