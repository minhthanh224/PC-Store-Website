# AeroTech PC Store - Feature Map

## Storefront

- Homepage carousel, promo cards, category/product sections.
- Products listing với search, category/brand/type/price/serial/spec filters, sort và pagination.
- Product detail nâng cao: gallery, quick specs, specs grouped, highlights, commitments, promotions, bundle offers, warranty packages, reviews, related products.
- Product compare bằng localStorage và `product_specs`.
- Wishlist.

## Customer

- Register/login/JWT.
- Account profile.
- Address book.
- My orders và order detail.
- Customer-visible order timeline.
- Customer warranty request.
- My warranty tickets.
- Public warranty lookup.

## Cart/Checkout

- Cart localStorage.
- Server-side price calculation.
- Promotion code validation.
- Bundle add-ons.
- Extended warranty packages.
- Stock/reserved stock validation.
- Pending order creation.

## Admin Catalog

- Products list/form.
- Product Import V2: products, images, specs, highlights, commitments, promotions, bundles, warranty packages.
- Import modes: strict, updateBySlug, replaceCatalog guard.
- Brands/categories.
- Reviews moderation.

## Admin Operations

- Orders list/detail.
- Status transitions.
- Serial assignment/unassignment.
- Internal notes and customer-visible notes.
- Order timeline.
- Inventory overview.
- Serial import/export.
- Warranty tickets.

## Reports

- Overview KPIs.
- Revenue report.
- Best-selling products.
- Inventory report with filters/pagination.
- Warranty and order status summaries.
- CSV export.

## Security/Admin

- Auth middleware checks user status on each request.
- Role middleware for admin/sales/technician/customer boundaries.
- Admin audit logs.
- Admin user management.
- Helmet, CORS config and rate limits.
- Dev DB summary disabled in production.
- Safe `db:reset` confirmation and production guard.
