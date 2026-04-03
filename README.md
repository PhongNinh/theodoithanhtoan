# PayTrack Pro — Enterprise Payment Dossier Management System

> **Hệ thống Quản lý Hồ sơ Thanh toán** dành cho 3 phòng ban: Viễn thông, Kinh doanh, Kế toán

---

## 🎯 Mục tiêu

- **Không mất hồ sơ** — mọi tài liệu đều được theo dõi toàn bộ vòng đời
- **Theo dõi đầy đủ** — lịch sử từng bước, ai làm gì, khi nào
- **Phân công rõ ràng** — trách nhiệm minh bạch theo phòng ban
- **Giám sát thời gian thực** — dashboard, cảnh báo quá hạn, thông báo

---

## ✅ Tính năng đã hoàn thành

### 🔐 Xác thực & Phân quyền (RBAC)
- Đăng nhập / Đăng xuất với session persistence
- 4 vai trò: Admin, Viễn thông, Kinh doanh, Kế toán
- Điều hướng và giao diện thay đổi theo role
- Protected routes dựa trên permission matrix

### 📂 Quản lý Hồ sơ Thanh toán
- Tạo / Sửa / Xóa (soft-delete) hồ sơ
- Auto-generate mã hồ sơ (HS-2024-XXX)
- Đầy đủ trường: tên dự án, số HĐ, phòng ban, người phụ trách, ưu tiên, giá trị, deadline
- Phân trang, tìm kiếm, lọc đa tiêu chí
- Bình luận nội bộ theo từng hồ sơ

### 🔄 Workflow 7 bước
1. **Khởi tạo** (Created) — Kinh doanh/Viễn thông tạo
2. **Đã nộp** (Submitted) — Nộp cho Viễn thông
3. **Đã xác minh** (Verified) — Viễn thông xác nhận
4. **Chờ Kế toán** (Sent to Accounting) — Chuyển Kế toán
5. **Đã phê duyệt** (Approved) — Kế toán phê duyệt
6. **Đã thanh toán** (Paid) — Hoàn tất
7. **Lưu trữ** (Archived) — Archive

- Mỗi chuyển đổi có validation theo role
- Không thể bỏ qua bước (trừ Admin)

### 📊 Dashboard & Phân tích
- Thống kê KPI: tổng hồ sơ, đang xử lý, đã phê duyệt, quá hạn, giá trị
- Pipeline workflow bar trực quan
- Biểu đồ: donut (trạng thái), bar (phòng ban), line (xu hướng), priority
- Danh sách hồ sơ quá hạn/sắp hạn
- Activity feed thời gian thực

### 🖥️ Kanban Board
- 7 cột theo workflow steps
- Cards có màu theo mức ưu tiên
- Cảnh báo overdue, deadline countdown
- Click để xem chi tiết / đổi trạng thái

### 📋 Audit Log (Bất biến)
- Mọi hành động đều được ghi log: tạo, sửa, đổi status, bình luận
- Before/After values
- Lọc theo action type, người dùng, mã hồ sơ
- Timeline UI trực quan
- Xuất CSV

### 🔔 Hệ thống Thông báo
- In-app notifications theo user
- Phân loại: assignment, status_change, deadline, comment, approval
- Đánh dấu đã đọc / đọc tất cả
- Badge realtime trên sidebar

### 📤 Báo cáo & Xuất dữ liệu
- Báo cáo đầy đủ với charts: status, dept, trend, priority
- Filter theo date range, phòng ban, trạng thái
- Xuất CSV/Excel với UTF-8 (tiếng Việt)
- Backup toàn bộ dữ liệu JSON

### 👥 Quản lý Người dùng (Admin)
- CRUD người dùng
- Phân role và phòng ban
- Vô hiệu hoá tài khoản (soft-delete)
- Thống kê hồ sơ theo user

### 🔍 Tìm kiếm & Lọc
- Global search (Ctrl+K) theo mã HS, tên dự án, số HĐ
- Filter đa tiêu chí: status, dept, priority, assigned_to, date range
- Search results dropdown

### 📱 QR Code Tracking
- Mỗi hồ sơ có QR code riêng
- QR chứa: mã HS, tên dự án, trạng thái, giá trị

