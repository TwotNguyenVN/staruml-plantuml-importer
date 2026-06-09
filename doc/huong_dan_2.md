**1. Hiểu rõ yêu cầu**

Bạn muốn mở rộng báo cáo thành một **hướng dẫn phương pháp luận**: từ mẫu Use Case của hệ thống Quản Lý Thư Viện, rút ra cách **xác định và vẽ sơ đồ Use Case theo nhiều cấp: cấp 0, cấp 1, cấp 2, cấp 3…**, đồng thời có quy tắc rõ ràng để dùng **include** và **extend**.

Nội dung dưới đây sẽ tập trung vào cách làm tổng quát để sau này có thể áp dụng cho nhiều đề tài khác nhau.

**HƯỚNG DẪN XÁC ĐỊNH VÀ VẼ SƠ ĐỒ USE CASE CẤP 0, 1, 2, 3… DỰA TRÊN MẪU HỆ THỐNG QUẢN LÝ THƯ VIỆN**

**1. Ý nghĩa của việc chia sơ đồ Use Case theo cấp**

Trong phân tích và thiết kế hệ thống, một hệ thống thường có nhiều chức năng. Nếu đưa toàn bộ actor, use case, include, extend vào một sơ đồ duy nhất thì sơ đồ sẽ rất rối, khó đọc và khó bảo vệ.

Vì vậy, cần chia sơ đồ Use Case theo nhiều cấp:

| **Cấp sơ đồ** | **Mục đích chính** |
| --- | --- |
| **Cấp 0** | Nhìn tổng quan toàn hệ thống |
| **Cấp 1** | Phân rã từng nhóm chức năng lớn |
| **Cấp 2** | Mô tả chi tiết một nghiệp vụ cụ thể |
| **Cấp 3** | Mô tả sâu hơn một nghiệp vụ con hoặc ngoại lệ phức tạp |

Có thể hiểu đơn giản:

Cấp càng cao thì càng tổng quan.
Cấp càng thấp thì càng chi tiết.

Trong mẫu Quản Lý Thư Viện:

| **Cấp** | **Sơ đồ mẫu** |
| --- | --- |
| Cấp 0 | Hệ Thống Quản Lý Thư Viện |
| Cấp 1 | QL Mượn Trả, Quản Lý Thẻ TV, QL Báo Cáo Thống Kê, QL Người Dùng, QL Sách |
| Cấp 2 | Lập Phiếu Mượn, Lập Phiếu Trả, Lập Phiếu Phạt |
| Cấp 3 | Nếu cần, có thể tách sâu hơn như “Xử lý phạt quá hạn”, “Xử lý sách bị mất”, “Xử lý sách hư hỏng” |

**2. Cách xác định sơ đồ Use Case cấp 0**

**2.1. Mục tiêu của sơ đồ cấp 0**

Sơ đồ cấp 0 dùng để mô tả:

Hệ thống có những actor nào và có những nhóm chức năng lớn nào.

Ở cấp này, **không đi vào chi tiết xử lý**. Không nên đưa các bước như kiểm tra, nhập thông tin, lưu dữ liệu, tính tiền, cập nhật trạng thái vào sơ đồ cấp 0.

Trong mẫu thư viện, sơ đồ cấp 0 có boundary:

**Hệ Thống Quản Lý Thư Viện**

Bên trong có các use case cấp cao:

| **Use case cấp 0** |
| --- |
| QL Mượn Trả |
| Quản Lý Thẻ TV |
| QL Báo Cáo Thống Kê |
| QL Người Dùng |
| QL Sách |

Actor gồm:

| **Actor** |
| --- |
| Đọc Giả |
| Thủ Thư |
| Nhân Viên |
| NV QL Sách |

**2.2. Quy trình xác định sơ đồ cấp 0**

Để vẽ sơ đồ cấp 0 cho bất kỳ đề tài nào, làm theo các bước sau:

**Bước 1: Xác định boundary hệ thống**

Boundary là khung hệ thống, thường đặt tên theo đề tài.

Ví dụ:

| **Đề tài** | **Boundary** |
| --- | --- |
| Quản lý thư viện | Hệ Thống Quản Lý Thư Viện |
| Quản lý bán hàng | Hệ Thống Quản Lý Bán Hàng |
| Quản lý khách sạn | Hệ Thống Quản Lý Khách Sạn |
| Quản lý khóa học | Hệ Thống Quản Lý Khóa Học Trực Tuyến |
| Quản lý bệnh viện | Hệ Thống Quản Lý Bệnh Viện |

**Bước 2: Xác định actor chính**

Actor là người hoặc hệ thống bên ngoài tương tác với hệ thống.

Câu hỏi xác định actor:

