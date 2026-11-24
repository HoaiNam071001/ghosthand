import { describe, expect, it, vi } from 'vitest';
import { buildRibbon, columnsOf, RIBBON_TABS, RibbonActions, RibbonCtx, RibbonItem } from './model';
import { translate } from '../../i18n/core';
import type { PaletteGroup } from '../PaletteView';

// Danh mục giả (groups.ts kéo theo store → cần window); model chỉ dựng nút từ danh mục được đưa vào
const run = () => {};
const GROUPS: PaletteGroup[] = [
  { cat: 'mouse', items: [{ icon: 'click', label: 'Click', keywords: '', run }, { icon: 'drag', label: 'Kéo thả', keywords: '', run }] },
  { cat: 'wait', items: [{ icon: 'wait', label: 'Chờ', keywords: '', run }, { icon: 'waitImage', label: 'Chờ ảnh', keywords: '', soon: 'bước 99' }] },
];
const noop = () => {};
const act = new Proxy({}, { get: () => noop }) as RibbonActions;
const ctx = (p: Partial<RibbonCtx> = {}): RibbonCtx => ({
  t: (k, v) => translate('vi', k, v), running: false, offline: false, hasInputs: false, hasSteps: true, selectedOn: true, picked: 0, canUndo: true, canRedo: false,
  card: 'compact', detail: 'panel', pinned: false, minimap: true, theme: 'system', insert: GROUPS, slots: {}, act, ...p,
});

describe('ribbon model', () => {
  it('mọi tab có nhóm, id nút không trùng trong tab', () => {
    for (const t of RIBBON_TABS) {
      const groups = buildRibbon(t.id, ctx({ slots: { pageCheck: 'y' } }));
      expect(groups.length, t.id).toBeGreaterThan(0);
      const ids = groups.flatMap((g) => g.items.map((i) => `${g.id}/${i.id}`));
      expect(new Set(ids).size, t.id).toBe(ids.length);
      for (const g of groups) for (const i of g.items) expect(i.label, `${t.id}/${g.id}`).not.toBe('');
    }
  });

  it('nút thường luôn có việc để làm (trừ khi tắt / nút có popup riêng)', () => {
    for (const t of RIBBON_TABS) {
      for (const g of buildRibbon(t.id, ctx({ selectedRef: 'n1', slots: { pageCheck: 'y' } }))) {
        for (const i of g.items) expect(i.onClick || i.custom || i.disabled, `${t.id}/${g.id}/${i.id}`).toBeTruthy();
      }
    }
  });

  it('tab Chèn node lấy đủ node từ danh mục palette', () => {
    const groups = buildRibbon('insert', ctx());
    const n = groups.filter((g) => g.id !== 'wispPick').reduce((s, g) => s + g.items.length, 0);
    expect(n).toBe(GROUPS.reduce((s, g) => s + g.items.length, 0));
  });

  it('ô tìm node lọc nút theo tên / từ khoá không dấu', () => {
    const g = buildRibbon('insert', ctx({ insertQuery: 'keo tha' }));
    expect(g.flatMap((x) => x.items.map((i) => i.label))).toEqual(['Kéo thả']);
    expect(buildRibbon('insert', ctx({ insertQuery: 'zzz' }))).toEqual([]);
  });

  it('nút node bấm vào gọi đúng hành động thêm node', () => {
    const run = vi.fn();
    const g = buildRibbon('insert', ctx({ insert: [{ cat: 'wait', items: [{ icon: 'wait', label: 'Chờ', keywords: '', run }] }] }));
    g.find((x) => x.id !== 'wispPick')!.items[0].onClick?.();
    expect(run).toHaveBeenCalledOnce();
  });

  it('nút Chọn element: tắt khi Wisp chưa sẵn sàng, bật thì gọi pickElement; ẩn khi đang tìm node', () => {
    const pick = vi.fn();
    const find = (c: RibbonCtx) => buildRibbon('insert', c).flatMap((g) => g.items).find((i) => i.id === 'pickElement');
    expect(find(ctx({ wisp: { ready: false, problem: 'chưa mở Wisp' } }))!.disabled).toBe(true);
    expect(find(ctx({ wisp: { ready: false, problem: 'chưa mở Wisp' } }))!.title).toContain('chưa mở Wisp');
    const on = find(ctx({ wisp: { ready: true, problem: '' }, act: { ...act, pickElement: pick } as RibbonActions }))!;
    expect(on.disabled).toBe(false);
    on.onClick?.();
    expect(pick).toHaveBeenCalledOnce();
    expect(find(ctx({ insertQuery: 'cho' }))).toBeUndefined();
  });

  it('Gom nhóm chỉ bật khi chọn từ 2 node; Chạy từ node cần có node chọn', () => {
    const find = (tab: 'home' | 'run', id: string, c: RibbonCtx) => buildRibbon(tab, c).flatMap((g) => g.items).find((i) => i.id === id)!;
    expect(find('home', 'group', ctx({ picked: 1 })).disabled).toBe(true);
    expect(find('home', 'group', ctx({ picked: 2 })).disabled).toBe(false);
    expect(find('run', 'from', ctx()).disabled).toBe(true);
    expect(find('run', 'from', ctx({ selectedRef: 'n2' })).label).toBe('Chạy từ n2');
    expect(find('run', 'from', ctx({ selectedRef: 'n2', running: true })).disabled).toBe(true);
  });

  it('nút Chạy đổi thành Dừng khi đang chạy', () => {
    const find = (c: RibbonCtx) => buildRibbon('run', c).flatMap((g) => g.items).find((i) => i.id === 'run')!;
    expect(find(ctx()).label).toBe('Chạy');
    expect(find(ctx({ running: true })).label).toBe('Dừng');
    expect(find(ctx({ offline: true })).disabled).toBe(true);
  });
});

describe('columnsOf', () => {
  const it3 = (id: string, size?: 'big'): RibbonItem => ({ id, label: id, size });
  it('nút lớn đứng riêng, nút nhỏ xếp chồng 3 / cột', () => {
    const cols = columnsOf([it3('a', 'big'), it3('b'), it3('c'), it3('d'), it3('e'), it3('f', 'big'), it3('g')]);
    expect(cols.map((c) => c.map((i) => i.id).join(''))).toEqual(['a', 'bcd', 'e', 'f', 'g']);
  });
});
