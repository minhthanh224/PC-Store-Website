-- ============================================
-- SEED 20 SẢN PHẨM MẪU ĐỂ DEMO WEB AEROTECH
-- ============================================
USE pc_store_db;

INSERT INTO Products (name, brand_id, category_id, cpu, ram_storage, display, price, warranty_months, image_url, description) VALUES

-- LAPTOP GAMING (category_id = 1)
('ASUS ROG Strix G16 2024', 1, 1, 'Intel Core i9-14900HX', 'RTX 4070, 32GB DDR5, 1TB NVMe Gen4', '16 inch QHD+ IPS, 240Hz', 42990000, 24, 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop', 'Laptop gaming hiệu năng khủng với tản nhiệt ROG'),
('MSI Katana 15 B13V', 5, 1, 'Intel Core i7-13620H', 'RTX 4060, 16GB DDR5, 512GB NVMe Gen4', '15.6 inch FHD IPS, 144Hz', 27490000, 24, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop', 'Laptop gaming tầm trung mạnh mẽ, thiết kế hầm hố, bàn phím RGB'),
('Lenovo Legion Pro 5 16IRX9', 4, 1, 'Intel Core i9-14900HX', 'RTX 4070, 32GB DDR5, 1TB NVMe Gen4', '16 inch WQXGA IPS, 240Hz', 48990000, 24, 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop', 'Laptop gaming cao cấp với màn hình 16 inch WQXGA 240Hz'),
('ASUS TUF Gaming A15 2024', 1, 1, 'AMD Ryzen 7 7735HS', 'RTX 4060, 16GB DDR5, 512GB NVMe Gen3', '15.6 inch FHD IPS, 144Hz', 24990000, 24, 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=800&auto=format&fit=crop', 'Laptop gaming bền bỉ chuẩn quân đội, tản nhiệt kép Arc Flow'),
('MSI Raider GE78 HX 2024', 5, 1, 'Intel Core i9-14900HX', 'RTX 4080, 64GB DDR5, 2TB NVMe Gen4', '17 inch UHD+ Mini LED, 120Hz', 72990000, 24, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop', 'Laptop gaming đỉnh cao với màn hình 17 inch UHD+ Mini LED'),

-- ULTRABOOK (category_id = 2)
('Dell XPS 14 9440', 2, 2, 'Intel Core Ultra 7 155H', '32GB LPDDR5x, 1TB NVMe Gen4', '14.5 inch 3.2K OLED, 120Hz', 39990000, 24, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop', 'Ultrabook cao cấp viền mỏng InfinityEdge'),
('MacBook Pro 14 M3 Pro', 3, 2, 'Apple M3 Pro 12-Core', '18GB Unified, 512GB SSD', '14.2 inch Liquid Retina XDR, 120Hz', 49990000, 12, 'https://images.unsplash.com/photo-1626218174358-7769486c4b79?q=80&w=800&auto=format&fit=crop', 'Hiệu năng chuyên nghiệp, màn hình Liquid Retina XDR'),
('MacBook Air 15 M3', 3, 2, 'Apple M3 8-Core', '16GB Unified, 512GB SSD', '15.3 inch Liquid Retina, 60Hz', 35990000, 12, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop', 'Mỏng nhẹ ấn tượng, màn hình 15.3 inch Liquid Retina'),
('Lenovo ThinkPad X1 Carbon Gen 12', 4, 2, 'Intel Core Ultra 7 165U', '32GB LPDDR5x, 1TB NVMe Gen4', '14 inch 2.8K OLED, 120Hz', 44990000, 36, 'https://images.unsplash.com/photo-1629131726692-1accd0c53ce0?q=80&w=800&auto=format&fit=crop', 'Laptop doanh nhân huyền thoại, 1.08kg'),
('ASUS Zenbook 14 OLED UX3405', 1, 2, 'Intel Core Ultra 9 185H', '32GB LPDDR5x, 1TB NVMe Gen4', '14 inch 2.8K OLED, 120Hz', 32990000, 24, 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=800&auto=format&fit=crop', 'Ultrabook OLED sắc nét, Intel AI Boost NPU, chỉ 1.28kg'),

-- PC LẮP RÁP (category_id = 3)
('AeroTech Phantom RTX 4060', NULL, 3, 'Intel Core i5-14400F', 'RTX 4060, 16GB DDR5, 500GB NVMe Gen4', NULL, 18500000, 36, 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=800&auto=format&fit=crop', 'PC Gaming giá tốt nhất phân khúc, chơi mượt mọi game AAA'),
('AeroTech Storm RTX 4070 Super', NULL, 3, 'AMD Ryzen 7 7800X3D', 'RTX 4070 Super, 32GB DDR5, 1TB NVMe Gen4', NULL, 29900000, 36, 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=800&auto=format&fit=crop', 'PC Gaming cấu hình mạnh với CPU gaming tốt nhất'),
('AeroTech Titan RTX 4080 Super', NULL, 3, 'Intel Core i7-14700KF', 'RTX 4080 Super, 32GB DDR5, 2TB NVMe Gen4', NULL, 45900000, 36, 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=800&auto=format&fit=crop', 'PC Gaming cao cấp chiến 4K Ultra, tản nhiệt nước AIO 360mm'),
('AeroTech Workstation Pro', NULL, 3, 'AMD Ryzen 9 7950X', 'RTX 4090, 64GB DDR5 ECC, 2TB NVMe Gen4', NULL, 69900000, 36, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=800&auto=format&fit=crop', 'Workstation chuyên render, AI/ML, thiết kế 3D'),

-- MÀN HÌNH (category_id = 4)
('ASUS ProArt Display PA279CRV', 1, 4, NULL, NULL, '27 inch 4K IPS, 60Hz', 14990000, 36, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=800&auto=format&fit=crop', 'Màn hình chuyên đồ họa Calman Verified, 99% DCI-P3'),
('Dell UltraSharp U2724D', 2, 4, NULL, NULL, '27 inch QHD IPS Black, 120Hz', 12490000, 36, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=800&auto=format&fit=crop', 'Công nghệ IPS Black cho độ tương phản cao, 98% DCI-P3'),
('ASUS ROG Swift OLED PG27AQDM', 1, 4, NULL, NULL, '27 inch QHD OLED, 240Hz', 19990000, 36, 'https://images.unsplash.com/photo-1616763355548-1b11cea30781?q=80&w=800&auto=format&fit=crop', 'Màn hình gaming OLED đỉnh cao, 0.03ms phản hồi'),

-- LINH KIỆN (category_id = 5)
('ASUS ROG Strix RTX 4070 Ti Super OC', 1, 5, NULL, 'Card đồ họa 16GB GDDR6X', NULL, 21990000, 36, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=800&auto=format&fit=crop', 'VGA gaming cao cấp, Aura Sync RGB'),
('Corsair Vengeance DDR5-6000 32GB', NULL, 5, NULL, 'RAM DDR5 6000MHz CL30', NULL, 3290000, 60, 'https://images.unsplash.com/photo-1562976540-1502c2145186?q=80&w=800&auto=format&fit=crop', 'Kit RAM DDR5 hiệu năng cao cho Intel và AMD'),
('Samsung 990 Pro 2TB NVMe SSD', NULL, 5, NULL, 'SSD NVMe Gen4, đọc 7450MB/s, ghi 6900MB/s', NULL, 5490000, 60, 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?q=80&w=800&auto=format&fit=crop', 'SSD PCIe 4.0 nhanh nhất hiện nay');
