// Danh sách lệnh của ribbon (bước 63) – dữ liệu thuần, không React/store: RibbonHost đưa ngữ cảnh (trạng thái + hàm xử lý) vào,
// các hàm dưới trả nhóm nút theo tab. Nhờ vậy ribbon của app thật và màn mẫu (#demo*) dùng chung một danh sách, có test.
import type { ReactNode } from 'react';
import type { RibbonIconName } from './ribbonIcons';
import type { StepIconName } from '../icons';
import type { NodeCategory } from '../../flow/category';
import { categoryName } from '../../flow/category';
import { fold } from '../../fold';
import type { PaletteGroup } from '../PaletteView';
import type { CardMode } from '../flow/model';
import type { DetailMode } from '../../flowPrefs';
import type { Theme } from '../../theme';
import type { RibbonTabId } from '../../shellStore';

export type RibbonItem = {
  id: string;
  label: string;
  icon?: RibbonIconName;
  step?: StepIconName; // icon loại node (tab Chèn node) – thay cho icon
  cat?: NodeCategory; // tô màu nhóm node
  size?: 'big' | 'small'; // mặc định small; big đứng riêng một cột, small xếp chồng 3 nút / cột
  hotkey?: string;
  title?: string;
  disabled?: boolean;
  active?: boolean; // đang bật (kiểu thẻ đang chọn, inspector ghim…)
  danger?: boolean;
  onClick?: () => void;
  custom?: ReactNode; // nút có popup riêng (Nhúng kịch bản, Thử trang…) – RibbonHost truyền sẵn
};
export type RibbonGroup = { id: string; label: string; items: RibbonItem[] };

export const RIBBON_TABS: { id: RibbonTabId; label: string }[] = [
  { id: 'home', label: 'Soạn' },
  { id: 'insert', label: 'Chèn node' },
  { id: 'run', label: 'Chạy' },
  { id: 'view', label: 'Xem' },
  { id: 'tools', label: 'Công cụ' },
];

// Hàm xử lý do RibbonHost nối vào store / Go; màn mẫu truyền hàm giả.
export type RibbonActions = {
  paste(): void; cut(): void; copy(): void; duplicate(): void; undo(): void; redo(): void; remove(): void; selectAll(): void;
  group(): void; toggleNode(): void; setStart(): void;
  run(ask: boolean): void; stop(): void; runFrom(only: boolean): void; runStep(): void; preview(): void; record(): void; history(): void; bundle(): void;
  card(m: CardMode): void; detail(m: DetailMode): void; pin(on: boolean): void; minimap(on: boolean): void; theme(t: Theme): void;
  zoomIn(): void; zoomOut(): void; zoom100(): void; fit(): void; layout(): void; palette(): void;
  region(): void; pickPoint(): void; settings(): void; mcp(): void; guide(): void;
};

export type RibbonCtx = {
  running: boolean;
  offline: boolean; // trình duyệt, không có Go – nút chạy tắt
  hasInputs: boolean;
  hasSteps: boolean;
  selectedRef?: string; // node đang chọn ('' / undefined = chưa chọn)
  selectedOn: boolean;
  picked: number; // số node chọn cùng lúc
  canUndo: boolean;
  canRedo: boolean;
  card: CardMode;
  detail: DetailMode;
  pinned: boolean;
  minimap: boolean;
  theme: Theme;
  insert: PaletteGroup[]; // nhóm node (palette/groups.ts + Của tôi) – không chép danh sách ở đây
  platformWarn?: (type: string | undefined) => string; // "Chỉ macOS – không chạy được trên máy này" hoặc ''
  slots: { pageCheck?: ReactNode; loop?: ReactNode };
  insertQuery?: string; // ô tìm node ở tab Chèn node – lọc nút theo tên / từ khoá (không dấu cũng được) // nút có popup / hộp thoại riêng, RibbonHost truyền sẵn
  act: RibbonActions;
};

const isMac = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');
export const MOD = isMac ? '⌘' : 'Ctrl+';

const big = (i: RibbonItem): RibbonItem => ({ ...i, size: 'big' });

