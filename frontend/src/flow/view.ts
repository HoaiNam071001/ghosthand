// Node (Step) → dữ liệu hiển thị thẻ trên canvas (FlowNodeView): tên, dòng chi tiết, chip, cổng ra có nhãn, cảnh báo,
// trạng thái chạy. Hàm thuần – FlowEditor (app) gọi với dữ liệu thật; test ở view.test.ts.
import type { FlowNodeView, PortView, RunState } from '../components/flow/model';
import { humanLabel, usesHuman } from './human';
import { Cond, fmtMs, isControl, numVarOf, Script, Step, stepLabel } from '../types';
import { fmtPos, matchTags } from './detail';
import { nodeCategory } from './category';
import { firstSelector } from './element';
import { reachable } from './edit';
import { CASE_PREFIX, flowOrder, PORT_FAIL, PORT_SUCCESS, PortShape, portsOf } from './model';
import { checkCalc } from './calc';
import { browserTabOutputs, browserTabWarning } from './browserTab';
import { isTextNode, textDetail, textOutputs, textPortLabel, textWarning } from './textNodes';

// Nhãn + màu cổng ra. Cổng case:<key> lấy nhãn từ case của node.
const PORTS: Record<string, Omit<PortView, 'id'>> = {
  [PORT_SUCCESS]: { label: 'Thành công', kind: 'ok' },
  [PORT_FAIL]: { label: 'Thất bại', kind: 'fail' },
  true: { label: 'Đúng', kind: 'neutral' },
  false: { label: 'Sai', kind: 'neutral' },
  default: { label: 'Khác', kind: 'neutral' },
  none: { label: 'Không thấy', kind: 'neutral' },
  next: { label: 'Còn lượt', kind: 'neutral' },
  done: { label: 'Hết lượt', kind: 'neutral' },
  item: { label: 'Mỗi phần tử', kind: 'neutral' },
  yes: { label: 'Đang chạy', kind: 'neutral' },
  no: { label: 'Không chạy', kind: 'neutral' },
};
export function portView(id: string, s?: Pick<Step, 'type' | 'cases'>): PortView {
  if (id.startsWith(CASE_PREFIX)) {
    const key = id.slice(CASE_PREFIX.length);
    const c = s?.cases?.find((x) => x.key === key);
    return { id, label: c?.label || key, kind: 'neutral' };
  }
  if (id === PORT_SUCCESS && (s?.type === 'setVar' || s?.type === 'calc')) return { id, label: 'Tiếp', kind: 'ok' };
  if (s && isTextNode(s.type)) return { id, label: textPortLabel(s.type, id), kind: id === PORT_FAIL ? 'fail' : 'ok' };
  if (id === 'done' && s?.type === 'forEach') return { id, label: 'Hết danh sách', kind: 'neutral' };
  return { id, ...(PORTS[id] ?? { label: id, kind: 'neutral' }) };
}
export const portViews = (s: PortShape) => portsOf(s).map((p) => portView(p, s));

export const nodeTitle = (s: Step) => s.name || `${stepLabel(s)}${s.type === 'click' && !numVarOf(s, 'clicks') && s.clicks > 1 ? ` ×${s.clicks}` : ''}`;

export type ViewOptions = {
  inputs?: (id: string) => number; // số input ghim vào node
  run?: Map<string, { run: RunState; visits?: number }>; // trạng thái lần chạy đang xem
  pinned?: (id: string) => boolean; // output node đã ghim
};

export function nodeViews(sc: Pick<Script, 'steps' | 'start' | 'edges'>, opt: ViewOptions = {}): FlowNodeView[] {
  const ok = reachable(sc.edges, sc.start);
  const refs = new Map(sc.steps.map((s) => [s.id, s.ref]));
  const refOf = (id: string) => refs.get(id) ?? '?';
  return sc.steps.map((s) => {
    const n = opt.inputs?.(s.id) ?? 0;
    const r = opt.run?.get(s.id);
    return {
      id: s.id,
      ref: s.ref,
      icon: s.type,
      cat: nodeCategory(s),
      title: nodeTitle(s),
      detail: isControl(s.type) ? controlDetail(s) : `${fmtPos(s, refOf)} · ${numVarOf(s, 'delayAfter') ?? fmtMs(s.delayAfter)}`,
      ports: portViews(s),
      enabled: s.enabled,
      chips: [...(n ? [`${n} input`] : []), ...(s.retry?.count ? [`thử lại ${s.retry.count}`] : []),
        ...(s.human && usesHuman(s) ? [`giống người: ${humanLabel(s.human)}`] : [])],
      warn: warningOf(s, ok.has(s.id), refs),
      breakpoint: s.breakpoint,
      pinned: opt.pinned?.(s.id),
      run: r?.run,
      visits: r?.visits,
    };
  });
}