| **Câu hỏi** | **Ví dụ** |
| --- | --- |
| Ai sử dụng hệ thống? | Học viên, khách hàng, bệnh nhân |
| Ai vận hành hệ thống? | Admin, nhân viên, thủ thư |
| Ai quản lý dữ liệu? | Quản lý, kế toán, nhân viên kho |
| Hệ thống ngoài nào tương tác? | Cổng thanh toán, email, ngân hàng |

Không nên nhầm actor với chức danh nội bộ quá chi tiết. Nếu hai vai trò có quyền và hành vi giống nhau, có thể gộp lại.

**Bước 3: Xác định nhóm chức năng lớn**

Một nhóm chức năng lớn thường có dạng:

Quản lý + đối tượng nghiệp vụ
hoặc
Xử lý + nghiệp vụ chính

Ví dụ:

| **Hệ thống** | **Nhóm chức năng cấp 0** |
| --- | --- |
| Thư viện | QL Sách, QL Người Dùng, QL Mượn Trả |
| Bán hàng | QL Sản Phẩm, QL Đơn Hàng, Thanh Toán, Báo Cáo |
| Khách sạn | QL Phòng, Đặt Phòng, Trả Phòng, Thanh Toán |
| Bệnh viện | QL Bệnh Nhân, Đăng Ký Khám, Khám Bệnh, Viện Phí |
| LMS | QL Khóa Học, QL Người Dùng, Mua Khóa Học, Học Tập, Báo Cáo |

**Bước 4: Nối actor với use case cấp cao**

Ở cấp 0, chỉ dùng đường association bình thường.

Không cần ghi chi tiết actor làm gì trong từng use case. Chỉ cần thể hiện actor có tham gia vào nhóm chức năng đó.

**2.3. Có dùng include/extend ở cấp 0 không?**

Thông thường: **không nên dùng**.

Lý do:

| **Lý do** | **Giải thích** |
| --- | --- |
| Cấp 0 cần tổng quan | Include/extend làm sơ đồ rối |
| Chưa mô tả chi tiết nghiệp vụ | Các bước chi tiết nên để cấp 1 hoặc cấp 2 |
| Dễ bảo vệ hơn | Hội đồng nhìn vào sẽ hiểu hệ thống gồm phân hệ nào |

Trong mẫu thư viện, sơ đồ cấp 0 cũng **không có include/extend**. Đây là điểm nên học theo.

**3. Cách xác định sơ đồ Use Case cấp 1**

**3.1. Mục tiêu của sơ đồ cấp 1**

Sơ đồ cấp 1 dùng để phân rã một use case lớn ở cấp 0 thành các chức năng con.

Ví dụ trong cấp 0 có use case:

QL Sách

Thì ở cấp 1 sẽ có sơ đồ:

UseCase QL Sách

Bên trong có:

| **Use case trung tâm** | **Use case con** |
| --- | --- |
| QL SÁCH | Quản Lý Đầu Sách, Quản Lý Thể Loại Sách, Quản Lý Nhà Xuất Bản, Tra Cứu Sách, Cập Nhật Số Lượng Sách, Đăng Nhập |

**3.2. Đặc điểm của sơ đồ cấp 1 trong mẫu thư viện**

Các sơ đồ cấp 1 trong mẫu thư viện gồm:

| **Sơ đồ cấp 1** | **Use case trung tâm** | **Include** | **Extend** |
| --- | --- | --- | --- |
| QL Mượn Trả | QL Mượn Trả | Đăng Nhập | Lập Phiếu Mượn, Lập Phiếu Trả |
| Quản Lý Thẻ TV | Quản Lý Thẻ TV | Đăng Nhập | Cấp Thẻ, Gia Hạn, Ghi Nhận Lệ Phí, Kiểm Tra Hiệu Lực |
| QL Báo Cáo Thống Kê | QL Báo Cáo Thống Kê | Đăng Nhập | Các loại thống kê |
| QL Người Dùng | QL Người dùng | Đăng Nhập | Thêm, Cập Nhật, Xóa, Tra Cứu |
| QL Sách | QL SÁCH | Đăng Nhập | Quản Lý Đầu Sách, Thể Loại, NXB, Tra Cứu, Cập Nhật Số Lượng |

Mẫu chung:

Actor → Use case trung tâm
Use case trung tâm include Đăng Nhập
Các chức năng con extend use case trung tâm

**3.3. Khi nào một use case cấp 0 cần tách thành sơ đồ cấp 1?**

Một use case cấp 0 nên tách thành sơ đồ cấp 1 nếu:

