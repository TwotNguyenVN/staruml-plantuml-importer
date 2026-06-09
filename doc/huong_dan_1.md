**1. Hiểu rõ yêu cầu**

Bạn muốn chỉnh lại báo cáo trước để nó không bị giới hạn cho riêng hệ thống LMS, mà trở thành một **đề cương phân tích Use Case tổng quát**, có thể dùng lại cho nhiều đề tài PT&TKHT khác sau này.

Dưới đây là phiên bản đã chỉnh theo hướng **tổng quát hóa**, trong đó hệ thống **Quản Lý Thư Viện** được dùng làm mẫu gốc, còn LMS chỉ là một ví dụ ứng dụng, không phải trọng tâm duy nhất.

**BÁO CÁO PHÂN TÍCH MẪU USE CASE HỆ THỐNG QUẢN LÝ THƯ VIỆN VÀ ĐỀ CƯƠNG ỨNG DỤNG CHO CÁC HỆ THỐNG KHÁC**

**1. Mục đích báo cáo**

Báo cáo này được xây dựng nhằm phân tích bộ sơ đồ Use Case mẫu của hệ thống **Quản Lý Thư Viện**, từ đó rút ra một **đề cương mô hình hóa Use Case tổng quát** có thể áp dụng cho nhiều đề tài phân tích và thiết kế hệ thống khác nhau.

Trọng tâm của báo cáo không chỉ là mô tả nghiệp vụ thư viện, mà là nhận diện cách tổ chức sơ đồ, cách xác định actor, cách xây dựng use case trung tâm, cách phân rã use case chi tiết, và đặc biệt là cách sử dụng hai quan hệ quan trọng trong Use Case Diagram:

| **Quan hệ** | **Ý nghĩa chính** |
| --- | --- |
| include | Dùng cho chức năng hoặc bước xử lý bắt buộc |
| extend | Dùng cho chức năng mở rộng, tùy chọn hoặc phát sinh theo điều kiện |

Thông qua bộ sơ đồ mẫu này, người học có thể sử dụng hệ thống Quản Lý Thư Viện như một **khung tham khảo** để xây dựng Use Case cho các đề tài khác như quản lý khóa học trực tuyến, quản lý bán hàng, quản lý bệnh viện, quản lý khách sạn, quản lý nhân sự, quản lý đặt vé, quản lý kho hoặc các hệ thống nghiệp vụ tương tự.

**2. Tổng quan bộ sơ đồ mẫu Quản Lý Thư Viện**

Bộ sơ đồ mẫu của hệ thống Quản Lý Thư Viện gồm 9 sơ đồ chính:

| **STT** | **Sơ đồ mẫu** | **Vai trò trong hệ thống** |
| --- | --- | --- |
| 1 | Use Case tổng quan cấp 0 | Mô tả toàn bộ hệ thống ở mức tổng quan |
| 2 | UC QL Mượn Trả | Mô tả nhóm chức năng quản lý mượn/trả sách |
| 3 | UC Quản Lý Thẻ TV | Mô tả nhóm chức năng quản lý thẻ thư viện |
| 4 | UC QL Báo Cáo Thống Kê | Mô tả nhóm chức năng báo cáo, thống kê |
| 5 | UseCase QL Người Dùng | Mô tả nhóm chức năng quản lý người dùng |
| 6 | UseCase QL Sách | Mô tả nhóm chức năng quản lý sách |
| 7 | UseCase Lập Phiếu Mượn | Mô tả chi tiết quy trình lập phiếu mượn |
| 8 | UseCase Lập Phiếu Trả | Mô tả chi tiết quy trình lập phiếu trả |
| 9 | UseCase Lập Phiếu Phạt | Mô tả chi tiết quy trình xử lý phiếu phạt |

Có thể chia 9 sơ đồ này thành 3 nhóm chính:

| **Nhóm sơ đồ** | **Đặc điểm** |
| --- | --- |
| **Sơ đồ tổng quan cấp 0** | Chỉ thể hiện actor và các nhóm chức năng lớn |
| **Sơ đồ quản lý tổng quát** | Mỗi sơ đồ có một use case quản lý trung tâm, include Đăng Nhập, các chức năng con dùng extend |
| **Sơ đồ nghiệp vụ chi tiết** | Mô tả quy trình cụ thể, các bước bắt buộc dùng include, ngoại lệ dùng extend |

