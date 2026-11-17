// Tóm tắt vùng màn hình của kịch bản để hiện trên ribbon: vùng nằm ở màn nào, toàn màn hay một phần, và sơ đồ các màn
// theo cách xếp trong hệ điều hành. Logic thuần – không React / Wails.
import type { Rect } from '../types';

export type DisplayLike = { index: number; main: boolean; rect: Rect };

// Sơ đồ các màn: mọi toạ độ 0..1 trong khung bao của tất cả màn; aspect = rộng / cao của khung bao.
export type ScreenMap = { aspect: number; screens: { rect: Rect; active: boolean; main: boolean }[]; region: Rect };

export type RegionSummary = {
  full: boolean; // cả màn (vùng trống = toàn màn chính, hoặc vùng khớp đúng một màn)
  display: number | null; // số màn (từ 1); null khi máy chỉ có một màn – khỏi nhắc "Màn 1"
  w: number;
  h: number;
  map: ScreenMap;
};

const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// region = null → toàn màn chính. Chưa có danh sách màn (đang tải / trình duyệt) → undefined, ribbon không hiện gì thêm.
export function summarizeRegion(region: Rect | null | undefined, displays: DisplayLike[]): RegionSummary | undefined {
  if (!displays.length) return undefined;
  const multi = displays.length > 1;
  const main = displays.find((x) => x.main) ?? displays[0];
  const abs = region ?? main.rect;
  // màn chứa phần lớn vùng nhất (vùng có thể lệch ra ngoài mép sau khi đổi độ phân giải)
  const d = region ? displays.reduce((best, x) => (overlap(region, x.rect) > overlap(region, best.rect) ? x : best), displays[0]) : main;
  const full = !region || (region.x === d.rect.x && region.y === d.rect.y && region.w === d.rect.w && region.h === d.rect.h);
  const x0 = Math.min(...displays.map((s) => s.rect.x)), y0 = Math.min(...displays.map((s) => s.rect.y));
  const bw = Math.max(...displays.map((s) => s.rect.x + s.rect.w)) - x0, bh = Math.max(...displays.map((s) => s.rect.y + s.rect.h)) - y0;
  const norm = (r: Rect): Rect => ({ x: (r.x - x0) / bw, y: (r.y - y0) / bh, w: r.w / bw, h: r.h / bh });
  return {
    full, display: multi ? d.index + 1 : null, w: abs.w, h: abs.h,
    map: { aspect: bw / bh, screens: displays.map((s) => ({ rect: norm(s.rect), active: s === d, main: s.main })), region: norm(abs) },
  };
}
