// Gợi ý cách tìm sau "Chọn trên màn" (bước 43 A4): các selector đã thử trên màn hiện tại, bền → kém; bấm để dùng.
import { ElementSuggestion } from '../../imageSteps';
import { hint } from './shared';

const tone: Record<string, string> = { good: 'text-ok', fair: 'text-muted', poor: 'text-warn' };
const label: Record<string, string> = { good: 'bền', fair: 'khá', poor: 'dễ hỏng' };

export function ElementSuggestions({ list, current, onPick }: { list: ElementSuggestion[]; current?: string; onPick: (s: ElementSuggestion) => void }) {
  if (list.length < 2) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className={hint}>Gợi ý cách tìm (bấm để dùng)</span>
      {list.map((g) => (
        <button key={g.selector} onClick={() => onPick(g)} title={g.note}
          className={`flex items-center gap-2 rounded-control border px-2 py-1 text-left text-xs hover:bg-hover ${g.selector === current ? 'border-accent' : 'border-line'}`}>
          <span className="min-w-0 flex-1 truncate font-mono text-ink">{g.selector}</span>
          <span className="shrink-0 text-muted">{g.unique ? 'duy nhất' : `${g.matches} chỗ · thứ ${g.occurrence}`}</span>
          <span className={`shrink-0 ${tone[g.stability]}`}>{label[g.stability]}</span>
        </button>
      ))}
    </div>
  );
}