**3. Phân tích cấu trúc thiết kế của bộ sơ đồ mẫu**

**3.1. Sơ đồ tổng quan cấp 0**

Sơ đồ tổng quan cấp 0 có boundary là:

**Hệ Thống Quản Lý Thư Viện**

Các actor gồm:

| **Actor** | **Vai trò** |
| --- | --- |
| Đọc Giả | Người sử dụng dịch vụ thư viện |
| Thủ Thư / Thử Thư | Người xử lý nghiệp vụ mượn/trả và báo cáo |
| Nhân Viên | Người xử lý nghiệp vụ quản lý thẻ và người dùng |
| NV QL Sách | Người phụ trách nghiệp vụ quản lý sách |

Các use case cấp cao gồm:

| **Use case cấp cao** | **Ý nghĩa** |
| --- | --- |
| QL Mượn Trả | Quản lý hoạt động mượn/trả sách |
| Quản Lý Thẻ TV | Quản lý thẻ thư viện |
| QL Báo Cáo Thống Kê | Quản lý báo cáo, thống kê |
| QL Người Dùng | Quản lý người dùng |
| QL Sách | Quản lý sách |

Sơ đồ tổng quan cấp 0 **không sử dụng include hoặc extend**. Đây là điểm quan trọng vì sơ đồ cấp 0 chỉ có nhiệm vụ trả lời câu hỏi:

Hệ thống có những nhóm chức năng chính nào và actor nào tương tác với các nhóm chức năng đó?

Khi áp dụng cho các đề tài khác, sơ đồ cấp 0 cũng nên giữ nguyên nguyên tắc này: không đưa quá nhiều chi tiết xử lý vào sơ đồ tổng quan.

Ví dụ tổng quát:

| **Loại đề tài** | **Use case cấp cao có thể có** |
| --- | --- |
| Quản lý bán hàng | Quản lý sản phẩm, bán hàng, thanh toán, khách hàng, báo cáo |
| Quản lý bệnh viện | Quản lý bệnh nhân, khám bệnh, đơn thuốc, viện phí, báo cáo |
| Quản lý khách sạn | Quản lý phòng, đặt phòng, nhận phòng, trả phòng, thanh toán |
| Quản lý khóa học | Quản lý tài khoản, khóa học, học tập, thanh toán, báo cáo |
| Quản lý kho | Quản lý hàng hóa, nhập kho, xuất kho, kiểm kê, báo cáo |

**3.2. Nhóm sơ đồ quản lý tổng quát**

Các sơ đồ quản lý tổng quát trong hệ thống thư viện gồm:

| **STT** | **Sơ đồ** |
| --- | --- |
| 1 | UC QL Mượn Trả |
| 2 | UC Quản Lý Thẻ TV |
| 3 | UC QL Báo Cáo Thống Kê |
| 4 | UseCase QL Người Dùng |
| 5 | UseCase QL Sách |

Các sơ đồ này có cùng một khuôn mẫu:

Actor liên kết với use case quản lý trung tâm.
Use case quản lý trung tâm include Đăng Nhập.
Các chức năng con extend use case quản lý trung tâm.

Bảng tổng hợp:

| **Sơ đồ** | **Use case trung tâm** | **Include** | **Extend** |
| --- | --- | --- | --- |
| QL Mượn Trả | QL Mượn Trả | Đăng Nhập | Lập Phiếu Mượn, Lập Phiếu Trả |
| Quản Lý Thẻ TV | Quản Lý Thẻ TV | Đăng Nhập | Cấp Thẻ, Gia Hạn, Ghi Nhận Lệ Phí, Kiểm Tra Hiệu Lực |
| QL Báo Cáo Thống Kê | QL Báo Cáo Thống Kê | Đăng Nhập | Các loại thống kê |
| QL Người Dùng | QL Người dùng | Đăng Nhập | Thêm, cập nhật, xóa, tra cứu |
| QL Sách | QL SÁCH | Đăng Nhập | Quản lý đầu sách, thể loại, NXB, tra cứu, cập nhật số lượng |

Từ nhóm sơ đồ này có thể rút ra một quy tắc tổng quát:

