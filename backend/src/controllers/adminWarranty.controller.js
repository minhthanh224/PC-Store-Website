const adminWarrantyService = require("../services/adminWarranty.service");
const { logAuditEvent } = require("../services/adminAudit.service");

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

  await logAuditEvent(req, {
    action_type: "create_warranty_ticket",
    entity_type: "warranty_ticket",
    entity_id: result.ticket_code || result.id,
    entity_label: result.ticket_code || "Phiếu bảo hành",
    message: `Tạo phiếu bảo hành ${result.ticket_code || ""}.`,
    metadata: { serial_number_id: result.serial_number_id || null }
  });

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

  await logAuditEvent(req, {
    action_type: "update_warranty_status",
    entity_type: "warranty_ticket",
    entity_id: req.params.ticketCode,
    entity_label: req.params.ticketCode,
    message: `Cập nhật trạng thái phiếu bảo hành ${req.params.ticketCode} thành ${req.body.status}.`,
    metadata: { status: req.body.status }
  });

  res.json({
    success: true,
    message: "Cập nhật trạng thái phiếu bảo hành thành công.",
    data: result
  });
}

async function updateTicketNote(req, res) {
  await adminWarrantyService.updateTicketNote(req.params.ticketCode, req.body.technician_note);

  await logAuditEvent(req, {
    action_type: "update_warranty_note",
    entity_type: "warranty_ticket",
    entity_id: req.params.ticketCode,
    entity_label: req.params.ticketCode,
    message: `Cập nhật ghi chú kỹ thuật phiếu ${req.params.ticketCode}.`
  });

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
