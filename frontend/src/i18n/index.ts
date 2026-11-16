// Ngôn ngữ giao diện (bước 64): lưu trong cấu hình app bên Go (Settings.Language), đặt <html lang>, báo cho component qua useLang.
// Trên trình duyệt: ?lang=vi|en để xem thử. Dùng: const t = useT(); t('theme.dark'). Ngoài component: tr('key').
import { useSyncExternalStore } from 'react';
import { GetSettings, SetLanguage } from '../../wailsjs/go/app/App';
import { inWails } from '../windowMode';
import { isLangPref, Lang, LangPref, resolveLang, translate } from './core';
import type { MsgKey } from './vi';

export type { Lang, LangPref, MsgKey };

let pref: LangPref = 'system';
let current: Lang = resolveLang('system', navigator.language);
const listeners = new Set<() => void>();

function apply(p: LangPref) {
  pref = p;
  current = resolveLang(p, navigator.language);
  document.documentElement.lang = current;
  listeners.forEach((l) => l());
}

export function initLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (isLangPref(q)) return apply(q);
  apply('system');
  if (inWails) GetSettings().then((s) => isLangPref(s.language) && apply(s.language)).catch(() => {});
}

// Đổi ngôn ngữ và lưu (lỗi lưu chỉ ghi log – vẫn đổi trong lần chạy này).
export function setLang(p: LangPref) {
  apply(p);
  if (inWails) SetLanguage(p).catch((e) => console.error('Không lưu được ngôn ngữ:', e));
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
