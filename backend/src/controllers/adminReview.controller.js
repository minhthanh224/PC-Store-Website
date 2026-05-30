const pool = require("../config/database");

const REVIEW_STATUSES = ["pending", "approved", "rejected"];

async function getReviews(req, res) {
  const status = REVIEW_STATUSES.includes(req.query.status) ? req.query.status : null;
  const params = [];
  const where = status ? "WHERE pr.status = ?" : "";

  if (status) params.push(status);

  const [rows] = await pool.execute(
    `
      SELECT
        pr.id,
        pr.rating,
        pr.comment,
        pr.status,
        pr.created_at,
        p.name AS product_name,
        p.sku,
        u.full_name AS reviewer_name,
        u.email AS reviewer_email
      FROM product_reviews pr
      INNER JOIN products p ON p.id = pr.product_id
      INNER JOIN users u ON u.id = pr.user_id
      ${where}
      ORDER BY pr.created_at DESC, pr.id DESC
    `,
    params
  );

  res.json({ success: true, data: rows });
}

async function updateReviewStatus(req, res) {
  const status = req.body.status;

  if (!REVIEW_STATUSES.includes(status)) {
    res.status(400).json({ success: false, message: "Trạng thái đánh giá không hợp lệ." });
    return;
  }

  const [result] = await pool.execute(
    "UPDATE product_reviews SET status = ? WHERE id = ?",
    [status, Number(req.params.id)]
  );

  if (!result.affectedRows) {
    res.status(404).json({ success: false, message: "Không tìm thấy đánh giá." });
    return;
  }

  res.json({ success: true, message: "Cập nhật đánh giá thành công." });
}

module.exports = { getReviews, updateReviewStatus };
