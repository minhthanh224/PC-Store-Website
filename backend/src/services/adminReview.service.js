const pool = require("../config/database");

const REVIEW_STATUSES = ["approved", "rejected"];
const REVIEW_STATUS_FILTERS = ["all", ...REVIEW_STATUSES];
const MODERATION_STATUSES = ["approved", "rejected"];

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 12, 1), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

function buildFilters(query) {
  const status = query.status || "approved";
  const where = [];
  const params = [];

  if (!REVIEW_STATUS_FILTERS.includes(status)) {
    throw createError("Trạng thái đánh giá không hợp lệ.", 400);
  }

  if (status === "approved") {
    where.push("pr.status IN ('approved', 'pending')");
  } else if (status !== "all") {
    where.push("pr.status = ?");
    params.push(status);
  }

  if (query.search && query.search.trim()) {
    const keyword = `%${query.search.trim()}%`;
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR pr.comment LIKE ?)");
    params.push(keyword, keyword, keyword, keyword, keyword);
  }

  return {
    whereSql: where.length ? where.join(" AND ") : "1 = 1",
    params
  };
}

async function getReviews(query) {
  const { whereSql, params } = buildFilters(query);
  const { page, limit, offset } = normalizePagination(query);

  const [[countRow]] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      FROM product_reviews pr
      INNER JOIN products p ON p.id = pr.product_id
      LEFT JOIN users u ON u.id = pr.user_id
      WHERE ${whereSql}
    `,
    params
  );

  const [rows] = await pool.execute(
    `
      SELECT
        pr.id,
        pr.product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        p.slug AS product_slug,
        pr.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        pr.rating,
        pr.comment,
        CASE WHEN pr.status = 'rejected' THEN 'rejected' ELSE 'approved' END AS status,
        pr.status AS raw_status,
        pr.created_at,
        NULL AS updated_at
      FROM product_reviews pr
      INNER JOIN products p ON p.id = pr.product_id
      LEFT JOIN users u ON u.id = pr.user_id
      WHERE ${whereSql}
      ORDER BY
        FIELD(CASE WHEN pr.status = 'rejected' THEN 'rejected' ELSE 'approved' END, 'approved', 'rejected'),
        pr.created_at DESC,
        pr.id DESC
      LIMIT ? OFFSET ?
    `,
    params.concat([limit, offset])
  );

  const total = Number(countRow.total);

  return {
    reviews: rows.map(function (review) {
      return {
        ...review,
        rating: Number(review.rating)
      };
    }),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function updateReviewStatus(id, status) {
  const reviewId = Number(id);

  if (!Number.isInteger(reviewId) || reviewId < 1) {
    throw createError("Đánh giá không hợp lệ.", 400);
  }

  if (!MODERATION_STATUSES.includes(status)) {
    throw createError("Chỉ có thể hiển thị hoặc ẩn đánh giá.", 400);
  }

  const [result] = await pool.execute(
    `
      UPDATE product_reviews
      SET status = ?
      WHERE id = ?
    `,
    [status, reviewId]
  );

  if (result.affectedRows === 0) {
    throw createError("Không tìm thấy đánh giá.", 404);
  }

  return {
    id: reviewId,
    status
  };
}

module.exports = {
  getReviews,
  updateReviewStatus,
  REVIEW_STATUSES
};
