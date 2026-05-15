const db = require('../config/db');

// Dashboard stats (Admin)
exports.getDashboardStats = async (req, res) => {
    try {
        const [revenue] = await db.query(
            `SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM Orders WHERE status = 'HoanThanh'`
        );
        const [pendingOrders] = await db.query(
            `SELECT COUNT(*) as count FROM Orders WHERE status = 'ChoDuyet'`
        );
        const [totalOrders] = await db.query(
            `SELECT COUNT(*) as count FROM Orders`
        );
        const [customers] = await db.query(
            `SELECT COUNT(*) as count FROM Users WHERE role = 'customer'`
        );
        const [stockCount] = await db.query(
            `SELECT COUNT(*) as count FROM ProductSerials WHERE status = 'in_stock'`
        );
        const [totalProducts] = await db.query(
            `SELECT COUNT(*) as count FROM Products`
        );
        const [recentOrders] = await db.query(
            `SELECT id, customer_name, total_amount, status, created_at 
             FROM Orders ORDER BY created_at DESC LIMIT 5`
        );

        res.json({
            total_revenue: revenue[0].total_revenue,
            pending_orders: pendingOrders[0].count,
            total_orders: totalOrders[0].count,
            customers: customers[0].count,
            stock_count: stockCount[0].count,
            total_products: totalProducts[0].count,
            recent_orders: recentOrders
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};
