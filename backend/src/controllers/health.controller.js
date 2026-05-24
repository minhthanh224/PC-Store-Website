function getHealthStatus(req, res) {
  res.json({
    success: true,
    message: "AeroTech API is running"
  });
}

module.exports = {
  getHealthStatus
};
