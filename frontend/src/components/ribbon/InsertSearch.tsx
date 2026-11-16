// Ô tìm node dính bên trái tab Chèn node (bước 63): gõ để lọc nút node trong ribbon, hoặc bấm nút để mở bảng tìm đầy đủ (mô tả + hoạt hoạ).
// Chỉ hiển thị.
import { RibbonIcon } from './ribbonIcons';
import { MOD } from './model';

export default function InsertSearch({ q, onQ, onOpen }: { q: string; onQ: (q: string) => void; onOpen: () => void }) {
  return (
    <div className="flex w-[190px] flex-none flex-col gap-1.5 border-r border-line px-2 py-1.5">
      <label className="flex h-7 items-center gap-1.5 rounded-control border border-line bg-field px-2 text-muted focus-within:ring-focus">
        <RibbonIcon name="search" className="h-3.5 w-3.5 flex-none" />
        <input value={q} onChange={(e) => onQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && q && (e.stopPropagation(), onQ(''))}
          placeholder="Lọc node…" aria-label="Lọc node trong ribbon" className="min-w-0 flex-1 bg-transparent text-ink outline-none" />
        {q && <button onClick={() => onQ('')} aria-label="Xoá ô lọc" className="text-muted hover:text-ink">✕</button>}
      </label>
      <button onClick={onOpen} title={`Mở bảng tìm node đầy đủ – mô tả, hoạt hoạ, phím mũi tên (${MOD}K)`}
        className="flex h-7 items-center justify-center gap-1.5 rounded-control border border-line bg-soft text-xs hover:bg-hover">
        <RibbonIcon name="search" className="h-3.5 w-3.5" />Tìm node chi tiết <span className="font-mono text-[11px] text-muted">{MOD}K</span>
      </button>
      <span className="text-center text-[11px] text-faint">Tìm</span>
    </div>
  );
}
