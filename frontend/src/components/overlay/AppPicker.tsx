// Nút "Ứng dụng" trên thanh overlay: chọn app để nhảy tới (macOS: sang Space của app đang toàn màn hình) rồi chọn vùng ở đó.
// Chỉ hiển thị – danh sách + việc focus do hook truyền vào.
import { useState } from 'react';
import type { WindowChoice } from '../../overlay/windowChoices';

export function AppPicker({ choices, onOpen, onPick }: { choices: WindowChoice[]; onOpen: () => void; onPick: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative group-data-[vertical]/bar:static">
      <button onClick={() => { if (!open) onOpen(); setOpen(!open); }} aria-expanded={open} title="Chuyển sang app khác (kể cả app đang toàn màn hình) để chọn vùng ở đó"
        className="flex h-[38px] items-center gap-1.5 rounded-md bg-white/5 px-2.5 hover:bg-white/10">
        <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden><rect x="1" y="1" width="12" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M1 4h12" stroke="currentColor" strokeWidth="1.4" /></svg>
        <span className="group-data-[compact]/bar:hidden">Ứng dụng</span>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-10 mt-1.5 max-h-[320px] w-[260px] overflow-auto rounded-lg border border-hud-line bg-hud p-1 shadow-lg group-data-[vertical]/bar:static group-data-[vertical]/bar:w-full">
          {choices.length === 0 && <div className="px-3 py-2 text-[13px] text-hud-text/60">Không thấy cửa sổ nào</div>}
          {choices.map((c) => (
            <button key={c.id} role="menuitem" onClick={() => { setOpen(false); onPick(c.id); }} title={c.title}
              className="block w-full truncate rounded-md px-3 py-2 text-left text-[13px] hover:bg-white/10">{c.app}</button>
          ))}
        </div>
      )}
    </div>
  );
}
