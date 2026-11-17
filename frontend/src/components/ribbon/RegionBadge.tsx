// Sơ đồ các màn hình thu nhỏ trên nút "Vùng màn hình", xếp đúng như trong cài đặt hiển thị của hệ điều hành:
// màn chứa vùng viền sáng, ô đặc = phần được chọn (chỉ hiển thị).
import type { Translate } from '../../i18n/core';
import type { RegionSummary } from '../../overlay/regionSummary';

// Chữ ngắn dưới nhãn nút: "Toàn màn" / "800×600", thêm "Màn 2 · " khi máy có nhiều màn.
export function regionCaption(s: RegionSummary, t: Translate): string {
  const what = s.full ? t('rb.region.full') : `${s.w}×${s.h}`;
  return s.display ? `${t('rb.region.disp', { n: s.display })} · ${what}` : what;
}

const MAX_W = 64;
const MAX_H = 26;

export function RegionBadge({ s }: { s: RegionSummary }) {
  const { aspect, screens, region } = s.map;
  const w = Math.min(MAX_W, MAX_H * aspect), h = w / aspect; // vừa khung, giữ tỉ lệ thật
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const box = (r: { x: number; y: number; w: number; h: number }, min = 0) => ({ left: pct(r.x), top: pct(r.y), width: pct(Math.max(r.w, min)), height: pct(Math.max(r.h, min)) });
  return (
    <span aria-hidden className="relative block" style={{ width: w, height: h }}>
      {screens.map((sc, i) => (
        <span key={i} style={box(sc.rect)} className={`absolute box-border rounded-[2px] border-[1.5px] ${sc.active ? 'border-current' : 'border-current opacity-35'}`} />
      ))}
      <span className="absolute rounded-[1px] bg-accent opacity-80" style={box(region, 0.05)} />
    </span>
  );
}
