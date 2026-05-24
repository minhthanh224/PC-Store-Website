function isDatabaseError(error) {
  return Boolean(error && (error.code || error.errno || error.sqlState || error.sqlMessage));
}

function logDatabaseError(routeName, error) {
  console.error("[DatabaseError]", {
    route: routeName,
    message: error && error.message,
    code: error && error.code,
    errno: error && error.errno,
    sqlState: error && error.sqlState,
    stack: error && error.stack
  });
}

module.exports = {
  isDatabaseError,
  logDatabaseError
};
