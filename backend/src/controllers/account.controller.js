const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { formatUser } = require("./auth.controller");

function normalizeAddressPayload(body) {
  return {
    receiverName: String(body.receiver_name || "").trim(),
    receiverPhone: String(body.receiver_phone || "").trim(),
    province: String(body.province || "").trim(),
    district: String(body.district || "").trim(),
    ward: String(body.ward || "").trim(),
    addressLine: String(body.address_line || "").trim(),
    isDefault: Boolean(body.is_default)
  };
}

function validateAddressPayload(address) {
  if (!address.receiverName || !address.receiverPhone || !address.province || !address.district || !address.ward || !address.addressLine) {
    return "Vui lòng nhập đầy đủ thông tin địa chỉ.";
  }

  if (address.receiverPhone.length < 8) {
    return "Số điện thoại người nhận không hợp lệ.";
  }

  return null;
}

async function ensureOwnedAddress(connection, userId, addressId) {
  const [addresses] = await connection.execute(
    `
      SELECT id
      FROM customer_addresses
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,
    [addressId, userId]
  );

  return addresses[0] || null;
}

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

    const [[addressCountRow]] = await connection.execute(
      "SELECT COUNT(*) AS total FROM customer_addresses WHERE user_id = ?",
      [req.user.id]
    );
    const shouldSetDefault = isDefault || Number(addressCountRow.total || 0) === 0;

    if (shouldSetDefault) {
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
        shouldSetDefault ? 1 : 0
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

async function updateAddress(req, res) {
  const addressId = Number(req.params.id);

  if (!Number.isInteger(addressId) || addressId < 1) {
    res.status(400).json({
      success: false,
      message: "Địa chỉ không hợp lệ."
    });
    return;
  }

  const address = normalizeAddressPayload(req.body);
  const validationMessage = validateAddressPayload(address);

  if (validationMessage) {
    res.status(400).json({
      success: false,
      message: validationMessage
    });
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingAddress = await ensureOwnedAddress(connection, req.user.id, addressId);

    if (!existingAddress) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        message: "Không tìm thấy địa chỉ giao hàng."
      });
      return;
    }

    if (address.isDefault) {
      await connection.execute(
        "UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?",
        [req.user.id]
      );
    }

    await connection.execute(
      `
        UPDATE customer_addresses
        SET
          receiver_name = ?,
          receiver_phone = ?,
          province = ?,
          district = ?,
          ward = ?,
          address_line = ?,
          is_default = ?
        WHERE id = ? AND user_id = ?
      `,
      [
        address.receiverName,
        address.receiverPhone,
        address.province,
        address.district,
        address.ward,
        address.addressLine,
        address.isDefault ? 1 : 0,
        addressId,
        req.user.id
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Cập nhật địa chỉ thành công."
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function setDefaultAddress(req, res) {
  const addressId = Number(req.params.id);

  if (!Number.isInteger(addressId) || addressId < 1) {
    res.status(400).json({
      success: false,
      message: "Địa chỉ không hợp lệ."
    });
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingAddress = await ensureOwnedAddress(connection, req.user.id, addressId);

    if (!existingAddress) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        message: "Không tìm thấy địa chỉ giao hàng."
      });
      return;
    }

    await connection.execute(
      "UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?",
      [req.user.id]
    );
    await connection.execute(
      "UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
      [addressId, req.user.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Đã đặt địa chỉ mặc định."
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteAddress(req, res) {
  const addressId = Number(req.params.id);

  if (!Number.isInteger(addressId) || addressId < 1) {
    res.status(400).json({
      success: false,
      message: "Địa chỉ không hợp lệ."
    });
    return;
  }

  const [result] = await pool.execute(
    "DELETE FROM customer_addresses WHERE id = ? AND user_id = ?",
    [addressId, req.user.id]
  );

  if (result.affectedRows === 0) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy địa chỉ giao hàng."
    });
    return;
  }

  res.json({
    success: true,
    message: "Đã xóa địa chỉ giao hàng."
  });
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
      message: "Mật khẩu xác nhận không khớp."
    });
    return;
  }

  const [users] = await pool.execute(
    "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
    [req.user.id]
  );

  if (!users.length) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy tài khoản."
    });
    return;
  }

  const matches = await bcrypt.compare(currentPassword, users[0].password_hash);

  if (!matches) {
    res.status(400).json({
      success: false,
      message: "Mật khẩu hiện tại không đúng."
    });
    return;
  }

  const nextPasswordHash = await bcrypt.hash(newPassword, 10);

  await pool.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [nextPasswordHash, req.user.id]
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
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  changePassword
};
