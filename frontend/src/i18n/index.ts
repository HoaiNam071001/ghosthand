// Ngôn ngữ giao diện (bước 64): lưu trong cấu hình app bên Go (Settings.Language), đặt <html lang>, báo cho component qua useLang.
// Trên trình duyệt: ?lang=vi|en để xem thử. Dùng: const t = useT(); t('theme.dark'). Ngoài component: tr('key').
import { GetSettings, SetLanguage } from '../../wailsjs/go/app/App';
import { inWails } from '../windowMode';
import { isLangPref, Lang, LangPref } from './core';
import { applyLang } from './lang';
import type { MsgKey } from './vi';

export type { Lang, LangPref, MsgKey };
export { tr, useLang, useLangPref, useT } from './lang';

export function initLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (isLangPref(q)) return applyLang(q);
  applyLang('system');
  if (inWails) GetSettings().then((s) => isLangPref(s.language) && applyLang(s.language)).catch(() => {});
}

// Đổi ngôn ngữ và lưu (lỗi lưu chỉ ghi log – vẫn đổi trong lần chạy này).
export function setLang(p: LangPref) {
  applyLang(p);
  if (inWails) SetLanguage(p).catch((e) => console.error('Không lưu được ngôn ngữ:', e));
}
