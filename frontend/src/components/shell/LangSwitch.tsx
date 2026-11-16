// Nút chọn ngôn ngữ Tiếng Việt / English / Theo hệ thống trên thanh tiêu đề (cạnh nút đổi theme): hiện mã ngôn ngữ đang dùng, bấm mở menu nhỏ.
import { usePopover } from '../usePopover';
import { LangPref, MsgKey, setLang, useLang, useLangPref, useT } from '../../i18n';

export const LANG_OPTIONS: { id: LangPref; key: MsgKey }[] = [
  { id: 'vi', key: 'lang.vi' },
  { id: 'en', key: 'lang.en' },
  { id: 'system', key: 'lang.system' },
];

export default function LangSwitch() {
  const t = useT();
  const lang = useLang();
  const pref = useLangPref();
  const { open, setOpen, ref } = usePopover();
  const name = t(lang === 'vi' ? 'lang.vi' : 'lang.en');
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label={t('lang.current', { name })} title={t('lang.current', { name })} aria-haspopup="menu" aria-expanded={open}
        className="grid h-9 w-9 place-items-center font-mono text-[11px] font-semibold text-muted hover:bg-hover hover:text-ink">{lang.toUpperCase()}</button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 flex w-44 flex-col gap-px rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgb(0_0_0/.14)]">
          {LANG_OPTIONS.map((o) => (
            <button key={o.id} role="menuitemradio" aria-checked={pref === o.id} onClick={() => { setLang(o.id); setOpen(false); }}
              className={`flex h-8 items-center gap-2.5 rounded-[7px] px-2.5 text-left hover:bg-hover ${pref === o.id ? 'font-semibold text-ink' : 'text-muted'}`}>
              <span className="flex-1">{t(o.key)}</span>{pref === o.id && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
