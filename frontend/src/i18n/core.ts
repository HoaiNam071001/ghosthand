// Phần tính thuần của i18n (không React, không Wails): chọn ngôn ngữ, thay {biến}, tra từ điển có dự phòng tiếng Việt.
import { en } from './en';
import { MsgKey, vi } from './vi';

export type Lang = 'vi' | 'en';
export type LangPref = Lang | 'system';

export const isLangPref = (v: unknown): v is LangPref => v === 'vi' || v === 'en' || v === 'system';

// system → theo ngôn ngữ trình duyệt / hệ điều hành: "vi*" → vi, còn lại → en.
export function resolveLang(pref: LangPref, systemLang: string): Lang {
  if (pref !== 'system') return pref;
  return systemLang.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function format(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

const dicts: Record<Lang, Record<MsgKey, string>> = { vi, en };

export function translate(lang: Lang, key: MsgKey, vars?: Record<string, string | number>): string {
  return format(dicts[lang][key] || vi[key], vars);
}
