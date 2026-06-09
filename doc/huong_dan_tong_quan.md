Dưới đây là bản **báo cáo hướng dẫn tổng hợp** được viết lại thành một tài liệu hoàn chỉnh, dựa trên nội dung của 2 bài hướng dẫn bạn đã gửi và các ý chính đã phân tích trước đó. Hiện tại công cụ đọc file không truy xuất lại được nội dung trực tiếp của 2 file, nên bản này được tổng hợp từ nội dung đã đọc/trao đổi trước trong cuộc trò chuyện.

**BÁO CÁO HƯỚNG DẪN XÁC ĐỊNH, PHÂN RÃ VÀ VẼ SƠ ĐỒ USE CASE THEO CẤP 0, 1, 2, 3**

**Dựa trên mẫu hệ thống Quản Lý Thư Viện và có thể áp dụng cho nhiều đề tài phân tích thiết kế hệ thống**

**1. Mục đích của báo cáo**

Báo cáo này được xây dựng nhằm tổng hợp và hệ thống hóa phương pháp xác định, phân rã và vẽ sơ đồ Use Case theo nhiều cấp khác nhau, bao gồm **cấp 0, cấp 1, cấp 2, cấp 3**. Nội dung báo cáo dựa trên bộ sơ đồ mẫu của hệ thống **Quản Lý Thư Viện**, đồng thời rút ra các nguyên tắc tổng quát để có thể áp dụng cho nhiều đề tài phân tích và thiết kế hệ thống khác.

Trọng tâm của báo cáo là làm rõ:

| **Nội dung** | **Mục tiêu** |
| --- | --- |
| Cách xác định actor | Biết ai là người hoặc hệ thống bên ngoài tương tác với hệ thống |
| Cách xác định use case | Biết hệ thống cần cung cấp những chức năng gì |
| Cách chia sơ đồ theo cấp | Biết khi nào vẽ cấp 0, cấp 1, cấp 2, cấp 3 |
| Cách dùng include | Biết khi nào một chức năng là bước bắt buộc |
| Cách dùng extend | Biết khi nào một chức năng là mở rộng, tùy chọn hoặc phát sinh |
| Cách tổng quát hóa mẫu | Có thể áp dụng cho các đề tài khác như LMS, bán hàng, khách sạn, bệnh viện, kho hàng |

Báo cáo này không chỉ phục vụ cho một hệ thống cụ thể, mà có thể dùng như một **tài liệu hướng dẫn phương pháp luận** khi làm đồ án môn Phân tích và Thiết kế Hệ thống.

**2. Cơ sở mẫu: Bộ sơ đồ Use Case hệ thống Quản Lý Thư Viện**

Bộ sơ đồ mẫu của hệ thống Quản Lý Thư Viện gồm 9 sơ đồ chính:

| **STT** | **Tên sơ đồ** | **Vai trò trong hệ thống mẫu** |
| --- | --- | --- |
| 1 | Use Case tổng quan cấp 0 | Mô tả toàn bộ hệ thống ở mức tổng quan |
| 2 | UC QL Mượn Trả | Mô tả phân hệ quản lý mượn/trả sách |
| 3 | UC Quản Lý Thẻ TV | Mô tả phân hệ quản lý thẻ thư viện |
| 4 | UC QL Báo Cáo Thống Kê | Mô tả phân hệ báo cáo, thống kê |
| 5 | UseCase QL Người Dùng | Mô tả phân hệ quản lý người dùng |
| 6 | UseCase QL Sách | Mô tả phân hệ quản lý sách |
| 7 | UseCase Lập Phiếu Mượn | Mô tả chi tiết quy trình lập phiếu mượn |
| 8 | UseCase Lập Phiếu Trả | Mô tả chi tiết quy trình lập phiếu trả |
| 9 | UseCase Lập Phiếu Phạt | Mô tả chi tiết quy trình lập phiếu phạt |

Từ bộ sơ đồ này có thể rút ra ba nhóm sơ đồ chính:

| **Nhóm sơ đồ** | **Gồm các sơ đồ** | **Đặc điểm** |
| --- | --- | --- |
| **Sơ đồ tổng quan** | Use Case tổng quan cấp 0 | Chỉ thể hiện actor và nhóm chức năng lớn |
| **Sơ đồ quản lý tổng quát** | QL Mượn Trả, Quản Lý Thẻ TV, QL Báo Cáo, QL Người Dùng, QL Sách | Có use case trung tâm, include Đăng Nhập, các chức năng con extend |
| **Sơ đồ nghiệp vụ chi tiết** | Lập Phiếu Mượn, Lập Phiếu Trả, Lập Phiếu Phạt | Các bước bắt buộc dùng include, ngoại lệ/phát sinh dùng extend |

Điểm quan trọng của bộ sơ đồ mẫu là cách thiết kế khá nhất quán:

Cấp tổng quan chỉ thể hiện bức tranh chung.
Cấp quản lý thể hiện các phân hệ và chức năng con.
Cấp nghiệp vụ chi tiết thể hiện từng bước xử lý.
include dùng cho bước bắt buộc.
extend dùng cho chức năng phát sinh hoặc tùy chọn.

**3. Ý nghĩa của việc chia sơ đồ Use Case theo cấp**

Trong một hệ thống thông tin, nếu đưa toàn bộ actor, chức năng, bước xử lý, luồng phụ, ngoại lệ vào một sơ đồ duy nhất thì sơ đồ sẽ trở nên rối, khó đọc và khó bảo vệ. Vì vậy, cần chia sơ đồ Use Case thành nhiều cấp.

**3.1. Khái niệm các cấp sơ đồ**

