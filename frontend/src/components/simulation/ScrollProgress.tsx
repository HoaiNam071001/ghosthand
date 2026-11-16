import { Point } from '../../types';
import { useT } from '../../i18n';
import { SCROLL_ARROW } from '../../scroll';
import { fmtScreens } from '../steps/ScrollMap';
import { MockPage, unitText, usePageKind } from '../MockPage';
import type { SimState } from '../Simulation';

// Bước cuộn trong Xem trước: mũi tên từ chỗ chuột theo hướng cuộn (dừng ở mép cửa sổ) + "trang thu nhỏ" cạnh con trỏ –
// trang mẫu (kiểu chọn ở thanh công cụ, MockPage.tsx) theo đúng tỷ lệ, khung màn hình trượt dọc trang theo quãng
// đã cuộn, số "đã cuộn x / y px · n màn · ≈ k dòng danh sách".
const PAGE_MAX = { w: 120, h: 240 };

export default function ScrollProgress({ sc, toClient }: { sc: NonNullable<SimState['scroll']>; toClient: (p: Point) => Point }) {
  const t = useT();
  const kind = usePageKind();
  const vertical = sc.dir === 'up' || sc.dir === 'down';
  const sign = sc.dir === 'down' || sc.dir === 'right' ? 1 : -1;
  const done = Math.round(sc.dist * sc.k);
  // mũi tên (toạ độ cửa sổ): dài theo quãng đã cuộn, giữ trong cửa sổ
  const a = toClient(sc.from);
  const far = toClient({ x: sc.from.x + (vertical ? 0 : sign * done), y: sc.from.y + (vertical ? sign * done : 0) });
  const tip = { x: Math.min(Math.max(far.x, 12), window.innerWidth - 12), y: Math.min(Math.max(far.y, 12), window.innerHeight - 12) };

  // Trang thu nhỏ: trục cuộn = chiều dài trang (màn hình + quãng cuộn), trục kia = bề rộng màn hình.
  const view = vertical ? sc.view.h : sc.view.w; // cỡ màn theo trục cuộn
  const across = vertical ? sc.view.w : sc.view.h;
  const pageLen = view + sc.dist;
  const s = Math.min((vertical ? PAGE_MAX.w : PAGE_MAX.h) / across, (vertical ? PAGE_MAX.h : PAGE_MAX.w) / pageLen);
  const L = pageLen * s, A = across * s, V = view * s;
  // vị trí khung màn hình trên trang (theo trục cuộn): xuống / phải bắt đầu ở đầu trang, lên / trái ở cuối trang
  const off = (sign > 0 ? sc.k : 1 - sc.k) * sc.dist * s;
  const W = vertical ? A : L, H = vertical ? L : A;
  // đặt cạnh phải con trỏ, sát mép phải thì sang trái
  const left = a.x + 28 + W + 24 > window.innerWidth ? a.x - 28 - W - 16 : a.x + 28;
  const top = Math.min(Math.max(a.y - H / 2, 8), window.innerHeight - H - 56);
  return (
    <>
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <defs>
          <marker id="sim-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="#FF4FA3" />
          </marker>
        </defs>
        {done > 0 && <line x1={a.x} y1={a.y} x2={tip.x} y2={tip.y} stroke="#FF4FA3" strokeWidth={5} strokeLinecap="round" markerEnd="url(#sim-ah)" />}
      </svg>
      <div className="absolute flex flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-[rgb(20_22_30/.88)] p-2.5 shadow-[0_8px_24px_rgb(0_0_0/.4)]"
        style={{ left, top }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label={t('sm.scrollAria')}>
          <MockPage kind={kind} W={across} L={pageLen} s={s} horizontal={!vertical} />
          {/* vạch mỗi màn */}
          {Array.from({ length: Math.floor(pageLen / view) }, (_, i) => (i + 1) * V).filter((v) => v < L - 1).map((v) => (
            vertical
              ? <line key={v} x1={0} x2={W} y1={sign > 0 ? v : L - v} y2={sign > 0 ? v : L - v} stroke="#FF4FA3" strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
              : <line key={v} y1={0} y2={H} x1={sign > 0 ? v : L - v} x2={sign > 0 ? v : L - v} stroke="#FF4FA3" strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
          ))}
          {/* khung màn hình đang nhìn thấy */}
          <rect x={vertical ? 1 : off + 1} y={vertical ? off + 1 : 1} width={vertical ? A - 2 : V - 2} height={vertical ? V - 2 : A - 2}
            rx={2} fill="#FF4FA3" fillOpacity={0.18} stroke="#FF4FA3" strokeWidth={2.5} />
        </svg>
        <span className="text-center font-mono text-[11px] leading-tight text-white">
          {SCROLL_ARROW[sc.dir]} {done.toLocaleString('vi-VN')} / {sc.dist.toLocaleString('vi-VN')} px
          <br /><span className="text-white/60">{fmtScreens(done / view)} / {fmtScreens(sc.dist / view)} {t('sm.screens')}</span>
          {vertical && unitText(kind, sc.dist) && <><br /><span className="text-white/60">{unitText(kind, sc.dist)}</span></>}
        </span>
      </div>
    </>
  );
}
