# Kế hoạch triển khai: PlantUML Diagram Importer (vẽ Use Case & Class Diagram)

Kế hoạch này hướng dẫn cách cấu trúc lại extension hiện tại thành một extension đa năng: **`staruml-plantuml-importer`**, đồng thời hiện thực hóa bộ phân tích cú pháp **Class Diagram** quy mô lớn.

---

## 1. Cấu trúc thư mục mới đề xuất

Chúng ta sẽ chuyển đổi thư mục `staruml-usecase-importer` thành `staruml-plantuml-importer` với cấu trúc sau:

```text
staruml-plantuml-importer/
├── package.json                  # Cập nhật thông tin extension mới
├── menus/
│   └── menu.json                 # Cấu hình menu Tools -> PlantUML Importer -> [Từng sơ đồ]
├── main.js                       # Nhận sự kiện từ menu, gọi các module parser tương ứng
├── utils/
│   └── dialog-helper.js          # Module hiển thị hộp thoại nhập mã (chung)
└── parsers/
    ├── usecase-parser.js         # Module phân tích cú pháp Use Case
    └── class-parser.js           # Module phân tích cú pháp Class Diagram
```

---

## 2. Kế hoạch chi tiết từng bước

### Bước 2.1: Cập nhật cấu hình và Menu

#### [MODIFY] [package.json](file:///d:/Documents/CODE/staruml-mcp-server/staruml-usecase-importer/package.json)
Cập nhật tên extension thành `staruml-plantuml-importer` và mô tả hỗ trợ nhiều sơ đồ.

#### [NEW] [menu.json](file:///d:/Documents/CODE/staruml-mcp-server/staruml-usecase-importer/menus/menu.json)
Thay thế `usecase-menu.json` bằng cấu trúc menu phân tầng:
```json
{
  "menu": [
    {
      "id": "tools",
      "submenu": [
        {
          "label": "PlantUML Importer",
          "id": "plantuml-importer",
          "submenu": [
            {
              "label": "Import Use Case Diagram...",
              "id": "plantuml-importer:import-usecase",
              "command": "plantuml-importer:import-usecase"
            },
            {
              "label": "Import Class Diagram...",
              "id": "plantuml-importer:import-classdiagram",
              "command": "plantuml-importer:import-classdiagram"
            }
          ]
        }
      ]
    }
  ]
}
```

#### [DELETE] [usecase-menu.json](file:///d:/Documents/CODE/staruml-mcp-server/staruml-usecase-importer/menus/usecase-menu.json)
Xóa file cấu hình menu cũ.

---

### Bước 2.2: Xây dựng Module tiện ích chung (`utils/dialog-helper.js`)

Tách phần hiển thị dialog nhập mã PlantUML ra một file riêng để dùng chung cho tất cả các loại sơ đồ.
*   **Tham số:** `title` (Tiêu đề dialog), `sampleCode` (Mã mẫu hiển thị sẵn).
*   **Đầu ra:** Trả về `Promise` chứa chuỗi PlantUML do người dùng paste vào.

---

### Bước 2.3: Di chuyển code Use Case sang `parsers/usecase-parser.js`

Chuyển logic parse Use Case hiện có từ `main.js` sang module độc lập `parsers/usecase-parser.js` để làm sạch file chính.

---

### Bước 2.4: Xây dựng bộ phân tích Class Diagram (`parsers/class-parser.js`)

Đây là phần lõi mới. Bộ phân tích Class Diagram cần xử lý:
1.  **Parser dòng lệnh:**
    *   Nhận dạng `class`, `abstract class`, `interface`, `enum`.
    *   Đọc các thuộc tính bên trong lớp: Phạm vi (`+`, `-`, `#`, `~`), tên thuộc tính, kiểu dữ liệu.
    *   Đọc các phương thức bên trong lớp: Tên phương thức, danh sách tham số, kiểu trả về.
    *   Đọc các quan hệ bên ngoài: Kế thừa (`<|--`), Hiện thực hóa (`..|>`), Kết tập (`o--`), Hợp thành (`*--`), Phụ thuộc (`..>`), Liên kết thường (`--`).
    *   Đọc số lượng đầu quan hệ (Multiplicity) ví dụ: `"1" -- "0..*"`
2.  **Thuật toán Sắp xếp Vị trí (Layout Engine):**
    *   Sử dụng **Grid Layout** thông minh phân bổ theo hàng/cột để không chồng lấn.
    *   Ước lượng chiều rộng (`width`) và chiều cao (`height`) của mỗi Class/Enum dựa trên độ dài tên lớp, số lượng thuộc tính và phương thức để tránh chữ bị tràn.
    *   Phân loại:
        *   Hàng 0: Enums (rộng vừa phải, xếp góc hoặc hàng đầu).
        *   Hàng 1: Abstract classes / Interfaces / Core Entities (ví dụ: `User`, `Library`, `Book`).
        *   Hàng 2: Subclasses / Detail Entities (ví dụ: `Member`, `Staff`, `Admin`, `BookCopy`, `Branch`).
        *   Hàng 3: Transactions / Logs (ví dụ: `Loan`, `Reservation`, `Fine`, `Payment`, `Review`, `Notification`, `ImportReceipt`).
        *   Hàng 4: Services (ví dụ: `SearchService`, `AuthService`, `DashboardService`).

---

### Bước 2.5: Cập nhật `main.js` để quản lý các Module

`main.js` mới sẽ cực kỳ tinh gọn, chỉ làm nhiệm vụ:
1.  Đăng ký 2 command mới: `plantuml-importer:import-usecase` và `plantuml-importer:import-classdiagram`.
2.  Gọi `dialog-helper` hiển thị form tương ứng với từng command.
3.  Truyền dữ liệu cho module `usecase-parser.js` hoặc `class-parser.js` xử lý.

---

### Bước 2.6: Cập nhật file cài đặt và đổi tên thư mục

1.  Cập nhật file [install.bat](file:///d:/Documents/CODE/staruml-mcp-server/staruml-usecase-importer/install.bat) và [install.sh](file:///d:/Documents/CODE/staruml-mcp-server/staruml-usecase-importer/install.sh) để tự động xóa extension cũ (`staruml-usecase-importer`) và cài đặt thư mục extension mới (`staruml-plantuml-importer`).
2.  Đổi tên thư mục dự án cục bộ từ `staruml-usecase-importer` thành `staruml-plantuml-importer`.

---

## 3. Kế hoạch Xác minh (Verification Plan)

### Kiểm thử thủ công:
1.  **Bước 1:** Chạy script cài đặt `install.bat` để cập nhật extension trên máy.
2.  **Bước 2:** Mở StarUML, tạo một **Class Diagram** mới.
3.  **Bước 3:** Vào `Tools` -> `PlantUML Importer` -> Chọn **`Import Class Diagram...`**.
4.  **Bước 4:** Paste đoạn mã Class Diagram của hệ thống thư viện ở trên và nhấn **OK**.
5.  **Bước 5:** Xác minh:
    *   Tất cả Class, Interface, Enum được tạo đúng kiểu phần tử trong StarUML Model Explorer.
    *   Các thuộc tính, phương thức hiển thị đúng phạm vi truy cập (Public, Private).
    *   Các đường quan hệ (Inheritance, Aggregation, Association) hiển thị đúng chiều mũi tên và không bị đứt gãy.
    *   Bố cục tự động hiển thị gọn gàng, không đè lấp lên nhau.