// Cảnh báo khi soạn (không chặn lưu; chạy thì Go kiểm tra đủ): node không đi tới được, click theo ảnh thiếu nguồn,
// node điều khiển thiếu dữ liệu.
function warningOf(s: Step, reachable: boolean, refs: Map<string, string>): string | undefined {
  if (!reachable) return 'Không có đường nào đi tới node này – sẽ không bao giờ chạy';
  if (s.type === 'clickImage' && s.imageSource !== 'search' && !refs.has(s.imageFrom ?? '')) return 'Chưa chọn node lấy chỗ thấy (Chờ ảnh / Chờ chữ)';
  if (s.type === 'if' && s.cond) return condMissing(s.cond);
  if ((s.type === 'switch' || s.type === 'switchScreen') && !s.cases?.length) return 'Chưa có case nào';
  if (s.type === 'switchScreen') {
    for (const c of s.cases ?? []) {
      const m = c.cond ? condMissing(c.cond) : 'chưa có điều kiện';
      if (m) return `Case ${c.label || c.key}: ${m.toLowerCase()}`;
    }
  }
  if (s.type === 'calc' && checkCalc(s.value ?? '')) return s.value?.trim() ? 'Biểu thức sai' : 'Chưa nhập biểu thức';
  if (isTextNode(s.type)) return textWarning(s);
  if (s.type === 'browserTab' || s.type === 'browserGo' || s.type === 'browserNorm' || s.type === 'savePdf') return browserTabWarning(s, refs);
  if (s.type === 'forEach' && listSource(s) === '—') return s.listFrom === 'file' ? 'Chưa chọn file CSV / Excel' : 'Danh sách trống';
  return undefined;
}

// Điều kiện thiếu dữ liệu (chạy sẽ báo lỗi) – undefined = đủ.
export function condMissing(c: Cond): string | undefined {
  switch (c.kind) {
    case 'text': return c.findText?.trim() ? undefined : 'Chưa nhập chữ cần thấy';
    case 'element': return c.selectors?.some((l) => l.trim()) ? undefined : 'Chưa nhập cách tìm phần tử';
    case 'image': return c.template ? undefined : 'Chưa có ảnh mẫu';
    case 'pixel': return c.points?.[0] ? undefined : 'Chưa chọn điểm màu';
    case 'all': case 'any':
      return c.conds?.length ? c.conds.map(condMissing).find(Boolean) : 'Nhóm chưa có điều kiện nào';
    default: return undefined;
  }
}

const OP_TEXT: Record<string, string> = { eq: '=', ne: '≠', contains: 'chứa', gt: '>', lt: '<' };
// Một dòng mô tả điều kiện: thấy chữ “Gửi”, {{x}} > 3, 2 điều kiện (và)…
export function condText(c: Cond): string {
  const neg = c.not ? 'không ' : '';
  switch (c.kind) {
    case 'text': return `${neg}thấy chữ “${c.findText ?? ''}”`;
    case 'element': return `${neg}thấy phần tử ${firstSelector(c.selectors)}`;
    case 'image': return c.template ? `${neg}thấy ảnh (≥ ${c.threshold ?? 90}%${matchTags(c)})` : 'chưa có ảnh mẫu';
    case 'pixel': return `${c.not ? 'khác' : 'có'} màu ${c.color ?? ''}`;
    case 'value': {
      const t = c.op === 'empty' ? `${c.left ?? ''} trống` : `${c.left ?? ''} ${OP_TEXT[c.op ?? 'eq']} ${c.right ?? ''}`;
      return c.not ? `không (${t})` : t;
    }
    default: return `${c.not ? 'không: ' : ''}${c.conds?.length ?? 0} điều kiện (${c.kind === 'all' ? 'và' : 'hoặc'})`;
  }
}

