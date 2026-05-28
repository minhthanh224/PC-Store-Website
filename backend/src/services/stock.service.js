const RESERVED_ORDER_STATUSES = "'pending', 'approved', 'shipping'";

function getReservedStockExpression(productAlias) {
  const alias = productAlias || "p";

  return `
    CASE
      WHEN ${alias}.requires_serial = 1 THEN
        (
            SELECT COUNT(*)
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = ${alias}.id
              AND oi.serial_number_id IS NULL
              AND o.status IN (${RESERVED_ORDER_STATUSES})
        )
      ELSE
        COALESCE(
          (
            SELECT SUM(oi.quantity)
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = ${alias}.id
              AND o.status IN (${RESERVED_ORDER_STATUSES})
          ),
          0
        )
    END
  `;
}

function getInStockQuantityExpression(productAlias) {
  const alias = productAlias || "p";

  return `
    CASE
      WHEN ${alias}.requires_serial = 1 THEN
        (
          SELECT COUNT(*)
          FROM serial_numbers sn
          WHERE sn.product_id = ${alias}.id AND sn.status = 'in_stock'
        )
      ELSE ${alias}.stock_quantity
    END
  `;
}

function getTotalStockExpression(productAlias) {
  const alias = productAlias || "p";

  return `
    CASE
      WHEN ${alias}.requires_serial = 1 THEN
        (
          SELECT COUNT(*)
          FROM serial_numbers sn
          WHERE sn.product_id = ${alias}.id
        )
      ELSE ${alias}.stock_quantity
    END
  `;
}

function getAvailableStockExpression(productAlias) {
  const alias = productAlias || "p";

  return `
    GREATEST(
      ${getInStockQuantityExpression(alias)}
      -
      ${getReservedStockExpression(alias)},
      0
    )
  `;
}

module.exports = {
  getAvailableStockExpression,
  getInStockQuantityExpression,
  getReservedStockExpression,
  getTotalStockExpression
};
