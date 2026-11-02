// Cây lần chạy (bước 60 V7): mỗi lần node chạy một thẻ, xếp từ trên xuống; node lặp toả các lượt thành cột, gom về
// "Hết danh sách". Đường liền = luồng chạy, nét đứt = giá trị đi từ output lần chạy này sang ô của lần chạy kia.
// show 'pop': thẻ gọn, rê chuột mở popover VÀO / RA + vẽ đường của thẻ đó; 'always': pill giá trị toả trên / dưới mọi thẻ.
// Chỉ hiển thị – lần đang chọn / thu mở nhánh qua props.
import './runs.css';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import RunTreeCard from './RunTreeCard';
import RunTreePop from './RunTreePop';
import { layoutRunTree, lineage, TREE, TreeNode, type DataSource, type TreeCard } from '../../flow/runTree';
import { cardText, dataPath, inPills, outPills, rounded } from '../../flow/runTreeView';
import { nodeCategory } from '../../flow/category';
import type { RunRow } from '../flow/model';
import type { Step, StepResult } from '../../types';

export type TreeShow = 'pop' | 'always';
type Props = {
  tree: TreeNode[]; results: StepResult[]; rows: RunRow[]; steps: Step[]; sources: DataSource[][];
  show: TreeShow; open: Set<string>; allIters: boolean;
  selected: number | null; onSelect: (i: number) => void; onToggle: (key: string) => void; onAllIters: () => void;
};
const { CH } = TREE;

export default function RunTree(p: Props) {
  const box = useRef<HTMLDivElement>(null);
  const lay = useMemo(() => layoutRunTree(p.tree, p.open, p.allIters), [p.tree, p.open, p.allIters]);
  const byIndex = useMemo(() => new Map(lay.cards.filter((c) => c.node.index !== undefined).map((c) => [c.node.index!, c])), [lay]);
  const [hover, setHover] = useState<number | null>(null);
  const [pop, setPop] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [paths, setPaths] = useState<{ a: number; b: number; d: string }[]>([]);

  // đường dữ liệu: neo vào pill (Luôn hiện) hoặc mép phải thẻ (Gọn) – đo sau khi vẽ
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const base = el.getBoundingClientRect();
    const rect = (q: string) => el.querySelector(q)?.getBoundingClientRect();
    const rects = lay.cards.map((c) => ({ x: c.x, y: c.y, w: c.w, h: CH }));
    const out: { a: number; b: number; d: string }[] = [];
    p.sources.forEach((list, b) => list.forEach((s) => {
      const ca = byIndex.get(s.from), cb = byIndex.get(b);
      if (!ca || !cb) return;
      let from = { x: ca.x + ca.w - 26, y: ca.y + CH }, to = { x: cb.x + cb.w - 26, y: cb.y };
      if (p.show === 'always') {
        const ra = rect(`[data-pill="${ca.node.key}:out:${s.key}"]`), rb = rect(`[data-pill="${cb.node.key}:in:${s.slot}"]`);
        if (!ra || !rb) return;
        from = { x: (ra.left + ra.right) / 2 - base.left, y: ra.bottom - base.top };
        to = { x: (rb.left + rb.right) / 2 - base.left, y: rb.top - base.top };
      }
      out.push({ a: s.from, b, d: dataPath(from, to, rects) });
    }));
    setPaths(out);
  }, [lay, byIndex, p.sources, p.show]);

  const sel = p.selected;
  const lin = useMemo(() => (sel === null ? null : lineage(p.sources, sel)), [p.sources, sel]);
  const hot = (a: number, b: number) =>
    (hover !== null && (a === hover || b === hover)) || (sel !== null && lin !== null && (a === sel || ((b === sel || lin.up.has(b)) && lin.up.has(a))));

  const enter = (i: number | undefined) => {
    clearTimeout(timer.current);
    if (i === undefined) return;
    setHover(i);
    if (p.show === 'pop') timer.current = setTimeout(() => setPop(i), 300);
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setHover(null); setPop(null); }, 160);
  };
  const popCard = pop !== null ? byIndex.get(pop) : undefined;

  return (
    <div ref={box} className="relative" style={{ width: lay.W, height: lay.H }}>
      <svg className="pointer-events-none absolute inset-0 overflow-visible" width={lay.W} height={lay.H} aria-hidden>
        {lay.links.map((l) => <ControlPath key={`${l.from}>${l.to}`} kind={l.kind} a={lay.cards.find((c) => c.node.key === l.from)} b={lay.cards.find((c) => c.node.key === l.to)} />)}
        {paths.map((x, k) => {
          const on = hot(x.a, x.b);
          if (p.show === 'pop' && !on) return null;
          return <path key={k} d={x.d} fill="none" className={on ? 'run-tree-data on' : 'run-tree-data'} />;
        })}
      </svg>
      {lay.cards.map((c) => <Card key={c.node.key} c={c} p={p} sel={c.node.index !== undefined && c.node.index === sel}
        lin={!!lin && c.node.index !== undefined && (lin.up.has(c.node.index) || lin.down.has(c.node.index))}
        onEnter={() => enter(c.node.index)} onLeave={leave} />)}
      {popCard && (
        <div onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={leave}
          style={{ left: popCard.x + popCard.w + 300 < lay.W ? popCard.x + popCard.w + 12 : popCard.x - 292, top: popCard.y - 4 }} className="absolute z-10">
          <RunTreePop i={pop!} results={p.results} steps={p.steps} sources={p.sources} />
        </div>
      )}
    </div>
  );
}

