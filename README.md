# AeroTech PC Store

AeroTech PC Store là website bán PC, laptop, linh kiện và dịch vụ kỹ thuật cho đồ án SE104.
Project dùng frontend HTML/CSS/JavaScript thuần, backend Node.js + Express và MySQL.

## Chạy local

1. Cài dependency:

```bash
npm install
```

2. Tạo `backend/.env` từ `.env.example` hoặc `backend/.env.example`, sau đó chỉnh thông tin MySQL và `JWT_SECRET`.

3. Reset database local:

```bash
CONFIRM_DB_RESET=YES npm run db:reset
```

Trên PowerShell:

```powershell
$env:CONFIRM_DB_RESET="YES"; npm run db:reset
```

Sau reset, database ở trạng thái clean demo base: có tài khoản demo, brand/category nền và không có product/order/serial/warranty/review/wishlist cũ. Catalog đầy đủ được import riêng bằng Product Import V2, không nằm trong `seed.sql`.

Để import catalog mới:

1. Login admin.
2. Vào Admin -> Sản phẩm -> tab Thêm sản phẩm.
3. Chọn `aerotech-product-import-final-real-images.zip`.
4. Chọn `Reset catalog`, nhập `RESET CATALOG`, preview rồi confirm khi errors = 0.
5. Import `serial_demo.csv` riêng trong Kho Serial nếu cần dữ liệu serial demo.

4. Chạy server:

```bash
npm run dev
```

Mặc định app chạy tại `http://localhost:5000`.

## CORS khi demo qua Cloudflare Tunnel

Backend luôn ưu tiên whitelist trong `CORS_ORIGIN`. Khi chạy local/demo với `NODE_ENV=development`, có thể bật wildcard tunnel để các URL `https://*.trycloudflare.com` đổi liên tục vẫn gọi API được:

```env
CORS_ORIGIN=http://localhost:5000,http://127.0.0.1:5500,https://scoop-fell-soap-weed.trycloudflare.com
CORS_ALLOW_TUNNELS=true
```

Ở production, không dùng wildcard tunnel. Hãy thêm domain chính thức vào `CORS_ORIGIN` và giữ Cloudflare Tunnel wildcard tắt.

## Demo accounts

Tài khoản seed dùng mật khẩu `123456`:

- `customer@example.com`
- `admin@example.com`
- `sales@example.com`
- `technician@example.com`

## Tài liệu bàn giao

- [docs/HANDOFF.md](docs/HANDOFF.md)
- [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)
- [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)
- [docs/FEATURE_MAP.md](docs/FEATURE_MAP.md)

Không commit `.env`, `node_modules`, file zip test, log hoặc dữ liệu tạm.
