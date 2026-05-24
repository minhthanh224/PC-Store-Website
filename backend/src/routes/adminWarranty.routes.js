const express = require("express");
const {
  getTickets,
  getTicketDetail,
  createTicket,
  updateTicketStatus,
  updateTicketNote
} = require("../controllers/adminWarranty.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles("admin", "technician"));

router.get("/", asyncHandler(getTickets));
router.post("/", asyncHandler(createTicket));
router.get("/:ticketCode", asyncHandler(getTicketDetail));
router.patch("/:ticketCode/status", asyncHandler(updateTicketStatus));
router.put("/:ticketCode/note", asyncHandler(updateTicketNote));

module.exports = router;
