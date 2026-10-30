// Nhật ký lần chạy đang xem (bước 20 F5): kết quả từng node của lần đang chạy / vừa chạy (event engine:node) hoặc
// một lần trong lịch sử (internal/store/runs.go). Canvas tô đường đã đi, bảng Nhật ký, mục "Lần chạy gần nhất" đều đọc từ đây.
import { useSyncExternalStore } from 'react';
import { ClearRuns, DeleteRun, GetRun, ListRuns, RunShot, RunStats as LoadRunStats } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { getEditor, subscribe } from './store';
import { inWails } from './windowMode';
import type { StepResult } from './types';
import type { RunStats } from './components/library/runs';

// Khớp RunSummary trong internal/model/run.go.
export type RunSummary = {
  id: string; script: string; source: string; startedAt: string; durationMs: number;
  status: 'success' | 'fail' | 'stopped'; error?: string; message?: string; nodes: number; failNode?: string;
};

const MAX_RESULTS = 2000; // khớp MaxRunResults (internal/model/run.go)

type RunLogState = {
  results: StepResult[];
  summary: RunSummary | null; // null = đang chạy / chưa chạy
  live: boolean; // true: lần chạy trong phiên này; false: mở từ lịch sử
  open: boolean; // bảng Nhật ký đang hiện
  history: RunSummary[]; // lịch sử của kịch bản đang mở, mới nhất trước
  stats: RunStats | null; // thống kê lịch sử đó (bước 28 R2)
  // kịch bản (tên + file) của lần đang xem – để đọc ảnh lúc lỗi đúng thư mục lịch sử
  owner: { name: string; path: string };
};

let state: RunLogState = { results: [], summary: null, live: true, open: false, history: [], stats: null, owner: { name: '', path: '' } };
const listeners = new Set<() => void>();
const set = (patch: Partial<RunLogState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const useRunLog = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => state);

const ownerNow = () => {
  const { script, path } = getEditor();
  return { name: script.name, path: path ?? '' };
};

// Lịch sử chạy của kịch bản đang mở (gọi khi mở kịch bản khác / chạy xong).
export async function loadHistory() {
  if (!inWails) return;
  const { name, path } = ownerNow();
  const [history, stats] = await Promise.all([
    ListRuns(name, path).catch(() => []).then((h) => (h ?? []) as unknown as RunSummary[]),
    LoadRunStats(name, path).catch(() => null) as Promise<RunStats | null>,
  ]);
  set({ history, stats });
}

// Đọc một lần chạy trong lịch sử của kịch bản đang mở (không mở bảng Nhật ký) – hộp thoại Lịch sử chạy xem trước.
export async function fetchRun(id: string): Promise<{ summary: RunSummary; results: StepResult[] } | null> {
  const rec = await GetRun(ownerNow().name, ownerNow().path, id).catch(() => null);
  if (!rec) return null;
  const { results, inputs: _, truncated: __, ...summary } = rec as unknown as RunSummary & { results: StepResult[]; inputs: unknown; truncated: number };
  return { summary: summary as RunSummary, results: results ?? [] };
}

// Mở lần chạy lên bảng Nhật ký + tô đường đã đi trên canvas.
export async function openRun(id: string) {
  const owner = ownerNow();
  const run = await fetchRun(id);
  if (run) set({ ...run, live: false, open: true, owner });
}

export const closeRunLog = () => set({ open: false });

// Xoá một lần chạy (id) hoặc cả lịch sử (id trống) của kịch bản đang mở. Bảng Nhật ký đang xem lần bị xoá → đóng
// (lần đang chạy chưa có summary – giữ nguyên).
export async function deleteRuns(id = '') {
  const { name, path } = ownerNow();
  await (id ? DeleteRun(name, path, id) : ClearRuns(name, path));
  if (state.summary && (!id || state.summary.id === id)) set({ open: false, results: [], summary: null, live: true });
  await loadHistory();
}

// Ảnh lúc lỗi của lần chạy id bất kỳ trong lịch sử kịch bản đang mở.
export const runShotUrl = (id: string, shot: string) => RunShot(ownerNow().name, ownerNow().path, id, shot).catch(() => '');

export const shotUrl = (shot: string) =>
  state.summary ? RunShot(state.owner.name, state.owner.path, state.summary.id, shot).catch(() => '') : Promise.resolve('');

// Mở kịch bản khác: bỏ nhật ký của kịch bản cũ (id node không còn nghĩa), nạp lịch sử của kịch bản mới.
// Lưu thành file khác / đổi tên: lịch sử theo file mới.
let seen = { opened: -1, key: '' };
function watchEditor() {
  const { opened, path, script } = getEditor();
  const key = `${path ?? ''}\n${script.name}`;
  if (opened === seen.opened && key === seen.key) return;
  if (opened !== seen.opened) set({ results: [], summary: null, live: true, open: false });
  seen = { opened, key };
  loadHistory();
}

if (inWails) {
  subscribe(watchEditor);
  EventsOn('engine:state', (running: boolean) => {
    if (running) set({ results: [], summary: null, live: true, open: true, owner: ownerNow() });
  });
  EventsOn('engine:node', (r: StepResult) => {
    const results = state.results.length >= MAX_RESULTS ? state.results.slice(1) : state.results.slice();
    results.push(r);
    set({ results });
  });
  EventsOn('engine:done', (summary: RunSummary) => {
    set({ summary });
    loadHistory();
  });
}
