# Demo Script

1. Open `http://localhost:5000`.
2. Browse PC builds, laptops, and components.
3. Search/filter products.
4. Open a product detail page.
5. Add a product to the cart.
6. Checkout as `customer@example.com / 123456`.
7. Login as `sales@example.com / 123456`.
8. Open admin orders and approve the pending order.
9. Login as `technician@example.com / 123456`.
10. Open admin order detail and assign Serial to serialized items.
11. Login as sales again and move the order to shipping, then completed.
12. Login as customer and open order detail.
13. Click the Serial warranty lookup link.
14. Login as technician and create a warranty ticket for that Serial.
15. Move warranty status from received to repairing, done, then returned.
16. Login as admin and open dashboard/reports.

Notes:

- Revenue reports count completed orders only.
- Warranty returned means returned to customer, so Serial status becomes `sold`.
- The project uses demo payment methods only.
