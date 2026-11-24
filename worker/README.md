# Đồng bộ tiến trình trên GitHub Pages

1. Tạo fine-grained GitHub token cho riêng kho `HuyBao2206/HUBupgrade`, với quyền **Contents → Read and write**. Tài khoản cấp token phải có quyền ghi nhánh đã cấu hình.
2. Trong thư mục `worker/`, chạy `npx wrangler deploy`, rồi `npx wrangler secret put GITHUB_TOKEN` và nhập token ở lời nhắc. Tên repo, nhánh và origin của Pages đã có trong `wrangler.toml`.
3. Điền URL HTTPS của Worker vào thuộc tính `content` của thẻ meta `progress-endpoint` trong `index.html`, chạy `python scripts/build_offline.py` rồi đẩy hai tệp HTML lên `main`. Mở website trên GitHub Pages để dùng đồng bộ.

Worker chỉ đọc và ghi các tệp `data/progress/<hash-danh-xung>.json`. Các lần ghi dùng SHA của tệp để phát hiện xung đột. Tên truy cập là cách duy nhất để mở tiến trình. Ai biết tên đều có thể xem và sửa tiến độ qua website. Người có quyền đọc kho có thể đọc cả danh xưng, quan hệ và tiến độ đã ghi trong Git.

Khi chưa cấu hình Worker, mỗi trình duyệt lưu các danh xưng riêng. Khi mất mạng, các thay đổi lưu trên máy và được thử đồng bộ lại khi có mạng, mở lại trang hoặc quay lại cửa sổ. Một tên mới bị trùng khi nối mạng lại sẽ được yêu cầu đổi tên, giữ lại phần đã học. Bản HTML mở từ tệp dùng bộ nhớ cục bộ.