| **Dấu hiệu** | **Ví dụ** |
| --- | --- |
| Use case có nhiều chức năng con | QL Sách gồm quản lý đầu sách, thể loại, NXB |
| Có nhiều actor tham gia | QL Mượn Trả có Đọc Giả và Thủ Thư |
| Có nhiều lựa chọn nghiệp vụ | QL Người Dùng có thêm, sửa, xóa, tra cứu |
| Có thể phát sinh luồng con | QL Mượn Trả phát sinh Lập Phiếu Mượn, Lập Phiếu Trả |
| Cần mô tả riêng để dễ hiểu | Báo cáo có nhiều loại thống kê |

**3.4. Cách vẽ sơ đồ cấp 1**

Khi vẽ sơ đồ cấp 1, nên làm theo cấu trúc:

**Bước 1: Đặt boundary theo tên phân hệ**

Ví dụ:

| **Use case cấp 0** | **Boundary cấp 1** |
| --- | --- |
| QL Sách | UseCase QL Sách |
| QL Người Dùng | UseCase QL Người Dùng |
| QL Mượn Trả | UC QL Mượn Trả |
| QL Báo Cáo Thống Kê | UC QL Báo Cáo Thống Kê |

**Bước 2: Đặt use case trung tâm**

Use case trung tâm thường trùng với tên phân hệ.

Ví dụ:

QL SÁCH
QL Người dùng
QL Mượn Trả

**Bước 3: Xác định actor liên quan**

Chỉ đưa actor thực sự tham gia phân hệ đó.

Ví dụ:

| **Sơ đồ** | **Actor** |
| --- | --- |
| QL Sách | NV QL Sách |
| QL Người Dùng | Nhân Viên |
| QL Mượn Trả | Đọc Giả, Thủ Thư |
| QL Báo Cáo Thống Kê | Thủ Thư |

**Bước 4: Xác định include**

Trong mẫu thư viện, sơ đồ cấp 1 thường có:

Use case trung tâm include Đăng Nhập

Có thể dùng quy tắc:

| **Trường hợp** | **Có nên include Đăng Nhập?** |
| --- | --- |
| Chức năng cần tài khoản | Có |
| Chức năng nội bộ của nhân viên/admin | Có |
| Chức năng công khai không cần tài khoản | Không bắt buộc |

**Bước 5: Xác định extend**

Các chức năng con, lựa chọn hoặc thao tác cụ thể thường là extend.

Ví dụ:

| **Use case trung tâm** | **Extend** |
| --- | --- |
| QL Người dùng | Thêm, Cập Nhật, Xóa, Tra Cứu |
| QL Sách | Quản Lý Đầu Sách, Quản Lý Thể Loại, Tra Cứu |
| QL Báo Cáo | Thống kê theo từng loại |

**3.5. Lưu ý khi vẽ cấp 1**

Không nên đưa các bước quá nhỏ vào cấp 1.

Ví dụ với **QL Sách**, cấp 1 chỉ nên có:

Quản Lý Đầu Sách, Quản Lý Thể Loại, Tra Cứu Sách

Không nên đưa các bước như:

Nhập mã sách, kiểm tra mã sách, lưu sách, thông báo thành công

Các bước này nếu cần thì để cấp 2 hoặc cấp 3.

**4. Cách xác định sơ đồ Use Case cấp 2**

**4.1. Mục tiêu của sơ đồ cấp 2**

Sơ đồ cấp 2 dùng để mô tả chi tiết một nghiệp vụ cụ thể được phát hiện ở cấp 1.

Trong mẫu thư viện, từ sơ đồ cấp 1 **QL Mượn Trả**, có hai use case con:

| **Use case cấp 1** | **Tách thành sơ đồ cấp 2** |
| --- | --- |
| Lập Phiếu Mượn | UseCase Lập Phiếu Mượn |
| Lập Phiếu Trả | UseCase Lập Phiếu Trả |

Ngoài ra, từ sơ đồ Lập Phiếu Trả, có phát sinh:

| **Use case phát sinh** | **Tách thành sơ đồ cấp 2 hoặc cấp 3** |
| --- | --- |
| Lập Phiếu Phạt | UseCase Lập Phiếu Phạt |

**4.2. Đặc điểm của sơ đồ cấp 2**

Sơ đồ cấp 2 thường mô tả quy trình nghiệp vụ cụ thể theo dạng:

Use case chính include các bước bắt buộc
Tình huống ngoại lệ extend use case chính

Ví dụ sơ đồ **Lập Phiếu Mượn**:

| **Use case chính** | **Include** | **Extend** |
| --- | --- | --- |
| Lập Phiếu Mượn | Kiểm tra độc giả, kiểm tra thẻ, kiểm tra sách, kiểm tra số lượng, nhập thông tin, lưu chi tiết, cập nhật số lượng | Từ Chối Mượn |

