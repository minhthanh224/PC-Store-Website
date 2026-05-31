# AeroTech PC Store - Feature Inventory

Tài liệu này tổng hợp tính năng đang có trong source hiện tại để nhóm dùng khi test, viết báo cáo và bàn giao. Nội dung dựa trên các trang trong `frontend/`, API trong `backend/src/`, schema trong `database/schema.sql` và các tài liệu hiện có trong `docs/`.

## Quy ước trạng thái

- **Done**: đã có frontend/backend hoặc logic rõ ràng trong source.
- **Simulated**: có mô phỏng hoặc hiển thị nghiệp vụ, chưa phải tích hợp production thật.
- **Needs manual test**: có code nhưng cần test lại trên browser hoặc dữ liệu thật.
- **Limitation**: giới hạn hiện tại, không nên mô tả như tính năng hoàn chỉnh.

## 1. Storefront / Guest

### Trang chủ `frontend/index.html`

- **Done**: Header, navigation danh mục, logo AeroTech, cart, wishlist, account/login state.
- **Done**: Search từ header điều hướng sang trang sản phẩm theo query.
- **Done**: Hero/banner/carousel và các promo card.
- **Done**: Danh mục/nhóm sản phẩm nổi bật, sản phẩm featured từ API `/api/products/featured`.
- **Done**: Link tới sản phẩm, giỏ hàng, wishlist, bảo hành, chính sách, showroom.
- **Done**: Footer và các trang static như liên hệ, showroom, chính sách giao hàng, chính sách bảo hành.
- **Done**: Responsive/mobile cơ bản trong `frontend/assets/css/style.css`.
- **Needs manual test**: kiểm tra carousel, header mobile và các ảnh banner trên browser thật.

### Danh sách sản phẩm `frontend/products.html`

- **Done**: Load danh sách sản phẩm từ `/api/products`.
- **Done**: Search keyword theo tên, SKU, mô tả ngắn.
- **Done**: Filter category, brand, product type, requires serial.
- **Done**: Filter giá min/max.
- **Done**: Technical spec filters lấy từ `/api/products/filter-options`: CPU, GPU, RAM, storage, display size, refresh rate, panel nếu dữ liệu có.
- **Done**: Sort newest, giá tăng, giá giảm, tên A-Z.
- **Done**: Pagination theo API.
- **Done**: Product card có ảnh/fallback, giá gốc/giá sale, badge giảm giá, short specs, trạng thái hàng.
- **Done**: Add to cart, wishlist, compare toggle trên card.
- **Done**: Empty/loading/error state.
- **Needs manual test**: tổ hợp nhiều filter cùng lúc và pagination sau khi filter trên dữ liệu catalog lớn.

### Chi tiết sản phẩm `frontend/product-detail.html`

- **Done**: Product detail lấy từ `/api/products/:slug`.
- **Done**: Gallery ảnh chính và thumbnail, fallback ảnh khi lỗi.
- **Done**: Thông tin sản phẩm gồm tên, brand, category, SKU, giá, sale badge, bảo hành, tồn kho.
- **Done**: Xử lý product type `service`: không hiển thị như hàng tồn vật lý, dùng CTA tư vấn/liên hệ.
- **Done**: Add to cart / mua ngay cho sản phẩm vật lý còn hàng.
- **Done**: Wishlist và compare button.
- **Done**: Quick specs lấy từ product specs.
- **Done**: Bảng thông số kỹ thuật grouped theo `spec_group`, dùng `spec_label`, `spec_value`, `unit`.
- **Done**: Product highlights từ DB, fallback derive nhẹ từ specs nếu thiếu.
- **Done**: Commitments/policies từ DB theo global/category/product, fallback static policy.
- **Done**: Promotions display từ `product_promotions`/`promotions`.
- **Done**: Bundle offers/mua kèm ưu đãi hiển thị và có thể chọn để đưa vào cart.
- **Done**: Warranty package selection, cộng vào cart/order và kéo dài coverage bảo hành.
- **Done**: Review section chỉ load approved reviews; customer gửi review pending.
- **Done**: Related products cùng category.
- **Needs manual test**: sản phẩm có nhiều ảnh, sản phẩm service, sản phẩm thiếu specs/ảnh, bundle + warranty package trong checkout.
- **Limitation**: promotions/bundle/warranty package đã có checkout cơ bản, nhưng chưa có UI admin CRUD riêng cho từng chương trình ngoài import.

### So sánh sản phẩm `frontend/compare.html`

