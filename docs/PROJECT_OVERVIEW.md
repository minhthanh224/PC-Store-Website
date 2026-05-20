# Project Overview

SE104 PC Store is a professional PC Store / Computer Store website, not only a laptop store. It supports PC builds, laptops, PC components, monitors, keyboards, mice, headsets, accessories, and technical services.

## Architecture

- Frontend: plain HTML, CSS, JavaScript
- Backend: Node.js and Express
- Database: MySQL
- Auth: JWT bearer token and bcrypt password hashes
- Frontend serving: Express serves the `frontend/` folder for local demo

## Storefront Scope

- Home page with featured product sections
- Product catalog with search, category, brand, type, price, Serial filters
- Product detail with images, specs, related products, reviews
- Cart using localStorage
- Checkout creates pending orders
- Customer account, addresses, order history, order detail
- Warranty lookup by Serial
- Wishlist

## Admin Scope

- Dashboard with role-aware cards and quick actions
- Product, brand, category management
- Serial inventory management
- Order approval/status workflow
- Serial assignment to serialized order items
- Warranty ticket creation and status workflow
- Reports for revenue, best-selling products, inventory, warranty, and orders

## Serial and Warranty Scope

Serialized products use `serial_numbers`. During checkout, serialized items are reserved but not assigned. Technician/admin assigns Serial after order approval. Sold Serials can be used for warranty lookup after the order is completed.

Warranty tickets move through `received`, `repairing`, `waiting_parts`, `done`, then terminal `returned` or `rejected`. Returning a warranty item to the customer changes the Serial back to `sold`, not `returned`.

## Intentionally Not Implemented

- Real online payment gateway
- Real email/SMS notification
- File upload and warranty attachments
- Revenue accounting beyond completed-order reports
- Product refund/return workflow
- Production-grade admin audit logs