Đối với các phân hệ quản lý, nên đặt một use case trung tâm tên “Quản lý …”. Use case này include Đăng Nhập hoặc Xác Thực. Các thao tác con như thêm, sửa, xóa, tra cứu, thống kê, cập nhật, duyệt, khóa, hủy thường được mô hình bằng extend.

**3.3. Nhóm sơ đồ nghiệp vụ chi tiết**

Các sơ đồ nghiệp vụ chi tiết trong hệ thống thư viện gồm:

| **STT** | **Sơ đồ** |
| --- | --- |
| 1 | UseCase Lập Phiếu Mượn |
| 2 | UseCase Lập Phiếu Trả |
| 3 | UseCase Lập Phiếu Phạt |

Khác với sơ đồ quản lý tổng quát, nhóm này mô tả một quy trình nghiệp vụ cụ thể. Mẫu thiết kế là:

Actor liên kết với use case nghiệp vụ chính.
Use case nghiệp vụ chính include các bước xử lý bắt buộc.
Tình huống ngoại lệ hoặc phát sinh được biểu diễn bằng extend.

Bảng tổng hợp:

| **Sơ đồ** | **Use case chính** | **Include** | **Extend** |
| --- | --- | --- | --- |
| Lập Phiếu Mượn | Lập Phiếu Mượn | Kiểm tra độc giả, kiểm tra thẻ, kiểm tra sách, nhập phiếu, lưu chi tiết, cập nhật số lượng | Từ Chối Mượn |
| Lập Phiếu Trả | Lập Phiếu Trả | Tìm phiếu mượn, kiểm tra độc giả, kiểm tra ngày trả, kiểm tra sách, cập nhật thông tin, hoàn tất phiếu | Lập Phiếu Phạt |
| Lập Phiếu Phạt | Lập Phiếu Phạt | Xác định sách bị phạt, xác định lý do, nhập phí, tính tổng tiền, lưu phiếu, thông báo | Không có extend |

Từ nhóm sơ đồ này có thể rút ra quy tắc:

Với một quy trình nghiệp vụ cụ thể, các bước bắt buộc trong quy trình nên dùng include. Những tình huống chỉ xảy ra khi có điều kiện đặc biệt, như từ chối, phạt, lỗi, hủy, hoàn tiền, vi phạm, nên dùng extend.

**4. Phân tích trọng tâm quan hệ Include**

**4.1. Ý nghĩa của Include**

Trong bộ sơ đồ mẫu, include được dùng khi một use case chính **bắt buộc phải thực hiện** một use case khác.

Có hai nhóm include nổi bật:

**Nhóm 1: Include cho xác thực**

Các sơ đồ quản lý đều có:

| **Use case nguồn** | **Include** | **Use case đích** |
| --- | --- | --- |
| QL Mượn Trả | include | Đăng Nhập |
| Quản Lý Thẻ TV | include | Đăng Nhập |
| QL Báo Cáo Thống Kê | include | Đăng Nhập |
| QL Người dùng | include | Đăng Nhập |
| QL SÁCH | include | Đăng Nhập |

Điều này thể hiện rằng người dùng phải đăng nhập trước khi thao tác với phân hệ quản lý.

**Nhóm 2: Include cho các bước bắt buộc trong quy trình**

Ví dụ trong sơ đồ **Lập Phiếu Mượn**, use case chính include các bước:

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

Các bước này là thành phần bắt buộc của quy trình lập phiếu mượn. Nếu bỏ một trong các bước này, nghiệp vụ có thể không hoàn chỉnh.

**4.2. Quy tắc tổng quát khi dùng Include**

| **Quy tắc** | **Diễn giải** |
| --- | --- |
| Dùng include cho bước bắt buộc | Nếu use case chính luôn cần bước đó thì dùng include |
| Dùng include cho chức năng dùng chung | Nếu nhiều use case cùng cần Đăng Nhập, Kiểm Tra Quyền, Xác Thực, có thể tách ra dùng include |
| Dùng include cho bước trong quy trình chính | Các bước kiểm tra, nhập dữ liệu, lưu dữ liệu, cập nhật dữ liệu thường là include |
| Không dùng include cho lựa chọn tùy ý | Nếu người dùng có thể chọn hoặc không chọn, nên dùng extend |

**5. Phân tích trọng tâm quan hệ Extend**

**5.1. Ý nghĩa của Extend**

