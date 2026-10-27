# Teamflow

Ứng dụng giao việc và theo dõi tiến độ nhóm. Ứng dụng sử dụng Supabase Auth để đăng nhập và Supabase Database để lưu hồ sơ thành viên, công việc và trạng thái. Khi chưa cấu hình Supabase, ứng dụng chạy với dữ liệu mẫu trên trình duyệt.

## Chạy ứng dụng

```bash
npm install
npm start
```

## Cấu hình Supabase

1. Tạo project Supabase.
2. Mở **Project Settings → API** và lấy **Project URL** cùng **publishable key**. Không dùng `service_role` key trong frontend.
3. Tạo file `.env` ở thư mục gốc từ mẫu `.env.example`, rồi điền:

   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Vào **SQL Editor**, chạy nội dung [supabase/schema.sql](./supabase/schema.sql) để tạo/cập nhật bảng, trigger tạo hồ sơ thành viên, nhóm, mã mời, báo cáo hoàn thành và chính sách RLS. Nếu đã có công việc Supabase cũ, script giữ lại và đưa chúng vào nhóm “Nhóm hiện tại”.
5. Trong **Authentication → URL Configuration**, đặt Site URL là `http://localhost:3010` (hoặc URL triển khai) và thêm URL đó vào Redirect URLs.
6. Đăng nhập vào ứng dụng. Mỗi tài khoản có thể tạo nhóm và trở thành trưởng nhóm, hoặc nhập mã mời để tham gia nhóm.
7. Khởi động lại ứng dụng sau khi chỉnh `.env`.

Để người khác tham gia, mở nhóm rồi chọn **Mã mời** và gửi mã cho họ. Họ cần có tài khoản Supabase trước, sau đó dùng **Tham gia nhóm**. Một tài khoản có thể tham gia nhiều nhóm và chuyển nhóm bằng bộ chọn.

## Quyền truy cập

- Người đã đăng nhập chỉ xem được các nhóm mình tham gia và dữ liệu trong các nhóm đó.
- Trưởng nhóm tạo nhóm có thể giao việc; quyền theo từng nhóm được kiểm tra bằng RLS trong database.
- Thành viên có thể cập nhật trạng thái công việc được giao cho mình.
- Khi hoàn thành công việc, thành viên phải nhập báo cáo chi tiết; báo cáo được lưu và hiển thị cho cả nhóm, và được xóa nếu công việc chuyển lại trạng thái chưa hoàn thành.
- Publishable key được phép dùng trong frontend vì mọi quyền dữ liệu được kiểm soát bằng RLS. Tuyệt đối không đưa `service_role` key vào mã frontend.

## Cấu trúc dữ liệu

- `profiles`: hồ sơ gắn với tài khoản Supabase Auth.
- `tasks`: công việc, người phụ trách, mức ưu tiên, hạn và trạng thái.

Các bản ghi đang ở Appwrite không được tự động chuyển sang Supabase; cần nhập lại hoặc xuất/nhập dữ liệu riêng.

## Kiểm tra build

```bash
npm run build
```