| **Cấp sơ đồ** | **Ý nghĩa** | **Mức độ chi tiết** |
| --- | --- | --- |
| **Cấp 0** | Mô tả toàn bộ hệ thống ở mức tổng quan | Rất tổng quát |
| **Cấp 1** | Phân rã từng nhóm chức năng lớn thành các chức năng con | Trung bình |
| **Cấp 2** | Mô tả chi tiết một nghiệp vụ cụ thể | Chi tiết |
| **Cấp 3** | Mô tả sâu hơn một nghiệp vụ phát sinh, ngoại lệ hoặc quy trình con phức tạp | Rất chi tiết |

Có thể hiểu đơn giản:

**Cấp càng cao thì càng tổng quan.**
**Cấp càng thấp thì càng chi tiết.**

**3.2. Liên hệ với mẫu Quản Lý Thư Viện**

| **Cấp** | **Sơ đồ tương ứng trong hệ thống Quản Lý Thư Viện** |
| --- | --- |
| **Cấp 0** | Hệ Thống Quản Lý Thư Viện |
| **Cấp 1** | QL Mượn Trả, Quản Lý Thẻ TV, QL Báo Cáo Thống Kê, QL Người Dùng, QL Sách |
| **Cấp 2** | Lập Phiếu Mượn, Lập Phiếu Trả |
| **Cấp 3 hoặc cấp phát sinh chi tiết** | Lập Phiếu Phạt |

Tùy cách trình bày, **Lập Phiếu Phạt** có thể được xem là cấp 2 vì nó là một nghiệp vụ chi tiết, hoặc cấp 3 vì nó phát sinh từ **Lập Phiếu Trả** thông qua quan hệ extend.

**4. Hướng dẫn xác định và vẽ sơ đồ Use Case cấp 0**

**4.1. Mục tiêu của sơ đồ cấp 0**

Sơ đồ Use Case cấp 0 dùng để trả lời các câu hỏi:

| **Câu hỏi** | **Ý nghĩa** |
| --- | --- |
| Hệ thống là gì? | Xác định boundary |
| Ai sử dụng hệ thống? | Xác định actor |
| Hệ thống có những nhóm chức năng lớn nào? | Xác định use case cấp cao |
| Actor nào tương tác với nhóm chức năng nào? | Xác định association |

Ở cấp 0, **không mô tả chi tiết xử lý**. Không nên đưa các bước như kiểm tra thông tin, nhập dữ liệu, lưu dữ liệu, tính tiền, cập nhật trạng thái vào sơ đồ cấp 0.

**4.2. Thành phần của sơ đồ cấp 0**

| **Thành phần** | **Cách xác định** |
| --- | --- |
| Boundary | Tên toàn bộ hệ thống |
| Actor | Người dùng hoặc hệ thống ngoài tương tác trực tiếp |
| Use case cấp cao | Các nhóm chức năng chính |
| Association | Đường nối giữa actor và use case |
| Include/Extend | Thường không dùng |

**4.3. Ví dụ từ hệ thống Quản Lý Thư Viện**

Boundary:

**Hệ Thống Quản Lý Thư Viện**

Actor:

| **Actor** | **Vai trò** |
| --- | --- |
| Đọc Giả | Người mượn/trả sách, dùng thẻ thư viện |
| Thủ Thư / Thử Thư | Người xử lý mượn/trả, báo cáo |
| Nhân Viên | Người quản lý thẻ, người dùng |
| NV QL Sách | Người quản lý sách |

Use case cấp cao:

| **Use case cấp cao** | **Ý nghĩa** |
| --- | --- |
| QL Mượn Trả | Quản lý mượn và trả sách |
| Quản Lý Thẻ TV | Quản lý thẻ thư viện |
| QL Báo Cáo Thống Kê | Quản lý báo cáo |
| QL Người Dùng | Quản lý người dùng |
| QL Sách | Quản lý sách |

**4.4. Quy tắc vẽ cấp 0**

| **Quy tắc** | **Giải thích** |
| --- | --- |
| Đặt actor bên ngoài boundary | Actor không thuộc hệ thống |
| Đặt use case bên trong boundary | Use case là chức năng hệ thống cung cấp |
| Chỉ nối actor với nhóm chức năng lớn | Không nối với các bước chi tiết |
| Không dùng hoặc hạn chế include/extend | Vì cấp 0 chỉ để nhìn tổng quan |
| Mỗi use case cấp 0 nên là một phân hệ lớn | Tránh đặt use case quá nhỏ |

**4.5. Lỗi thường gặp ở cấp 0**

| **Lỗi** | **Vì sao sai** | **Cách sửa** |
| --- | --- | --- |
| Đưa quá nhiều bước xử lý vào cấp 0 | Làm sơ đồ rối | Chỉ giữ nhóm chức năng lớn |
| Dùng include/extend ở cấp 0 | Làm mất tính tổng quan | Đưa include/extend xuống cấp 1 hoặc cấp 2 |
| Đặt actor không tương tác trực tiếp | Sai bản chất actor | Chỉ chọn người/hệ thống có tương tác trực tiếp |
| Đặt use case quá nhỏ | Cấp 0 bị vụn | Gom thành phân hệ lớn |

**5. Hướng dẫn xác định và vẽ sơ đồ Use Case cấp 1**

**5.1. Mục tiêu của sơ đồ cấp 1**

Sơ đồ cấp 1 dùng để phân rã một nhóm chức năng lớn ở cấp 0 thành các chức năng con.

Ví dụ, ở cấp 0 có use case:

**QL Sách**

Thì ở cấp 1 sẽ có sơ đồ:

