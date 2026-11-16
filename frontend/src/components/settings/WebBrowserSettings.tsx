// Cài đặt → Trình duyệt (bước 62): node web chạy trên Chrome của app hay Wisp + trạng thái Wisp. Chỉ hiển thị.
import { useLang } from '../../i18n';
import { tr } from '../../i18n/lang';
import { store, wisp } from '../../../wailsjs/go/models';
import Segmented from '../Segmented';

type Choice = '' | 'chrome' | 'wisp';
const CHOICES = (): { id: Choice; label: string }[] => [{ id: '', label: tr('web.auto') }, { id: 'chrome', label: tr('web.appChrome') }, { id: 'wisp', label: 'Wisp' }];

const HINT = (c: Choice) => tr(c === '' ? 'web.hint.auto' : c === 'chrome' ? 'web.hint.chrome' : 'web.hint.wisp');

export default function WebBrowserSettings({ web, status, onChange, onRefresh }: {
  web: Partial<store.WebSettings>; status: wisp.State | null; onChange: (patch: Partial<store.WebSettings>) => void; onRefresh: () => void;
}) {
  useLang();
  const choice = (web.browser || '') as Choice;
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col">{tr('web.title')}<span className="text-xs text-muted">{tr('web.title.hint')}</span></span>
      <Segmented value={choice} options={CHOICES()} onChange={(browser) => onChange({ browser })} label={tr('web.title')} />
      <span className="text-xs text-muted">{HINT(choice)}</span>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-control border border-line bg-field px-3 py-2">
        <span className="flex flex-col">
          <span>Wisp{status?.version ? ` ${status.version}` : ''}</span>
          <span className={`text-xs ${status?.ready ? 'text-ok' : 'text-muted'}`}>
            {!status ? tr('about.checking') : status.ready ? tr('web.ready') : status.problem}
          </span>
        </span>
        <button onClick={onRefresh} className="rounded-control border border-line px-2.5 py-1 hover:bg-hover">{tr('common.recheck')}</button>
      </div>
    </div>
  );
}
