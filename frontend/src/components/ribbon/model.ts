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
import type { MsgKey } from '../../i18n/vi';
import type { Translate } from '../../i18n/core';

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

export const RIBBON_TABS: { id: RibbonTabId; key: MsgKey }[] = [
  { id: 'home', key: 'rb.tab.home' },
  { id: 'insert', key: 'rb.tab.insert' },
  { id: 'run', key: 'rb.tab.run' },
  { id: 'view', key: 'rb.tab.view' },
  { id: 'tools', key: 'rb.tab.tools' },
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
  t: Translate;
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
  const t = c.t;
  const a = c.act;
  const sel = !!c.selectedRef;
  const none = c.picked === 0 && !sel;
  return [
    { id: 'clip', label: t('rb.g.clip'), items: [
      big({ id: 'paste', label: t('rb.paste'), icon: 'paste', hotkey: `${MOD}V`, title: t('rb.t.paste', { mod: MOD }), onClick: a.paste }),
      { id: 'cut', label: t('rb.cut'), icon: 'cut', disabled: none, title: t('rb.t.cut'), onClick: a.cut },
      { id: 'copy', label: t('rb.copy'), icon: 'copy', hotkey: `${MOD}C`, disabled: none, title: t('rb.t.copy', { mod: MOD }), onClick: a.copy },
      { id: 'dup', label: t('rb.dup'), icon: 'dup', disabled: !sel, title: t('rb.t.dup'), onClick: a.duplicate },
    ] },
    { id: 'edit', label: t('rb.g.edit'), items: [
      { id: 'undo', label: t('rb.undo'), icon: 'undo', hotkey: `${MOD}Z`, disabled: !c.canUndo, title: t('rb.t.undo', { mod: MOD }), onClick: a.undo },
      { id: 'redo', label: t('rb.redo'), icon: 'redo', hotkey: `${MOD}Y`, disabled: !c.canRedo, title: t('rb.t.redo', { mod: MOD }), onClick: a.redo },
      { id: 'del', label: t('rb.del'), icon: 'del', hotkey: 'Delete', disabled: none, title: t('rb.t.del'), onClick: a.remove },
    ] },
    { id: 'select', label: t('rb.g.select'), items: [
      { id: 'all', label: t('rb.all'), icon: 'all', hotkey: `${MOD}A`, disabled: !c.hasSteps, title: t('rb.t.all', { mod: MOD }), onClick: a.selectAll },
    ] },
    { id: 'group', label: t('rb.g.group'), items: [
      big({ id: 'group', label: t('rb.group'), icon: 'group', hotkey: `${MOD}G`, disabled: c.picked < 2, title: c.picked < 2 ? t('rb.t.group2') : t('rb.t.groupN', { mod: MOD }), onClick: a.group }),
    ] },
    { id: 'node', label: t('rb.g.node'), items: [
      { id: 'toggle', label: c.selectedOn ? t('rb.nodeOff') : t('rb.nodeOn'), icon: 'power', disabled: !sel, title: t('rb.t.toggle'), onClick: a.toggleNode },
      { id: 'start', label: t('rb.start'), icon: 'flag', disabled: !sel, title: t('rb.t.start'), onClick: a.setStart },
    ] },
    { id: 'screen', label: t('rb.g.screen'), items: [
      big({ id: 'region', label: t('rb.region'), icon: 'region', title: t('rb.t.region'), onClick: a.region }),
    ] },
  ];
}

// Tab Chèn node: mỗi nhóm node một nhóm ribbon, đủ mọi loại node từ danh mục palette (không chép danh sách).
export function insertGroups(c: RibbonCtx): RibbonGroup[] {
  const t = c.t;
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
        title: it.soon ? t('rb.soon', { when: it.soon }) : `${it.label}${desc}${warn ? ` · ${warn}` : ''}`,
        onClick: it.run ? () => { it.run?.(); } : undefined,
      };
    }),
  }));
  return groups.filter((g) => g.items.length > 0);
}

function run(c: RibbonCtx): RibbonGroup[] {
  const t = c.t;
  const a = c.act;
  const off = c.offline || c.running;
  const sel = !!c.selectedRef;
  const ref = c.selectedRef;
  return [
    { id: 'run', label: t('rb.tab.run'), items: [
      big({ id: 'run', label: c.running ? t('rb.stop') : t('rb.tab.run'), icon: c.running ? 'stop' : 'play', hotkey: 'F8', danger: c.running, disabled: c.offline,
        title: c.offline ? t('rb.t.offline') : c.running ? t('rb.t.stop') : t('rb.t.run'), onClick: () => (c.running ? a.stop() : a.run(false)) }),
      { id: 'from', label: ref ? t('rb.runFromRef', { ref }) : t('rb.runFromSel'), icon: 'from', disabled: off || !sel, title: t('rb.t.from'), onClick: () => a.runFrom(false) },
      { id: 'only', label: ref ? t('rb.runOnlyRef', { ref }) : t('rb.runOnlySel'), icon: 'only', disabled: off || !sel, title: t('rb.t.only'), onClick: () => a.runFrom(true) },
      { id: 'step', label: t('rb.stepRun'), icon: 'step', hotkey: 'F10', disabled: off, title: t('rb.t.step'), onClick: a.runStep },
      { id: 'inputs', label: t('rb.inputsRun'), icon: 'pack', disabled: off || !c.hasInputs, title: c.hasInputs ? t('rb.t.inputs') : t('rb.t.noInputs'), onClick: () => a.run(true) },
    ] },
    ...(c.slots.loop ? [{ id: 'loop', label: t('rb.g.loop'), items: [{ id: 'loop', label: t('rb.g.loop'), size: 'big' as const, custom: c.slots.loop }] }] : []),
    { id: 'try', label: t('rb.g.try'), items: [
      big({ id: 'preview', label: t('rb.preview'), icon: 'eye', title: t('rb.t.preview'), onClick: a.preview }),
      { id: 'record', label: t('rb.record'), icon: 'record', hotkey: 'F9', danger: true, disabled: off, title: t('rb.t.record'), onClick: a.record },
    ] },
    { id: 'result', label: t('rb.g.result'), items: [
      { id: 'history', label: t('rb.history'), icon: 'history', title: t('rb.t.history'), onClick: a.history },
      { id: 'bundle', label: t('rb.bundle'), icon: 'zip', disabled: c.offline, title: t('rb.t.bundle'), onClick: a.bundle },
    ] },
  ];
}

