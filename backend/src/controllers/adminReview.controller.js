const adminReviewService = require("../services/adminReview.service");
const { logAuditEvent } = require("../services/adminAudit.service");

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

  await logAuditEvent(req, {
    action_type: result.status === "approved" ? "review_restored" : "review_hidden",
    entity_type: "product_review",
    entity_id: req.params.id,
    entity_label: result.product_name || `Review #${req.params.id}`,
    message: result.status === "approved"
      ? `Hiện lại đánh giá #${req.params.id}.`
      : `Ẩn đánh giá #${req.params.id}.`,
    metadata: { status: result.status, product_id: result.product_id }
  });

  res.json({
    success: true,
    message: result.status === "approved"
      ? "Đã hiện lại đánh giá."
      : "Đã ẩn đánh giá.",
    data: result
  });
}

module.exports = {
  getReviews,
  updateReviewStatus
};
