# AeroTech PC Store - Tóm tắt chức năng cho báo cáo

## 1. Giới thiệu hệ thống

AeroTech PC Store là website thương mại điện tử bán PC, laptop, linh kiện, phụ kiện và dịch vụ kỹ thuật. Hệ thống được xây dựng bằng HTML/CSS/JavaScript thuần ở frontend, Node.js + Express ở backend và MySQL ở database. Mục tiêu của project là mô phỏng một cửa hàng công nghệ có nghiệp vụ tương đối thực tế, không chỉ dừng ở trang giới thiệu sản phẩm.

Hệ thống gồm hai khu vực chính:

- Storefront cho khách hàng tìm kiếm, xem sản phẩm, so sánh, thêm vào giỏ hàng, đặt hàng và theo dõi bảo hành.
- Admin panel cho nhân viên quản trị sản phẩm, kho serial, đơn hàng, bảo hành, đánh giá, báo cáo, nhật ký và người dùng.

## 2. Nhóm người dùng

Hệ thống phân quyền theo 5 nhóm:

- Guest: khách chưa đăng nhập, được xem sản phẩm, so sánh sản phẩm và tra cứu bảo hành public.
- Customer: khách hàng đã đăng nhập, được mua hàng, quản lý tài khoản, địa chỉ, đơn hàng, wishlist, review và yêu cầu bảo hành.
- Admin: quản trị viên toàn quyền, quản lý catalog, import dữ liệu, đơn hàng, serial, bảo hành, review, reports, audit logs và users.
- Sales: nhân viên bán hàng, tập trung xử lý đơn hàng, duyệt đơn, cập nhật trạng thái và ghi chú nội bộ.
- Technician: kỹ thuật viên, tập trung kho serial, gán serial và xử lý bảo hành.

## 3. Chức năng khách hàng

Khách hàng có thể duyệt trang chủ, xem danh sách sản phẩm và sử dụng bộ lọc theo danh mục, thương hiệu, loại sản phẩm, giá và cấu hình kỹ thuật như CPU, GPU, RAM, storage, màn hình, tần số quét. Product card hiển thị ảnh, giá, giảm giá, thông số ngắn, trạng thái hàng, nút yêu thích và nút so sánh.

Trang chi tiết sản phẩm hiển thị gallery ảnh, thông tin mua hàng, giá bán, tình trạng tồn, bảo hành, cấu hình nổi bật, bảng thông số kỹ thuật theo nhóm, điểm nổi bật, cam kết dịch vụ, ưu đãi đi kèm, mua kèm ưu đãi, gói bảo hành mở rộng, đánh giá và sản phẩm tương tự. Với sản phẩm dịch vụ, giao diện dùng CTA tư vấn thay vì xử lý như hàng tồn kho vật lý.

Hệ thống có giỏ hàng bằng localStorage, cho phép cập nhật số lượng, xóa sản phẩm, lưu bundle addon, lưu gói bảo hành mở rộng và áp dụng mã ưu đãi. Checkout yêu cầu đăng nhập, hỗ trợ chọn địa chỉ đã lưu, nhập thông tin giao hàng, chọn COD hoặc chuyển khoản, sau đó backend tự tính lại giá để tạo đơn pending.

Khách hàng có trang tài khoản để cập nhật hồ sơ, đổi mật khẩu, quản lý sổ địa chỉ, xem lịch sử đơn hàng, xem chi tiết đơn, in đơn hàng, tạo yêu cầu bảo hành, theo dõi phiếu bảo hành và quản lý wishlist.

## 4. Chức năng quản trị

Admin panel có dashboard tổng quan, quản lý sản phẩm, thương hiệu, danh mục, kho serial, đơn hàng, bảo hành, đánh giá, báo cáo, nhật ký hệ thống và người dùng.

Quản lý sản phẩm hỗ trợ xem danh sách, lọc, phân trang, thêm/sửa sản phẩm thủ công, export CSV và import hàng loạt bằng file zip. Import Product V2 hỗ trợ nhiều CSV: sản phẩm, ảnh, thông số, highlights, commitments, promotions, product promotions, bundle offers, warranty packages và product warranty packages. Import có preview, validation, commit bằng transaction và các chế độ xử lý slug conflict như strict, updateBySlug và replaceCatalog.

