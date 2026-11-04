// Thẻ hỏi của node Hỏi người dùng (bước 56 D1) – chỉ hiển thị: câu hỏi, danh sách mục, ô nhập tuỳ chọn, Từ chối /
// Đồng ý. Thanh mini (thanh nở ra) và màn chính dùng chung; #demo-minibar?ask=1 xem mẫu.
import { useEffect, useRef, useState } from 'react';

export function AskCard({ message, items = [], input = false, onAnswer }: {
  message: string; items?: string[]; input?: boolean; onAnswer: (approve: boolean, text: string) => void;
}) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) onAnswer(true, text);
    else if (e.key === 'Escape') onAnswer(false, text);
    else return;
    e.preventDefault();
  };
  return (
    <div role="alertdialog" aria-label="Kịch bản đang hỏi bạn" onKeyDown={onKey}
      className="flex w-[540px] flex-col gap-2.5 rounded-hud border border-line bg-surface p-4 text-ink">
      <span className="text-xs font-semibold text-accent-text">Kịch bản đang hỏi bạn</span>
      <span className="line-clamp-3 text-[15px] font-semibold">{message}</span>
      {items.length > 0 && (
        <ul className="max-h-[84px] overflow-auto rounded-control bg-soft px-3 py-1.5 font-mono text-xs text-muted">
          {items.map((it, i) => <li key={i} className="truncate leading-5">{it}</li>)}
        </ul>
      )}
      {input && (
        <input ref={ref} value={text} onChange={(e) => setText(e.target.value)} placeholder="Gõ câu trả lời…"
          className="h-9 rounded-control border border-line bg-field px-3 outline-none focus:border-accent" />
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Enter = Đồng ý · Esc = Từ chối</span>
        <button onClick={() => onAnswer(false, text)} className="ml-auto h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">Từ chối</button>
        <button autoFocus={!input} onClick={() => onAnswer(true, text)} className="btn-primary h-9 rounded-control px-4 font-semibold text-on-accent">Đồng ý</button>
      </div>
    </div>
  );
}
