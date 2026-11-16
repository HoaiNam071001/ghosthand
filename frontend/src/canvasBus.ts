// Cầu nối ribbon / status bar ↔ canvas flow (bước 63): nút nằm ngoài canvas ra lệnh (thu phóng, vừa màn hình, xếp lại, mở bảng thêm node)
// và đọc mức zoom. FlowCanvas xử lý lệnh thu phóng + báo zoom; FlowEditor xử lý xếp lại / bảng thêm node.
import { useSyncExternalStore } from 'react';

export type CanvasCommand = 'zoomIn' | 'zoomOut' | 'zoom100' | 'fit' | 'layout' | 'palette';
type Handler = (cmd: CanvasCommand) => void;

const handlers = new Set<Handler>();
export const sendCanvas = (cmd: CanvasCommand) => handlers.forEach((h) => h(cmd));
export const onCanvasCommand = (h: Handler) => {
  handlers.add(h);
  return () => { handlers.delete(h); };
};

// Kéo thanh zoom ở status bar: đặt thẳng mức zoom
const zoomHandlers = new Set<(z: number) => void>();
export const requestZoom = (z: number) => zoomHandlers.forEach((h) => h(z));
export const onZoomRequest = (h: (z: number) => void) => {
  zoomHandlers.add(h);
  return () => { zoomHandlers.delete(h); };
};

let zoom = 1;
const subs = new Set<() => void>();
export function setCanvasZoom(z: number) {
  if (z === zoom) return;
  zoom = z;
  subs.forEach((f) => f());
}
export const useCanvasZoom = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => zoom);
