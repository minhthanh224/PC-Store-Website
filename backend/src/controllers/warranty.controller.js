const warrantyService = require("../services/warranty.service");

async function lookupWarranty(req, res) {
  const result = await warrantyService.lookupWarranty(req.query.serial);

  res.json({
    success: true,
    data: result
  });
}

async function createCustomerWarrantyRequest(req, res) {
  const result = await warrantyService.createCustomerWarrantyRequest(req.user, req.body);

  res.status(201).json({
    success: true,
    message: "Yêu cầu bảo hành đã được gửi. AeroTech sẽ tiếp nhận và phản hồi sớm nhất.",
    data: result
  });
}

async function getMyWarrantyTickets(req, res) {
  const tickets = await warrantyService.getMyWarrantyTickets(req.user, req.query);

  res.json({
    success: true,
    data: tickets
  });
}

async function getMyWarrantyTicketDetail(req, res) {
  const ticket = await warrantyService.getMyWarrantyTicketDetail(req.user, req.params.ticketCode);

  res.json({
    success: true,
    data: ticket
  });
}

module.exports = {
  lookupWarranty,
  createCustomerWarrantyRequest,
  getMyWarrantyTickets,
  getMyWarrantyTicketDetail
};
