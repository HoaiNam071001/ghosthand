import { fmtMs, type Step, type StepType } from '../types';
import { tr } from '../i18n/lang';
import { SCROLL_ARROW } from '../scroll';

// Node web (bước 25d) – tìm phần tử bằng HTML qua Chrome của app.
export const WEB_TYPES = ['webWait', 'webClick', 'webType', 'webRead', 'webScroll'] as const;
export type WebType = typeof WEB_TYPES[number];
export const isWebStep = (t: StepType): t is WebType => (WEB_TYPES as readonly StepType[]).includes(t);
// Ghi chú phạm vi – bảng thêm node, inspector node web và node Mở bằng Chrome của app dùng chung (quyết định 2026-10-18, bước 36).
export const webBasicNote = () => tr('web.basicNote');

// Selector của node web – cùng công thức ParseSelector (internal/model/web.go), test chung testdata/selectors.json.
// Một dòng Step.selectors = "<cách>=<giá trị>", không tiền tố = text; text / aria trong nháy kép = đúng cả chuỗi.
// label= – ô nhập của nhãn (label for / aria-labelledby, không có thì ô đầu tiên sau nhãn trong khối form – 46 A3).
export type SelectorKind = 'text' | 'aria' | 'role' | 'label' | 'css' | 'xpath';
export const SELECTOR_KINDS: SelectorKind[] = ['text', 'aria', 'role', 'label', 'css', 'xpath'];
export const SELECTOR_LABEL: Record<SelectorKind, string> = {
  get text() { return tr('wb.sel.text'); }, aria: 'aria', get role() { return tr('wb.sel.role'); }, get label() { return tr('wb.sel.label'); }, css: 'CSS', xpath: 'XPath',
};
// name: role – tên truy cập phải chứa (role=button[name="Gửi"], kiểu Playwright).
export interface Selector { by: SelectorKind; value: string; exact?: boolean; name?: string }

const ROLE_RE = /^([a-zA-Z]+)\s*(?:\[\s*name\s*=\s*(?:"([^"]*)"|([^\]"]*?))\s*\])?$/;

// null = dòng chưa có giá trị / sai dạng (chạy sẽ báo lỗi).
export function parseSelector(line: string): Selector | null {
  const t = line.trim();
  let sel: Selector = { by: 'text', value: t };
  const eq = t.indexOf('=');
  if (eq >= 0) {
    let by = t.slice(0, eq).trim().toLowerCase();
    if (by === 'aria-label') by = 'aria'; // chép thẳng từ DevTools
    const kind = SELECTOR_KINDS.find((k) => k === by);
    if (kind) sel = { by: kind, value: t.slice(eq + 1).trim() };
  }
  if ((sel.by === 'text' || sel.by === 'aria' || sel.by === 'label') && sel.value.length >= 2 && sel.value.startsWith('"') && sel.value.endsWith('"')) {
    sel = { ...sel, value: sel.value.slice(1, -1), exact: true };
  }
  if (sel.by === 'role' && sel.value !== '') {
    const m = ROLE_RE.exec(sel.value);
    if (!m) return null;
    const name = ((m[2] ?? '') + (m[3] ?? '')).trim();
    sel = { by: 'role', value: m[1].toLowerCase(), ...(name ? { name } : {}) };
  }
  return sel.value === '' ? null : sel;
}

// Các dòng có nội dung của ô selector (dòng trống bỏ qua – như Go).
export const selectorLines = (selectors: string[] | undefined) => (selectors ?? []).filter((l) => l.trim() !== '');

// Dòng chi tiết trên thẻ: cách tìm đầu tiên + số dự phòng.
export function fmtSelectors(selectors: string[] | undefined): string {
  const lines = selectorLines(selectors);
  const first = lines.length ? parseSelector(lines[0]) : null;
  if (!first) return tr('el.noSelector');
  const what = first.by === 'text' || first.by === 'aria' || first.by === 'label' ? `“${first.value}”`
    : first.by === 'role' && first.name ? `${first.value} “${first.name}”` : first.value;
  return `${SELECTOR_LABEL[first.by]} ${what}${lines.length > 1 ? ` (${tr('wb.backup', { n: lines.length - 1 })})` : ''}`;
}

