Đây là **Toolbox của Activity Diagram trong StarUML**. Các thành phần này dùng để vẽ luồng hoạt động của hệ thống, ví dụ như **quản lý thư viện**, **mượn sách**, **trả sách**, **đăng nhập**, **thanh toán phạt**, v.v.

## 1. Activities Basic

### **Action**

Là một hành động hoặc bước xử lý trong quy trình.

Ví dụ trong quản lý thư viện:

```text
Đăng nhập hệ thống
Tìm kiếm sách
Tạo phiếu mượn
Cập nhật trạng thái sách
```

Trong sơ đồ, Action thường là hình chữ nhật bo góc.

---

### **Initial**

Là điểm bắt đầu của activity diagram.

Ví dụ:

```text
Bắt đầu quy trình mượn sách
```

Ký hiệu là hình tròn đen.

---

### **Final**

Là điểm kết thúc toàn bộ quy trình.

Ví dụ:

```text
Kết thúc phiên mượn sách
```

Ký hiệu là hình tròn có viền ngoài và chấm đen bên trong.

---

### **Fork**

Dùng để tách một luồng thành nhiều luồng chạy song song.

Ví dụ:

```text
Sau khi tạo phiếu mượn:
- Cập nhật số lượng sách
- Gửi thông báo cho độc giả
- Lưu lịch sử giao dịch
```

Các bước này có thể xảy ra song song.

---

### **Join**

Dùng để gộp nhiều luồng song song lại thành một luồng.

Ví dụ:

```text
Sau khi cập nhật sách, gửi thông báo, lưu lịch sử xong
=> Hoàn tất mượn sách
```

Fork là tách luồng, Join là nhập luồng song song.

---

### **Merge**

Dùng để nhập nhiều nhánh lựa chọn lại thành một luồng chung.

Ví dụ:

```text
Nếu trả sách đúng hạn
Nếu trả sách trễ hạn
=> đều quay về bước cập nhật phiếu trả
```

Merge thường đi sau Decision.

---

### **Decision**

Dùng để rẽ nhánh theo điều kiện.

Ví dụ:

```text
Sách còn không?
Tài khoản có bị khóa không?
Trả sách có quá hạn không?
```

Ký hiệu là hình thoi.

Các nhánh thường có điều kiện guard:

```text
[Có]
[Không]
[Sách còn]
[Sách hết]
```

---

### **Control Flow**

Là mũi tên nối các bước xử lý với nhau.

Ví dụ:

```text
Đăng nhập -> Kiểm tra tài khoản -> Hiển thị trang chính
```

Đây là thành phần dùng nhiều nhất khi vẽ activity diagram.

---

## 2. Activities Advanced

### **Swimlane Vertical**

Dùng để chia sơ đồ thành các cột dọc theo vai trò hoặc bộ phận.

Ví dụ trong quản lý thư viện:

```text
Độc giả | Hệ thống | Thủ thư
```

Đây là kiểu giống hình bạn gửi lúc trước.

---

### **Swimlane Horizontal**

Tương tự Swimlane Vertical nhưng chia theo hàng ngang.

Ví dụ:

```text
Độc giả
Hệ thống
Thủ thư
```

Thường dùng khi muốn sơ đồ trải ngang.

---

### **Interruptible Activity Region**

Là vùng hoạt động có thể bị ngắt giữa chừng.

Ví dụ:

```text
Trong lúc độc giả đang thanh toán tiền phạt,
nếu hủy giao dịch hoặc lỗi thanh toán
=> quy trình bị ngắt.
```

Dùng khi có tình huống hủy, lỗi, hoặc thoát giữa chừng.

---

### **Structured Activity**

Là một nhóm hoạt động con được đóng gói lại.

Ví dụ:

```text
Quy trình kiểm tra điều kiện mượn sách
```

Bên trong có thể gồm:

```text
Kiểm tra tài khoản
Kiểm tra số sách đang mượn
Kiểm tra phí phạt chưa thanh toán
```

Nó giúp sơ đồ gọn hơn.

---

### **Input Pin**

Là dữ liệu đầu vào của một Action.

Ví dụ action `Kiểm tra sách` có input:

```text
Mã sách
```

---

### **Output Pin**

Là dữ liệu đầu ra của một Action.

Ví dụ action `Tạo phiếu mượn` có output:

```text
Phiếu mượn
```

---

