# Bộ nhập sơ đồ PlantUML cho StarUML

🌍 **Ngôn ngữ:** [English](README.md) | [Tiếng Việt](README-VN.md)

Tiện ích mở rộng dành cho StarUML hỗ trợ phân tích và nhập các loại **Sơ đồ Use Case**, **Sơ đồ lớp (Class Diagram)**, và **Sơ đồ tuần tự (Sequence Diagram)** từ cú pháp **PlantUML**, từ đó tự động sinh chúng thành các phần tử UML gốc bên trong StarUML.

## 📊 Sơ đồ hỗ trợ & Kế hoạch phát triển

| Loại sơ đồ | Trạng thái | Ghi chú |
|:---|:---|:---|
| **Use Case Diagram** (Biểu đồ Use Case) | ✅ Đã hỗ trợ | Phân phối dạng cột, bọc hệ thống |
| **Class Diagram** (Biểu đồ lớp) | ✅ Đã hỗ trợ | Bố cục dạng lưới, đầy đủ thuộc tính/phương thức & quan hệ |
| **Sequence Diagram** (Biểu đồ tuần tự) | ✅ Đã hỗ trợ | Sắp xếp theo trình tự thời gian, loại thông điệp, icon tác nhân |
| **Flowchart** (Sơ đồ dòng chảy / Lưu đồ) | ⏳ Sắp hỗ trợ | Lên kế hoạch cập nhật trong tương lai |
| **ER Diagram** (Biểu đồ ERD) | ⏳ Sắp hỗ trợ | Lên kế hoạch cập nhật trong tương lai |
| **Mindmap** (Sơ đồ tư duy) | ⏳ Sắp hỗ trợ | Lên kế hoạch cập nhật trong tương lai |
| **Requirement Diagram** (Biểu đồ yêu cầu) | ⏳ Sắp hỗ trợ | Lên kế hoạch cập nhật trong tương lai |
| **State Diagram** (Biểu đồ trạng thái) | ⏳ Sắp hỗ trợ | Lên kế hoạch cập nhật trong tương lai |

## ✨ Các tính năng nổi bật

- Phân tích cú pháp PlantUML cho biểu đồ Use Case, Class và Sequence.
- Thuật toán bố cục tự động: Bố cục lưới thông minh cho Class Diagram, căn cột ngang cho Use Case, và xếp chồng thông điệp theo trục thời gian đứng trên Sequence Diagram.
- Hỗ trợ đầy đủ các thuộc tính, phương thức, phạm vi truy cập (visibility) và bội số (multiplicities) trên Class Diagram.
- Hỗ trợ các quan hệ: `<<include>>`, `<<extend>>`, thừa kế (generalization), hiện thực hóa giao diện (interface realization), liên kết (association), thu nạp (aggregation) và hợp thành (composition).
- Hỗ trợ đầy đủ các loại lifeline (`actor`, `participant`, `boundary`, `control`, `entity`, `database`, `collections`) và đường thông điệp (`->`, `-->`, `->>`, `->*`, `->x`) trên Sequence Diagram.
- Tương thích tốt với **StarUML v7+**.

## 📦 Cài đặt

### Cài đặt nhanh

#### Windows
1. Tải về hoặc nhân bản (clone) kho lưu trữ này.
2. **Nhấp đúp** vào file `install.bat`.
3. Khởi động lại StarUML.

#### macOS / Linux
Chạy lệnh sau trong Terminal:
```bash
chmod +x install.sh
./install.sh
```

### Cài đặt thủ công

Sao chép toàn bộ nội dung của kho lưu trữ này vào thư mục extension tương ứng của StarUML:

| Hệ điều hành | Đường dẫn thư mục cài đặt |
|:---|:---|
| Windows | `%APPDATA%\StarUML\extensions\user\staruml-plantuml-importer` |
| macOS | `~/Library/Application Support/StarUML/extensions/user/staruml-plantuml-importer` |
| Linux | `~/.config/StarUML/extensions/user/staruml-plantuml-importer` |

Sau đó khởi động lại StarUML.

## 🚀 Cách sử dụng

1. Mở ứng dụng StarUML.
2. Tạo một biểu đồ mới:
   - Sơ đồ Use Case: `Model` → `Add Diagram` → `Use Case Diagram`
   - Sơ đồ Class: `Model` → `Add Diagram` → `Class Diagram`
   - Sơ đồ Sequence: `Model` → `Add Diagram` → `Sequence Diagram`
3. Truy cập: **`Tools` → `PlantUML Importer` → Chọn lệnh nhập tương ứng**.
4. Dán đoạn mã PlantUML vào hộp thoại.
5. Nhấp **OK** — sơ đồ sẽ được tự động vẽ ra trên canvas!

## 📝 Cú pháp PlantUML được hỗ trợ

### Biểu đồ Use Case

```plantuml
@startuml
actor "Guest" as Guest
actor "Member" as Member
actor "Admin" as Admin

Member --|> Guest

rectangle "My System" {
    usecase "Login" as UC1
    usecase "Search" as UC2
    usecase "Order" as UC3
    usecase "Manage Users" as UC4
}

Guest --> UC1
Guest --> UC2
Member --> UC3
Admin --> UC4
UC3 ..> UC1 : <<include>>
@enduml
```

### Biểu đồ Class

```plantuml
@startuml
class User {
    - userId: String
    - fullName: String
    + login(username: String): boolean
}

class Member {
    - memberCode: String
    + borrowBook(bookCopyId: String): Loan
}

User <|-- Member
@enduml
```

### Biểu đồ Sequence (Tuần tự)

```plantuml
@startuml
actor User as U
participant "Auth Service" as Auth
database DB as DB

U -> Auth : Yêu cầu đăng nhập
Auth -> DB : Truy vấn người dùng
DB --> Auth : Thông tin người dùng
Auth --> U : Trả về Token / Kết quả
@enduml
```

## 🗑️ Gỡ cài đặt sạch sẽ (macOS)

Nếu bạn cần gỡ bỏ hoàn toàn StarUML và toàn bộ cấu hình, cache, extension cũng như log của nó khỏi thiết bị macOS, bạn có thể sử dụng script dọn dẹp được cung cấp sẵn:

```bash
chmod +x clear.sh
./clear.sh
```

## 📄 Giấy phép

MIT
