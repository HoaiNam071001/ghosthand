// Thanh bên thư viện kịch bản (design v3, artboard Main): tìm, danh sách kịch bản (chấm "chưa lưu", giờ hẹn), mở gần đây +
// lịch sử chạy (thu gọn được – library/LibraryParts), Mới / Mẫu thử / Mở / Lưu. Thu gọn / mở rộng bằng nút ở đầu cột hoặc Ctrl/Cmd+B (nhớ bằng localStorage).
// Giao diện dựng ở bước 27b; lưu / mở nối ở bước 21 (scriptFile.ts); lịch sử chạy ở 20 F5 (runStore.ts); hẹn giờ ở 22 (scheduleStore.ts).
import { ComponentType, ReactNode, useEffect, useState } from 'react';
import { useEditor } from '../store';
import { exportPack, fileName, forgetRecent, importPack, newScript, openRecent, openScript, save, useFile } from '../scriptFile';
import { inWails } from '../windowMode';
import { openRun, useRunLog } from '../runStore';
import { scheduleOf, useSchedules } from '../scheduleStore';
import { SidebarToggle } from './icons';
import { ResizeHandle, usePanelWidth } from './PanelResize';
import Samples from './samples/Samples';
import { AIChip, Fold, LibraryFooter, RecentItem } from './library/LibraryParts';
import RunsDialog from './library/RunsDialog';
import { LibraryRun, libraryRun, runDot } from './library/runs';

export type { LibraryRun };

export type LibraryScript = { name: string; unsaved?: boolean; schedule?: string; ai?: boolean };
export type LibraryProps = {
  scripts: LibraryScript[];
  active: number;
  recent: string[]; // đường dẫn file, mới nhất trước
  aiRecent?: string[]; // trong recent: file AI tạo (chip AI)
  history: LibraryRun[];
  ready: boolean; // false: ô tìm / nút chưa hoạt động (trình duyệt – không có Go)
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  onRecent?: (path: string) => void;
  onForgetRecent?: (path: string) => void; // bỏ khỏi Mở gần đây (không xoá file); '' = xoá cả danh sách
  onHistory?: (id: string) => void; // mở lần chạy trong lịch sử – nhật ký + tô đường đã đi
  onExportPack?: () => void; // gói kịch bản .zip (bước 28 R3)
  onImportPack?: () => void;
  SamplesPanel?: ComponentType<{ onClose: () => void }>; // hộp thoại Mẫu thử (bước 33) – app thật / dữ liệu giả
  RunsPanel?: ComponentType<{ onClose: () => void }>; // hộp thoại Lịch sử chạy (Xem tất cả) – chỉ app thật
};

const KEY = 'library-collapsed';
const RUNS_SHOWN = 5; // lịch sử giữ 50 lần – thanh bên hiện 5 lần mới nhất, còn lại ở hộp thoại Lịch sử chạy
const isMac = navigator.platform.startsWith('Mac');
const mod = isMac ? '⌘' : 'Ctrl+';

const loadCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

// App thật: kịch bản đang soạn (mỗi lần mở một kịch bản) + mở gần đây.
export default function Library() {
  const { script, dirty, path } = useEditor();
  const sched = scheduleOf(useSchedules(), path);
  const { recent, aiPaths } = useFile();
  const log = useRunLog();
  const history = log.history.map((h) => libraryRun(h, log.open && !log.live && log.summary?.id === h.id));
  const ai = script.meta?.createdBy === 'ai';
  return (
    <LibraryView scripts={[{ name: script.name, unsaved: dirty, schedule: sched?.time, ai }]} active={0} recent={recent.filter((r) => r !== path)} aiRecent={aiPaths} history={history}
      ready={inWails} onNew={newScript} onOpen={openScript} onSave={() => save()} onRecent={openRecent} onForgetRecent={forgetRecent} onHistory={openRun} onExportPack={exportPack} onImportPack={importPack}
      SamplesPanel={Samples} RunsPanel={RunsDialog} />
  );
}

