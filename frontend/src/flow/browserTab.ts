// Node Tab trình duyệt (bước 43 B1) + Đi tới URL (B2, internal/engine/browsergo.go) – nhãn thao tác / trình duyệt, dòng chi tiết thẻ, cảnh báo thiếu, output. Chạy ở
// internal/engine/browsertab.go (kiểm tra: internal/script/tabcheck.go).
import type { Step } from '../types';
import type { OutputField } from './view';
import { WIN_PRESETS } from './window';
import { tr } from '../i18n/lang';

export type TabOp = '' | 'list' | 'switch' | 'new' | 'close' | 'closeOthers' | 'reload' | 'back' | 'forward' | 'waitOpen' | 'waitClose';
export type BrowserName = '' | 'chrome' | 'edge' | 'brave' | 'coccoc';

export const TAB_OPS: { id: TabOp; label: string }[] = [
  { id: '', get label() { return tr('tab.op.0'); } }, { id: 'list', get label() { return tr('tab.op.1'); } }, { id: 'switch', get label() { return tr('tab.op.2'); } },
  { id: 'new', get label() { return tr('tab.op.3'); } }, { id: 'close', get label() { return tr('tab.op.4'); } }, { id: 'closeOthers', get label() { return tr('tab.op.5'); } },
  { id: 'reload', get label() { return tr('tab.op.6'); } }, { id: 'back', get label() { return tr('tab.op.7'); } }, { id: 'forward', get label() { return tr('tab.op.8'); } },
  { id: 'waitOpen', get label() { return tr('tab.op.9'); } }, { id: 'waitClose', get label() { return tr('tab.op.10'); } },
];

export const BROWSERS: { id: BrowserName; label: string }[] = [
  { id: '', get label() { return tr('tab.browser.0'); } }, { id: 'chrome', get label() { return tr('tab.browser.1'); } }, { id: 'edge', get label() { return tr('tab.browser.2'); } }, { id: 'brave', get label() { return tr('tab.browser.3'); } }, { id: 'coccoc', get label() { return tr('tab.browser.4'); } },
];

// Thao tác làm được với tab của node Mở (khớp TabFromOps – internal/script/tabcheck.go).
export const TAB_FROM_OPS: TabOp[] = ['', 'switch', 'close', 'closeOthers', 'reload', 'back', 'forward', 'waitClose'];
// Thao tác cần chọn tab (mở tab mới / liệt kê thì không).
export const tabTargeted = (op: TabOp) => op !== 'new' && op !== 'list';

type TabStep = Pick<Step, 'tabOp' | 'tab' | 'tabFrom' | 'url' | 'browser'> & { type?: Step['type'] };

// Tab node làm: "tab của n1" / “Gmail” / "tab đang hiện".
function tabTarget(s: TabStep, refOf: (id: string) => string): string {
  if (s.tabFrom && TAB_FROM_OPS.includes(s.tabOp ?? '')) return tr('tab.of', { ref: refOf(s.tabFrom) });
  return s.tab?.trim() ? `“${s.tab.trim()}”` : tr('tab.current');
}

// Dòng chi tiết thẻ: "Đóng tab · tab của n1", "Mở tab mới · example.com", "Liệt kê tab · “gmail” · Edge".
export function fmtBrowserTab(s: TabStep, refOf: (id: string) => string): string {
  const op = s.tabOp ?? '';
  const label = TAB_OPS.find((o) => o.id === op)?.label ?? op;
  const what = op === 'new' ? s.url?.trim() || tr('tab.blank') : op === 'list' ? (s.tab?.trim() ? `“${s.tab.trim()}”` : tr('tab.all')) : tabTarget(s, refOf);
  const browser = s.browser ? ` · ${BROWSERS.find((b) => b.id === s.browser)?.label ?? s.browser}` : '';
  return `${label} · ${what}${browser}`;
}

// Dòng chi tiết node Đi tới URL: "example.com · tab của n1".
export const fmtBrowserGo = (s: TabStep, refOf: (id: string) => string): string =>
  `${s.url?.trim() || tr('tab.noUrl')} · ${tabTarget(s, refOf)}${s.browser ? ` · ${BROWSERS.find((b) => b.id === s.browser)?.label ?? s.browser}` : ''}`;

type NormStep = TabStep & Pick<Step, 'filePath' | 'normZoom' | 'normFullscreen' | 'normSize' | 'normPopups' | 'winPreset' | 'winRect'>;

// Đặt cỡ cửa sổ thiếu đích (khớp validateNorm – bước 61 M4): cần tab node Mở, hoặc trình duyệt + tab – không đổi cỡ trình duyệt đang ở trước.
export function normTargetMissing(s: NormStep): 'browser' | 'tab' | undefined {
  if (!s.normSize || s.tabFrom) return undefined;
  if (!s.browser) return 'browser';
  return s.tab?.trim() ? undefined : 'tab';
}

export const NORM_TARGET_MSG = { get browser() { return tr('tab.normNeedBrowser'); }, get tab() { return tr('tab.normNeedTab'); } };

