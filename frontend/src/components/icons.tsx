type P = { className?: string };
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true } as const;

export const Target = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="12" cy="12" r="5" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>
);
// Logo app (assets/logo-app.svg, bỏ nền vuông trắng – chỉ lấy hình tròn) – màu thương hiệu cố định, không theo currentColor.
export const Logo = ({ className = 'h-[22px] w-[22px]' }: P) => (
  <svg viewBox="20 20 160 160" className={className} fill="none" aria-hidden>
    <circle cx="100" cy="100" r="78" fill="white" stroke="#5AAEFF" strokeWidth="4" />
    <path d="M90.352 33.3145C96.6275 25.8725 107.682 27.0093 107.747 35.1033L108.235 95.0976C108.286 101.397 101.286 107.549 94.7119 107.086L94.3993 107.059L47.3975 102.225L47.0885 102.189C40.6783 101.317 38.9532 94.2679 43.8375 88.4756L90.352 33.3145ZM59.9704 88.9313L93.0267 92.3305L92.684 50.1365L59.9704 88.9313Z" fill="#3C36A8" />
    <path d="M110.263 166.685C103.988 174.127 92.9335 172.991 92.8677 164.897L92.3803 104.902C92.3291 98.6026 99.3293 92.4512 105.903 92.914L106.216 92.9414L153.218 97.7746L153.527 97.8111C159.937 98.6834 161.662 105.732 156.778 111.524L110.263 166.685ZM140.645 111.069L107.588 107.669L107.931 149.863L140.645 111.069Z" fill="#5AAEFF" />
    <path d="M127 100.5C127 115.688 114.688 128 99.5 128C84.3122 128 72 115.688 72 100.5C72 85.3122 84.3122 73 99.5 73C114.688 73 127 85.3122 127 100.5Z" fill="white" />
    <path d="M86.033 101.799C84.8563 103.321 82.6685 103.601 81.1464 102.425L80.7559 102.123C79.2338 100.946 78.9539 98.7582 80.1306 97.2362L89.0061 85.7559C90.1828 84.2339 92.3705 83.9539 93.8926 85.1306L94.2831 85.4325C95.8052 86.6092 96.0851 88.797 94.9084 90.3191L86.033 101.799Z" fill="#5AAEFF" />
    <path d="M86.033 97.4618C84.8563 95.9397 82.6685 95.6598 81.1464 96.8365L80.7559 97.1384C79.2338 98.3151 78.9539 100.503 80.1306 102.025L89.0061 113.505C90.1828 115.027 92.3705 115.307 93.8926 114.131L94.2831 113.829C95.8052 112.652 96.0851 110.464 94.9084 108.942L86.033 97.4618Z" fill="#5AAEFF" />
    <path d="M113.006 101.799C114.183 103.321 116.371 103.601 117.893 102.425L118.283 102.123C119.805 100.946 120.085 98.7582 118.908 97.2362L110.033 85.7559C108.856 84.2339 106.669 83.9539 105.146 85.1306L104.756 85.4325C103.234 86.6092 102.954 88.797 104.131 90.3191L113.006 101.799Z" fill="#3C36A8" />
    <path d="M113.006 97.4618C114.183 95.9397 116.371 95.6598 117.893 96.8365L118.283 97.1384C119.805 98.3151 120.085 100.503 118.908 102.025L110.033 113.505C108.856 115.027 106.669 115.307 105.146 114.131L104.756 113.829C103.234 112.652 102.954 110.464 104.131 108.942L113.006 97.4618Z" fill="#3C36A8" />
  </svg>
);
export const Region = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><rect x="3" y="5" width="18" height="14" rx="1" strokeDasharray="3 3" /></svg>
);
export const Drag = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="5" cy="18" r="2" /><path d="M7 16 18 6M13 6h5v5" /></svg>
);
export const Play = ({ className = 'h-3.5 w-3.5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M6 4l14 8-14 8z" /></svg>
);
export const Pause = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
);
export const Stop = ({ className = 'h-3 w-3' }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
);
export const Loop = ({ className = 'h-[15px] w-[15px]' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.8}><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" /></svg>
);
// Chạy node kế rồi dừng (debug, F10) – thanh mini
export const StepOver = ({ className = 'h-3.5 w-3.5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.9}><path d="M4 14a8 8 0 0 1 15-4M19 4v6h-6" /><circle cx="12" cy="19" r="1.6" /></svg>
);
export const Power = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 3v8M6.3 6.3a8 8 0 1 0 11.4 0" /></svg>
);
export const Sun = ({ className = 'h-3.5 w-3.5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const Moon = ({ className = 'h-3.5 w-3.5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
);
export const Monitor = ({ className = 'h-3.5 w-3.5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
);
// Cài đặt app (bánh răng)
export const Gear = ({ className = 'h-3.5 w-3.5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
// Thu gọn / mở rộng thanh bên: khung có cột trái, mũi tên theo hướng
// Thư viện: Mẫu thử, Mở file, Lưu, mũi tên thu gọn
export const Grid = ({ className = 'h-[15px] w-[15px]' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const Folder = ({ className = 'h-[15px] w-[15px]' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.8}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
);
export const Save = ({ className = 'h-[15px] w-[15px]' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.8}><path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 3v5h7V3M7 21v-7h10v7" /></svg>
);
export const Chevron = ({ className = 'h-[11px] w-[11px]', open = false }: P & { open?: boolean }) => (
  <svg viewBox="0 0 24 24" className={`${className} transition-transform ${open ? 'rotate-90' : ''}`} {...base} strokeWidth={2.4}><path d="M9 6l6 6-6 6" /></svg>
);
export const SidebarToggle = ({ className = 'h-4 w-4', open = true }: P & { open?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d={open ? 'M15.5 10l-2 2 2 2' : 'M13.5 10l2 2-2 2'} />
  </svg>
);
// Chọn nhiều (khung chọn nét đứt + con trỏ)
export const SelectIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M3 15v4a2 2 0 0 0 2 2h4" /><path d="M13 13l8 3.5-3.5 1-1 3.5z" />
  </svg>
);
export const Copy = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
);
export const Trash = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const Eye = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const Info = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></svg>
);
// Hướng dẫn (nút ? trên thanh tiêu đề)
export const Help = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.7c0 1.6-2.4 2-2.4 3.6M12 17v.01" /></svg>
);

// Icon loại bước – design v2 (design/DESIGN.md, "Icon bước"): SVG 24×24, nét 1.8, đầu tròn.
// Có cả loại chưa làm (scroll, open, waitImage…) để dựng sẵn UI (bước 27b).
export const STEP_ICON = {
  click: 'M5 3l13 7-6 1.5L9 18z',
  double: 'M5 3l13 7-6 1.5L9 18zM15 3l2-2M19 6l2-1',
  hold: 'M5 3l13 7-6 1.5L9 18zM17 15a3 3 0 1 0 0 .01',
  drag: 'M5 19a2 2 0 1 0 0-.01M7 17L18 6M13 6h5v5',
  scroll: 'M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4',
  type: 'M4 7V5h12v2M10 5v14M7 19h6M15 13h5M17.5 13v6',
  key: 'M5 9h14v10H5zM8 13h1M11 13h1M14 13h2M8 16h8',
  wait: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  waitImage: 'M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  clickImage: 'M4 8V5h3M17 5h3v3M7 19H4v-3M10 9l9 5-4 1-2 4z',
  waitPixel: 'M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v7h-7z',
  path: 'M3 17c2.5-6 5-6 7-2s4.5 4 6-1 3.5-6 5-5', // nét vẽ
  waitScreen: 'M3 5h18v11H3zM8 20h8M12 16v4M9 10.5h.01M12 10.5h.01M15 10.5h.01', // màn hình + ba chấm đang tải
  findAll: 'M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM13 13h3v3h-3z', // khung tìm + bốn ô – mọi chỗ thấy
  waitUntil: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 1.5M5 3 2 6M19 3l3 3', // đồng hồ báo thức
  power: 'M12 3v8M7.5 6.5a7 7 0 1 0 9 0', // nút nguồn
  display: 'M3 5h18v11H3zM8 20h8M12 16v4M10 8.5l4 2.5-4 2.5z', // màn hình có nút phát
  notify: 'M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20h4', // chuông – thông báo
  zip: 'M5 3h10l4 4v14H5zM15 3v4h4M10 9h2M10 12h2M10 15h2M9 18h4', // tệp có khoá kéo – zip
  inputSource: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M7 14h10', // bàn phím – bộ gõ
  process: 'M4 6h16v12H4zM8 14l2-3 2 2 3-4 1 2', // khung + đường tải CPU – tiến trình
  sysInfo: 'M4 5h16v11H4zM9 20h6M12 16v4M7 12l3-3 2 2 4-4', // màn hình + đường biểu đồ – thông tin máy
  osShortcut: 'M13 3L5 13.5h6L10 21l8-10.5h-6z', // tia chớp – Shortcuts
  shell: 'M4 5h16v14H4zM7.5 10l3 2.5-3 2.5M12.5 15h4', // cửa sổ dòng lệnh
  system: 'M4 9h4l5-4v14l-5-4H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11', // loa
  file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6', // tờ giấy
  http: 'M4 12h11M11 8l4 4-4 4M19 5v14', // mũi tên gửi đi
  clipboard: 'M9 3h6v4H9zM8 5H5v16h14V5h-3M8 12h8M8 16h5', // bảng kẹp giấy
  screenshot: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7', // máy ảnh
  webWait: 'M3 5h18v14H3zM3 9h18M10 12.5l-2 2 2 2M14 12.5l2 2-2 2', // cửa sổ trình duyệt + </>
  webClick: 'M3 5h18v14H3zM3 9h18M9 11.5l8 4.2-3.4.9-1.6 3.1z', // cửa sổ trình duyệt + con trỏ
  webType: 'M3 5h18v14H3zM3 9h18M6 12h12v4H6zM9 13v2', // cửa sổ trình duyệt + ô nhập có con trỏ chữ
  webRead: 'M3 5h18v14H3zM3 9h18M7 12.5h10M7 15.5h6', // cửa sổ trình duyệt + dòng chữ
  elementAction: 'M5 4l6 15 2.2-6.2L19.5 11zM14 14l5 5', // con trỏ bấm thẳng vào phần tử
  waitUIEvent: 'M12 5a7 7 0 100 14 7 7 0 000-14zM12 9v3.5l2.5 1.5M4 4l2.5 2.5M20 4l-2.5 2.5', // đồng hồ chuông báo – chờ có biến động
  waitDownload: 'M12 4v10M8 10.5l4 4 4-4M4 19h16M7 19v-2M17 19v-2', // mũi tên tải xuống xuống khay
  readTable: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14', // lưới bảng
  readDocument: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 15h7M9 18h4', // tờ giấy có dòng chữ
  pageText: 'M4 4h16M4 8h16M4 12h10M4 16h16M4 20h8', // các dòng chữ của trang
  elementRead: 'M4 4h10v6H4zM6 7h6M4 14h16M4 18h11', // khung phần tử + dòng chữ đọc ra
  webScroll: 'M3 5h18v14H3zM3 9h18M12 11v6M9.5 14.5l2.5 2.5 2.5-2.5', // cửa sổ trình duyệt + mũi tên cuộn
  webKey: 'M3 5h18v14H3zM3 9h18M7 12h10v5H7zM9 14.5h1M12 14.5h1M15 14.5h0', // cửa sổ trình duyệt + bàn phím
  open: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18',
  window: 'M4 5h16v14H4zM4 9h16',
  app: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7', // lưới app + dấu cộng
  browserTab: 'M3 8h18v11H3zM3 8V5h7l1.5 3M12 5h5l1.5 3M7 13h10', // cửa sổ có 2 tab
  browserGo: 'M3 5h18v14H3zM3 9h18M7 14h7M11.5 11.5L14 14l-2.5 2.5', // cửa sổ trình duyệt + mũi tên đi tới
  savePdf: 'M6 3h9l4 4v14H6zM14 3v5h5M9 14h6M9 17h4', // trang giấy gập góc + dòng chữ
  browserNorm: 'M3 5h18v14H3zM3 9h18M9 13l-2 2 2 2M15 13l2 2-2 2', // cửa sổ trình duyệt + ngoặc chuẩn
  group: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  // node điều khiển của flow (bước 20)
  if: 'M12 3l9 9-9 9-9-9zM12 8v5M12 16v.01',
  switch: 'M3 12h5M8 12c3 0 3-6 7-6h6M8 12h13M8 12c3 0 3 6 7 6h6',
  switchScreen: 'M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M8 12h3M11 12c2 0 2-3 5-3M11 12c2 0 2 3 5 3',
  counter: 'M9 4L7 20M17 4l-2 16M4 9h16M3 15h16',
  forEach: 'M4 6h11M4 12h7M4 18h7M17 10v8m0 0l-3-3m3 3l3-3',
  end: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  calc: 'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01', // máy tính bỏ túi
  textMatch: 'M17 3v8M13.5 5l7 4M20.5 5l-7 4M4 19a2 2 0 104 0 2 2 0 00-4 0', // .* của regex
  textSplit: 'M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12', // kéo
  textClean: 'M7 21l-4.3-4.3a1 1 0 010-1.4l10-10a1 1 0 011.4 0l5.6 5.6a1 1 0 010 1.4L11 21M22 21H7M5 11l9 9', // tẩy
  textNumber: 'M4 9h16M4 15h16M10 3L8 21M16 3l-2 18', // #
  setVar: 'M8 4c-2 0-3 1-3 3v2.5C5 11 4 12 3 12c1 0 2 1 2 2.5V17c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2.5c0 1.5 1 2.5 2 2.5-1 0-2 1-2 2.5V17c0 2-1 3-3 3',
} as const;
export type StepIconName = keyof typeof STEP_ICON;

export const StepIcon = ({ type, className = 'h-4 w-4' }: P & { type: StepIconName }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={STEP_ICON[type]} /></svg>
);
export const Pin = ({ className = 'h-3.5 w-3.5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6" /></svg>
);
// Thử trang trên Chrome của app (quả địa cầu)
export const Globe = ({ className = 'h-3.5 w-3.5' }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