### ⚙️ Cài đặt
- Hồ sơ cá nhân (tên, email, mật khẩu)
- System info
- Database schema overview
- Workflow config
- Backup & Reset

---

## 🔑 Tài khoản Demo

| Username | Password | Vai trò | Phòng ban |
|---|---|---|---|
| `admin` | `admin123` | Quản trị viên | Admin |
| `vt_tuan` | `123456` | Nhân viên VT | Phòng Viễn thông |
| `vt_huong` | `123456` | Nhân viên VT | Phòng Viễn thông |
| `kd_minh` | `123456` | Nhân viên KD | Phòng Kinh doanh |
| `kd_lan` | `123456` | Nhân viên KD | Phòng Kinh doanh |
| `kt_hung` | `123456` | Nhân viên KT | Phòng Kế toán |
| `kt_mai` | `123456` | Nhân viên KT | Phòng Kế toán |

---

## 🗂️ Cấu trúc dự án

```
index.html              — Entry point
css/
  style.css             — Toàn bộ CSS (design system)
js/
  data.js               — Static data store & workflow config
  auth.js               — Authentication & RBAC
  utils.js              — Utilities & formatters
  api.js                — API layer (simulated backend)
  app.js                — Main app controller
  pages/
    dashboard.js        — Dashboard & analytics
    dossiers.js         — Dossier list, create, detail
    kanban.js           — Kanban board
    audit.js            — Audit trail
    notifications.js    — Notifications
    reports.js          — Reports & charts
    users.js            — User management
    settings.js         — Settings
```

---

## 🗄️ Mô hình Dữ liệu

### users
`id, username, full_name, email, password, role, department, avatar, is_active`

### dossiers
`id, dossier_code, project_name, contract_number, department, created_by_*, assigned_to_*, assigned_department, status, priority, amount, deadline, description, notes, tags, is_deleted, created_at`

### audit_logs
`id, dossier_id, dossier_code, user_id, user_name, user_role, action, field_changed, old_value, new_value, comment, ip_address, timestamp`

### notifications
`id, user_id, dossier_id, dossier_code, type, title, message, is_read, priority, created_at`

### comments
`id, dossier_id, user_id, user_name, user_role, content, is_internal, is_deleted, created_at`

---

## 🔄 Ma trận Phân quyền

| Hành động | Admin | Viễn thông | Kinh doanh | Kế toán |
|---|---|---|---|---|
| Tạo hồ sơ | ✅ | ✅ | ✅ | ❌ |
| Sửa hồ sơ | ✅ | ✅ | ✅ | ❌ |
| Xóa hồ sơ | ✅ | ❌ | ❌ | ❌ |
| Đổi trạng thái | ✅ (all) | ✅ (1-3) | ✅ (1-2) | ✅ (4-7) |
| Phê duyệt | ✅ | ❌ | ❌ | ✅ |
| Đánh dấu Paid | ✅ | ❌ | ❌ | ✅ |
| Quản lý Users | ✅ | ❌ | ❌ | ❌ |
| Xuất báo cáo | ✅ | ❌ | ❌ | ✅ |

---

## ⌨️ Phím tắt

- `Ctrl+K` — Mở global search
- `Ctrl+N` — Tạo hồ sơ mới (nếu có quyền)
- `Esc` — Đóng modal / search

---

## 🚧 Tính năng chưa triển khai (cần backend thực)

- [ ] JWT Authentication thực (backend Node.js)
- [ ] Lưu trữ file đính kèm (AWS S3 / local)
- [ ] WebSocket thời gian thực
- [ ] Email notifications
- [ ] OCR scan tài liệu
- [ ] Digital signature
- [ ] AI workflow suggestions
- [ ] PostgreSQL + Prisma ORM
- [ ] bcrypt password hashing

---

## 🚀 Hướng phát triển tiếp theo

1. **Backend API** — Node.js + Express + Prisma + PostgreSQL
2. **File Attachments** — Upload PDF, Excel, ảnh lên AWS S3
3. **Email System** — Nodemailer với SMTP
4. **WebSocket** — Socket.io cho realtime notifications
5. **Docker** — Containerize toàn bộ stack
6. **Testing** — Jest unit tests, Cypress E2E

---

*PayTrack Pro v1.0.0 — Enterprise Payment Dossier Tracking System*
