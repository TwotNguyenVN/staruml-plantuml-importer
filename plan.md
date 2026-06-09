Ý tưởng rất tuyệt vời! Việc tách riêng thuật toán cho từng cấp độ không chỉ giải quyết triệt để vấn đề thẩm mỹ mà còn giúp làm nổi bật được "ý đồ nghiệp vụ" của từng cấp (Level) giống hệt như triết lý trong các tài liệu hướng dẫn.

Dựa trên đề xuất của bạn, mình xin trình bày Bản thiết kế thuật toán Layout cho từng cấp độ để bạn xem xét và chốt trước khi mình viết thành tài liệu plan.md:

1. Sơ đồ Cấp 0 (Tổng quan)
Đặc điểm: Tập trung vào Actor bên ngoài và các nhóm chức năng lớn bên trong Boundary. Nhiều đường chéo.
Thuật toán đề xuất: "Heuristic Y-Alignment" (Cân bằng trục Y)
Xếp Actor theo trục dọc bên trái.
Tính tọa độ Y của từng Use Case bên trong Boundary dựa trên trung bình cộng tọa độ Y của các Actor liên kết với nó.
Kết quả: Các Use Case được "hút" về đúng tầm mắt của Actor kết nối với nó, các đường thẳng song song nhiều hơn, giảm tối đa việc đan chéo (crossing).
2. Sơ đồ Cấp 1 (Phân hệ Quản lý)
Đặc điểm: Thường có 1 Use Case trung tâm (VD: Quản lý Sách) nối với 1 Use Case Đăng nhập (include) và rẽ nhánh ra các chức năng CRUD (Thêm, Sửa, Xóa) bằng extend.
Thuật toán đề xuất: "Hub & Spoke" (Mô hình Tỏa tròn / Rẽ nhánh 1 chiều)
Actor ở ngoài cùng bên trái.
Use Case trung tâm nằm chính giữa.
Use case include (Đăng nhập) nằm ở góc phải - phía trên.
Các Use Case extend (Thêm, Sửa, Xóa) được xếp thẳng hàng dọc ở bên phải Use Case trung tâm, tỏa ra như hình rẽ quạt.
3. Sơ đồ Cấp 2 (Nghiệp vụ chi tiết)
Đặc điểm: Thể hiện trình tự các bước thực hiện một quy trình (VD: Lập phiếu mượn). Chứa nhiều include (bước bắt buộc) và extend (ngoại lệ).
Thuật toán đề xuất: "Tree / Flow Layout" (Dạng Cây / Dòng chảy)
Xếp Use Case chính ở bên trái hoặc ở trên cùng.
Các Use Case include (Các bước bắt buộc) được xếp theo một trục ngang (hoặc dọc thẳng) tượng trưng cho timeline của quy trình nghiệp vụ.
Các Use Case extend (Ngoại lệ) sẽ được "chẻ nhánh" (branching) ra phía trên hoặc phía dưới của các bước tương ứng, tạo thành dạng xương cá.
4. Sơ đồ Cấp 3 (Phát sinh phức tạp)
Đặc điểm: Đi sâu vào 1 ngoại lệ, gần như 100% là include vì một khi xảy ra ngoại lệ, các bước sau đó là bắt buộc.
Thuật toán đề xuất: "Linear Pipeline" (Tuyến tính dọc/ngang)
Rất đơn giản, xếp các Use Case nối tiếp nhau thành một đường thẳng duy nhất (Left-to-Right hoặc Top-to-Bottom) để thể hiện chuỗi hành động tuyến tính.