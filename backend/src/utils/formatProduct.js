function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function formatProduct(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    product_type: product.product_type,
    short_description: product.short_description,
    description: product.description,
    base_price: toNumber(product.base_price),
    sale_price: toNumber(product.sale_price),
    warranty_months: product.warranty_months,
    requires_serial: Boolean(product.requires_serial),
    stock_quantity: product.stock_quantity,
    primary_image: product.primary_image || null,
    brand: product.brand_id
      ? {
          id: product.brand_id,
          name: product.brand_name,
          slug: product.brand_slug
        }
      : null,
    brand_name: product.brand_name || null,
    brand_slug: product.brand_slug || null,
    category: {
      id: product.category_id,
      name: product.category_name,
      slug: product.category_slug
    },
    category_name: product.category_name,
    category_slug: product.category_slug,
    available_stock: Number(product.available_stock || 0),
    short_specs: product.short_specs || []
  };
}

module.exports = {
  formatProduct
};