Trong bộ sơ đồ mẫu, extend được dùng khi một use case chỉ xảy ra trong một số trường hợp nhất định hoặc khi người dùng chọn một nhánh nghiệp vụ cụ thể.

Có hai nhóm extend chính.

**Nhóm 1: Extend cho chức năng con của phân hệ quản lý**

Ví dụ trong sơ đồ **QL Người Dùng**:

| **Use case mở rộng** | **Extend** | **Use case gốc** |
| --- | --- | --- |
| Thêm Người Dùng | extend | QL Người dùng |
| Cập Nhật Người Dùng | extend | QL Người dùng |
| Xóa Người Dùng | extend | QL Người dùng |
| Tra Cứu Người Dùng | extend | QL Người dùng |

Các chức năng thêm, cập nhật, xóa, tra cứu không phải lúc nào cũng xảy ra cùng lúc. Người dùng chọn thao tác nào thì thao tác đó mới được thực hiện, nên chúng được biểu diễn bằng extend.

**Nhóm 2: Extend cho ngoại lệ hoặc phát sinh**

Ví dụ:

| **Sơ đồ** | **Use case mở rộng** | **Extend** | **Use case gốc** |
| --- | --- | --- | --- |
| Lập Phiếu Mượn | Từ Chối Mượn | extend | Lập Phiếu Mượn |
| Lập Phiếu Trả | Lập Phiếu Phạt | extend | Lập Phiếu Trả |

Các use case này không luôn xảy ra. Chúng chỉ phát sinh khi điều kiện nghiệp vụ không bình thường.

**5.2. Quy tắc tổng quát khi dùng Extend**

| **Quy tắc** | **Diễn giải** |
| --- | --- |
| Dùng extend cho chức năng phát sinh | Nếu hành vi chỉ xảy ra trong một số trường hợp thì dùng extend |
| Dùng extend cho lựa chọn nghiệp vụ | Các thao tác như thêm, sửa, xóa, tra cứu có thể xem là nhánh mở rộng của chức năng quản lý |
| Dùng extend cho ngoại lệ | Từ chối, hủy, phạt, lỗi, vi phạm, hoàn tiền, khiếu nại thường phù hợp với extend |
| Không dùng extend cho bước bắt buộc | Nếu bước nào cũng phải thực hiện thì dùng include |

**6. Đề cương tổng quát để áp dụng cho các đề tài khác**

Từ hệ thống Quản Lý Thư Viện, có thể xây dựng một đề cương chung gồm 9 nhóm sơ đồ. Người học có thể thay tên nghiệp vụ thư viện bằng nghiệp vụ của đề tài mới.

**6.1. Sơ đồ 1: Use Case tổng quan cấp 0**

Mục đích:

Mô tả actor chính và nhóm chức năng lớn của toàn hệ thống.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Boundary | Tên hệ thống cần phân tích |
| Actor | Các nhóm người dùng hoặc hệ thống ngoài |
| Use case | Các phân hệ/chức năng cấp cao |
| Quan hệ | Association |
| Include/Extend | Không cần hoặc hạn chế tối đa |

Ví dụ mẫu:

| **Loại hệ thống** | **Actor có thể có** | **Use case cấp cao có thể có** |
| --- | --- | --- |
| Bán hàng | Khách hàng, Nhân viên, Admin, Cổng thanh toán | Quản lý sản phẩm, đặt hàng, thanh toán, báo cáo |
| Bệnh viện | Bệnh nhân, Bác sĩ, Lễ tân, Kế toán | Quản lý bệnh nhân, khám bệnh, đơn thuốc, viện phí |
| Khách sạn | Khách hàng, Lễ tân, Quản lý, Kế toán | Đặt phòng, nhận phòng, trả phòng, thanh toán |
| Trường học | Sinh viên, Giảng viên, Giáo vụ, Admin | Quản lý sinh viên, môn học, đăng ký học phần, điểm |
| Kho hàng | Nhân viên kho, Quản lý, Nhà cung cấp | Nhập kho, xuất kho, kiểm kê, báo cáo |

**6.2. Sơ đồ 2: Quản lý đối tượng nghiệp vụ chính**

