// GAAS FOUNDATION — Recommendation widget data (Tab 3 Sales Handbook).
// Dữ liệu thuần, KHÔNG logic. Nguồn giá = gaas-service-matrix.md (single source of truth).
// Logic đọc file này nằm trong app.js (initRecommendWidget). KHÔNG thêm file nguồn ngoài hub.
window.__GAAS_REC_DATA = {
  "industries": [
    { "id": "retail", "label": "Bán lẻ / Retail" },
    { "id": "bds", "label": "Bất động sản" },
    { "id": "travel", "label": "Du lịch" },
    { "id": "fndb", "label": "F&B" },
    { "id": "edu", "label": "Giáo dục" },
    { "id": "beauty", "label": "Thẩm mỹ / Spa / Gym" },
    { "id": "pro-svc", "label": "Dịch vụ chuyên nghiệp" }
  ],
  "needs": [
    { "id": "team", "label": "Cần một team làm marketing giúp", "service": "svc-01" },
    { "id": "brand", "label": "Thương hiệu chưa rõ, muốn làm lại", "service": "svc-02" },
    { "id": "content", "label": "Cần video/TVC/podcast/bộ nhận diện", "service": "svc-03" },
    { "id": "ads", "label": "Cần chạy quảng cáo ra lead/doanh thu", "service": "svc-04" },
    { "id": "website", "label": "Cần website/landing page/lên Google", "service": "svc-05" },
    { "id": "ai", "label": "Muốn dùng AI để giảm việc thủ công", "service": "svc-06" },
    { "id": "kol", "label": "Muốn booking KOL/KOC/seeding", "service": "svc-07" },
    { "id": "zalo", "label": "Có data khách, muốn chăm sóc qua Zalo", "service": "svc-08" },
    { "id": "social", "label": "Cần xây và vận hành Facebook/TikTok", "service": "svc-09" },
    { "id": "lead", "label": "Cần lead thật cho sales", "service": "svc-10" }
  ],
  "platforms": [
    { "id": "fb", "label": "Facebook" },
    { "id": "ig", "label": "Instagram" },
    { "id": "tt", "label": "TikTok" },
    { "id": "yt", "label": "YouTube" },
    { "id": "zalo", "label": "Zalo OA" },
    { "id": "web", "label": "Website / Landing" },
    { "id": "ads", "label": "Đang chạy ads" },
    { "id": "ecom", "label": "Bán online (Shopee / TikTok Shop)" },
    { "id": "none", "label": "Chưa có nền tảng nào" }
  ],
  "scopes": [
    { "id": "project", "label": "Project 1 lần" },
    { "id": "retainer", "label": "Gói theo tháng ≥3 tháng" },
    { "id": "campaign", "label": "Campaign" },
    { "id": "lead", "label": "Bán theo lead" }
  ],
  "budgets": [
    { "id": "b-10", "label": "Dưới 10M" },
    { "id": "b10-30", "label": "10–30M" },
    { "id": "b30-60", "label": "30–60M" },
    { "id": "b60-120", "label": "60–120M" },
    { "id": "b120", "label": "Trên 120M" }
  ],
  "infra": [
    { "id": "db", "label": "Có database khách (sđt/Zalo) sẵn" },
    { "id": "team", "label": "Có team sales trong nhà" }
  ],
  "services": [
    {
      "id": "svc-01",
      "name": "Phòng Marketing Thuê Ngoài",
      "tier": "Gói theo tháng",
      "match": ["team", "ads", "website", "content", "social", "brand", "lead"],
      "fit": "SME chưa có phòng marketing hoàn chỉnh; muốn giao 1 đầu mối vận hành tổng thể.",
      "nonFit": "Chỉ cần 1 video / landing / chiến dịch ngắn; ngân sách thấp kỳ vọng full-service.",
      "scopes": ["retainer"],
      "budget": ["b10-30", "b30-60", "b60-120", "b120"],
      "packages": [
        { "name": "Marketing Lite", "price": "14,9–19,9M/th", "desc": "1 kênh; ~8 nội dung; kế hoạch + báo cáo cơ bản" },
        { "name": "Marketing Starter", "price": "24,9–29,9M/th", "desc": "1–2 kênh; 10–12 nội dung; phối hợp ads cơ bản" },
        { "name": "Marketing Growth", "price": "39,9–49,9M/th", "desc": "Đa kênh; content; performance; Zalo cơ bản; dashboard" },
        { "name": "Marketing Scale", "price": "69,9–89,9M/th", "desc": "Đa kênh; production cao; CRM/Zalo; automation cơ bản" },
        { "name": "Department as a Service", "price": "129,9M+/th", "desc": "Dedicated team; chiến lược; production; data; SLA tùy chỉnh" }
      ],
      "crossSell": ["svc-02", "svc-03", "svc-04", "svc-05", "svc-08", "svc-09", "svc-10"]
    },
    {
      "id": "svc-02",
      "name": "Brand & Growth Strategy",
      "tier": "Project",
      "match": ["brand", "lead", "ads"],
      "fit": "Thương hiệu chưa rõ ràng; cần định vị, chiến lược tăng trưởng, GTM hoặc roadmap rollout.",
      "nonFit": "Chỉ cần làm logo/visual mà không có chiến lược; cần triển khai ngay trong tuần.",
      "scopes": ["project"],
      "budget": ["b10-30", "b30-60", "b60-120"],
      "packages": [
        { "name": "Brand Health Audit", "price": "14,9–29,9M", "desc": "Audit nhận diện + thông điệp; consistency score; priority list" },
        { "name": "Brand Strategy Blueprint", "price": "49,9–79,9M", "desc": "Positioning; message house; roadmap 4–6 tuần" },
        { "name": "Growth Strategy Blueprint", "price": "49,9–79,9M", "desc": "ICP; funnel; channel role; experiment backlog" },
        { "name": "Go-to-Market Strategy", "price": "49,9–99,9M", "desc": "Market; offer; pricing; launch phases" }
      ],
      "crossSell": ["svc-03", "svc-05", "svc-09", "svc-04", "svc-01"]
    },
    {
      "id": "svc-03",
      "name": "Content & Production House",
      "tier": "Project / gói tháng",
      "match": ["content", "ads", "kol"],
      "fit": "Cần tài sản sáng tạo: video, hình ảnh, thiết kế, bộ nhận diện, TVC/podcast.",
      "nonFit": "Không có nhu cầu content tái sử dụng; chỉ cần 1 sản phẩm nhỏ không rõ nguồn.",
      "scopes": ["project", "retainer"],
      "budget": ["b-10", "b10-30", "b30-60", "b60-120"],
      "packages": [
        { "name": "AI Video Pack", "price": "9,9–24,9M", "desc": "Short video AI theo bộ" },
        { "name": "Short Video Engine", "price": "12–49,9M/th", "desc": "Sản xuất short video đều đặn" },
        { "name": "Performance Creative Pack", "price": "14,9–39,9M", "desc": "Creative cho quảng cáo" },
        { "name": "Product/Service Video", "price": "20–80M/video", "desc": "Video sản phẩm chất lượng cao" },
        { "name": "TVC", "price": "80–500M+", "desc": "TVC theo brief" },
        { "name": "Brand Identity Starter", "price": "29,9–69,9M", "desc": "Bộ nhận diện cơ bản" }
      ],
      "crossSell": ["svc-04", "svc-05", "svc-09", "svc-01"]
    },
    {
      "id": "svc-04",
      "name": "Performance Ads",
      "tier": "Gói theo tháng + % media",
      "match": ["ads", "lead", "social"],
      "fit": "Cần chạy quảng cáo ra lead/doanh thu; có hoặc sẵn sàng xây tracking.",
      "nonFit": "Chưa có sản phẩm/offer rõ; ngân sách media quá nhỏ; không theo dõi data.",
      "scopes": ["retainer", "lead"],
      "budget": ["b10-30", "b30-60", "b60-120", "b120"],
      "packages": [
        { "name": "Ads Launch", "price": "7,9–12,9M/th", "desc": "1 kênh; phạm vi + ngân sách nhỏ" },
        { "name": "Ads Growth", "price": "14,9–24,9M/th", "desc": "2 kênh; retargeting; creative testing" },
        { "name": "Ads Scale", "price": "29,9–59,9M/th", "desc": "3+ kênh; dashboard + tracking nâng cao" },
        { "name": "Theo % ngân sách", "price": "8–20% media/th", "desc": "Tùy mức spend + complexity" }
      ],
      "crossSell": ["svc-03", "svc-05", "svc-10", "svc-08", "svc-01"]
    },
    {
      "id": "svc-05",
      "name": "Website, Landing Page & SEO",
      "tier": "Project + SEO tháng",
      "match": ["website", "ads", "brand"],
      "fit": "Cần website/landing có mục tiêu rõ, gắn tracking, tối ưu chuyển đổi; SEO dài hạn.",
      "nonFit": "Không có nội dung tối thiểu để đưa lên site; chỉ cần chỗ để đăng tạm.",
      "scopes": ["project", "retainer"],
      "budget": ["b-10", "b10-30", "b30-60", "b60-120"],
      "packages": [
        { "name": "Landing Page Starter", "price": "9,9–19,9M", "desc": "1 page; responsive; form; tracking cơ bản" },
        { "name": "Landing Page Conversion", "price": "19,9–39,9M", "desc": "UX/copy; CRM; tracking; CRO" },
        { "name": "Corporate Website", "price": "29,9–79,9M", "desc": "~5–10 trang; tùy design + chức năng" },
        { "name": "E-commerce Website", "price": "69,9–199,9M+", "desc": "Catalogue; cart; payment; integration" },
        { "name": "SEO Audit", "price": "9,9–24,9M", "desc": "Đánh giá hiện trạng + lộ trình SEO" },
        { "name": "SEO Growth", "price": "15–49,9M/th", "desc": "Triển khai SEO theo tháng" }
      ],
      "crossSell": ["svc-04", "svc-02", "svc-09", "svc-08"]
    },
    {
      "id": "svc-06",
      "name": "AI Transformation",
      "tier": "Project + managed",
      "match": ["ai", "lead", "zalo", "social"],
      "fit": "Quy trình lặp + volume đủ lớn + pain rõ; có knowledge/data; chấp nhận human-in-the-loop.",
      "nonFit": "Không có quy trình lặp rõ; chưa có data/knowledge; kỳ vọng AI thay hoàn toàn nhân sự.",
      "scopes": ["project", "retainer"],
      "budget": ["b10-30", "b30-60", "b60-120", "b120"],
      "packages": [
        { "name": "AI Workshop", "price": "19,9M", "desc": "~4 giờ; demo + roadmap" },
        { "name": "AI Readiness Audit", "price": "19,9–39,9M", "desc": "Quy trình; dữ liệu; risk; priority" },
        { "name": "1 AI Agent cơ bản", "price": "49,9–79,9M/project", "desc": "1 use case; 1 platform; integration giới hạn" },
        { "name": "2–3 AI Agents", "price": "79,9–199,9M+", "desc": "Multi-platform/CRM tùy complexity" },
        { "name": "Vertical Agent template", "price": "39,9–99,9M", "desc": "Tùy ngành + mức custom" }
      ],
      "crossSell": ["svc-08", "svc-05", "svc-10", "svc-01"]
    },
    {
      "id": "svc-07",
      "name": "Social Media Booking & Influence",
      "tier": "Campaign",
      "match": ["kol", "content", "social"],
      "fit": "Muốn booking KOL/KOC/seeding; cần awareness + social proof cho brand.",
      "nonFit": "Ngân sách creator/media rất nhỏ; chưa có brief sản phẩm rõ ràng.",
      "scopes": ["campaign"],
      "budget": ["b30-60", "b60-120", "b120"],
      "packages": [
        { "name": "Micro-KOC Test", "price": "30–80M/campaign", "desc": "5–10 creator; ghi rõ gồm/không booking" },
        { "name": "KOC Growth Campaign", "price": "100–300M/campaign", "desc": "20–50 creator + UGC/amplification" },
        { "name": "Brand Influence Campaign", "price": "300M+", "desc": "KOL/KOC/media/seeding tích hợp" },
        { "name": "Social Seeding Sprint", "price": "15–60M/project", "desc": "Theo số cộng đồng; nội dung; thời gian" }
      ],
      "crossSell": ["svc-03", "svc-04", "svc-09", "svc-05"]
    },
    {
      "id": "svc-08",
      "name": "Zalo Growth, CRM & Loyalty",
      "tier": "Gói theo tháng + project",
      "match": ["zalo", "lead", "ai", "team"],
      "fit": "Có database khách (sđt/Zalo); giao dịch lặp lại; muốn chăm sóc + tăng LTV qua Zalo.",
      "nonFit": "Chưa có data khách hoặc không muốn dùng Zalo; chỉ muốn bán 1 lần không có retainer.",
      "scopes": ["retainer", "project"],
      "budget": ["b30-60", "b60-120", "b120"],
      "packages": [
        { "name": "Zalo Foundation", "price": "19,9–29,9M/th", "desc": "OA; content; ZNS cơ bản" },
        { "name": "Zalo Growth", "price": "39,9–59,9M/th", "desc": "OA; ZNS; Ads; chatbot; segmentation" },
        { "name": "CRM Automation Setup", "price": "29,9–99,9M/project", "desc": "Tùy CRM; data volume; flow; integration" },
        { "name": "Mini App", "price": "49,9–199,9M+", "desc": "Tùy module; design; backend" },
        { "name": "Commerce & Loyalty", "price": "99,9–299M+", "desc": "Tùy nghiệp vụ + hệ thống" },
        { "name": "Managed Ecosystem", "price": "49,9–129,9M/th", "desc": "Vận hành; campaign; data; optimization" }
      ],
      "crossSell": ["svc-10", "svc-04", "svc-05", "svc-06", "svc-09"]
    },
    {
      "id": "svc-09",
      "name": "Social Growth",
      "tier": "Gói theo tháng",
      "match": ["social", "content", "team"],
      "fit": "Cần xây và vận hành owned social (FB/TikTok/IG/LinkedIn) chuyên nghiệp, đều đặn.",
      "nonFit": "Chỉ muốn đăng lẻ; không có người duyệt nội dung; kỳ vọng viral nhanh.",
      "scopes": ["retainer"],
      "budget": ["b-10", "b10-30", "b30-60"],
      "packages": [
        { "name": "Social Starter", "price": "9,9–12,9M/th", "desc": "1 kênh; 8–10 nội dung; 1–2 video" },
        { "name": "Social Growth", "price": "17,9–29,9M/th", "desc": "2 kênh; 16–20 nội dung; 4 video; community" },
        { "name": "Social Video Engine", "price": "29,9–49,9M/th", "desc": "Video-first; 8–12 video; đa nền tảng" },
        { "name": "Social Scale", "price": "49,9–79,9M/th", "desc": "Đa kênh; production; community; listening" }
      ],
      "crossSell": ["svc-03", "svc-04", "svc-05", "svc-01"]
    },
    {
      "id": "svc-10",
      "name": "Lead Pro",
      "tier": "Retainer hoặc giá/lead",
      "match": ["lead", "ads", "team"],
      "fit": "Cần lead thật cho sales; sẵn sàng thống nhất tiêu chí, chạy campaign, verify, phân loại.",
      "nonFit": "Không có team sales follow-up; không xác định được tiêu chí lead rõ ràng.",
      "scopes": ["lead", "retainer"],
      "budget": ["b10-30", "b30-60", "b60-120", "b120"],
      "packages": [
        { "name": "Model A: Gói theo tháng", "price": "~15% ngân sách/th", "desc": "Khách tự chi media; target lead theo baseline" },
        { "name": "Model B: Giá/lead", "price": "600K–1,5M/verified lead", "desc": "Tùy ngành; tiêu chí; khu vực; volume" },
        { "name": "Lead Verify only", "price": "Theo volume", "desc": "Theo số lead + độ sâu câu hỏi" },
        { "name": "Nurturing Setup", "price": "10–30M/project", "desc": "Flow; template; integration cơ bản" }
      ],
      "crossSell": ["svc-04", "svc-05", "svc-08", "svc-06", "svc-01"]
    }
  ]
};