### **Send Signal**

Dùng để gửi tín hiệu/thông báo cho một đối tượng khác.

Ví dụ:

```text
Gửi thông báo sách đã có sẵn cho độc giả
Gửi email nhắc trả sách
```

---

### **Accept Signal**

Dùng để nhận tín hiệu/thông báo.

Ví dụ:

```text
Hệ thống nhận yêu cầu mượn sách
Độc giả nhận thông báo quá hạn
```

---

### **Accept Time Event**

Dùng để biểu diễn sự kiện xảy ra theo thời gian.

Ví dụ:

```text
Đến ngày hẹn trả sách
Sau 7 ngày đặt trước mà không đến lấy
Sau 3 ngày quá hạn
```

Dùng rất hợp cho hệ thống thư viện vì có hạn trả sách.

---

### **Flow Final**

Là điểm kết thúc của một nhánh luồng, nhưng không kết thúc toàn bộ activity diagram.

Ví dụ:

```text
Nếu đăng nhập thất bại 3 lần
=> kết thúc nhánh đăng nhập
```

Khác với **Final**, vì Final kết thúc toàn bộ sơ đồ.

---

### **Object Node**

Biểu diễn một đối tượng/dữ liệu được tạo ra hoặc truyền đi trong quy trình.

Ví dụ:

```text
Sách
Phiếu mượn
Phiếu trả
Biên lai phạt
Thông báo
```

Trong hình bạn gửi lúc trước, `Ticket` và `Change` là Object Node.

---

### **Central Buffer**

Là nơi lưu tạm các object trong luồng hoạt động.

Ví dụ:

```text
Danh sách sách chờ xử lý
Danh sách yêu cầu mượn sách
Danh sách phiếu đặt trước
```

Nó giống như một vùng đệm trung gian.

---

### **Datastore**

Là nơi lưu trữ dữ liệu lâu dài.

Ví dụ:

```text
Cơ sở dữ liệu sách
Cơ sở dữ liệu độc giả
Cơ sở dữ liệu phiếu mượn
Cơ sở dữ liệu tiền phạt
```

Khác với Central Buffer, Datastore mang ý nghĩa lưu trữ bền vững.

---

### **Activity Parameter Node**

Biểu diễn dữ liệu đầu vào hoặc đầu ra của toàn bộ activity.

Ví dụ activity `Mượn sách` có:

Input:

```text
Thông tin độc giả
Mã sách
```

Output:

```text
Phiếu mượn
Trạng thái mượn sách
```

---

### **Expansion Region**

Dùng khi một hoạt động được lặp lại trên nhiều phần tử trong một danh sách.

Ví dụ:

```text
Kiểm tra từng cuốn sách trong danh sách mượn
Tính tiền phạt cho từng sách quá hạn
```

Nếu độc giả mượn nhiều sách cùng lúc, Expansion Region có thể dùng để xử lý từng sách.

---

### **Input Expansion Node**

Là đầu vào của Expansion Region.

Ví dụ:

```text
Danh sách sách cần mượn
```

---

### **Output Expansion Node**

Là đầu ra của Expansion Region.

Ví dụ:

```text
Danh sách phiếu mượn đã tạo
Danh sách sách hợp lệ để mượn
```

---

### **Frame**

Dùng để bao quanh hoặc đặt tên cho toàn bộ sơ đồ.

Ví dụ:

```text
Activity Diagram - Quy trình mượn sách
```

Frame giúp sơ đồ nhìn chuyên nghiệp hơn.

---

### **Object Flow**

Là mũi tên biểu diễn luồng dữ liệu hoặc đối tượng.

Khác với Control Flow.

Ví dụ:

```text
Tạo phiếu mượn -> Phiếu mượn -> Lưu phiếu mượn
```

Control Flow là luồng điều khiển.
Object Flow là luồng dữ liệu.

---

### **Exception Handler**

Dùng để xử lý ngoại lệ/lỗi.

Ví dụ:

```text
Lỗi kết nối cơ sở dữ liệu
Lỗi thanh toán tiền phạt
Không tìm thấy mã sách
```

---

### **Activity Interrupt**

Dùng để ngắt một vùng hoạt động.

Ví dụ:

```text
Độc giả hủy yêu cầu mượn
Hệ thống phát hiện tài khoản bị khóa
Thanh toán thất bại
```

---

### **Activity Edge Connector**

