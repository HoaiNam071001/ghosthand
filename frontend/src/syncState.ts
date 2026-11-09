// Đồng bộ cloud (bước 54 C8): trạng thái + hộp hỏi xung đột. Go gửi "sync:status" (syncrun.go), "sync:conflict" (syncgate.go),
// "sync:done" (kéo được thứ gì về → nạp lại thứ đang hiện). Hộp hỏi trả lời qua AnswerSyncConflict.
import { useEffect, useSyncExternalStore } from 'react';
import { AnswerSyncConflict, SyncStatus as GetSyncStatus } from '../wailsjs/go/app/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { setWindowMode, inWails } from './windowMode';

import type { SyncAnswer, SyncConflict, SyncStatus, SyncSummary } from './sync/types';
export { EMPTY_STATUS } from './sync/types';
import { EMPTY_STATUS } from './sync/types';
export type { SyncAnswer, SyncConflict, SyncStatus, SyncSummary };

let status: SyncStatus = EMPTY_STATUS;
let ask: SyncConflict | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function setSyncStatus(s: SyncStatus) {
  status = s;
  notify();
}
export const refreshSyncStatus = () => GetSyncStatus().then((s) => setSyncStatus(s as SyncStatus)).catch(() => undefined);

// Sự kiện kéo được file về: giao diện nạp lại thứ đang mở (cài đặt / kịch bản) – xử lý ở nơi dùng (onSyncPulled).
const pulledListeners = new Set<(paths: string[]) => void>();
export const onSyncPulled = (l: (paths: string[]) => void) => {
  pulledListeners.add(l);
  return () => { pulledListeners.delete(l); };
};

if (inWails) {
  EventsOn('sync:status', (s: SyncStatus) => setSyncStatus(s));
  EventsOn('sync:conflict', (c: SyncConflict) => {
    ask = c;
    notify();
    if (location.hash) void setWindowMode('main');
  });
  EventsOn('sync:conflict-timeout', (id: string) => {
    if (ask?.id === id) { ask = null; notify(); }
  });
  EventsOn('sync:done', (s: SyncSummary) => pulledListeners.forEach((l) => l(s.pulls ?? [])));
}

export function answerSyncConflict(answer: SyncAnswer) {
  if (ask) void AnswerSyncConflict(ask.id, answer);
  ask = null;
  notify();
}

export const useSyncStatus = () => {
  useEffect(() => { if (inWails) void refreshSyncStatus(); }, []);
  return useSyncExternalStore(subscribe, () => status);
};
export const useSyncConflict = () => useSyncExternalStore(subscribe, () => ask);