function Card({ c, p, sel, lin, onEnter, onLeave }: { c: TreeCard; p: Props; sel: boolean; lin: boolean; onEnter: () => void; onLeave: () => void }) {
  const n = c.node, step = p.steps.find((s) => s.id === n.nodeId);
  const i = n.index;
  const r = i !== undefined ? p.results[i] : undefined;
  const selectable = i !== undefined;
  return (
    <RunTreeCard k={n.key} x={c.x} y={c.y} w={c.w} icon={step?.type ?? 'wait'} cat={step ? nodeCategory(step) : 'app'} ref_={step?.ref ?? '?'}
      text={cardText(n, p.results, p.steps, p.rows)} status={r?.status === 'fail' ? 'fail' : n.fail ? 'warn' : 'ok'}
      ins={i !== undefined ? inPills(i, p.results, p.sources) : []} outs={i !== undefined && !(n.kind === 'iter' && !p.open.has(n.key)) ? outPills(i, p.results, p.sources) : []}
      pills={p.show === 'always'} sel={sel} lin={lin}
      toggle={n.kind === 'iter' && n.children.length ? { open: p.open.has(n.key), count: n.children.length, onToggle: () => p.onToggle(n.key) } : undefined}
      onClick={n.kind === 'more' ? p.onAllIters : selectable ? () => p.onSelect(i!) : undefined} onEnter={onEnter} onLeave={onLeave} />
  );
}

// Luồng chạy: nối thẳng xuống (seq), toả từ node lặp ra các lượt (fan), gom các lượt về thẻ sau vòng (join).
function ControlPath({ kind, a, b }: { kind: 'seq' | 'fan' | 'join'; a?: TreeCard; b?: TreeCard }) {
  if (!a || !b) return null;
  const ax = a.x + 14, bx = b.x + 14, ay = a.y + CH, by = b.y;
  const bus = by - (kind === 'fan' ? 52 : 40);
  const d = kind === 'seq' && Math.abs(ax - bx) < 1 ? `M${ax} ${ay} L${bx} ${by}` : rounded([{ x: ax, y: ay }, { x: ax, y: bus }, { x: bx, y: bus }, { x: bx, y: by }]);
  return <path d={d} fill="none" stroke="var(--c-line-strong)" strokeWidth={1.6} />;
}
