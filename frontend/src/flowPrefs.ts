// Lựa chọn xem của canvas flow (bước 60): kiểu thẻ Gọn / Đầy đủ, cách mở chi tiết node Panel / Modal / Popover.
// Nhớ trên máy (localStorage) – không ghi vào file kịch bản.
import { useSyncExternalStore } from 'react';
import type { CardMode } from './components/flow/model';

export type DetailMode = 'panel' | 'modal' | 'pop';
export type FlowPrefs = { card: CardMode; detail: DetailMode };
const KEY = 'flow-prefs';
const DEFAULT: FlowPrefs = { card: 'compact', detail: 'panel' };

function load(): FlowPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<FlowPrefs>;
    return {
      card: v.card === 'full' ? 'full' : 'compact',
      detail: v.detail === 'modal' || v.detail === 'pop' ? v.detail : 'panel',
    };
  } catch {
    return DEFAULT;
  }
}

let prefs = load();
const subs = new Set<() => void>();
export function setFlowPrefs(p: Partial<FlowPrefs>) {
  prefs = { ...prefs, ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch { /* máy không cho lưu: vẫn dùng trong phiên này */ }
  subs.forEach((f) => f());
}
export const useFlowPrefs = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => prefs);
