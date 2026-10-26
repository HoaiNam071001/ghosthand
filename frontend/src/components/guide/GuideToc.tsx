// Mục lục trái của Hướng dẫn (chỉ hiển thị): ô tìm không dấu + danh sách theo nhóm, mục đang xem tô nền.
import { groupToc, pageId, TocEntry } from '../../guide/toc';
import type { GuidePage } from '../../guide/types';

export function GuideToc({ entries, current, q, onQ, onPick }: {
  entries: TocEntry[]; current: GuidePage; q: string; onQ: (q: string) => void; onPick: (p: GuidePage) => void;
}) {
  const cur = pageId(current);
  return (
    <nav aria-label="Mục lục hướng dẫn" className="flex min-h-0 w-[240px] flex-none flex-col border-r border-line">
      <div className="p-3">
        <input autoFocus value={q} onChange={(e) => onQ(e.target.value)} placeholder="Tìm trong hướng dẫn…" aria-label="Tìm trong hướng dẫn"
          className="h-8 w-full rounded-control border border-line bg-field px-2.5 text-[13px] outline-none focus:ring-focus" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {!entries.length && <p className="px-2 text-xs text-muted">Không thấy mục nào.</p>}
        {groupToc(entries).map((g) => (
          <div key={g.group} className="mb-2">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.group}</div>
            {g.entries.map((e) => {
              const id = pageId(e.page);
              return (
                <button key={id} onClick={() => onPick(e.page)} aria-current={id === cur ? 'page' : undefined}
                  className={`block w-full truncate rounded-[7px] px-2 py-1 text-left text-[13px] ${id === cur ? 'bg-accent-soft font-semibold text-accent-text' : 'hover:bg-hover'}`}>
                  {e.title}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
