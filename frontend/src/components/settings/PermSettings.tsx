// Cài đặt → Quyền (bước 48 P3): quyền hệ điều hành mà các node cần, trạng thái hiện tại, nút cấp / mở System Settings.
// Chỉ hiển thị – AppSettings nối store (permStore) và tính quyền kịch bản đang mở cần.
import { tr } from '../../i18n/lang';
import { perm } from '../../../wailsjs/go/models';

const STATE = (): Record<string, { text: string; cls: string }> => ({
  granted: { text: tr('perm.granted'), cls: 'text-ok' },
  denied: { text: tr('perm.denied'), cls: 'text-danger-text' },
  unknown: { text: tr('perm.unknown'), cls: 'text-warn' },
  notNeeded: { text: tr('perm.notNeeded'), cls: 'text-muted' },
});

export default function PermSettings({ items, needed, focus, busy, error, onRefresh, onRequest, onOpen }: {
  items: perm.Item[] | null; needed: string[]; focus?: string; busy: string; error: string;
  onRefresh: () => void; onRequest: (id: string) => void; onOpen: (id: string) => void;
}) {
  const btn = 'h-7 rounded-control border border-line px-2.5 text-xs hover:bg-hover disabled:opacity-50';
  if (!items) return <span className="text-muted">{tr('about.checking')}</span>;
  if (!items.length) return <span className="text-muted">{tr('perm.none')}</span>;
  // mục được chỉ tới (lỗi permission) lên đầu, rồi quyền kịch bản đang mở dùng, còn lại giữ thứ tự
  const rank = (id: string) => Number(id === focus) * 2 + Number(needed.includes(id));
  const sorted = [...items].sort((a, b) => rank(b.id) - rank(a.id));
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{tr('perm.note')}</span>
        <button onClick={onRefresh} className={btn}>{tr('common.recheck')}</button>
      </div>
      {sorted.map((it, i) => {
        const st = STATE()[it.state] ?? STATE().unknown;
        const used = needed.includes(it.id);
        return (
          <div key={it.id} className={`flex flex-col gap-1.5 ${i ? 'border-t border-line pt-3' : ''} ${it.id === focus ? 'rounded-control ring-focus p-2' : ''}`}>
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{it.name}{used && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-normal text-accent-text">{tr('perm.usedHere')}</span>}</span>
              <span className={`shrink-0 text-xs ${st.cls}`}>{it.manual ? tr('perm.manual') : st.text}</span>
            </span>
            <span className="text-xs text-muted">{it.hint}</span>
            {it.note && <span className="text-xs text-warn">{it.note}</span>}
            <span className="flex gap-1.5">
              {!it.manual && it.state !== 'granted' && (
                <button onClick={() => onRequest(it.id)} disabled={busy === it.id} className={btn}>{busy === it.id ? tr('perm.asking') : tr('perm.grant')}</button>
              )}
              <button onClick={() => onOpen(it.id)} className={btn}>{tr('perm.openSettings')}</button>
            </span>
          </div>
        );
      })}
      {error && <span className="text-danger-text">{error}</span>}
    </>
  );
}
