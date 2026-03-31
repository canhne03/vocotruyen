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

## Lưu ý về triển khai (Deployment)
Nếu bạn muốn chia sẻ một đường link để mọi người truy cập từ xa (không phải qua localhost), bạn cần:
1. Triển khai code Backend lên một máy chủ công khai.
2. Cập nhật `API_URL` trong các file JS (`index.js`, `dashboard.js`, `vosinh.js`) để trỏ đến địa chỉ Backend mới.