- **Done**: Compare store dùng `localStorage` key `aerotech_compare_products`.
- **Done**: Compare bar nổi khi có ít nhất 1 sản phẩm.
- **Done**: Tối đa 4 sản phẩm, cần ít nhất 2 sản phẩm để so sánh có ý nghĩa.
- **Done**: Add/remove từng sản phẩm, xóa tất cả.
- **Done**: Compare page load detail theo slug, render bảng thông tin và specs.
- **Done**: Specs normalization theo `spec_key`, dùng label/unit, ẩn spec `compare_enabled=false`.
- **Done**: Highlight dòng khác biệt nhẹ.
- **Done**: Add to cart từ compare cho sản phẩm vật lý phù hợp; service ưu tiên xem chi tiết/liên hệ.
- **Done**: Empty/invalid state, tự bỏ item không còn tồn tại nếu cần.
- **Needs manual test**: mobile scroll ngang bảng compare và đồng bộ selected state giữa listing/detail.

### Giỏ hàng `frontend/cart.html`

- **Done**: Cart lưu localStorage key `se104_cart`.
- **Done**: Add/remove/update quantity, clear cart.
- **Done**: Kiểm soát available stock client-side theo payload.
- **Done**: Hiển thị bundle addon gắn với sản phẩm chính.
- **Done**: Hiển thị warranty package đã chọn.
- **Done**: Promotion code preview qua `/api/orders/promotion-preview`, lưu `se104_cart_promotion`.
- **Done**: Subtotal, discount, estimated shipping, total.
- **Done**: Empty cart state.
- **Limitation**: cart là localStorage, chưa có server-side cart table.

### Checkout `frontend/checkout.html`

- **Done**: Yêu cầu customer login trước checkout.
- **Done**: Shipping form: họ tên, điện thoại, email, tỉnh/thành, quận/huyện, phường/xã, địa chỉ.
- **Done**: Tích hợp saved address từ `/api/account/addresses`.
- **Done**: Payment method hiện có: COD và chuyển khoản ngân hàng.
- **Done**: Promotion preview/apply và gửi code lên backend.
- **Done**: Backend tự tính lại giá, bundle, warranty package, promotion, shipping và tổng tiền trong `order.service.js`.
- **Done**: Tạo đơn pending qua `/api/orders`.
- **Done**: Clear cart sau khi tạo đơn thành công.
- **Simulated**: Thanh toán chỉ là lựa chọn phương thức, chưa có gateway thật.
- **Limitation**: Phí vận chuyển là rule đơn giản: miễn phí từ 3.000.000đ, còn lại 40.000đ.

### Account `frontend/account.html`

- **Done**: Xem và cập nhật profile.
- **Done**: Đổi mật khẩu có kiểm tra mật khẩu hiện tại.
- **Done**: Address book: thêm, sửa, xóa, đặt mặc định.
- **Done**: Link nhanh sang lịch sử đơn hàng, bảo hành, wishlist.

### Đơn hàng của tôi `frontend/my-orders.html` và `frontend/order-detail.html`

- **Done**: Order history theo customer, filter status bằng tab.
- **Done**: Order detail có thông tin giao hàng, thanh toán, sản phẩm, tổng tiền.
- **Done**: Hiển thị bundle addon, warranty package, promotion snapshot.
- **Done**: Timeline sự kiện customer-visible từ `order_events`.
- **Done**: Link tra cứu bảo hành theo serial nếu có.
- **Done**: Customer tạo yêu cầu bảo hành từ order item đủ điều kiện.
- **Done**: Nút in đơn hàng bằng `window.print()` và CSS print view.
- **Needs manual test**: print layout trên browser thật.

### Bảo hành phía khách hàng

- **Done**: Public warranty lookup `frontend/warranty-lookup.html` qua `/api/warranty/lookup`.
- **Done**: Customer tạo warranty request từ order completed có serial.
- **Done**: `frontend/my-warranty.html` hiển thị danh sách phiếu bảo hành, filter status và chi tiết ticket.
- **Done**: Backend chặn serial chưa bán/chưa completed, serial hết hạn và duplicate active ticket.
- **Done**: Extended warranty package được cộng vào coverage.

### Wishlist `frontend/wishlist.html`

- **Done**: Customer xem wishlist.
- **Done**: Add/remove wishlist qua `/api/wishlist`.
- **Done**: Add to cart từ wishlist cho sản phẩm vật lý; service dẫn xem chi tiết/liên hệ.

## 2. Tính năng theo role

### Guest

- **Done**: Xem trang chủ, sản phẩm, chi tiết sản phẩm, so sánh sản phẩm.
- **Done**: Search/filter/sort/pagination sản phẩm.
- **Done**: Tra cứu bảo hành public.
- **Done**: Đăng ký/đăng nhập.
- **Done**: Có thể dùng compare localStorage.
- **Limitation**: Không checkout, không wishlist, không gửi review, không xem account/order/warranty cá nhân.