Dùng để nối luồng khi sơ đồ quá dài hoặc bị chia sang khu vực khác.

Ví dụ:

```text
Từ cuối trang 1 nối sang đầu trang 2
```

Nó giúp sơ đồ đỡ bị nhiều mũi tên kéo dài.

---

## 3. Annotations

### **Text**

Dùng để thêm chữ chú thích đơn giản.

Ví dụ:

```text
Luồng chính
Luồng thay thế
Điều kiện kiểm tra
```

---

### **Text Box**

Dùng để thêm một hộp chữ lớn hơn Text.

Ví dụ ghi chú:

```text
Quy trình này áp dụng cho độc giả đã có tài khoản hợp lệ.
```

---

### **Free Line**

Dùng để vẽ đường tự do, thường để chú thích hoặc phân vùng.

---

### **Note**

Dùng để ghi chú trong sơ đồ.

Ví dụ:

```text
Mỗi độc giả chỉ được mượn tối đa 5 cuốn sách.
```

---

### **Note Link**

Dùng để nối Note với thành phần liên quan.

Ví dụ nối ghi chú trên với action:

```text
Kiểm tra điều kiện mượn
```

---

### **Hyperlink**

Dùng để chèn liên kết đến tài liệu, file, hoặc trang web liên quan.

Ít dùng trong bài UML cơ bản.

---

### **Rectangle**

Vẽ hình chữ nhật thường, dùng để trang trí hoặc nhóm nội dung.

---

### **Rounded Rectangle**

Vẽ hình chữ nhật bo góc. Có thể dùng để minh họa, nhưng trong activity diagram nên dùng **Action** thay vì Rounded Rectangle.

---

### **Ellipse**

Vẽ hình elip, thường dùng để chú thích hoặc trang trí. Không phải ký hiệu chính của activity diagram.

---

### **Image**

Dùng để chèn hình ảnh vào sơ đồ.

Ví dụ:

```text
Logo thư viện
Ảnh giao diện hệ thống
```

---

## Những thành phần bạn nên dùng cho bài quản lý thư viện

Để vẽ activity diagram giống mẫu chuyên nghiệp, bạn chỉ cần dùng các thành phần chính này:

| Thành phần        | Nên dùng để làm gì                    |
| ----------------- | ------------------------------------- |
| Initial           | Bắt đầu quy trình                     |
| Action            | Các bước xử lý                        |
| Control Flow      | Nối các bước                          |
| Decision          | Rẽ nhánh điều kiện                    |
| Merge             | Gộp nhánh                             |
| Swimlane Vertical | Chia cột Độc giả / Hệ thống / Thủ thư |
| Object Node       | Phiếu mượn, sách, biên lai, thông báo |
| Final             | Kết thúc quy trình                    |
| Note              | Ghi chú điều kiện nếu cần             |

Ví dụ với **quy trình mượn sách**, bạn nên chia swimlane như sau:

```text
Độc giả | Hệ thống | Thủ thư
```

Và dùng các điều kiện:

```text
[Đăng nhập hợp lệ]
[Sách còn]
[Đủ điều kiện mượn]
[Không đủ điều kiện]
```

Còn các thành phần nâng cao như **Expansion Region, Exception Handler, Activity Interrupt, Central Buffer** chỉ nên dùng nếu bài yêu cầu rất chi tiết.

Các thành phần **chính thường dùng nhất** trong **Activity Diagram** là những thành phần này:

| Thành phần       | Ký hiệu               | Dùng để làm gì                         |
| ---------------- | --------------------- | -------------------------------------- |
| **Initial**      | Chấm tròn đen         | Điểm bắt đầu quy trình                 |
| **Action**       | Hình chữ nhật bo góc  | Một hành động/bước xử lý               |
| **Control Flow** | Mũi tên               | Nối các bước lại với nhau              |
| **Decision**     | Hình thoi             | Rẽ nhánh theo điều kiện                |
| **Merge**        | Hình thoi             | Gộp các nhánh điều kiện lại            |
| **Fork**         | Thanh đen             | Tách thành nhiều luồng song song       |
| **Join**         | Thanh đen             | Gộp nhiều luồng song song lại          |
| **Swimlane**     | Cột hoặc hàng         | Chia trách nhiệm theo actor/bộ phận    |
| **Object Node**  | Hình chữ nhật         | Thể hiện dữ liệu/đối tượng được tạo ra |
| **Final**        | Vòng tròn có chấm đen | Kết thúc toàn bộ quy trình             |
| **Note**         | Ghi chú               | Ghi chú điều kiện hoặc giải thích thêm |

