function roleMiddleware(allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này."
      });
      return;
    }

    next();
  };
}

module.exports = roleMiddleware;
module.exports.requireRoles = function (...roles) {
  return roleMiddleware(roles);
};
