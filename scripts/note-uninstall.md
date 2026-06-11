# Hướng dẫn Xóa triệt để StarUML (macOS & Windows)

Tài liệu này hướng dẫn cách dọn dẹp sạch toàn bộ dữ liệu cài đặt, cache và tệp cấu hình của StarUML để chuẩn bị cài đặt lại (Reset 30 ngày dùng thử).

---

## 🍎 Hướng dẫn trên macOS (Macbook)

Bạn có thể chọn một trong hai cách dưới đây:

### Cách 1: Sử dụng Script tự động (Khuyên dùng)
Chạy script dọn dẹp tự động đã được tích hợp sẵn:
```bash
./clear.sh
```

### Cách 2: Thực hiện thủ công qua Terminal
Mở ứng dụng **Terminal** và chạy các lệnh sau:

1. **Tắt tiến trình StarUML đang chạy:**
   ```bash
   pkill -f StarUML 2>/dev/null || true
   ```

2. **Xóa ứng dụng chính và toàn bộ tệp cấu hình/cache:**
   ```bash
   rm -rf "/Applications/StarUML.app"
   rm -rf "$HOME/Library/Application Support/StarUML"
   rm -rf "$HOME/Library/Caches/io.staruml.StarUML"
   rm -rf "$HOME/Library/Caches/StarUML"
   rm -f "$HOME/Library/Preferences/io.staruml.StarUML.plist"
   rm -f "$HOME/Library/Preferences/com.staruml.StarUML.plist"
   rm -rf "$HOME/Library/Logs/StarUML"
   rm -rf "$HOME/Library/Logs/io.staruml.StarUML"
   rm -rf "$HOME/Library/Saved Application State/io.staruml.StarUML.savedState"
   rm -rf "$HOME/Library/Saved Application State/com.staruml.StarUML.savedState"
   rm -f "$HOME/Library/Application Support/CrashReporter/StarUML_B7179D46-FBD6-5895-9D1B-08A989E61515.plist"
   rm -f "$HOME/Library/Application Support/com.apple.sharedfilelist/com.apple.LSSharedFileList.ApplicationRecentDocuments/io.staruml.staruml.sfl3"
   ```

3. **Kiểm tra xem còn sót file nào không:**
   ```bash
   find "$HOME/Library" -iname "*staruml*" 2>/dev/null
   ```
   > [!NOTE]
   > Nếu Terminal không trả về kết quả nào thì bạn đã xóa thành công hoàn toàn StarUML.

---

## 💻 Hướng dẫn trên Windows

Bạn có thể sử dụng file tự động hoặc thực hiện thủ công theo các bước sau:

### Cách 1: Sử dụng Script tự động (Khuyên dùng)
**Nhấp đúp chuột** vào file script:
```text
clear.bat
```

### Cách 2: Thực hiện thủ công
* **Bước 1: Gỡ cài đặt ứng dụng**
  1. Mở **Control Panel** trên máy tính.
  2. Chọn **Programs and Features** (hoặc *Uninstall a program*).
  3. Tìm **StarUML**, nhấp chuột phải và chọn **Uninstall** để gỡ cài đặt.

* **Bước 2: Xóa triệt để các thư mục dữ liệu cũ**
  1. Mở **File Explorer** (Win + E), truy cập đường dẫn: `C:\Program Files` -> Tìm và xóa thư mục **StarUML** (nếu còn).
  2. Tiếp tục truy cập thư mục: `C:\Users\<Tên-User>\AppData\Roaming` -> Tìm và xóa thư mục **StarUML**.
     *(Mẹo nhanh: Nhấn tổ hợp phím `Win + R`, gõ `%APPDATA%` rồi nhấn Enter để mở trực tiếp thư mục Roaming).*

---

## 🔄 Bước 3: Tải và cài đặt lại (Cả hai hệ điều hành)

1. Truy cập trang chủ [StarUML Download](https://staruml.io/download) để tải bản cài đặt phù hợp với hệ điều hành của bạn.
2. Mở file setup vừa tải về và tiến hành cài đặt lại như bình thường.

### 🎉 Kết quả
Sau khi hoàn tất, mở StarUML lên bạn sẽ thấy hiển thị lại thông báo **30 ngày dùng thử (30-day evaluation)** thay vì hết hạn như trước đó.

---

## 📺 Tài liệu tham khảo
* **Video hướng dẫn chi tiết:** [Xem trên YouTube](https://youtu.be/gZUSPmEOMGQ?si=xDPRAiWvb4nzXYJr)