// webRead: đọc gì (Step.readFrom, khớp ReadFrom trong model.go).
export const READ_LABEL = { get ''() { return tr('wb.read.text'); }, get value() { return tr('wb.read.value'); }, get attr() { return tr('wb.read.attr'); } } as const;
export type ReadFrom = Exclude<keyof typeof READ_LABEL, ''>;
// webScroll: cách cuộn (Step.scrollMode, khớp ScrollMode trong model.go).
export const SCROLL_MODE_LABEL = { get ''() { return tr('wb.scroll.to'); }, get in() { return tr('wb.scroll.in'); }, get until() { return tr('wb.scroll.until'); } } as const;
export type ScrollMode = Exclude<keyof typeof SCROLL_MODE_LABEL, ''>;

// Loại node web chọn được chạy nền (Step.webBackground) – webRead vốn không đụng chuột.
export const canBackground = (s: Step) => s.type === 'webWait' || s.type === 'webClick' || s.type === 'webType' || s.type === 'webScroll';

// Dòng chi tiết trên thẻ node web.
export function fmtWebStep(s: Step): string {
  const sel = fmtSelectors(s.selectors);
  const where = `${(s.occurrence ?? 0) > 1 ? ` · ${tr('wb.nth', { n: s.occurrence ?? 0 })}` : ''}${s.webScope === 'dialog' ? ` · ${tr('wb.inDialog')}` : ''}`;
  const tail = `${where}${s.tab ? ` · ${tr('wb.tab', { t: s.tab })}` : ''}${s.webBackground && canBackground(s) ? ` · ${tr('wb.bg')}` : ''} · ${tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) })}`;
  const roll = `${SCROLL_ARROW[s.direction ?? 'down']} ${tr('wb.notches', { n: s.amount ?? 0 })}`;
  switch (s.type) {
    case 'webType': return tr('wb.d.type', { text: s.text, enter: s.webEnter ? ' + Enter' : '', sel }) + tail;
    case 'webRead': return tr('wb.d.read', { what: s.readFrom === 'attr' ? tr('wb.d.attr', { a: s.attr || '?' }) : READ_LABEL[s.readFrom ?? ''], sel }) + tail;
    case 'webScroll':
      return s.scrollMode === 'in' ? tr('wb.d.rollIn', { roll, sel }) + tail
        : s.scrollMode === 'until' ? tr('wb.d.rollUntil', { roll, sel }) + tail
        : tr('wb.d.to', { sel }) + tail;
  }
  return `${sel}${s.webGone ? ` · ${tr('wb.d.gone')}` : ''}${tail}`;
}

// Kết quả "Thử tìm" node web (engine.WebFindResult – Go internal/engine/webfind.go).
export interface WebFind {
  found: boolean; x: number; y: number; w: number; h: number; text: string; selector: string;
  covered: string; offView: boolean; hidden: number; tab: string; noTab: boolean; noDialog?: boolean; count: number; value: string; ms: number;
}

// Dòng kết quả Thử tìm: ok = thấy và click được ngay; warn = thấy nhưng còn vướng / không thấy. read: node Đọc –
// cho xem giá trị sẽ đọc được.
export function webFindText(r: WebFind, tab?: string, read?: boolean): { ok: boolean; text: string } {
  const ms = `${read && r.found ? ` · ${tr('wb.f.read', { v: r.value })}` : ''}${r.count > 1 ? ` · ${tr('wb.f.many', { n: r.count })}` : ''} · ${r.ms} ms`;
  if (r.noTab) return { ok: false, text: tr('wb.f.noTab', { t: tab ?? '' }) };
  if (r.noDialog) return { ok: false, text: tr('wb.f.noDialog') };
  if (!r.found) {
    return { ok: false, text: (r.hidden > 0 ? tr('wb.f.hidden', { n: r.hidden }) : tr('wb.f.none')) + ms };
  }
  const at = tr('wb.f.at', { sel: r.selector, x: r.x + Math.round(r.w / 2), y: r.y + Math.round(r.h / 2) });
  if (r.covered) return { ok: false, text: tr('wb.f.covered', { at, by: r.covered }) + ms };
  if (r.offView) return { ok: true, text: tr('wb.f.offView', { at }) + ms };
  return { ok: true, text: tr('wb.f.seen', { at }) + ms };
}