Ví dụ sơ đồ **Lập Phiếu Trả**:

| **Use case chính** | **Include** | **Extend** |
| --- | --- | --- |
| Lập Phiếu Trả | Tìm phiếu mượn, kiểm tra độc giả, kiểm tra ngày trả, kiểm tra danh sách sách, kiểm tra tình trạng, cập nhật, hoàn tất | Lập Phiếu Phạt |

**4.3. Khi nào cần tách một use case thành cấp 2?**

Một use case nên tách thành sơ đồ cấp 2 nếu:

| **Dấu hiệu** | **Ví dụ** |
| --- | --- |
| Có nhiều bước xử lý tuần tự | Lập phiếu mượn phải kiểm tra, nhập, lưu, cập nhật |
| Có nhiều điều kiện kiểm tra | Kiểm tra thẻ, kiểm tra sách, kiểm tra số lượng |
| Có dữ liệu được tạo ra | Phiếu mượn, phiếu trả, đơn hàng, hóa đơn |
| Có ngoại lệ/phát sinh | Từ chối mượn, lập phiếu phạt |
| Có thể viết được luồng sự kiện chi tiết | Luồng chính và luồng phụ rõ ràng |

**4.4. Cách xác định include ở cấp 2**

Ở cấp 2, include thường là các bước bắt buộc trong nghiệp vụ.

Một cách kiểm tra rất hiệu quả:

Nếu bỏ bước này, quy trình có hoàn thành đúng không?

Nếu câu trả lời là **không**, bước đó nên là include.

Ví dụ trong **Lập Phiếu Mượn**:

| **Bước** | **Có bắt buộc không?** | **Quan hệ** |
| --- | --- | --- |
| Kiểm tra thông tin độc giả | Có | include |
| Kiểm tra thẻ thư viện | Có | include |
| Kiểm tra thông tin sách | Có | include |
| Nhập thông tin phiếu mượn | Có | include |
| Lưu chi tiết phiếu mượn | Có | include |
| Cập nhật số lượng sách | Có | include |
| Từ chối mượn | Không phải lúc nào cũng xảy ra | extend |

**4.5. Cách xác định extend ở cấp 2**

Ở cấp 2, extend thường là:

| **Loại tình huống** | **Ví dụ** |
| --- | --- |
| Từ chối | Từ Chối Mượn |
| Phạt | Lập Phiếu Phạt |
| Hủy | Hủy đơn hàng |
| Lỗi | Thanh toán thất bại |
| Khiếu nại | Tạo khiếu nại |
| Vi phạm | Xử lý vi phạm |

Câu hỏi kiểm tra:

Use case này có phải lúc nào cũng xảy ra trong quy trình chính không?

Nếu câu trả lời là **không**, và nó chỉ xảy ra khi có điều kiện, thì dùng extend.

**5. Cách xác định sơ đồ Use Case cấp 3**

**5.1. Mục tiêu của sơ đồ cấp 3**

Sơ đồ cấp 3 dùng khi một use case ở cấp 2 vẫn còn quá phức tạp và cần tách sâu hơn.

Trong mẫu thư viện, **Lập Phiếu Phạt** có thể được xem là sơ đồ chi tiết phát sinh từ **Lập Phiếu Trả**. Tùy cách đánh số, có thể xem nó là:

| **Cách xem** | **Giải thích** |
| --- | --- |
| Cấp 2 | Vì nó là một quy trình nghiệp vụ chi tiết ngang hàng với lập phiếu mượn/trả |
| Cấp 3 | Vì nó phát sinh từ Lập Phiếu Trả thông qua quan hệ extend |

Trong báo cáo tổng quát, nên hiểu:

Nếu một use case phát sinh từ use case cấp 2 và tiếp tục được tách thành sơ đồ riêng, thì có thể xem là cấp 3.

**5.2. Khi nào cần cấp 3?**

Chỉ nên vẽ cấp 3 khi thật sự cần.

Dấu hiệu cần cấp 3:

| **Dấu hiệu** | **Ví dụ** |
| --- | --- |
| Use case phát sinh có nhiều bước riêng | Lập phiếu phạt có xác định sách, lý do, phí, tổng tiền |
| Cần lưu dữ liệu riêng | Phiếu phạt, biên bản xử lý, yêu cầu hoàn tiền |
| Có nhiều actor tham gia | Người dùng, nhân viên, kế toán |
| Có quy trình xử lý riêng | Khiếu nại, hoàn tiền, xử lý vi phạm |
| Nếu đưa vào cấp 2 sẽ làm sơ đồ quá rối | Nên tách riêng |

**5.3. Đặc điểm cấp 3**

