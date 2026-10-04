# JoyGames HR Portal - Hệ Thống Quản Lý & Lưu Trữ Hồ Sơ Nhân Sự

Hệ thống số hóa quản lý, lưu trữ và tra cứu hồ sơ nhân sự chuyên biệt dành cho **JoyGames Studio** ([https://joygames.vn/](https://joygames.vn/)).

---

## 🎮 Giới Thiệu
JoyGames HR Portal được thiết kế theo phong cách hiện đại (Gaming Studio UI), tối ưu hóa trải nghiệm người dùng với Dark/Light Mode, tốc độ tìm kiếm siêu tốc, và kho lưu trữ tài liệu số hóa đầy đủ.

### ✨ Các Tính Năng Nổi Bật

1. **Bảng Điều Khiển (HR Analytics Dashboard)**:
   - Thống kê thời gian thực: Tổng nhân sự, tỷ lệ nhân viên chính thức, thử việc, thực tập sinh.
   - Chỉ số tuân thủ hồ sơ (% nhân sự đã nộp đủ 100% giấy tờ).
   - Biểu đồ phân bổ nhân sự theo các phòng ban (Game Dev, Game Design, 2D/3D Art, LiveOps, Marketing...).
   - Cảnh báo tự động: Hợp đồng lao động sắp hết hạn (trong 45 ngày), cảnh báo nhân sự thiếu giấy tờ, sinh nhật trong tháng.
   - Thống kê quy mô nhân sự theo từng dự án Game (*Haki Huyền Thoại*, *Pixel Đại Chiến*, *Dự Án Mới B21*, *Nap.joyplay.vn*...).

2. **Quản Lý & Danh Sách Nhân Sự**:
   - 2 Chế độ hiển thị linh hoạt: **Dạng Thẻ (Card View)** và **Dạng Bảng (Table Grid View)**.
   - Bộ lọc đa chiều: Tìm kiếm tức thì theo Từ khóa, Phòng ban, Dự án Game, Trạng thái làm việc.
   - Phím lọc nhanh (Filter Pills): Tất cả, Đủ hồ sơ số, Thiếu hồ sơ, Thử việc/TTS, Quản lý/Lead.

3. **Hồ Sơ Nhân Sự Chi Tiết 360° (Employee Profile Modal)**:
   - **Thông tin cá nhân**: CCCD 12 số, ngày cấp, nơi cấp, quê quán, nơi ở hiện tại, ngày sinh, SĐT, Email JoyGames.
   - **Công việc & Hợp đồng**: Chức danh, cấp bậc, dự án game phụ trách, quản lý trực tiếp, thâm niên, số HĐLĐ, mức lương cơ bản, phụ cấp, tài khoản ngân hàng, MST cá nhân, mã số BHXH.
   - **Kho Lưu Trữ Tài Liệu Số (Digital Document Vault)**:
     - Danh mục checklist bắt buộc: CCCD 2 mặt, HĐLĐ ký duyệt, CV, Bằng cấp, Giấy KSK, Cam kết bảo mật NDA.
     - Tải lên tệp tài liệu mới (PDF / hình ảnh scan).
     - Xem trước tài liệu (Preview Modal phóng to hình ảnh / PDF).
     - Tải về và quản lý trạng thái duyệt.
   - **Quá trình công tác & Cột mốc**: Lưu vết thăng tiến, thành tích dự án game đạt KPI, ghi chú nhân sự nội bộ.

4. **Tra Cứu Hồ Sơ Nâng Cao (Advanced Search)**:
   - Tìm kiếm chính xác kết hợp nhiều trường: Mã NV, Tên, CCCD, Email/SĐT, Phòng ban, Dự án, Loại hợp đồng, Tình trạng thiếu loại giấy tờ cụ thể.

5. **Kiểm Định Hồ Sơ Toàn Công Ty (Document Audit)**:
   - Bảng tổng hợp các nhân sự còn thiếu tài liệu.
   - Nút 1-click gửi email nhắc nhở đôn đốc bổ sung hồ sơ.

6. **In Hồ Sơ A4 & Xuất Dữ Liệu**:
   - **In Sơ Yếu Lý Lịch A4**: Định dạng in chuyên nghiệp chuẩn văn phòng, có logo JoyGames, quốc hiệu, phân mục chi tiết và 3 chữ ký xác nhận (Người lao động, Trưởng phòng HR, Tổng Giám Đốc).
   - **Xuất Excel / CSV**: Tải file danh sách nhân sự tiếng Việt chuẩn UTF-8.
   - **Sao lưu & Khôi phục**: Xuất file Backup `.JSON` và nhập file để chuyển đổi máy tính.

7. **Cơ Cấu Dự Án Game & Xoay Tua Nhân Sự (Project Rotation & Reallocation)**:
   - **Đặc thù Game Studio**: Nhân sự game (Dev, Artist, Game Designer, QA, LiveOps) thường xuyên luân chuyển giữa các giai đoạn (Pre-production, Sprint ra mắt, Open Beta, LiveOps duy trì).
   - **Điều chuyển 1-Click**: Xoay tua nhân viên sang dự án mới hoặc điều chuyển chi viện trực tiếp từ thẻ dự án.
   - **Tự động ghi nhận Lịch sử công tác (Milestones)**: Mỗi lần xoay tua sẽ tự động lưu lại ngày bắt đầu, dự án cũ ➔ mới, hình thức luân chuyển (Toàn thời gian, Chi viện Sprint/Crunch, Song song Multi-project, Bàn giao), vai trò mới và lý do chi viện vào hồ sơ 360° của nhân viên.
   - **Thêm Dự Án Mới**: Mở rộng các tựa game mới của JoyGames linh hoạt, tự động cập nhật ngay vào tất cả bộ lọc và biểu mẫu.

8. **Hệ Thống Điều Hướng URL Sạch & Lưu Trạng Thái Bộ Lọc (HTML5 History API & State Sync)**:
   - Toàn bộ đường dẫn đã được loại bỏ hoàn toàn dấu `#`, cực kỳ chuyên nghiệp và sạch đẹp:
     - `http://localhost:8088/dashboard` : Bảng điều khiển & KPI phân tích
     - `http://localhost:8088/employees` : Danh sách hồ sơ nhân sự (Toàn bộ)
     - `http://localhost:8088/employees?pill=probation` : Lọc nhanh nhân sự **Thử việc / TTS** (F5 giữ nguyên 100%)
     - `http://localhost:8088/employees?pill=missing` : Lọc nhanh nhân sự **Còn thiếu hồ sơ số**
     - `http://localhost:8088/employees?pill=complete` : Lọc nhân sự **Đã nộp đủ 100% hồ sơ**
     - `http://localhost:8088/employees?pill=lead` : Lọc cấp **Quản lý / Lead / Director**
     - `http://localhost:8088/employees?dept=Lập trình Game&project=Pixel Đại Chiến` : Kết hợp lọc theo Phòng ban & Dự án Game
     - `http://localhost:8088/employees?q=Tuấn&view=table` : Tìm kiếm từ khóa và hiển thị dạng Bảng
     - `http://localhost:8088/employees/JG-2023-001` : Liên kết sâu (Deep Link) trực tiếp vào hồ sơ 360° của nhân viên.
     - `http://localhost:8088/search` : Tra cứu hồ sơ nâng cao đa tiêu chí
     - `http://localhost:8088/documents` : Kho lưu trữ & kiểm định hồ sơ số
     - `http://localhost:8088/projects` : Cơ cấu dự án game & xoay tua nhân sự
     - `http://localhost:8088/settings` : Sao lưu & Khôi phục dữ liệu
   - **F5 Không Bao Giờ Mất Vị Trí**: Khi nhấn F5 (Tải lại trang) hoặc gõ thẳng link vào trình duyệt, máy chủ tự động rewrite về `index.html` và hiển thị chính xác trang đang xem.
   - Hỗ trợ đầy đủ nút **Quay lại (←)** và **Tiến tới (→)** của trình duyệt.

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local)

Hệ thống được phát triển thuần HTML5, CSS3 và Vanilla JavaScript (Zero-dependency, không cần cài đặt node_modules phức tạp).

### Cách 1: Sử dụng SPA Python Server (Đang chạy ngầm)
```bash
python server.py 8088
```
Mở trình duyệt truy cập: **`http://localhost:8088/`**

### Cách 2: Sử dụng Node.js (npx serve SPA)
```bash
npx serve -s -l 8088
```

### Cách 3: Mở trực tiếp
Bạn cũng có thể mở trực tiếp file `index.html` bằng bất kỳ trình duyệt nào (Chrome, Edge, Firefox, Safari).

---

## 🌐 Triển Khai Lên Vercel (Public Demo Trực Tuyến)

Ứng dụng đã được cấu hình sẵn sàng 100% để đưa lên **Vercel** hoàn toàn miễn phí:

- File [`vercel.json`](file:///d:/ThanhTools/HR%20JoyGames/vercel.json) đã được cấu hình sẵn để điều hướng URL sạch (Clean URL SPA).
- Thư mục [`api/`](file:///d:/ThanhTools/HR%20JoyGames/api/) chứa các hàm **Serverless Functions** hỗ trợ xác thực mã OTP Telegram mà không cần máy chủ riêng.

### Các bước triển khai cực nhanh:
1. **Qua Vercel CLI (Khuyên dùng)**:
   Mở terminal tại thư mục dự án và chạy:
   ```bash
   npx vercel
   ```
   Làm theo hướng dẫn trên màn hình (đăng nhập tài khoản Vercel, chọn tên dự án). Chỉ sau 30 giây, bạn sẽ nhận được đường link public dạng:
   👉 `https://hr-joygames-portal.vercel.app`

2. **Qua GitHub**:
   - Đẩy mã nguồn lên một repository GitHub mới.
   - Truy cập [vercel.com/new](https://vercel.com/new), chọn repository vừa tạo và nhấn **Deploy**.
   - Mỗi lần cập nhật code lên GitHub, Vercel sẽ tự động cập nhật bản demo trực tiếp!

---

## 🔐 Bảo Mật Xác Thực 2 Lớp (2FA) Qua Telegram OTP

Cổng JoyGames HR Portal được tích hợp cơ chế bảo vệ truy cập tuyệt đối bằng mã xác thực một lần (OTP) gửi trực tiếp về Telegram của bạn:

1. **Khóa Màn Hình An Toàn (Auth Gate Overlay)**:
   - Khi vào trang web, hệ thống tự động khóa và yêu cầu xác thực email quản trị viên (`hr@joygames.vn`).
   - Mã OTP 6 chữ số có hiệu lực trong 5 phút.

2. **Cách Kết Nối Telegram Bot Nhận Mã OTP**:
   - **Bước 1**: Mở Telegram, tìm bot `@BotFather` và gửi `/newbot` để tạo bot mới -> Bạn sẽ nhận được `Bot Token` (dạng `789xxxxxx:AAFnB9...`).
   - **Bước 2**: Tìm bot `@userinfobot` trên Telegram và gửi bất kỳ tin nhắn nào -> Nhận `Id` cá nhân của bạn (dạng `987654321`).
   - **Bước 3**: Nhấn nút **Start** trên con bot của bạn vừa tạo (để cho phép bot nhắn tin cho bạn).
   - **Bước 4**: Vào mục **Sao Lưu & Cài Đặt** (`/settings`) trên HR Portal, điền `Bot Token` & `Chat ID` rồi bấm **Lưu Cấu Hình Telegram** và **Gửi Tin Nhắn Kiểm Tra**.

3. **Chế Độ Thử Nghiệm & Mã Khẩn Cấp (Không lo bị khóa)**:
   - Nếu bạn chưa cấu hình Telegram Bot, hệ thống sẽ tự động hiển thị mã OTP trực tiếp trên màn hình và hỗ trợ nút **"Điền nhanh"**.
   - Mã PIN khẩn cấp / bypass dành riêng cho quản trị viên nội bộ: **`888888`** hoặc **`123456`**.

---

## 📁 Cấu Trúc Mã Nguồn
```
d:\ThanhTools\HR JoyGames\
├── index.html            # Giao diện chính, màn hình khóa 2FA, các modal 360°
├── server.py             # Máy chủ Python hỗ trợ Clean URL (SPA) & Telegram API Endpoints
├── README.md             # Tài liệu hướng dẫn sử dụng
├── assets\
│   └── logo.svg          # Logo vector thương hiệu JoyGames HR Portal
├── css\
│   ├── variables.css     # Design tokens, màu sắc thương hiệu, Dark/Light mode
│   ├── layout.css        # Khung bố cục Sidebar, Header, Responsive grid
│   ├── components.css    # Cards, Modals, 2FA Auth Gate, OTP Digits, Badges, Toasts
│   └── print.css         # Định dạng in A4 Sơ yếu lý lịch chuẩn văn phòng
└── js\
    ├── data.js           # Dữ liệu mẫu khởi tạo (12 nhân sự JoyGames)
    ├── storage.js        # Service LocalStorage, Auth Session, Telegram Config, CRUD, Thống kê
    └── app.js            # Controller quản trị giao diện, Auth Gate, OTP Handler, Router SPA
```

