# PayTrack Pro v3.0
## Hệ thống Quản lý Hồ sơ Thanh toán

---

## 🎯 Mục tiêu dự án
Quản lý vòng đời hồ sơ thanh toán nội bộ (tạo → nộp → xác minh → kế toán → duyệt → thanh toán → lưu trữ) với phân quyền theo vai trò, audit log đầy đủ, và bảo mật client-side đa tầng.

---

## ✅ Tính năng đã hoàn chỉnh

### Core
- **Xác thực & Phân quyền (RBAC)**: 4 vai trò — `admin`, `telecom`, `business`, `accounting`
- **Workflow 7 bước**: `created → submitted → verified → sent_to_accounting → approved → paid → archived`
- **Quản lý Hồ sơ (Dossiers)**: CRUD đầy đủ, lọc/sắp xếp/phân trang, xuất CSV
- **Kanban Board**: Hiển thị hồ sơ theo cột trạng thái, lọc theo phòng ban
- **Audit Log**: Ghi mọi thao tác, lọc theo loại/người dùng, xuất CSV
- **Thông báo**: Real-time badge, đánh dấu đã đọc, liên kết tới hồ sơ
- **Báo cáo**: KPI cards, biểu đồ Chart.js (trạng thái, phòng ban, xu hướng, độ ưu tiên), xuất CSV
- **Quản lý Người dùng** (Admin): Thêm/sửa/khoá/xoá tài khoản
- **Cài đặt**: Đổi mật khẩu, thông tin hệ thống, thông tin phiên
- **Security Dashboard** (Admin): Sự kiện bảo mật, rate-limit status, xuất log

### Bảo mật
- XSS Prevention (sanitize mọi input/output)
- Content Security Policy (meta tag, tự động inject)
- Rate Limiting đăng nhập (5 lần / 15 phút)
- Session Timeout (30 phút không hoạt động, cảnh báo trước 5 phút)
- SHA-256 Password Hashing (client-side + salt)
- CSRF Token (per-session)
- Clickjacking Protection (iframe detection)
- Secure Storage (sessionStorage + base64 obfuscation)
- Audit Logging (mọi thao tác quan trọng)
- Input Validation & NoSQL Injection Prevention

---

## 🗂️ Cấu trúc file

```
index.html                  # Entry point duy nhất
css/
  style.css                 # Toàn bộ styles (39KB)
js/
  security.js               # Module bảo mật (XSS, CSRF, Session, Rate Limit...)
  data.js                   # Database layer — RESTful Table API wrapper
  auth.js                   # Xác thực, RBAC, session
  utils.js                  # Helpers: format, modal, toast, pagination, QR...
  api.js                    # Internal API: RBAC checks, validation, enrichment
  app.js                    # Bootstrap, routing, navigation, search
  pages/
    dashboard.js            # Tổng quan KPI + biểu đồ
    dossiers.js             # CRUD hồ sơ (30KB)
    kanban.js               # Kanban board
    audit.js                # Audit log
    notifications.js        # Thông báo
    reports.js              # Báo cáo & xuất
    users.js                # Quản lý người dùng (admin)
    settings.js             # Cài đặt & đổi mật khẩu
    security-dashboard.js   # Security center (admin)
```

---

## 🔗 URI / Routes

| Route key | Trang | Quyền |
|-----------|-------|-------|
| `dashboard` | Tổng quan | Tất cả |
| `dossiers` | Danh sách hồ sơ | Tất cả |
| `dossier_new` | Tạo hồ sơ mới | `dossier.create` hoặc admin |
| `kanban` | Kanban Board | Tất cả |
| `audit` | Audit Log | Tất cả (đã đăng nhập) |
| `notifications` | Thông báo | Tất cả |
| `reports` | Báo cáo | `report.view` hoặc admin |
| `users` | Quản lý người dùng | Admin only |
| `settings` | Cài đặt | Tất cả |
| `security` | Security Dashboard | Admin only |

