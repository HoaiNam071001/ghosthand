// Cài đặt → Quyền (bước 48 P3): quyền hệ điều hành mà các node cần, trạng thái hiện tại, nút cấp / mở System Settings.
// Chỉ hiển thị – AppSettings nối store (permStore) và tính quyền kịch bản đang mở cần.
import { perm } from '../../../wailsjs/go/models';

const STATE: Record<string, { text: string; cls: string }> = {
  granted: { text: '✓ Đã cấp', cls: 'text-ok' },
  denied: { text: '✗ Chưa cấp', cls: 'text-danger-text' },
  unknown: { text: '? Chưa rõ', cls: 'text-warn' },
  notNeeded: { text: 'Không cần', cls: 'text-muted' },
};

export default function PermSettings({ items, needed, busy, error, onRefresh, onRequest, onOpen }: {
  items: perm.Item[] | null; needed: string[]; busy: string; error: string;
  onRefresh: () => void; onRequest: (id: string) => void; onOpen: (id: string) => void;
}) {
  const btn = 'h-7 rounded-control border border-line px-2.5 text-xs hover:bg-hover disabled:opacity-50';
  if (!items) return <span className="text-muted">Đang kiểm tra…</span>;
  if (!items.length) return <span className="text-muted">Hệ điều hành này không cần cấp quyền trước.</span>;
  // quyền kịch bản đang mở dùng lên đầu, còn lại giữ thứ tự
  const sorted = [...items].sort((a, b) => Number(needed.includes(b.id)) - Number(needed.includes(a.id)));
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">Kiểm tra không làm hiện hộp thoại nào của hệ điều hành.</span>
        <button onClick={onRefresh} className={btn}>Kiểm tra lại</button>
      </div>
      {sorted.map((it, i) => {
        const st = STATE[it.state] ?? STATE.unknown;
        const used = needed.includes(it.id);
        return (
          <div key={it.id} className={`flex flex-col gap-1.5 ${i ? 'border-t border-line pt-3' : ''}`}>
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{it.name}{used && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-normal text-accent-text">kịch bản này dùng</span>}</span>
              <span className={`shrink-0 text-xs ${st.cls}`}>{it.manual ? 'Tự kiểm tra' : st.text}</span>
            </span>
            <span className="text-xs text-muted">{it.hint}</span>
            {it.note && <span className="text-xs text-warn">{it.note}</span>}
            <span className="flex gap-1.5">
              {!it.manual && it.state !== 'granted' && (
                <button onClick={() => onRequest(it.id)} disabled={busy === it.id} className={btn}>{busy === it.id ? 'Đang xin…' : 'Cấp quyền'}</button>
              )}
              <button onClick={() => onOpen(it.id)} className={btn}>Mở System Settings</button>
            </span>
          </div>
        );
      })}
      {error && <span className="text-danger-text">{error}</span>}
    </>
  );
}
