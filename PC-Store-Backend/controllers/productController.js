const db = require('../config/db');

// Lấy danh sách sản phẩm
exports.getProducts = async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM Products');
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Thêm sản phẩm mới (UC-13)
exports.createProduct = async (req, res) => {
    try {
        const { name, brand_id, category_id, cpu, ram_storage, price, warranty_months, description } = req.body;
        
        // Lấy đường dẫn file nếu có upload thành công
        let image_url = null;
        if (req.file) {
            image_url = `http://localhost:5000/uploads/products/${req.file.filename}`;
        }
        
        const [result] = await db.query(
            'INSERT INTO Products (name, brand_id, category_id, cpu, ram_storage, price, warranty_months, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, brand_id || null, category_id || null, cpu, ram_storage, price, warranty_months, description, image_url]
        );
        
        res.status(201).json({ message: 'Thêm sản phẩm thành công', productId: result.insertId });
    } catch (error) {


        console.error(error);
        res.status(500).json({ message: 'Lỗi khi thêm sản phẩm' });
    }
};

// Nhập kho theo Serial (UC-15)
exports.importSerials = async (req, res) => {
    try {
        const { productId } = req.params;
        const { serials } = req.body; // serials is an array of strings e.g. ["SN001", "SN002"]

        if (!Array.isArray(serials) || serials.length === 0) {
            return res.status(400).json({ message: 'Danh sách serial không hợp lệ' });
        }

        const values = serials.map(sn => [sn, productId, 'in_stock']);
        
        // Insert multiple rows
        await db.query(
            'INSERT INTO ProductSerials (serial_number, product_id, status) VALUES ?',
            [values]
        );

        res.status(201).json({ message: `Đã nhập kho thành công ${serials.length} mã serial` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi nhập serial. Có thể mã S/N bị trùng lặp trong hệ thống.' });
    }
};
