// Node Cửa sổ (bước 26) – nhãn thao tác, chọn cửa sổ, khung đặt sẵn, dòng chi tiết thẻ. Chạy ở internal/engine/window.go;
// matchWindow / windowPreset cùng công thức MatchWindow / WindowPreset (internal/model/window.go), test chung
// testdata/windows.json, window_presets.json.
import { fold } from '../fold';
import type { Rect, Step } from '../types';
import { tr } from '../i18n/lang';

export type WinOp = '' | 'waitOpen' | 'waitClose' | 'setBounds' | 'minimize' | 'maximize' | 'restore' | 'close' | 'read';
export type WinMatch = '' | 'exact' | 'regex';
export type WinPreset = '' | 'center' | 'left' | 'right' | 'full';

export const WIN_OPS: { id: WinOp; label: string }[] = [
  { id: '', get label() { return tr('win.op.0'); } }, { id: 'setBounds', get label() { return tr('win.op.1'); } },
  { id: 'waitOpen', get label() { return tr('win.op.2'); } }, { id: 'waitClose', get label() { return tr('win.op.3'); } },
  { id: 'minimize', get label() { return tr('win.op.4'); } }, { id: 'maximize', get label() { return tr('win.op.5'); } }, { id: 'restore', get label() { return tr('win.op.6'); } },
  { id: 'close', get label() { return tr('win.op.7'); } }, { id: 'read', get label() { return tr('win.op.8'); } },
];
export const WIN_MATCHES: { id: WinMatch; label: string }[] = [{ id: '', get label() { return tr('win.op.9'); } }, { id: 'exact', get label() { return tr('win.op.10'); } }, { id: 'regex', get label() { return tr('win.op.11'); } }];
export const WIN_PRESETS: { id: WinPreset; label: string }[] = [
  { id: 'left', get label() { return tr('win.op.12'); } }, { id: 'center', get label() { return tr('win.op.13'); } }, { id: 'right', get label() { return tr('win.op.14'); } }, { id: 'full', get label() { return tr('win.op.15'); } }, { id: '', get label() { return tr('win.op.16'); } },
];

// Cửa sổ đang mở – khớp model.WindowInfo (internal/model/window.go).
export interface WindowInfo { id: number; title: string; app: string; appId: string; pid: number; box: Rect; minimized: boolean }

const foldName = (s: string) => fold(s.trim());

// got khớp want theo mode; want '' → khớp mọi chuỗi. Regex sai → ném lỗi.
export function matchName(got: string, want: string, mode: string): boolean {
  if (!want) return true;
  if (mode === 'regex') return new RegExp(want, 'i').test(got);
  return mode === 'exact' ? foldName(got) === foldName(want) : foldName(got).includes(foldName(want));
}

// So với tên hiển thị, id (đường dẫn exe / bundle id) và tên tệp trong id.
export function matchApp(name: string, id: string, want: string, mode: string): boolean {
  const names = [name];
  if (id) {
    names.push(id);
    const i = Math.max(id.lastIndexOf('\\'), id.lastIndexOf('/'));
    if (i >= 0 && i < id.length - 1) names.push(id.slice(i + 1));
  }
  return names.some((n) => matchName(n, want, mode));
}

// Chỉ số cửa sổ đầu tiên (thứ tự chồng) khớp app + title; -1 = không có.
export function matchWindow(wins: Pick<WindowInfo, 'title' | 'app' | 'appId'>[], app: string, title: string, mode: string): number {
  return wins.findIndex((w) => matchApp(w.app, w.appId, app, mode) && matchName(w.title, title, mode));
}

// Khung đích setBounds: preset trong vùng làm việc work, cỡ từ want ('' = đúng want).
export function windowPreset(preset: string, work: Rect, want: Rect): Rect {
  let { w, h } = want;
  switch (preset) {
    case 'full': return work;
    case 'left': case 'right':
      if (w <= 0) w = Math.trunc(work.w / 2);
      if (h <= 0) h = work.h;
      break;
    case 'center':
      if (w <= 0) w = Math.trunc(work.w * 2 / 3);
      if (h <= 0) h = Math.trunc(work.h * 2 / 3);
      break;
    default: return want;
  }
  w = Math.min(w, work.w); h = Math.min(h, work.h);
  const r = { x: work.x, y: work.y, w, h };
  if (preset === 'right') r.x = work.x + work.w - w;
  if (preset === 'center') { r.x = work.x + Math.trunc((work.w - w) / 2); r.y = work.y + Math.trunc((work.h - h) / 2); }
  return r;
}

// Output có khung cửa sổ (dùng cho imageFrom) – khớp nhánh window của HasFoundBox (script/flowcheck.go).
export const windowHasBox = (op?: string) => op !== 'waitClose' && op !== 'minimize' && op !== 'close';

type WinView = Pick<Step, 'winOp' | 'winApp' | 'winTitle' | 'winPreset' | 'winRect' | 'display'>;

// "Zalo · “Tin nhắn”"
export function windowTarget(s: Pick<Step, 'winApp' | 'winTitle'>): string {
  const t = s.winTitle ? `“${s.winTitle}”` : '';
  return [s.winApp, t].filter(Boolean).join(' · ') || tr('fx.win.none');
}

// Dòng chi tiết thẻ: "Zalo → trái 1280 × 800"
export function fmtWindow(s: WinView): string {
  const who = windowTarget(s);
  const op = s.winOp ?? '';
  if (op !== 'setBounds') return `${who} → ${(WIN_OPS.find((o) => o.id === op)?.label ?? op).toLowerCase()}`;
  const r = s.winRect;
  const size = r && r.w > 0 && r.h > 0 ? ` ${r.w} × ${r.h}` : '';
  const where = s.winPreset === 'full' ? tr('fx.win.full') : !s.winPreset ? `${r?.x ?? 0}, ${r?.y ?? 0}${size}`
    : `${WIN_PRESETS.find((p) => p.id === s.winPreset)!.label.toLowerCase()}${size}`;
  return `${who} → ${where}${s.display ? tr('fx.win.onScreen', { n: s.display }) : ''}`;
}
