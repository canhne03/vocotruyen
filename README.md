# Dự án Võ Cổ Truyền Tây Ninh (VCT TN)

Hệ thống quản lý Võ sinh và Huấn luyện viên dành cho Võ Cổ Truyền Tây Ninh.

## Tại sao người khác không thể kết nối đến Backend?

Khi bạn chia sẻ mã nguồn lên GitHub, GitHub chỉ lưu trữ mã (code). Để hệ thống hoạt động, **máy chủ Backend (FastAPI)** phải được chạy trên máy tính của người dùng hoặc được triển khai (deploy) lên một dịch vụ đám mây (như Render, Heroku, hoặc VPS).

Nếu người khác chỉ mở file `index.html` hoặc xem qua GitHub Pages, trình duyệt sẽ báo lỗi "không thể kết nối" vì không tìm thấy máy chủ tại `localhost:8000`.

---

## Hướng dẫn cài đặt và chạy ứng dụng

Người dùng khác cần thực hiện các bước sau để chạy dự án trên máy tính của họ:

### 1. Cài đặt Python
Đảm bảo đã cài đặt Python (phiên bản 3.9 trở lên).

### 2. Cài đặt các thư viện cần thiết
Mở terminal (PowerShell hoặc Command Prompt) tại thư mục dự án và chạy:
```bash
pip install -r backend/requirements.txt
```

### 3. Khởi tạo dữ liệu (Nếu cần)
Để có dữ liệu mẫu ban đầu (Võ sinh, HLV, Cấp đai), hãy chạy:
```bash
python backend/migrate_to_tinydb.py
```

### 4. Chạy máy chủ Backend
Khởi động máy chủ FastAPI:
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

### 5. Truy cập ứng dụng
Sau khi máy chủ báo thành công (`Application startup complete`), hãy mở trình duyệt và truy cập vào:
**[http://localhost:8000](http://localhost:8000)**

---

## Các tài khoản thử nghiệm (Sau khi chạy Migration)

### Huấn luyện viên (HLV)
- **MSHLV**: `001`
- **Mật khẩu**: `hlv001`

### Võ sinh (VS)
- **MSVS**: `001100011`
- **Mật khẩu**: `vs001`

## Cách đưa trang web lên Internet (đối với Mobile/Người dùng khác)

Nếu bạn muốn người khác chỉ cần mở link trên điện thoại là dùng được luôn (không cần tải code), bạn nên sử dụng **Render.com** (miễn phí):

1.  **Đăng ký/Đăng nhập** vào [Render.com](https://render.com/) bằng tài khoản GitHub.
2.  Chọn **"New"** -> **"Web Service"**.
3.  Kết nối với Repository GitHub này (`vocotruyen`).
4.  **Cấu hình trên Render:**
    - **Language**: `Python`
    - **Build Command**: `pip install -r backend/requirements.txt`
    - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5.  Nhấn **Create Web Service**.

Sau vài phút, Render sẽ cấp cho bạn một đường link (ví dụ: `https://vct-tn.onrender.com`). Bạn chỉ cần gửi link này cho mọi người là họ có thể đăng nhập trên điện thoại bình thường!

> [!IMPORTANT]
> Vì cơ sở dữ liệu `vct_db.json` đang được để trong `.gitignore` để bảo mật, khi chạy trên Render nó sẽ bắt đầu với dữ liệu trống. Bạn có thể cần cấu hình một "Disk" trên Render hoặc bỏ qua file đó khỏi .gitignore nếu muốn dùng dữ liệu có sẵn (không khuyến khích cho dữ liệu thực).
