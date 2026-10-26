// Công tắc "chỉ thao tác khi cửa sổ này ở trước" (46 C2): loại node có công tắc – khớp guardedTypes (internal/engine/windowguard.go).
import type { Step } from '../types';

export const GUARDED_TYPES: Step['type'][] = ['click', 'double', 'hold', 'drag', 'scroll', 'path', 'type', 'key'];

export const hasWindowGuard = (type: Step['type']) => GUARDED_TYPES.includes(type);

// Tóm tắt cho thẻ / inspector: `Chỉ khi "chrome" ở trước`; chưa chọn cửa sổ → null (validate sẽ báo).
export function guardLabel(s: Pick<Step, 'onlyInWindow' | 'winApp' | 'winTitle'>): string | null {
  if (!s.onlyInWindow) return null;
  const parts = [s.winApp, s.winTitle].map((t) => t?.trim()).filter(Boolean);
  return parts.length ? `Chỉ khi “${parts.join(' · ')}” ở trước` : null;
}
