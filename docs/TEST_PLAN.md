# Manual Test Plan

## Auth

- Register a new customer.
- Login with `customer@example.com / 123456`.
- Login with `sales@example.com / 123456`.
- Login with `technician@example.com / 123456`.
- Login with `admin@example.com / 123456`.
- Confirm `/api/auth/me` does not return `password_hash`.

## Storefront

- Open home page.
- Search for `laptop`.
- Filter products by category, brand, type, price, and Serial requirement.
- Open a product detail page.
- Add product to wishlist while logged in.
- Submit a product review while logged in.

## Cart and Checkout

- Add products to cart from listing and detail.
- Increase/decrease cart quantities.
- Confirm checkout redirects to login when logged out.
- Checkout while logged in.
- Confirm order status is `pending`.

## Customer Orders

- Open `my-orders.html`.
- Open order detail.
- Confirm assigned Serial is visible after admin workflow.
- Use the warranty lookup link from order detail.

## Admin Products

- Admin opens product list.
- Admin creates/updates a product.
- Admin deactivates a product.
- Confirm inactive product does not appear in storefront.

## Inventory and Serial

- Admin/technician opens inventory.
- Add Serial for serialized product.
- Confirm duplicate Serial is rejected.
- Confirm non-serialized product cannot receive Serial.

## Order Workflow

- Customer creates order.
- Sales approves pending order.
- Technician assigns Serial to serialized item.
- Sales moves order to shipping.
- Sales completes order.
- Confirm customer sees updated status and Serial.
- Confirm completed/cancelled order cannot be updated.
- Confirm shipping cannot happen before required Serials are assigned.

## Warranty

- Lookup invalid Serial.
- Lookup in-stock Serial.
- Lookup sold Serial from completed order.
- Technician creates warranty ticket.
- Duplicate active warranty ticket is rejected.
- Move warranty `received -> repairing -> done -> returned`.
- Confirm Serial status returns to `sold`.
- Confirm returned/rejected ticket cannot move back to active status.

## Reports

- Admin opens reports.
- Sales opens reports.
- Technician is denied from reports.
- Confirm revenue counts only completed orders.
- Test invalid date filters.

## Role Permissions

- Customer cannot access `/api/admin/*`.
- Sales can manage order status and reports, but cannot manage products, inventory, warranty, or Serial assignment.
- Technician can manage inventory/warranty and assign Serial, but cannot update order status or access reports.
- Admin can access all admin features.