// Nguồn danh sách của Lặp qua danh sách: tên file / biến / số dòng.
export function listSource(s: Pick<Step, 'listFrom' | 'filePath' | 'value'>): string {
  if (s.listFrom === 'file') return s.filePath?.trim() ? s.filePath.trim().split(/[\\/]/).pop()! : '—';
  const v = (s.value ?? '').trim();
  if (!v) return '—';
  if (/^\{\{[^}]+\}\}$/.test(v) || v.startsWith('[')) return v.length > 40 ? `${v.slice(0, 39)}…` : v;
  return `${v.split('\n').filter((l) => l.trim()).length} dòng`;
}

const sec = (ms: number) => `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} s`;
// Dòng chi tiết trên thẻ node điều khiển.
function controlDetail(s: Step): string {
  const n = s.cases?.length ?? 0;
  switch (s.type) {
    case 'if': return `${s.cond ? condText(s.cond) : '—'}${s.timeoutMs ? ` · chờ ${sec(s.timeoutMs)}` : ''}`;
    case 'switch': return `${s.value || '—'} · ${n} case`;
    case 'switchScreen': return `chờ tối đa ${sec(s.timeoutMs ?? 0)} · ${n} case`;
    case 'counter': return `tối đa ${s.max ?? 0} lần`;
    case 'forEach': return listSource(s);
    case 'end': return s.endStatus === 'fail' ? `thất bại${s.message ? ` · ${s.message}` : ''}` : `thành công${s.message ? ` · ${s.message}` : ''}`;
    case 'setVar': return `vars.${s.varName || '?'} ${s.varOp === 'add' ? '+=' : '='} ${s.value ?? ''}`;
    case 'calc': return s.value || '—';
    default: return textDetail(s);
  }
}