Trong hệ thống thư viện, sơ đồ tương ứng là **QL Sách**. Với đề tài khác, đối tượng nghiệp vụ chính có thể là sản phẩm, khóa học, phòng, bệnh án, hồ sơ, đơn hàng, hàng hóa.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Use case trung tâm | Quản lý [đối tượng chính] |
| Actor | Người phụ trách quản lý đối tượng đó |
| Include | Đăng Nhập / Xác Thực |
| Extend | Thêm, cập nhật, xóa, tra cứu, phân loại, cập nhật trạng thái |

Ví dụ:

| **Đề tài** | **Use case trung tâm** |
| --- | --- |
| Bán hàng | Quản lý sản phẩm |
| Khách sạn | Quản lý phòng |
| Bệnh viện | Quản lý hồ sơ bệnh án |
| Kho hàng | Quản lý hàng hóa |
| LMS | Quản lý khóa học |

**6.3. Sơ đồ 3: Quản lý người dùng**

Trong hệ thống thư viện, sơ đồ tương ứng là **QL Người Dùng**.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Use case trung tâm | Quản lý người dùng |
| Actor | Admin / Nhân viên quản trị |
| Include | Đăng Nhập |
| Extend | Thêm người dùng, cập nhật người dùng, xóa/khóa người dùng, tra cứu người dùng, phân quyền |

Sơ đồ này hầu như đề tài nào cũng có thể sử dụng, vì phần lớn hệ thống thông tin đều có quản lý tài khoản, vai trò và quyền hạn.

**6.4. Sơ đồ 4: Quản lý hồ sơ, thẻ, tài khoản hoặc tư cách sử dụng**

Trong hệ thống thư viện, sơ đồ tương ứng là **Quản Lý Thẻ TV**.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Use case trung tâm | Quản lý hồ sơ / thẻ / tài khoản / tư cách sử dụng |
| Actor | Người dùng chính, nhân viên xử lý |
| Include | Đăng Nhập |
| Extend | Cấp mới, gia hạn, kiểm tra hiệu lực, ghi nhận phí, cập nhật trạng thái |

Ví dụ ứng dụng:

| **Đề tài** | **Use case tương ứng** |
| --- | --- |
| Thư viện | Quản lý thẻ thư viện |
| Bệnh viện | Quản lý hồ sơ bệnh nhân |
| Khách sạn | Quản lý thông tin khách hàng |
| Trường học | Quản lý hồ sơ sinh viên |
| LMS | Quản lý tài khoản và hồ sơ học viên/giảng viên |

**6.5. Sơ đồ 5: Quản lý giao dịch hoặc nghiệp vụ sử dụng dịch vụ**

Trong hệ thống thư viện, sơ đồ tương ứng là **QL Mượn Trả**.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Use case trung tâm | Quản lý giao dịch / sử dụng dịch vụ |
| Actor | Người dùng chính, nhân viên xử lý |
| Include | Đăng Nhập |
| Extend | Tạo giao dịch, hoàn tất giao dịch, hủy giao dịch, xử lý phát sinh |

Ví dụ:

| **Đề tài** | **Use case tương ứng** |
| --- | --- |
| Thư viện | QL Mượn Trả |
| Bán hàng | Quản lý đơn hàng |
| Khách sạn | Quản lý đặt/trả phòng |
| Bệnh viện | Quản lý khám bệnh |
| Kho hàng | Quản lý nhập/xuất kho |
| LMS | Quản lý học tập hoặc ghi danh khóa học |

**6.6. Sơ đồ 6: Quy trình tạo giao dịch ban đầu**

Trong hệ thống thư viện, sơ đồ tương ứng là **Lập Phiếu Mượn**.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Use case chính | Tạo phiếu / tạo đơn / đăng ký / đặt lịch |
| Actor | Người yêu cầu, nhân viên xử lý |
| Include | Kiểm tra thông tin người dùng, kiểm tra đối tượng, nhập thông tin, lưu chi tiết, cập nhật trạng thái |
| Extend | Từ chối, hủy, không đủ điều kiện |

Ví dụ:

| **Đề tài** | **Use case tương ứng** |
| --- | --- |
| Thư viện | Lập Phiếu Mượn |
| Bán hàng | Tạo đơn hàng |
| Khách sạn | Đặt phòng |
| Bệnh viện | Đăng ký khám |
| Kho hàng | Lập phiếu nhập/xuất |
| LMS | Mua khóa học hoặc ghi danh khóa học |

**6.7. Sơ đồ 7: Quy trình hoàn tất giao dịch**

