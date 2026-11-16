// Trạng thái ngôn ngữ hiện tại (không biết Wails – để logic thuần như flow/ gọi tr() được). Lưu / nạp ở index.ts.
import { useSyncExternalStore } from 'react';
import { Lang, LangPref, resolveLang, translate } from './core';
import type { MsgKey } from './vi';

let pref: LangPref = 'system';
const sysLang = () => (typeof navigator === 'undefined' ? 'vi' : navigator.language); // test chạy trong node không có navigator
let current: Lang = resolveLang('system', sysLang());
const listeners = new Set<() => void>();

export function applyLang(p: LangPref) {
  pref = p;
  current = resolveLang(p, sysLang());
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  listeners.forEach((l) => l());
}

export const tr = (key: MsgKey, vars?: Record<string, string | number>) => translate(current, key, vars);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useLangPref = () => useSyncExternalStore(subscribe, () => pref);
export const useLang = () => useSyncExternalStore(subscribe, () => current);

// Hook trả hàm dịch; component dùng nó sẽ vẽ lại khi đổi ngôn ngữ.
export function useT() {
  const lang = useLang();
  return (key: MsgKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
