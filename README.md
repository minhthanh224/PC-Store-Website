# AeroTech - Website bán PC, laptop, linh kiện và dịch vụ kỹ thuật

AeroTech là website thương mại điện tử mô phỏng cửa hàng máy tính, phục vụ đồ án môn SE104 - Nhập môn Công nghệ phần mềm. Hệ thống hỗ trợ khách hàng mua PC build, laptop, linh kiện, màn hình, phụ kiện, gaming gear và sử dụng dịch vụ kỹ thuật. Phần quản trị hỗ trợ vận hành đơn hàng, kho serial, bảo hành, đánh giá, báo cáo và import sản phẩm hàng loạt.

## Thành viên nhóm

- Trần Lê Minh Thành
- Trần Bình Minh
- Nguyễn Công Thành
- Nguyễn Ngọc Thiên Phú

## Công nghệ sử dụng

- Frontend: HTML, CSS, JavaScript thuần
- Backend: Node.js, Express.js
- Database: MySQL
- Xác thực: JWT, bcryptjs, localStorage phía frontend
- Thư viện chính: mysql2, multer, adm-zip, csv-parse, helmet, express-rate-limit, cors

## Tính năng chính

### Khách vãng lai

- Xem trang chủ, danh mục, danh sách sản phẩm và dịch vụ kỹ thuật.
- Tìm kiếm, lọc, sắp xếp sản phẩm.
- Xem chi tiết sản phẩm, thông số kỹ thuật, ảnh và đánh giá đang hiển thị.
- So sánh sản phẩm bằng danh sách so sánh lưu ở trình duyệt.
- Đăng ký, đăng nhập.
- Tra cứu bảo hành bằng serial nếu có dữ liệu phù hợp.

### Khách hàng

- Quản lý tài khoản cá nhân.
- Thêm sản phẩm yêu thích.
- Quản lý giỏ hàng và checkout.
- Xem lịch sử đơn hàng và chi tiết đơn hàng.
- Đánh giá sản phẩm đã mua trong đơn hoàn thành.
- Xem sản phẩm đã mua để yêu cầu bảo hành.
- Theo dõi trạng thái phiếu bảo hành.

### Nhân viên bán hàng

- Xem, duyệt và cập nhật trạng thái đơn hàng.
- Theo dõi đơn cần gán serial.
- Chuyển trạng thái đơn theo quy trình xử lý bán hàng.

### Kỹ thuật viên

- Quản lý kho serial.
- Thêm và import serial demo nếu cần.
- Tạo, xem và cập nhật phiếu bảo hành.
- Tra cứu serial và tình trạng bảo hành.

### Quản trị viên

- Quản lý sản phẩm, danh mục, thương hiệu.
- Import sản phẩm hàng loạt bằng file zip CSV.
- Quản lý người dùng, đánh giá, đơn hàng, kho serial và bảo hành.
- Xem dashboard, báo cáo và nhật ký hệ thống.

## Luồng nghiệp vụ nổi bật

Hệ thống phân biệt sản phẩm có serial và không có serial:

- Sản phẩm không serial được giữ tồn khi đơn ở trạng thái pending, approved, shipping và trừ tồn thật khi đơn completed.
- Sản phẩm có serial cần được gán serial trước khi hoàn tất đơn hàng.
- Serial đã bán liên kết với đơn hàng và dùng làm cơ sở tra cứu bảo hành.
- Khách hàng có thể tạo yêu cầu bảo hành từ sản phẩm đã mua hợp lệ.
- Admin hoặc kỹ thuật viên tiếp nhận, cập nhật và theo dõi phiếu bảo hành.

Luồng chính: `Order -> Order Item -> Serial -> Warranty Ticket -> Report`.

## Cấu trúc thư mục

```text
backend/      Backend Express, routes, controllers, services, middleware, scripts
frontend/     Giao diện HTML/CSS/JavaScript và assets
database/     schema.sql và seed.sql
package.json  Script chạy project từ root
```

## Hướng dẫn cài đặt

1. Cài Node.js, npm và MySQL.

2. Cài dependency:

```bash
npm install
```

Root `postinstall` sẽ cài dependency cho thư mục `backend/`.

3. Tạo database MySQL và cấu hình môi trường:

```bash
copy .env.example backend\.env
```

Chỉnh `backend/.env` theo MySQL local. Không commit file `.env`.

4. Reset và import database clean demo:

PowerShell:

```powershell
$env:CONFIRM_DB_RESET="YES"; npm run db:reset; Remove-Item Env:CONFIRM_DB_RESET
```

5. Nếu cần thêm serial demo cho sản phẩm serialized:

```powershell
$env:CONFIRM_DEMO_SERIALS="YES"; npm run seed:demo-serials; Remove-Item Env:CONFIRM_DEMO_SERIALS
```

6. Nếu cần dữ liệu vận hành demo như đơn hàng, review, ticket bảo hành:

```powershell
$env:CONFIRM_DEMO_BUSINESS_DATA="YES"; npm run seed:demo-business; Remove-Item Env:CONFIRM_DEMO_BUSINESS_DATA
```

7. Chạy server:

```bash
npm run dev
```

Mở website tại:

```text
http://localhost:5000
```

## Tài khoản demo

Các tài khoản có sẵn trong `database/seed.sql` dùng mật khẩu `123456`:

- `customer@example.com` - Khách hàng
- `admin@example.com` - Quản trị viên
- `sales@example.com` - Nhân viên bán hàng
- `technician@example.com` - Kỹ thuật viên

Script `seed:demo-business` có thể tạo thêm các tài khoản demo khác với mật khẩu riêng được in ra khi chạy script.

## Hướng dẫn test nhanh

1. Login bằng `customer@example.com`.
2. Mở danh sách sản phẩm, lọc/tìm kiếm sản phẩm.
3. Thêm sản phẩm vào giỏ hàng và checkout.
4. Login bằng `sales@example.com` hoặc `admin@example.com` để duyệt đơn.
5. Với sản phẩm cần serial, login technician/admin để gán serial trước khi hoàn tất đơn.
6. Chuyển đơn sang shipping và completed.
7. Customer mở lịch sử đơn hàng, xem chi tiết đơn và gửi đánh giá.
8. Admin quản lý trạng thái hiển thị đánh giá trong trang quản lý đánh giá.
9. Customer mở trang bảo hành, tạo yêu cầu bảo hành cho sản phẩm hợp lệ.
10. Technician cập nhật trạng thái phiếu bảo hành.
11. Admin xem dashboard và báo cáo.

## Ghi chú và giới hạn

- Website chưa tích hợp thanh toán thật.
- Website chưa tích hợp đơn vị vận chuyển thật.
- Dữ liệu sản phẩm và đơn hàng phục vụ mục đích học tập, demo và kiểm thử.
- Một số dịch vụ kỹ thuật cần tư vấn thủ công trước khi tiếp nhận.
- Khi nộp hoặc triển khai, không đưa `.env`, `node_modules/`, file log, file zip import hoặc dữ liệu tạm vào source.
