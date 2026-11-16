// Hàng tab + thân ribbon kiểu Word (bước 63) – chỉ hiển thị: tab, nhóm nút (nút lớn / nhỏ, nhãn nhóm), thu gọn. Việc của từng nút
// do model.ts đưa vào; RibbonHost nối store. Dùng chung app thật và màn mẫu (#demo*).
import { ReactNode, useEffect, useRef } from 'react';
import { MsgKey, useT } from '../../i18n';
import { StepIcon } from '../icons';
import { RibbonIcon } from './ribbonIcons';
import { columnsOf, RibbonGroup, RibbonItem } from './model';
import type { RibbonTabId } from '../../shellStore';

export type RibbonViewProps = {
  tabs: { id: RibbonTabId; key: MsgKey }[];
  tab: RibbonTabId;
  collapsed: boolean;
  fileActive: boolean; // trang Tệp đang mở
  groups: RibbonGroup[];
  lead?: ReactNode; // phần dính bên trái thân ribbon, không cuộn theo (ô tìm node)
  wrap?: boolean; // nhóm xuống dòng, cuộn dọc thay vì cuộn ngang (tab Chèn node – nhiều nút)
  right: ReactNode; // cạnh phải hàng tab: vòng lặp + nút Chạy
  onTab: (t: RibbonTabId) => void;
  onToggle: () => void; // thu gọn / mở ribbon
  onFile: () => void;
};

// Cuộn dọc đúng một hàng nhóm mỗi lần lăn chuột (lăn nhanh / touchpad cũng chỉ nhích một hàng, có giãn cách)
function useRowScroll(on: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.deltaY) return;
      e.preventDefault();
      const now = Date.now();
      if (now - last < 180) return;
      last = now;
      const tops = [...new Set([...el.children].map((c) => (c as HTMLElement).offsetTop))].sort((a, b) => a - b);
      const y = el.scrollTop + (el.children[0] as HTMLElement | undefined ? (el.children[0] as HTMLElement).offsetTop : 0);
      const next = e.deltaY > 0 ? tops.find((t) => t > y + 2) : [...tops].reverse().find((t) => t < y - 2);
      if (next !== undefined) el.scrollTo({ top: next - (el.children[0] as HTMLElement).offsetTop, behavior: 'smooth' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [on]);
  return ref;
}

export default function RibbonView({ tabs, tab, collapsed, fileActive, groups, lead, wrap, right, onTab, onToggle, onFile }: RibbonViewProps) {
  const tt = useT();
  const body = useRowScroll(!!wrap);
  return (
    <div className={`flex-none bg-chrome ${fileActive ? 'invisible' : ''}`} aria-hidden={fileActive}>
      <div role="tablist" aria-label="Ribbon" className="drag flex h-[34px] items-end gap-0.5 px-2.5">
        <button onClick={onFile} aria-pressed={fileActive} title={tt('rb.t.file')}
          className={`mb-0.5 h-[26px] rounded-[7px] border px-3 font-semibold ${fileActive ? 'border-transparent bg-accent-soft text-accent-text' : 'border-line bg-soft text-ink hover:bg-hover'}`}>{tt('rb.file')}</button>
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={!fileActive && tab === t.id} onClick={() => onTab(t.id)} onDoubleClick={onToggle}
            className={`relative h-[30px] rounded-t-[7px] px-3 hover:bg-hover ${!fileActive && tab === t.id ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}>
            {tt(t.key)}
            {!fileActive && tab === t.id && <span className="absolute inset-x-[28%] bottom-0 h-[3px] rounded-sm bg-accent" />}
          </button>
        ))}
        <div className="mb-[3px] ml-auto flex items-center gap-1.5">{right}</div>
      </div>
      {!collapsed && (
        <div className="relative flex h-[98px] border-y border-line bg-surface">
          {lead}
          <div ref={body} role="tabpanel" className={`flex h-full min-w-0 flex-1 py-1.5 pr-9 pl-2 ${wrap ? "flex-wrap content-start overflow-y-auto overflow-x-hidden" : "items-stretch overflow-x-auto overflow-y-hidden"}`}>
            {groups.map((g) => <Group key={g.id} group={g} wrap={wrap} />)}
          </div>
          <button onClick={onToggle} aria-label={tt('rb.collapse')} title={tt('rb.t.collapse')}
            className="absolute right-1 bottom-1 grid h-7 w-7 place-items-center rounded-md bg-surface/90 text-muted hover:bg-hover hover:text-ink">
            <RibbonIcon name="up" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function Group({ group, wrap }: { group: RibbonGroup; wrap?: boolean }) {
  return (
    <div role="group" aria-label={group.label} className="flex flex-none flex-col border-r border-line px-2 last:border-r-0">
      <div className={`flex flex-1 items-start gap-0.5 ${wrap ? "flex-wrap" : ""}`}>
        {columnsOf(group.items).map((col, i) => (
          col[0].size === 'big' || (col.length === 1 && col[0].custom) ? <Cell key={i} item={col[0]} />
            : <div key={i} className="flex flex-col gap-px">{col.map((it) => <Cell key={it.id} item={it} />)}</div>
        ))}
      </div>
      <div className="truncate pt-0.5 pb-1 text-center text-[11px] text-faint">{group.label}</div>
    </div>
  );
}

const tone = (it: RibbonItem) => (it.danger ? 'text-danger-text' : it.cat ? 'text-cat' : '');

function Cell({ item: it }: { item: RibbonItem }) {
  if (it.custom) return <>{it.custom}</>;
  const big = it.size === 'big';
  const icon = it.step ? <StepIcon type={it.step} className={big ? 'h-6 w-6' : 'h-3.5 w-3.5'} />
    : it.icon ? <RibbonIcon name={it.icon} className={big ? 'h-6 w-6' : 'h-3.5 w-3.5'} /> : null;
  const on = it.active ? 'bg-accent-soft text-accent-text' : 'hover:bg-hover';
  return (
    <button onClick={it.onClick} disabled={it.disabled} title={it.title ?? (it.hotkey ? `${it.label} (${it.hotkey})` : it.label)} aria-pressed={it.active}
      className={`${it.cat ? `cat-${it.cat}` : ''} ${on} rounded-[7px] disabled:cursor-default disabled:opacity-45 disabled:hover:bg-transparent ${big
        ? 'flex h-[66px] min-w-[52px] max-w-[92px] flex-none flex-col items-center gap-1.5 px-2 pt-[7px] text-center text-[11.5px] leading-[1.15]'
        : 'flex h-[21px] max-w-[160px] items-center gap-1.5 pr-2 pl-1.5 text-xs whitespace-nowrap'}`}>
      <span className={`flex flex-none ${tone(it)}`}>{icon}</span>
      <span className={big ? 'line-clamp-2' : 'truncate'}>{it.label}</span>
    </button>
  );
}