Kho serial hỗ trợ xem tổng quan tồn, thêm serial thủ công, import serial CSV, export serial CSV và theo dõi trạng thái serial. Serial được dùng trong quy trình bán sản phẩm cần số serial và trong quy trình bảo hành.

Quản lý đơn hàng hỗ trợ xem danh sách, lọc, xuất CSV, xem chi tiết, cập nhật trạng thái, thêm ghi chú nội bộ, gán serial và in đơn hàng. Hệ thống chặn hoàn tất đơn serialized nếu chưa gán đủ serial.

Quản lý bảo hành hỗ trợ tạo phiếu, xem danh sách, xem chi tiết, cập nhật trạng thái và ghi chú kỹ thuật. Backend kiểm tra serial đã bán, đơn đã completed, còn hạn bảo hành và chặn duplicate active ticket.

Review moderation cho phép admin xem đánh giá theo trạng thái pending/approved/rejected, duyệt hoặc từ chối review. Storefront chỉ hiển thị review approved.

Reports hiển thị doanh thu, đơn hàng, tồn kho, bảo hành, sản phẩm bán chạy và breakdown doanh thu theo hàng hóa, mua kèm, gói bảo hành, phí vận chuyển và giảm giá. Một số báo cáo có export CSV.

Audit log ghi nhận các thao tác admin quan trọng, cho phép lọc theo hành động, entity, role, ngày và export CSV. User management cho phép admin tạo, sửa, khóa/mở khóa, đặt mật khẩu tạm thời và có guard tránh tự khóa hoặc làm mất admin cuối cùng.

## 5. Nghiệp vụ nổi bật

- Import sản phẩm hàng loạt bằng zip CSV, có validate dữ liệu và chống path traversal.
- Quản lý serial cho sản phẩm cần serial, gắn serial vào order item và dùng serial để tra cứu bảo hành.
- Checkout backend tự tính lại giá, không tin giá từ frontend.
- Promotion, bundle offer và warranty package được đưa vào cart/order ở mức nghiệp vụ demo.
- Bảo hành theo serial, có kiểm tra thời hạn và trạng thái đơn hàng.
- Review chỉ cho khách đã mua sản phẩm trong đơn completed, sau đó admin duyệt mới hiển thị.
- Báo cáo doanh thu và tồn kho phục vụ trình bày hoạt động cửa hàng.
- Audit log và phân quyền role giúp hệ thống giống quy trình vận hành thật hơn.

## 6. Điểm nâng cao so với website demo cơ bản

Project không chỉ có CRUD sản phẩm và giỏ hàng đơn giản. Hệ thống đã có phân quyền nhiều vai trò, workflow đơn hàng, kho serial, bảo hành, import catalog lớn, compare cấu hình, filter kỹ thuật, review moderation, báo cáo, audit log và user management. Đây là các thành phần thường xuất hiện trong hệ thống bán PC/laptop có vận hành nội bộ.

## 7. Giới hạn hiện tại

- Thanh toán chỉ mô phỏng COD/chuyển khoản, chưa tích hợp VNPay/Momo/thẻ.
- Phí giao hàng dùng rule đơn giản, chưa tính theo khu vực hoặc đơn vị vận chuyển.
- Cart lưu localStorage, chưa đồng bộ server.
- Chưa có hoàn hàng/refund/cancel self-service.
- Chưa có hóa đơn PDF chuyên nghiệp, chỉ có print order bằng browser.
- Promotions, bundle offers và warranty packages chưa có admin CRUD riêng ngoài import.
- Reports chưa có chart library hoặc phân tích lợi nhuận theo giá vốn.
- Một số workflow nên được test thủ công trên browser trước demo, đặc biệt import file thật, serialized order và warranty expired.

## 8. Hướng phát triển tiếp theo

- Bổ sung payment simulation nâng cao hoặc tích hợp sandbox payment gateway.
- Thêm return/refund/cancel order flow.
- Xây dựng admin CRUD riêng cho promotions, bundle offers và warranty packages.
- Thêm server-side cart hoặc đồng bộ cart theo tài khoản.
- Tạo PDF invoice/packing slip.
- Thêm chart library cho reports và export nâng cao.
- Hoàn thiện SEO, accessibility và automated browser tests.
- Bổ sung audit coverage sâu hơn cho các thao tác nghiệp vụ quan trọng.
