/* ===========================
   Notifications Page
   =========================== */

window.NotificationsPage = {
  async render() {
    document.getElementById('pageContainer').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const notifs = await API.getNotifications();
    this._render(notifs);
  },

  _render(notifs) {
    const unread = notifs.filter(n=>!n.is_read).length;
    const typeIcons = {
      assignment: { icon:'fa-user-tag', cls:'ni-assignment' },
      status_change: { icon:'fa-exchange-alt', cls:'ni-status_change' },
      deadline: { icon:'fa-clock', cls:'ni-deadline' },
      comment: { icon:'fa-comment', cls:'ni-comment' },
      approval: { icon:'fa-check-double', cls:'ni-approval' },
    };

    document.getElementById('pageContainer').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fas fa-bell" style="color:var(--primary)"></i> Thông báo</div>
          <div class="page-subtitle">${unread} thông báo chưa đọc</div>
        </div>
        <div class="page-actions">
          ${unread ? `<button class="btn btn-secondary" onclick="NotificationsPage.markAllRead()"><i class="fas fa-check-double"></i> Đánh dấu tất cả đã đọc</button>` : ''}
        </div>
      </div>

      <div class="notif-list">
        ${notifs.length ? notifs.map(n=>{
          const ti = typeIcons[n.type] || { icon:'fa-bell', cls:'ni-assignment' };
          return `
            <div class="notif-item ${n.is_read?'':'unread'}" onclick="NotificationsPage.clickNotif('${n.id}','${n.dossier_id}')">
              <div class="notif-icon ${ti.cls}"><i class="fas ${ti.icon}"></i></div>
              <div class="notif-content">
                <div class="notif-title">${n.title}</div>
                <div class="notif-msg">${n.message}</div>
                <div class="notif-time">
                  ${n.dossier_code?`<a class="td-code" href="#" onclick="event.stopPropagation();openDossierDetail('${n.dossier_id}')" style="font-size:11px">${n.dossier_code}</a> · `:''} 
                  ${Utils.timeAgo(n.created_at)} · 
                  <span class="badge badge-${n.priority}" style="font-size:9px">${PRIORITY_LABELS[n.priority]}</span>
                </div>
              </div>
              ${!n.is_read ? '<div class="notif-badge"></div>' : ''}
            </div>`;
        }).join('') : `<div class="empty-state"><i class="fas fa-bell-slash"></i><h3>Không có thông báo</h3><p>Bạn đã đọc hết thông báo!</p></div>`}
      </div>
    `;
  },

  async clickNotif(id, dossierId) {
    await API.markNotificationRead(id);
    updateNotifBadge();
    if (dossierId) openDossierDetail(dossierId);
    const notifs = await API.getNotifications();
    this._render(notifs);
  },

  async markAllRead() {
    await API.markAllRead();
    updateNotifBadge();
    Toast.show('Thành công','Đã đánh dấu tất cả đã đọc','success');
    const notifs = await API.getNotifications();
    this._render(notifs);
  }
};
