USE se104_pc_store;

ALTER TABLE users
  ADD UNIQUE KEY uk_users_phone (phone);

ALTER TABLE products
  ADD COLUMN cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER base_price;

ALTER TABLE orders
  MODIFY COLUMN status ENUM('pending', 'approved', 'shipping', 'completed', 'cancelled', 'returned') NOT NULL DEFAULT 'pending';

ALTER TABLE warranty_tickets
  ADD COLUMN handling_method ENUM('exchange', 'send_vendor', 'shop_repair', 'paid_repair') NOT NULL DEFAULT 'shop_repair' AFTER technician_note,
  ADD COLUMN service_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER handling_method;
