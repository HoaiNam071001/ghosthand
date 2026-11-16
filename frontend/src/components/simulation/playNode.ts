// Xem trước một node: con trỏ giả bay / click / kéo / cuộn hoặc bong bóng chữ theo loại node.
// Simulation (useSimulation) giữ state + đi theo đồ thị, gọi hàm này cho từng node.
import { tr } from '../../i18n/lang';
import { boundsOf, refOf, type Ends } from '../../store';
import { fmtSelectors } from '../../flow/web';
import { fmtOcrRead, fmtShot } from '../../flow/shot';
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
import { fmtAskUser } from '../../flow/askUser';
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
    case 'open': return tr('pnd.open', { t: s.target ?? '', a: s.app ? tr('pnd.openWith', { a: s.app }) : '' });
    case 'clickImage':
      return tr('pnd.click', { w: s.imageSource === 'search' && s.findBy === 'text' ? tr('pnd.byText', { t: s.findText ?? '' }) : tr('pnd.byImage'), s: s.imageSource === 'search' ? tr('pnd.auto') : '' });
    case 'webWait': case 'webClick': case 'webType': case 'webRead': case 'webScroll':
      return tr('pnd.web', { l: stepLabel(s), s: fmtSelectors(s.selectors) });
    case 'waitUntil': return tr('pnd.waitUntil', { v: fmtWaitUntil(s) });
    case 'power': return tr('pnd.power', { v: fmtPower(s) });
    case 'display': return tr('pnd.display', { v: fmtDisplay(s) });
    case 'askAI': return tr('pnd.askAI', { v: fmtAskAI(s) });
    case 'mcpTool': return tr('pnd.mcp', { v: fmtMCPTool(s) });
    case 'notify': return tr('pnd.notify', { v: fmtNotify(s) });
    case 'askUser': return tr('pnd.askUser', { v: fmtAskUser(s) });
    case 'zip': return tr('pnd.zip', { v: fmtZip(s) });
    case 'inputSource': return tr('pnd.ime', { v: fmtInputSource(s) });
    case 'process': return tr('pnd.proc', { v: fmtProcess(s) });
    case 'sysInfo': return tr('pnd.sys');
    case 'osShortcut': return tr('pnd.osShortcut', { v: fmtOSShortcut(s) });
    case 'shell': return tr('pnd.shell', { v: fmtShell(s) });
    case 'system': return `🔊 ${fmtSystem(s)}`;
    case 'app': return tr('pnd.app', { v: fmtApp(s) });
    case 'elementAction': return tr('pnd.elAct', { v: fmtElementAction(s) });
    case 'waitUIEvent': return tr('pnd.uiEv', { v: fmtWaitUIEvent(s) });
    case 'waitDownload': return tr('pnd.dl', { v: fmtWaitDownload(s) });
    case 'readTable': return tr('pnd.table', { v: fmtReadTable(s) });
    case 'readDocument': return tr('pnd.doc', { v: fmtReadDocument(s) });
    case 'pageText': return tr('pnd.pageText', { v: fmtPageText(s) });
    case 'savePdf': return tr('pnd.pdf', { v: fmtSavePdf(s, refOf) });
    case 'browserGo': return tr('pnd.go', { v: fmtBrowserGo(s, refOf) });
    case 'browserNorm': return tr('pnd.norm', { v: fmtBrowserNorm(s, refOf) });
    case 'browserTab': return tr('pnd.tab', { v: fmtBrowserTab(s, refOf) });
    case 'window': return tr('pnd.win', { v: fmtWindow(s) });
    case 'file': return `📄 ${fmtFile(s)}`;
    case 'http': return tr('pnd.http', { v: fmtHTTP(s) });
    case 'clipboard': return tr('pnd.clip', { v: fmtClip(s) });
    case 'waitScreen': return tr('pnd.waitScr', { v: fmtWaitScreen(s, refOf) });
    case 'ocrRead': return tr('pnd.ocr', { v: fmtOcrRead(s, refOf) });
    case 'findAll': return tr('pnd.findAll', { v: fmtPos(s, refOf) });
    case 'screenshot': return tr('pnd.shot', { v: fmtShot(s, refOf) });
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
      p.patch({ pressed: true, bubble: tr('pnd.hold', { n: s.holdMs }) });
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
      p.patch({ bubble: `⌨ ${fmtKey(s)}${s.type === 'webKey' ? tr('pnd.keyApp') : ''}` });
      return p.wait(KEY_SHOW_MS);
    case 'scroll': return playScroll(s, e, p);
    case 'waitImage':
      // không biết trước ảnh hiện lúc nào – chờ tượng trưng (≤ 1 s), ghi rõ ngưỡng / thời gian chờ tối đa
      p.patch({ bubble: s.findBy === 'text' ? tr('pnd.waitText', { t: s.findText ?? '', s: (s.timeoutMs ?? 0) / 1000 }) : tr('pnd.waitImg', { th: s.threshold ?? 0, s: (s.timeoutMs ?? 0) / 1000 }) });
      return p.wait(Math.min(s.timeoutMs ?? 0, 1000));
    case 'waitPixel':
      if (e?.start) await p.travel(e.start, s);
      p.patch({ bubble: tr('pnd.waitPx', { c: s.color ?? '', t: s.tolerance ?? 0 }) });
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
