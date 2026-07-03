---
trigger: always_on
glob: "**/*"
description: Rules for drawing diagrams and using skills in the project
---

# Rules / Quy Tắc Vẽ Sơ Đồ

## 1. Must Read Skills Before Drawing / Phải Đọc Các Skill Trước Khi Vẽ
- **Tiếng Việt:** Trước khi vẽ hoặc tạo bất kỳ sơ đồ nào (Class Diagram, Use Case, Sequence Diagram, Flowchart, v.v.), AI Agent bắt buộc phải tìm kiếm và đọc tài liệu của các skill liên quan trong thư mục `.agents/skills/` hoặc `.agents/` (ví dụ: `mermaid-classdiagram`, `diagram-cobol-with-mermaid`) để hiểu rõ chuẩn định dạng và cú pháp trước khi vẽ. Không được tự ý vẽ khi chưa đọc skill.
- **English:** Before drawing or generating any diagram (Class Diagram, Use Case, Sequence Diagram, Flowchart, etc.), the AI Agent must search for and read the documentation of relevant skills in the `.agents/skills/` or `.agents/` directory (e.g., `mermaid-classdiagram`, `diagram-cobol-with-mermaid`) to understand the format standards and syntax. Do not draw diagrams without reading the corresponding skills first.

## 2. Follow Mermaid Syntax strictly / Tuân thủ nghiêm ngặt cú pháp Mermaid
- **Tiếng Việt:** Luôn sử dụng cú pháp Mermaid chuẩn, tương thích tốt với StarUML để đảm bảo sơ đồ được sinh ra chính xác không bị lỗi.
- **English:** Always use standard Mermaid syntax that is highly compatible with StarUML to ensure the generated diagrams are correct and error-free.

## 3. Auto-Copy to StarUML Extensions Folder / Tự Động Copy Vào Thư Mục Extension
- **Tiếng Việt:** Bất cứ khi nào có thay đổi code của extension (main.js, các parser, file giao diện...), AI Agent phải tự động copy đè file vừa sửa vào thư mục cài đặt extension trên máy (`%APPDATA%\StarUML\extensions\user\staruml-plantuml-importer`) bằng lệnh `Copy-Item`. KHÔNG chạy `install.bat` vì nó sẽ tắt StarUML. Làm vậy để người dùng chỉ cần nhấn `Ctrl + R` (Debug > Reload) là có thể sử dụng ngay.
- **English:** Whenever there is a change in the extension's code (main.js, parsers, UI files, etc.), the AI Agent must automatically copy the modified files to the local StarUML extensions folder (`%APPDATA%\StarUML\extensions\user\staruml-plantuml-importer`) using the `Copy-Item` command. DO NOT run `install.bat` as it closes StarUML. This ensures the user only needs to press `Ctrl + R` (Debug > Reload) to use the updated extension.

## 4. Commit and Push Frequently / Commit Và Push Thường Xuyên
- **Tiếng Việt:** Code xong phần nào (hoàn thiện một tính năng, sửa xong một lỗi, hoặc làm xong một task nhỏ), AI Agent phải chủ động thực hiện lệnh `git commit` và `git push` ngay lập tức phần đó lên GitHub trước khi chuyển sang phần khác. Không đợi đến khi hoàn thành toàn bộ mới push.
- **English:** After finishing any piece of work (a feature, a bugfix, or a small task), the AI Agent must proactively `git commit` and `git push` that specific part to GitHub immediately before moving on. Do not wait until all tasks are completed to push.