### Customer

- **Done**: Tất cả guest features.
- **Done**: Cart/checkout, promotion code, bundle offers, warranty packages.
- **Done**: Address book, profile, đổi mật khẩu.
- **Done**: Order history/detail, timeline, in đơn hàng.
- **Done**: Review sản phẩm đã mua trong order completed; review mới là pending.
- **Done**: Wishlist và bảo hành cá nhân.
- **Limitation**: Không có hủy đơn self-service; không có thanh toán online thật.

### Admin

- **Done**: Dashboard tổng quan.
- **Done**: Product management: list/filter/pagination, create/update/status, export CSV, product form images/specs cơ bản.
- **Done**: Product Import V2 trên trang products: preview/commit zip CSV, strict/updateBySlug/replaceCatalog, validation, copy ảnh.
- **Done**: Brand/category CRUD/status.
- **Done**: Inventory/serial: summary, add serial, import/export serial, update serial status.
- **Done**: Orders: list/filter/export, detail, status update, notes, assign/unassign serial, print order.
- **Done**: Warranty tickets: list/filter, create, detail, status transition, technician note.
- **Done**: Review moderation: pending/approved/rejected, approve/reject.
- **Done**: Reports: overview, revenue, best-selling, inventory, warranty, orders, export CSV.
- **Done**: Audit logs: list/filter/export.
- **Done**: User management: list/search/filter, create/update, lock/unlock, reset password.
- **Done**: Guards cho self-lock/self-demote và last active admin trong service.

### Sales

- **Done**: Vào admin dashboard.
- **Done**: Xem danh sách đơn hàng và chi tiết đơn.
- **Done**: Cập nhật trạng thái đơn theo workflow.
- **Done**: Thêm ghi chú nội bộ đơn hàng.
- **Done**: Export orders.
- **Done**: Không thấy menu catalog/import/reports/audit/users.
- **Done**: Backend chặn reports admin-only.
- **Limitation**: Sales không gán serial, việc này thuộc admin/technician.

### Technician

- **Done**: Vào admin dashboard.
- **Done**: Xem kho serial, summary tồn, danh sách serial.
- **Done**: Add/import/export serial.
- **Done**: Gán serial vào order item serialized.
- **Done**: Xem đơn hàng để kiểm tra serial assignment.
- **Done**: Quản lý warranty tickets và cập nhật note/status theo workflow.
- **Done**: Không thấy reports/audit/users/product import.
- **Limitation**: Update trạng thái serial thủ công là admin-only; technician chủ yếu thêm/import/gán serial.

## 3. Backend / nghiệp vụ

### Authentication & Authorization

- **Done**: JWT auth, bcryptjs password hashing.
- **Done**: Register/login/me.
- **Done**: Inactive user bị chặn login.
- **Done**: Role-based access control ở route và admin frontend.
- **Done**: Helmet, rate limit login/register/import, CORS config.
- **Done**: `/api/dev/db-summary` chỉ mount khi không phải production.
- **Done**: Error middleware không leak stack trace ở production.

### Catalog/Product

- **Done**: Products, categories, brands, images, specs.
- **Done**: Product specs có label/unit/compare_enabled/filter_enabled.
- **Done**: Product detail trả images/specs/related/highlights/commitments/promotions/bundle offers/warranty packages.
- **Done**: Related products theo category.
- **Done**: Listing filters và technical spec filters.

### Product Import V2

- **Done**: Hỗ trợ `products.csv`, `product_images.csv`, `product_specs.csv`, `product_highlights.csv`, `commitments.csv`, `promotions.csv`, `product_promotions.csv`, `bundle_offers.csv`, `warranty_packages.csv`, `product_warranty_packages.csv`, `images/`.
- **Done**: Preview không ghi DB, commit re-validate và import transaction.
- **Done**: Validate header, required fields, enum, number, date, boolean, SKU reference, image path, extension, zip traversal.
- **Done**: Slug conflict modes: strict, updateBySlug, replaceCatalog.
- **Done**: replaceCatalog bị chặn ở production và yêu cầu xác nhận `RESET CATALOG`.
- **Done**: Reset catalog guard chặn khi có dữ liệu nghiệp vụ liên quan; dev full reset dùng `npm run db:reset`.
- **Needs manual test**: bộ zip thật 182 sản phẩm/205 ảnh/1789 specs sau khi data đã cleanup.

### Cart/Checkout/Order

