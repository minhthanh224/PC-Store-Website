SET NAMES utf8mb4;

USE se104_pc_store;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM wishlists;
DELETE FROM admin_audit_logs;
DELETE FROM product_reviews;
DELETE FROM warranty_tickets;
DELETE FROM order_items;
DELETE FROM order_events;
DELETE FROM orders;
DELETE FROM serial_numbers;
DELETE FROM product_warranty_packages;
DELETE FROM warranty_packages;
DELETE FROM bundle_offers;
DELETE FROM product_promotions;
DELETE FROM promotions;
DELETE FROM commitments;
DELETE FROM product_highlights;
DELETE FROM product_specs;
DELETE FROM product_images;
DELETE FROM products;
DELETE FROM customer_addresses;
DELETE FROM categories;
DELETE FROM brands;
DELETE FROM users;

ALTER TABLE wishlists AUTO_INCREMENT = 1;
ALTER TABLE admin_audit_logs AUTO_INCREMENT = 1;
ALTER TABLE product_reviews AUTO_INCREMENT = 1;
ALTER TABLE warranty_tickets AUTO_INCREMENT = 1;
ALTER TABLE order_items AUTO_INCREMENT = 1;
ALTER TABLE order_events AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;
ALTER TABLE serial_numbers AUTO_INCREMENT = 1;
ALTER TABLE product_warranty_packages AUTO_INCREMENT = 1;
ALTER TABLE warranty_packages AUTO_INCREMENT = 1;
ALTER TABLE bundle_offers AUTO_INCREMENT = 1;
ALTER TABLE product_promotions AUTO_INCREMENT = 1;
ALTER TABLE promotions AUTO_INCREMENT = 1;
ALTER TABLE commitments AUTO_INCREMENT = 1;
ALTER TABLE product_highlights AUTO_INCREMENT = 1;
ALTER TABLE product_specs AUTO_INCREMENT = 1;
ALTER TABLE product_images AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE customer_addresses AUTO_INCREMENT = 1;
ALTER TABLE categories AUTO_INCREMENT = 1;
ALTER TABLE brands AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- Clean demo base only. The full product catalog is imported separately by Product Import V2.
-- Demo account password for all users: 123456
INSERT INTO users (id, full_name, email, phone, password_hash, role, status) VALUES
(1, 'Nguyễn Văn Khách', 'customer@example.com', '0901000001', '$2b$10$g3bY7S4pFe8R1GuN/DgALejQbrb6sEZi9UAVai1YltCO1Oitujelu', 'customer', 'active'),
(2, 'Nhân viên bán hàng AeroTech', 'sales@example.com', '0901000002', '$2b$10$g3bY7S4pFe8R1GuN/DgALejQbrb6sEZi9UAVai1YltCO1Oitujelu', 'sales', 'active'),
(3, 'Kỹ thuật viên AeroTech', 'technician@example.com', '0901000003', '$2b$10$g3bY7S4pFe8R1GuN/DgALejQbrb6sEZi9UAVai1YltCO1Oitujelu', 'technician', 'active'),
(4, 'Quản trị viên AeroTech', 'admin@example.com', '0901000004', '$2b$10$g3bY7S4pFe8R1GuN/DgALejQbrb6sEZi9UAVai1YltCO1Oitujelu', 'admin', 'active');