Cấp 3 thường là quy trình đã được kích hoạt bởi một điều kiện phát sinh. Khi đã được kích hoạt, các bước bên trong nó lại trở thành bắt buộc.

Vì vậy, trong sơ đồ cấp 3 thường có nhiều include, nhưng có thể không có extend.

Ví dụ **Lập Phiếu Phạt**:

| **Use case chính** | **Include** |
| --- | --- |
| Lập Phiếu Phạt | Xác định sách bị phạt |
| Lập Phiếu Phạt | Xác định lý do phạt |
| Lập Phiếu Phạt | Nhập phí phạt cho từng sách |
| Lập Phiếu Phạt | Tính tổng tiền phạt |
| Lập Phiếu Phạt | Lưu chi tiết phiếu phạt |
| Lập Phiếu Phạt | Lưu phiếu phạt |
| Lập Phiếu Phạt | Thông báo phí phạt cho độc giả |

Sơ đồ này **không có extend** vì sau khi đã quyết định lập phiếu phạt, các bước trên đều là bắt buộc.

**5.4. Quy tắc cấp 3**

| **Quy tắc** | **Ý nghĩa** |
| --- | --- |
| Không nên lạm dụng cấp 3 | Chỉ tách khi cấp 2 quá phức tạp |
| Cấp 3 thường mô tả quy trình phát sinh | Ví dụ phạt, hoàn tiền, khiếu nại, xử lý vi phạm |
| Bên trong cấp 3 thường dùng include | Vì các bước đã trở thành bắt buộc |
| Extend thường nằm ở sơ đồ cha | Ví dụ Lập Phiếu Phạt extend Lập Phiếu Trả |

**6. Tổng hợp cách chia cấp từ mẫu thư viện**

**6.1. Cây phân rã Use Case**

Có thể biểu diễn cách phân rã như sau:

Cấp 0: Hệ Thống Quản Lý Thư Viện

│

├── Cấp 1: QL Mượn Trả

│ ├── Cấp 2: Lập Phiếu Mượn

│ │ ├── include: Kiểm tra thông tin độc giả

│ │ ├── include: Kiểm tra thẻ thư viện

│ │ ├── include: Kiểm tra thông tin sách

│ │ ├── include: Nhập thông tin phiếu mượn

│ │ ├── include: Lưu chi tiết phiếu mượn

│ │ ├── include: Cập nhật số lượng sách

│ │ └── extend: Từ Chối Mượn

│ │

│ └── Cấp 2: Lập Phiếu Trả

│ ├── include: Tìm phiếu mượn

│ ├── include: Kiểm tra thông tin độc giả

│ ├── include: Kiểm tra ngày trả

│ ├── include: Kiểm tra tình trạng sách trả

│ ├── include: Cập nhật thông tin trả sách

│ ├── include: Hoàn tất phiếu trả

│ └── extend: Lập Phiếu Phạt

│

├── Cấp 1: Quản Lý Thẻ TV

│ ├── include: Đăng Nhập

│ ├── extend: Cấp Thẻ Thư Viện

│ ├── extend: Gia Hạn Thẻ Thư Viện

│ ├── extend: Ghi Nhận Đóng Lệ Phí

│ └── extend: Kiểm Tra Hiệu Lực Thẻ

│

├── Cấp 1: QL Người Dùng

│ ├── include: Đăng Nhập

│ ├── extend: Thêm Người Dùng

│ ├── extend: Cập Nhật Người Dùng

│ ├── extend: Xóa Người Dùng

│ └── extend: Tra Cứu Người Dùng

│

├── Cấp 1: QL Sách

│ ├── include: Đăng Nhập

│ ├── extend: Quản Lý Đầu Sách

│ ├── extend: Quản Lý Thể Loại Sách

│ ├── extend: Quản Lý Nhà Xuất Bản

│ ├── extend: Tra Cứu Sách

│ └── extend: Cập Nhật Số Lượng Sách

│

├── Cấp 1: QL Báo Cáo Thống Kê

│ ├── include: Đăng Nhập

│ ├── extend: Thống kê sách đang mượn

│ ├── extend: Thống kê sách quá hạn

│ ├── extend: Thống kê sách bị mất

│ └── extend: Thống kê sách hư hỏng

│

└── Cấp 3 hoặc cấp phát sinh: Lập Phiếu Phạt

├── include: Xác định sách bị phạt

├── include: Xác định lý do phạt

├── include: Nhập phí phạt cho từng sách

├── include: Tính tổng tiền phạt

├── include: Lưu chi tiết phiếu phạt

├── include: Lưu phiếu phạt

└── include: Thông báo phí phạt cho độc giả

**7. Hướng dẫn dùng include và extend theo từng cấp**

