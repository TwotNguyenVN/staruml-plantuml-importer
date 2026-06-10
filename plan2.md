# Kế Hoạch Nâng Cấp Thuật Toán Sắp Xếp Sơ Đồ Use Case (Leveling Layout)

## 1. Phân Tích Hiện Trạng
- **Hiện tại:** Thuật toán trong `usecase-parser.js` đang dàn trải các Use Case theo chiều dọc (Y) và căn giữa bên trong các Boundary (Package/Rectangle). Thuật toán này rất phù hợp với **Cấp 0** vì Cấp 0 chủ yếu thể hiện sự phân nhóm lớn.
- **Vấn đề:** Ở **Cấp 1** và **Cấp 2**, sự phức tạp nằm ở các mũi tên quan hệ `<<include>>` và `<<extend>>`. Nếu dùng thuật toán Cấp 0, các Use Case sẽ bị xếp dọc một hàng dài, các đường link `include/extend` sẽ đan chéo và đè lên nhau rất rối mắt.

## 2. Tiêu Chí Nhận Diện Cấp Độ (Dựa trên File Mẫu C0, C1, C2)
Tool cần tự động nhận diện cấp độ sơ đồ để áp dụng đúng thuật toán. Việc nhận diện sẽ kết hợp 2 yếu tố: **Cấu trúc Đồ thị (Graph Topology)** và **Từ khóa (Keywords)**.



### A. Nhận diện qua Cấu trúc Đồ thị (Ưu Tiên)
Nếu không có từ khóa, ta sẽ phân tích các quan hệ (relations) trong file bằng thuật toán Topology. Thuật toán này dựa trên số liệu phân tích của file `usecaseC0.puml`, `usecaseC1.puml` và `usecaseC2.puml`:

- **Bước 1: Lọc Sơ đồ Tổng quan (Cấp 0):**
  - Quét toàn bộ mảng `relations`. Đếm tổng số lượng `UMLInclude` và `UMLExtend`.
  - **Điều kiện:** Nếu `tổng số include + tổng số extend == 0` (hoặc chiếm tỉ lệ cực nhỏ < 10% tổng số liên kết) ➡️ Nhận diện là **Cấp 0**.

- **Bước 2: Phân loại Cấp 1 và Cấp 2 qua Tổng số lượng Include/Extend:**
  - Nếu sơ đồ không phải Cấp 0, ta đếm tổng số liên kết `<<include>>` và `<<extend>>` trong toàn bộ sơ đồ.
  - **Luật phân loại cực nhanh và hiệu quả:**
    - Nếu **`tổng extend > tổng include`** ➡️ Sơ đồ mang tính chất mở rộng nhiều hơn là quy trình tuần tự ➡️ Nhận diện là **Cấp 1**. (Ví dụ ở file C1: có 8 extend nhưng chỉ 1 include).
    - Nếu **`tổng extend < tổng include`** ➡️ Sơ đồ mang tính chất quy trình gồm nhiều bước bắt buộc ➡️ Nhận diện là **Cấp 2**. (Ví dụ ở file C2: có 9 include nhưng chỉ 4 extend).

- **Bước 3: Dự phòng chi tiết qua Use Case Trung Tâm (Main UC):**
  - Nếu `tổng extend == tổng include`, thuật toán sẽ tìm Use Case có nhiều liên kết nhất (Centrality Score cao nhất) làm Main UC.
  - Đếm `outInclude` (số mũi tên include trỏ ra từ Main UC).
  - Nếu `outInclude >= 2` ➡️ **Cấp 2** (Main UC bị xé nhỏ thành quy trình). Ngược lại ➡️ **Cấp 1** (Main UC là tâm của các chức năng mở rộng).


### B. Nhận diện qua Từ Khóa (Dự Phòng)
Đọc title hoặc tên rectangle để tìm các từ khóa khai báo cấp độ rõ ràng:
- Chứa cụm `Cấp 0`, `cấp 0`, `Level 0`, `UC-00` ➡️ Nhận diện là **Cấp 0**.
- Chứa cụm `Cấp 1`, `cấp 1`, `Level 1` ➡️ Nhận diện là **Cấp 1**.
- Chứa cụm `Cấp 2`, `cấp 2`, `Level 2` ➡️ Nhận diện là **Cấp 2**.

## 3. Ý Tưởng Thuật Toán Sắp Xếp (Layout Algorithms)

### A. Thuật Toán Cấp 0 (Đã có, chỉ cần tối ưu)
- Dàn Use Case theo hàng dọc, căn giữa trong boundary, dàn Actor 2 bên. Giữ nguyên thuật toán hiện tại.

### B. Thuật Toán Cấp 1 (Star Layout)
1. **Định vị Central UC:** Xác định Use Case trung tâm dựa trên số liên kết nhiều nhất. Đặt nó ở chính giữa màn hình (hoặc Package).
2. **Actor:** Xếp bên trái, nối ngang vào Central UC.
3. **Use Case `include`:** Đặt ở ngay phía dưới Central UC để tránh vướng đường extend.
4. **Use Case `extend`:** Xếp dọc thành một hoặc hai cột ở **bên phải** Central UC. Việc xếp bên phải giúp mũi tên `extend` (có hướng từ phải qua trái) trông tự nhiên và không bị đè lên Actor.

### C. Thuật Toán Cấp 2 (Flow Layout)
1. **Định vị Main UC & Actor:** Đặt Use Case chính và Actor ở trên cùng bên trái.
2. **Trục `include` (Flow):** Các Use Case đóng vai trò là bước (được `include` từ Main UC) sẽ được dàn đều theo một cột dọc ở giữa (Top to Bottom). Điều này mô phỏng một flowchart tuần tự.
3. **Trục `extend` (Ngoại lệ):** Các Use Case ngoại lệ (`extend` về Main UC) sẽ được đặt dồn sang bên phải của sơ đồ, hoặc đặt cạnh các bước tương ứng nếu phân tích sâu hơn. Cách an toàn nhất là xếp chúng thành một cột riêng biệt ở biên phải.

## 4. Kế Hoạch Triển Khai (Bite-sized Tasks)

- **[ ] Task 1:** Thêm code lấy thông tin từ tiêu đề (`title` hoặc tên `rectangle`/`package`) để nhận diện chữ "Cấp 0", "Cấp 1", "Cấp 2".
- **[ ] Task 2:** Xây dựng hàm `analyzeGraphTopology` trong `usecase-parser.js` để đếm In/Out degree cho `include` và `extend` của từng Use Case, từ đó kết luận Cấp độ nếu Task 1 không tìm thấy text.
- **[ ] Task 3:** Chia `generateDiagram` thành `layoutLevel0`, `layoutLevel1`, và `layoutLevel2`. Tích hợp bộ nhận diện để gọi đúng hàm.
- **[ ] Task 4:** Implement `layoutLevel1()`: Bố trí Central UC ở giữa, Include ở dưới, Extend xếp cột bên phải.
- **[ ] Task 5:** Implement `layoutLevel2()`: Bố trí Main UC trên cùng, dàn các step `include` thành cột dọc ở giữa, các exception `extend` thành cột bên phải.

## 5. Xác Minh
- Đã có sẵn 3 file `usecaseC0.puml`, `usecaseC1.puml`, `usecaseC2.puml` làm bộ test chuẩn.
- Sau mỗi Task layout, ta sẽ reload tool bằng `Cmd + R` trên StarUML và load từng file để kiểm chứng đường mũi tên có thẳng hàng, đẹp mắt hay không.
