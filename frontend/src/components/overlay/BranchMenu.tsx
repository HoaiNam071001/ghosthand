// Menu Nhánh trên thanh Xem trước (chỉ hiển thị): mỗi node rẽ nhánh chọn cổng xem trước đi – mặc định cổng đầu.
import { useT } from '../../i18n';
import type { BranchChoices, BranchNode } from '../../flow/preview';
import Segmented from '../Segmented';
import { usePopover } from '../usePopover';

const portOf = (b: BranchNode, choices: BranchChoices) =>
  b.ports.some((p) => p.id === choices[b.id]) ? choices[b.id] : b.ports[0].id;

export function BranchMenu({ branches, choices, onChoose, onReset, className }: {
  branches: BranchNode[]; choices: BranchChoices; onChoose: (id: string, port: string) => void; onReset: () => void; className: string;
}) {
  const t = useT();
  const { open, setOpen, ref } = usePopover({ escOnly: true });
  const changed = branches.filter((b) => portOf(b, choices) !== b.ports[0].id).length;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} title={t('bm.tip')}
        className={`${className} ${open ? 'bg-white/14 text-white' : 'hover:bg-white/6'}`}>
        {t('bm.branch')}{changed > 0 && <span className="rounded-full bg-accent px-1.5 font-mono text-[11px] text-on-accent">{changed}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-1/2 z-40 mt-2 flex max-h-[60vh] w-[420px] -translate-x-1/2 flex-col gap-1 overflow-y-auto rounded-xl border border-white/12 bg-[rgb(24_27_36/.97)] p-2 shadow-[0_12px_32px_rgb(0_0_0/.45)]">
          <span className="px-1.5 pb-1 text-xs text-muted">{t('bm.note')}</span>
          {branches.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/5">
              <span className="font-mono text-xs text-muted">{b.ref}</span>
              <span className="min-w-0 flex-1 truncate">{b.title}</span>
              <div className="max-w-[240px] overflow-x-auto">
                <Segmented label={t('bm.of', { ref: b.ref })} value={portOf(b, choices)} options={b.ports} onChange={(p) => onChoose(b.id, p)} />
              </div>
            </div>
          ))}
          {changed > 0 && (
            <button onClick={onReset} className="mt-1 h-9 rounded-lg text-sm hover:bg-white/8">{t('bm.reset')}</button>
          )}
        </div>
      )}
    </div>
  );
}
