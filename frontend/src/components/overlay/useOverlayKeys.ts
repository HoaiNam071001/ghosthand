// Phím tắt của overlay (gắn một lần): Enter dùng khung khoanh, Esc huỷ thao tác đang dở theo thứ tự ưu tiên rồi mới thoát,
// Alt hiện đường neo, phím của công cụ chọn nhiều. Tách khỏi OverlayScreen – màn đó giữ state, hook này chỉ đọc ref.
import { MutableRefObject, useEffect, useRef } from 'react';
import { cancelDragA, cancelPick, getEditor, selectToolKey, setMulti } from '../../store';
import { OverlayTool, setWindowMode } from '../../windowMode';

const isMac = navigator.platform.startsWith('Mac');

type Ref<T> = MutableRefObject<T>;
export type OverlayKeys = {
  toolRef: Ref<OverlayTool>;
  pendingRef: Ref<unknown>; // đang chờ chọn cách đổi vùng
  capRef: Ref<unknown>; // khung khoanh đã kéo xong
  useCapture: () => unknown;
  gestureRef: Ref<{ cancel: () => boolean }>;
  simRef: Ref<{ running: boolean; stop: () => void }>;
  movingRef: Ref<unknown>;
  dragRef: Ref<unknown>;
  repickRef: Ref<boolean>;
  clearMoving: () => void;
  clearDrag: () => void;
  clearCap: () => void;
  endRepick: () => void;
  setAlt: (on: boolean) => void;
  onLeave: () => void; // gỡ màn
};

export function useOverlayKeys(keys: OverlayKeys) {
  const k = useRef(keys);
  k.current = keys;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = k.current;
      // Chọn nhiều: mod+A, mũi tên – trừ khi đang gõ trong ô số hoặc đang chờ chọn cách đổi vùng
      if (h.toolRef.current === 'select' && !(e.target as HTMLElement).closest('input') && !h.pendingRef.current
        && selectToolKey(e.key, isMac ? e.metaKey : e.ctrlKey, e.shiftKey)) return e.preventDefault();
      if (e.key === 'Enter' && h.capRef.current && h.toolRef.current === 'capture') {
        e.preventDefault();
        return h.useCapture();
      }
      if (e.key !== 'Escape') return;
      // Đang kéo vùng / marker thì Esc chỉ huỷ thao tác đó.
      if (h.gestureRef.current.cancel()) return;
      if (h.simRef.current.running) h.simRef.current.stop(); // xem trước đang chạy → Esc chỉ dừng
      else if (h.movingRef.current) h.clearMoving();
      else if (h.dragRef.current) h.clearDrag();
      else if (h.capRef.current) h.clearCap(); // khoanh: Esc = khoanh lại
      else if (cancelDragA()) return;
      else if (h.repickRef.current) {
        cancelPick();
        h.endRepick();
      } else if (h.toolRef.current === 'select' && getEditor().multi.length) setMulti([]); // Esc bỏ chọn trước
      else setWindowMode('main');
    };
    const onAlt = (e: KeyboardEvent) => k.current.setAlt(e.altKey);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onAlt);
    window.addEventListener('keyup', onAlt);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keydown', onAlt);
      window.removeEventListener('keyup', onAlt);
      k.current.onLeave();
      // Thoát overlay (Esc / Xong) mà chưa chọn lại điểm → huỷ. Chỉ khi đã rời overlay thật: StrictMode (wails dev)
      // gỡ rồi gắn lại màn ngay khi mở – huỷ lúc đó sẽ mất loại bước (Double click / Giữ chuột) và chỗ chèn từ Ctrl+K.
      if (location.hash !== '#overlay') cancelPick();
    };
  }, []);
}
