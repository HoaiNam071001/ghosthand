// Xem một lần chạy dạng cây (bước 60 V7): thanh trên (Gọn · rê xem | Luôn hiện, mở / thu các lượt), cây cuộn được, bảng
// chi tiết lần chạy node đang chọn bên phải. Giữ trạng thái xem (nhánh mở, lần đang chọn); dữ liệu qua props.
import { useEffect, useMemo, useRef, useState } from 'react';
import Segmented from '../Segmented';
import RunTree, { TreeShow } from './RunTree';
import RunTreeDetail from './RunTreeDetail';
import { buildRunTree, dataSources, layoutRunTree, TreeNode } from '../../flow/runTree';
import { runRows } from '../../flow/run';
import type { Edge, Step, StepResult } from '../../types';

type Props = { results: StepResult[]; steps: Step[]; edges: Edge[]; loadShot?: (shot: string) => Promise<string> };
const btn = 'h-7 whitespace-nowrap rounded-control border border-line bg-surface px-2.5 text-xs hover:bg-hover';

// Mở sẵn: lượt đầu của mỗi vòng + mọi lượt có lỗi
function defaultOpen(tree: TreeNode[]): Set<string> {
  const out = new Set<string>();
  const walk = (list: TreeNode[]) => list.forEach((n) => {
    if (n.kind === 'loop') n.children.forEach((c, i) => (i === 0 || c.fail) && out.add(c.key));
    walk(n.children);
  });
  walk(tree);
  return out;
}
const iterKeys = (tree: TreeNode[]): string[] => tree.flatMap((n) => [...(n.kind === 'iter' ? [n.key] : []), ...iterKeys(n.children)]);

export default function RunTreeView({ results, steps, edges, loadShot }: Props) {
  const tree = useMemo(() => buildRunTree(results, steps), [results, steps]);
  const sources = useMemo(() => dataSources(results, steps), [results, steps]);
  const rows = useMemo(() => runRows(results, steps, edges), [results, steps, edges]);
  const [open, setOpen] = useState(() => defaultOpen(tree));
  const [allIters, setAllIters] = useState(false);
  const [show, setShow] = useState<TreeShow>('pop');
  const failAt = results.findIndex((r) => r.status === 'fail');
  const [sel, setSel] = useState<number | null>(results.length ? (failAt >= 0 ? failAt : 0) : null);
  const scroller = useRef<HTMLDivElement>(null);

  // nhảy tới lần chạy j: mở nhánh chứa nó rồi cuộn tới thẻ
  const jump = (j: number) => {
    const path: string[] = [];
    const find = (list: TreeNode[], up: string[]): boolean => list.some((n) => (n.index === j && n.kind !== 'iter' ? (path.push(...up), true) : find(n.children, n.kind === 'iter' ? [...up, n.key] : up)));
    find(tree, []);
    if (path.some((k) => !open.has(k))) setOpen(new Set([...open, ...path]));
    setSel(j);
    setTimeout(() => scrollTo(j), 30);
  };
  const scrollTo = (j: number) => {
    const el = scroller.current;
    const c = layoutRunTree(tree, open, allIters).cards.find((x) => x.node.index === j);
    if (el && c) el.scrollTo({ left: c.x + c.w / 2 - el.clientWidth / 2, top: c.y - el.clientHeight / 2 + 40, behavior: 'smooth' });
  };
  useEffect(() => { if (sel !== null) scrollTo(sel); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!results.length) return <p className="grid h-full place-items-center text-muted">Lần chạy này chưa có node nào chạy xong.</p>;
  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col border-r border-line">
        <div className="flex flex-none flex-wrap items-center gap-2 border-b border-line bg-chrome px-3 py-1.5 text-xs">
          <span className="text-muted">Giá trị</span>
          <Segmented label="Cách hiện giá trị" value={show} onChange={setShow} options={[{ id: 'pop', label: 'Gọn · rê xem' }, { id: 'always', label: 'Luôn hiện' }]} />
          <span className="flex-1" />
          <button className={btn} onClick={() => { setOpen(new Set(iterKeys(tree))); setAllIters(true); }}>Mở mọi lượt</button>
          <button className={btn} onClick={() => { setOpen(defaultOpen(tree)); setAllIters(false); }}>Thu gọn</button>
        </div>
        <div ref={scroller} data-float-clip className="min-h-0 flex-1 overflow-auto bg-canvas [background-image:radial-gradient(var(--c-dot)_1.2px,transparent_1.3px)] [background-size:18px_18px]">
          <RunTree tree={tree} results={results} rows={rows} steps={steps} sources={sources} show={show} open={open} allIters={allIters}
            selected={sel} onSelect={setSel} onAllIters={() => setAllIters(true)}
            onToggle={(k) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; })} />
        </div>
      </div>
      <aside aria-label="Chi tiết lần chạy node" className="w-[350px] flex-none overflow-y-auto bg-surface p-3.5 max-[1100px]:w-[300px]">
        {sel !== null && results[sel] ? <RunTreeDetail i={sel} results={results} rows={rows} steps={steps} sources={sources} onJump={jump} loadShot={loadShot} />
          : <p className="text-muted">Chọn một thẻ</p>}
      </aside>
    </div>
  );
}