// Output node trả về khi thành công – khớp Outputs trong steptypes.go. Node sau đọc bằng {{ref.output.key}}.
export type OutputField = { key: string; desc: string };
const FOUND: OutputField[] = [
  { key: 'x', desc: 'tâm chỗ thấy – X' }, { key: 'y', desc: 'tâm chỗ thấy – Y' }, { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' },
  { key: 'score', desc: '% khớp' }, { key: 'text', desc: 'chữ tìm thấy (tìm theo chữ / phần tử)' },
  { key: 'role', desc: 'vai trò phần tử (tìm theo phần tử)' },
];
const WEB_FOUND: OutputField[] = [
  { key: 'x', desc: 'tâm phần tử – X' }, { key: 'y', desc: 'tâm phần tử – Y' }, { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' },
  { key: 'text', desc: 'chữ của phần tử' }, { key: 'selector', desc: 'cách tìm đã khớp' },
];
// Output mọi node có (CommonOutputs trong steptypes.go, engine điền ở execNode).
const COMMON: OutputField[] = [{ key: 'startedAt', desc: 'giờ bắt đầu' }, { key: 'durationMs', desc: 'thời gian chạy (ms)' }];
export const outputsOf = (s: Step): OutputField[] => [...ownOutputs(s), ...COMMON];
const MOUSE_AT: OutputField[] = [{ key: 'x', desc: 'X chuột dừng' }, { key: 'y', desc: 'Y chuột dừng' }];
// Cửa sổ đang ở trước sau thao tác (Windows) – kiểm tra có bấm / gõ vào đúng app không.
const FOCUS: OutputField[] = [{ key: 'window', desc: 'cửa sổ đang ở trước (tiêu đề)' }, { key: 'windowApp', desc: 'app của cửa sổ đang ở trước' }];
function ownOutputs(s: Step): OutputField[] {
  switch (s.type) {
    case 'click': case 'double': case 'drag': return [...MOUSE_AT, ...FOCUS];
    case 'hold': return [...MOUSE_AT, { key: 'ms', desc: 'thời gian đã giữ (ms)' }];
    case 'wait': return [{ key: 'ms', desc: 'thời gian đã chờ (ms, gồm ngẫu nhiên)' }];
    case 'key': return [{ key: 'keys', desc: 'tổ hợp đã bấm, vd cmd+l' }, ...FOCUS];
    case 'scroll': return [...MOUSE_AT, { key: 'direction', desc: 'hướng đã cuộn' }, { key: 'amount', desc: 'số nấc đã cuộn' }];
    case 'type': return [{ key: 'text', desc: 'chữ đã gõ (sau khi thay biến)' }, ...FOCUS];
    case 'open': return [{ key: 'target', desc: 'URL / app đã mở' }, { key: 'app', desc: 'mở bằng app (trống = mặc định)' },
      { key: 'window', desc: 'cửa sổ mới hiện (không có → cửa sổ đang ở trước)' }, { key: 'windowApp', desc: 'app của cửa sổ đó' },
      { key: 'newWindow', desc: 'có cửa sổ mới hiện trong lúc chờ (true / false)' }];
    case 'waitImage': return FOUND;
    case 'clickImage': return [{ key: 'clickX', desc: 'X đã click' }, { key: 'clickY', desc: 'Y đã click' }, ...(s.imageSource === 'search' ? FOUND : [])];
    case 'waitPixel': return [{ key: 'color', desc: 'màu đọc được' }];
    case 'waitScreen': return [{ key: 'ms', desc: 'thời gian đã chờ (ms)' }, { key: 'diff', desc: '% điểm ảnh đổi ở lần so cuối' }];
    case 'findAll': return [{ key: 'count', desc: 'số chỗ thấy' }, { key: 'items', desc: 'danh sách chỗ thấy [{x, y, w, h, score, text}] – nối vào Lặp qua danh sách' }];
    case 'path': return [{ key: 'x', desc: 'X chỗ nhả chuột' }, { key: 'y', desc: 'Y chỗ nhả chuột' }, { key: 'points', desc: 'số đỉnh đã đi qua' }];
    case 'waitUntil': return [{ key: 'firedAt', desc: 'giờ chạy tiếp (có ms)' }, { key: 'target', desc: 'giờ hẹn' }, { key: 'lateMs', desc: 'trễ so với giờ hẹn (ms)' }, { key: 'ntpOffsetMs', desc: 'giờ chuẩn − giờ máy (ms)' }];
    case 'window': return s.winOp === 'waitClose' ? [] : [{ key: 'title', desc: 'tiêu đề cửa sổ' }, { key: 'app', desc: 'tên app' },
      { key: 'left', desc: 'X góc trên trái' }, { key: 'top', desc: 'Y góc trên trái' }, { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' },
      { key: 'x', desc: 'X tâm cửa sổ' }, { key: 'y', desc: 'Y tâm cửa sổ' }, { key: 'display', desc: 'màn thứ mấy (từ 1)' },
      { key: 'minimized', desc: 'đang thu nhỏ (true / false)' }, { key: 'pid', desc: 'mã tiến trình' }];
    case 'app': return [{ key: 'running', desc: 'đang chạy (true / false)' }, { key: 'pid', desc: 'mã tiến trình' }, { key: 'name', desc: 'tên app' },
      { key: 'id', desc: 'đường dẫn exe / bundle id' }, { key: 'windows', desc: 'số cửa sổ đang mở' }];
    case 'browserTab': case 'browserGo': case 'browserNorm': case 'savePdf': return browserTabOutputs(s);
    case 'sysInfo': return [
      { key: 'batteryPercent', desc: 'pin còn (%, máy bàn = 100)' }, { key: 'hasBattery', desc: 'máy có pin không' }, { key: 'charging', desc: 'đang cắm sạc' },
      { key: 'cpuPercent', desc: 'CPU đang dùng (%)' }, { key: 'memUsedPercent', desc: 'RAM đang dùng (%)' }, { key: 'memFreeMB', desc: 'RAM còn trống (MB)' }, { key: 'memTotalMB', desc: 'RAM tổng (MB)' },
      { key: 'diskFreeGB', desc: 'ổ đĩa còn trống (GB)' }, { key: 'diskTotalGB', desc: 'ổ đĩa tổng (GB)' },
      { key: 'displays', desc: 'số màn hình' }, { key: 'screenWidth', desc: 'rộng màn chính' }, { key: 'screenHeight', desc: 'cao màn chính' }, { key: 'scale', desc: 'tỷ lệ scale màn chính' },
      { key: 'online', desc: 'có mạng' }, { key: 'ip', desc: 'IP của máy' }, { key: 'wifi', desc: 'tên Wi-Fi ("" nếu không có)' },
      { key: 'hostname', desc: 'tên máy' }, { key: 'user', desc: 'tên người dùng' }, { key: 'os', desc: 'darwin | windows' },
    ];
    case 'power': return [{ key: 'action', desc: 'hành động đã làm' }, { key: 'countdownSec', desc: 'số giây đã đếm ngược' }];
    case 'display': return [
      { key: 'theme', desc: 'light | dark (đọc / đổi chế độ)' }, { key: 'dark', desc: 'đang ở chế độ tối' }, { key: 'changed', desc: 'node đã đổi chế độ' },
      { key: 'brightness', desc: 'độ sáng % (-1 nếu không đọc được)' }, { key: 'previous', desc: 'độ sáng / thiết bị trước khi đổi' },
      { key: 'outputName', desc: 'loa mặc định' }, { key: 'inputName', desc: 'micro mặc định' }, { key: 'name', desc: 'thiết bị vừa chọn' }, { key: 'id', desc: 'mã thiết bị vừa chọn' },
      { key: 'items', desc: 'mỗi dòng “loa|micro: tên” máy có' }, { key: 'sound', desc: 'âm đã phát' }, { key: 'waited', desc: 'đã chờ phát xong' },
    ];
    case 'notify': return [{ key: 'title', desc: 'tiêu đề đã hiện' }, { key: 'text', desc: 'nội dung đã hiện' }];
    case 'zip': return [
      { key: 'path', desc: 'file .zip vừa tạo / thư mục đã giải nén vào' }, { key: 'count', desc: 'số file' }, { key: 'size', desc: 'tổng dung lượng dữ liệu gốc (byte)' },
    ];
    case 'inputSource': return [
      { key: 'id', desc: 'mã bộ gõ đang dùng' }, { key: 'name', desc: 'tên bộ gõ đang dùng' }, { key: 'lang', desc: 'ngôn ngữ (en, vi…)' },
      { key: 'vietnamese', desc: 'bộ gõ hệ điều hành là tiếng Việt' }, { key: 'previousId', desc: 'mã bộ gõ trước node' }, { key: 'changed', desc: 'node đã đổi bộ gõ' },
      { key: 'imeApp', desc: 'Unikey / EVKey… đang chạy (trống nếu không)' }, { key: 'items', desc: 'tên các bộ gõ máy có' }, { key: 'hotkey', desc: 'phím tắt đã bấm (toggleIME)' }, { key: 'toggled', desc: 'đã bấm phím tắt đổi chế độ gõ' },
    ];
    case 'process': return [
      { key: 'running', desc: 'có tiến trình khớp (true / false)' }, { key: 'count', desc: 'số tiến trình khớp' },
      { key: 'pid', desc: 'mã tiến trình dùng CPU nhiều nhất' }, { key: 'name', desc: 'tên tiến trình đó' },
      { key: 'cpuPercent', desc: 'tổng CPU (%, 100 = đầy một lõi)' }, { key: 'memMB', desc: 'tổng RAM (MB)' },
      { key: 'items', desc: 'mỗi dòng “tên · pid · CPU · RAM”, nặng → nhẹ' },
    ];
    case 'osShortcut': return [{ key: 'text', desc: 'chữ Shortcut trả về (rỗng nếu không xuất gì)' }];
    case 'shell': return [{ key: 'stdout', desc: 'chữ lệnh in ra (bỏ xuống dòng cuối)' }, { key: 'stderr', desc: 'chữ lỗi lệnh in ra' }, { key: 'exitCode', desc: 'mã thoát (0 = thành công)' }];
    case 'system': return [{ key: 'volume', desc: 'âm lượng sau khi chạy (%)' }, { key: 'muted', desc: 'đang tắt tiếng (true / false)' }];
    case 'file': return s.fileOp === 'trash' ? [{ key: 'count', desc: 'số file đã xoá' }, { key: 'files', desc: 'tên các file đã xoá' }]
      : s.fileOp === 'emptyTrash' ? [] : s.fileOp === 'row' ? [{ key: 'path', desc: 'đường dẫn file' }, { key: 'rows', desc: 'số dòng sau khi thêm' }]
      : s.fileOp === 'mkdir' ? [{ key: 'path', desc: 'đường dẫn thư mục' }] : [{ key: 'path', desc: 'đường dẫn file' }, { key: 'bytes', desc: 'số byte đã ghi' }];
    case 'http': return [{ key: 'status', desc: 'mã HTTP, vd 200' }, { key: 'json', desc: 'JSON trả về – đọc sâu json.data.id' }, { key: 'body', desc: 'phản hồi dạng chữ' }, { key: 'headers', desc: 'header trả về (tên chữ thường)' }];
    case 'clipboard': return s.clipOp === 'image' ? [{ key: 'path', desc: 'file ảnh đã chép' }] : [{ key: 'text', desc: s.clipOp === 'write' ? 'chữ đã ghi' : 'chữ đọc được' }];
    case 'screenshot': return [{ key: 'path', desc: 'đường dẫn file ảnh' }, { key: 'x', desc: 'vùng đã chụp – X trái' }, { key: 'y', desc: 'vùng đã chụp – Y trên' },
      { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' }];
    case 'webWait': return s.webGone ? [] : WEB_FOUND;
    case 'webClick': return [{ key: 'clickX', desc: 'X đã click' }, { key: 'clickY', desc: 'Y đã click' }, ...WEB_FOUND];
    case 'webType': return [{ key: 'text', desc: 'chữ đã gõ (sau khi thay biến)' }, { key: 'clickX', desc: 'X đã click' }, { key: 'clickY', desc: 'Y đã click' },
      ...WEB_FOUND.filter((f) => f.key !== 'text')];
    case 'waitUIEvent': return [{ key: 'event', desc: 'sự kiện đã bắt được' }, { key: 'title', desc: 'tiêu đề cửa sổ (sự kiện cửa sổ)' }, { key: 'app', desc: 'app của cửa sổ' },
      { key: 'role', desc: 'vai trò phần tử (sự kiện phần tử)' }, { key: 'text', desc: 'chữ / tên phần tử' }, { key: 'value', desc: 'giá trị phần tử' },
      { key: 'x', desc: 'tâm X' }, { key: 'y', desc: 'tâm Y' }, { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' }];
    case 'elementAction': return [{ key: 'action', desc: 'thao tác đã làm' }, { key: 'role', desc: 'vai trò phần tử (button, checkbox…)' }, { key: 'text', desc: 'chữ / tên phần tử sau thao tác' }, { key: 'value', desc: 'giá trị sau thao tác (ô nhập, checkbox 0 / 1)' }];
    case 'waitDownload': return [{ key: 'path', desc: 'đường dẫn đầy đủ của file tải về' }, { key: 'name', desc: 'tên file' }, { key: 'size', desc: 'cỡ file (byte)' }];
    case 'readTable': return [{ key: 'rows', desc: 'mảng các dòng, mỗi dòng mảng ô (gồm dòng tên cột)' }, { key: 'items', desc: 'mỗi dòng dữ liệu một đối tượng {tên cột không dấu: giá trị} – nối vào Lặp qua danh sách' }, { key: 'columns', desc: 'tên các cột' }, { key: 'count', desc: 'số dòng dữ liệu' }, { key: 'path', desc: 'file đã ghi (khi có Ghi ra file)' }];
    case 'readDocument': return [{ key: 'text', desc: 'nội dung nguyên văn, giữ xuống dòng' }, { key: 'length', desc: 'số ký tự' }, { key: 'lines', desc: 'số dòng' }];
    case 'pageText': return [{ key: 'text', desc: 'toàn bộ chữ, mỗi khối một dòng' }, { key: 'lines', desc: 'mảng các dòng (nối vào Lặp qua danh sách)' }, { key: 'count', desc: 'số dòng' }];
    case 'elementRead': return [{ key: 'text', desc: s.readPattern || s.readNumber ? 'giá trị sau khi lọc' : 'chữ / giá trị đọc được' },
      ...(s.readPattern || s.readNumber ? [{ key: 'raw', desc: 'chữ đọc được trước khi lọc' }] : []),
      ...(s.readChange ? [{ key: 'old', desc: 'giá trị trước khi đổi' }] : []),
      { key: 'count', desc: s.findBy === 'text' ? 'số chỗ thấy nhãn' : 'số phần tử khớp' }, ...(s.findBy === 'text' ? [] : [{ key: 'role', desc: 'vai trò phần tử' }]),
      ...FOUND.slice(0, 4)];
    case 'webRead': return [{ key: 'text', desc: 'giá trị đọc được' }, { key: 'count', desc: 'số phần tử khớp' }, { key: 'selector', desc: 'cách tìm đã khớp' }];
    case 'webKey': return [{ key: 'keys', desc: 'tổ hợp đã bấm, vd shift+tab' }, { key: 'tab', desc: 'URL tab đã bấm' }];
    case 'webScroll': return [...WEB_FOUND, ...(s.scrollMode === 'until' ? [{ key: 'scrolls', desc: 'số lần đã lăn' }] : [])];
    case 'if': return [{ key: 'result', desc: 'true / false' }, ...FOUND.map((f) => ({ ...f, desc: `${f.desc} (điều kiện ảnh / chữ đúng)` }))];
    case 'switch': return [{ key: 'case', desc: 'case khớp (default nếu không)' }, { key: 'value', desc: 'giá trị đã xét' }];
    case 'switchScreen': return [{ key: 'case', desc: 'case hiện trước (none nếu không)' }, ...FOUND];
    case 'counter': return [{ key: 'count', desc: 'số lần đã đi qua' }];
    case 'forEach': return [{ key: 'item', desc: s.listFrom === 'file' ? 'dòng đang xét – item.<cột>' : 'phần tử đang xét (object: item.<khoá>)' },
      { key: 'index', desc: 'thứ tự phần tử (từ 1)' }, { key: 'count', desc: 'số phần tử' }];
    case 'setVar': return [{ key: 'name', desc: 'tên biến' }, { key: 'value', desc: 'giá trị sau khi đặt' }];
    case 'calc': return [{ key: 'value', desc: 'kết quả – số hoặc true / false' }];
    default: return textOutputs(s);
  }
}

// Biến đọc kết quả node khác – gợi ý cho ô chữ {{…}} (khớp lookup trong vars.go). Node khác `self`, theo thứ tự hiển thị;
// mỗi node: output khi thành công, rồi status / error.message.
export type NodeVar = { key: string; label: string };
export function nodeVarOptions(sc: Pick<Script, 'steps' | 'start' | 'edges'>, self: string): NodeVar[] {
  const byId = new Map(sc.steps.map((s) => [s.id, s]));
  return flowOrder(sc).flatMap((id) => {
    const s = byId.get(id);
    if (!s || id === self || !s.ref) return [];
    const name = nodeTitle(s);
    return [
      ...outputsOf(s).map((o) => ({ key: `${s.ref}.output.${o.key}`, label: `${name} – ${o.desc}` })),
      { key: `${s.ref}.status`, label: `${name} – success / fail / skipped` },
      { key: `${s.ref}.error.message`, label: `${name} – lời báo lỗi` },
    ];
  });
}

// Node có output x, y (chỗ thấy / chỗ chuột dừng) theo thứ tự flow, trừ self – nút chọn nhanh toạ độ từ biến (F5b).
// base: biến trước .x / .y – Lặp qua danh sách đang lặp items của Tìm tất cả (42 G3) cho phần tử đang lặp: n3.output.item.
export type CoordSource = { ref: string; label: string; base: string };
export function coordSources(sc: Pick<Script, 'steps' | 'start' | 'edges'>, self: string): CoordSource[] {
  const byId = new Map(sc.steps.map((s) => [s.id, s]));
  const byRef = new Map(sc.steps.map((s) => [s.ref, s]));
  return flowOrder(sc).flatMap((id) => {
    const s = byId.get(id);
    if (!s || id === self || !s.ref) return [];
    if (s.type === 'forEach') {
      const src = /\{\{\s*(\w+)\.output\.items\s*\}\}/.exec(s.value ?? '')?.[1];
      return src && byRef.get(src)?.type === 'findAll' ? [{ ref: s.ref, label: `${s.ref} · ${nodeTitle(s)} – chỗ đang lặp`, base: `${s.ref}.output.item` }] : [];
    }
    const keys = outputsOf(s).map((o) => o.key);
    return keys.includes('x') && keys.includes('y') ? [{ ref: s.ref, label: `${s.ref} · ${nodeTitle(s)}`, base: `${s.ref}.output` }] : [];
  });
}
