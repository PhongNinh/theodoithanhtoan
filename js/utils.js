/**
 * utils.js - Tiện ích chung
 * PayTrack Pro
 */

const Utils = (() => {
  'use strict';

  /* ─── Formatters ─── */
  const fmt = {
    currency(amount, currency = 'VND') {
      if (amount === null || amount === undefined) return '—';
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
    },

    number(num) {
      if (num === null || num === undefined) return '0';
      return new Intl.NumberFormat('vi-VN').format(num);
    },

    date(timestamp) {
      if (!timestamp) return '—';
      const d = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    datetime(timestamp) {
      if (!timestamp) return '—';
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    },

    timeAgo(timestamp) {
      if (!timestamp) return '—';
      const diff = Date.now() - new Date(timestamp).getTime();
      if (diff < 60000)       return 'Vừa xong';
      if (diff < 3600000)     return `${Math.floor(diff / 60000)} phút trước`;
      if (diff < 86400000)    return `${Math.floor(diff / 3600000)} giờ trước`;
      if (diff < 604800000)   return `${Math.floor(diff / 86400000)} ngày trước`;
      if (diff < 2592000000)  return `${Math.floor(diff / 604800000)} tuần trước`;
      return fmt.date(timestamp);
    },

    fileSize(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      let i = 0;
      while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
      return `${bytes.toFixed(1)} ${units[i]}`;
    }
  };

  /* ─── Deadline helpers ─── */
  function deadlineStatus(deadline) {
    if (!deadline) return { status: 'none', label: 'Không có deadline', class: '' };
    const now  = Date.now();
    const due  = new Date(deadline).getTime();
    const diff = due - now;

    if (diff < 0)           return { status: 'overdue',  label: 'Quá hạn!', class: 'text-danger fw-bold' };
    if (diff < 86400000)    return { status: 'critical', label: 'Hôm nay!', class: 'text-danger' };
    if (diff < 3 * 86400000) return { status: 'warning', label: `${Math.ceil(diff / 86400000)} ngày nữa`, class: 'text-warning' };
    return { status: 'ok', label: `${Math.ceil(diff / 86400000)} ngày nữa`, class: 'text-success' };
  }

  /* ─── Status helpers ─── */
  function statusBadge(status) {
    const map = {
      created:             { label: 'Đã tạo',        class: 'badge-secondary' },
      submitted:           { label: 'Đã nộp',         class: 'badge-primary' },
      verified:            { label: 'Đã xác minh',   class: 'badge-info' },
      sent_to_accounting:  { label: 'Gửi Kế toán',   class: 'badge-warning' },
      approved:            { label: 'Đã duyệt',       class: 'badge-success' },
      paid:                { label: 'Đã thanh toán',  class: 'badge-teal' },
      archived:            { label: 'Lưu trữ',        class: 'badge-purple' }
    };
    return map[status] || { label: status, class: 'badge-secondary' };
  }

  function priorityBadge(priority) {
    const map = {
      urgent: { label: '🔴 Khẩn cấp', class: 'badge-danger' },
      high:   { label: '🟠 Cao',      class: 'badge-warning' },
      medium: { label: '🟡 Trung bình', class: 'badge-info' },
      low:    { label: '🟢 Thấp',     class: 'badge-success' }
    };
    return map[priority] || { label: priority, class: 'badge-secondary' };
  }

  /* ─── Avatar helper ─── */
  function avatarHTML(user, size = 36) {
    if (!user) return `<div class="avatar" style="width:${size}px;height:${size}px;background:#6c757d">?</div>`;
    const e = Security.e;
    return `<div class="avatar" style="width:${size}px;height:${size}px;background:${e(user.color || '#6c757d')};font-size:${Math.round(size * 0.38)}px" title="${e(user.displayName)}">${e(user.avatar || '?')}</div>`;
  }

  /* ─── DOM Helpers ─── */
  const dom = {
    // Lấy element an toàn
    get: (selector) => document.querySelector(selector),
    getAll: (selector) => [...document.querySelectorAll(selector)],

    // Set text content an toàn (chống XSS)
    setText: (selector, text) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = String(text ?? '');
    },

    // Set innerHTML với sanitize
    setHTML: (selector, html) => {
      const el = document.querySelector(selector);
      if (el) el.innerHTML = html; // HTML đã được escape ở tầng trên
    },

    // Show/Hide
    show: (selector) => { const el = document.querySelector(selector); if (el) el.classList.remove('hidden'); },
    hide: (selector) => { const el = document.querySelector(selector); if (el) el.classList.add('hidden'); },
    toggle: (selector, show) => {
      const el = document.querySelector(selector);
      if (el) el.classList.toggle('hidden', !show);
    },

    // Enable/Disable button
    setLoading: (btn, loading, text = 'Đang xử lý...') => {
      if (!btn) return;
      btn.disabled = loading;
      if (loading) {
        btn._origText = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>${text}`;
      } else {
        btn.innerHTML = btn._origText || btn.innerHTML;
      }
    },

    // Tạo option elements cho select
    buildOptions: (options, selectedValue, defaultLabel = '-- Chọn --') => {
      const opts = defaultLabel ? `<option value="">${Security.e(defaultLabel)}</option>` : '';
      return opts + options.map(o => {
        const val = typeof o === 'object' ? o.value : o;
        const lbl = typeof o === 'object' ? o.label : o;
        const sel = val == selectedValue ? 'selected' : '';
        return `<option value="${Security.e(val)}" ${sel}>${Security.e(lbl)}</option>`;
      }).join('');
    }
  };

  /* ─── Toast Notifications ─── */
  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const id    = 'toast_' + Date.now();
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const icon  = icons[type] || icons.info;

    const toast = document.createElement('div');
    toast.id        = id;
    toast.className = `toast toast-${type}`;
    // Dùng textContent cho message để tránh XSS
    toast.innerHTML = `<i class="fas ${Security.e(icon)} me-2"></i><span class="toast-msg"></span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    toast.querySelector('.toast-msg').textContent = message;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ─── Modal Helper ─── */
  const Modal = {
    show: (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    },
    hide: (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('active');
        document.body.style.overflow = '';
      }
    },
    confirm: (message, onConfirm, onCancel) => {
      const el = document.getElementById('confirmModal');
      if (!el) { if (confirm(message)) onConfirm(); else if (onCancel) onCancel(); return; }

      const msgEl = document.getElementById('confirmMessage');
      if (msgEl) msgEl.textContent = message;

      const okBtn = document.getElementById('confirmOk');
      const cancelBtn = document.getElementById('confirmCancel');

      const cleanup = () => {
        Modal.hide('confirmModal');
        okBtn?.removeEventListener('click', onYes);
        cancelBtn?.removeEventListener('click', onNo);
      };

      const onYes = () => { cleanup(); onConfirm(); };
      const onNo  = () => { cleanup(); if (onCancel) onCancel(); };

      okBtn?.addEventListener('click', onYes);
      cancelBtn?.addEventListener('click', onNo);
      Modal.show('confirmModal');
    }
  };

  /* ─── Debounce / Throttle ─── */
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function throttle(fn, limit = 200) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        fn(...args);
      }
    };
  }

  /* ─── CSV / Excel Export ─── */
  function exportCSV(data, filename = 'export.csv') {
    if (!data || !data.length) { showToast('Không có dữ liệu để xuất', 'warning'); return; }

    const headers = Object.keys(data[0]);
    const rows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h] ?? '';
          return typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      )
    ];

    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${data.length} bản ghi ra ${filename}`, 'success');
  }

  /* ─── Pagination ─── */
  function buildPagination(total, page, limit, onPageChange) {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return '';

    const pages = [];
    const start = Math.max(1, page - 2);
    const end   = Math.min(totalPages, page + 2);

    if (start > 1) {
      pages.push(`<button class="page-btn" data-page="1">1</button>`);
      if (start > 2) pages.push(`<span class="page-ellipsis">...</span>`);
    }
    for (let i = start; i <= end; i++) {
      pages.push(`<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(`<span class="page-ellipsis">...</span>`);
      pages.push(`<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`);
    }

    const html = `
      <div class="pagination">
        <button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹ Trước</button>
        ${pages.join('')}
        <button class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Sau ›</button>
        <span class="page-info">Trang ${page}/${totalPages} (${total} bản ghi)</span>
      </div>`;

    // Attach events sau khi render
    setTimeout(() => {
      document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (p >= 1 && p <= totalPages && p !== page && !btn.disabled) {
            onPageChange(p);
          }
        });
      });
    }, 0);

    return html;
  }

  /* ─── QR Code ─── */
  function generateQR(elementId, text, size = 128) {
    const el = document.getElementById(elementId);
    if (!el || !window.QRCode) return;
    el.innerHTML = '';
    try {
      new QRCode(el, { text: Security.XSS.sanitizeInput(text), width: size, height: size, colorLight: '#ffffff', colorDark: '#1a1a2e' });
    } catch (e) {
      el.textContent = text;
    }
  }

  /* ─── Copy to clipboard ─── */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Đã sao chép!', 'success', 1500);
    } catch (e) {
      showToast('Không thể sao chép', 'error');
    }
  }

  /* ─── Search highlight ─── */
  function highlight(text, query) {
    if (!query || !text) return Security.e(text);
    const escaped = Security.e(text);
    const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${escapedQ})`, 'gi'), '<mark>$1</mark>');
  }

  /* ─── Public ─── */
  return {
    fmt,
    deadlineStatus,
    statusBadge,
    priorityBadge,
    avatarHTML,
    dom,
    showToast,
    Modal,
    debounce,
    throttle,
    exportCSV,
    buildPagination,
    generateQR,
    copyToClipboard,
    highlight
  };
})();

window.Utils = Utils;
window.showToast = Utils.showToast; // global shortcut