**UseCase QL Sách**

Trong đó có các chức năng con như quản lý đầu sách, quản lý thể loại, quản lý nhà xuất bản, tra cứu sách, cập nhật số lượng sách.

**5.2. Đặc điểm của sơ đồ cấp 1 trong mẫu thư viện**

Các sơ đồ cấp 1 trong mẫu có cấu trúc chung:

Actor → Use case trung tâm
Use case trung tâm include Đăng Nhập
Các chức năng con extend use case trung tâm

Bảng tổng hợp:

| **Sơ đồ cấp 1** | **Use case trung tâm** | **Include** | **Extend** |
| --- | --- | --- | --- |
| QL Mượn Trả | QL Mượn Trả | Đăng Nhập | Lập Phiếu Mượn, Lập Phiếu Trả |
| Quản Lý Thẻ TV | Quản Lý Thẻ TV | Đăng Nhập | Cấp Thẻ, Ghi Nhận Lệ Phí, Gia Hạn Thẻ, Kiểm Tra Hiệu Lực |
| QL Báo Cáo Thống Kê | QL Báo Cáo Thống Kê | Đăng Nhập | Thống kê sách đang mượn, quá hạn, bị mất, hư hỏng |
| QL Người Dùng | QL Người dùng | Đăng Nhập | Thêm, cập nhật, xóa, tra cứu |
| QL Sách | QL SÁCH | Đăng Nhập | Quản lý đầu sách, thể loại, nhà xuất bản, tra cứu, cập nhật số lượng |

**5.3. Khi nào cần tách sơ đồ cấp 1?**

Một use case cấp 0 nên được tách thành sơ đồ cấp 1 nếu:

| **Dấu hiệu** | **Ví dụ** |
| --- | --- |
| Có nhiều chức năng con | QL Sách có quản lý đầu sách, thể loại, NXB |
| Có nhiều thao tác nghiệp vụ | QL Người Dùng có thêm, sửa, xóa, tra cứu |
| Có nhiều loại báo cáo | QL Báo Cáo có nhiều loại thống kê |
| Có nhiều nhánh xử lý | QL Mượn Trả có lập phiếu mượn, lập phiếu trả |
| Cần mô tả rõ hơn để bảo vệ | Một sơ đồ cấp 0 không đủ chi tiết |

**5.4. Quy trình vẽ sơ đồ cấp 1**

**Bước 1: Đặt boundary theo tên phân hệ**

Ví dụ:

| **Use case cấp 0** | **Boundary cấp 1** |
| --- | --- |
| QL Sách | UseCase QL Sách |
| QL Người Dùng | UseCase QL Người Dùng |
| QL Mượn Trả | UC QL Mượn Trả |
| QL Báo Cáo Thống Kê | UC QL Báo Cáo Thống Kê |

**Bước 2: Xác định use case trung tâm**

Use case trung tâm thường trùng với tên phân hệ.

Ví dụ:

| **Sơ đồ** | **Use case trung tâm** |
| --- | --- |
| UseCase QL Sách | QL SÁCH |
| UseCase QL Người Dùng | QL Người dùng |
| UC QL Mượn Trả | QL Mượn Trả |

**Bước 3: Xác định actor của phân hệ**

Chỉ đưa actor có liên quan trực tiếp.

Ví dụ:

| **Sơ đồ** | **Actor** |
| --- | --- |
| QL Sách | NV QL Sách |
| QL Người Dùng | Nhân Viên |
| QL Mượn Trả | Đọc Giả, Thủ Thư |
| QL Báo Cáo Thống Kê | Thủ Thư |

**Bước 4: Xác định include**

Theo mẫu thư viện, use case trung tâm ở cấp 1 thường:

include Đăng Nhập

Lý do: Các chức năng quản lý thường yêu cầu người dùng đăng nhập trước khi thao tác.

**Bước 5: Xác định extend**

Các chức năng con thường extend use case trung tâm.

Ví dụ:

| **Use case trung tâm** | **Use case mở rộng** |
| --- | --- |
| QL Người dùng | Thêm Người Dùng, Cập Nhật Người Dùng, Xóa Người Dùng, Tra Cứu Người Dùng |
| QL Sách | Quản Lý Đầu Sách, Quản Lý Thể Loại Sách, Quản Lý Nhà Xuất Bản, Tra Cứu Sách |
| QL Báo Cáo Thống Kê | Thống kê sách đang mượn, quá hạn, bị mất, hư hỏng |

**5.5. Mẫu vẽ cấp 1**

Actor ───────────── Use case quản lý trung tâm

|

| <<include>>

v

Đăng Nhập

Chức năng con 1 ── <<extend>> ──> Use case quản lý trung tâm

Chức năng con 2 ── <<extend>> ──> Use case quản lý trung tâm

Chức năng con 3 ── <<extend>> ──> Use case quản lý trung tâm

**5.6. Lưu ý khi vẽ cấp 1**

| **Lưu ý** | **Giải thích** |
| --- | --- |
| Không đưa bước quá nhỏ vào cấp 1 | Các bước như nhập, lưu, kiểm tra chi tiết nên để cấp 2 |
| Chỉ thể hiện chức năng con lớn | Ví dụ thêm, sửa, xóa, tra cứu |
| Đăng Nhập có thể dùng include | Nếu phân hệ yêu cầu xác thực |
| Chức năng con thường dùng extend | Vì người dùng chọn chức năng nào thì chức năng đó mới xảy ra |

**6. Hướng dẫn xác định và vẽ sơ đồ Use Case cấp 2**

**6.1. Mục tiêu của sơ đồ cấp 2**