**7.1. Cấp 0**

| **Loại quan hệ** | **Có nên dùng?** | **Giải thích** |
| --- | --- | --- |
| Association | Có | Dùng để nối actor với nhóm chức năng |
| Include | Không nên | Vì cấp 0 chỉ tổng quan |
| Extend | Không nên | Vì chi tiết phát sinh nên để cấp dưới |

Kết luận:

Cấp 0 chỉ nên có actor, boundary, use case cấp cao và association.

**7.2. Cấp 1**

| **Loại quan hệ** | **Cách dùng** |
| --- | --- |
| Association | Actor nối với use case trung tâm |
| Include | Use case trung tâm include Đăng Nhập hoặc Xác Thực |
| Extend | Chức năng con extend use case trung tâm |

Mẫu:

Actor ─── Quản lý [đối tượng]

|

| <<include>>

v

Đăng Nhập

Chức năng con ── <<extend>> ──> Quản lý [đối tượng]

Ví dụ:

Nhân Viên ─── QL Người dùng

QL Người dùng <<include>> Đăng Nhập

Thêm Người Dùng <<extend>> QL Người dùng

Cập Nhật Người Dùng <<extend>> QL Người dùng

Xóa Người Dùng <<extend>> QL Người dùng

Tra Cứu Người Dùng <<extend>> QL Người dùng

**7.3. Cấp 2**

| **Loại quan hệ** | **Cách dùng** |
| --- | --- |
| Association | Actor nối với use case nghiệp vụ chính |
| Include | Các bước bắt buộc trong quy trình |
| Extend | Tình huống ngoại lệ hoặc phát sinh |

Mẫu:

Actor ─── Thực hiện nghiệp vụ chính

Nghiệp vụ chính <<include>> Bước 1

Nghiệp vụ chính <<include>> Bước 2

Nghiệp vụ chính <<include>> Bước 3

Ngoại lệ <<extend>> Nghiệp vụ chính

Ví dụ:

Lập Phiếu Mượn <<include>> Kiểm Tra Đọc Giả

Lập Phiếu Mượn <<include>> Kiểm Tra Thẻ

Lập Phiếu Mượn <<include>> Kiểm Tra Sách

Lập Phiếu Mượn <<include>> Lưu Phiếu

Từ Chối Mượn <<extend>> Lập Phiếu Mượn

**7.4. Cấp 3**

| **Loại quan hệ** | **Cách dùng** |
| --- | --- |
| Association | Actor nối với use case phát sinh |
| Include | Các bước bắt buộc sau khi use case phát sinh được kích hoạt |
| Extend | Chỉ dùng nếu bên trong use case phát sinh còn có ngoại lệ khác |

Mẫu:

Actor ─── Xử lý phát sinh

Xử lý phát sinh <<include>> Xác định đối tượng

Xử lý phát sinh <<include>> Xác định lý do

Xử lý phát sinh <<include>> Tính mức xử lý

Xử lý phát sinh <<include>> Lưu kết quả

Xử lý phát sinh <<include>> Thông báo

Ví dụ:

Lập Phiếu Phạt <<include>> Xác định sách bị phạt

Lập Phiếu Phạt <<include>> Xác định lý do phạt

Lập Phiếu Phạt <<include>> Tính tổng tiền phạt

Lập Phiếu Phạt <<include>> Lưu phiếu phạt

Lập Phiếu Phạt <<include>> Thông báo phí phạt

**8. Cách quyết định một use case nằm ở cấp nào**

**8.1. Bảng nhận diện cấp sơ đồ**

| **Dấu hiệu** | **Cấp phù hợp** |
| --- | --- |
| Là nhóm chức năng lớn của toàn hệ thống | Cấp 0 |
| Là phân hệ quản lý một đối tượng/nghiệp vụ | Cấp 1 |
| Là một quy trình nghiệp vụ có nhiều bước | Cấp 2 |
| Là tình huống phát sinh phức tạp cần quy trình riêng | Cấp 3 |

**8.2. Ví dụ nhận diện**

| **Use case** | **Cấp hợp lý** | **Lý do** |
| --- | --- | --- |
| QL Sách | Cấp 0 hoặc cấp 1 | Ở cấp 0 là nhóm chức năng; ở cấp 1 là sơ đồ chi tiết của nhóm đó |
| Thêm Người Dùng | Cấp 1 | Là chức năng con của QL Người Dùng |
| Lập Phiếu Mượn | Cấp 2 | Là quy trình nghiệp vụ nhiều bước |
| Từ Chối Mượn | Cấp 2 | Là ngoại lệ của Lập Phiếu Mượn |
| Lập Phiếu Phạt | Cấp 2 hoặc 3 | Là phát sinh từ Lập Phiếu Trả và có quy trình riêng |
| Xác định lý do phạt | Cấp 3 | Là bước chi tiết trong Lập Phiếu Phạt |