Trong hệ thống thư viện, sơ đồ tương ứng là **Lập Phiếu Trả**.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Use case chính | Hoàn tất giao dịch / trả hàng / kết thúc dịch vụ |
| Actor | Người dùng, nhân viên xử lý |
| Include | Tìm giao dịch cũ, kiểm tra thông tin, kiểm tra thời hạn, cập nhật kết quả, hoàn tất |
| Extend | Xử lý phạt, khiếu nại, lỗi, bồi thường, hoàn tiền |

Ví dụ:

| **Đề tài** | **Use case tương ứng** |
| --- | --- |
| Thư viện | Lập Phiếu Trả |
| Bán hàng | Giao hàng / hoàn tất đơn hàng |
| Khách sạn | Trả phòng |
| Bệnh viện | Hoàn tất khám / xuất viện |
| Kho hàng | Hoàn tất xuất kho |
| LMS | Hoàn thành khóa học / cấp chứng chỉ |

**6.8. Sơ đồ 8: Quy trình xử lý phát sinh hoặc vi phạm**

Trong hệ thống thư viện, sơ đồ tương ứng là **Lập Phiếu Phạt**.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Use case chính | Xử lý vi phạm / xử lý phát sinh / xử lý khiếu nại |
| Actor | Người dùng liên quan, nhân viên xử lý |
| Include | Xác định đối tượng, xác định lý do, tính mức xử lý, lưu chi tiết, thông báo kết quả |
| Extend | Có thể không cần trong sơ đồ chi tiết; quan hệ extend thường nằm ở sơ đồ cha |

Ví dụ:

| **Đề tài** | **Use case tương ứng** |
| --- | --- |
| Thư viện | Lập Phiếu Phạt |
| Bán hàng | Xử lý đổi trả / khiếu nại |
| Khách sạn | Xử lý bồi thường hư hỏng |
| Bệnh viện | Xử lý phát sinh viện phí |
| Kho hàng | Xử lý thất thoát hàng hóa |
| LMS | Xử lý vi phạm / hoàn tiền / khiếu nại |

**6.9. Sơ đồ 9: Báo cáo và thống kê**

Trong hệ thống thư viện, sơ đồ tương ứng là **QL Báo Cáo Thống Kê**.

Cấu trúc đề xuất:

| **Thành phần** | **Nội dung** |
| --- | --- |
| Use case trung tâm | Báo cáo và thống kê |
| Actor | Quản lý / Admin / Nhân viên phụ trách |
| Include | Đăng Nhập |
| Extend | Các loại báo cáo cụ thể |

Ví dụ:

| **Đề tài** | **Các báo cáo có thể có** |
| --- | --- |
| Bán hàng | Doanh thu, đơn hàng, sản phẩm bán chạy, tồn kho |
| Khách sạn | Doanh thu phòng, tỷ lệ đặt phòng, khách lưu trú |
| Bệnh viện | Số lượt khám, doanh thu viện phí, thuốc sử dụng |
| Kho hàng | Nhập kho, xuất kho, tồn kho, hàng lỗi |
| LMS | Doanh thu, học viên, khóa học, giao dịch, hoàn thành khóa học |

**7. Mẫu khung Use Case tổng quát có thể tái sử dụng**

Khi nhận một đề tài mới, có thể áp dụng khung sau:

**7.1. Bước 1: Xác định sơ đồ tổng quan cấp 0**

Câu hỏi cần trả lời:

| **Câu hỏi** | **Mục đích** |
| --- | --- |
| Ai sử dụng hệ thống? | Xác định actor |
| Hệ thống có những nhóm chức năng lớn nào? | Xác định use case cấp cao |
| Actor nào tương tác với chức năng nào? | Xác định association |
| Có cần include/extend ở cấp 0 không? | Thường là không |

**7.2. Bước 2: Xác định các phân hệ quản lý**

Mẫu đặt tên:

Quản lý + [đối tượng/phân hệ]

Ví dụ:

| **Đối tượng** | **Use case quản lý** |
| --- | --- |
| Người dùng | Quản lý người dùng |
| Sản phẩm | Quản lý sản phẩm |
| Khóa học | Quản lý khóa học |
| Phòng | Quản lý phòng |
| Bệnh nhân | Quản lý bệnh nhân |
| Hàng hóa | Quản lý hàng hóa |