INSERT INTO customer_addresses (id, user_id, receiver_name, receiver_phone, province, district, ward, address_line, is_default) VALUES
(1, 1, 'Nguyễn Văn Khách', '0901000001', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', '123 Nguyễn Huệ', 1);

INSERT INTO brands (id, name, slug, description, status) VALUES
(1, 'AeroTech', 'aerotech', 'Thương hiệu và dịch vụ kỹ thuật của AeroTech.', 'active'),
(2, 'ASUS', 'asus', 'Thương hiệu laptop, linh kiện và gaming gear.', 'active'),
(3, 'Acer', 'acer', 'Thương hiệu laptop, màn hình và thiết bị PC.', 'active'),
(4, 'Apple', 'apple', 'Thương hiệu MacBook và thiết bị Apple.', 'active'),
(5, 'Dell', 'dell', 'Thương hiệu laptop, màn hình và workstation.', 'active'),
(6, 'HP', 'hp', 'Thương hiệu laptop và máy tính văn phòng.', 'active'),
(7, 'Lenovo', 'lenovo', 'Thương hiệu laptop và workstation.', 'active'),
(8, 'MSI', 'msi', 'Thương hiệu laptop gaming, mainboard và VGA.', 'active'),
(9, 'Gigabyte', 'gigabyte', 'Thương hiệu mainboard, VGA và màn hình.', 'active'),
(10, 'Intel', 'intel', 'Thương hiệu CPU và nền tảng PC.', 'active'),
(11, 'AMD', 'amd', 'Thương hiệu CPU và GPU.', 'active'),
(12, 'Corsair', 'corsair', 'Thương hiệu RAM, PSU, case và phụ kiện.', 'active'),
(13, 'Kingston', 'kingston', 'Thương hiệu RAM và SSD.', 'active'),
(14, 'Samsung', 'samsung', 'Thương hiệu SSD và màn hình.', 'active'),
(15, 'LG', 'lg', 'Thương hiệu màn hình.', 'active'),
(16, 'Logitech', 'logitech', 'Thương hiệu gaming gear và phụ kiện.', 'active'),
(17, 'Razer', 'razer', 'Thương hiệu gaming gear.', 'active'),
(18, 'SteelSeries', 'steelseries', 'Thương hiệu gaming gear.', 'active'),
(19, 'Akko', 'akko', 'Thương hiệu bàn phím cơ.', 'active'),
(20, 'Ugreen', 'ugreen', 'Thương hiệu phụ kiện kết nối.', 'active');

INSERT INTO categories (id, parent_id, name, slug, description, status) VALUES
(1, NULL, 'PC Build', 'pc-build', 'Máy tính bàn build sẵn và cấu hình theo nhu cầu.', 'active'),
(2, 1, 'PC Gaming', 'pc-gaming', 'PC build dành cho gaming.', 'active'),
(3, 1, 'PC Văn phòng Workstation', 'pc-van-phong-workstation', 'PC văn phòng, workstation và creator.', 'active'),
(4, NULL, 'Laptop', 'laptop', 'Laptop gaming, văn phòng, creator và MacBook.', 'active'),
(5, 4, 'Laptop Gaming', 'laptop-gaming', 'Laptop hiệu năng cao cho gaming.', 'active'),
(6, 4, 'Laptop Văn phòng', 'laptop-van-phong', 'Laptop mỏng nhẹ và văn phòng.', 'active'),
(7, 4, 'Ultrabook Creator', 'ultrabook-creator', 'Ultrabook và laptop cho sáng tạo nội dung.', 'active'),
(8, 4, 'MacBook', 'macbook', 'MacBook Air và MacBook Pro.', 'active'),
(9, NULL, 'Linh Kiện PC', 'linh-kien-pc', 'Linh kiện nâng cấp và build PC.', 'active'),
(10, 9, 'CPU', 'cpu', 'Bộ vi xử lý máy tính.', 'active'),
(11, 9, 'Mainboard', 'mainboard', 'Bo mạch chủ PC.', 'active'),
(12, 9, 'VGA', 'vga', 'Card đồ họa rời.', 'active'),
(13, 9, 'RAM', 'ram', 'Bộ nhớ trong cho PC và laptop.', 'active'),
(14, 9, 'SSD', 'ssd', 'Ổ cứng SSD và lưu trữ tốc độ cao.', 'active'),
(15, 9, 'Nguồn máy tính', 'nguon-may-tinh', 'Nguồn PSU cho PC.', 'active'),
(16, 9, 'Vỏ case', 'vo-case', 'Vỏ case máy tính.', 'active'),
(17, 9, 'Tản nhiệt', 'tan-nhiet', 'Tản nhiệt khí và tản nhiệt nước.', 'active'),
(18, NULL, 'Màn Hình', 'man-hinh', 'Màn hình gaming, văn phòng và đồ họa.', 'active'),
(19, 18, 'Màn hình Gaming', 'man-hinh-gaming', 'Màn hình tần số quét cao cho game.', 'active'),
(20, 18, 'Màn hình Văn phòng', 'man-hinh-van-phong', 'Màn hình làm việc văn phòng, học tập và setup đa nhiệm.', 'active'),
(21, NULL, 'Gaming Gear', 'gaming-gear', 'Bàn phím, chuột, tai nghe và phụ kiện gaming.', 'active'),
(22, 21, 'Bàn phím', 'ban-phim', 'Bàn phím cơ và bàn phím gaming.', 'active'),
(23, 21, 'Chuột', 'chuot', 'Chuột gaming và chuột văn phòng.', 'active'),
(24, 21, 'Tai nghe', 'tai-nghe', 'Tai nghe gaming và tai nghe làm việc.', 'active'),
(25, 21, 'Lót chuột', 'lot-chuot', 'Lót chuột nhiều kích thước.', 'active'),
(26, 21, 'Ghế bàn gaming', 'ghe-ban-gaming', 'Ghế và bàn gaming/setup.', 'active'),
(27, NULL, 'Phụ Kiện', 'phu-kien', 'Phụ kiện kết nối, webcam, mic và loa.', 'active'),
(28, 27, 'Phụ kiện setup', 'phu-kien-setup', 'Hub, dock, arm màn hình và phụ kiện setup.', 'active'),
(29, 27, 'Webcam Mic Speaker', 'webcam-mic-speaker', 'Webcam, microphone, loa và thiết bị stream.', 'active'),
(30, NULL, 'Dịch Vụ', 'dich-vu', 'Dịch vụ kỹ thuật AeroTech.', 'active'),
(31, 30, 'Dịch vụ kỹ thuật', 'dich-vu-ky-thuat', 'Build PC, vệ sinh, cài đặt và nâng cấp.', 'active'),
(32, 18, 'Màn hình Đồ họa', 'man-hinh-do-hoa', 'Màn hình cho thiết kế, màu sắc và sáng tạo nội dung.', 'active');

INSERT INTO commitments (id, scope_type, scope_value, title, description, icon, sort_order) VALUES
(1, 'global', NULL, 'Hàng chính hãng', 'AeroTech ưu tiên sản phẩm rõ nguồn gốc và chính sách bảo hành minh bạch.', 'shield', 1),
(2, 'global', NULL, 'Tư vấn cấu hình', 'Nhân viên hỗ trợ chọn cấu hình theo nhu cầu học tập, làm việc, gaming và sáng tạo.', 'headphones', 2),
(3, 'global', NULL, 'Hỗ trợ kỹ thuật', 'Kỹ thuật viên hỗ trợ cài đặt, nâng cấp và xử lý sau bán hàng.', 'tool', 3),
(4, 'global', NULL, 'Giao hàng an toàn', 'Sản phẩm được đóng gói và bàn giao theo quy trình kiểm tra cơ bản.', 'truck', 4);
