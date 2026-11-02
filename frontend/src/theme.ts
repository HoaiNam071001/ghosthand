// Theme sáng / tối (design v2): đặt data-theme trên <html>; 'system' = bỏ thuộc tính, CSS tự theo hệ điều hành.
// Lưu trong cấu hình app bên Go (internal/store/settings.go). Trên trình duyệt: ?theme=light|dark để xem thử.
import { useSyncExternalStore } from 'react';
import { GetSettings, SetTheme } from '../wailsjs/go/app/App';
import { inWails } from './windowMode';

export type Theme = 'light' | 'dark' | 'system';

let current: Theme = 'system';
const listeners = new Set<() => void>();

function apply(t: Theme) {
  current = t;
  const el = document.documentElement;
  if (t === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', t);
  listeners.forEach((l) => l());
}

const isTheme = (t: unknown): t is Theme => t === 'light' || t === 'dark' || t === 'system';

export function initTheme() {
  const q = new URLSearchParams(location.search).get('theme');
  if (isTheme(q)) return apply(q);
  if (inWails) GetSettings().then((s) => isTheme(s.theme) && apply(s.theme)).catch(() => {});
}

// Đổi theme và lưu (lỗi lưu chỉ ghi log – theme vẫn đổi trong lần chạy này).
export function setTheme(t: Theme) {
  apply(t);
  if (inWails) SetTheme(t).catch((e) => console.error('Không lưu được theme:', e));
}

export const useTheme = () =>
  useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, () => current);
