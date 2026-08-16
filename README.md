# GAAS FOUNDATION — Internal Hub

Site nội bộ 3 tab, biên dịch từ 3 file Markdown chuẩn của GAAS FOUNDATION thành một file
static `dist/index.html` (CSS/JS inline, logo đi kèm) — không cần framework, không cần build
tool, chạy được trực tiếp qua `file://` hoặc bất kỳ static host nào.

## 3 Tab

| Tab | Nguồn chính thức | Trạng thái nguồn |
|---|---|---|
| 1 · Brand Strategy | `brand-guide-gaas.md` | V2.0 · 04/08/2026 20:06 |
| 2 · Matrix · Pricing | `gaas-service-matrix.md` | Phiên bản 1.1 · 03/08/2026 18:37 |
| 3 · Sales Handbook | `gaas-sales-handbook.md` | Bản chốt 01/08/2026 15:01 |

## Build & check

```bash
python3 build_site.py           # build dist/index.html
python3 build_site.py --verbose # in thống kê cấu trúc
python3 build_site.py --check   # exit 1 nếu nguồn đã thay đổi so với lần build cuối
```

**Quy trình cập nhật:** sửa nguồn Markdown → chạy `python3 build_site.py` → mở
`dist/index.html` → (tuỳ chọn) `python3 build_site.py --check` để xác nhận đồng bộ.

## Quyền nguồn & xung đột giá

Theo `brand-guide-gaas.md` (Document Governance):

- `brand-guide-gaas.md` → chiến lược thương hiệu.
- `gaas-service-matrix.md` → cấu trúc gói, deliverable và **giá (Nguồn giá chính thức)**.
- `gaas-sales-handbook.md` → chẩn đoán, tư vấn, brief, xử lý kỳ vọng.

Có **7 xung đột giá** đã xác minh giữa Handbook và Matrix (Matrix thắng). Danh sách đầy đủ
trong `src/authority-overrides.json` và hiển thị ở panel "Xung đột nguồn & phán quyết"
trong Tab 3. Giá Handbook bị gạch ngang + chip "Matrix: …". Nếu override không còn khớp,
build sẽ báo lỗi — hãy cập nhật override thay vì bỏ qua.

**Diagnostic Offer:** Tab 3 có thêm card "Cửa ngõ — Nguồn: Matrix" đưa 3 Diagnostic Offer
(Marketing Accelerator Audit 9,9M · Zalo Growth Diagnostic 9,9M · AI Transformation Workshop 19,9M)
mà Handbook hiện chưa liệt kê đầy đủ.

## Cấu trúc

```
gaas-foundation-hub/
  build_site.py            # generator (Python stdlib) + --check
  README.md                # file này
  src/
    template.html          # shell HTML
    styles.css             # GAAS design system
    app.js                 # tabs / search / scroll-spy / drawer / checklist
    nav-meta.json          # định nghĩa 3 tab
    authority-overrides.json # 7 xung đột giá + phán quyết
  assets/logo.png          # copy logo master
  dist/index.html          # GENERATED — không sửa tay
  dist/logo.png
  build-manifest.json      # hash + mtime các nguồn tại lần build
```

## Nội dung check-in tự động

Build kiểm tra tính toàn vẹn với baseline hiện tại:

- 60 bảng
- 5 code fence (ASCII flow)
- 104 checkbox

Nếu nguồn đổi làm số liệu này lệch, build dừng và báo lỗi — không lặng lẽ sai.

## ⚠️ KHÔNG

- **Không** sửa tay `dist/index.html` — nó là đầu ra, sẽ bị ghi đè.
- **Không** deploy giai đoạn này — chưa có `vercel.json`/`.git` trong thư mục này.
- **Không** chạm `gaas-handbook-site/` hay `gaas-offer-vercel/` — các site đang chạy độc lập.
- Nếu muốn deploy sau này, chỉ cần thêm `vercel.json` + push thư mục `dist/` (zero-build static).

## Search

- Tìm kiếm toàn site, **không phân biệt dấu**: gõ `khach phu hop` vẫn ra `Khách phù hợp`.
- Gõ `/` hoặc `⌘K` để nhảy vào ô tìm; `Enter` mở kết quả; `Esc` đóng.
- Kết quả nhóm theo tab, nhấn để chuyển tab + cuộn tới mục.

## Checklist

Checkbox trong phần "Brief bắt buộc" (Tab 3) lưu trạng thái vào `localStorage` theo
section; có nút "Xóa đánh dấu" và đếm tiến độ.
