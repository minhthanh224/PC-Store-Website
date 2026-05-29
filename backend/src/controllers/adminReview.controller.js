const adminReviewService = require("../services/adminReview.service");

async function getReviews(req, res) {
  const result = await adminReviewService.getReviews(req.query);

  res.json({
    success: true,
    data: result.reviews,
    pagination: result.pagination
  });
}

async function updateReviewStatus(req, res) {
  const result = await adminReviewService.updateReviewStatus(req.params.id, req.body.status);

  res.json({
    success: true,
    message: result.status === "approved"
      ? "Đã duyệt đánh giá."
      : "Đã từ chối đánh giá.",
    data: result
  });
}

module.exports = {
  getReviews,
  updateReviewStatus
};
