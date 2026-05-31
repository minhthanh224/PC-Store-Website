# AeroTech PC Store - Testing Checklist By Role

Checklist này dùng để nhóm tick khi test trước demo. Nên reset DB local bằng `CONFIRM_DB_RESET=YES npm run db:reset` nếu cần dữ liệu sạch. Không dùng dữ liệu production để test destructive flow.

## 1. Guest

- [ ] Mở trang chủ và kiểm tra header/navigation.
- [ ] Test hero carousel, nút prev/next và promo cards.
- [ ] Search từ header sang trang sản phẩm.
- [ ] Mở trang danh sách sản phẩm.
- [ ] Filter category, brand, product type.
- [ ] Filter giá min/max.
- [ ] Filter technical specs: CPU, GPU, RAM, storage, display size, refresh rate, panel nếu có option.
- [ ] Sort giá tăng/giảm/tên/mới nhất.
- [ ] Pagination hoạt động.
- [ ] Mở product detail sản phẩm thường.
- [ ] Mở product detail sản phẩm service.
- [ ] Product detail có gallery, quick specs, specs grouped, highlights, commitments, promotions, bundle, warranty packages nếu dữ liệu có.
- [ ] Thêm 2 sản phẩm vào compare từ listing.
- [ ] Mở compare page và kiểm tra bảng specs.
- [ ] Xóa từng sản phẩm khỏi compare và xóa tất cả.
- [ ] Tra cứu bảo hành public với serial hợp lệ.
- [ ] Tra cứu bảo hành public với serial không tồn tại.
- [ ] Đăng ký tài khoản mới.
- [ ] Đăng nhập customer.
- [ ] Guest bị chặn khi vào account/order/wishlist/checkout.

## 2. Customer

- [ ] Login bằng `customer@example.com`.
- [ ] Cập nhật profile.
- [ ] Đổi mật khẩu trên tài khoản test nếu được phép.
- [ ] Thêm địa chỉ mới.
- [ ] Sửa địa chỉ.
- [ ] Đặt địa chỉ mặc định.
- [ ] Xóa địa chỉ test.
- [ ] Add sản phẩm thường vào cart.
- [ ] Add sản phẩm có warranty package vào cart.
- [ ] Add bundle offer từ product detail vào cart nếu sản phẩm có bundle.
- [ ] Tăng/giảm số lượng cart.
- [ ] Remove item khỏi cart.
- [ ] Apply promotion code hợp lệ nếu seed có mã.
- [ ] Apply promotion code sai và kiểm tra lỗi.
- [ ] Checkout bằng địa chỉ đã lưu.
- [ ] Checkout bằng form địa chỉ mới.
- [ ] Backend tạo đơn pending và clear cart.
- [ ] Mở lịch sử đơn hàng.
- [ ] Filter lịch sử đơn theo trạng thái.
- [ ] Mở chi tiết đơn hàng.
- [ ] Kiểm tra order timeline, promotion, bundle, warranty package snapshot.
- [ ] Bấm in đơn hàng và kiểm tra print preview.
- [ ] Gửi review cho sản phẩm chưa mua: phải bị chặn.
- [ ] Gửi review cho sản phẩm đã mua và completed: tạo pending review.
- [ ] Pending review chưa hiển thị ở storefront.
- [ ] Tạo yêu cầu bảo hành từ order completed có serial.
- [ ] Xem phiếu bảo hành của tôi.
- [ ] Mở chi tiết phiếu bảo hành.
- [ ] Add/remove wishlist.
- [ ] Add to cart từ wishlist.

## 3. Admin

- [ ] Login bằng `admin@example.com`.
- [ ] Dashboard load KPI, recent orders, low stock, warranty.
- [ ] Products page load danh sách, filter, pagination.
- [ ] Product form thêm sản phẩm thủ công.
- [ ] Product form sửa sản phẩm.
- [ ] Export products CSV.
- [ ] Product Import V2 preview strict mode.
- [ ] Product Import V2 updateBySlug mode với dữ liệu conflict có kiểm soát.
- [ ] Product Import V2 replaceCatalog mode chỉ trong dev và có `RESET CATALOG`.
- [ ] Import V2 chặn file không phải zip.
- [ ] Import V2 báo lỗi reference sai/image missing/path traversal.
- [ ] Brands: thêm/sửa/kích hoạt/ngừng.
- [ ] Categories: thêm/sửa/kích hoạt/ngừng, parent category.
- [ ] Inventory summary load available/reserved stock.
- [ ] Add serial thủ công.
- [ ] Import serial preview/commit.
- [ ] Export serial CSV.
- [ ] Update serial status admin-only.
- [ ] Orders list filter theo trạng thái/từ khóa.
- [ ] Export orders CSV.
- [ ] Mở order detail.
- [ ] Update pending -> approved.
- [ ] Gán serial cho order item serialized.
- [ ] Chặn completed khi chưa đủ serial.
- [ ] Update approved -> shipping -> completed.
- [ ] In đơn hàng admin.
- [ ] Warranty tickets list/filter.
- [ ] Tạo warranty ticket cho serial hợp lệ.
- [ ] Chặn warranty duplicate active.
- [ ] Chặn warranty serial hết hạn.
- [ ] Cập nhật trạng thái warranty theo workflow.
- [ ] Review moderation: pending -> approved.
- [ ] Review moderation: pending/approved -> rejected.
- [ ] Reports: overview, inventory, sales, warranty/order tab.
- [ ] Export report CSV.
- [ ] Audit logs list/filter.
- [ ] Export audit logs.
- [ ] User management list/search/filter.
- [ ] Create user sales/technician/customer.
- [ ] Update user role/status.
- [ ] Reset password user.
- [ ] Không thể tự khóa/tự demote tài khoản admin hiện tại.
- [ ] Không thể vô hiệu hóa admin active cuối cùng.

