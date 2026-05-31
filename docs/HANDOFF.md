# AeroTech PC Store - Handoff

## Tổng quan

AeroTech PC Store là website bán PC, laptop, linh kiện, phụ kiện và dịch vụ kỹ thuật. Project đang ở mức demo nâng cao/semi-real: có storefront, customer account, checkout, admin operations, serial/warranty, import/export, report và audit.

## Stack

- Frontend: HTML, CSS, JavaScript thuần trong `frontend/`.
- Backend: Node.js + Express trong `backend/`.
- Database: MySQL, schema/seed trong `database/`.
- Auth: JWT + bcryptjs.
- Roles: `admin`, `sales`, `technician`, `customer`.

## Chạy local

1. Chạy `npm install` ở root.
2. Tạo `backend/.env` từ `.env.example` hoặc `backend/.env.example`.
3. Reset DB local bằng `CONFIRM_DB_RESET=YES npm run db:reset`.
4. Chạy `npm run dev`.
5. Mở `http://localhost:5000`.

`db:reset` bị chặn khi thiếu `CONFIRM_DB_RESET=YES` và khi `NODE_ENV=production`. Script drop/recreate toàn bộ database local theo `DB_NAME`, import `schema.sql`, rồi import `seed.sql`.

`seed.sql` hiện là clean demo base: chỉ giữ demo users, địa chỉ mẫu, brand/category nền và commitments cơ bản. File seed không còn seed catalog sản phẩm, orders, serials, warranty tickets, product reviews hoặc wishlists cũ. Catalog đầy đủ được import bằng Product Import V2 từ file zip riêng.

Flow import catalog mới:

1. Chạy `$env:CONFIRM_DB_RESET="YES"; npm run db:reset` trên PowerShell.
2. Login admin bằng `admin@example.com`.
3. Vào Admin -> Sản phẩm -> tab Thêm sản phẩm.
4. Chọn `aerotech-product-import-final-real-images.zip`.
5. Chọn `Reset catalog`, nhập `RESET CATALOG`, preview.
6. Confirm import khi errors = 0.
7. Import `serial_demo.csv` riêng trong Kho Serial nếu cần dữ liệu serial.

Không dùng `replaceCatalog` trên database đã có orders/serial/warranty/reviews thật.

## CORS cho local/demo tunnel

- `CORS_ORIGIN` là whitelist explicit, phân tách bằng dấu phẩy.
- Development mặc định hỗ trợ các origin local phổ biến và có thể cho phép `https://*.trycloudflare.com`.
- Dùng khi demo Cloudflare Tunnel:

```env
CORS_ORIGIN=http://localhost:5000,http://127.0.0.1:5500,https://scoop-fell-soap-weed.trycloudflare.com
CORS_ALLOW_TUNNELS=true
```

- Production chỉ nên dùng domain chính thức trong `CORS_ORIGIN`; wildcard tunnel không được mở mặc định.

## Demo accounts

Mật khẩu seed: `123456`.

- Customer: `customer@example.com`
- Admin: `admin@example.com`
- Sales: `sales@example.com`
- Technician: `technician@example.com`

## Module chính

- Storefront: home, products, product detail, compare, wishlist.
- Customer: account, address book, my orders, order detail, warranty requests.
- Checkout: server-side pricing, promotion code, bundle add-on, extended warranty package.
- Admin catalog: products, import Product Import V2, brands, categories.
- Operations: orders, order timeline, internal notes, serial assignment, inventory/serial import-export.
- Warranty: public lookup, customer request, admin/technician workflow.
- Trust layer: review verified purchase + admin moderation, audit logs, user management.
- Reports: overview, revenue, best-selling, inventory, warranty/order summaries, CSV export.

## Flow đã smoke test

- Login demo 4 roles.
- Admin user management role guards, lock/unlock, password reset, audit logs.
- `db:reset` guard và import schema/seed vào DB tạm.
- `/api/health`, account profile, `/api/admin/users`.
- Static `node --check` cho backend/frontend JS.

## Điểm cần cẩn thận

- Không đổi checkout/order/stock/serial/warranty nếu không có regression test.
- Không reset DB chính khi chưa backup.
- Không dùng Product Import `replaceCatalog` ở production.
- Không ghi password/token/password_hash vào audit metadata.
- Khi thêm trạng thái đơn hàng mới, phải cập nhật schema, order events, frontend labels, stock reversal và reports cùng lúc.