function view(c: RibbonCtx): RibbonGroup[] {
  const t = c.t;
  const a = c.act;
  return [
    { id: 'card', label: t('rb.g.card'), items: [
      big({ id: 'compact', label: t('rb.compact'), icon: 'card', active: c.card === 'compact', title: t('rb.t.compact'), onClick: () => a.card('compact') }),
      big({ id: 'full', label: t('rb.full'), icon: 'full', active: c.card === 'full', title: t('rb.t.full'), onClick: () => a.card('full') }),
    ] },
    { id: 'show', label: t('rb.g.detail'), items: [
      { id: 'panel', label: t('rb.panel'), icon: 'panel', active: c.detail === 'panel', title: t('rb.t.panel'), onClick: () => a.detail('panel') },
      { id: 'modal', label: t('rb.modal'), icon: 'full', active: c.detail === 'modal', title: t('rb.t.modal'), onClick: () => a.detail('modal') },
      { id: 'pop', label: t('rb.pop'), icon: 'card', active: c.detail === 'pop', title: t('rb.t.pop'), onClick: () => a.detail('pop') },
    ] },
    { id: 'pane', label: t('rb.g.show'), items: [
      { id: 'pin', label: t('rb.pin'), icon: 'pin', active: c.pinned, disabled: c.detail !== 'panel', title: t('rb.t.pin'), onClick: () => a.pin(!c.pinned) },
      { id: 'minimap', label: t('rb.minimap'), icon: 'map', active: c.minimap, title: t('rb.t.minimap'), onClick: () => a.minimap(!c.minimap) },
    ] },
    { id: 'zoom', label: t('rb.g.zoom'), items: [
      big({ id: 'fit', label: t('rb.fit'), icon: 'fit', title: t('rb.t.fit'), onClick: a.fit }),
      { id: 'zin', label: t('rb.zin'), icon: 'zin', onClick: a.zoomIn },
      { id: 'zout', label: t('rb.zout'), icon: 'zout', onClick: a.zoomOut },
      { id: 'z100', label: '100%', icon: 'target', onClick: a.zoom100 },
    ] },
    { id: 'layout', label: t('rb.g.layout'), items: [
      big({ id: 'layout', label: t('rb.layout'), icon: 'layout', disabled: !c.hasSteps, title: t('rb.t.layout'), onClick: a.layout }),
    ] },
    { id: 'theme', label: t('rb.g.theme'), items: [
      { id: 'light', label: t('theme.light'), icon: 'sun', active: c.theme === 'light', onClick: () => a.theme('light') },
      { id: 'dark', label: t('theme.dark'), icon: 'moon', active: c.theme === 'dark', onClick: () => a.theme('dark') },
      { id: 'system', label: t('theme.system'), icon: 'monitor', active: c.theme === 'system', onClick: () => a.theme('system') },
    ] },
  ];
}

function tools(c: RibbonCtx): RibbonGroup[] {
  const t = c.t;
  const a = c.act;
  return [
    { id: 'screen', label: t('rb.g.screen'), items: [
      big({ id: 'point', label: t('rb.point'), icon: 'target', title: t('rb.t.point'), onClick: a.pickPoint }),
      { id: 'region', label: t('rb.pickRegion'), icon: 'region', title: t('rb.t.pickRegion'), onClick: a.region },
    ] },
    ...(c.slots.pageCheck ? [{ id: 'web', label: t('rb.g.web'), items: [{ id: 'pagecheck', label: t('rb.pageCheck'), size: 'big' as const, custom: c.slots.pageCheck }] }] : []),
    { id: 'ai', label: t('rb.g.ai'), items: [
      big({ id: 'mcp', label: t('rb.mcp'), icon: 'plug', title: t('rb.t.mcp'), onClick: a.mcp }),
    ] },
    { id: 'app', label: t('rb.g.app'), items: [
      big({ id: 'settings', label: t('rb.settings'), icon: 'gear', hotkey: `${MOD},`, title: t('rb.t.settings', { mod: MOD }), onClick: a.settings }),
      { id: 'guide', label: t('rb.guide'), icon: 'help', hotkey: 'F1', title: t('rb.t.guide'), onClick: a.guide },
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
