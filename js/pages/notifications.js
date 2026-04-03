/**
 * notifications.js - Trang thông báo (async/await, Table API)
 * PayTrack Pro v3.0
 */

const PageNotifications = (() => {
  'use strict';
  const e = Security.e;

  const TYPE_ICONS = {
    new_assignment:    { icon: 'fa-user-tag',     color: '#007bff' },
    status_change:     { icon: 'fa-exchange-alt', color: '#17a2b8' },
    deadline_alert:    { icon: 'fa-clock',        color: '#dc3545' },
    approval_required: { icon: 'fa-thumbs-up',    color: '#28a745' },
    system:            { icon: 'fa-cog',          color: '#6c757d' }
  };

  /* ─── Render chính (async) ─── */
  async function render() {
    document.getElementById('mainContent').innerHTML =
      `<div class="page-loader"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;

    const result = await API.notifications.list();
    if (!result.success) { Utils.showToast('Lỗi tải thông báo', 'error'); return; }

    const notifs = result.data;
    const unread = result.unread;

    const html = `
<div class="notifications-page">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-bell me-2"></i>Thông báo
      ${unread > 0
        ? `<span class="badge badge-danger ms-2">${e(String(unread))} chưa đọc</span>`
        : ''}
    </h1>
    ${unread > 0 ? `
    <button class="btn btn-outline" onclick="PageNotifications.markAll()">
      <i class="fas fa-check-double me-1"></i>Đánh dấu tất cả đã đọc
    </button>` : ''}
  </div>

  <div class="card">
    ${!notifs.length
      ? `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Không có thông báo nào</p></div>`
      : `<div class="notification-list">
          ${notifs.map(n => {
            const meta = TYPE_ICONS[n.type] || TYPE_ICONS.system;
            const ts   = n.ts || n.created_at || '';
            return `
              <div class="notif-item ${!n.read ? 'unread' : ''}"
                onclick="PageNotifications.open('${e(n.id)}', '${e(n.dossierRef || '')}')">
                <div class="notif-icon" style="background:${e(meta.color)}20;color:${e(meta.color)}">
                  <i class="fas ${e(meta.icon)}"></i>
                </div>
                <div class="notif-body">
                  <div class="notif-title">${e(n.title || '')}</div>
                  <div class="notif-msg">${e(n.message || '')}</div>
                  <div class="notif-time text-muted small">${e(Utils.fmt.timeAgo(ts))}</div>
                </div>
                ${!n.read ? '<div class="notif-dot"></div>' : ''}
              </div>`;
          }).join('')}
         </div>`}
  </div>
</div>`;

    document.getElementById('mainContent').innerHTML = html;
    App.loadNotificationBadge();
  }

  /* ─── Mở / đánh dấu đã đọc (async) ─── */
  async function open(notifId, dossierRef) {
    await API.notifications.markRead(notifId);

    // Cập nhật UI ngay lập tức
    const item = document.querySelector(`.notif-item[onclick*="${CSS.escape(notifId)}"]`);
    if (item) {
      item.classList.remove('unread');
      item.querySelector('.notif-dot')?.remove();
    }
    App.loadNotificationBadge();

    if (dossierRef) {
      App.navigate('dossiers');
      setTimeout(() => PageDossiers.openDetail(dossierRef), 150);
    }
  }

  /* ─── Đánh dấu tất cả đã đọc (async) ─── */
  async function markAll() {
    await API.notifications.markAllRead();
    await render();
  }

  return { render, open, markAll };
})();

window.PageNotifications = PageNotifications;
