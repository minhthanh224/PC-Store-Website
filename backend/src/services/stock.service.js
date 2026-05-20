const RESERVED_ORDER_STATUSES = "'pending', 'approved', 'shipping'";

function getAvailableStockExpression(productAlias) {
  const alias = productAlias || "p";

  return `
    GREATEST(
      CASE
        WHEN ${alias}.requires_serial = 1 THEN
          (
            SELECT COUNT(*)
            FROM serial_numbers sn
            WHERE sn.product_id = ${alias}.id AND sn.status = 'in_stock'
          )
          -
          (
            SELECT COUNT(*)
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = ${alias}.id
              AND oi.serial_number_id IS NULL
              AND o.status IN (${RESERVED_ORDER_STATUSES})
          )
        ELSE
          ${alias}.stock_quantity
          -
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
      END,
      0
    )
  `;
}

module.exports = {
  getAvailableStockExpression
};
