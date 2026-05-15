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
    display VARCHAR(150),
    price DECIMAL(15, 2) NOT NULL,
    warranty_months INT NOT NULL,
    image_url TEXT,
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
    id VARCHAR(20) PRIMARY KEY,
    user_id INT,
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
    serial_number VARCHAR(100),
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
('Nguyen Van A', '0912345678', 'khachhang@gmail.com', '12345678', 'customer');

-- Seed Brands
INSERT INTO Brands (name, description) VALUES 
('Asus', 'Hãng sản xuất laptop và linh kiện hàng đầu'),
('Dell', 'Thương hiệu máy tính nổi tiếng từ Mỹ'),
('Apple', 'Hãng công nghệ cao cấp'),
('Lenovo', 'Thương hiệu laptop phổ biến'),
('MSI', 'Chuyên gaming laptop và linh kiện');

-- Seed Categories
INSERT INTO Categories (name, description) VALUES 
('Laptop Gaming', 'Laptop chuyên game hiệu năng cao'),
('Ultrabook', 'Laptop mỏng nhẹ cao cấp'),
('PC Lắp Ráp', 'Máy tính bàn lắp ráp theo cấu hình'),
('Màn Hình', 'Màn hình máy tính các loại'),
('Linh Kiện', 'Linh kiện máy tính rời');

-- Seed Products
INSERT INTO Products (name, brand_id, category_id, cpu, ram_storage, display, price, warranty_months, description) VALUES 
('Dell XPS 15 9530', 2, 2, 'Core i7-13700H', 'RTX 4050, 16GB DDR5', '15.6 inch 3.5K OLED, 60Hz', 45990000, 24, 'Ultrabook cao cấp với màn hình OLED sắc nét'),
('Legion 5 Pro 2023', 4, 1, 'Ryzen 7 7745HX', 'RTX 4070, 16GB DDR5', '16 inch 2K IPS, 165Hz', 38490000, 24, 'Laptop gaming mạnh mẽ từ Lenovo'),
('MacBook Air M2 15 inch', 3, 2, 'Apple M2', '8GB Unified, 256GB SSD', '15.3 inch Liquid Retina, 60Hz', 29990000, 12, 'Thiết kế siêu mỏng nhẹ'),
('Phantom Gaming PC', NULL, 3, 'Core i5-13400F', 'RTX 4060, 16GB DDR5, 500GB NVMe Gen4', NULL, 21500000, 36, 'PC Gaming lắp ráp giá tốt'),
('Asus ProArt Display', 1, 4, NULL, NULL, '27 inch 4K IPS HDR, 60Hz', 12990000, 36, 'Độ chuẩn màu 100% sRGB Rec.709'),
('ROG Zephyrus G14', 1, 1, 'Ryzen 9 8945HS', 'RTX 4070, 16GB DDR5', '14 inch 3K OLED Nebula, 120Hz', 52990000, 24, 'Laptop gaming cao cấp nhất của Asus');