// Dòng chi tiết node Chuẩn hoá: "Zoom 100 % · Toàn màn hình · Cỡ giữa · tab của n1".
export function fmtBrowserNorm(s: NormStep, refOf: (id: string) => string): string {
  const size = s.winPreset ? tr('tab.size', { v: WIN_PRESETS.find((p) => p.id === s.winPreset)?.label.toLowerCase() ?? '' }) : s.winRect ? tr('tab.size', { v: `${s.winRect.w}×${s.winRect.h}` }) : tr('tab.sizeBare');
  const todo = [s.normFullscreen && tr('tab.exitFs'), s.normSize && size, s.normZoom && tr('tab.zoom'), s.normPopups && tr('tab.popups')].filter(Boolean);
  return `${todo.length ? todo.join(' · ') : tr('tab.noneOn')} · ${tabTarget(s, refOf)}${s.browser ? ` · ${BROWSERS.find((b) => b.id === s.browser)?.label ?? s.browser}` : ''}`;
}

// Dòng chi tiết node Lưu PDF: "~/Downloads/a.pdf · tab của n1".
export const fmtSavePdf = (s: TabStep & Pick<Step, 'filePath'>, refOf: (id: string) => string): string =>
  `${s.filePath?.trim() || tr('tab.noSave')} · ${tabTarget(s, refOf)}${s.browser ? ` · ${BROWSERS.find((b) => b.id === s.browser)?.label ?? s.browser}` : ''}`;

// Cảnh báo khi soạn (khớp validateTab / validateTabFrom); refs: id các node còn trong kịch bản.
export function browserTabWarning(s: NormStep, refs: Map<string, string>): string | undefined {
  const op = s.tabOp ?? '';
  if (s.type === 'browserGo' && !s.url?.trim()) return tr('tab.w.noUrl');
  if (s.type === 'savePdf') {
    const p = s.filePath?.trim() ?? '';
    if (!p) return tr('tab.w.noPdf');
    if (!p.includes('{{') && !/\.pdf$/i.test(p)) return tr('tab.w.pdfExt');
  }
  if (s.type === 'browserNorm') {
    if (!s.normZoom && !s.normFullscreen && !s.normSize && !s.normPopups) return tr('tab.w.noneOn');
    if (s.normSize && !s.winPreset && !(s.winRect && s.winRect.w > 0 && s.winRect.h > 0)) return tr('tab.w.noSize');
    const miss = normTargetMissing(s);
    if (miss) return NORM_TARGET_MSG[miss];
  }
  if (s.tabFrom && TAB_FROM_OPS.includes(op) && !refs.has(s.tabFrom)) return tr('tab.w.gone');
  if (op === 'waitOpen' && !s.tab?.trim()) return tr('tab.w.waitOpen');
  if (op === 'waitClose' && !s.tab?.trim() && !s.tabFrom) return tr('tab.w.waitClose');
  return undefined;
}

const TAB_INFO: OutputField[] = [{ key: 'url', desc: 'URL tab' }, { key: 'title', desc: 'tiêu đề tab' }, { key: 'browser', desc: 'trình duyệt (chrome, edge…)' },
  { key: 'index', desc: 'thứ tự tab trong cửa sổ (từ 1)' }, { key: 'tabId', desc: 'mã tab' }, { key: 'window', desc: 'mã cửa sổ' }];

// Output theo thao tác (khớp tabOutput / items – internal/engine/browsertab.go).
export function browserTabOutputs(s: Pick<Step, 'tabOp'> & { type?: Step['type'] }): OutputField[] {
  if (s.type === 'browserNorm') {
    return [...TAB_INFO, { key: 'left', desc: 'góc trên trái cửa sổ – X' }, { key: 'top', desc: 'góc trên trái – Y' }, { key: 'w', desc: 'rộng cửa sổ' }, { key: 'h', desc: 'cao cửa sổ' },
      { key: 'x', desc: 'tâm cửa sổ – X' }, { key: 'y', desc: 'tâm cửa sổ – Y' }, { key: 'wasFullscreen', desc: 'trước đó đang toàn màn hình' }, { key: 'zoomReset', desc: 'đã gửi phím zoom 100 %' }];
  }
  if (s.type === 'savePdf') return [{ key: 'path', desc: 'đường dẫn file PDF' }, { key: 'name', desc: 'tên file' }, { key: 'size', desc: 'cỡ file (byte)' }, { key: 'url', desc: 'URL tab' }, { key: 'title', desc: 'tiêu đề tab' }];
  if (s.type === 'browserGo') return [...TAB_INFO, { key: 'ms', desc: 'thời gian tới khi tải xong (ms)' }];
  switch (s.tabOp ?? '') {
    case 'list': return [{ key: 'items', desc: 'danh sách tab [{title, url, browser, window, active, tabId}] – nối vào Lặp qua danh sách' }, { key: 'count', desc: 'số tab' }];
    case 'waitClose': return [];
    case 'closeOthers': return [...TAB_INFO, { key: 'closed', desc: 'số tab đã đóng' }];
  }
  return TAB_INFO;
}