Mẫu quan hệ:

| **Quan hệ** | **Cách dùng** |
| --- | --- |
| Include | Quản lý [đối tượng] include Đăng Nhập |
| Extend | Thêm, sửa, xóa, tra cứu, cập nhật trạng thái extend Quản lý [đối tượng] |

**7.3. Bước 3: Xác định các quy trình nghiệp vụ chính**

Mẫu đặt tên:

Lập phiếu / Tạo đơn / Đăng ký / Thanh toán / Hoàn tất / Xử lý

Ví dụ:

| **Loại quy trình** | **Ví dụ** |
| --- | --- |
| Tạo giao dịch | Lập phiếu mượn, tạo đơn hàng, đặt phòng |
| Hoàn tất giao dịch | Lập phiếu trả, giao hàng, trả phòng |
| Xử lý phát sinh | Lập phiếu phạt, hoàn tiền, xử lý khiếu nại |
| Báo cáo | Lập báo cáo, thống kê doanh thu |

Mẫu quan hệ:

| **Quan hệ** | **Cách dùng** |
| --- | --- |
| Include | Các bước bắt buộc trong quy trình |
| Extend | Các tình huống ngoại lệ hoặc phát sinh |

**8. Bộ quy tắc dùng Include và Extend cho mọi đề tài**

**8.1. Khi nào dùng Include?**

Dùng include khi:

| **Trường hợp** | **Ví dụ** |
| --- | --- |
| Bước bắt buộc trong quy trình | Kiểm tra thông tin, nhập dữ liệu, lưu dữ liệu |
| Chức năng dùng chung | Đăng nhập, xác thực, kiểm tra quyền |
| Bước luôn xảy ra khi use case chính chạy | Tạo đơn hàng luôn phải lưu chi tiết đơn hàng |
| Một use case cần tái sử dụng ở nhiều nơi | Kiểm tra tài khoản, kiểm tra tồn kho |

Mẫu câu kiểm tra:

Nếu không thực hiện bước này thì use case chính có hoàn thành được không?

Nếu câu trả lời là **không**, có thể dùng include.

**8.2. Khi nào dùng Extend?**

Dùng extend khi:

| **Trường hợp** | **Ví dụ** |
| --- | --- |
| Tình huống phát sinh | Từ chối, phạt, lỗi, hủy |
| Người dùng chọn một nhánh chức năng | Thêm, sửa, xóa, tra cứu |
| Điều kiện đặc biệt mới xảy ra | Thanh toán thất bại, quá hạn, vi phạm |
| Use case chính vẫn có thể hoàn thành mà không cần use case mở rộng | Không phải lần trả sách nào cũng có phiếu phạt |

Mẫu câu kiểm tra:

Use case này có phải lúc nào cũng xảy ra không?

Nếu câu trả lời là **không**, có thể dùng extend.

**9. Mẫu bảng phân tích dùng cho mọi sơ đồ Use Case**

Khi phân tích một sơ đồ Use Case, có thể dùng biểu mẫu sau:

| **Mục** | **Nội dung cần ghi** |
| --- | --- |
| Tên sơ đồ | Tên Use Case Diagram |
| Boundary | Tên hệ thống hoặc phân hệ |
| Actor | Các tác nhân tham gia |
| Use case trung tâm | Use case chính của sơ đồ |
| Use case phụ | Các chức năng con hoặc bước xử lý |
| Association | Actor nào liên kết với use case nào |
| Include | Use case chính bắt buộc gọi use case nào |
| Extend | Use case nào phát sinh từ use case gốc |
| Nhận xét | Đánh giá logic sơ đồ |

Mẫu bảng include:

| **Use case nguồn** | **Quan hệ** | **Use case đích** | **Lý do** |
| --- | --- | --- | --- |
| Use case chính | include | Bước bắt buộc | Vì bước này luôn xảy ra |

Mẫu bảng extend:

| **Use case mở rộng** | **Quan hệ** | **Use case gốc** | **Điều kiện phát sinh** |
| --- | --- | --- | --- |
| Use case phụ | extend | Use case chính | Chỉ xảy ra khi có điều kiện cụ thể |

**10. Ví dụ cách ứng dụng đề cương cho nhiều đề tài**

**10.1. Đề tài quản lý bán hàng**

