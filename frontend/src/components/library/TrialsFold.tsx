// Nhóm "AI thử" ở thư viện (61 M5): kịch bản AI tạo để thử, thu gọn mặc định, mỗi dòng còn bao ngày trước khi tự dọn.
// Chỉ hiển thị.
import { Fold } from './LibraryParts';
import { daysLeft, trialNote } from './trials';

export type LibraryTrial = { path: string; name: string; lastUsed: number };

export default function TrialsFold({ trials, days, onOpen }: { trials: LibraryTrial[]; days: number; onOpen?: (path: string) => void }) {
  if (trials.length === 0) return null;
  const now = Date.now();
  return (
    <Fold title="AI thử" storageKey="library-trials-open" summary={trials.length}>
      {trials.map((t) => {
        const left = daysLeft(t.lastUsed, days, now);
        return (
          <a key={t.path} href="#" title={t.path} onClick={(e) => { e.preventDefault(); onOpen?.(t.path); }}
            className="flex items-center gap-2 rounded-md py-[7px] pr-3 pl-3 text-[13px] text-muted hover:bg-hover hover:text-ink">
            <span className="min-w-0 flex-1 truncate">{t.name}</span>
            {left !== null && <span className="font-mono text-[11px]" title="Còn bấy nhiêu ngày thì tự vào Thùng rác">{left}d</span>}
          </a>
        );
      })}
      <span className="px-3 py-1 text-[12px] text-muted">{trialNote(days)}</span>
    </Fold>
  );
}
