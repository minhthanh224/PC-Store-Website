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

4. Chạy server:

```bash
npm run dev
```

Mặc định app chạy tại `http://localhost:5000`.

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
