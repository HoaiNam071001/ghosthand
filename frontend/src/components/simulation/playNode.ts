// Xem trước một node: con trỏ giả bay / click / kéo / cuộn hoặc bong bóng chữ theo loại node.
// Simulation (useSimulation) giữ state + đi theo đồ thị, gọi hàm này cho từng node.
import { boundsOf, refOf, type Ends } from '../../store';
import { fmtSelectors } from '../../flow/web';
import { fmtShot } from '../../flow/shot';
import { fmtWaitScreen } from '../../flow/waitScreen';
import { fmtElementAction } from '../../flow/elementAction';
import { fmtWaitUIEvent } from '../../flow/uiEvent';
import { fmtWaitDownload } from '../../flow/file';
import { fmtPos } from '../../flow/detail';
import { fmtClip } from '../../flow/clipboard';
import { fmtHTTP } from '../../flow/http';
import { fmtFile } from '../../flow/file';
import { fmtOSShortcut } from '../../flow/osShortcut';
import { fmtShell } from '../../flow/shell';
import { fmtSystem } from '../../flow/system';
import { fmtWindow } from '../../flow/window';
import { fmtApp } from '../../flow/app';
import { fmtPageText, fmtReadDocument, fmtReadTable } from '../../flow/element';
import { fmtBrowserGo, fmtBrowserNorm, fmtBrowserTab, fmtSavePdf } from '../../flow/browserTab';
import { fmtWaitUntil } from '../../flow/waitUntil';
import { pathVertices } from '../../flow/shape';
import { fmtKey } from '../../keys';
import { Point, Rect, Step, stepLabel } from '../../types';
import { fmtInputSource } from '../../flow/inputSource';
import { fmtZip } from '../../flow/zip';
import { fmtAskAI } from '../../flow/askAI';
import { fmtMCPTool } from '../../flow/mcpTool';
import { fmtNotify } from '../../flow/notify';
import { fmtPower } from '../../flow/power';
import { fmtDisplay } from '../../flow/display';
import { fmtProcess } from '../../flow/process';
import { scrollDelta } from '../../scroll';
import type { SimState } from '../Simulation';

const TYPE_CHAR_MS = 40;
const KEY_SHOW_MS = 500;
const SCROLL_MIN_MS = 700; // mũi tên cuộn chạy ít nhất chừng này để kịp nhìn (engine thật: 30 ms / nấc)

// Công cụ diễn của một lượt xem trước (useSimulation tạo). pos / offset đổi trong lúc diễn.
export type Player = {
  pos: Point | null; // chỗ con trỏ giả
  offset: Point; // trang nền đã cuộn bao nhiêu px
  region: Rect | null;
  patch: (p: Partial<SimState> | ((s: SimState) => Partial<SimState>)) => void;
  wait: (ms: number) => Promise<void>;
  moveTo: (p: Point, ms: number, drag?: boolean) => Promise<void>;
  animate: (ms: number, f: (k: number) => void) => Promise<void>;
  travel: (p: Point, s: Step, dragMs?: number) => Promise<void>;
  ripple: (at: Point, hold?: number) => void;
};

