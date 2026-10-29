// Hỏi quyền dùng MCP server ngoài (bước 55 M2): Go gửi "mcp:ask" (mcpgate.go), MCPAskDialog hiện + trả lời qua
// AnswerMCP. Thanh mini quá nhỏ cho hộp hỏi → về màn chính trước. Go hết giờ chờ thì gửi "mcp:ask-timeout".
import { useSyncExternalStore } from 'react';
import { AnswerMCP } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { inWails, setWindowMode } from './windowMode';

export type MCPAsk = {
  id: string;
  kind: 'server' | 'tool';
  server: string;
  command: string;
  env?: string[];
  tool?: string;
  desc?: string;
  risk?: string;
  open?: boolean;
};
export type MCPAnswer = 'once' | 'always' | 'deny';

let ask: MCPAsk | null = null;
const listeners = new Set<() => void>();
const set = (a: MCPAsk | null) => {
  ask = a;
  listeners.forEach((l) => l());
};

if (inWails) {
  EventsOn('mcp:ask', (a: MCPAsk) => {
    set(a);
    if (location.hash) void setWindowMode('main');
  });
  EventsOn('mcp:ask-timeout', (id: string) => ask?.id === id && set(null));
}

export function answerMCP(answer: MCPAnswer) {
  if (ask) void AnswerMCP(ask.id, answer);
  set(null);
}

export const useMCPAsk = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => ask);
