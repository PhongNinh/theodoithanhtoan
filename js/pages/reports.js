/**
 * reports.js - Báo cáo & Analytics (async/await, Table API)
 * PayTrack Pro v3.0
 */

const PageReports = (() => {
  'use strict';
  const e = Security.e;
  let _charts   = {};
  let _allUsers = [];

  function destroyCharts() {
    Object.values(_charts).forEach(c => { try { c.destroy(); } catch (err) {} });
    _charts = {};
  }

  /* ─── Render chính (async) ─── */
  async function render() {
    if (!Auth.hasPermission('report.view') && !Auth.isAdmin()) {
      document.getElementById('mainContent').innerHTML =
        `<div class="empty-state"><i class="fas fa-lock"></i><p>Bạn không có quyền xem báo cáo</p></div>`;
      return;
    }

    document.getElementById('mainContent').innerHTML =
      `<div class="page-loader"><i class="fas fa-spinner fa-spin"></i> Đang tải báo cáo...</div>`;

    // Tải song song
    const [dossiers, allUsers, byStatus, byDept, overdue, totalAmt] = await Promise.all([
      DB.dossiers.getAll(),
      DB.users.getAll(),
      DB.stats.byStatus(),
      DB.stats.byDepartment(),
      DB.stats.overdue(),
      DB.stats.totalAmount()
    ]);
    _allUsers = allUsers;

    const steps       = DB.WORKFLOW_STEPS;
    const monthlyData = buildMonthlyData(dossiers);

    const html = `
<div class="reports-page">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-chart-bar me-2"></i>Báo cáo & Phân tích</h1>
    <div class="header-actions">
      <button class="btn btn-success" onclick="PageReports.exportExcel()">
        <i class="fas fa-file-excel me-1"></i>Xuất CSV
      </button>
    </div>
  </div>

  <!-- Summary KPIs -->
  <div class="kpi-grid mb-4">
    <div class="kpi-card kpi-blue">
      <div class="kpi-icon"><i class="fas fa-folder-open"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${e(String(dossiers.length))}</div>
        <div class="kpi-label">Tổng hồ sơ</div>
      </div>
    </div>
    <div class="kpi-card kpi-green">
      <div class="kpi-icon"><i class="fas fa-money-bill-wave"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${formatBillion(totalAmt)}</div>
        <div class="kpi-label">Tổng giá trị</div>
      </div>
    </div>
    <div class="kpi-card kpi-orange">
      <div class="kpi-icon"><i class="fas fa-exclamation-circle"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${e(String(overdue.length))}</div>
        <div class="kpi-label">Quá hạn</div>
      </div>
    </div>
    <div class="kpi-card kpi-purple">
      <div class="kpi-icon"><i class="fas fa-percentage"></i></div>
      <div class="kpi-body">
        <div class="kpi-value">${e(String(
          dossiers.length > 0
            ? Math.round(((byStatus.paid || 0) + (byStatus.archived || 0)) / dossiers.length * 100)
            : 0
        ))}%</div>
        <div class="kpi-label">Hoàn thành</div>
      </div>
    </div>
  </div>

  <!-- Charts row 1 -->
  <div class="charts-row mb-4">
    <div class="chart-card">
      <h3 class="chart-title"><i class="fas fa-chart-pie me-2"></i>Phân bổ theo trạng thái</h3>
      <div style="height:280px"><canvas id="rptStatus"></canvas></div>
    </div>
    <div class="chart-card">
      <h3 class="chart-title"><i class="fas fa-chart-bar me-2"></i>Giá trị theo phòng ban</h3>
      <div style="height:280px"><canvas id="rptDept"></canvas></div>
    </div>
  </div>

  <!-- Charts row 2 -->
  <div class="charts-row mb-4">
    <div class="chart-card flex-2">
      <h3 class="chart-title"><i class="fas fa-chart-line me-2"></i>Xu hướng tạo hồ sơ (6 tháng)</h3>
      <div style="height:240px"><canvas id="rptTrend"></canvas></div>
    </div>
    <div class="chart-card">
      <h3 class="chart-title"><i class="fas fa-chart-pie me-2"></i>Theo độ ưu tiên</h3>
      <div style="height:240px"><canvas id="rptPriority"></canvas></div>
    </div>
  </div>

  <!-- Overdue table -->
  ${overdue.length ? `
  <div class="card mb-4">
    <div class="card-header">
      <h3><i class="fas fa-exclamation-triangle text-danger me-2"></i>Hồ sơ Quá hạn (${e(String(overdue.length))})</h3>
    </div>
    <div class="card-body p-0">
      <table class="table">
        <thead>
          <tr><th>Mã HS</th><th>Tên dự án</th><th>Trạng thái</th><th>Giá trị</th><th>Deadline</th><th>Quá hạn</th></tr>
        </thead>
        <tbody>
          ${overdue.map(d => {
            const sb      = Utils.statusBadge(d.status);
            const dayLate = Math.floor((Date.now() - new Date(d.deadline).getTime()) / 86400000);
            const did     = e(d.dossierId || d.id || '');
            return `
              <tr class="row-overdue"
                onclick="App.navigate('dossiers');setTimeout(()=>PageDossiers.openDetail('${did}'),100)"
                style="cursor:pointer">
                <td><span class="mono">${e(d.dossierId || d.id || '')}</span></td>
                <td>${e(d.projectName || '')}</td>
                <td><span class="badge ${e(sb.class)}">${e(sb.label)}</span></td>
                <td>${e(Utils.fmt.currency(d.amount))}</td>
                <td>${e(Utils.fmt.date(d.deadline))}</td>
                <td class="text-danger fw-bold">${e(String(dayLate))} ngày</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- Amount by status -->
  <div class="card">
    <div class="card-header"><h3><i class="fas fa-table me-2"></i>Thống kê chi tiết theo trạng thái</h3></div>
    <div class="card-body p-0">
      <table class="table">
        <thead>
          <tr><th>Trạng thái</th><th>Số hồ sơ</th><th>Tổng giá trị</th><th>TB/hồ sơ</th><th>Tỷ lệ</th></tr>
        </thead>
        <tbody>
          ${steps.map(step => {
            const cnt = byStatus[step.id] || 0;
            const amt = dossiers.filter(d => d.status === step.id).reduce((s, d) => s + (Number(d.amount) || 0), 0);
            const avg = cnt > 0 ? amt / cnt : 0;
            const pct = dossiers.length > 0 ? Math.round(cnt / dossiers.length * 100) : 0;
            return `
              <tr>
                <td><span style="color:${e(step.color)}"><i class="fas ${e(step.icon)} me-1"></i>${e(step.label)}</span></td>
                <td>${e(String(cnt))}</td>
                <td>${e(Utils.fmt.currency(amt))}</td>
                <td>${e(Utils.fmt.currency(avg))}</td>
                <td>
                  <div class="progress-inline">
                    <div class="progress-bar-mini" style="width:${e(String(pct))}%;background:${e(step.color)}"></div>
                    <span>${e(String(pct))}%</span>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</div>`;

    document.getElementById('mainContent').innerHTML = html;
    destroyCharts();

    setTimeout(() => {
      renderStatusChart(byStatus, steps);
      renderDeptChart(dossiers);
      renderTrendChart(monthlyData);
      renderPriorityChart(dossiers);
    }, 100);
  }

  /* ─── Helpers ─── */
  function buildMonthlyData(dossiers) {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        label: d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(), month: d.getMonth(),
        count: 0, amount: 0
      });
    }
    dossiers.forEach(d => {
      const date = new Date(d.created_at || d.createdAt || 0);
      const m = months.find(mo => mo.year === date.getFullYear() && mo.month === date.getMonth());
      if (m) { m.count++; m.amount += Number(d.amount) || 0; }
    });
    return months;
  }

  function renderStatusChart(byStatus, steps) {
    const ctx = document.getElementById('rptStatus');
    if (!ctx || !window.Chart) return;
    _charts.status = new Chart(ctx, {
      type: 'pie',
      data: {
        labels:   steps.map(s => s.label),
        datasets: [{ data: steps.map(s => byStatus[s.id] || 0), backgroundColor: steps.map(s => s.color), borderWidth: 2, borderColor: '#fff' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  function renderDeptChart(dossiers) {
    const ctx = document.getElementById('rptDept');
    if (!ctx || !window.Chart) return;
    const depts   = ['telecom', 'business', 'accounting'];
    const labels  = ['Viễn thông', 'Kinh doanh', 'Kế toán'];
    const colors  = ['#007bff', '#fd7e14', '#28a745'];
    const amounts = depts.map(d =>
      dossiers.filter(x => x.department === d).reduce((s, x) => s + (Number(x.amount) || 0), 0) / 1e6);

    _charts.dept = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Tổng giá trị (Triệu đ)', data: amounts, backgroundColor: colors, borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  function renderTrendChart(monthlyData) {
    const ctx = document.getElementById('rptTrend');
    if (!ctx || !window.Chart) return;
    _charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels:   monthlyData.map(m => m.label),
        datasets: [{ label: 'Số hồ sơ', data: monthlyData.map(m => m.count),
          borderColor: '#007bff', backgroundColor: 'rgba(0,123,255,0.1)', tension: 0.4, fill: true }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }

  function renderPriorityChart(dossiers) {
    const ctx = document.getElementById('rptPriority');
    if (!ctx || !window.Chart) return;
    const priorities = ['urgent', 'high', 'medium', 'low'];
    const labels     = ['Khẩn cấp', 'Cao', 'Trung bình', 'Thấp'];
    const colors     = ['#dc3545', '#fd7e14', '#ffc107', '#28a745'];
    const counts     = priorities.map(p => dossiers.filter(d => d.priority === p).length);
    _charts.priority = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: counts, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  function formatBillion(amount) {
    if (!amount) return '0 đ';
    if (amount >= 1e9) return (amount / 1e9).toFixed(2) + ' Tỷ';
    if (amount >= 1e6) return (amount / 1e6).toFixed(1) + ' Tr';
    return Utils.fmt.currency(amount);
  }

  /* ─── Export (async) ─── */
  async function exportExcel() {
    const dossiers = await DB.dossiers.getAll();
    const users    = _allUsers.length ? _allUsers : await DB.users.getAll();
    const deptMap  = { telecom: 'Viễn thông', business: 'Kinh doanh', accounting: 'Kế toán' };

    const rows = dossiers.map(d => {
      const creator  = users.find(u => u.id === d.creatorId);
      const assignee = users.find(u => u.id === d.assigneeId);
      return {
        'Mã HS':         d.dossierId || d.id || '',
        'Tên dự án':     d.projectName || '',
        'Số HĐ':         d.contractNo || '',
        'Phòng ban':     deptMap[d.department] || d.department || '',
        'Trạng thái':    Utils.statusBadge(d.status).label,
        'Ưu tiên':       d.priority || '',
        'Giá trị (VNĐ)': d.amount || 0,
        'Deadline':      d.deadline || '',
        'Người tạo':     creator?.displayName  || '',
        'Người xử lý':   assignee?.displayName || '',
        'Ngày tạo':      Utils.fmt.datetime(d.created_at || d.createdAt),
        'Cập nhật':      Utils.fmt.datetime(d.updated_at || d.updatedAt),
        'Mô tả':         d.description || '',
        'Ghi chú':       d.notes || ''
      };
    });
    Utils.exportCSV(rows, `bao-cao-ho-so-${new Date().toISOString().split('T')[0]}.csv`);
  }

  return { render, exportExcel };
})();

window.PageReports = PageReports;