// Chữ bong bóng cho node không di chuột (null: node có diễn riêng).
function bubbleOf(s: Step): string | null {
  switch (s.type) {
    case 'open': return `Mở ${s.target}${s.app ? ` bằng ${s.app}` : ''}`;
    case 'clickImage':
      return `Click theo ${s.imageSource === 'search' && s.findBy === 'text' ? `chữ “${s.findText}”` : 'ảnh'}${s.imageSource === 'search' ? ' (tự tìm)' : ''} – vị trí biết khi chạy thật`;
    case 'webWait': case 'webClick': case 'webType': case 'webRead': case 'webScroll':
      return `${stepLabel(s)}: ${fmtSelectors(s.selectors)} – vị trí biết khi chạy thật`;
    case 'waitUntil': return `⏰ Chờ ${fmtWaitUntil(s)} – xem trước không chờ thật`;
    case 'power': return `⏻ Nguồn: ${fmtPower(s)} – xem trước không tác động máy`;
    case 'display': return `🖥 Màn hình / âm thanh: ${fmtDisplay(s)} – xem trước không đổi thật`;
    case 'askAI': return `✨ Hỏi AI: ${fmtAskAI(s)} – xem trước không gọi AI`;
    case 'mcpTool': return `🔌 MCP: ${fmtMCPTool(s)} – xem trước không gọi tool`;
    case 'notify': return `🔔 Thông báo: ${fmtNotify(s)} – xem trước không hiện thật`;
    case 'zip': return `🗜 ${fmtZip(s)} – xem trước không nén / giải nén thật`;
    case 'inputSource': return `⌨ Bộ gõ: ${fmtInputSource(s)} – xem trước không đổi thật`;
    case 'process': return `⚙ Tiến trình ${fmtProcess(s)} – xem trước không đọc thật`;
    case 'sysInfo': return '🖥 Đọc thông tin máy – xem trước không đọc thật';
    case 'osShortcut': return `⚡ Shortcut ${fmtOSShortcut(s)} – xem trước không chạy thật`;
    case 'shell': return `⌨ Chạy lệnh ${fmtShell(s)} – xem trước không chạy thật`;
    case 'system': return `🔊 ${fmtSystem(s)}`;
    case 'app': return `🧩 Ứng dụng: ${fmtApp(s)} – xem trước không đụng app thật`;
    case 'elementAction': return `🖱 Thao tác phần tử: ${fmtElementAction(s)} – xem trước không thao tác thật`;
    case 'waitUIEvent': return `👁 Chờ sự kiện ${fmtWaitUIEvent(s)} – xem trước không chờ thật`;
    case 'waitDownload': return `⬇ Chờ tải xong ${fmtWaitDownload(s)} – xem trước không chờ thật`;
    case 'readTable': return `▦ Đọc bảng: ${fmtReadTable(s)} – bảng biết khi chạy thật`;
    case 'readDocument': return `📝 Đọc tài liệu: ${fmtReadDocument(s)} – chữ biết khi chạy thật`;
    case 'pageText': return `📄 Đọc chữ trang: ${fmtPageText(s)} – chữ biết khi chạy thật`;
    case 'savePdf': return `📄 Lưu trang ra PDF: ${fmtSavePdf(s, refOf)} – xem trước không đụng trình duyệt thật`;
    case 'browserGo': return `🗂 Đi tới URL: ${fmtBrowserGo(s, refOf)} – xem trước không đụng trình duyệt thật`;
    case 'browserNorm': return `🗂 Chuẩn hoá trình duyệt: ${fmtBrowserNorm(s, refOf)} – xem trước không đụng trình duyệt thật`;
    case 'browserTab': return `🗂 Tab trình duyệt: ${fmtBrowserTab(s, refOf)} – xem trước không đụng trình duyệt thật`;
    case 'window': return `🪟 Cửa sổ: ${fmtWindow(s)} – xem trước không đổi cửa sổ thật`;
    case 'file': return `📄 ${fmtFile(s)}`;
    case 'http': return `🌐 ${fmtHTTP(s)} – kết quả biết khi chạy thật`;
    case 'clipboard': return `📋 Clipboard: ${fmtClip(s)}`;
    case 'waitScreen': return `⏳ Chờ màn hình ${fmtWaitScreen(s, refOf)} – xem trước không chờ thật`;
    case 'findAll': return `🔍 Tìm tất cả ${fmtPos(s, refOf)} – số chỗ biết khi chạy thật`;
    case 'screenshot': return `📷 Chụp ${fmtShot(s, refOf)}`;
  }
  return null;
}

