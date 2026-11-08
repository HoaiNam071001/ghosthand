// Hộp thoại Lịch sử chạy (thư viện → "Xem tất cả"): trái mọi lần chạy đã lưu, phải nhật ký của lần đang chọn (bấm
// dòng xem output / lỗi / ảnh lúc lỗi ngay trong hộp thoại). "Xem trên flow" mới đóng hộp thoại, mở bảng Nhật ký và
// tô đường đã đi trên canvas. Xoá lần đang chọn / xoá hết (bước 41 – RunsDelete). Xuất gói lỗi (56 D2).
import { useCallback, useEffect, useMemo, useState } from 'react';
import RunLog from '../flow/RunLog';
import { deleteRuns, exportRunBundle, fetchRun, openRun, RunSummary, runShotUrl, useRunLog } from '../../runStore';
import { errorText } from '../../engineStore';
import { setNotice, useEditor } from '../../store';
import { nodeViews } from '../../flow/view';
import { runHead, runRows } from '../../flow/run';
import type { StepResult } from '../../types';
import { libraryRun, runDot, runStatsParts } from './runs';
import RunsDelete from './RunsDelete';
import RunTreeView from '../runs/RunTreeView';
import Segmented from '../Segmented';

export default function RunsDialog({ onClose }: { onClose: () => void }) {
  const { history, stats } = useRunLog();
  const { script } = useEditor();
  const [sel, setSel] = useState(history[0]?.id ?? '');
  const [run, setRun] = useState<{ summary: RunSummary; results: StepResult[] } | null>(null);
  const [error, setError] = useState('');
  const [as, setAs] = useState<'tree' | 'list'>('tree'); // bước 60: cây node (mặc định) hoặc danh sách từng bước
  const loadShot = useCallback((shot: string) => runShotUrl(sel, shot), [sel]);
  useEffect(() => {
    let live = true;
    setRun(null);
    if (sel) fetchRun(sel).then((r) => live && setRun(r));
    return () => { live = false; };
  }, [sel]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const views = useMemo(() => nodeViews(script), [script]);
  const statsLine = useMemo(() => {
    const byId = new Map(views.map((v) => [v.id, `${v.ref} ${v.title}`]));
    return stats ? runStatsParts(stats, (id) => byId.get(id)).join(' · ') : '';
  }, [stats, views]);
  const rows = useMemo(() => (run ? runRows(run.results, script.steps, script.edges) : []), [run, script.steps, script.edges]);
  const head = run && runHead(run.results, run.summary, false, false);
  const remove = (id: string) => {
    const next = id && history[history.findIndex((h) => h.id === id) + 1]?.id; // xoá xong chọn lần cũ hơn kế đó
    deleteRuns(id).then(() => { setSel(next || ''); setError(''); }).catch((e) => setError(errorText(e)));
  };
  const exportBundle = () => {
    exportRunBundle(sel).then((p) => { if (p) { setError(''); setNotice(`Đã xuất gói lỗi ${p}`); } }).catch((e) => setError(errorText(e)));
  };
  const view = () => {
    onClose();
    openRun(sel);
  };
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/25 px-4 pt-[6vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Lịch sử chạy" className="flex h-[86vh] w-[1240px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div className="flex items-center gap-3 border-b border-line px-[18px] py-3">
          <div className="flex-1">
            <div className="text-base font-semibold">Lịch sử chạy</div>
            <div className="text-[13px] text-muted">{script.name} · {history.length} lần đã lưu – chọn một lần để xem nhật ký</div>
            {statsLine && <div className="text-xs text-muted" title="Tính từ các lần chạy đã lưu – lần bị dừng không tính vào tỷ lệ thành công">{statsLine}</div>}
            {error && <div className="text-[13px] text-danger-text">{error}</div>}
          </div>
          <Segmented label="Kiểu xem lần chạy" value={as} onChange={setAs} options={[{ id: 'tree', label: 'Cây' }, { id: 'list', label: 'Danh sách' }]} />
          <button disabled={!sel} onClick={exportBundle} className="h-8 rounded-control border border-line px-2.5 text-[13px] enabled:hover:bg-hover disabled:opacity-50"
            title="Một file .zip để gửi báo lỗi: kịch bản, kết quả từng node, ảnh lúc lỗi, phiên bản app / hệ điều hành – bí mật được che">Xuất gói lỗi…</button>
          <RunsDelete count={history.length} canDelete={!!sel} onDelete={() => remove(sel)} onClear={() => remove('')} />
          <button disabled={!run} onClick={view} className="btn-primary h-8 rounded-control px-3 text-[13px] font-semibold disabled:opacity-50"
            title="Đóng hộp thoại, mở nhật ký dưới canvas và tô đường đã đi">Xem trên flow</button>
          <button onClick={onClose} aria-label="Đóng" className="h-8 w-8 rounded-control text-muted hover:bg-hover hover:text-ink">✕</button>
        </div>
        <div className="flex min-h-0 flex-1">
          <ol className="w-[260px] flex-none overflow-y-auto border-r border-line p-1.5">
            {history.map((h) => {
              const r = libraryRun(h, h.id === sel);
              return (
                <li key={h.id}>
                  <button onClick={() => setSel(h.id)} onDoubleClick={() => { setSel(h.id); onClose(); openRun(h.id); }} aria-current={r.active}
                    className={`flex w-full flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left text-[13px] ${r.active ? 'bg-accent-soft' : 'hover:bg-hover'}`}>
                    <span className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 flex-none rounded-full ${runDot(r)}`} />
                      <span className="min-w-0 flex-1 truncate font-medium">{r.script}</span>
                      <span className="font-mono text-[11px] text-muted">{r.when}</span>
                    </span>
                    <span className="truncate pl-3.5 text-xs text-muted" title={r.result}>{r.result}</span>
                  </button>
                </li>
              );
            })}
            {!history.length && <li className="px-3 py-2 text-[13px] text-muted">Chưa có lần chạy nào</li>}
          </ol>
          <div className="min-w-0 flex-1">
            {head && as === 'tree' && run ? <RunTreeView key={sel} results={run.results} steps={script.steps} edges={script.edges} loadShot={loadShot} />
              : head ? (
              <RunLog key={sel} fill title={head.title} summary={head.summary} tone={head.tone} rows={rows} nodes={views} selected={null}
                onSelect={() => {}} loadShot={loadShot} />
            ) : <p className="grid h-full place-items-center text-muted">{sel ? 'Đang đọc…' : 'Chọn một lần chạy'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
