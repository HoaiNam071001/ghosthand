// Phần hiển thị của bảng thêm node – dùng chung cho Ctrl+K màn chính (AddStepPalette) và bảng thêm node của canvas mẫu (DemoFlow).
// Ô tìm (không dấu cũng được), các nhóm, phím mũi tên + Enter; khung dưới mô tả mục đang chọn (bước 35 N0).
// Loại chưa làm hiện nhãn "Sắp có" và không chọn được.
import { KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { StepIcon, StepIconName } from './icons';
import { fold } from '../fold';
import type { InfoKey, NodeInfo } from '../flow/nodeInfo';
import type { StepType } from '../types';
import { ILLUS } from './palette/illus';
import { categoryName, NodeCategory } from '../flow/category';
import { onlyLabel, unsupportedHere } from '../flow/platform';
import { usePlatform } from './palette/usePlatform';

// key: tên mô tả / hoạt hoạ (flow/nodeInfo); type: loại node thuần – chỉ mục có type mới hiện khi Đổi loại node.
// extra: phần thêm ở khung mô tả (vd Sửa / Xoá của node của tôi).
export type PaletteItem = { icon: StepIconName; label: string; keywords: string; info?: NodeInfo; key?: InfoKey; type?: StepType; run?: () => unknown; soon?: string; extra?: ReactNode };
// cat: nhóm node (tên + chấm màu nhóm – flow/category); title: tên riêng thay tên nhóm (Của tôi); note: dòng ghi chú dưới tên nhóm
export type PaletteGroup = { cat: NodeCategory; title?: string; note?: string; items: PaletteItem[] };
type Item = PaletteItem;

const COLS = 3;

// context: dòng ghi bước / node mới sẽ nối vào đâu (vd "Nối từ n2 · Thất bại").
// onGuide: link "Xem hướng dẫn" ở khung mô tả – mở trang node trong modal Hướng dẫn (bước 51).
export function PaletteView({ groups: all, onClose, onCancel, onGuide, footer, context, label = 'Thêm bước' }: {
  groups: PaletteGroup[]; onClose: () => void; onCancel?: () => void; onGuide?: (key: InfoKey) => void; footer?: ReactNode; context?: ReactNode; label?: string;
}) {
  const cancel = () => {
    onCancel?.();
    onClose();
  };
  const [q, setQ] = useState('');
  const { goos, only } = usePlatform();
  const groups = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    return all
      .map((g) => ({ ...g, items: g.items.filter((it) => words.every((w) => fold(`${it.label} ${it.keywords} ${g.title ?? categoryName(g.cat)}`).includes(w))) }))
      .filter((g) => g.items.length > 0);
  }, [q, all]);
  const flat = groups.flatMap((g) => g.items);
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(Math.max(flat.findIndex((it) => it.run), 0)), [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const panel = useRef<HTMLDivElement>(null);

  const pick = (it: Item | undefined) => {
    if (!it?.run) return;
    onClose();
    it.run();
  };

  // ←→ đi từng mục, ↑↓ đi theo cột (3 mục một hàng, tính trong danh sách đang hiện).
  const onKey = (e: KeyboardEvent) => {
    const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS }[e.key];
    if (move !== undefined) {
      e.preventDefault();
      setSel((i) => Math.min(Math.max(i + move, 0), flat.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(flat[sel]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  let n = -1; // chỉ số trong flat khi vẽ
  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/20 px-4 pt-[10vh]"
      onMouseDown={(e) => { if (!panel.current?.contains(e.target as Node)) cancel(); }}>
      <div ref={panel} role="dialog" aria-label={label} onKeyDown={onKey}
        className="flex max-h-[80vh] w-[680px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        {context && <div className="mx-3.5 mt-3 -mb-1.5 text-xs text-muted">{context}</div>}
        <label className="mx-3.5 mt-3.5 mb-1.5 flex h-10 flex-none items-center gap-3 rounded-lg px-3 ring-focus">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden>
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm loại bước… (vd: chờ, cuộn, url)"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          <span className="font-mono text-[11px] text-muted">Esc</span>
        </label>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-2">
          {groups.length === 0 && <p className="py-6 text-center text-muted">Không có loại bước nào khớp “{q}”</p>}
          {groups.map((g) => (
            <section key={g.title ?? g.cat} className={`cat-${g.cat} flex flex-col gap-1.5`}>
              <span className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted">
                <span className="h-2 w-2 rounded-full bg-cat" aria-hidden />{g.title ?? categoryName(g.cat)}
              </span>
              {g.note && <span className="-mt-1 px-1 text-xs text-muted">{g.note}</span>}
              <div className="grid grid-cols-3 gap-1.5">
                {g.items.map((it) => {
                  const i = ++n;
                  const on = i === sel;
                  const tag = onlyLabel(only, it.type);
                  const bad = unsupportedHere(only, it.type, goos);
                  return (
                    <button key={it.label} onClick={() => pick(it)} onMouseEnter={() => setSel(i)} aria-disabled={!it.run}
                      title={it.soon ? `Sắp có (${it.soon})` : bad ? `${tag} – không chạy được trên máy này` : undefined}
                      className={`flex min-h-[46px] items-center gap-2.5 rounded-card px-2.5 py-1.5 text-left ${on ? 'ring-selected' : 'border border-line bg-surface'} ${it.run ? '' : 'cursor-default'}`}>
                      <span className={`grid h-[30px] w-[30px] flex-none place-items-center rounded-[7px] bg-cat-tile text-cat ${it.run && !bad ? '' : 'opacity-60'}`}>
                        <StepIcon type={it.icon} className="h-[15px] w-[15px]" />
                      </span>
                      <span className={`min-w-0 flex-1 font-medium ${it.run && !bad ? '' : 'text-muted'}`}>{it.label}</span>
                      {tag && <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold whitespace-nowrap ${bad ? 'bg-warn/15 text-warn' : 'bg-soft text-muted'}`}>{tag}</span>}
                      {it.soon && <span className="rounded-full bg-soft px-1.5 py-px text-[10px] font-semibold whitespace-nowrap text-muted">Sắp có</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <PaletteDetail item={flat[sel]} onGuide={onGuide && ((k) => { cancel(); onGuide(k); })} warn={unsupportedHere(only, flat[sel]?.type, goos) ? `${onlyLabel(only, flat[sel]?.type)} – node này không chạy được trên máy này (vẫn thêm được để dùng ở máy khác).` : ''} />

        <div className="flex flex-none flex-wrap items-center gap-4 border-t border-line bg-chrome px-4 py-2.5 text-xs text-muted">
          <span><span className="font-mono">↑↓←→</span> chọn</span>
          {footer}
        </div>
      </div>
    </div>
  );
}

// Mô tả mục đang chọn / rê chuột: hoạt hoạ minh hoạ bên trái, chữ bên phải – cao cố định để bảng không giật khi đổi mục.
function PaletteDetail({ item, warn, onGuide }: { item?: Item; warn: string; onGuide?: (key: InfoKey) => void }) {
  const scene = item?.key && ILLUS[item.key];
  return (
    <div aria-live="polite" className="flex h-[148px] flex-none items-center gap-4 border-t border-line px-4 py-3">
      {item && <>
        <div className="grid h-[112px] w-[200px] flex-none place-items-center overflow-hidden rounded-card border border-line bg-bg">
          {scene ? <div key={item.key} className="h-full w-full">{scene()}</div>
            : <span className="grid h-14 w-14 place-items-center rounded-xl bg-accent-soft text-accent-text"><StepIcon type={item.icon} className="h-7 w-7" /></span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 text-[15px] font-semibold">
            <StepIcon type={item.icon} className="h-4 w-4 text-accent-text" />{item.label}
            {item.soon && <span className="rounded-full bg-soft px-1.5 py-px text-[10px] font-semibold text-muted">Sắp có · {item.soon}</span>}
          </span>
          {item.info && <>
            <span className="text-[13px] text-ink">{item.info.desc}</span>
            <span className="text-xs text-muted"><span className="font-semibold">Dùng khi:</span> {item.info.use}</span>
            {onGuide && item.key && <button onClick={() => onGuide(item.key!)} className="self-start text-xs font-medium text-accent-text hover:underline">Xem hướng dẫn →</button>}
          </>}
          {warn && <span className="text-xs font-medium text-warn">{warn}</span>}
          {item.extra}
        </div>
      </>}
    </div>
  );
}
