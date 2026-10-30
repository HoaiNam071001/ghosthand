// Khối của thanh thư viện (design v3): nhóm thu gọn được có tóm tắt bên phải, chân "+ Mới" + nút icon.
// Chỉ hiển thị – LibraryView (components/Library.tsx) ghép và nối việc.
import { ReactNode, useEffect, useState } from 'react';
import { Chevron, Folder, Grid, Package, Save } from '../icons';

const loadOpen = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};

// Nhóm "Mở gần đây" / "Lịch sử chạy": thu gọn thì chỉ còn một hàng (▸ tên … tóm tắt). Nhớ mở / đóng trên máy.
export function Fold({ title, summary, storageKey, children }: { title: string; summary: ReactNode; storageKey: string; children: ReactNode }) {
  const [open, setOpen] = useState(() => loadOpen(storageKey, false));
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? '1' : '0');
    } catch { /* không lưu được thì thôi – chỉ là tiện ích */ }
  }, [open, storageKey]);
  return (
    <div className="flex flex-col gap-px">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-muted hover:bg-hover hover:text-ink">
        <Chevron open={open} />{title}<span className="ml-auto flex items-center gap-[3px]">{summary}</span>
      </button>
      {open && children}
    </div>
  );
}

// Chân thư viện: "+ Mới" + Mẫu thử / Mở / Lưu / Gói dạng nút icon (phím tắt trong tooltip).
export function LibraryFooter({ ready, mod, shift, onNew, onOpen, onSave, onSamples, onExportPack, onImportPack }: {
  ready: boolean; mod: string; shift: string; onNew?: () => void; onOpen?: () => void; onSave?: () => void; onSamples?: () => void;
  onExportPack?: () => void; onImportPack?: () => void;
}) {
  const off = ready ? undefined : 'Chỉ dùng được trong app';
  const icon = 'grid h-[34px] w-[34px] flex-none place-items-center rounded-control border border-line bg-surface text-muted enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-60';
  return (
    <div className="mt-auto flex gap-1 px-1">
      <button disabled={!ready} onClick={onNew} title={off ?? `Kịch bản mới (${mod}N)`}
        className="h-[34px] flex-1 rounded-control border border-line bg-surface text-[12.5px] enabled:hover:bg-hover disabled:opacity-60">+ Mới</button>
      {onSamples && <button onClick={onSamples} aria-label="Mẫu thử" title="Mẫu thử – kịch bản mẫu để test từng loại node" className={icon}><Grid /></button>}
      <button disabled={!ready} onClick={onOpen} aria-label="Mở kịch bản" title={off ?? `Mở kịch bản (${mod}O)`} className={icon}><Folder /></button>
      <button disabled={!ready} onClick={onSave} aria-label="Lưu" title={off ?? `Lưu (${mod}S) · Lưu thành: ${mod}${shift}S`} className={icon}><Save /></button>
      <PackMenu ready={ready} icon={icon} off={off} onExport={onExportPack} onImport={onImportPack} />
    </div>
  );
}

// Nút Gói (bước 28 R3): menu nhỏ Xuất / Nhập gói .zip – kịch bản kèm file CSV / ảnh mà node đọc, để gửi máy khác.
function PackMenu({ ready, icon, off, onExport, onImport }: { ready: boolean; icon: string; off?: string; onExport?: () => void; onImport?: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  const item = 'block w-full rounded-md px-3 py-1.5 text-left text-[13px] hover:bg-hover';
  const pick = (f?: () => void) => () => { setOpen(false); f?.(); };
  return (
    <div className="relative">
      <button disabled={!ready} onClick={() => setOpen(!open)} aria-label="Gói kịch bản" aria-expanded={open} aria-haspopup="menu"
        title={off ?? 'Gói kịch bản (.zip) – xuất kèm file CSV / ảnh để gửi máy khác, hoặc nhập gói nhận được'} className={icon}><Package /></button>
      {open && (
        <div role="menu" onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-[40px] z-30 w-[200px] rounded-panel border border-line bg-surface p-1 shadow-[0_8px_24px_rgb(0_0_0/.16)]">
          <button role="menuitem" onClick={pick(onExport)} className={item}>Xuất gói .zip…</button>
          <button role="menuitem" onClick={pick(onImport)} className={item}>Nhập gói .zip…</button>
        </div>
      )}
    </div>
  );
}

// Một dòng Mở gần đây: bấm tên để mở, ✕ (hiện khi rê chuột / focus) bỏ khỏi danh sách – không xoá file (bước 41 L4).
export function RecentItem({ path, name, ai, onOpen, onForget }: { path: string; name: string; ai: boolean; onOpen: () => void; onForget?: () => void }) {
  return (
    <div className="group flex items-center rounded-md text-[13px] text-muted hover:bg-hover hover:text-ink">
      <a href="#" title={path} onClick={(e) => { e.preventDefault(); onOpen(); }} className={`flex min-w-0 flex-1 items-center gap-2 py-[7px] pl-3 ${onForget ? '' : 'pr-3'}`}>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {ai && <AIChip />}
      </a>
      {onForget && (
        <button onClick={onForget} aria-label={`Bỏ ${name} khỏi Mở gần đây`} title="Bỏ khỏi Mở gần đây (file vẫn còn)"
          className="mr-1 grid h-6 w-6 flex-none place-items-center rounded text-muted opacity-0 group-hover:opacity-100 hover:bg-soft hover:text-ink focus-visible:opacity-100">✕</button>
      )}
    </div>
  );
}

// Chip "AI" – kịch bản AI tạo qua MCP (bước 31).
export function AIChip() {
  return <span className="flex-none rounded-full bg-soft px-1.5 font-mono text-[10.5px] font-semibold text-muted" title="AI tạo qua MCP – xem kỹ trước khi chạy">AI</span>;
}