function home(c: RibbonCtx): RibbonGroup[] {
  const a = c.act;
  const sel = !!c.selectedRef;
  const none = c.picked === 0 && !sel;
  return [
    { id: 'clip', label: 'Bộ nhớ tạm', items: [
      big({ id: 'paste', label: 'Dán', icon: 'paste', hotkey: `${MOD}V`, title: `Dán node đã chép (${MOD}V)`, onClick: a.paste }),
      { id: 'cut', label: 'Cắt', icon: 'cut', disabled: none, title: 'Chép rồi xoá node đang chọn', onClick: a.cut },
      { id: 'copy', label: 'Chép', icon: 'copy', hotkey: `${MOD}C`, disabled: none, title: `Chép node đang chọn (${MOD}C)`, onClick: a.copy },
      { id: 'dup', label: 'Nhân bản', icon: 'dup', disabled: !sel, title: 'Nhân bản node đang chọn', onClick: a.duplicate },
    ] },
    { id: 'edit', label: 'Chỉnh sửa', items: [
      { id: 'undo', label: 'Hoàn tác', icon: 'undo', hotkey: `${MOD}Z`, disabled: !c.canUndo, title: `Hoàn tác (${MOD}Z)`, onClick: a.undo },
      { id: 'redo', label: 'Làm lại', icon: 'redo', hotkey: `${MOD}Y`, disabled: !c.canRedo, title: `Làm lại (${MOD}Y)`, onClick: a.redo },
      { id: 'del', label: 'Xoá', icon: 'del', hotkey: 'Delete', disabled: none, title: 'Xoá node đang chọn (kèm cạnh nối vào nó)', onClick: a.remove },
    ] },
    { id: 'select', label: 'Chọn', items: [
      { id: 'all', label: 'Chọn tất cả', icon: 'all', hotkey: `${MOD}A`, disabled: !c.hasSteps, title: `Chọn mọi node (${MOD}A)`, onClick: a.selectAll },
    ] },
    { id: 'group', label: 'Nhóm', items: [
      big({ id: 'group', label: 'Gom nhóm', icon: 'group', hotkey: `${MOD}G`, disabled: c.picked < 2, title: c.picked < 2 ? 'Chọn từ 2 node (Shift + bấm) để gom vào một khung' : `Gom các node đang chọn vào một khung (${MOD}G)`, onClick: a.group }),
    ] },
    { id: 'node', label: 'Node', items: [
      { id: 'toggle', label: c.selectedOn ? 'Tắt node' : 'Bật node', icon: 'power', disabled: !sel, title: 'Node tắt thì bị bỏ qua khi chạy', onClick: a.toggleNode },
      { id: 'start', label: 'Đặt làm bắt đầu', icon: 'flag', disabled: !sel, title: 'Kịch bản bắt đầu chạy từ node này', onClick: a.setStart },
    ] },
    { id: 'screen', label: 'Màn hình', items: [
      big({ id: 'region', label: 'Vùng màn hình', icon: 'region', title: 'Chọn vùng trên màn hình – toạ độ điểm tính theo vùng', onClick: a.region }),
    ] },
  ];
}

// Tab Chèn node: mỗi nhóm node một nhóm ribbon, đủ mọi loại node từ danh mục palette (không chép danh sách).
export function insertGroups(c: RibbonCtx): RibbonGroup[] {
  const words = fold(c.insertQuery ?? '').split(/s+/).filter(Boolean);
  const hit = (g: PaletteGroup, it: PaletteGroup['items'][number]) => words.every((w) => fold(`${it.label} ${it.keywords} ${g.title ?? categoryName(g.cat)}`).includes(w));
  const groups: RibbonGroup[] = c.insert.map((g, k) => ({
    id: `${g.cat}${g.title ? `:${g.title}` : ''}${k}`,
    label: g.title ?? categoryName(g.cat),
    items: g.items.filter((it) => hit(g, it)).map((it) => {
      const warn = c.platformWarn?.(it.type) ?? '';
      const desc = it.info?.desc ? ` – ${it.info.desc}` : '';
      return {
        id: `${g.cat}:${it.key ?? it.label}`, label: it.label, step: it.icon, cat: g.cat, disabled: !it.run,
        title: it.soon ? `Sắp có (${it.soon})` : `${it.label}${desc}${warn ? ` · ${warn}` : ''}`,
        onClick: it.run ? () => { it.run?.(); } : undefined,
      };
    }),
  }));
  return groups.filter((g) => g.items.length > 0);
}

