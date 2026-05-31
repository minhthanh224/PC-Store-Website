# AeroTech PC Store - Known Limitations

## Checkout/payment/shipping

- Chưa có payment gateway thật.
- Payment method hiện chỉ hỗ trợ `cod` và `bank_transfer` theo schema.
- Chưa có mô phỏng ví điện tử hoặc thanh toán tại cửa hàng.
- Shipping fee đang là rule nội bộ đơn giản, chưa tính theo tỉnh/quận/khoảng cách.
- Chưa có chọn phương thức nhận hàng `delivery/pickup` riêng trong schema.

## Invoice/returns

- Đã có in đơn hàng bằng `window.print()`, chưa có PDF invoice.
- Chưa có return/refund flow đầy đủ.
- Nếu thêm trạng thái `returned`, phải thiết kế stock reversal, serial lifecycle, payment refund và order timeline trước.

## Promotions/bundles/warranty packages

- Promotions đã áp dụng ở checkout ở mức cơ bản.
- Chưa có rule engine nâng cao như min quantity theo category, customer segment, usage limit.
- Bundle offers và warranty packages đã được import/lưu/hiển thị/checkout ở mức demo, chưa có admin CRUD riêng đầy đủ.

## Catalog/data

- Product Import V2 hỗ trợ nhiều CSV, nhưng file import thật vẫn cần validate sạch trước khi commit.
- `replaceCatalog` chỉ dùng cho dev/demo, không dùng production.
- Product image fallback có sẵn, nhưng catalog thật vẫn nên bổ sung ảnh chuẩn.

## Reporting

- Reports đủ cho demo vận hành, nhưng chưa có chart library nâng cao.
- Chưa có cost price/profit đầy đủ.
- Export CSV đã có ở một số module, chưa phải toàn bộ report nâng cao.

## Browser automation

- Chưa có test browser tự động chính thức trong repo.
- Cần smoke thủ công responsive theo `docs/TESTING_GUIDE.md` trước khi demo.

## Security

- Có helmet, rate limit, CORS config, JWT, role middleware và audit logs.
- Chưa có refresh token, 2FA, captcha, forgot password/email thật.
- Admin user reset password dùng mật khẩu tạm thời nhập thủ công, chưa gửi email.
