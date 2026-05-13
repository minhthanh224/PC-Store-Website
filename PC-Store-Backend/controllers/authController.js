const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db');

// Đăng ký người dùng mới
exports.register = async (req, res) => {
    try {
        const { full_name, phone, email, password } = req.body;

        // Kiểm tra đầu vào
        if (!full_name || !phone || !email || !password) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Kiểm tra email đã tồn tại chưa
        const [existingUser] = await db.query('SELECT id FROM Users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email này đã được sử dụng' });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Lưu vào database
        await db.query(
            'INSERT INTO Users (full_name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [full_name, phone, email, hashedPassword, 'customer']
        );

        res.status(201).json({ message: 'Đăng ký tài khoản thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
};

// Đăng nhập
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email và mật khẩu' });
        }

        // Tìm người dùng trong DB
        const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        const user = users[0];

        // Kiểm tra mật khẩu (Sử dụng bcrypt.compare vì pass trong DB có thể đã hash hoặc chưa)
        // Lưu ý: Trong database.sql mẫu, pass là text thuần, ta nên check cả 2 trường hợp hoặc hash lại
        let isMatch = false;
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password); // Cho phép pass text thuần từ database.sql mẫu
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        // Tạo JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
};