function run(c: RibbonCtx): RibbonGroup[] {
  const a = c.act;
  const off = c.offline || c.running;
  const sel = !!c.selectedRef;
  const ref = c.selectedRef;
  return [
    { id: 'run', label: 'Chạy', items: [
      big({ id: 'run', label: c.running ? 'Dừng' : 'Chạy', icon: c.running ? 'stop' : 'play', hotkey: 'F8', danger: c.running, disabled: c.offline,
        title: c.offline ? 'Chỉ chạy được trong app' : c.running ? 'Dừng kịch bản đang chạy (F8)' : 'Chạy kịch bản (F8)', onClick: () => (c.running ? a.stop() : a.run(false)) }),
      { id: 'from', label: ref ? `Chạy từ ${ref}` : 'Chạy từ node chọn', icon: 'from', disabled: off || !sel, title: 'Chạy một vòng bắt đầu từ node đang chọn – các node trước đó không chạy', onClick: () => a.runFrom(false) },
      { id: 'only', label: ref ? `Chạy riêng ${ref}` : 'Chạy riêng node chọn', icon: 'only', disabled: off || !sel, title: 'Chạy đúng node đang chọn một lần rồi dừng', onClick: () => a.runFrom(true) },
      { id: 'step', label: 'Chạy từng node', icon: 'step', hotkey: 'F10', disabled: off, title: 'Dừng trước mỗi node, bấm Tiếp / F10 để chạy node kế', onClick: a.runStep },
      { id: 'inputs', label: 'Sửa input rồi chạy', icon: 'pack', disabled: off || !c.hasInputs, title: c.hasInputs ? 'Mở form input rồi mới chạy (Shift + bấm Chạy)' : 'Kịch bản chưa có input', onClick: () => a.run(true) },
    ] },
    ...(c.slots.loop ? [{ id: 'loop', label: 'Lặp', items: [{ id: 'loop', label: 'Lặp', size: 'big' as const, custom: c.slots.loop }] }] : []),
    { id: 'try', label: 'Thử', items: [
      big({ id: 'preview', label: 'Xem trước', icon: 'eye', title: 'Xem đường đi các node bằng con trỏ giả, không click thật', onClick: a.preview }),
      { id: 'record', label: 'Ghi thao tác', icon: 'record', hotkey: 'F9', danger: true, disabled: off, title: 'Thu nhỏ app, ghi chuột / phím bạn thao tác thành node – F9 để dừng', onClick: a.record },
    ] },
    { id: 'result', label: 'Kết quả', items: [
      { id: 'history', label: 'Lịch sử chạy', icon: 'history', title: 'Mở trang Lịch sử chạy', onClick: a.history },
      { id: 'bundle', label: 'Gói báo lỗi', icon: 'zip', disabled: c.offline, title: 'Xuất .zip lần chạy gần nhất để gửi báo lỗi', onClick: a.bundle },
    ] },
  ];
}

