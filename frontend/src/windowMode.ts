import { OverlayDisplayFor, SetWindowMode } from '../wailsjs/go/main/App';
import { model } from '../wailsjs/go/models';
import type { Rect } from './types';

export type WindowMode = 'main' | 'overlay' | 'minibar';

// false khi xem trên trình duyệt (không có Go / Wails runtime)
export const inWails = 'runtime' in window;

// Đổi kích thước/vị trí cửa sổ (Go) rồi đổi màn qua hash URL – App.tsx chọn màn theo hash.
export async function setWindowMode(mode: WindowMode) {
  if (inWails) await SetWindowMode(mode);
  location.hash = mode === 'main' ? '' : mode;
}

// preview: xem trước kịch bản (con trỏ giả), không sửa điểm
// select (chọn nhiều điểm để biến đổi – bước 30) và capture (khoanh ảnh mẫu – bước 25): giao diện ở #demo-overlay, chưa bật
export type OverlayTool = 'point' | 'drag' | 'region' | 'preview' | 'select' | 'capture' | 'stroke'; // stroke: kéo một nét → điểm của node Vẽ đường (50 E1)

// Công cụ được chọn sẵn khi mở overlay và bước đang xem riêng (null = xem tất cả) – OverlayScreen đọc lúc mount.
export let overlayTool: OverlayTool = 'region';
export let overlayFocus: string | null = null;

// Khung đang soạn (vùng của kịch bản, toàn màn hình = màn chính) – scriptStore đăng ký; overlay mở trên màn chứa nó.
let editingBounds: () => Rect | null = () => null;
export const setEditingBounds = (f: () => Rect | null) => {
  editingBounds = f;
};

export async function openOverlay(tool: OverlayTool = 'point', focus: string | null = null) {
  overlayTool = tool;
  overlayFocus = focus;
  const r = editingBounds();
  if (inWails && r) await OverlayDisplayFor(model.Rect.createFrom(r)).catch(() => -1);
  return setWindowMode('overlay');
}

// Vùng trong cửa sổ không bị Dock / taskbar / thanh menu che (overlay phủ cả màn hình nhưng nằm dưới Dock).
// Dùng để đặt nút nổi (khoanh ảnh, thanh số) – toạ độ cửa sổ.
export function safeArea() {
  const s = window.screen as Screen & { availTop?: number };
  const availTop = s.availTop ?? 0;
  const top = Math.max(0, availTop - window.screenY);
  const bottom = Math.min(window.innerHeight, availTop + s.availHeight - window.screenY);
  // một số WebView báo availHeight = cả màn hình → vẫn chừa 80 px cho Dock / taskbar
  return { top, bottom: bottom >= window.innerHeight - 4 ? window.innerHeight - 80 : bottom };
}
