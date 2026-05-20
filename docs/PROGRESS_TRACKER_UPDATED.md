# AeroTech PC Store - Progress Tracker cập nhật

Cập nhật theo codebase hiện tại: HTML/CSS/JavaScript thuần, Node.js + Express, MySQL.

## 1. Trạng thái tổng quan

### Đã có nền tảng ổn

- Backend Express đã tách routes, controllers, services.
- Database MySQL đã có schema và seed.
- Auth dùng JWT và bcryptjs.
- Customer storefront đã có catalog, search, filter, product detail, cart, checkout, account, order history, warranty lookup, wishlist, review.
- Admin đã có các module nghiệp vụ chính: dashboard, product, brand, category, inventory/serial, orders, warranty, reports.
- Luồng quan trọng đã có: customer đặt hàng, sales duyệt đơn, technician gán Serial, sales hoàn tất đơn, technician tạo và xử lý bảo hành.

### Cần ưu tiên sửa tiếp

- Admin UI còn là điểm yếu lớn nhất.
- CSS đang dồn nhiều vào một file lớn, dễ bị override chồng chéo.
- Một số text seed/UI vẫn còn dấu vết demo/phase.
- Product review có customer submit và hiển thị review đã duyệt, nhưng chưa có admin moderation page.
- Cần test end-to-end thật kỹ sau khi polish admin.

## 2. Roadmap mới từ hiện tại đến bản demo hoàn chỉnh

## Phase A - Git hygiene và chuẩn hóa project

Mục tiêu: làm sạch project để dễ commit, clone, chạy lại.

Việc cần làm:

- Thêm hoặc kiểm tra `.gitignore`.
- Đảm bảo không commit `node_modules/`.
- Đảm bảo không commit `.env` thật.
- Giữ `.env.example`.
- Kiểm tra README setup có đúng với project hiện tại.
- Chạy lại import `schema.sql` và `seed.sql` trên database sạch.
- Kiểm tra `npm install` và `npm run dev` chạy được từ repo mới clone.

Kết quả mong muốn:

- Repo sạch.
- Người khác clone về có thể setup lại.
- Không còn thư mục dependency nặng trong source control.

## Phase B - Admin UI redesign system

Mục tiêu: biến admin từ giao diện cũ, tối, khó đọc thành dashboard quản trị chuyên nghiệp.

Việc cần làm:

- Tạo hoặc tách CSS admin riêng.
- Chuẩn hóa admin layout.
- Sidebar dùng navy/dark blue.
- Main content dùng nền sáng.
- Card dùng nền trắng.
- Button, input, select, textarea, badge, table dùng style thống nhất.
- Sửa lỗi text table quá mờ.
- Sửa nút trắng nhìn giống disabled.
- Sửa topbar và nút “Về cửa hàng”.
- Ẩn hoặc thay thế text `Demo Admin` thành `Quản trị viên`.

Trang cần sửa:

- `frontend/admin/dashboard.html`
- `frontend/admin/products.html`
- `frontend/admin/product-form.html`
- `frontend/admin/brands.html`
- `frontend/admin/categories.html`
- `frontend/admin/inventory.html`
- `frontend/admin/orders.html`
- `frontend/admin/order-detail.html`
- `frontend/admin/warranty.html`
- `frontend/admin/reports.html`

Kết quả mong muốn:

- Admin nhìn đồng bộ với customer site.
- Table đọc rõ.
- Form dễ nhập.
- Status badge rõ màu.
- Sales và technician thao tác dễ hơn.

## Phase C - Admin UX theo nghiệp vụ

Mục tiêu: không chỉ đẹp hơn, mà còn tiện dùng hơn cho từng vai trò.

Admin cần ưu tiên:

- Dashboard tổng quan.
- Product / brand / category management.
- Reports.

Sales cần ưu tiên:

- Danh sách đơn hàng.
- Filter đơn hàng.
- Duyệt đơn và cập nhật trạng thái.
- Xem tình trạng Serial của đơn.

Technician cần ưu tiên:

- Kho Serial.
- Gán Serial cho order item.
- Tạo và cập nhật phiếu bảo hành.
- Kiểm tra trạng thái serial.

Việc cần làm:

- Dashboard thêm quick actions rõ.
- Orders page có tabs và filters dễ dùng.
- Inventory page có summary và cảnh báo tồn thấp rõ.
- Warranty page tách rõ form tạo phiếu và danh sách phiếu.
- Reports page có empty state/placeholder đẹp nếu chưa có chart.

Kết quả mong muốn:

- Admin không bị rối.
- Sales xử lý đơn nhanh.
- Technician xử lý serial/bảo hành rõ workflow.

## Phase D - Dọn seed data và nội dung hiển thị

Mục tiêu: website không còn cảm giác đồ án/demo trong UI.

Việc cần làm:

- Tìm và xử lý text còn lại trong UI:
  - `SE104`
  - `Phase`
  - `Demo`
  - `sample`
  - `sản phẩm mẫu`
  - `kết nối MySQL`