**9. Quy trình 7 bước để xây dựng bộ sơ đồ Use Case cho một đề tài mới**

**Bước 1: Đọc mô tả hệ thống**

Gạch chân các danh từ và động từ quan trọng.

| **Loại từ** | **Ý nghĩa** |
| --- | --- |
| Danh từ | Có thể là actor, dữ liệu, đối tượng quản lý |
| Động từ | Có thể là use case |

Ví dụ:

Học viên đăng ký tài khoản, tìm kiếm khóa học, mua khóa học và học trực tuyến.

Có thể rút ra:

| **Thành phần** | **Kết quả** |
| --- | --- |
| Actor | Học viên |
| Use case | Đăng ký tài khoản, tìm kiếm khóa học, mua khóa học, học trực tuyến |

**Bước 2: Xác định actor**

Phân loại actor:

| **Loại actor** | **Ví dụ** |
| --- | --- |
| Người dùng chính | Khách hàng, học viên, bệnh nhân, độc giả |
| Nhân viên vận hành | Nhân viên, thủ thư, lễ tân, kế toán |
| Quản trị | Admin, quản lý |
| Hệ thống ngoài | Cổng thanh toán, email, ngân hàng |

**Bước 3: Xác định use case cấp 0**

Gom các chức năng nhỏ thành nhóm lớn.

Ví dụ:

| **Chức năng nhỏ** | **Gom thành use case cấp 0** |
| --- | --- |
| Thêm sách, sửa sách, tra cứu sách | QL Sách |
| Thêm người dùng, xóa người dùng | QL Người Dùng |
| Lập phiếu mượn, lập phiếu trả | QL Mượn Trả |
| Thống kê sách mượn, sách quá hạn | QL Báo Cáo Thống Kê |

**Bước 4: Vẽ sơ đồ cấp 0**

Nguyên tắc:

| **Thành phần** | **Quy tắc** |
| --- | --- |
| Boundary | Đặt tên hệ thống |
| Actor | Đặt ngoài boundary |
| Use case cấp cao | Đặt trong boundary |
| Association | Nối actor với use case |
| Include/Extend | Hạn chế hoặc không dùng |

**Bước 5: Chọn use case cấp 0 để phân rã thành cấp 1**

Chọn các use case lớn, nhiều chức năng con.

Mỗi use case cấp 0 nên tách thành một sơ đồ cấp 1 nếu cần.

Ví dụ:

| **Cấp 0** | **Cấp 1** |
| --- | --- |
| QL Sách | UseCase QL Sách |
| QL Người Dùng | UseCase QL Người Dùng |
| QL Mượn Trả | UC QL Mượn Trả |

**Bước 6: Với mỗi sơ đồ cấp 1, xác định include/extend**

Áp dụng mẫu:

| **Thành phần** | **Cách làm** |
| --- | --- |
| Use case trung tâm | Đặt giữa sơ đồ |
| Đăng Nhập | Thường là include |
| Chức năng con | Thường là extend |
| Actor | Nối với use case trung tâm |

**Bước 7: Tách các nghiệp vụ phức tạp thành cấp 2 hoặc cấp 3**

Nếu một use case con có nhiều bước, tách ra thành sơ đồ riêng.

Ví dụ:

| **Use case con** | **Tách sơ đồ** |
| --- | --- |
| Lập Phiếu Mượn | UseCase Lập Phiếu Mượn |
| Lập Phiếu Trả | UseCase Lập Phiếu Trả |
| Lập Phiếu Phạt | UseCase Lập Phiếu Phạt |

**10. Các lỗi thường gặp khi vẽ sơ đồ nhiều cấp**

**10.1. Đưa quá nhiều chi tiết vào cấp 0**

Sai:

Cấp 0 có cả kiểm tra thông tin, lưu dữ liệu, tính tiền, cập nhật trạng thái.

Đúng:

Cấp 0 chỉ có nhóm chức năng lớn.

**10.2. Nhầm include và extend**

Sai:

Từ Chối Mượn include Lập Phiếu Mượn.

Đúng:

Từ Chối Mượn extend Lập Phiếu Mượn.

Vì từ chối mượn chỉ xảy ra khi có điều kiện không hợp lệ.

**10.3. Dùng include cho chức năng tùy chọn**

Sai:

QL Người dùng include Thêm Người Dùng, Xóa Người Dùng, Tra Cứu Người Dùng.

Theo mẫu giảng viên, nên dùng:

Thêm Người Dùng extend QL Người dùng
Xóa Người Dùng extend QL Người dùng
Tra Cứu Người Dùng extend QL Người dùng

