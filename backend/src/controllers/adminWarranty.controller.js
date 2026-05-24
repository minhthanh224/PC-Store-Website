const adminWarrantyService = require("../services/adminWarranty.service");

async function getTickets(req, res) {
  const result = await adminWarrantyService.getTickets(req.query);

  res.json({
    success: true,
    data: result.tickets,
    pagination: result.pagination,
    summary: result.summary
  });
}

async function getTicketDetail(req, res) {
  const result = await adminWarrantyService.getTicketDetail(req.params.ticketCode);

  res.json({
    success: true,
    data: result
  });
}

async function createTicket(req, res) {
  const result = await adminWarrantyService.createTicket(req.body);

  res.status(201).json({
    success: true,
    message: "Tạo phiếu bảo hành thành công.",
    data: result
  });
}

async function updateTicketStatus(req, res) {
  const result = await adminWarrantyService.updateTicketStatus(
    req.params.ticketCode,
    req.body.status,
    req.body.technician_note
  );

  res.json({
    success: true,
    message: "Cập nhật trạng thái phiếu bảo hành thành công.",
    data: result
  });
}

async function updateTicketNote(req, res) {
  await adminWarrantyService.updateTicketNote(req.params.ticketCode, req.body.technician_note);

  res.json({
    success: true,
    message: "Cập nhật ghi chú kỹ thuật thành công."
  });
}

module.exports = {
  getTickets,
  getTicketDetail,
  createTicket,
  updateTicketStatus,
  updateTicketNote
};
