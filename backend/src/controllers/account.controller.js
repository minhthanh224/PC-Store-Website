const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const { formatUser } = require("./auth.controller");

async function getProfile(req, res) {
  res.json({
    success: true,
    data: {
      user: formatUser(req.user)
    }
  });
}

async function updateProfile(req, res) {
  const fullName = (req.body.full_name || "").trim();
  const phone = req.body.phone ? req.body.phone.trim() : null;

  if (!fullName) {
    res.status(400).json({
      success: false,
      message: "Họ tên không được để trống."
    });
    return;
  }

  await pool.execute(
    `
      UPDATE users
      SET full_name = ?, phone = ?
      WHERE id = ?
    `,
    [fullName, phone, req.user.id]
  );

  const [users] = await pool.execute(
    `
      SELECT id, full_name, email, phone, role, status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [req.user.id]
  );

  res.json({
    success: true,
    message: "Cập nhật hồ sơ thành công.",
    data: {
      user: formatUser(users[0])
    }
  });
}

async function getAddresses(req, res) {
  const [addresses] = await pool.execute(
    `
      SELECT
        id,
        receiver_name,
        receiver_phone,
        province,
        district,
        ward,
        address_line,
        is_default,
        created_at,
        updated_at
      FROM customer_addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC, id DESC
    `,
    [req.user.id]
  );

  res.json({
    success: true,
    data: addresses.map(function (address) {
      return {
        ...address,
        is_default: Boolean(address.is_default)
      };
    })
  });
}

async function createAddress(req, res) {
  const receiverName = (req.body.receiver_name || "").trim();
  const receiverPhone = (req.body.receiver_phone || "").trim();
  const province = (req.body.province || "").trim();
  const district = (req.body.district || "").trim();
  const ward = (req.body.ward || "").trim();
  const addressLine = (req.body.address_line || "").trim();
  const isDefault = Boolean(req.body.is_default);

  if (!receiverName || !receiverPhone || !province || !district || !ward || !addressLine) {
    res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin địa chỉ."
    });
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (isDefault) {
      await connection.execute(
        "UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?",
        [req.user.id]
      );
    }

    const [result] = await connection.execute(
      `
        INSERT INTO customer_addresses (
          user_id, receiver_name, receiver_phone, province, district, ward, address_line, is_default
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        receiverName,
        receiverPhone,
        province,
        district,
        ward,
        addressLine,
        isDefault ? 1 : 0
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Thêm địa chỉ thành công.",
      data: {
        id: result.insertId
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function changePassword(req, res) {
  const currentPassword = req.body.current_password || "";
  const newPassword = req.body.new_password || "";
  const confirmPassword = req.body.confirm_password || "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới."
    });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({
      success: false,
      message: "Mật khẩu mới phải có ít nhất 6 ký tự."
    });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({
      success: false,
      message: "Xác nhận mật khẩu mới không khớp."
    });
    return;
  }

  const [users] = await pool.execute(
    "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
    [req.user.id]
  );
  const passwordMatches = users.length > 0 &&
    await bcrypt.compare(currentPassword, users[0].password_hash);

  if (!passwordMatches) {
    res.status(400).json({
      success: false,
      message: "Mật khẩu hiện tại không chính xác."
    });
    return;
  }

  if (await bcrypt.compare(newPassword, users[0].password_hash)) {
    res.status(400).json({
      success: false,
      message: "Mật khẩu mới phải khác mật khẩu hiện tại."
    });
    return;
  }

  await pool.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [await bcrypt.hash(newPassword, 10), req.user.id]
  );

  res.json({
    success: true,
    message: "Đổi mật khẩu thành công."
  });
}

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  changePassword
};