Sơ đồ cấp 2 mô tả chi tiết một nghiệp vụ cụ thể có nhiều bước xử lý.

Trong mẫu thư viện, các sơ đồ cấp 2 tiêu biểu là:

| **Sơ đồ cấp 2** | **Mục đích** |
| --- | --- |
| Lập Phiếu Mượn | Mô tả quy trình mượn sách |
| Lập Phiếu Trả | Mô tả quy trình trả sách |

Ở cấp 2, không còn chỉ là chức năng con đơn giản, mà là một quy trình có bước đầu, bước kiểm tra, bước nhập dữ liệu, bước lưu dữ liệu và bước cập nhật.

**6.2. Khi nào cần tách thành cấp 2?**

Một use case ở cấp 1 nên được tách thành sơ đồ cấp 2 nếu:

| **Dấu hiệu** | **Ví dụ** |
| --- | --- |
| Có nhiều bước xử lý tuần tự | Lập Phiếu Mượn cần kiểm tra, nhập, lưu, cập nhật |
| Có nhiều điều kiện kiểm tra | Kiểm tra thẻ, kiểm tra sách, kiểm tra số lượng |
| Có tạo dữ liệu mới | Phiếu mượn, phiếu trả, đơn hàng, hóa đơn |
| Có thể phát sinh ngoại lệ | Từ Chối Mượn, Lập Phiếu Phạt |
| Có thể viết thành luồng sự kiện chi tiết | Luồng chính, luồng phụ, hậu điều kiện |

**6.3. Cách dùng include ở cấp 2**

Ở cấp 2, include dùng cho các bước bắt buộc trong quy trình.

Câu hỏi kiểm tra:

Nếu bỏ bước này thì quy trình có hoàn thành đúng không?

Nếu câu trả lời là **không**, bước đó nên là include.

Ví dụ trong sơ đồ **Lập Phiếu Mượn**:

| **Use case chính** | **Include** |
| --- | --- |
| Lập Phiếu Mượn | KT TT Đọc Giả |
| Lập Phiếu Mượn | Kiểm Tra Thẻ TV |
| Lập Phiếu Mượn | KT TT Sách |
| Lập Phiếu Mượn | KT Số Lượng Sách Mượn |
| Lập Phiếu Mượn | Kiểm tra số lượng sách đang có |
| Lập Phiếu Mượn | Nhập Thông tin phiếu mượn |
| Lập Phiếu Mượn | Lưu chi tiết phiếu mượn |
| Lập Phiếu Mượn | Cập Nhật số Lượng sách |

Các bước này đều cần thiết để hoàn thành nghiệp vụ lập phiếu mượn.

**6.4. Cách dùng extend ở cấp 2**

Ở cấp 2, extend dùng cho tình huống phát sinh hoặc ngoại lệ.

Ví dụ:

| **Use case mở rộng** | **Extend** | **Use case gốc** | **Điều kiện phát sinh** |
| --- | --- | --- | --- |
| Từ Chối Mượn | extend | Lập Phiếu Mượn | Khi độc giả không đủ điều kiện mượn |
| Lập Phiếu Phạt | extend | Lập Phiếu Trả | Khi trả trễ, mất sách hoặc sách hư hỏng |

Câu hỏi kiểm tra:

Use case này có xảy ra trong mọi lần thực hiện quy trình chính không?

Nếu câu trả lời là **không**, đó có thể là extend.

**6.5. Mẫu vẽ cấp 2**

Actor ───────────── Use case nghiệp vụ chính

Use case nghiệp vụ chính <<include>> Bước kiểm tra 1

Use case nghiệp vụ chính <<include>> Bước kiểm tra 2

Use case nghiệp vụ chính <<include>> Bước nhập dữ liệu

Use case nghiệp vụ chính <<include>> Bước lưu dữ liệu

Use case nghiệp vụ chính <<include>> Bước cập nhật dữ liệu

Ngoại lệ / phát sinh <<extend>> Use case nghiệp vụ chính

**6.6. Ví dụ: Lập Phiếu Trả**

Use case chính:

Lập Phiếu Trả

Include:

| **Bước bắt buộc** |
| --- |
| Tìm phiếu mượn |
| Kiểm tra thông tin đọc giả |
| Kiểm tra ngày trả |
| Kiểm tra danh sách sách mượn |
| Kiểm tra tình trạng sách trả |
| Cập nhật thông tin trả sách |
| Cập nhật số lượng sách hiện có |
| Hoàn tất phiếu trả |

Extend:

| **Use case phát sinh** | **Điều kiện** |
| --- | --- |
| Lập Phiếu Phạt | Khi sách bị trả trễ, mất hoặc hư hỏng |

**7. Hướng dẫn xác định và vẽ sơ đồ Use Case cấp 3**

**7.1. Mục tiêu của sơ đồ cấp 3**

Sơ đồ cấp 3 dùng để mô tả sâu hơn một nghiệp vụ phát sinh hoặc ngoại lệ phức tạp. Không phải hệ thống nào cũng cần vẽ đến cấp 3. Chỉ nên vẽ cấp 3 khi use case phát sinh có nhiều bước riêng và cần mô tả thành một quy trình độc lập.

Trong mẫu thư viện, **Lập Phiếu Phạt** có thể xem là cấp 3 vì nó phát sinh từ **Lập Phiếu Trả**.

**7.2. Khi nào cần vẽ cấp 3?**

