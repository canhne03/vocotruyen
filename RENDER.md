# Hướng dẫn chi tiết triển khai lên Render.com

Chào bạn! Đây là hướng dẫn từng bước để bạn đưa hệ thống **Võ Cổ Truyền Tây Ninh** lên internet cho mọi người cùng sử dụng.

## Bước 1: Chuẩn bị trên GitHub
Đảm bảo bạn đã đẩy toàn bộ mã nguồn mới nhất lên GitHub (tôi đã thực hiện giúp bạn lệnh `git push` ở bước trước).

## Bước 2: Tạo tài khoản và Web Service trên Render
1.  Truy cập [Render.com](https://render.com/) và nhấn **GET STARTED**.
2.  Chọn **GitHub** để đăng nhập bằng tài khoản của bạn.
3.  Sau khi đăng nhập, tại trang Dashboard, nhấn nút **New +** (màu xanh ở trên cùng bên phải) và chọn **Web Service**.

## Bước 3: Kết nối với Repository
1.  Tìm kiếm dự án `vocotruyen` trong danh sách các Repository của bạn.
2.  Nhấn nút **Connect** bên cạnh tên dự án.

## Bước 4: Cấu hình Web Service
Khi trang cấu hình hiện ra, bạn hãy điền các thông tin sau:
- **Name**: `vocotruyen-tn` (hoặc tên bất kỳ bạn thích).
- **Environment**: `Python 3` (thường Render tự nhận diện).
- **Region**: Chọn vùng gần bạn nhất (ví dụ: `Singapore` hoặc `Ohio`).
- **Branch**: `master` (hoặc `main` nếu bạn đã đổi tên).
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Plan Type**: Chọn **Free** (Miễn phí).

## Bước 5: Kiểm tra và Truy cập
1.  Nhấn nút **Create Web Service** ở dưới cùng.
2.  Render sẽ bắt đầu quá trình "Build". Bạn sẽ thấy các dòng thông báo hiện ra ở tab **Logs**.
3.  Khi thấy dòng chữ `Your service is live!`, hãy nhìn lên phía trên cùng bên trái (dưới tên dự án), bạn sẽ thấy một link có dạng: `https://vocotruyen-tn.onrender.com`.

**Lưu ý quan trọng về Dữ liệu (TinyDB):**
- Trên gói **Free** của Render, mọi dữ liệu mới bạn thêm vào (như tạo võ sinh mới, đổi mật khẩu) sẽ **bị mất** khi máy chủ khởi động lại hoặc bạn cập nhật code mới (vì Render sử dụng ổ đĩa tạm thời).
- **Giải pháp**: Nếu bạn muốn dữ liệu được lưu vĩnh viễn, bạn cần nâng cấp lên gói có phí và sử dụng **"Persistent Disk"** hoặc chuyển sang dùng cơ sở dữ liệu đám mây (như MongoDB Atlas). Hiện tại tôi vẫn để TinyDB để bạn dễ làm quen ban đầu.

---
Chúc bạn triển khai thành công! Nếu gặp lỗi ở bước nào, hãy chụp màn hình hoặc copy nội dung lỗi gửi cho tôi nhé!
