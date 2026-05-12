# PC Store Project

Đây là dự án PC Store bao gồm backend API và website frontend.

## Cấu trúc dự án

- `PC-Store-Backend/`: Backend API được xây dựng bằng Node.js và Express
- `PC-Store-Website/`: Frontend website

## Hướng dẫn cài đặt Backend

### Yêu cầu hệ thống

- Node.js (phiên bản 14 trở lên)
- MySQL

### Các bước cài đặt

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd PC-Store
   ```

2. **Cài đặt dependencies:**
   ```bash
   cd PC-Store-Backend
   npm install
   ```

3. **Thiết lập cơ sở dữ liệu:**
   - Tạo database MySQL mới (ví dụ: `pc_store_db`)
   - Import file `database.sql` vào database:
     ```sql
     mysql -u <username> -p <database_name> < database.sql
     ```

4. **Tạo file .env:**
   Tạo file `.env` trong thư mục `PC-Store-Backend/` với nội dung sau:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=pc_store_db
   JWT_SECRET=your_jwt_secret_key
   ```

5. **Chạy server:**
   ```bash
   npm start
   ```
   Hoặc để development:
   ```bash
   npm run dev
   ```

Server sẽ chạy trên `http://localhost:5000`

## API Endpoints

- `GET /`: Welcome message
- `POST /api/auth/login`: Đăng nhập
- `POST /api/auth/register`: Đăng ký
- `GET /api/products`: Lấy danh sách sản phẩm
- `POST /api/products`: Thêm sản phẩm (yêu cầu auth)

## Frontend

Để chạy frontend, mở file `PC-Store-Website/index.html` trong trình duyệt hoặc sử dụng server local.

## Đóng góp

1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request