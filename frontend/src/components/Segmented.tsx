// Segmented (design v2): nền bg-soft, lựa chọn đang bật bg-raised + bóng nhẹ. Hẹp quá thì xuống hàng, không tràn khung.
export default function Segmented<T extends string>({ value, options, onChange, label, full = false }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label?: string; full?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex min-w-0 max-w-full flex-wrap gap-y-[2px] rounded-lg bg-soft p-[3px] text-[13px] ${full ? 'w-full' : 'w-fit'}`}>
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={`h-[30px] whitespace-nowrap rounded-md px-3 ${full ? 'flex-auto' : ''} ${value === o.id ? 'bg-raised font-semibold shadow-[var(--c-raise)]' : 'text-muted hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
