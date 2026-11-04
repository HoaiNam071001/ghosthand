// Node Hỏi người dùng (bước 56 D1): Go gửi "run:ask" (askapi.go) khi kịch bản dừng hỏi, "run:ask-done" khi đã trả
// lời / hết giờ / Dừng. Thanh mini (và màn chính nếu đang mở) hiện AskCard, trả lời qua AnswerAsk.
import { useSyncExternalStore } from 'react';
import { AnswerAsk } from '../wailsjs/go/app/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { inWails } from './windowMode';

export type UserAsk = { id: string; ref: string; message: string; items?: string[]; input?: boolean; timeoutMs?: number };

let ask: UserAsk | null = null;
const listeners = new Set<() => void>();
const set = (a: UserAsk | null) => {
  ask = a;
  listeners.forEach((l) => l());
};

if (inWails) {
  EventsOn('run:ask', (a: UserAsk) => set(a));
  EventsOn('run:ask-done', (id: string) => ask?.id === id && set(null));
}

export function answerAsk(approve: boolean, text: string) {
  if (ask) void AnswerAsk(ask.id, approve ? 'approve' : 'deny', text);
  set(null);
}

export const useUserAsk = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => ask);
