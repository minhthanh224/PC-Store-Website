# AeroTech PC Store - Testing Guide

## Static checks

- `git diff --check`
- `node --check` cho toàn bộ `backend/src/**/*.js`, `backend/scripts/**/*.js`, `frontend/assets/js/**/*.js`.
- Kiểm tra `git status --short` không có `.env`, `node_modules`, zip/log/tmp cần commit nhầm.

## Database

- Chạy `db:reset` không có `CONFIRM_DB_RESET=YES`: phải fail.
- Chạy `NODE_ENV=production CONFIRM_DB_RESET=YES npm run db:reset`: phải fail.
- Chạy reset vào DB tạm: schema + seed phải import sạch.
- Kiểm tra 4 demo accounts tồn tại và `status = active`.

## Customer flow

1. Guest mở home/products/product detail.
2. Search/filter/sort/pagination products.
3. Chọn technical spec filters.
4. Thêm 2-4 sản phẩm vào compare, mở `compare.html`.
5. Login customer.
6. Thêm sản phẩm thường vào cart.
7. Chọn bundle/warranty package nếu có.
8. Áp promotion code hợp lệ/không hợp lệ.
9. Checkout bằng saved address hoặc địa chỉ mới.
10. Mở my orders và order detail.
11. In đơn hàng bằng nút `In đơn hàng`.

## Sales/Admin order flow

1. Login sales.
2. Mở Admin > Orders.
3. Duyệt đơn pending sang approved.
4. Với đơn non-serial: shipping -> completed, kiểm tra stock giảm đúng.
5. Với đơn serialized: chưa gán serial thì shipping/completed phải bị chặn.
6. Login technician/admin, gán serial.
7. Sales chuyển shipping/completed.
8. Kiểm tra order timeline và customer order detail.

## Warranty flow

1. Public warranty lookup serial hợp lệ/không tồn tại/chưa completed.
2. Customer tạo warranty request từ completed order có serial.
3. Duplicate active ticket phải bị chặn.
4. Expired serial phải bị chặn.
5. Technician cập nhật trạng thái ticket.
6. Customer xem `my-warranty.html`.

## Admin flow

- Products/import V2 preview/commit với zip nhỏ hợp lệ.
- Import invalid zip: thiếu ảnh, SKU sai, reference sai phải báo lỗi.
- Brands/categories CRUD smoke.
- Inventory serial import/export, product dropdown cho technician.
- Reviews: pending -> approved/rejected.
- Reports: overview, inventory filters, CSV exports.
- Audit logs: filter/export, không có password/token.
- Users: search/filter/create/update/lock/unlock/reset password, self-lock/self-demote bị chặn.

## Browser smoke

Test ở 390px, 768px, 1366px:

- `index.html`
- `products.html`
- `product-detail.html`
- `compare.html`
- `cart.html`
- `checkout.html`
- `account.html`
- `order-detail.html`
- `my-warranty.html`
- `admin/products.html`
- `admin/inventory.html`
- `admin/orders.html`
- `admin/order-detail.html`
- `admin/reports.html`
- `admin/audit-logs.html`
- `admin/users.html`

Kỳ vọng: không horizontal overflow nghiêm trọng, menu mobile mở/đóng được, bảng admin đọc được, form không chồng chữ.