## 4. Sales

- [ ] Login bằng `sales@example.com`.
- [ ] Admin dashboard load.
- [ ] Menu chỉ hiện khu vực được phép.
- [ ] Xem orders list.
- [ ] Mở order detail.
- [ ] Duyệt đơn pending -> approved.
- [ ] Chuyển approved -> shipping.
- [ ] Chuyển shipping -> completed với đơn không serial.
- [ ] Thử completed đơn serialized chưa đủ serial: phải bị chặn.
- [ ] Thêm ghi chú nội bộ đơn hàng.
- [ ] Export orders nếu menu/API cho phép.
- [ ] Sales không vào được products/import/catalog management.
- [ ] Sales không vào được reports.
- [ ] Sales không vào được users.
- [ ] Sales không vào được audit logs.

## 5. Technician

- [ ] Login bằng `technician@example.com`.
- [ ] Admin dashboard load.
- [ ] Menu chỉ hiện khu vực được phép.
- [ ] Inventory/Kho Serial load summary.
- [ ] Product dropdown trong thêm serial load được.
- [ ] Thêm serial mới cho sản phẩm serialized.
- [ ] Import serial preview/commit.
- [ ] Export serial CSV.
- [ ] Xem danh sách serial và filter status/product.
- [ ] Mở orders để xem trạng thái serial assignment.
- [ ] Gán serial vào order item serialized nếu order workflow cho phép.
- [ ] Warranty list/filter load.
- [ ] Tạo warranty ticket cho serial hợp lệ.
- [ ] Chặn ticket cho serial chưa bán/chưa completed.
- [ ] Chặn duplicate active ticket.
- [ ] Cập nhật technician note.
- [ ] Cập nhật warranty status theo workflow.
- [ ] Technician không vào được reports.
- [ ] Technician không vào được users.
- [ ] Technician không vào được audit logs.
- [ ] Technician không vào được product import.

## 6. Security / Permission Smoke

- [ ] Không token gọi `/api/admin/users` trả 401.
- [ ] Customer gọi admin API trả 403.
- [ ] Sales gọi reports trả 403.
- [ ] Technician gọi reports trả 403.
- [ ] Admin gọi reports trả 200.
- [ ] `/api/dev/db-summary` development trả 200.
- [ ] `/api/dev/db-summary` production trả 404.
- [ ] Login sai nhiều lần không crash, rate limit hoạt động hợp lý.
- [ ] Response production không trả stack trace chi tiết.
- [ ] Không có `.env`, `node_modules`, zip/log/tmp bị track.

## 7. Responsive / Browser

- [ ] Desktop 1366px: home, products, product detail, compare, cart, checkout.
- [ ] Desktop 1366px: admin dashboard, products, inventory, orders, warranty, reports, users, audit logs.
- [ ] Mobile 390px: storefront header không vỡ.
- [ ] Mobile 390px: products filter/list đọc được.
- [ ] Mobile 390px: product detail gallery/specs/reviews đọc được.
- [ ] Mobile 390px: compare table scroll ngang, không làm body overflow khó chịu.
- [ ] Mobile 390px: cart/checkout thao tác được.
- [ ] Mobile 390px: admin drawer mở/đóng được.
- [ ] Mobile 390px: admin tables chuyển label/data hợp lý.

## 8. Database / Seed / Import

- [ ] `npm install` sạch.
- [ ] `CONFIRM_DB_RESET=YES npm run db:reset` chạy được ở development.
- [ ] `NODE_ENV=production CONFIRM_DB_RESET=YES npm run db:reset` bị chặn.
- [ ] Demo accounts login được: customer, admin, sales, technician.
- [ ] Schema có đủ bảng advanced catalog/import.
- [ ] Seed có sản phẩm, serial, orders, warranty, reviews đủ demo.
- [ ] Import zip catalog thật preview pass sau khi data cleanup.
- [ ] Import commit trong DB test, không chạy vào DB chính nếu chưa xác nhận.
