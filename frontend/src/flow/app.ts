// Node Ứng dụng (bước 26) – nhãn thao tác, chọn app, dòng chi tiết thẻ. Chạy ở internal/engine/app.go; matchApps cùng
// công thức MatchApps (internal/model/app.go), test chung testdata/apps.json.
import type { Step } from '../types';
import { matchApp } from './window';
import { tr } from '../i18n/lang';

export type AppOp = '' | 'waitStart' | 'waitQuit' | 'quit' | 'forceQuit';

export const APP_OPS: { id: AppOp; label: string }[] = [
  { id: '', get label() { return tr('app.op.0'); } }, { id: 'waitStart', get label() { return tr('app.op.1'); } }, { id: 'waitQuit', get label() { return tr('app.op.2'); } },
  { id: 'quit', get label() { return tr('app.op.3'); } }, { id: 'forceQuit', get label() { return tr('app.op.4'); } },
];

// App / tiến trình đang chạy – khớp model.AppInfo (internal/model/window.go).
export interface AppInfo { name: string; id: string; pid: number; windows: number }

// Chỉ số mọi tiến trình khớp want (app nhiều tiến trình như Chrome → nhiều chỉ số). Regex sai → ném lỗi.
export const matchApps = (apps: Pick<AppInfo, 'name' | 'id'>[], want: string, mode: string): number[] =>
  apps.flatMap((a, i) => (matchApp(a.name, a.id, want, mode) ? [i] : []));

// Trạng thái cạnh ô tên trong inspector: số tiến trình khớp + tổng cửa sổ; null = tên trống / regex sai / còn biến.
export function appStatus(apps: AppInfo[], want: string, mode: string): { running: boolean; windows: number } | null {
  if (!want.trim() || want.includes('{{')) return null;
  try {
    const hit = matchApps(apps, want, mode).map((i) => apps[i]);
    return { running: hit.length > 0, windows: hit.reduce((n, a) => n + a.windows, 0) };
  } catch {
    return null;
  }
}

// Một app mỗi tên (gộp tiến trình cùng tên), app có cửa sổ trước – danh sách chọn trong inspector.
export function appChoices(apps: AppInfo[]): AppInfo[] {
  const by = new Map<string, AppInfo>();
  for (const a of apps) {
    const k = a.name.toLowerCase();
    const cur = by.get(k);
    by.set(k, cur ? { ...cur, windows: cur.windows + a.windows } : a);
  }
  return [...by.values()].sort((a, b) => Number(b.windows > 0) - Number(a.windows > 0) || a.name.localeCompare(b.name));
}

// Dòng chi tiết thẻ: "Zalo → chờ app chạy · tối đa 10 s"
export function fmtApp(s: Pick<Step, 'appOp' | 'appName' | 'appForce'>): string {
  const op = s.appOp ?? '';
  const label = (APP_OPS.find((o) => o.id === op)?.label ?? op).toLowerCase();
  return `${s.appName?.trim() || tr('fx.app.none')} → ${label}${op === 'quit' && s.appForce ? tr('fx.app.force') : ''}`;
}
