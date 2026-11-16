// Hình minh hoạ bước Cuộn (inspector): khung vùng / màn hình theo đúng tỷ lệ, điểm đặt chuột (hoặc hình con trỏ ở giữa
// nếu cuộn tại chỗ chuột), và phần trang mới hiện ra nối tiếp theo hướng cuộn – chia thành từng màn ("màn 2, 3…"),
// cuộn quá MAX_SCREENS màn thì vẽ gãy. Quãng cuộn là ước tính: SCROLL_NOTCH_PX một nấc (thực tế tuỳ app).
import { getLang } from '../../i18n/lang';
import { tr, useT } from '../../i18n';
import { Point, Rect, ScrollDirection } from '../../types';
import { SCROLL_ARROW, SCROLL_NOTCH_PX, scrollDelta } from '../../scroll';

const MAX_W = 268;
const MAX_H = 210;
const PAD = 6;
const MAX_SCREENS = 3; // phần trang vẽ tối đa 3 màn

export const fmtScreens = (n: number) => n.toLocaleString(getLang() === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 });

export default function ScrollMap({ bounds: b, at, direction, amount, label }: {
  bounds: Rect; at: Point | null; direction: ScrollDirection; amount: number; label: string;
}) {
  const t = useT();
  const d = scrollDelta({ direction, amount });
  const dist = Math.abs(d.x || d.y);
  const vertical = direction === 'up' || direction === 'down';
  const size = vertical ? b.h : b.w;
  const band = Math.min(dist, MAX_SCREENS * size); // phần trang vẽ ra
  const cut = dist > band;
  const totalW = b.w + (vertical ? 0 : band);
  const totalH = b.h + (vertical ? band : 0);
  const k = Math.min((MAX_W - 2 * PAD) / totalW, (MAX_H - 2 * PAD) / totalH);
  const W = totalW * k + 2 * PAD;
  const H = totalH * k + 2 * PAD;
  // gốc khung trong SVG: phần trang nằm phía trên / trái thì dời khung xuống / sang phải
  const fx = PAD + (direction === 'left' ? band * k : 0);
  const fy = PAD + (direction === 'up' ? band * k : 0);
  const fw = b.w * k, fh = b.h * k;
  const bandRect = {
    down: { x: fx, y: fy + fh, w: fw, h: band * k },
    up: { x: fx, y: PAD, w: fw, h: band * k },
    right: { x: fx + fw, y: fy, w: band * k, h: fh },
    left: { x: PAD, y: fy, w: band * k, h: fh },
  }[direction];
  // Vạch chia từng màn trong phần trang: cách mép khung 1, 2… màn
  const sign = direction === 'down' || direction === 'right' ? 1 : -1;
  const divs = Array.from({ length: Math.floor(band / size) }, (_, i) => (i + 1) * size).filter((v) => v < band);
  const pos = (v: number) => (vertical
    ? { x1: fx, x2: fx + fw, y1: (sign > 0 ? fy + fh : fy) + sign * v * k, y2: (sign > 0 ? fy + fh : fy) + sign * v * k }
    : { y1: fy, y2: fy + fh, x1: (sign > 0 ? fx + fw : fx) + sign * v * k, x2: (sign > 0 ? fx + fw : fx) + sign * v * k });
  // Điểm đặt chuột (toạ độ màn hình → SVG); tại chuột: giữa khung
  const p = at ?? { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const outside = !!at && (at.x < b.x || at.x > b.x + b.w || at.y < b.y || at.y > b.y + b.h);
  const px = fx + Math.min(Math.max(p.x - b.x, 0), b.w) * k, py = fy + Math.min(Math.max(p.y - b.y, 0), b.h) * k;
  // Mũi tên: từ điểm theo hướng cuộn, dài đúng quãng (tới hết phần đã vẽ)
  const len = Math.min(dist, (vertical ? b.h : b.w) + band) * k;
  const ex = px + Math.sign(d.x) * len, ey = py + Math.sign(d.y) * len;
  const screens = dist / size;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('scr.alt', { n: amount, d: dist })} className="overflow-visible">
        <defs>
          <marker id="scroll-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" className="fill-accent" />
          </marker>
          <pattern id="scroll-band" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" className="fill-accent-soft" /><line x1="0" y1="0" x2="0" y2="6" className="stroke-accent" strokeOpacity=".25" strokeWidth="2" />
          </pattern>
        </defs>
        {band > 0 && (
          <rect x={bandRect.x} y={bandRect.y} width={bandRect.w} height={bandRect.h} fill="url(#scroll-band)"
            className="stroke-accent" strokeDasharray="4 3" strokeWidth={1} />
        )}
        {divs.map((v, i) => {
          const l = pos(v);
          return (
            <g key={v}>
              <line {...l} className="stroke-accent" strokeDasharray="2 3" strokeWidth={1} />
              <text x={vertical ? l.x1 + 4 : l.x1 + 3} y={vertical ? l.y1 + sign * 11 - (sign < 0 ? 0 : 0) : l.y1 + 11}
                className="fill-accent-text text-[9px]">{t('scr.screenN', { n: i + 3 })}</text>
            </g>
          );
        })}
        {cut && (
          // cuộn quá MAX_SCREENS màn: vạch gãy ở mép ngoài
          <path d={vertical
            ? `M${bandRect.x} ${direction === 'down' ? bandRect.y + bandRect.h - 4 : bandRect.y + 4} l${bandRect.w / 4} -4 l${bandRect.w / 4} 8 l${bandRect.w / 4} -8 l${bandRect.w / 4} 4`
            : `M${direction === 'right' ? bandRect.x + bandRect.w - 4 : bandRect.x + 4} ${bandRect.y} l-4 ${bandRect.h / 4} l8 ${bandRect.h / 4} l-8 ${bandRect.h / 4} l4 ${bandRect.h / 4}`}
            fill="none" className="stroke-accent" strokeWidth={1.5} />
        )}
        <rect x={fx} y={fy} width={fw} height={fh} rx={3} className="fill-field stroke-line-strong" strokeWidth={1.5} />
        <text x={fx + 5} y={fy + 12} className="fill-muted font-mono text-[10px]">{label} {b.w} × {b.h}</text>
        {band > 0 && bandRect.w > 60 && bandRect.h > 14 && (
          <text x={bandRect.x + 5} y={vertical ? (sign > 0 ? bandRect.y + 11 : bandRect.y + bandRect.h - 4) : bandRect.y + 11}
            className="fill-accent-text text-[9px] font-semibold">{divs.length || cut ? t('scr.screenN', { n: 2 }) : t('scr.more', { d: dist })}</text>
        )}
        <line x1={px} y1={py} x2={ex} y2={ey} className="stroke-accent" strokeWidth={2.5} markerEnd="url(#scroll-ah)" />
        {at ? <circle cx={px} cy={py} r={4.5} className={`${outside ? 'fill-danger' : 'fill-accent'} stroke-surface`} strokeWidth={2} />
          : <path transform={`translate(${px - 4} ${py - 5}) scale(.5)`} d="M2 2 L2 26 L8.5 19.5 L13 30 L17.5 28 L13 18 L22 18 Z" className="fill-ink stroke-surface" strokeWidth={3} />}
      </svg>
      <span className="text-center text-xs text-muted">
        <span className="font-mono text-ink">{SCROLL_ARROW[direction]} {t('scr.notches', { n: amount, d: dist })}</span>
        {' '}≈ {screens < 1 ? t(vertical ? 'scr.pctH' : 'scr.pctW', { p: Math.round(screens * 100), label: label.toLowerCase() }) : `${fmtScreens(screens)} ${label.toLowerCase()}`}
        {cut && ` ${t('scr.cut', { n: MAX_SCREENS })}`}
        {' · '}{t('scr.est', { px: SCROLL_NOTCH_PX })}
      </span>
    </div>
  );
}
