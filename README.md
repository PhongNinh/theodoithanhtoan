# PayTrack Pro v3.0 — Hệ thống Quản lý Hồ sơ Thanh toán

## ✅ Tính năng đã hoàn thành

### 🗄️ Database (Server-side, Persistent)
- **RESTful Table API** — dữ liệu lưu trên server, không phụ thuộc localStorage
- Dữ liệu **chia sẻ** giữa mọi user/thiết bị/trình duyệt
- **Không mất dữ liệu** khi clear cache hay đổi trình duyệt
- Tables: `pt_users`, `pt_dossiers`, `pt_history`, `pt_notifications`, `pt_audit`, `pt_comments`

### 🔐 Bảo mật (client-side)
- **XSS Protection**: sanitize input/output, escape HTML entities (`Security.e()`)
- **SHA-256 Password Hashing**: hash trước khi gửi lên DB
- **Rate Limiting**: khóa tài khoản sau 5 lần thất bại / 15 phút
- **Session Timeout**: tự đăng xuất sau 30 phút không hoạt động
- **CSRF Token**: token duy nhất mỗi phiên
- **CSP Meta Tags**: ngăn inline script injection
- **Clickjacking Protection**: phát hiện iframe embedding
- **Input Validation**: schema validate toàn bộ inputs
- **Secure Session Storage**: session data obfuscated trong sessionStorage
- **Audit Logging**: ghi nhận mọi hành động vào `pt_audit`

### 🏢 Quản lý Hồ sơ
- CRUD hồ sơ với 7 trạng thái workflow
- Kanban board trực quan
- Tìm kiếm, lọc, sắp xếp đa tiêu chí
- Chi tiết hồ sơ với lịch sử workflow + bình luận + QR code
- Chuyển trạng thái có phân quyền theo vai trò

### 👥 Quản lý Người dùng (Admin)
- CRUD users với async API calls
- Phân quyền 4 vai trò: Admin, Viễn thông, Kinh doanh, Kế toán
- Khóa/mở khóa tài khoản
- Đổi mật khẩu có kiểm tra độ mạnh

### 📊 Báo cáo & Dashboard
- Dashboard tổng quan với KPI cards và biểu đồ Chart.js
- Báo cáo chi tiết: trạng thái, phòng ban, xu hướng, ưu tiên
- Xuất CSV
- Audit log với filter và export

## 🔗 Entry Points

| Path | Mô tả |
|------|-------|
| `index.html` | Trang chính, tự redirect đến login hoặc dashboard |
| `tables/pt_users` | API người dùng |
| `tables/pt_dossiers` | API hồ sơ |
| `tables/pt_history` | API lịch sử workflow |
| `tables/pt_notifications` | API thông báo |
| `tables/pt_audit` | API audit log |
| `tables/pt_comments` | API bình luận |

## 👤 Tài khoản hệ thống

| Username | Họ tên | Vai trò | Phòng ban |
|----------|--------|---------|-----------|
| `admin` | Quản trị viên | admin | Ban Quản trị |
| `phongnx` | Ninh Xuân Phong | telecom | Phòng Viễn thông |
| `ductt` | Trần Tuấn Đức | telecom | Phòng Viễn thông |
| `datnt` | Nguyễn Tiến Đạt | telecom | Phòng Viễn thông |
| `quyetph` | Phạm Hoàng Quyết | accounting | Phòng Kế toán |
| `hanhn` | Hồ Ngọc Hân | accounting | Phòng Kế toán |

> Tài khoản được tạo qua trang **Quản lý Người dùng** (admin) hoặc seed vào bảng `pt_users` với `passwordHash: "__plain__<mật_khẩu>"`.

## 🗂️ Cấu trúc File

```
index.html                    # Main HTML (CSP meta, login UI, app UI)
css/style.css                 # Toàn bộ styles (39KB)
js/
  security.js                 # Security module (XSS, CSP, Rate limit, Session, CSRF, SHA-256)
  data.js                     # Database layer (RESTful Table API wrapper, cache 30s TTL)
  auth.js                     # Authentication & RBAC (login, logout, session, register)
  utils.js                    # Utilities (format, badge, modal, pagination, export)
  api.js                      # Internal API layer (validation, RBAC check, enrich data)
  app.js                      # App bootstrap & routing
  pages/
    dashboard.js              # Trang tổng quan (KPI + charts)
    dossiers.js               # Danh sách & CRUD hồ sơ
    kanban.js                 # Kanban board
    audit.js                  # Audit log viewer
    notifications.js          # Thông báo
    reports.js                # Báo cáo & analytics
    users.js                  # Quản lý người dùng (Admin)
    settings.js               # Cài đặt & đổi mật khẩu
    security-dashboard.js     # Dashboard bảo mật (Admin)
```

## 🏗️ Kiến trúc Data Flow

```
User Action (UI)
  → Pages/*.js (async/await)
    → API layer (api.js) — validation + RBAC check
      → DB layer (data.js) — cache + RESTful Table API
        → Server (tables/{table}) — persistent storage
```

## ⚠️ Giới hạn Client-side Security

- SHA-256 hash phía client — yếu hơn bcrypt server-side
- Rate limiting chỉ ngăn brute-force tại UI, không ngăn direct API calls
- Session token lưu trong sessionStorage (xóa khi đóng tab)

## 🚀 Deploy

Click **Publish tab** để publish lên production. Dữ liệu được lưu trên server — **tất cả user đều thấy cùng dữ liệu**.

## 📌 Các bước tiếp theo (nếu cần nâng cấp)

1. Thêm backend Node.js với bcrypt + JWT cho bảo mật thực sự
2. Thêm file upload cho đính kèm hồ sơ
3. Thêm email notification thực
4. Thêm export PDF với pdfmake
5. Thêm 2FA (Two-Factor Authentication)
