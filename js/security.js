/**
 * security.js - Module bảo mật client-side tối đa
 * PayTrack Pro - Hệ thống Quản lý Hồ sơ Thanh toán
 *
 * Bảo vệ:
 * 1. XSS Prevention (sanitize input/output)
 * 2. Content Security Policy (CSP via meta)
 * 3. Brute-force / Rate Limiting (UI-level)
 * 4. Session Management & Timeout
 * 5. Input Validation & Injection Prevention
 * 6. Clickjacking Prevention
 * 7. Secure Storage (obfuscated)
 * 8. CSRF Token (SPA-level)
 * 9. Audit Logging
 * 10. Security Event Monitoring
 */

const Security = (() => {
  'use strict';

  /* ─── Constants ─── */
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION   = 15 * 60 * 1000; // 15 phút
  const SESSION_TIMEOUT    = 30 * 60 * 1000; // 30 phút không hoạt động
  const TOKEN_REFRESH      = 25 * 60 * 1000; // refresh trước 5 phút
  const MAX_INPUT_LEN      = 2000;
  const STORAGE_PREFIX     = '__pt_';
  const SEC_VERSION        = '2.0.0';

  /* ─── XSS Prevention ─── */
  const XSS = {
    // Bảng ký tự nguy hiểm cần escape
    escapeMap: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    },

    /**
     * Escape HTML entities - ngăn XSS khi render text
     */
    escape(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/[&<>"'`=/]/g, (s) => this.escapeMap[s] || s);
    },

    /**
     * Sanitize HTML - loại bỏ tags và attributes nguy hiểm
     */
    sanitizeHTML(html) {
      if (!html) return '';
      const tmp = document.createElement('div');
      tmp.textContent = String(html);
      return tmp.innerHTML;
    },

    /**
     * Làm sạch object recursively
     */
    sanitizeObject(obj) {
      if (typeof obj === 'string') return this.sanitizeInput(obj);
      if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
      if (Array.isArray(obj)) return obj.map(item => this.sanitizeObject(item));
      if (obj && typeof obj === 'object') {
        const clean = {};
        for (const [k, v] of Object.entries(obj)) {
          const cleanKey = this.sanitizeInput(k);
          clean[cleanKey] = this.sanitizeObject(v);
        }
        return clean;
      }
      return obj;
    },

    /**
     * Sanitize input string - loại bỏ script, event handlers
     */
    sanitizeInput(input) {
      if (input === null || input === undefined) return '';
      let clean = String(input).trim();

      // Giới hạn độ dài
      if (clean.length > MAX_INPUT_LEN) {
        clean = clean.substring(0, MAX_INPUT_LEN);
      }

      // Loại bỏ script tags và event handlers
      clean = clean
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
        .replace(/data\s*:\s*text\/html/gi, '')
        .replace(/expression\s*\(/gi, '')
        .replace(/<iframe/gi, '')
        .replace(/<object/gi, '')
        .replace(/<embed/gi, '')
        .replace(/<link/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

      return clean;
    },

    /**
     * Validate và sanitize URL
     */
    sanitizeURL(url) {
      if (!url) return '#';
      const clean = this.sanitizeInput(url);
      // Chỉ cho phép http, https, và relative URLs
      if (/^(https?:\/\/|\/|\.\/|#)/.test(clean)) return clean;
      return '#';
    }
  };

  /* ─── Rate Limiter ─── */
  const RateLimiter = {
    attempts: {},

    /**
     * Ghi nhận attempt cho một key (vd: login_username)
     */
    record(key) {
      const now = Date.now();
      if (!this.attempts[key]) {
        this.attempts[key] = { count: 0, firstAttempt: now, lockedUntil: 0 };
      }
      const rec = this.attempts[key];

      // Kiểm tra nếu đang bị lock
      if (rec.lockedUntil > now) return { blocked: true, remaining: rec.lockedUntil - now };

      // Reset nếu window đã hết (>15 phút)
      if (now - rec.firstAttempt > LOCKOUT_DURATION) {
        rec.count = 0;
        rec.firstAttempt = now;
      }

      rec.count++;

      if (rec.count >= MAX_LOGIN_ATTEMPTS) {
        rec.lockedUntil = now + LOCKOUT_DURATION;
        SecurityMonitor.logEvent('BRUTE_FORCE_DETECTED', { key, attempts: rec.count });
        return { blocked: true, remaining: LOCKOUT_DURATION, lockout: true };
      }

      return { blocked: false, remaining: MAX_LOGIN_ATTEMPTS - rec.count };
    },

    /**
     * Xóa record khi đăng nhập thành công
     */
    reset(key) {
      delete this.attempts[key];
    },

    /**
     * Kiểm tra trạng thái hiện tại
     */
    check(key) {
      const now = Date.now();
      const rec = this.attempts[key];
      if (!rec) return { blocked: false, remaining: MAX_LOGIN_ATTEMPTS };
      if (rec.lockedUntil > now) {
        return { blocked: true, remaining: rec.lockedUntil - now, lockedUntil: rec.lockedUntil };
      }
      return { blocked: false, remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - rec.count) };
    },

    /**
     * Lấy thời gian còn lại dạng MM:SS
     */
    formatRemaining(ms) {
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  };

  /* ─── Session Manager ─── */
  const SessionManager = {
    timeoutId: null,
    refreshId: null,
    lastActivity: Date.now(),

    /**
     * Khởi động session monitoring
     */
    start() {
      this.updateActivity();
      this._setupActivityListeners();
      this._scheduleTimeout();
    },

    /**
     * Cập nhật thời gian hoạt động cuối
     */
    updateActivity() {
      this.lastActivity = Date.now();
    },

    /**
     * Setup event listeners theo dõi hoạt động người dùng
     */
    _setupActivityListeners() {
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach(evt => {
        document.addEventListener(evt, () => this.updateActivity(), { passive: true });
      });
    },

    /**
     * Lên lịch timeout session
     */
    _scheduleTimeout() {
      clearTimeout(this.timeoutId);
      this.timeoutId = setInterval(() => {
        const idle = Date.now() - this.lastActivity;
        if (idle >= SESSION_TIMEOUT) {
          this.expire();
        } else if (idle >= SESSION_TIMEOUT - 5 * 60 * 1000) {
          // Cảnh báo 5 phút trước khi timeout
          this._warnTimeout(SESSION_TIMEOUT - idle);
        }
      }, 30000); // check mỗi 30 giây
    },

    /**
     * Hiển thị cảnh báo timeout
     */
    _warnTimeout(remaining) {
      const mins = Math.ceil(remaining / 60000);
      if (window.showToast) {
        window.showToast(`⚠️ Phiên làm việc sẽ hết hạn sau ${mins} phút do không hoạt động`, 'warning', 8000);
      }
    },

    /**
     * Hết phiên làm việc - đăng xuất tự động
     */
    expire() {
      clearInterval(this.timeoutId);
      SecurityMonitor.logEvent('SESSION_EXPIRED', { reason: 'inactivity' });
      SecureStorage.remove('currentUser');
      SecureStorage.remove('sessionToken');
      if (window.Auth && window.Auth.logout) {
        window.Auth.logout(true); // silent logout
      } else {
        window.location.reload();
      }
    },

    /**
     * Dừng session monitoring
     */
    stop() {
      clearInterval(this.timeoutId);
      clearTimeout(this.refreshId);
    }
  };

  /* ─── Secure Storage ─── */
  const SecureStorage = {
    /**
     * Lưu dữ liệu vào sessionStorage với obfuscation
     */
    set(key, value) {
      try {
        const data = JSON.stringify({ v: value, t: Date.now() });
        const encoded = btoa(encodeURIComponent(data));
        sessionStorage.setItem(STORAGE_PREFIX + key, encoded);
      } catch (e) {
        console.warn('[Security] Storage error:', e.message);
      }
    },

    /**
     * Đọc dữ liệu từ sessionStorage
     */
    get(key) {
      try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
        if (!raw) return null;
        const data = JSON.parse(decodeURIComponent(atob(raw)));
        return data.v;
      } catch (e) {
        return null;
      }
    },

    /**
     * Xóa key
     */
    remove(key) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
    },

    /**
     * Xóa tất cả session data
     */
    clear() {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith(STORAGE_PREFIX))
        .forEach(k => sessionStorage.removeItem(k));
    }
  };

  /* ─── CSRF Token ─── */
  const CSRF = {
    _token: null,

    /**
     * Tạo CSRF token cho SPA
     */
    generate() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      this._token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      SecureStorage.set('csrfToken', this._token);
      return this._token;
    },

    /**
     * Lấy token hiện tại
     */
    get() {
      if (!this._token) {
        this._token = SecureStorage.get('csrfToken') || this.generate();
      }
      return this._token;
    },

    /**
     * Validate token
     */
    validate(token) {
      return token && token === this.get();
    }
  };

  /* ─── Password Security ─── */
  const Password = {
    /**
     * SHA-256 hash mật khẩu (client-side, kết hợp salt)
     */
    async hash(password, salt) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + (salt || 'paytrack_salt_2024'));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Kiểm tra độ mạnh của mật khẩu
     */
    checkStrength(password) {
      const checks = {
        length:    password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number:    /[0-9]/.test(password),
        special:   /[^A-Za-z0-9]/.test(password)
      };
      const score = Object.values(checks).filter(Boolean).length;
      const levels = ['', 'Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
      return { score, level: levels[score] || 'Rất yếu', checks };
    },

    /**
     * Validate mật khẩu tối thiểu
     */
    validate(password) {
      if (!password || password.length < 6) return { valid: false, reason: 'Mật khẩu ít nhất 6 ký tự' };
      return { valid: true };
    }
  };

  /* ─── Input Validator ─── */
  const Validator = {
    rules: {
      username: /^[a-zA-Z0-9_\.]{3,50}$/,
      email:    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone:    /^[0-9+\-\s\(\)]{8,20}$/,
      amount:   /^\d+(\.\d{1,2})?$/,
      id:       /^[a-zA-Z0-9\-_]{1,50}$/
    },

    validate(type, value) {
      if (!value) return false;
      const rule = this.rules[type];
      return rule ? rule.test(String(value).trim()) : true;
    },

    sanitizeFormData(formData) {
      const clean = {};
      for (const [key, value] of Object.entries(formData)) {
        clean[XSS.sanitizeInput(key)] = XSS.sanitizeInput(value);
      }
      return clean;
    },

    /**
     * Chống NoSQL-like injection trong queries
     */
    sanitizeQuery(query) {
      if (!query) return '';
      return XSS.sanitizeInput(query)
        .replace(/\$[a-zA-Z]+/g, '') // loại bỏ $operators
        .replace(/\{|\}/g, '')        // loại bỏ braces
        .replace(/\[|\]/g, '');       // loại bỏ brackets
    }
  };

  /* ─── Security Monitor ─── */
  const SecurityMonitor = {
    events: [],
    MAX_EVENTS: 500,

    /**
     * Ghi log sự kiện bảo mật
     */
    logEvent(type, details = {}) {
      const event = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
        type,
        timestamp: new Date().toISOString(),
        details,
        userAgent: navigator.userAgent.substring(0, 100),
        url: window.location.pathname
      };

      this.events.unshift(event);

      // Giới hạn số lượng events trong memory
      if (this.events.length > this.MAX_EVENTS) {
        this.events = this.events.slice(0, this.MAX_EVENTS);
      }

      // Lưu vào sessionStorage
      try {
        const stored = JSON.parse(sessionStorage.getItem('__security_log') || '[]');
        stored.unshift(event);
        sessionStorage.setItem('__security_log', JSON.stringify(stored.slice(0, 100)));
      } catch (e) { /* ignore */ }

      // Console log các sự kiện nghiêm trọng
      if (['BRUTE_FORCE_DETECTED', 'SESSION_EXPIRED', 'XSS_ATTEMPT', 'UNAUTHORIZED_ACCESS'].includes(type)) {
        console.warn(`[Security Alert] ${type}`, details);
      }

      return event;
    },

    /**
     * Lấy danh sách events
     */
    getEvents(limit = 50) {
      return this.events.slice(0, limit);
    },

    /**
     * Export events ra JSON
     */
    exportEvents() {
      return JSON.stringify(this.events, null, 2);
    }
  };

  /* ─── Clickjacking Prevention ─── */
  const ClickjackingProtection = {
    init() {
      if (window.self !== window.top) {
        document.body.innerHTML = '<div style="padding:20px;font-family:sans-serif;color:red"><h2>⚠️ Truy cập không được phép</h2><p>Trang này không thể hiển thị trong iframe.</p></div>';
        SecurityMonitor.logEvent('CLICKJACKING_ATTEMPT', { referrer: document.referrer });
      }
    }
  };

  /* ─── Content Security Policy ─── */
  const CSP = {
    /**
     * Thêm meta CSP tag vào head (nếu chưa có)
     */
    init() {
      if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;

      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'Content-Security-Policy');
      // Note: frame-ancestors không hỗ trợ qua meta tag - được bảo vệ bởi ClickjackingProtection
      meta.setAttribute('content', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com",
        "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com fonts.gstatic.com",
        "font-src 'self' fonts.gstatic.com cdn.jsdelivr.net data:",
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '));

      document.head.insertBefore(meta, document.head.firstChild);
    }
  };

  /* ─── Referrer & Feature Policy ─── */
  const PolicyHeaders = {
    init() {
      // Referrer Policy
      let rp = document.querySelector('meta[name="referrer"]');
      if (!rp) {
        rp = document.createElement('meta');
        rp.name = 'referrer';
        rp.content = 'strict-origin-when-cross-origin';
        document.head.appendChild(rp);
      }
    }
  };

  /* ─── Public API ─── */
  return {
    VERSION: SEC_VERSION,
    XSS,
    RateLimiter,
    SessionManager,
    SecureStorage,
    CSRF,
    Password,
    Validator,
    SecurityMonitor,

    /**
     * Khởi tạo toàn bộ hệ thống bảo mật
     */
    init() {
      ClickjackingProtection.init();
      CSP.init();
      PolicyHeaders.init();
      CSRF.generate();
      SecurityMonitor.logEvent('SECURITY_INIT', { version: SEC_VERSION });
      console.info(`[PayTrack Security] v${SEC_VERSION} initialized ✓`);
    },

    /**
     * Bắt đầu session sau đăng nhập
     */
    startSession(user) {
      SessionManager.start();
      SecurityMonitor.logEvent('SESSION_STARTED', { userId: user?.id, role: user?.role });
    },

    /**
     * Kết thúc session khi đăng xuất
     */
    endSession(userId) {
      SessionManager.stop();
      SecureStorage.clear();
      SecurityMonitor.logEvent('SESSION_ENDED', { userId });
    },

    /**
     * Escape HTML cho render an toàn
     */
    e(str) { return XSS.escape(str); },

    /**
     * Sanitize input
     */
    s(str) { return XSS.sanitizeInput(str); },

    /**
     * Render text an toàn vào element
     */
    safeRender(element, text) {
      if (element) element.textContent = String(text || '');
    },

    /**
     * Tạo HTML an toàn (escape tất cả interpolated values)
     */
    safeHTML(strings, ...values) {
      return strings.reduce((result, str, i) => {
        return result + str + (values[i] !== undefined ? XSS.escape(String(values[i])) : '');
      }, '');
    }
  };
})();

// Export global
window.Security = Security;
window.sec = Security; // shorthand
