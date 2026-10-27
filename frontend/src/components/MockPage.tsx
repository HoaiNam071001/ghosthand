// Trang mẫu cho "trang thu nhỏ" khi Xem trước bước cuộn: vẽ khối theo kích thước thật (px của trang) rồi thu nhỏ theo
// tỷ lệ s – nhờ vậy 1500 px trên danh sách thấy được ≈ 23 dòng, trên feed ≈ 3 bài. Chọn kiểu ở thanh công cụ Xem trước.
import { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePopover } from './usePopover';
import { useTheme } from '../theme';

export type PageKind = 'text' | 'web' | 'list' | 'grid' | 'feed' | 'table' | 'none'; // none: không phủ nền, nhìn màn hình thật

// unit: chiều cao (px thật) một "đơn vị" để đếm – dòng chữ, dòng danh sách, hàng ô, bài, hàng bảng
export const PAGE_KINDS: { id: PageKind; label: string; hint: string; unit: number; unitName: string }[] = [
  { id: 'text', label: 'Văn bản', hint: 'Bài viết, tài liệu', unit: 24, unitName: 'dòng chữ' },
  { id: 'web', label: 'Trang web', hint: 'Đầu trang, ảnh lớn, các khối nội dung', unit: 0, unitName: '' },
  { id: 'list', label: 'Danh sách', hint: 'Tin nhắn, danh bạ, kết quả tìm kiếm', unit: 64, unitName: 'dòng danh sách' },
  { id: 'grid', label: 'Lưới', hint: 'Sản phẩm, ảnh, video', unit: 300, unitName: 'hàng ô' },
  { id: 'feed', label: 'Feed', hint: 'Bài đăng mạng xã hội', unit: 520, unitName: 'bài đăng' },
  { id: 'table', label: 'Bảng', hint: 'Bảng tính, bảng dữ liệu', unit: 36, unitName: 'hàng bảng' },
  { id: 'none', label: 'Không', hint: 'Nhìn màn hình thật, chỉ có trang thu nhỏ', unit: 0, unitName: '' },
];

// ---- kiểu trang đang chọn (nhớ trên máy, lỗi storage thì dùng mặc định) ----
const KEY = 'ghosthand.previewPage';
let kind: PageKind = (() => {
  try {
    const v = localStorage.getItem(KEY) as PageKind | null;
    return v && PAGE_KINDS.some((k) => k.id === v) ? v : 'web';
  } catch {
    return 'web';
  }
})();
const listeners = new Set<() => void>();
export const usePageKind = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => kind);
export function setPageKind(k: PageKind) {
  kind = k;
  try {
    localStorage.setItem(KEY, k);
  } catch { /* không lưu được thì thôi */ }
  listeners.forEach((l) => l());
}

// "≈ 23 dòng danh sách" cho quãng dist px
export function unitText(k: PageKind, dist: number) {
  const u = PAGE_KINDS.find((x) => x.id === k)!;
  if (!u.unit) return '';
  const n = dist / u.unit;
  return `≈ ${n < 10 ? n.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : Math.round(n)} ${u.unitName}`;
}

// ---- vẽ ----
// Bảng màu theo theme của app (overlay luôn tối nên không dùng token CSS ở đây). dark = chữ đậm / tiêu đề.
type Palette = { page: string; ink: string; soft: string; img: string; dark: string; acc: string; line: string; card: string };
const LIGHT: Palette = { page: '#ffffff', ink: '#9aa3b5', soft: '#c3cad8', img: '#d5dbe6', dark: '#3b4252', acc: '#5b8def', line: '#e4e8ef', card: '#ffffff' };
const DARK: Palette = { page: '#171a23', ink: '#4f586c', soft: '#3a4152', img: '#2a303f', dark: '#c3cada', acc: '#7aa7ff', line: '#2a2f3c', card: '#1e222d' };

// Theme thật của app: sáng / tối, hoặc theo hệ điều hành khi đặt "hệ thống".
const darkMq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
export function useDarkPage() {
  const theme = useTheme();
  const sys = useSyncExternalStore((l) => {
    darkMq?.addEventListener('change', l);
    return () => darkMq?.removeEventListener('change', l);
  }, () => !!darkMq?.matches);
  return theme === 'dark' || (theme === 'system' && sys);
}
const rnd = (i: number) => ((i * 9301 + 49297) % 233280) / 233280; // giả ngẫu nhiên cố định theo chỉ số

