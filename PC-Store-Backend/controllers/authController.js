const jwt = require('jsonwebtoken');

// Placeholder for database connection
// const db = require('../config/db');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email và mật khẩu' });
        }

        // Mock Admin Authentication
        // In real app, you will query the Database here:
        // const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        
        if (email === 'admin@aerotech.com' && password === 'admin123') {
            const token = jwt.sign(
                { id: 1, email: email, role: 'admin' }, 
                process.env.JWT_SECRET || 'fallback_secret_key', 
                { expiresIn: '1d' }
            );
            
            return res.status(200).json({
                message: 'Đăng nhập thành công',
                token,
                user: {
                    id: 1,
                    email: email,
                    role: 'admin',
                    name: 'Administrator'
                }
            });
        }
        
        // Mock Customer
        if (password.length >= 8) {
             const token = jwt.sign(
                { id: 2, email: email, role: 'customer' }, 
                process.env.JWT_SECRET || 'fallback_secret_key', 
                { expiresIn: '1d' }
            );
            return res.status(200).json({
                message: 'Đăng nhập thành công',
                token,
                user: {
                    id: 2,
                    email: email,
                    role: 'customer',
                    name: email.split('@')[0]
                }
            });
        }

        return res.status(401).json({ message: 'Thông tin đăng nhập không hợp lệ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
