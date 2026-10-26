// Yêu cầu mở modal Hướng dẫn ở một chương / trang node (nút ?, F1, "Xem hướng dẫn" ở bảng Thêm node / inspector); Guide lắng nghe.
import type { GuidePage } from './guide/types';

type Listener = (page?: GuidePage) => void;
const listeners = new Set<Listener>();
export const openGuide = (page?: GuidePage) => listeners.forEach((l) => l(page));
export const onOpenGuide = (l: Listener) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