export async function playNode(s: Step, e: Ends | undefined, p: Player) {
  const bubble = bubbleOf(s);
  if (bubble !== null) {
    p.patch({ bubble });
    return p.wait(KEY_SHOW_MS);
  }
  switch (s.type) {
    case 'click':
      for (let n = 0; n < Math.max(s.clicks, 1); n++) {
        if (e?.start) await p.travel(e.start, s);
        p.ripple(p.pos!);
        if (n < s.clicks - 1) await p.wait(s.clickInterval);
      }
      return;
    case 'double':
      if (e?.start) await p.travel(e.start, s);
      p.ripple(p.pos!);
      await p.wait(100);
      p.ripple(p.pos!);
      return;
    case 'hold':
      if (e?.start) await p.travel(e.start, s);
      p.patch({ pressed: true, bubble: `Giữ ${s.holdMs} ms` });
      p.ripple(p.pos!, s.holdMs);
      await p.wait(s.holdMs);
      p.patch({ pressed: false, bubble: '' });
      return;
    case 'drag':
      if (!e?.start || !e.end) return;
      await p.travel(e.start, s);
      p.patch({ pressed: true });
      await p.travel(e.end, s, s.dragMs);
      p.patch({ pressed: false });
      return;
    case 'path': { // một nét liền: tới đỉnh đầu, giữ, đi qua các đỉnh – thời gian chia theo độ dài như engine (draw.go)
      const v = pathVertices(s, e?.pts ?? []);
      if (!v || v.length < 2) return;
      await p.travel(v[0], s);
      p.patch({ pressed: true });
      const len = (i: number) => Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y);
      const total = v.slice(1).reduce((n, _, i) => n + len(i + 1), 0) || 1;
      for (let i = 1; i < v.length; i++) await p.moveTo(v[i], Math.max((s.dragMs * len(i)) / total, 1), true);
      p.patch({ pressed: false });
      return;
    }
    case 'type':
      for (let n = 1; n <= [...s.text].length; n++) {
        p.patch({ bubble: `⌨ ${[...s.text].slice(0, n).join('')}` });
        await p.wait(TYPE_CHAR_MS);
      }
      return;
    case 'key': case 'webKey':
      p.patch({ bubble: `⌨ ${fmtKey(s)}${s.type === 'webKey' ? ' (Chrome của app)' : ''}` });
      return p.wait(KEY_SHOW_MS);
    case 'scroll': return playScroll(s, e, p);
    case 'waitImage':
      // không biết trước ảnh hiện lúc nào – chờ tượng trưng (≤ 1 s), ghi rõ ngưỡng / thời gian chờ tối đa
      p.patch({ bubble: s.findBy === 'text' ? `Chờ chữ “${s.findText}” (tối đa ${(s.timeoutMs ?? 0) / 1000} s)` : `Chờ ảnh (khớp ≥ ${s.threshold}%, tối đa ${(s.timeoutMs ?? 0) / 1000} s)` });
      return p.wait(Math.min(s.timeoutMs ?? 0, 1000));
    case 'waitPixel':
      if (e?.start) await p.travel(e.start, s);
      p.patch({ bubble: `Chờ màu ${s.color} ±${s.tolerance}` });
      return p.wait(Math.min(s.timeoutMs ?? 0, 800));
    case 'wait':
      return;
    default: // node điều khiển: cổng đi theo menu Nhánh (flow/preview.ts) – chỉ hiện tên node
      p.patch({ bubble: stepLabel(s) });
      return p.wait(KEY_SHOW_MS);
  }
}

async function playScroll(s: Step, e: Ends | undefined, p: Player) {
  if (e?.start) await p.travel(e.start, s);
  // cuộn tại chuột: từ chỗ con trỏ giả đang đứng (chưa có thì giữa vùng / màn hình)
  const b = boundsOf(p.region);
  const from = e?.start ?? p.pos ?? { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const d = scrollDelta(s);
  const dir = s.direction ?? 'down';
  const dist = Math.abs(d.x || d.y);
  p.patch({ bubble: '' }); // trang thu nhỏ cạnh con trỏ đã ghi quãng cuộn
  // cuộn dài thì xem trước lâu hơn chút để kịp thấy trang trượt (tối đa ~2,5 s)
  const base = p.offset;
  await p.animate(Math.min(Math.max(SCROLL_MIN_MS, (s.amount ?? 0) * 60), 2500), (k) => {
    const e2 = 1 - (1 - k) ** 2;
    p.offset = { x: base.x + d.x * e2, y: base.y + d.y * e2 };
    p.patch({ scroll: { from, dir, dist, view: { w: b.w, h: b.h }, k: e2 }, offset: p.offset });
  });
  await p.wait(600);
  p.patch({ scroll: null });
}
