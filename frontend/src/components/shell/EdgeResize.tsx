// Viền kéo đổi kích thước cửa sổ frameless (bước 63 R1). Wails tự bắt mép bằng mousemove trên window nên bị chặn khi canvas / popup
// nuốt sự kiện chuột (d3-zoom của React Flow) và không hiện con trỏ đúng; ở đây vẽ 4 cạnh + 4 góc dày 6px nằm trên mọi lớp (z-[100]),
// bấm xuống thì nhờ Go bắt đầu kéo cạnh đó (cùng lệnh "resize:<cạnh>" mà runtime Wails gửi). Tắt khi phóng to / toàn màn hình.
// macOS: cửa sổ frameless vẫn nhận kéo mép gốc của hệ điều hành → chỉ vẽ viền ở Windows / Linux.
import { useEffect, useState } from 'react';
import { WindowIsFullscreen, WindowIsMaximised } from '../../../wailsjs/runtime/runtime';
import { inWails } from '../../windowMode';

type Edge = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

// Vị trí + con trỏ từng cạnh / góc (cạnh dày 6px khớp borderThickness của Wails; góc 12px để dễ nắm)
const EDGES: { edge: Edge; cls: string }[] = [
  { edge: 'n', cls: `top-0 left-[12px] right-[12px] h-[6px] cursor-n-resize` },
  { edge: 's', cls: `bottom-0 left-[12px] right-[12px] h-[6px] cursor-s-resize` },
  { edge: 'w', cls: `left-0 top-[12px] bottom-[12px] w-[6px] cursor-w-resize` },
  { edge: 'e', cls: `right-0 top-[12px] bottom-[12px] w-[6px] cursor-e-resize` },
  { edge: 'nw', cls: 'top-0 left-0 h-[12px] w-[12px] cursor-nw-resize' },
  { edge: 'ne', cls: 'top-0 right-0 h-[12px] w-[12px] cursor-ne-resize' },
  { edge: 'sw', cls: 'bottom-0 left-0 h-[12px] w-[12px] cursor-sw-resize' },
  { edge: 'se', cls: 'bottom-0 right-0 h-[12px] w-[12px] cursor-se-resize' },
];

const isMac = navigator.platform.startsWith('Mac');
type Invoke = (msg: string) => void;
const invoke = (): Invoke | undefined => (window as unknown as { WailsInvoke?: Invoke }).WailsInvoke;

export default function EdgeResize() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    if (!inWails) return;
    const check = () => Promise.all([WindowIsMaximised(), WindowIsFullscreen()]).then(([m, f]) => setOff(m || f)).catch(() => {});
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  if (!inWails || isMac || off) return null;
  return (
    <>
      {EDGES.map(({ edge, cls }) => (
        <div key={edge} data-edge-resize={edge} aria-hidden
          // mousedown (không pointerdown): đúng loại sự kiện Win32 cần để bắt đầu kéo cạnh
          onMouseDown={(e) => { if (e.button !== 0) return; e.preventDefault(); invoke()?.(`resize:${edge}-resize`); }}
          className={`fixed z-[100] ${cls}`} />
      ))}
    </>
  );
}