- **Done**: Server-side price calculation, không tin giá frontend.
- **Done**: Bundle addon validation và snapshot.
- **Done**: Warranty package validation, snapshot và cộng tiền.
- **Done**: Promotion percent/fixed cho sản phẩm áp dụng, snapshot trên order.
- **Done**: Stock reservation qua pending/approved/shipping.
- **Done**: Completed order trừ stock_quantity cho sản phẩm không serial.
- **Done**: Serialized products yêu cầu gán đủ serial trước shipping/completed.
- **Done**: Order events/timeline.
- **Limitation**: Không có refund/return flow và không có payment gateway thật.

### Inventory/Serial

- **Done**: Serial lifecycle: `in_stock`, `sold`, `warranty`, `returned`.
- **Done**: Manual add serial.
- **Done**: Serial import CSV preview/commit.
- **Done**: Serial export CSV.
- **Done**: Assign/unassign serial theo order item.
- **Done**: Available/reserved stock dùng helper chung.
- **Needs manual test**: mixed order có serial + không serial trong demo browser.

### Warranty

- **Done**: Public lookup theo serial.
- **Done**: Coverage tính từ order completed/delivered và cộng warranty package duration.
- **Done**: Customer warranty request.
- **Done**: Admin/technician tạo và xử lý ticket.
- **Done**: Duplicate active ticket guard.
- **Done**: Expired warranty guard.
- **Done**: Terminal status không quay lại active.

### Reviews

- **Done**: Verified purchase review: customer phải có completed order chứa sản phẩm.
- **Done**: Duplicate review bị chặn.
- **Done**: Review mới status pending.
- **Done**: Storefront chỉ hiển thị approved reviews.
- **Done**: Admin moderation approve/reject.

### Reports

- **Done**: Overview KPI.
- **Done**: Revenue theo thời gian.
- **Done**: Best-selling products.
- **Done**: Inventory report có filter client-side và pagination.
- **Done**: Warranty status summary.
- **Done**: Order status summary.
- **Done**: Revenue breakdown: product revenue, bundle revenue, warranty package revenue, shipping revenue, promotion discount.
- **Done**: CSV export theo report type.
- **Limitation**: Biểu đồ là UI danh sách/thanh đơn giản, chưa dùng chart library.

### Audit Log

- **Done**: `admin_audit_logs` lưu actor, action, entity, message, metadata, IP/user-agent.
- **Done**: Admin xem/filter/export audit logs.
- **Done**: Các controller admin chính có gọi `logAuditEvent`.
- **Limitation**: Audit chưa phải hệ thống forensic đầy đủ; tập trung thao tác admin quan trọng.

### User Management

- **Done**: Admin list/search/filter users.
- **Done**: Create/update user.
- **Done**: Lock/unlock.
- **Done**: Reset password tạm.
- **Done**: Guard tự khóa/tự demote và guard admin active cuối cùng.

## 4. Database support

- **Done**: Core tables: users, customer_addresses, brands, categories, products, product_images, product_specs.
- **Done**: Advanced catalog: product_highlights, commitments, promotions, product_promotions, bundle_offers, warranty_packages, product_warranty_packages.
- **Done**: Operations: serial_numbers, orders, order_events, order_items, warranty_tickets.
- **Done**: Customer engagement: product_reviews, wishlists.
- **Done**: Admin governance: admin_audit_logs.
- **Done**: `database/schema.sql` và `database/seed.sql` phục vụ reset demo.

## 5. Các điểm cần test lại trước demo

- **Needs manual test**: Import V2 với file zip catalog thật sau khi đã sửa lỗi dữ liệu import.
- **Needs manual test**: Browser smoke trên desktop/mobile cho home, products, product detail, compare, cart, checkout.
- **Needs manual test**: Admin mobile drawer và các bảng dài: products, inventory, reports, audit logs, users.
- **Needs manual test**: Print order trên Chrome/Edge.
- **Needs manual test**: Flow serialized order end-to-end: checkout, approve, assign serial, shipping, completed, warranty lookup.
- **Needs manual test**: Flow warranty expired/duplicate bằng dữ liệu có sẵn hoặc dữ liệu test kiểm soát.

## 6. Giới hạn hiện tại

- **Limitation**: Không có payment gateway thật.
- **Limitation**: Shipping fee và delivery method còn đơn giản.
- **Limitation**: Không có return/refund/cancel self-service cho customer.
- **Limitation**: Không có hóa đơn PDF chuyên nghiệp; hiện chỉ có print order bằng browser.
- **Limitation**: Promotions/bundle/warranty package chưa có admin CRUD riêng ngoài import.
- **Limitation**: Cart lưu localStorage, chưa đồng bộ server.
- **Limitation**: Reports chưa có chart library, chưa có phân tích lợi nhuận/cost.