Ví dụ với **quản lý thư viện**, bạn thường dùng như sau:

### 1. Initial

Dùng để bắt đầu sơ đồ.

```text
Bắt đầu
```

Ví dụ:

```text
Độc giả bắt đầu sử dụng hệ thống
```

---

### 2. Action

Dùng cho các bước xử lý chính.

Ví dụ:

```text
Đăng nhập
Tìm kiếm sách
Chọn sách muốn mượn
Kiểm tra tài khoản
Tạo phiếu mượn
Cập nhật trạng thái sách
```

---

### 3. Control Flow

Dùng để nối các bước.

Ví dụ:

```text
Đăng nhập → Kiểm tra tài khoản → Hiển thị trang chính
```

---

### 4. Decision

Dùng khi có câu hỏi điều kiện.

Ví dụ:

```text
Đăng nhập hợp lệ?
Sách còn không?
Độc giả có bị khóa không?
Trả sách có quá hạn không?
```

Các nhánh đi ra thường ghi:

```text
[Có]
[Không]
[Hợp lệ]
[Không hợp lệ]
```

---

### 5. Merge

Dùng để gộp các nhánh sau Decision.

Ví dụ:

```text
Nếu trả đúng hạn → Cập nhật phiếu trả
Nếu trả quá hạn → Tính tiền phạt → Cập nhật phiếu trả
```

Hai nhánh này có thể gộp lại bằng **Merge**.

---

### 6. Swimlane

Dùng để chia trách nhiệm cho từng bên.

Với hệ thống thư viện, nên chia:

```text
Độc giả | Hệ thống | Thủ thư
```

Ví dụ:

```text
Độc giả: Chọn sách
Hệ thống: Kiểm tra sách
Thủ thư: Xác nhận mượn sách
```

Đây là thành phần rất quan trọng nếu muốn sơ đồ giống mẫu chuyên nghiệp.

---

### 7. Object Node

Dùng để biểu diễn dữ liệu được tạo ra trong quy trình.

Ví dụ:

```text
Phiếu mượn
Phiếu trả
Sách
Thông báo
Biên lai phạt
```

Ví dụ luồng:

```text
Tạo phiếu mượn → Phiếu mượn → Lưu phiếu mượn
```

---

### 8. Fork và Join

Dùng khi có nhiều việc xảy ra song song.

Ví dụ sau khi mượn sách thành công, hệ thống có thể làm song song:

```text
Cập nhật số lượng sách
Gửi thông báo cho độc giả
Lưu lịch sử mượn
```

Sau đó dùng **Join** để gộp lại trước khi kết thúc.

---

### 9. Final

Dùng để kết thúc toàn bộ sơ đồ.

Ví dụ:

```text
Kết thúc quy trình mượn sách
```

---

## Với bài của bạn, nên dùng những cái nào?

Nếu bạn mới vẽ Activity Diagram cho **quản lý thư viện**, chỉ cần dùng các thành phần này là đủ:

```text
Initial
Action
Control Flow
Decision
Merge
Swimlane Vertical
Object Node
Final
Note
```

Còn các thành phần như:

```text
Input Pin
Output Pin
Central Buffer
Datastore
Expansion Region
Exception Handler
Activity Interrupt
```

thường là nâng cao, chưa cần dùng nếu bài không yêu cầu quá chi tiết.

## Cấu trúc chuẩn nên vẽ

Ví dụ một sơ đồ mượn sách nên có:

```text
Initial
↓
Độc giả đăng nhập
↓
Hệ thống kiểm tra tài khoản
↓
Decision: Đăng nhập hợp lệ?
↓
Độc giả tìm kiếm sách
↓
Hệ thống kiểm tra sách còn không?
↓
Decision: Sách còn?
↓
Thủ thư xác nhận mượn
↓
Hệ thống tạo phiếu mượn
↓
Object Node: Phiếu mượn
↓
Độc giả nhận sách
↓
Final
```

Tóm lại, để vẽ giống hình mẫu bạn gửi, quan trọng nhất là dùng **Swimlane + Action + Decision + Merge + Control Flow + Initial + Final**.
