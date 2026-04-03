# PayTrack Pro v2.0
## Hệ thống Quản lý Hồ sơ Thanh toán Doanh nghiệp

---

## 🚀 Tính năng đã hoàn thành

### 🔐 Bảo mật (Client-side tối đa)
- **XSS Prevention**: Escape HTML entities, sanitize tất cả input/output, loại bỏ script tags
- **Rate Limiting / Brute-force**: Khóa tài khoản sau 5 lần thất bại trong 15 phút, đếm ngược unlock
- **SHA-256 Password Hashing**: Mật khẩu được hash với salt trước khi lưu/so sánh
- **Session Timeout**: Auto-logout sau 30 phút không hoạt động, cảnh báo 5 phút trước
- **Content Security Policy (CSP)**: Meta tag ngăn script/style injection
- **CSRF Token**: Token duy nhất mỗi phiên làm việc
- **Clickjacking Protection**: Phát hiện và chặn iframe embedding
- **Secure Storage**: Session data obfuscated trong sessionStorage (base64 + JSON)
- **Input Validation**: Schema validation cho tất cả form inputs
- **NoSQL Injection Prevention**: Loại bỏ $operators trong queries
- **Audit Logging**: Ghi nhận toàn bộ hành động trong hệ thống
- **Security Dashboard**: Admin xem security events realtime

### 📋 Quản lý Hồ sơ
- CRUD đầy đủ: Tạo, xem, sửa, xóa hồ sơ
- 10 hồ sơ mẫu với đầy đủ dữ liệu
- Filter đa chiều: status, phòng ban, ưu tiên, ngày, tìm kiếm
- Sort nhiều chiều: ngày tạo, giá trị, deadline
- Pagination 10 records/trang
- Xuất CSV

### 🔄 Workflow 7 bước
```
Đã tạo → Đã nộp → Đã xác minh → Gửi Kế toán → Đã duyệt → Đã thanh toán → Lưu trữ
```
- Visual progress bar trong detail modal
- Chỉ cho phép transition hợp lệ theo role
- Ghi lịch sử mỗi lần chuyển trạng thái + ghi chú

### 👥 RBAC (Phân quyền theo vai trò)
| Vai trò | Quyền |
|---------|-------|
| Admin | Toàn quyền, quản lý users, security dashboard |
| Viễn thông | Xem/xử lý hồ sơ, xác minh, gửi kế toán |
| Kinh doanh | Tạo hồ sơ, theo dõi, nộp hồ sơ |
| Kế toán | Phê duyệt, đánh dấu đã thanh toán, lưu trữ, xem báo cáo |

### 📊 Dashboard & Báo cáo
- KPI cards: Tổng hồ sơ, quá hạn, tỷ lệ hoàn thành, tổng giá trị
- Charts: Phân bổ theo trạng thái (pie), phòng ban (bar), xu hướng (line), ưu tiên (doughnut)
- Bảng thống kê chi tiết theo trạng thái
- Xuất CSV/Excel báo cáo

### 🔔 Thông báo
- In-app notifications cho: hồ sơ mới được giao, thay đổi trạng thái, deadline, phê duyệt
- Badge count trên icon
- Đánh dấu đọc / đọc tất cả

### 📅 Kanban Board
- 7 cột tương ứng 7 trạng thái workflow
- Cards với màu sắc theo priority, deadline indicator
- Filter theo phòng ban
- Click card mở detail

### 🔍 Tìm kiếm & Lọc
- Global search (Ctrl+K): tìm theo ID, tên dự án
- Filter đa điều kiện trong trang danh sách
- Highlight kết quả tìm kiếm

### 📜 Audit Log
- Ghi nhận toàn bộ hành động: đăng nhập, tạo/sửa/xóa, chuyển trạng thái
- Filter theo loại hành động, người thực hiện
- Xuất CSV

### ⚙️ Cài đặt
- Đổi mật khẩu với strength indicator
- Xuất backup JSON
- Reset về dữ liệu mẫu (Admin)

---

## 🗂 Cấu trúc file

```
index.html              # Entry point
css/
  style.css             # Full stylesheet (~37KB)
js/
  security.js           # Security module (XSS, rate-limit, session, CSRF)
  data.js               # Database layer (localStorage)
  auth.js               # Authentication & RBAC
  utils.js              # Utilities, formatters, DOM helpers
  api.js                # Internal API với validation
  app.js                # App bootstrap, routing, layout
  pages/
    dashboard.js        # Trang tổng quan
    dossiers.js         # Quản lý hồ sơ
    kanban.js           # Kanban board
    audit.js            # Audit log
    notifications.js    # Thông báo
    reports.js          # Báo cáo & analytics
    users.js            # Quản lý người dùng (Admin)
    settings.js         # Cài đặt hệ thống
    security-dashboard.js # Security monitoring (Admin)
```

---

## 🔑 Tài khoản demo

| Username | Password | Vai trò |
|----------|----------|---------|
| admin | admin123 | Quản trị viên |
| vt_tuan | 123456 | Nhân viên Viễn thông |
| vt_lan | 123456 | Nhân viên Viễn thông |
| kd_minh | 123456 | Nhân viên Kinh doanh |
| kd_huong | 123456 | Nhân viên Kinh doanh |
| kt_hung | 123456 | Nhân viên Kế toán |
| kt_nga | 123456 | Nhân viên Kế toán |

---

## 💾 Data Model

Lưu trữ trong **localStorage** (browser), persist qua refresh.

| Collection | Mô tả |
|-----------|-------|
| users | Tài khoản người dùng (không lưu plain password) |
| dossiers | Hồ sơ thanh toán |
| statusHistory | Lịch sử workflow mỗi hồ sơ |
| notifications | Thông báo in-app |
| auditLogs | Nhật ký hành động |
| comments | Bình luận theo hồ sơ |

---

## ⌨️ Phím tắt

| Phím | Chức năng |
|------|-----------|
| Ctrl+K | Mở thanh tìm kiếm |
| Ctrl+N | Tạo hồ sơ mới |
| Esc | Đóng modal / search |

---

## 🛡 Giới hạn bảo mật client-side

Đây là phiên bản **static web app** - không có server. Các giới hạn:

1. ❌ Không thể ẩn connection string DB
2. ❌ SHA-256 client-side yếu hơn bcrypt server-side
3. ❌ Rate limiting chỉ ngăn tại UI (không ngăn API call trực tiếp)
4. ❌ Dữ liệu localStorage không mã hóa hoàn toàn

**Cho production thực tế:** Cần backend Node.js + MongoDB với bcrypt, JWT, HTTPS, rate-limiting server-side.

---

## 🚀 Triển khai

Mở tab **Publish** trong editor để deploy lên internet ngay lập tức.

---

## 📈 Các tính năng chưa triển khai

- [ ] Real-time WebSocket (cần backend)
- [ ] Email notifications (cần SMTP server)
- [ ] File attachments (cần file storage)
- [ ] Digital signatures
- [ ] OCR document scanning
- [ ] QR tracking nâng cao
- [ ] Export PDF (cần thư viện)
- [ ] AI workflow suggestions

---

*PayTrack Pro v2.0 | Security Module v2.0.0 | © 2024*
