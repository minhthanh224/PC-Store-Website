const warrantyService = require("../services/warranty.service");

async function lookupWarranty(req, res) {
  const result = await warrantyService.lookupWarranty(req.query.serial);

  res.json({
    success: true,
    data: result
  });
}

module.exports = {
  lookupWarranty
};
