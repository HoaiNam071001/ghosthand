// Menu dọc bên trái trang Tệp (bước 63): các mục nhóm bằng vạch ngăn; mục có `page` là trang trong Tệp, mục có `onClick` là lệnh làm ngay.
// Chỉ hiển thị – Backstage ghép danh sách và nối việc.
import { RibbonIcon, RibbonIconName } from '../ribbon/ribbonIcons';
import type { BackstagePageId } from '../../shellStore';

export type NavEntry = { id: string; label: string; icon: RibbonIconName; hint?: string; page?: BackstagePageId; disabled?: boolean; title?: string; onClick?: () => void };

export default function BackstageNav({ sections, current, onPage, onBack }: {
  sections: NavEntry[][]; current: BackstagePageId; onPage: (p: BackstagePageId) => void; onBack: () => void;
}) {
  return (
    <nav aria-label="Trang Tệp" className="flex w-[216px] flex-none flex-col border-r border-line bg-side px-2 pt-3">
      <button onClick={onBack} title="Quay lại màn soạn (Esc)" className="mb-1 flex h-9 flex-none items-center gap-2.5 rounded-md px-3 text-left font-semibold hover:bg-hover">
        <span className="-rotate-90"><RibbonIcon name="up" /></span>Quay lại
      </button>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-3">
      {sections.map((sec, i) => (
        <div key={i} className={`flex flex-col gap-0.5 ${i === sections.length - 1 ? 'mt-auto border-t border-line pt-2' : 'border-t border-line pt-2'}`}>
          {sec.map((e) => {
            const on = e.page === current;
            return (
              <button key={e.id} disabled={e.disabled} title={e.title} aria-current={on ? 'page' : undefined}
                onClick={() => (e.page ? onPage(e.page) : e.onClick?.())}
                className={`relative flex h-9 items-center gap-2.5 rounded-md px-3 text-left disabled:opacity-50 ${on ? 'bg-accent-soft font-semibold text-accent-text' : 'text-ink enabled:hover:bg-hover'}`}>
                {on && <span className="absolute inset-y-2 left-0 w-[3px] rounded-sm bg-accent" />}
                <RibbonIcon name={e.icon} className={`h-4 w-4 flex-none ${on ? '' : 'text-muted'}`} />
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                {e.hint && <span className="font-mono text-[11px] font-normal text-muted">{e.hint}</span>}
              </button>
            );
          })}
        </div>
      ))}
      </div>
    </nav>
  );
}