| **Dấu hiệu** | **Ví dụ** |
| --- | --- |
| Use case phát sinh có nhiều bước xử lý | Lập Phiếu Phạt |
| Có dữ liệu riêng được tạo ra | Phiếu phạt, biên bản xử lý, yêu cầu hoàn tiền |
| Có nhiều actor liên quan | Người dùng, nhân viên, kế toán |
| Nếu đưa vào cấp 2 sẽ làm sơ đồ rối | Nên tách thành sơ đồ riêng |
| Có thể viết luồng sự kiện riêng | Quy trình xử lý phạt, xử lý khiếu nại |

**7.3. Đặc điểm của cấp 3**

Điểm quan trọng:

Một use case có thể là extend ở sơ đồ cha, nhưng khi tách thành sơ đồ riêng thì các bước bên trong nó thường là include.

Ví dụ:

Ở sơ đồ **Lập Phiếu Trả**:

Lập Phiếu Phạt extend Lập Phiếu Trả

Nhưng trong sơ đồ **Lập Phiếu Phạt**, các bước như xác định sách bị phạt, xác định lý do, nhập phí, tính tổng tiền, lưu phiếu đều là include.

**7.4. Ví dụ: Lập Phiếu Phạt**

Use case chính:

Lập Phiếu Phạt

Include:

| **Use case chính** | **Include** |
| --- | --- |
| Lập Phiếu Phạt | Xác định sách bị phạt |
| Lập Phiếu Phạt | Xác định lý do phạt |
| Lập Phiếu Phạt | Nhập phí phạt cho từng sách |
| Lập Phiếu Phạt | Tính tổng tiền phạt |
| Lập Phiếu Phạt | Lưu chi tiết phiếu phạt |
| Lập Phiếu Phạt | Lưu phiếu phạt |
| Lập Phiếu Phạt | Thông báo phí phạt cho đọc giả |

Extend:

Không có extend trong sơ đồ này nếu tất cả các bước đều bắt buộc sau khi đã quyết định lập phiếu phạt.

**7.5. Mẫu vẽ cấp 3**

Actor ───────────── Use case xử lý phát sinh

Use case xử lý phát sinh <<include>> Xác định đối tượng

Use case xử lý phát sinh <<include>> Xác định lý do

Use case xử lý phát sinh <<include>> Nhập thông tin xử lý

Use case xử lý phát sinh <<include>> Tính kết quả xử lý

Use case xử lý phát sinh <<include>> Lưu chi tiết

Use case xử lý phát sinh <<include>> Lưu phiếu / biên bản

Use case xử lý phát sinh <<include>> Thông báo kết quả

**8. Hướng dẫn chi tiết cách dùng include**

**8.1. Khái niệm include**

Quan hệ include biểu diễn rằng một use case chính **luôn sử dụng** hoặc **bắt buộc gọi** một use case khác trong quá trình thực hiện.

Nói cách khác:

Nếu use case chính chạy, use case được include cũng phải chạy.

**8.2. Khi nào dùng include?**

Dùng include trong các trường hợp sau:

| **Trường hợp** | **Ví dụ** |
| --- | --- |
| Bước bắt buộc trong quy trình | Kiểm tra thông tin, nhập dữ liệu, lưu dữ liệu |
| Chức năng dùng chung | Đăng Nhập, Xác Thực, Kiểm Tra Quyền |
| Bước xử lý không thể thiếu | Cập nhật trạng thái, lưu chi tiết |
| Quy trình chính luôn cần bước đó | Lập Phiếu Mượn luôn cần kiểm tra thẻ |

**8.3. Câu hỏi kiểm tra để dùng include**

Trước khi dùng include, hãy hỏi:

Nếu bỏ use case này, use case chính có hoàn thành đúng không?

Nếu câu trả lời là:

| **Câu trả lời** | **Kết luận** |
| --- | --- |
| Không hoàn thành được | Dùng include |
| Vẫn hoàn thành được | Không nên dùng include, cân nhắc extend |

**8.4. Ví dụ đúng trong mẫu thư viện**

| **Use case chính** | **Include** | **Lý do** |
| --- | --- | --- |
| QL Sách | Đăng Nhập | Nhân viên phải đăng nhập trước khi quản lý sách |
| Lập Phiếu Mượn | Kiểm Tra Thẻ TV | Phải kiểm tra thẻ trước khi cho mượn |
| Lập Phiếu Trả | Tìm phiếu mượn | Phải tìm phiếu mượn trước khi trả |
| Lập Phiếu Phạt | Tính tổng tiền phạt | Phải tính tiền phạt trước khi lưu phiếu |

**8.5. Lỗi thường gặp khi dùng include**

| **Lỗi** | **Ví dụ sai** | **Cách sửa** |
| --- | --- | --- |
| Dùng include cho chức năng tùy chọn | QL Người dùng include Thêm Người Dùng | Thêm Người Dùng extend QL Người dùng |
| Dùng include cho ngoại lệ | Lập Phiếu Mượn include Từ Chối Mượn | Từ Chối Mượn extend Lập Phiếu Mượn |
| Dùng include quá nhiều ở cấp 0 | Cấp 0 include kiểm tra, nhập, lưu | Đưa chi tiết xuống cấp 2 |

**9. Hướng dẫn chi tiết cách dùng extend**

**9.1. Khái niệm extend**

Quan hệ extend biểu diễn rằng một use case mở rộng chỉ được thực hiện khi có điều kiện cụ thể hoặc khi người dùng chọn một nhánh chức năng.

Nói cách khác:

Use case chính vẫn có thể hoàn thành mà không cần use case mở rộng.

**9.2. Khi nào dùng extend?**

Dùng extend trong các trường hợp sau:

| **Trường hợp** | **Ví dụ** |
| --- | --- |
| Chức năng con tùy chọn | Thêm, sửa, xóa, tra cứu |
| Ngoại lệ | Từ chối, hủy, lỗi |
| Phát sinh nghiệp vụ | Lập phiếu phạt, hoàn tiền |
| Điều kiện đặc biệt | Quá hạn, vi phạm, thanh toán thất bại |
| Nhánh người dùng lựa chọn | Chọn loại báo cáo, chọn chức năng cập nhật |

**9.3. Câu hỏi kiểm tra để dùng extend**

Trước khi dùng extend, hãy hỏi:

Use case này có xảy ra trong mọi lần thực hiện use case chính không?

Nếu câu trả lời là:

| **Câu trả lời** | **Kết luận** |
| --- | --- |
| Không, chỉ xảy ra khi có điều kiện | Dùng extend |
| Có, luôn xảy ra | Dùng include |

**9.4. Ví dụ đúng trong mẫu thư viện**

| **Use case mở rộng** | **Extend** | **Use case gốc** | **Lý do** |
| --- | --- | --- | --- |
| Lập Phiếu Mượn | extend | QL Mượn Trả | Chỉ xảy ra khi có nhu cầu mượn |
| Lập Phiếu Trả | extend | QL Mượn Trả | Chỉ xảy ra khi có nhu cầu trả |
| Thêm Người Dùng | extend | QL Người dùng | Chỉ xảy ra khi nhân viên chọn thêm |
| Từ Chối Mượn | extend | Lập Phiếu Mượn | Chỉ xảy ra khi không đủ điều kiện mượn |
| Lập Phiếu Phạt | extend | Lập Phiếu Trả | Chỉ xảy ra khi có vi phạm khi trả sách |

**9.5. Lỗi thường gặp khi dùng extend**

| **Lỗi** | **Ví dụ sai** | **Cách sửa** |
| --- | --- | --- |
| Dùng extend cho bước bắt buộc | Kiểm Tra Thẻ TV extend Lập Phiếu Mượn | Lập Phiếu Mượn include Kiểm Tra Thẻ TV |
| Dùng extend quá nhiều làm mất quy trình chính | Tất cả bước xử lý đều extend | Bước bắt buộc phải là include |
| Không xác định điều kiện phát sinh | Extend nhưng không biết khi nào xảy ra | Ghi rõ điều kiện trong mô tả use case |

**10. Cách xác định actor**

**10.1. Actor là gì?**

Actor là người, tổ chức hoặc hệ thống bên ngoài tương tác trực tiếp với hệ thống đang phân tích.

Actor không nhất thiết luôn là con người. Một actor có thể là:

| **Loại actor** | **Ví dụ** |
| --- | --- |
| Người dùng cuối | Đọc Giả, Khách Hàng, Học Viên |
| Nhân viên nghiệp vụ | Thủ Thư, Nhân Viên, Lễ Tân |
| Người quản trị | Admin, Quản Lý |
| Hệ thống ngoài | Cổng thanh toán, Email Service, Ngân hàng |

**10.2. Cách xác định actor**

Có thể dùng các câu hỏi sau:

| **Câu hỏi** | **Mục đích** |
| --- | --- |
| Ai sử dụng hệ thống? | Tìm người dùng chính |
| Ai nhập dữ liệu vào hệ thống? | Tìm nhân viên thao tác |
| Ai nhận kết quả từ hệ thống? | Tìm actor nhận thông báo, báo cáo |
| Ai quản trị hệ thống? | Tìm admin/quản lý |
| Hệ thống nào trao đổi dữ liệu với hệ thống này? | Tìm actor hệ thống ngoài |

**10.3. Lỗi thường gặp khi xác định actor**

| **Lỗi** | **Giải thích** |
| --- | --- |
| Đưa cơ sở dữ liệu làm actor | CSDL là thành phần bên trong hệ thống, không phải actor |
| Đưa bộ phận không thao tác trực tiếp làm actor | Nếu “Ban giám hiệu” không dùng hệ thống thì không nên là actor |
| Tạo quá nhiều actor giống nhau | Nếu vai trò giống nhau thì nên gộp |
| Nhầm actor với chức năng | “Thanh toán” là use case, không phải actor |

**11. Cách xác định use case**

**11.1. Use case là gì?**

Use case là một chức năng hoặc một hành vi mà hệ thống cung cấp cho actor nhằm đạt được một mục tiêu nào đó.

Use case thường được đặt tên bằng động từ hoặc cụm động từ.

Ví dụ:

| **Đúng** | **Không nên** |
| --- | --- |
| Quản lý sách | Sách |
| Lập phiếu mượn | Phiếu mượn |
| Thanh toán đơn hàng | Đơn hàng |
| Tra cứu người dùng | Người dùng |

**11.2. Cách tìm use case từ mô tả hệ thống**

Khi đọc mô tả hệ thống, nên gạch chân:

| **Loại từ** | **Có thể gợi ý** |
| --- | --- |
| Danh từ | Actor, đối tượng dữ liệu |
| Động từ | Use case |
| Cụm nghiệp vụ | Phân hệ hoặc quy trình |

Ví dụ:

Độc giả mượn sách, thủ thư lập phiếu mượn, hệ thống kiểm tra thẻ thư viện và cập nhật số lượng sách.

Có thể rút ra:

| **Thành phần** | **Kết quả** |
| --- | --- |
| Actor | Độc giả, thủ thư |
| Use case chính | Lập Phiếu Mượn |
| Include | Kiểm tra thẻ thư viện, cập nhật số lượng sách |

**12. Quy trình tổng quát để xây dựng bộ sơ đồ Use Case cho một đề tài**