- Đổi tên shop hiển thị thống nhất thành `AeroTech`.
- Đổi tên user seed hiển thị thân thiện hơn.
- Dọn tên sản phẩm seed còn có `Phase`.
- Kiểm tra ảnh sản phẩm fallback.
- Bổ sung seed sản phẩm thật hơn nếu cần demo.

Lưu ý:

- Tài liệu nội bộ có thể nhắc SE104.
- UI customer/admin không nên nhắc SE104 hoặc Phase.

Kết quả mong muốn:

- Nhìn như shop thật.
- Demo trước giảng viên không bị lộ text kỹ thuật/dev.

## Phase E - Kiểm thử end-to-end nghiệp vụ

Mục tiêu: đảm bảo luồng bán hàng thật chạy ổn.

Luồng test chính:

1. Customer đăng nhập.
2. Tìm sản phẩm.
3. Add to cart.
4. Checkout.
5. Sales duyệt đơn.
6. Technician gán Serial.
7. Sales chuyển `shipping`.
8. Sales chuyển `completed`.
9. Customer xem order detail.
10. Customer tra cứu bảo hành bằng Serial.
11. Technician tạo warranty ticket.
12. Technician cập nhật trạng thái bảo hành.
13. Admin xem dashboard/reports.

Checklist bắt buộc:

- Customer không vào được `/api/admin/*`.
- Sales không sửa catalog.
- Technician không xem reports.
- Chưa gán Serial thì không shipping/completed đơn serialized.
- Duplicate active warranty ticket bị chặn.
- Warranty terminal status không quay lại active.
- Available stock không bị overbook trong checkout.

Kết quả mong muốn:

- Luồng chính chạy sạch.
- Không có bug nghiêm trọng khi demo.

## Phase F - Product review moderation backlog

Mục tiêu: hoàn thiện phần review nếu còn thời gian.

Hiện trạng:

- Customer có thể submit review.
- Approved reviews hiển thị.
- Chưa có admin moderation page.

Hướng làm:

- Thêm admin review moderation page.
- Admin xem review pending.
- Admin approve/reject review.
- Product detail chỉ show approved review.

Mức ưu tiên:

- Không bắt buộc cho demo nếu thời gian ít.
- Nên làm nếu muốn web chuyên nghiệp hơn.

## Phase G - Documentation, report, slide, demo prep

Mục tiêu: đóng gói đồ án để nộp và thuyết trình.

Việc cần làm:

- Update README.
- Update API overview.
- Update database design.
- Update feature list.
- Update test plan.
- Viết demo script theo đúng flow cuối cùng.
- Chuẩn bị ảnh chụp màn hình.
- Chuẩn bị báo cáo và slide.

Tài liệu cần có:

- `PROJECT_OVERVIEW.md`
- `DATABASE_DESIGN.md`
- `API_OVERVIEW.md`
- `FEATURES.md`
- `TEST_PLAN.md`
- `DEMO_SCRIPT.md`
- `PROGRESS_TRACKER.md`

Kết quả mong muốn:

- Người chấm hiểu scope.
- Nhóm thuyết trình mạch lạc.
- Demo có kịch bản rõ.

## Phase H - Deployment hoặc local demo packaging

Mục tiêu: có bản chạy ổn để chấm.

Nếu deploy:

- Backend Node host.
- MySQL host.
- CORS đúng domain.
- `.env` production an toàn.
- HTTPS nếu có thể.

Nếu local demo:

- Chuẩn hóa hướng dẫn chạy.
- Có video/ảnh dự phòng.
- Có database seed sạch.
- Có tài khoản demo rõ.

Kết quả mong muốn:

- Không mất thời gian setup khi demo.
- Có phương án dự phòng nếu mạng lỗi.

## 3. Ưu tiên hiện tại

Thứ tự nên làm ngay:

1. Commit customer UI hiện tại nếu đã ổn.
2. Tạo branch `admin-ui-polish`.
3. Làm Phase B: admin UI redesign.
4. Làm Phase C: admin UX theo nghiệp vụ.
5. Dọn seed/UI text ở Phase D.
6. Test end-to-end Phase E.
7. Update docs và demo script.

## 4. Các việc không nên làm lúc này

- Không đổi stack nữa.
- Không chuyển sang React.
- Không đổi database schema lớn nếu không có bug nghiệp vụ nghiêm trọng.
- Không thêm payment thật.
- Không thêm upload file nếu thời gian gấp.
- Không làm voucher/promotion engine phức tạp.
- Không refactor backend lớn nếu luồng chính đang chạy ổn.

## 5. Backlog production sau đồ án

Những thứ nên để sau:

- Payment gateway thật.
- Email/SMS notification.
- Upload ảnh sản phẩm từ admin.
- Upload bằng chứng bảo hành.
- Audit log admin.
- Refund/return workflow.
- Promotion/voucher engine.
- Phân quyền chi tiết hơn.
- Logging/monitoring production.
- Backup database tự động.