function view(c: RibbonCtx): RibbonGroup[] {
  const a = c.act;
  return [
    { id: 'card', label: 'Kiểu thẻ', items: [
      big({ id: 'compact', label: 'Gọn', icon: 'card', active: c.card === 'compact', title: 'Thẻ gọn – rê chuột lên thẻ để toả cổng dữ liệu', onClick: () => a.card('compact') }),
      big({ id: 'full', label: 'Đầy đủ', icon: 'full', active: c.card === 'full', title: 'Thẻ đầy đủ có khối VÀO / RA', onClick: () => a.card('full') }),
    ] },
    { id: 'show', label: 'Chi tiết node', items: [
      { id: 'panel', label: 'Bảng bên phải', icon: 'panel', active: c.detail === 'panel', title: 'Chi tiết node mở thành bảng bên phải', onClick: () => a.detail('panel') },
      { id: 'modal', label: 'Hộp thoại', icon: 'full', active: c.detail === 'modal', title: 'Chi tiết node mở giữa màn hình', onClick: () => a.detail('modal') },
      { id: 'pop', label: 'Dưới node', icon: 'card', active: c.detail === 'pop', title: 'Chi tiết node mở ngay dưới thẻ', onClick: () => a.detail('pop') },
    ] },
    { id: 'pane', label: 'Hiện', items: [
      { id: 'pin', label: 'Ghim bảng phải', icon: 'pin', active: c.pinned, disabled: c.detail !== 'panel', title: 'Bảng chi tiết dính cạnh phải (canvas co lại) thay vì nổi trên canvas', onClick: () => a.pin(!c.pinned) },
      { id: 'minimap', label: 'Bản đồ nhỏ', icon: 'map', active: c.minimap, title: 'Bản đồ nhỏ của canvas', onClick: () => a.minimap(!c.minimap) },
    ] },
    { id: 'zoom', label: 'Thu phóng', items: [
      big({ id: 'fit', label: 'Vừa màn hình', icon: 'fit', title: 'Thu phóng cho thấy mọi node', onClick: a.fit }),
      { id: 'zin', label: 'Phóng to', icon: 'zin', onClick: a.zoomIn },
      { id: 'zout', label: 'Thu nhỏ', icon: 'zout', onClick: a.zoomOut },
      { id: 'z100', label: '100%', icon: 'target', onClick: a.zoom100 },
    ] },
    { id: 'layout', label: 'Sắp xếp', items: [
      big({ id: 'layout', label: 'Xếp lại tự động', icon: 'layout', disabled: !c.hasSteps, title: 'Xếp lại vị trí mọi node theo luồng', onClick: a.layout }),
    ] },
    { id: 'theme', label: 'Giao diện', items: [
      { id: 'light', label: 'Sáng', icon: 'sun', active: c.theme === 'light', onClick: () => a.theme('light') },
      { id: 'dark', label: 'Tối', icon: 'moon', active: c.theme === 'dark', onClick: () => a.theme('dark') },
      { id: 'system', label: 'Theo hệ thống', icon: 'monitor', active: c.theme === 'system', onClick: () => a.theme('system') },
    ] },
  ];
}

function tools(c: RibbonCtx): RibbonGroup[] {
  const a = c.act;
  return [
    { id: 'screen', label: 'Màn hình', items: [
      big({ id: 'point', label: 'Lấy toạ độ', icon: 'target', title: 'Mở overlay để bấm lấy điểm trên màn hình', onClick: a.pickPoint }),
      { id: 'region', label: 'Chọn vùng', icon: 'region', title: 'Chọn vùng trên màn hình cho cả kịch bản', onClick: a.region },
    ] },
    ...(c.slots.pageCheck ? [{ id: 'web', label: 'Trang web', items: [{ id: 'pagecheck', label: 'Thử trang', size: 'big' as const, custom: c.slots.pageCheck }] }] : []),
    { id: 'ai', label: 'AI', items: [
      big({ id: 'mcp', label: 'AI qua MCP', icon: 'plug', title: 'Cài đặt → AI: cho AI (Claude, Cursor…) soạn và chạy kịch bản', onClick: a.mcp }),
    ] },
    { id: 'app', label: 'Ứng dụng', items: [
      big({ id: 'settings', label: 'Cài đặt', icon: 'gear', hotkey: `${MOD},`, title: `Cài đặt (${MOD},)`, onClick: a.settings }),
      { id: 'guide', label: 'Hướng dẫn', icon: 'help', hotkey: 'F1', title: 'Hướng dẫn dùng app và từng loại node (F1)', onClick: a.guide },
    ] },
  ];
}

export function buildRibbon(tab: RibbonTabId, c: RibbonCtx): RibbonGroup[] {
  switch (tab) {
    case 'home': return home(c);
    case 'insert': return insertGroups(c);
    case 'run': return run(c);
    case 'view': return view(c);
    case 'tools': return tools(c);
  }
}

// Xếp nút của nhóm thành cột: nút lớn đứng riêng, các nút nhỏ liền nhau xếp chồng `rows` nút / cột.
export function columnsOf(items: RibbonItem[], rows = 3): RibbonItem[][] {
  const cols: RibbonItem[][] = [];
  for (const it of items) {
    const last = cols.at(-1);
    if (it.size === 'big') cols.push([it]);
    else if (last && last[0].size !== 'big' && last.length < rows) last.push(it);
    else cols.push([it]);
  }
  return cols;
}
