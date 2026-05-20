# API Overview

Base URL:

```text
http://localhost:5000/api
```

## Public

- `GET /health`
- `GET /db-test`
- `GET /categories`
- `GET /categories?tree=true`
- `GET /brands`
- `GET /products`
- `GET /products/featured`
- `GET /products/:slug`
- `GET /products/:slug/reviews`
- `GET /warranty/lookup?serial=...`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

## Customer

Requires customer token.

- `GET /account/profile`
- `PUT /account/profile`
- `GET /account/addresses`
- `POST /account/addresses`
- `POST /orders`
- `GET /orders/my`
- `GET /orders/:orderCode`
- `GET /wishlist`
- `POST /wishlist/:productId`
- `DELETE /wishlist/:productId`
- `POST /products/:slug/reviews`

## Admin Catalog

Admin only.

- `GET /admin/products`
- `GET /admin/products/:id`
- `POST /admin/products`
- `PUT /admin/products/:id`
- `PATCH /admin/products/:id/status`
- `GET /admin/brands`
- `POST /admin/brands`
- `PUT /admin/brands/:id`
- `PATCH /admin/brands/:id/status`
- `GET /admin/categories`
- `POST /admin/categories`
- `PUT /admin/categories/:id`
- `PATCH /admin/categories/:id/status`

## Inventory

Admin and technician.

- `GET /admin/inventory/summary`
- `GET /admin/inventory/serials`
- `POST /admin/inventory/serials`
- `PATCH /admin/inventory/serials/:id/status` admin only

## Admin Orders

Admin, sales, technician can view. Admin/sales update status. Admin/technician assign Serial.

- `GET /admin/orders`
- `GET /admin/orders/:orderCode`
- `PATCH /admin/orders/:orderCode/status`
- `POST /admin/orders/:orderCode/items/:itemId/assign-serial`
- `PATCH /admin/orders/:orderCode/items/:itemId/unassign-serial`

## Warranty

Admin and technician.

- `GET /admin/warranty-tickets`
- `GET /admin/warranty-tickets/:ticketCode`
- `POST /admin/warranty-tickets`
- `PATCH /admin/warranty-tickets/:ticketCode/status`
- `PUT /admin/warranty-tickets/:ticketCode/note`

## Dashboard and Reports

- `GET /admin/dashboard`: admin, sales, technician
- `GET /admin/reports/overview`: admin, sales
- `GET /admin/reports/revenue`: admin, sales
- `GET /admin/reports/best-selling`: admin, sales
- `GET /admin/reports/inventory`: admin, sales
- `GET /admin/reports/warranty`: admin, sales
- `GET /admin/reports/orders`: admin, sales

Reports support `from` and `to` date filters where relevant. Revenue supports `groupBy=day|month`.