// Nội dung trang rộng W, dài L (px thật) – trả phần tử SVG theo px thật; nơi dùng bọc <g transform="scale(s)">.
function blocks(k: PageKind, W: number, L: number, C: Palette): ReactNode[] {
  const out: ReactNode[] = [];
  const bar = (key: string, x: number, y: number, w: number, h: number, fill: string, r = h / 2) =>
    out.push(<rect key={key} x={x} y={y} width={Math.max(w, 0)} height={h} rx={r} fill={fill} />);
  const lines = (key: string, x: number, y: number, w: number, n: number, gap = 24, h = 10) => {
    for (let i = 0; i < n; i++) bar(`${key}-${i}`, x, y + i * gap, w * (i === n - 1 ? 0.55 : 0.8 + 0.2 * rnd(i + y)), h, C.ink);
  };
  // số thứ tự khối (dòng #1, Bài 2…) – nhìn là biết đã cuộn tới đâu
  const num = (key: string, x: number, y: number, t: string, anchor: 'start' | 'end' = 'start') =>
    out.push(<text key={key} x={x} y={y} textAnchor={anchor} fontSize={16} fontWeight={700} fill={C.acc} fontFamily="ui-monospace, monospace">{t}</text>);
  const pad = W * 0.06;
  let y = 0;
  let i = 0;
  switch (k) {
    case 'text':
      y = 40;
      while (y < L) {
        if (i % 3 === 0) { bar(`h${i}`, pad, y, W * 0.4, 18, C.dark, 4); y += 40; }
        num(`pn${i}`, pad - 12, y + 10, `${i + 1}`, 'end');
        const n = 4 + Math.floor(rnd(i) * 4);
        lines(`p${i}`, pad, y, W - 2 * pad, n);
        y += n * 24 + 28;
        i++;
      }
      break;
    case 'web': {
      bar('nav', 0, 0, W, 64, C === DARK ? C.soft : C.dark, 0);
      for (let j = 0; j < 4; j++) bar(`nav${j}`, W - pad - (j + 1) * 90, 26, 60, 12, C.page, 6);
      bar('hero', 0, 64, W, 420, C.img, 0);
      bar('hero-t', pad, 200, W * 0.45, 36, C.dark, 6);
      bar('hero-b', pad, 270, 160, 44, C.acc, 10);
      y = 540;
      while (y < L) {
        bar(`s${i}`, pad, y, W * 0.3, 24, C.dark, 5);
        num(`sn${i}`, pad + W * 0.3 + 16, y + 19, `Mục ${i + 1}`);
        y += 56;
        const cols = 3, gap = 24, cw = (W - 2 * pad - gap * (cols - 1)) / cols;
        for (let c = 0; c < cols; c++) {
          const x = pad + c * (cw + gap);
          bar(`c${i}-${c}`, x, y, cw, cw * 0.62, C.img, 8);
          lines(`ct${i}-${c}`, x, y + cw * 0.62 + 16, cw, 2);
        }
        y += cw * 0.62 + 90;
        lines(`sp${i}`, pad, y, W - 2 * pad, 3);
        y += 120;
        i++;
      }
      break;
    }
    case 'list':
      while (y < L) {
        out.push(<circle key={`a${i}`} cx={pad + 20} cy={y + 32} r={20} fill={C.img} />);
        bar(`n${i}`, pad + 56, y + 16, (W - pad * 2 - 56) * (0.35 + 0.25 * rnd(i)), 12, C.dark);
        bar(`m${i}`, pad + 56, y + 38, (W - pad * 2 - 56) * (0.5 + 0.4 * rnd(i + 7)), 10, C.ink);
        bar(`l${i}`, pad + 56, y + 63, W - pad - 56, 1, C.line, 0);
        num(`ln${i}`, W - pad, y + 38, `#${i + 1}`, 'end');
        y += 64;
        i++;
      }
      break;
    case 'grid': {
      const cols = 4, gap = 20, cw = (W - 2 * pad - gap * (cols - 1)) / cols;
      y = 24;
      while (y < L) {
        for (let c = 0; c < cols; c++) {
          const x = pad + c * (cw + gap);
          bar(`g${i}-${c}`, x, y, cw, cw * 0.75, C.img, 8);
          bar(`gt${i}-${c}`, x, y + cw * 0.75 + 12, cw * (0.6 + 0.3 * rnd(i * 4 + c)), 10, C.ink);
          bar(`gp${i}-${c}`, x, y + cw * 0.75 + 32, cw * 0.3, 10, C.acc);
        }
        num(`gn${i}`, pad - 10, y + 20, `${i + 1}`, 'end');
        y += 300;
        i++;
      }
      break;
    }
    case 'feed': {
      const fw = Math.min(W - 2 * pad, 680), fx = (W - fw) / 2;
      y = 16;
      while (y < L) {
        out.push(<rect key={`f${i}`} x={fx} y={y} width={fw} height={500} rx={10} fill={C.card} stroke={C.line} strokeWidth={2} />);
        out.push(<circle key={`fa${i}`} cx={fx + 36} cy={y + 36} r={20} fill={C.img} />);
        bar(`fn${i}`, fx + 68, y + 28, 140, 12, C.dark);
        num(`fnn${i}`, fx + fw - 16, y + 42, `Bài ${i + 1}`, 'end');
        lines(`ft${i}`, fx + 16, y + 76, fw - 32, 2);
        bar(`fi${i}`, fx, y + 130, fw, 300, C.img, 0);
        for (let j = 0; j < 3; j++) bar(`fb${i}-${j}`, fx + 16 + j * (fw / 3), y + 455, fw / 5, 12, C.soft);
        y += 520;
        i++;
      }
      break;
    }
    case 'table': {
      const cols = 5, cw = (W - 2 * pad) / cols;
      bar('th', pad, 20, W - 2 * pad, 36, C.dark, 4);
      y = 56;
      while (y < L) {
        if (i % 2) bar(`tr${i}`, pad, y, W - 2 * pad, 36, C.line, 0);
        num(`tn${i}`, pad - 10, y + 24, `${i + 1}`, 'end');
        for (let c = 0; c < cols; c++) bar(`td${i}-${c}`, pad + c * cw + 10, y + 13, cw * (0.35 + 0.45 * rnd(i * cols + c)), 10, c === 0 ? C.dark : C.ink);
        y += 36;
        i++;
      }
      break;
    }
  }
  return out;
}

