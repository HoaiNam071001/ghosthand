// Hẹn giờ (bước 22) – danh sách hẹn giờ từ Go (scheduleapi.go), làm mới khi Go báo "schedule:changed".
// Lỗi lúc tới giờ (event "schedule:error") hiện thành thông báo của kịch bản.
import { useSyncExternalStore } from 'react';
import { ListSchedules, RemoveSchedule, SetSchedule } from '../wailsjs/go/app/App';
import { model } from '../wailsjs/go/models';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { setNotice } from './store';
import { inWails } from './windowMode';
import { fileName } from './scriptFile';

let list: model.Schedule[] = [];
const listeners = new Set<() => void>();
const set = (l: model.Schedule[]) => {
  list = l;
  listeners.forEach((f) => f());
};
const refresh = () => ListSchedules().then((l) => set(l ?? [])).catch(() => {});

if (inWails) {
  refresh();
  EventsOn('schedule:changed', refresh);
  EventsOn('schedule:error', (e: { path: string; error: string }) => setNotice(`Hẹn giờ ${fileName(e.path)}: ${e.error}`));
}

export const useSchedules = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => list);

const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();
export const scheduleOf = (l: model.Schedule[], path: string | null) => (path ? l.find((s) => norm(s.path) === norm(path)) ?? null : null);

// Lưu hẹn giờ cho file path; lỗi (Go kiểm tra lại) ném ra để hộp thoại hiện.
export async function saveSchedule(path: string, s: model.Schedule) {
  await SetSchedule(model.Schedule.createFrom({ ...s, path }));
  await refresh();
}

export async function removeSchedule(path: string) {
  await RemoveSchedule(path);
  await refresh();
}
