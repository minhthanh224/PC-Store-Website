const db = require('../config/db');

// Tạo đơn hàng mới (UC-11: Đặt hàng)
exports.createOrder = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { customer_name, customer_phone, customer_address, payment_method, items } = req.body;

        if (!customer_name || !customer_phone || !customer_address || !payment_method || !items || items.length === 0) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin đơn hàng.' });
        }

        // Generate order ID: ORD-YYYYMMDD-XXXX
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const [countResult] = await conn.query('SELECT COUNT(*) as cnt FROM Orders');
        const orderNum = (countResult[0].cnt + 1).toString().padStart(4, '0');
        const orderId = `ORD-${dateStr}-${orderNum}`;

        // Calculate total
        const total_amount = items.reduce((sum, item) => sum + item.price * item.qty, 0);

        // Get user_id from auth token if available
        const user_id = req.user?.id || null;

        // Insert order
        await conn.query(
            `INSERT INTO Orders (id, user_id, customer_name, customer_phone, customer_address, payment_method, status, total_amount)
             VALUES (?, ?, ?, ?, ?, ?, 'ChoDuyet', ?)`,
            [orderId, user_id, customer_name, customer_phone, customer_address, payment_method, total_amount]
        );

        // Insert order details
        for (const item of items) {
            await conn.query(
                `INSERT INTO OrderDetails (order_id, product_id, quantity, unit_price)
                 VALUES (?, ?, ?, ?)`,
                [orderId, item.id, item.qty, item.price]
            );
        }

        await conn.commit();
        res.status(201).json({ message: 'Đặt hàng thành công!', orderId });

    } catch (error) {
        await conn.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Lỗi server khi tạo đơn hàng.' });
    } finally {
        conn.release();
    }
};

// Lấy danh sách đơn hàng (Admin: UC-18)
exports.getOrders = async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*, 
                    (SELECT COUNT(*) FROM OrderDetails od WHERE od.order_id = o.id) as item_count
             FROM Orders o 
             ORDER BY o.created_at DESC`
        );
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

// Lấy chi tiết 1 đơn hàng
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const [orders] = await db.query('SELECT * FROM Orders WHERE id = ?', [id]);
        if (orders.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        const [details] = await db.query(
            `SELECT od.*, p.name as product_name, p.image_url 
             FROM OrderDetails od 
             JOIN Products p ON od.product_id = p.id 
             WHERE od.order_id = ?`, [id]
        );

        res.json({ order: orders[0], details });
    } catch (error) {
        console.error('Get order detail error:', error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

// Cập nhật trạng thái đơn hàng (Admin: UC-20)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ChoDuyet', 'DangGiao', 'HoanThanh', 'DaHuy'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }

        // Check current status to prevent backward transitions
        const [orders] = await db.query('SELECT status FROM Orders WHERE id = ?', [id]);
        if (orders.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        const currentStatus = orders[0].status;
        const statusOrder = { 'ChoDuyet': 0, 'DangGiao': 1, 'HoanThanh': 2, 'DaHuy': 3 };

        // Allow cancel from any state, but don't allow backward for others
        if (status !== 'DaHuy' && statusOrder[status] <= statusOrder[currentStatus]) {
            return res.status(400).json({ message: 'Không thể đổi ngược trạng thái đơn hàng.' });
        }

        await db.query('UPDATE Orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: `Đã cập nhật trạng thái thành "${status}".` });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};
