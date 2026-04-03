/* ===========================
   Reports & Analytics Page
   =========================== */

window.ReportsPage = {
  charts: {},
  filters: { date_from:'', date_to:'', department:'', status:'' },

  async render() {
    document.getElementById('pageContainer').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    this._renderLayout();
    await this.loadData();
  },

  _renderLayout() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10);
    const lastDay = today.toISOString().slice(0,10);

    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> Báo cáo & Phân tích</div>
          <div class="page-subtitle">Thống kê tổng hợp hoạt động thanh toán</div>
        </div>
        <div class="page-actions">
          ${Auth.can('export')?`<button class="btn btn-success" onclick="ReportsPage.exportAll()"><i class="fas fa-file-excel"></i> Xuất Excel đầy đủ</button>`:''}
        </div>
      </div>

      <!-- Report Filters -->
      <div class="card mb-24">
        <div class="card-title" style="margin-bottom:16px"><i class="fas fa-filter"></i> Bộ lọc báo cáo</div>
        <div class="report-filters">
          <div class="filter-group">
            <label>Từ ngày</label>
            <input type="date" id="rFrom" value="${firstDay}" onchange="ReportsPage.setFilter('date_from',this.value)" />
          </div>
          <div class="filter-group">
            <label>Đến ngày</label>
            <input type="date" id="rTo" value="${lastDay}" onchange="ReportsPage.setFilter('date_to',this.value)" />
          </div>
          <div class="filter-group">
            <label>Phòng ban</label>
            <select onchange="ReportsPage.setFilter('department',this.value)">
              <option value="">Tất cả</option>
              <option value="vien_thong">Viễn thông</option>
              <option value="kinh_doanh">Kinh doanh</option>
              <option value="ke_toan">Kế toán</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Trạng thái</label>
            <select onchange="ReportsPage.setFilter('status',this.value)">
              <option value="">Tất cả</option>
              ${WORKFLOW.steps.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" onclick="ReportsPage.loadData()"><i class="fas fa-search"></i> Cập nhật</button>
        </div>
      </div>

      <!-- KPI STATS -->
      <div class="stats-grid" id="reportStats"></div>

      <!-- CHARTS ROW 1 -->
      <div class="charts-grid mb-24">
        <div class="card"><div class="card-title mb-16"><i class="fas fa-chart-pie"></i> Phân bố theo trạng thái</div><div class="chart-container"><canvas id="rChartStatus"></canvas></div></div>
        <div class="card"><div class="card-title mb-16"><i class="fas fa-chart-bar"></i> Giá trị theo phòng ban (tỷ VND)</div><div class="chart-container"><canvas id="rChartDept"></canvas></div></div>
      </div>

      <!-- CHARTS ROW 2 -->
      <div class="charts-grid mb-24">
        <div class="card"><div class="card-title mb-16"><i class="fas fa-chart-line"></i> Xu hướng tạo hồ sơ theo tháng</div><div class="chart-container"><canvas id="rChartTrend"></canvas></div></div>
        <div class="card"><div class="card-title mb-16"><i class="fas fa-flag"></i> Phân bố ưu tiên</div><div class="chart-container"><canvas id="rChartPriority"></canvas></div></div>
      </div>

      <!-- DATA TABLE -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-table"></i> Chi tiết hồ sơ</div>
          <button class="btn btn-sm btn-secondary" onclick="ReportsPage.exportFiltered()"><i class="fas fa-download"></i> Xuất CSV</button>
        </div>
        <div class="table-wrapper">
          <table id="reportTable">
            <thead><tr>
              <th>MÃ HS</th><th>TÊN DỰ ÁN</th><th>PHÒNG BAN</th><th>TRẠNG THÁI</th><th>ƯU TIÊN</th><th>GIÁ TRỊ (VND)</th><th>DEADLINE</th><th>NGÀY TẠO</th>
            </tr></thead>
            <tbody id="reportTableBody"><tr><td colspan="8" style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
          </table>
        </div>
      </div>
    `;
  },

  async loadData() {
    const dossiers = await API.getDossiers(this.filters);
    const filtered = dossiers.filter(d=>!d.is_deleted);
    this._renderStats(filtered);
    this._renderCharts(filtered);
    this._renderTable(filtered);
    this._filteredData = filtered;
  },

  setFilter(key, val) {
    this.filters[key] = val;
  },

  _renderStats(data) {
    const total = data.length;
    const totalAmt = data.reduce((s,d)=>s+(d.amount||0),0);
    const paidAmt = data.filter(d=>d.status==='paid').reduce((s,d)=>s+(d.amount||0),0);
    const overdue = data.filter(d=>Utils.isOverdue(d.deadline)&&!['paid','archived'].includes(d.status)).length;
    const approved = data.filter(d=>['approved','paid'].includes(d.status)).length;

    document.getElementById('reportStats').innerHTML = `
      <div class="stat-card primary"><div class="stat-icon"><i class="fas fa-folder"></i></div><div class="stat-info"><div class="stat-value">${total}</div><div class="stat-label">Tổng hồ sơ</div></div></div>
      <div class="stat-card success"><div class="stat-icon"><i class="fas fa-money-check-alt"></i></div><div class="stat-info"><div class="stat-value">${Utils.formatAmount(totalAmt)}</div><div class="stat-label">Tổng giá trị (VND)</div></div></div>
      <div class="stat-card info"><div class="stat-icon"><i class="fas fa-check-circle"></i></div><div class="stat-info"><div class="stat-value">${Utils.formatAmount(paidAmt)}</div><div class="stat-label">Đã thanh toán</div></div></div>
      <div class="stat-card warning"><div class="stat-icon"><i class="fas fa-thumbs-up"></i></div><div class="stat-info"><div class="stat-value">${approved}</div><div class="stat-label">Đã phê duyệt/TT</div></div></div>
      <div class="stat-card danger"><div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-info"><div class="stat-value">${overdue}</div><div class="stat-label">Quá hạn</div></div></div>
    `;
  },

  _renderCharts(data) {
    Object.values(this.charts).forEach(c=>{try{c.destroy()}catch(e){}});
    this.charts = {};

    const byStatus = {};
    WORKFLOW.steps.forEach(s=>{byStatus[s.key]=0});
    data.forEach(d=>{if(byStatus[d.status]!==undefined)byStatus[d.status]++});

    // Status pie
    const cs = document.getElementById('rChartStatus');
    if (cs) this.charts.status = new Chart(cs,{
      type:'pie',
      data:{
        labels:WORKFLOW.steps.map(s=>s.label),
        datasets:[{data:WORKFLOW.steps.map(s=>byStatus[s.key]||0),backgroundColor:['#94a3b8','#3b82f6','#06b6d4','#8b5cf6','#10b981','#16a34a','#6b7280'],borderWidth:2,borderColor:'#fff'}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:10},padding:8}}}}
    });

    // Dept bar
    const deptAmts = { vien_thong:0, kinh_doanh:0, ke_toan:0 };
    data.forEach(d=>{ if(deptAmts[d.department]!==undefined) deptAmts[d.department]+=(d.amount||0)/1e9; });
    const cd = document.getElementById('rChartDept');
    if (cd) this.charts.dept = new Chart(cd,{
      type:'bar',
      data:{
        labels:Object.keys(deptAmts).map(k=>DEPT_LABELS[k]),
        datasets:[{label:'Giá trị (tỷ VND)',data:Object.values(deptAmts).map(v=>+v.toFixed(2)),backgroundColor:['#3b82f6','#f59e0b','#10b981'],borderRadius:8,borderSkipped:false}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#f1f5f9'}},x:{grid:{display:false}}}}
    });

    // Trend by month
    const monthCounts = {};
    data.forEach(d=>{
      const m = new Date(d.created_at||Date.now()).toLocaleDateString('vi-VN',{month:'short',year:'numeric'});
      monthCounts[m] = (monthCounts[m]||0)+1;
    });
    const ct = document.getElementById('rChartTrend');
    if (ct) this.charts.trend = new Chart(ct,{
      type:'line',
      data:{
        labels:Object.keys(monthCounts),
        datasets:[{label:'Hồ sơ tạo mới',data:Object.values(monthCounts),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',fill:true,tension:.4,pointRadius:5,pointHoverRadius:8}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#f1f5f9'}},x:{grid:{display:false}}}}
    });

    // Priority donut
    const byPriority = {high:0,medium:0,low:0};
    data.forEach(d=>{byPriority[d.priority]=(byPriority[d.priority]||0)+1});
    const cp = document.getElementById('rChartPriority');
    if (cp) this.charts.priority = new Chart(cp,{
      type:'doughnut',
      data:{
        labels:['🔴 Cao','🟡 Trung bình','🟢 Thấp'],
        datasets:[{data:[byPriority.high,byPriority.medium,byPriority.low],backgroundColor:['#dc2626','#d97706','#059669'],borderWidth:2,borderColor:'#fff'}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11}}}},cutout:'55%'}
    });
  },

  _renderTable(data) {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;
    tbody.innerHTML = data.length ? data.map(d=>`
      <tr onclick="openDossierDetail('${d.id}')" style="cursor:pointer">
        <td class="td-code">${d.dossier_code}</td>
        <td style="max-width:220px">${Utils.truncate(d.project_name,50)}</td>
        <td>${Utils.deptLabel(d.department)}</td>
        <td>${Utils.statusBadge(d.status)}</td>
        <td>${Utils.priorityBadge(d.priority)}</td>
        <td class="td-amount">${Utils.formatCurrency(d.amount)}</td>
        <td>${Utils.deadlineHtml(d.deadline,true)}</td>
        <td>${Utils.formatDate(d.created_at)}</td>
      </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state">Không có dữ liệu</div></td></tr>`;
  },

  exportAll() {
    const all = DB.dossiers.filter(d=>!d.is_deleted);
    Utils.exportCSV(all, `BaoCao_ToanBo_${Utils.formatDate(new Date().toISOString())}.csv`);
    Toast.show('Thành công','Đã xuất báo cáo đầy đủ!','success');
  },

  exportFiltered() {
    if (!this._filteredData?.length) return Toast.show('Cảnh báo','Không có dữ liệu!','warning');
    Utils.exportCSV(this._filteredData, `BaoCao_LocDuLieu_${Date.now()}.csv`);
    Toast.show('Thành công','Đã xuất báo cáo!','success');
  }
};