export function LibraryView({ scripts, active, recent, aiRecent = [], history, ready, onNew, onOpen, onSave, onRecent, onForgetRecent, onHistory, onExportPack, onImportPack, SamplesPanel, RunsPanel }: LibraryProps) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [samples, setSamples] = useState(false);
  const [runsOpen, setRunsOpen] = useState(false);
  const size = usePanelWidth('library-width', 224, 180, 420);
  const [q, setQ] = useState('');
  const [allRuns, setAllRuns] = useState(false); // không có hộp thoại (#demo): mở rộng ngay trong thanh bên
  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? '1' : '0');
    } catch { /* không lưu được thì thôi – chỉ là tiện ích */ }
  }, [collapsed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'b' || !(isMac ? e.metaKey : e.ctrlKey)) return;
      e.preventDefault();
      setCollapsed((c) => !c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = (
    <button onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}
      aria-label={collapsed ? 'Mở rộng thư viện' : 'Thu gọn thư viện'} title={`${collapsed ? 'Mở rộng' : 'Thu gọn'} thư viện (${mod}B)`}
      className="grid h-8 w-8 flex-none place-items-center rounded-control text-muted hover:bg-hover hover:text-ink">
      <SidebarToggle open={!collapsed} />
    </button>
  );

  if (collapsed) {
    return (
      <nav aria-label="Thư viện kịch bản (thu gọn)" className="flex w-11 flex-none flex-col items-center border-r border-line bg-side py-3">
        {toggle}
      </nav>
    );
  }

  const match = (t: string) => t.toLowerCase().includes(q.trim().toLowerCase());
  const shown = scripts.map((s, i) => ({ s, i })).filter(({ s }) => match(s.name));
  const recentShown = recent.filter((r) => match(fileName(r)));
  return (
    <div className="relative flex flex-none">
      <nav aria-label="Thư viện kịch bản" style={{ width: size.width }} className="flex flex-col gap-2.5 overflow-y-auto border-r border-line bg-side px-2 pt-3 pb-2.5">
        <div className="flex items-center gap-1.5 pr-1">
          <label className={`ml-1 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-control border border-line bg-surface px-2.5 text-muted focus-within:ring-focus ${ready ? '' : 'opacity-60'}`}
            title={ready ? undefined : 'Chỉ dùng được trong app'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} disabled={!ready} placeholder="Tìm kịch bản"
              className="min-w-0 flex-1 bg-transparent text-ink outline-none" />
          </label>
          {toggle}
        </div>

        <Section title="Kịch bản" count={scripts.length}>
          {shown.map(({ s, i }) => (
            <a key={i} href="#" onClick={(e) => e.preventDefault()} aria-current={i === active}
              className={`relative flex h-[34px] items-center gap-2.5 rounded-md px-2.5 ${i === active ? 'bg-hover font-semibold' : 'hover:bg-hover'}`}>
              {i === active && <span className="absolute top-[9px] left-0 h-4 w-[3px] rounded-sm bg-accent" />}
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {s.ai && <AIChip />}
              {s.schedule && (
                <span className="flex items-center gap-1 font-mono text-[11px] font-normal text-muted" title={`Hẹn chạy lúc ${s.schedule}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  {s.schedule}
                </span>
              )}
              {s.unsaved && <span className="h-1.5 w-1.5 flex-none rounded-full bg-warn" aria-label="Chưa lưu" title="Chưa lưu" />}
            </a>
          ))}
          {shown.length === 0 && <span className="px-3 py-1.5 text-[13px] text-muted">Không có kịch bản nào khớp</span>}
        </Section>

        <div className="flex flex-col gap-px border-t border-line pt-1.5">
          <Fold title="Mở gần đây" storageKey="library-recent-open" summary={recent.length || undefined}>
            {recentShown.map((r) => (
              <RecentItem key={r} path={r} name={fileName(r)} ai={aiRecent.includes(r)} onOpen={() => onRecent?.(r)} onForget={onForgetRecent && (() => onForgetRecent(r))} />
            ))}
            {recentShown.length === 0 && <span className="px-3 py-1 text-[13px] text-muted">{recent.length ? 'Không có file nào khớp' : 'Chưa có'}</span>}
            {onForgetRecent && recent.length > 0 && (
              <button onClick={() => onForgetRecent('')} title="Chỉ bỏ khỏi danh sách – file kịch bản vẫn còn"
                className="rounded-md px-3 py-1 text-left text-[13px] text-muted hover:bg-hover hover:text-ink">Xoá danh sách</button>
            )}
          </Fold>

          <Fold title="Lịch sử chạy" storageKey="library-runs-open" summary={history.slice(0, 3).map((h, i) => <span key={h.id ?? i} className={`h-1.5 w-1.5 rounded-full ${runDot(h)}`} />)}>
            {(allRuns ? history : history.slice(0, RUNS_SHOWN)).map((h, i) => (
              <a key={h.id ?? i} href="#" title={h.result} aria-current={h.active}
                onClick={(e) => { e.preventDefault(); if (h.id) onHistory?.(h.id); }}
                className={`flex items-center gap-2 rounded-md px-3 py-[7px] text-[13px] ${h.active ? 'bg-hover font-semibold' : 'hover:bg-hover'}`}>
                <span className={`h-1.5 w-1.5 flex-none rounded-full ${runDot(h)}`} />
                <span className="min-w-0 flex-1 truncate">{h.script}</span>
                <span className="font-mono text-[11px] text-muted" title={h.result}>{h.when}</span>
              </a>
            ))}
            {history.length === 0 && <span className="px-3 py-1 text-[13px] text-muted">Chưa có lần chạy nào</span>}
            {(RunsPanel ? history.length > 0 : history.length > RUNS_SHOWN) && (
              <button onClick={() => (RunsPanel ? setRunsOpen(true) : setAllRuns(!allRuns))} className="rounded-md px-3 py-1 text-left text-[13px] text-muted hover:bg-hover hover:text-ink">
                {allRuns ? 'Thu gọn' : `Xem tất cả (${history.length})…`}
              </button>
            )}
          </Fold>
        </div>

        <LibraryFooter ready={ready} mod={mod} shift={isMac ? '⇧' : 'Shift+'} onNew={onNew} onOpen={onOpen} onSave={onSave} onExportPack={onExportPack} onImportPack={onImportPack}
          onSamples={SamplesPanel && (() => setSamples(true))} />
        {samples && SamplesPanel && <SamplesPanel onClose={() => setSamples(false)} />}
        {runsOpen && RunsPanel && <RunsPanel onClose={() => setRunsOpen(false)} />}
      </nav>
      <ResizeHandle edge="right" width={size.width} onWidth={size.setWidth} onReset={size.reset} label="Bề rộng thư viện" />
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-px">
      <span className="flex justify-between px-2.5 py-1 text-[11.5px] font-semibold text-muted uppercase">{title}<span className="font-medium">{count}</span></span>
      {children}
    </div>
  );
}

