const db = require('../config/db');

// Lấy danh sách sản phẩm (JOIN Brands & Categories)
exports.getProducts = async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT 
                p.*,
                b.name AS brand_name,
                c.name AS category_name,
                (SELECT COUNT(*) FROM ProductSerials ps WHERE ps.product_id = p.id AND ps.status = 'in_stock') AS stock_count
            FROM Products p
            LEFT JOIN Brands b ON p.brand_id = b.id
            LEFT JOIN Categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Thêm sản phẩm mới (UC-13)
exports.createProduct = async (req, res) => {
    try {
        const { name, brand_id, category_id, cpu, ram_storage, display, price, warranty_months, description } = req.body;
        
        // Lấy đường dẫn file nếu có upload thành công
        let image_url = null;
        if (req.file) {
            image_url = `http://localhost:5000/uploads/products/${req.file.filename}`;
        }
        
        const [result] = await db.query(
            'INSERT INTO Products (name, brand_id, category_id, cpu, ram_storage, display, price, warranty_months, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, brand_id || null, category_id || null, cpu, ram_storage, display, price, warranty_months, description, image_url]
        );
        
        res.status(201).json({ message: 'Thêm sản phẩm thành công', productId: result.insertId });
    } catch (error) {


        console.error(error);
        res.status(500).json({ message: 'Lỗi khi thêm sản phẩm' });
    }
};

// Sửa sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, brand_id, category_id, cpu, ram_storage, display, price, warranty_months, description } = req.body;
        
        let query = 'UPDATE Products SET name=?, brand_id=?, category_id=?, cpu=?, ram_storage=?, display=?, price=?, warranty_months=?, description=?';
        let params = [name, brand_id || null, category_id || null, cpu, ram_storage, display, price, warranty_months, description];
        
        // Nếu có upload file ảnh mới thì cập nhật, không thì giữ nguyên
        if (req.file) {
            const image_url = `http://localhost:5000/uploads/products/${req.file.filename}`;
            query += ', image_url=?';
            params.push(image_url);
        }
        
        query += ' WHERE id=?';
        params.push(id);
        
        const [result] = await db.query(query, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        
        res.json({ message: 'Cập nhật sản phẩm thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm' });
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
