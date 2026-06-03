const express = require("express");
const {
  lookupWarranty,
  createCustomerWarrantyRequest,
  getMyWarrantyItems,
  getMyWarrantyTickets,
  getMyWarrantyTicketDetail
} = require("../controllers/warranty.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRoles = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/lookup", asyncHandler(lookupWarranty));

router.use(requireAuth);
router.use(requireRoles(["customer"]));

router.get("/my-items", asyncHandler(getMyWarrantyItems));
router.get("/my", asyncHandler(getMyWarrantyTickets));
router.get("/my/:ticketCode", asyncHandler(getMyWarrantyTicketDetail));
router.post("/requests", asyncHandler(createCustomerWarrantyRequest));

module.exports = router;
