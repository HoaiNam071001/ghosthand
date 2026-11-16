// Cài đặt › Giao diện (bước 64): chọn ngôn ngữ. Theme vẫn đổi bằng nút trên thanh tiêu đề.
import Segmented from '../Segmented';
import { setLang, useLangPref, useT } from '../../i18n';
import { LANG_OPTIONS } from '../shell/LangSwitch';

export default function UiSettings() {
  const t = useT();
  const pref = useLangPref();
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{t('settings.ui.language')}</h3>
      <Segmented value={pref} onChange={setLang} label={t('lang.label')} options={LANG_OPTIONS.map((o) => ({ id: o.id, label: t(o.key) }))} />
      <p className="text-muted">{t('settings.ui.languageHint')}</p>
    </section>
  );
}