// Trang mẫu: khung W × L (px thật) thu nhỏ theo s. horizontal: trang ngang (cuộn trái / phải) – xoay trang dọc 90°.
export function MockPage({ kind: k, W, L, s, horizontal = false }: { kind: PageKind; W: number; L: number; s: number; horizontal?: boolean }) {
  const C = useDarkPage() ? DARK : LIGHT;
  return (
    <g transform={horizontal ? `translate(0 ${W * s}) rotate(-90) scale(${s})` : `scale(${s})`}>
      <rect width={W} height={L} fill={C.page} />
      {blocks(k, W, L, C)}
    </g>
  );
}

// Nút chọn kiểu trang trên thanh công cụ Xem trước (HUD tối): danh sách kèm hình thu nhỏ từng kiểu.
export function PageKindPicker({ className = '' }: { className?: string }) {
  const k = usePageKind();
  const { open, setOpen, ref } = usePopover({ escOnly: true });
  const cur = PAGE_KINDS.find((x) => x.id === k)!;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} title="Trang mẫu phủ nền khi Xem trước (đúng tỷ lệ px) – cuộn thì trang trượt theo, để hình dung cuộn tới đâu"
        className={`${className} ${open ? 'bg-white/14 text-white' : 'hover:bg-white/6'}`}>
        {k !== 'none' && <Thumb kind={k} size={18} />}Nền: {cur.label}
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-1/2 z-40 mt-2 grid w-[392px] -translate-x-1/2 grid-cols-3 gap-1.5 rounded-xl border border-white/12 bg-[rgb(24_27_36/.97)] p-2 shadow-[0_12px_32px_rgb(0_0_0/.45)]">
          {PAGE_KINDS.map((x) => (
            <button key={x.id} role="menuitemradio" aria-checked={x.id === k} onClick={() => { setPageKind(x.id); setOpen(false); }}
              className={`flex min-w-0 flex-col items-center gap-1.5 rounded-lg p-2 text-center ${x.id === k ? 'bg-white/14 ring-2 ring-accent' : 'hover:bg-white/8'}`}>
              {x.id === 'none'
                ? <span className="grid h-[55px] w-[74px] place-items-center rounded-[3px] border border-dashed border-white/30 text-[11px] text-white/50">màn hình thật</span>
                : <Thumb kind={x.id} size={74} />}
              <span className="text-[13px] font-semibold text-white">{x.label}</span>
              <span className="w-full text-[11px] leading-tight whitespace-normal text-white/55">{x.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Trang mẫu phủ kín vùng / màn hình trong Xem trước (bán trong suốt – vẫn thấy màn hình thật), đúng tỷ lệ px thật; cuộn thì trượt theo offset (px trang đã cuộn).
// rect: khung vùng / màn hình theo toạ độ cửa sổ overlay; s: px cửa sổ trên 1 px thật; range: scrollRange() để vẽ đủ dài.
export function PageBackdrop({ kind: k, rect, s, offset, range }: {
  kind: PageKind; rect: { x: number; y: number; w: number; h: number }; s: number; offset: { x: number; y: number };
  range: { minX: number; maxX: number; minY: number; maxY: number };
}) {
  if (k === 'none' || s <= 0) return null;
  const W = rect.w / s + range.maxX - range.minX;
  const L = rect.h / s + range.maxY - range.minY;
  return (
    <div className="pointer-events-none absolute overflow-hidden" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} aria-hidden>
      <svg width={W * s} height={L * s} className="absolute top-0 left-0 opacity-[.4]"
        style={{ transform: `translate(${-(offset.x - range.minX) * s}px, ${-(offset.y - range.minY) * s}px)` }}>
        <MockPage kind={k} W={W} L={L} s={s} />
      </svg>
    </div>
  );
}

// Hình thu nhỏ một kiểu trang (một màn 1280 × 960 thu nhỏ)
function Thumb({ kind: k, size }: { kind: PageKind; size: number }) {
  const W = 1280, L = 960, s = size / W;
  return (
    <svg width={size} height={L * s} viewBox={`0 0 ${size} ${L * s}`} className="flex-none overflow-hidden rounded-[3px]" aria-hidden>
      <MockPage kind={k} W={W} L={L} s={s} />
    </svg>
  );
}
