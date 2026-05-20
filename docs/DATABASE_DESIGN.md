# Database Design

The SE104 PC Store database is designed for a full computer store, not only a laptop store. It supports PC builds, laptops, components, monitors, peripherals, accessories, and technical services.

## Product Model

The `products` table stores every sellable item or service. Product type is separated with `product_type`, so later code can filter PC builds, laptops, components, monitors, accessories, and services without creating separate product tables for each type.

`requires_serial` marks products that need physical serial number tracking. PC builds, laptops, monitors, and selected VGA products usually need serial tracking because warranty lookup and inventory assignment depend on the exact physical unit sold.

For serialized products, available stock should later be calculated from `serial_numbers` where `status = 'in_stock'`. For normal products, such as RAM, SSDs, keyboards, mice, and services, `stock_quantity` is used directly.

## Flexible Specs

The `product_specs` table stores specifications as key/value rows. This is better than fixed columns such as `cpu`, `ram`, or `storage` because the store sells many product types. A monitor needs refresh rate and panel type, a keyboard needs switch and layout, a mouse needs DPI and connection type, and a PC build needs CPU, RAM, VGA, and SSD.

## Main Relationships

- `brands -> products`: one brand can have many products.
- `categories -> products`: one category can contain many products.
- `categories -> categories`: categories can have parent and child categories.
- `product -> product_images`: one product can have many images.
- `product -> product_specs`: one product can have many flexible specs.
- `product -> serial_numbers`: one serialized product can have many physical serial units.
- `user -> customer_addresses`: one customer can save many delivery addresses.
- `user -> orders`: one customer can have many orders.
- `order -> order_items`: one order contains one or more item rows.
- `order_item -> serial_number`: serialized products can be assigned to an order item.
- `serial_number -> warranty_tickets`: warranty handling is based on the serial number.

## Business Rules

- Do not store plain passwords. Demo passwords are bcrypt hashes.
- Products with business history should not be hard deleted. Set `status = 'inactive'` instead.
- Revenue reports should count completed orders only.
- New checkout orders should start with `status = 'pending'`.
- Serial assignment happens after order approval in later phases.
- For serialized products, a quantity of 3 should later become 3 order item rows, each with quantity 1 and its own serial assignment.
- For non-serialized products, one order item can have quantity greater than 1.
- Warranty lookup is based on Serial Number.
- Active warranty statuses are `received`, `repairing`, `waiting_parts`, and `done`.
- Terminal warranty statuses are `returned` and `rejected`.

## Current Application Scope

The application now uses this schema for storefront browsing, customer checkout, admin catalog management, Serial inventory, order approval, warranty lookup, warranty tickets, reports, wishlist, and product reviews.

Some production features remain intentionally out of scope: real online payment, file uploads, product refund/return workflow, and email/SMS notifications.