**Bước 1: Đọc kỹ mô tả hệ thống**

Cần hiểu:

| **Nội dung cần hiểu** | **Ví dụ** |
| --- | --- |
| Hệ thống phục vụ ai? | Đọc giả, khách hàng, học viên |
| Hệ thống quản lý đối tượng nào? | Sách, sản phẩm, khóa học, phòng |
| Hệ thống có giao dịch chính nào? | Mượn sách, đặt hàng, đặt phòng |
| Hệ thống có phát sinh nào? | Phạt, hoàn tiền, khiếu nại |
| Hệ thống có báo cáo nào? | Thống kê, doanh thu, tồn kho |

**Bước 2: Xác định actor**

Phân loại actor thành:

| **Nhóm actor** | **Ví dụ** |
| --- | --- |
| Người dùng chính | Đọc giả, khách hàng, học viên |
| Nhân viên xử lý | Thủ thư, nhân viên bán hàng, lễ tân |
| Người quản trị | Admin, quản lý |
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

Sơ đồ cấp 0 gồm:

| **Thành phần** | **Cách vẽ** |
| --- | --- |
| Boundary | Tên hệ thống |
| Actor | Đặt ngoài boundary |
| Use case cấp cao | Đặt trong boundary |
| Association | Nối actor với use case |
| Include/Extend | Không dùng hoặc hạn chế |

**Bước 5: Chọn use case cấp 0 để phân rã cấp 1**

Chọn các use case có nhiều chức năng con.

Ví dụ:

| **Use case cấp 0** | **Sơ đồ cấp 1** |
| --- | --- |
| QL Sách | UseCase QL Sách |
| QL Người Dùng | UseCase QL Người Dùng |
| QL Mượn Trả | UC QL Mượn Trả |

**Bước 6: Xác định include/extend cấp 1**

Áp dụng mẫu:

| **Thành phần** | **Quan hệ** |
| --- | --- |
| Đăng Nhập / Xác Thực | include |
| Thêm, sửa, xóa, tra cứu | extend |
| Các loại báo cáo | extend |
| Các nhánh chức năng con | extend |

**Bước 7: Tách nghiệp vụ phức tạp thành cấp 2**

Nếu use case con có nhiều bước, tách thành sơ đồ riêng.

Ví dụ:

| **Use case cấp 1** | **Sơ đồ cấp 2** |
| --- | --- |
| Lập Phiếu Mượn | UseCase Lập Phiếu Mượn |
| Lập Phiếu Trả | UseCase Lập Phiếu Trả |

**Bước 8: Xác định include/extend cấp 2**

| **Loại nội dung** | **Quan hệ** |
| --- | --- |
| Bước kiểm tra | include |
| Bước nhập dữ liệu | include |
| Bước lưu dữ liệu | include |
| Bước cập nhật dữ liệu | include |
| Ngoại lệ / phát sinh | extend |

**Bước 9: Tách phát sinh phức tạp thành cấp 3 nếu cần**

Ví dụ:

| **Use case phát sinh** | **Sơ đồ cấp 3** |
| --- | --- |
| Lập Phiếu Phạt | UseCase Lập Phiếu Phạt |
| Hoàn tiền | UseCase Xử Lý Hoàn Tiền |
| Xử lý khiếu nại | UseCase Xử Lý Khiếu Nại |

**Bước 10: Kiểm tra lại toàn bộ sơ đồ**

Cần kiểm tra:

| **Câu hỏi kiểm tra** | **Mục đích** |
| --- | --- |
| Actor có đúng là người/hệ thống ngoài không? | Tránh sai actor |
| Use case có đặt bằng động từ không? | Tránh đặt tên dữ liệu |
| Cấp 0 có quá chi tiết không? | Giữ tính tổng quan |
| Include có thật sự bắt buộc không? | Tránh nhầm include |
| Extend có điều kiện phát sinh rõ không? | Tránh nhầm extend |
| Có sơ đồ nào quá rối không? | Tách cấp nếu cần |

**13. Mẫu biểu phân tích một sơ đồ Use Case**

Khi viết báo cáo, có thể dùng mẫu sau cho từng sơ đồ.

**13.1. Mẫu chung**

| **Mục** | **Nội dung** |
| --- | --- |
| Tên sơ đồ | Ghi tên Use Case Diagram |
| Cấp sơ đồ | Cấp 0 / cấp 1 / cấp 2 / cấp 3 |
| Boundary | Tên hệ thống hoặc phân hệ |
| Actor | Danh sách actor |
| Use case trung tâm | Use case chính của sơ đồ |
| Use case phụ | Các chức năng con hoặc bước xử lý |
| Association | Actor nào nối với use case nào |
| Include | Use case chính bắt buộc gọi use case nào |
| Extend | Use case nào phát sinh từ use case gốc |
| Nhận xét | Đánh giá logic sơ đồ |

**13.2. Mẫu bảng include**

| **Use case nguồn** | **Quan hệ** | **Use case đích** | **Lý do dùng include** |
| --- | --- | --- | --- |
| Use case chính | include | Bước bắt buộc | Vì bước này luôn xảy ra |

**13.3. Mẫu bảng extend**

| **Use case mở rộng** | **Quan hệ** | **Use case gốc** | **Điều kiện phát sinh** |
| --- | --- | --- | --- |
| Use case phụ | extend | Use case chính | Chỉ xảy ra khi có điều kiện cụ thể |

**14. Bộ quy tắc tóm tắt theo từng cấp**