| **Mẫu thư viện** | **Chuyển thành** |
| --- | --- |
| QL Sách | Quản lý sản phẩm |
| QL Người Dùng | Quản lý khách hàng/nhân viên |
| QL Mượn Trả | Quản lý đơn hàng |
| Lập Phiếu Mượn | Tạo đơn hàng |
| Lập Phiếu Trả | Giao hàng/hoàn tất đơn |
| Lập Phiếu Phạt | Xử lý đổi trả/khiếu nại |
| QL Báo Cáo Thống Kê | Báo cáo doanh thu |

**10.2. Đề tài quản lý khách sạn**

| **Mẫu thư viện** | **Chuyển thành** |
| --- | --- |
| QL Sách | Quản lý phòng |
| Quản Lý Thẻ TV | Quản lý hồ sơ khách hàng |
| QL Mượn Trả | Quản lý đặt/trả phòng |
| Lập Phiếu Mượn | Đặt phòng |
| Lập Phiếu Trả | Trả phòng |
| Lập Phiếu Phạt | Xử lý bồi thường/hư hỏng |
| QL Báo Cáo Thống Kê | Báo cáo doanh thu phòng |

**10.3. Đề tài quản lý bệnh viện**

| **Mẫu thư viện** | **Chuyển thành** |
| --- | --- |
| QL Người Dùng | Quản lý người dùng bệnh viện |
| Quản Lý Thẻ TV | Quản lý hồ sơ bệnh nhân |
| QL Mượn Trả | Quản lý khám bệnh |
| Lập Phiếu Mượn | Đăng ký khám |
| Lập Phiếu Trả | Hoàn tất khám/xuất viện |
| Lập Phiếu Phạt | Xử lý phát sinh viện phí |
| QL Báo Cáo Thống Kê | Báo cáo khám chữa bệnh |

**10.4. Đề tài hệ thống LMS**

| **Mẫu thư viện** | **Chuyển thành** |
| --- | --- |
| QL Sách | Quản lý khóa học |
| Quản Lý Thẻ TV | Quản lý tài khoản/hồ sơ học viên |
| QL Mượn Trả | Quản lý học tập/ghi danh |
| Lập Phiếu Mượn | Mua khóa học/tạo đơn hàng |
| Lập Phiếu Trả | Hoàn thành khóa học |
| Lập Phiếu Phạt | Xử lý vi phạm/hoàn tiền/khiếu nại |
| QL Báo Cáo Thống Kê | Báo cáo học tập/doanh thu |

**11. Kết luận**

Bộ sơ đồ mẫu của hệ thống **Quản Lý Thư Viện** không chỉ có giá trị cho riêng nghiệp vụ thư viện, mà còn có thể dùng như một **đề cương phương pháp luận** để xây dựng Use Case Diagram cho nhiều hệ thống thông tin khác.

Từ bộ sơ đồ này, có thể rút ra 5 nguyên tắc quan trọng:

1. **Sơ đồ tổng quan cấp 0** chỉ nên thể hiện actor và nhóm chức năng lớn.
2. **Các sơ đồ quản lý tổng quát** nên có một use case trung tâm, include Đăng Nhập hoặc Xác Thực, và dùng extend cho các chức năng con.
3. **Các sơ đồ nghiệp vụ chi tiết** nên dùng include cho các bước bắt buộc trong quy trình.
4. **Các tình huống phát sinh, ngoại lệ hoặc lựa chọn có điều kiện** nên dùng extend.
5. **Một quy trình phát sinh khi được tách thành sơ đồ chi tiết** có thể chỉ bao gồm các quan hệ include, vì các bước bên trong nó đều là bắt buộc sau khi quy trình đã được kích hoạt.

Có thể xem hệ thống Quản Lý Thư Viện là một mẫu nền tảng:

Tổng quan hệ thống → Phân hệ quản lý → Quy trình nghiệp vụ chính → Quy trình hoàn tất → Quy trình xử lý phát sinh → Báo cáo thống kê.

Khi gặp một đề tài mới, người phân tích chỉ cần thay đổi actor, đối tượng nghiệp vụ và tên quy trình cho phù hợp, đồng thời vẫn giữ nguyên nguyên tắc dùng include và extend. Đây là cách giúp sơ đồ Use Case vừa đúng logic, vừa dễ trình bày, dễ bảo vệ và dễ mở rộng cho các hệ thống khác.