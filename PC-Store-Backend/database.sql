-- Xóa CSDL nếu đã tồn tại và tạo mới
DROP DATABASE IF EXISTS pc_store_db;
CREATE DATABASE pc_store_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pc_store_db;

-- Bảng Người dùng (Users)
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff', 'customer') DEFAULT 'customer',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Hãng sản xuất (Brands)
CREATE TABLE Brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Bảng Danh mục (Categories)
CREATE TABLE Categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Bảng Sản phẩm (Products)
CREATE TABLE Products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand_id INT,
    category_id INT,
    cpu VARCHAR(100),
    ram_storage VARCHAR(150),
    price DECIMAL(15, 2) NOT NULL,
    warranty_months INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES Brands(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL
);

-- Bảng Quản lý mã Serial (ProductSerials)
CREATE TABLE ProductSerials (
    serial_number VARCHAR(100) PRIMARY KEY,
    product_id INT NOT NULL,
    status ENUM('in_stock', 'sold', 'warranty', 'returned') DEFAULT 'in_stock',
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);

-- Bảng Đơn hàng (Orders)
CREATE TABLE Orders (
    id VARCHAR(20) PRIMARY KEY, -- Ví dụ: ORD-0012
    user_id INT, -- Có thể NULL nếu khách vãng lai mua hàng không đăng ký
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    payment_method ENUM('COD', 'ChuyenKhoan') NOT NULL,
    status ENUM('ChoDuyet', 'DangGiao', 'HoanThanh', 'DaHuy') DEFAULT 'ChoDuyet',
    total_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- Bảng Chi tiết Đơn hàng (OrderDetails)
CREATE TABLE OrderDetails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    product_id INT NOT NULL,
    serial_number VARCHAR(100), -- Chỉ được gán khi Đơn hàng chuyển sang 'DangGiao'
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
    FOREIGN KEY (serial_number) REFERENCES ProductSerials(serial_number) ON DELETE SET NULL
);

-- Bảng Tiếp nhận Bảo hành (Warranties)
CREATE TABLE Warranties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL,
    order_id VARCHAR(20),
    customer_name VARCHAR(100) NOT NULL,
    issue_description TEXT NOT NULL,
    handling_method ENUM('DoiMoi', 'GuiHang', 'SuaChuaTaiShop') NOT NULL,
    status ENUM('TiepNhan', 'DangSua', 'DaXong', 'DaTraKhach') DEFAULT 'TiepNhan',
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP NULL,
    FOREIGN KEY (serial_number) REFERENCES ProductSerials(serial_number) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE SET NULL
);

-- Seed dữ liệu mẫu cơ bản
INSERT INTO Users (full_name, phone, email, password, role) VALUES 
('Admin', '0987654321', 'admin@aerotech.com', 'admin123', 'admin'),
('Nguyễn Văn A', '0912345678', 'khachhang@gmail.com', '12345678', 'customer');