| **Cấp** | **Mục đích** | **Cách dùng include** | **Cách dùng extend** |
| --- | --- | --- | --- |
| **Cấp 0** | Tổng quan toàn hệ thống | Không nên dùng | Không nên dùng |
| **Cấp 1** | Phân hệ quản lý | Use case trung tâm include Đăng Nhập/Xác Thực | Chức năng con extend use case trung tâm |
| **Cấp 2** | Quy trình nghiệp vụ cụ thể | Các bước bắt buộc trong quy trình | Ngoại lệ, phát sinh |
| **Cấp 3** | Quy trình phát sinh chi tiết | Các bước bắt buộc sau khi phát sinh | Chỉ dùng nếu còn ngoại lệ con |

**15. Một số ví dụ ứng dụng cho các đề tài khác**

**15.1. Đề tài quản lý bán hàng**

| **Mẫu thư viện** | **Chuyển thành trong bán hàng** |
| --- | --- |
| QL Sách | Quản lý sản phẩm |
| QL Người Dùng | Quản lý khách hàng/nhân viên |
| QL Mượn Trả | Quản lý đơn hàng |
| Lập Phiếu Mượn | Tạo đơn hàng |
| Lập Phiếu Trả | Giao hàng / hoàn tất đơn hàng |
| Lập Phiếu Phạt | Xử lý đổi trả / khiếu nại |
| QL Báo Cáo Thống Kê | Báo cáo doanh thu |

**15.2. Đề tài quản lý khách sạn**

| **Mẫu thư viện** | **Chuyển thành trong khách sạn** |
| --- | --- |
| QL Sách | Quản lý phòng |
| Quản Lý Thẻ TV | Quản lý hồ sơ khách hàng |
| QL Mượn Trả | Quản lý đặt/trả phòng |
| Lập Phiếu Mượn | Đặt phòng |
| Lập Phiếu Trả | Trả phòng |
| Lập Phiếu Phạt | Xử lý bồi thường/hư hỏng |
| QL Báo Cáo Thống Kê | Báo cáo doanh thu phòng |

**15.3. Đề tài quản lý bệnh viện**

| **Mẫu thư viện** | **Chuyển thành trong bệnh viện** |
| --- | --- |
| QL Người Dùng | Quản lý người dùng bệnh viện |
| Quản Lý Thẻ TV | Quản lý hồ sơ bệnh nhân |
| QL Mượn Trả | Quản lý khám bệnh |
| Lập Phiếu Mượn | Đăng ký khám |
| Lập Phiếu Trả | Hoàn tất khám / xuất viện |
| Lập Phiếu Phạt | Xử lý phát sinh viện phí |
| QL Báo Cáo Thống Kê | Báo cáo khám chữa bệnh |

**15.4. Đề tài quản lý khóa học trực tuyến**

| **Mẫu thư viện** | **Chuyển thành trong LMS** |
| --- | --- |
| QL Sách | Quản lý khóa học |
| Quản Lý Thẻ TV | Quản lý tài khoản/hồ sơ học viên |
| QL Mượn Trả | Quản lý học tập/ghi danh |
| Lập Phiếu Mượn | Mua khóa học/tạo đơn hàng |
| Lập Phiếu Trả | Hoàn thành khóa học |
| Lập Phiếu Phạt | Xử lý vi phạm/hoàn tiền/khiếu nại |
| QL Báo Cáo Thống Kê | Báo cáo học tập/doanh thu |

**16. Kết luận**

Từ hai bài hướng dẫn và bộ sơ đồ mẫu Quản Lý Thư Viện, có thể rút ra một phương pháp chung để xây dựng Use Case Diagram cho nhiều hệ thống khác nhau.

Phương pháp này gồm các nguyên tắc cốt lõi sau:

1. **Bắt đầu bằng sơ đồ cấp 0** để xác định actor và nhóm chức năng lớn.
2. **Không đưa chi tiết xử lý vào cấp 0**, vì cấp 0 chỉ dùng để nhìn tổng quan.
3. **Tách các nhóm chức năng lớn thành sơ đồ cấp 1** nếu chúng có nhiều chức năng con.
4. **Ở cấp 1**, use case trung tâm thường include Đăng Nhập hoặc Xác Thực.
5. **Ở cấp 1**, các chức năng con như thêm, sửa, xóa, tra cứu, thống kê, cập nhật thường extend use case trung tâm.
6. **Tách các nghiệp vụ phức tạp thành cấp 2** nếu chúng có nhiều bước xử lý.
7. **Ở cấp 2**, các bước bắt buộc trong quy trình dùng include.
8. **Ở cấp 2**, các ngoại lệ hoặc phát sinh dùng extend.
9. **Nếu ngoại lệ hoặc phát sinh có quy trình riêng**, có thể tách tiếp thành cấp 3.
10. **Ở cấp 3**, các bước chi tiết sau khi phát sinh thường dùng include.

Có thể tóm gọn phương pháp như sau:

**Cấp 0**: Nhìn toàn hệ thống.
**Cấp 1**: Phân rã phân hệ.
**Cấp 2**: Mô tả quy trình nghiệp vụ.
**Cấp 3**: Mô tả xử lý phát sinh phức tạp.
**Include**: dùng cho bước bắt buộc.
**Extend**: dùng cho nhánh tùy chọn, ngoại lệ hoặc phát sinh.

Bộ hướng dẫn này có thể dùng làm đề cương cho nhiều đề tài phân tích thiết kế hệ thống khác nhau. Khi gặp đề tài mới, người phân tích chỉ cần thay actor, đối tượng nghiệp vụ và quy trình cụ thể cho phù hợp, nhưng vẫn giữ nguyên nguyên tắc phân cấp và nguyên tắc sử dụng include / extend.