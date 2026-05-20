# AeroTech Codebase Review Notes

## Codebase đã xem

- `backend/src/app.js`
- `backend/src/routes/*`
- `backend/src/controllers/*`
- `backend/src/services/*`
- `frontend/*.html`
- `frontend/admin/*.html`
- `frontend/assets/css/style.css`
- `frontend/assets/js/*.js`
- `frontend/assets/js/admin/*.js`
- `database/schema.sql`
- `database/seed.sql`
- `docs/*.md`

## Nhận xét nhanh

### Điểm mạnh

- Cấu trúc backend khá rõ: routes, controllers, services, middlewares.
- API admin/customer đã tách khá đầy đủ.
- Role middleware đã có.
- Stock availability đã tính cả đơn pending/approved/shipping.
- Serialized product được tách order item quantity = 1.
- Warranty workflow đã có service riêng.
- Documentation đã có nền tảng tốt.

### Điểm cần sửa sớm

- Admin CSS bị chồng chéo với customer CSS trong `style.css`.
- `style.css` rất dài, nên tách admin style ra để dễ maintain.
- UI admin còn dùng nhiều nền tối và tương phản thấp.
- Nhiều table admin bị text quá nhạt.
- Seed/UI còn dấu vết demo/phase ở vài nơi.
- Product reviews thiếu admin moderation page.
- Zip đang chứa `node_modules`, không nên commit lên git.

### Gợi ý kỹ thuật

- Tạo CSS admin riêng:
  - `frontend/assets/css/admin-base.css`
  - `frontend/assets/css/admin-layout.css`
  - `frontend/assets/css/admin-components.css`
  - `frontend/assets/css/admin-pages.css`
- Hoặc tối thiểu tạo `frontend/assets/css/admin.css`.
- Cho các trang `frontend/admin/*.html` dùng thêm admin CSS sau `style.css` để override sạch.
- Không nên sửa customer CSS quá nhiều trong phase admin.

