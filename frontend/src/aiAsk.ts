// AI muốn chạy kịch bản (bước 31b – mức "Hỏi trước khi chạy"): Go gửi "ai:ask" (mcprun.go), AIRunDialog hiện + trả lời
// qua AnswerAIRun. Thanh mini quá nhỏ cho hộp hỏi → về màn chính trước. Go hết giờ chờ thì gửi "ai:ask-timeout".
import { useSyncExternalStore } from 'react';
import { AnswerAIRun } from '../wailsjs/go/app/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import type { AIAsk } from './aiScope';
import { inWails, setWindowMode } from './windowMode';

export type AIAnswer = 'once' | 'script' | 'deny';

let ask: AIAsk | null = null;
const listeners = new Set<() => void>();
const set = (a: AIAsk | null) => {
  ask = a;
  listeners.forEach((l) => l());
};

if (inWails) {
  EventsOn('ai:ask', (a: AIAsk) => {
    set(a);
    if (location.hash) void setWindowMode('main');
  });
  EventsOn('ai:ask-timeout', (id: string) => ask?.id === id && set(null));
}

export function answerAI(answer: AIAnswer) {
  if (ask) void AnswerAIRun(ask.id, answer);
  set(null);
}

export const useAIAsk = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => ask);
