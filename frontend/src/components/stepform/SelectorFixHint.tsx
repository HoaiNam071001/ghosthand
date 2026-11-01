// Gợi ý sửa selector có phần hay đổi ("Messenger, 1 unread" → aria=Messenger) – một nút bấm là thay.
export function SelectorFixHint({ why, fix, onUse }: { why: string; fix: string; onUse: () => void }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-warn">
      <span>{why}</span>
      <button onClick={onUse} className="rounded-control border border-line px-1.5 py-0.5 font-mono text-ink hover:bg-hover">
        Dùng {fix}
      </button>
    </span>
  );
}