// Trạng thái Chrome của app (web.Status – Go internal/web/status.go).
export interface BrowserState { open: boolean; login?: boolean; tabs: { title: string; url: string }[] }

// Trang mở lại khi Đăng nhập / Xong: tab đang dùng nếu là trang web, không thì trang trống.
export const loginUrl = (st: BrowserState | null) => {
  const u = st?.tabs[0]?.url ?? '';
  return /^https?:/.test(u) ? u : '';
};

// null = chưa hỏi.
export function browserStatusText(st: BrowserState | null): string {
  if (!st) return tr('wb.st.checking');
  if (st.login) return tr('wb.st.login');
  if (!st.open) return tr('wb.st.closed');
  const top = st.tabs[0];
  const name = top ? ` · ${tr('wb.st.tab', { t: top.title || top.url })}` : '';
  return tr('wb.st.open', { n: st.tabs.length }) + name;
}

// Nhãn hay đổi theo trạng thái ("Messenger" ↔ "Messenger, 1 unread", "Hộp thư (3)") – như model.StableLabel (Go),
// dữ liệu test chung testdata/stable-labels.json. Phần cố định = trước dấu tách đầu tiên mà phía sau có số.
const STABLE_SEPS = [',', '(', '·', '•', '|', ':', ' - ', ' – '];
const hasDigit = (s: string) => /\p{Nd}/u.test(s);

// '' = nhãn không có phần hay đổi (hoặc phần còn lại có số / không có chữ).
export function stableLabel(label: string): string {
  const s = label.trim();
  let cut = -1;
  for (const sep of STABLE_SEPS) {
    const i = s.indexOf(sep);
    if (i > 0 && hasDigit(s.slice(i)) && (cut < 0 || i < cut)) cut = i;
  }
  if (cut < 0) return '';
  const core = s.slice(0, cut).trim();
  return hasDigit(core) || !/\p{L}/u.test(core) ? '' : core;
}

// Selector tìm theo phần cố định (dạng chứa); null = selector đã bền / có {{biến}} / sai dạng / css, xpath.
export function stableSelector(line: string): string | null {
  if (line.includes('{{')) return null;
  const sel = parseSelector(line);
  if (!sel) return null;
  if (sel.by === 'text' || sel.by === 'aria' || sel.by === 'label') {
    const core = stableLabel(sel.value);
    return core ? `${sel.by}=${core}` : null;
  }
  if (sel.by === 'role') {
    const core = stableLabel(sel.name ?? '');
    return core && !core.includes('"') ? `role=${sel.value}[name="${core}"]` : null;
  }
  return null;
}

// Cách sửa khi không tìm thấy (như model.SelectorFix): selector có phần hay đổi → dạng chứa phần cố định; selector đúng
// cả chuỗi (aria="Messenger") mà phần tử đang có tên "Messenger, 1 unread" → bỏ nháy kép. null = không đoán được.
export function selectorFix(lines: string[], nearNames: string[]): string | null {
  for (const line of lines) {
    const fix = stableSelector(line);
    if (fix) return fix;
  }
  for (const line of lines) {
    const sel = line.includes('{{') ? null : parseSelector(line);
    if (!sel?.exact) continue;
    if (nearNames.some((n) => stableLabel(n).toLowerCase() === sel.value.toLowerCase())) return `${sel.by}=${sel.value}`;
  }
  return null;
}
