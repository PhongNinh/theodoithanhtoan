# CLAUDE.md – PayTrack Pro v3.0

## Tổng quan dự án

**PayTrack Pro** là hệ thống quản lý hồ sơ thanh toán nội bộ, chạy hoàn toàn trên trình duyệt (frontend-only SPA). Dữ liệu được lưu trữ trên server qua **RESTful Table API** (`tables/{table}`), chia sẻ giữa tất cả người dùng.

## Người dùng thực tế

| Tên đăng nhập | Họ tên            | Phòng ban        | Vai trò   |
|---------------|-------------------|------------------|-----------|
| `admin`       | Quản trị viên     | Ban Quản trị     | admin     |
| `phongnx`     | Ninh Xuân Phong   | Phòng Viễn thông | telecom   |
| `ductt`       | Trần Tuấn Đức     | Phòng Viễn thông | telecom   |
| `datnt`       | Nguyễn Tiến Đạt   | Phòng Viễn thông | telecom   |
| `quyetph`     | Phạm Hoàng Quyết  | Phòng Kế toán    | accounting|
| `hanhn`       | Hồ Ngọc Hân       | Phòng Kế toán    | accounting|

Người dùng được quản lý qua bảng `pt_users` (admin tạo trong trang **Quản lý Người dùng**, hoặc seed trực tiếp vào table với `passwordHash: "__plain__<mật_khẩu>"`).

## Kiến trúc

```
index.html               ← Entry point (Login UI + App shell)
css/style.css            ← Toàn bộ CSS
js/
  security.js            ← LOAD ĐẦU TIÊN: XSS, CSP, RateLimit, Session, CSRF, SHA-256
  data.js                ← DB layer: wrapper Table API + cache 30s
  auth.js                ← Xác thực & RBAC (login, logout, session, permissions)
  utils.js               ← Format, badge, modal, pagination, toast, export CSV
  api.js                 ← Internal API: validation, RBAC check, enrich data
  app.js                 ← Bootstrap, routing, event handlers
  pages/
    dashboard.js         ← KPI cards + biểu đồ Chart.js
    dossiers.js          ← CRUD hồ sơ, list, detail modal, workflow transition
    kanban.js            ← Kanban board theo workflow
    audit.js             ← Nhật ký hoạt động (audit log)
    notifications.js     ← Thông báo người dùng
    reports.js           ← Báo cáo, charts, xuất CSV
    users.js             ← Quản lý tài khoản (admin only)
    settings.js          ← Đổi mật khẩu + thông tin cá nhân (tất cả users)
    security-dashboard.js← Trung tâm bảo mật (admin only)
```

**Thứ tự load script trong HTML** (quan trọng, không thay đổi):
`security.js` → `data.js` → `auth.js` → `utils.js` → `api.js` → `pages/*.js` → `app.js`

## Tables API

| Table              | Mô tả                         |
|--------------------|-------------------------------|
| `pt_users`         | Tài khoản người dùng          |
| `pt_dossiers`      | Hồ sơ thanh toán              |
| `pt_history`       | Lịch sử workflow              |
| `pt_notifications` | Thông báo                     |
| `pt_audit`         | Audit log hành động           |
| `pt_comments`      | Bình luận trên hồ sơ          |

## Workflow hồ sơ

```
created → submitted → verified → sent_to_accounting → approved → paid → archived
```

Phân quyền chuyển trạng thái:
- `telecom`: verified, sent_to_accounting
- `accounting`: approved, paid, archived
- `business`: submitted (chỉ hồ sơ do mình tạo)
- `admin`: tất cả

## Vai trò & phân quyền

| Vai trò     | Tạo HS | Xem HS | Xác minh | Gửi KT | Duyệt/TT | Báo cáo | Admin |
|-------------|--------|--------|----------|--------|----------|---------|-------|
| `admin`     | ✓      | ✓      | ✓        | ✓      | ✓        | ✓       | ✓     |
| `telecom`   | ✗      | ✓      | ✓        | ✓      | ✗        | ✗       | ✗     |
| `business`  | ✓      | ✓ own  | ✗        | ✗      | ✗        | ✗       | ✗     |
| `accounting`| ✗      | ✓      | ✗        | ✗      | ✓        | ✓       | ✗     |

## Bảo mật (client-side)

- **XSS**: dùng `Security.e(str)` để escape khi render HTML, không dùng `innerHTML` trực tiếp với dữ liệu từ user/DB
- **SHA-256**: mật khẩu hash trước khi so sánh. Seed user với `passwordHash: "__plain__<pass>"` → tự hash lần đầu
- **Rate Limiting**: 5 lần thất bại → khóa 15 phút (client-side)
- **Session Timeout**: tự đăng xuất sau 30 phút không hoạt động
- **CSRF Token**: mỗi phiên một token, lưu trong sessionStorage
- **CSP Meta**: ngăn script injection

## Quy tắc khi sửa code

1. **Luôn dùng `Security.e()`** khi render giá trị động vào HTML template strings
2. **Không dùng `element.textContent` trực tiếp** để thay đổi element có icon con — dùng `querySelector` để chọn đúng phần tử
3. **Invalidate cache sau mọi thay đổi DB**: gọi `DB.invalidateAll()` hoặc `invalidate('tableName')` sau create/update/delete
4. **RBAC check trước mọi action**: dùng `authCheck()` trong api.js hoặc `Auth.isAdmin()` / `Auth.hasPermission()`
5. **Async/await toàn bộ**: mọi thao tác DB đều async, các page render đều async
6. **Thứ tự script** trong HTML là bắt buộc — security.js phải load trước tất cả

## Các lỗi đã sửa (tham khảo)

| Lỗi | File | Mô tả |
|-----|------|-------|
| Overdue badge bị xóa icon | `app.js` | `badge.textContent` ghi đè cả `<i>` → sửa dùng `querySelector('span')` + `classList` |
| Settings không accessible | `app.js` | `adminOnly: true` sai → nhân viên không đổi được mật khẩu |
| Màn hình trắng khi load | `app.js` | `showLoading()` dùng `#appLoading` không tồn tại → xóa dead code |
| `_ensurePasswords` mỗi login | `auth.js` | Gọi mỗi lần login → chuyển vào `App.init()` một lần |
| AntiDebug interval | `security.js` | `setInterval` 3s theo dõi devtools → xóa, không cần cho tool nội bộ |

## Thêm người dùng mới

1. Admin đăng nhập → **Quản lý Người dùng** → **Thêm người dùng**
2. Hoặc seed trực tiếp vào bảng `pt_users`:
   ```json
   {
     "id": "u_xxx",
     "username": "ten_dang_nhap",
     "displayName": "Họ và Tên",
     "passwordHash": "__plain__matkhau123",
     "role": "telecom|accounting|business|admin",
     "department": "telecom|accounting|business|admin",
     "active": true,
     "avatar": "TT",
     "color": "#007bff"
   }
   ```
   → Mật khẩu sẽ tự động được hash lần đầu ứng dụng khởi động.
