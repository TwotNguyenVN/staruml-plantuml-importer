# Kế hoạch triển khai: PlantUML Sequence Diagram Importer

Kế hoạch này hướng dẫn cách bổ sung module **Sequence Diagram Importer** vào extension **`staruml-plantuml-importer`** hiện tại.

---

## 1. Cấu trúc thư mục cập nhật

Chúng ta sẽ thêm file `sequence-parser.js` vào thư mục `parsers/` của extension:

```text
staruml-plantuml-importer/
├── package.json
├── menus/
│   └── menu.json                 # Đăng ký thêm menu "Import Sequence Diagram..."
├── main.js                       # Thêm command và điều phối cho Sequence Diagram
├── utils/
│   └── dialog-helper.js
└── parsers/
    ├── usecase-parser.js
    ├── class-parser.js
    └── sequence-parser.js        # [NEW] Module phân tích cú pháp Sequence Diagram
```

---

## 2. Kế hoạch chi tiết từng bước

### Bước 2.1: Cập nhật Menu cấu hình

#### [MODIFY] [menu.json](file:///d:/Documents/CODE/staruml-mcp-server/staruml-plantuml-importer/menus/menu.json)
Đăng ký thêm lệnh import Sequence Diagram trong menu:
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
            },
            {
              "label": "Import Sequence Diagram...",
              "id": "plantuml-importer:import-sequencediagram",
              "command": "plantuml-importer:import-sequencediagram"
            }
          ]
        }
      ]
    }
  ]
}
```

---

### Bước 2.2: Xây dựng Module phân tích Sequence Diagram (`parsers/sequence-parser.js`)

Module này sẽ đảm nhận 2 nhiệm vụ chính:

1.  **Phân tích cú pháp (Parsing):**
    *   **Lifelines (Đối tượng tham gia):** Nhận diện các từ khóa `actor`, `participant`, `boundary`, `control`, `entity`, `database`, `collections` kèm alias (ví dụ: `actor User as U`).
    *   **Messages (Thông điệp):** Nhận diện các mũi tên liên kết giữa các Lifelines:
        *   `->`: Đồng bộ (Synchronous Call - `messageSort = synchCall`)
        *   `->>`: Không đồng bộ (Asynchronous Call - `messageSort = asynchCall`)
        *   `-->`: Phản hồi (Reply - `messageSort = reply`)
        *   `->*`: Tạo đối tượng (Create - `messageSort = createMessage`)
        *   `->x`: Hủy đối tượng (Delete - `messageSort = deleteMessage`)
    *   Đọc nhãn thông điệp sau dấu hai chấm `:` (ví dụ: `U -> Auth : Login Request`).

2.  **Thuật toán Sắp xếp Vị trí (Layout Engine):**
    *   **Lifelines X-Coordinate:** Sắp xếp các Lifeline nằm ngang từ trái qua phải với khoảng cách cố định (ví dụ: `spacingX = 220px`). Đầu Lifeline nằm ở `y = 50`.
    *   **Lifelines Height (Chiều dài lifeline stem):** Tự động tính chiều cao của Lifeline dựa trên số lượng message: `lifelineHeight = totalMessages * 45 + 120`. Điều này đảm bảo đường nét đứt kéo dài đủ để chứa tất cả thông điệp.
    *   **Messages Y-Coordinate:** Mỗi thông điệp sẽ được gán tọa độ Y tăng dần theo thứ tự thời gian (ví dụ: `messageY = 120 + index * 45`).
    *   **Trục kết nối Message:** Thiết lập các điểm nối (`points`) của message nối thẳng hàng ngang giữa 2 Lifeline tương ứng:
        *   `x1 = tailLifelineView.left + tailLifelineView.width / 2`
        *   `x2 = headLifelineView.left + headLifelineView.width / 2`
        *   `y = currentY`

---

### Bước 2.3: Cập nhật file điều phối `main.js`

#### [MODIFY] [main.js](file:///d:/Documents/CODE/staruml-mcp-server/staruml-plantuml-importer/main.js)
1.  Đăng ký command mới: `plantuml-importer:import-sequencediagram`.
2.  Viết hàm `handleImportSequenceDiagram()` kiểm tra loại biểu đồ hiện tại (`UMLSequenceDiagram`), mở dialog nhập mã, và truyền dữ liệu cho `sequence-parser.js`.

---

## 3. Kế hoạch Xác minh (Verification Plan)

### Kiểm thử thủ công:
1.  **Bước 1:** Chạy script cài đặt `install.bat` để cập nhật extension.
2.  **Bước 2:** Mở StarUML, tạo một **Sequence Diagram** trống (`Model` -> `Add Diagram` -> `Sequence Diagram`).
3.  **Bước 3:** Vào `Tools` -> `PlantUML Importer` -> Chọn **`Import Sequence Diagram...`**.
4.  **Bước 4:** Paste đoạn mã PlantUML mẫu sau và nhấn **OK**:
    ```plantuml
    @startuml
    actor User as U
    participant "Auth Service" as Auth
    database DB as DB

    U -> Auth : Login Request
    Auth -> DB : Query User
    DB --> Auth : User Data
    Auth --> U : Token / Response
    @enduml
    ```
5.  **Bước 5:** Xác minh:
    *   Tất cả Lifelines hiển thị nằm ngang, không bị đè nhau.
    *   Các thông điệp vẽ nối ngang từ trái sang phải / phải sang trái theo đúng trình tự Y tăng dần.
    *   Mũi tên thông điệp đồng bộ nét liền và thông điệp phản hồi nét đứt hiển thị đúng chuẩn UML.