---

## 💾 Data Models (Table API)

### `pt_users`
| Field | Type | Mô tả |
|-------|------|-------|
| id | text | Business ID (e.g. `u_admin`) |
| username | text | Tên đăng nhập |
| displayName | text | Họ tên hiển thị |
| email | text | Email |
| role | text | `admin/telecom/business/accounting` |
| department | text | Phòng ban |
| passwordHash | text | SHA-256 hash |
| avatar | text | 2 ký tự viết tắt |
| color | text | Màu hex |
| active | bool | Trạng thái tài khoản |
| loginCount | number | Số lần đăng nhập |
| lastLogin | datetime | Đăng nhập cuối |

### `pt_dossiers`
| Field | Type | Mô tả |
|-------|------|-------|
| id | text | = dossierId (e.g. `DOS-001`) |
| dossierId | text | Mã hồ sơ |
| projectName | text | Tên dự án |
| contractNo | text | Số hợp đồng |
| department | text | Phòng ban |
| status | text | Trạng thái workflow |
| priority | text | `urgent/high/medium/low` |
| amount | number | Giá trị (VNĐ) |
| deadline | datetime | Hạn chót |
| creatorId | text | ID người tạo |
| assigneeId | text | ID người được giao |
| description | text | Mô tả |
| notes | text | Ghi chú |
| tags | array | Nhãn |
| deleted | bool | Soft delete |

### `pt_history`
Lịch sử chuyển trạng thái workflow

### `pt_notifications`
Thông báo cho từng người dùng

### `pt_audit`
Audit log toàn hệ thống

### `pt_comments`
Bình luận trên từng hồ sơ

---

## 👤 Tài khoản demo mặc định

| Username | Password | Vai trò |
|----------|----------|---------|
| `admin` | `admin123` | Quản trị viên |
| `phongnx` | `123456` | Nhân viên Viễn thông |
| `ductt` | `123456` | Nhân viên Viễn thông |
| `datnt` | `123456` | Nhân viên Viễn thông |
| `quyetph` | `123456` | Nhân viên Kế toán |
| `hanhn` | `123456` | Nhân viên Kế toán |

---

## 🐛 Bugs đã sửa (v3.0 final)

1. **async/await**: Tất cả lời gọi DB/API đã được `await` đúng cách
2. **DB.users.update()**: Dùng API UUID thay vì business ID khi PATCH
3. **Duplicate `confirmModal`**: Loại bỏ modal confirm trùng trong dossiers.js và users.js; thêm global confirmModal vào index.html
4. **Orphaned HTML fragments**: Loại bỏ phần tử HTML mồ côi còn sót trong template literal của `render()` (dossiers.js)
5. **audit.js exportLog**: Đảm bảo `_allUsers` được load trước khi export
6. **api.js notifications/auditLogs**: Thêm `await` cho tất cả các lời gọi fire-and-create bất đồng bộ
7. **api.js transition notifications**: Chuyển từ `actors.forEach()` sang `await Promise.all([...actors].map())` để đảm bảo thông báo được gửi

---

## 🚀 Hướng phát triển tiếp theo

- [ ] Thêm trang đăng ký người dùng (self-service với admin approval)
- [ ] File đính kèm hồ sơ (upload lên CDN)
- [ ] Email/Push notification thực sự
- [ ] Báo cáo nâng cao (lọc theo ngày, xuất PDF thực)
- [ ] Dark mode
- [ ] Multi-language (i18n)
- [ ] Backend Node.js/Python với bcrypt, JWT, HTTPS cho production

---

## ⚠️ Lưu ý Production

Đây là ứng dụng **static website** với bảo mật client-side:
- Mật khẩu hash bằng SHA-256 phía client (không đủ mạnh cho production thực tế)
- Dữ liệu lưu trên RESTful Table API (shared, persistent)
- Cần backend thực sự (Node.js + bcrypt + JWT + HTTPS) cho môi trường production nghiêm túc