**10.4. Không tách sơ đồ chi tiết**

Sai:

Đưa toàn bộ bước của Lập Phiếu Mượn vào QL Mượn Trả.

Đúng:

QL Mượn Trả ở cấp 1 chỉ có Lập Phiếu Mượn và Lập Phiếu Trả.
Lập Phiếu Mượn được tách thành sơ đồ cấp 2.

**10.5. Dùng actor cho các bộ phận không tương tác trực tiếp**

Actor phải là người hoặc hệ thống có tương tác trực tiếp với hệ thống.

Ví dụ:

| **Không nên** | **Nên** |
| --- | --- |
| Ban giám hiệu nếu không dùng hệ thống | Admin hoặc Quản lý |
| Công ty nếu không thao tác trực tiếp | Nhân viên công ty |
| CSDL | Không phải actor trong use case thông thường |

**11. Mẫu báo cáo phân tích sơ đồ theo cấp**

Khi viết báo cáo, có thể dùng mẫu sau cho mỗi sơ đồ.

**11.1. Mẫu mô tả sơ đồ cấp 0**

| **Mục** | **Nội dung** |
| --- | --- |
| Tên sơ đồ | Use Case tổng quan cấp 0 |
| Boundary | Tên hệ thống |
| Actor | Danh sách actor |
| Use case cấp cao | Danh sách nhóm chức năng |
| Quan hệ | Association giữa actor và use case |
| Include/Extend | Không có hoặc không đáng kể |
| Mục đích | Mô tả phạm vi tổng quan của hệ thống |

**11.2. Mẫu mô tả sơ đồ cấp 1**

| **Mục** | **Nội dung** |
| --- | --- |
| Tên sơ đồ | UseCase Quản lý … |
| Boundary | Tên phân hệ |
| Actor | Actor tham gia phân hệ |
| Use case trung tâm | Quản lý … |
| Include | Đăng Nhập / Xác Thực |
| Extend | Các chức năng con |
| Mục đích | Mô tả phân hệ quản lý |

**11.3. Mẫu mô tả sơ đồ cấp 2**

| **Mục** | **Nội dung** |
| --- | --- |
| Tên sơ đồ | UseCase xử lý nghiệp vụ cụ thể |
| Boundary | Tên nghiệp vụ |
| Actor | Actor tham gia nghiệp vụ |
| Use case chính | Tên nghiệp vụ chính |
| Include | Các bước bắt buộc |
| Extend | Ngoại lệ hoặc phát sinh |
| Mục đích | Mô tả luồng xử lý nghiệp vụ |

**11.4. Mẫu mô tả sơ đồ cấp 3**

| **Mục** | **Nội dung** |
| --- | --- |
| Tên sơ đồ | UseCase xử lý phát sinh |
| Boundary | Tên xử lý phát sinh |
| Actor | Actor liên quan |
| Use case chính | Tên xử lý phát sinh |
| Include | Các bước bắt buộc sau khi phát sinh |
| Extend | Chỉ có nếu còn ngoại lệ con |
| Mục đích | Mô tả chi tiết nghiệp vụ phát sinh |

**12. Kết luận**

Từ bộ sơ đồ mẫu Quản Lý Thư Viện, có thể rút ra một phương pháp chung để xác định và vẽ Use Case theo nhiều cấp:

| **Cấp** | **Nội dung chính** | **Include/Extend** |
| --- | --- | --- |
| **Cấp 0** | Actor và nhóm chức năng lớn | Không nên dùng include/extend |
| **Cấp 1** | Phân hệ quản lý | Use case trung tâm include Đăng Nhập; chức năng con extend use case trung tâm |
| **Cấp 2** | Quy trình nghiệp vụ cụ thể | Các bước bắt buộc dùng include; ngoại lệ dùng extend |
| **Cấp 3** | Quy trình phát sinh phức tạp | Các bước xử lý chi tiết dùng include; extend chỉ dùng khi còn ngoại lệ con |

Cách làm này giúp sơ đồ Use Case có cấu trúc rõ ràng:

Tổng quan trước, chi tiết sau.
Phân hệ trước, nghiệp vụ sau.
Bước bắt buộc dùng include.
Tình huống tùy chọn hoặc phát sinh dùng extend.

Khi áp dụng cho bất kỳ đề tài nào, người phân tích nên bắt đầu từ sơ đồ cấp 0, sau đó chọn các nhóm chức năng lớn để phân rã thành cấp 1, tiếp tục tách các nghiệp vụ phức tạp thành cấp 2, và chỉ dùng cấp 3 khi một ngoại lệ hoặc quy trình phát sinh cần mô tả riêng.