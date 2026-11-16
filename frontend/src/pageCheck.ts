import { tr } from './i18n/lang';
// Thử trang trên Chrome của app (bước 44) – chữ + tông màu theo kết luận web.PageCheck.verdict (khớp web.Page* trong Go).
export type Verdict = 'ok' | 'captcha' | 'blocked' | 'canvas' | 'empty' | 'loading';
export type Tone = 'ok' | 'warn' | 'danger';

const VERDICTS: Record<Verdict, { title: string; hint: string; tone: Tone }> = {
  ok: { get title() { return tr('pg.ok.t'); }, get hint() { return tr('pg.ok.h'); }, tone: 'ok' },
  captcha: { get title() { return tr('pg.cap.t'); }, get hint() { return tr('pg.cap.h'); }, tone: 'warn' },
  blocked: { get title() { return tr('pg.blk.t'); }, get hint() { return tr('pg.blk.h'); }, tone: 'danger' },
  canvas: { get title() { return tr('pg.cnv.t'); }, get hint() { return tr('pg.cnv.h'); }, tone: 'warn' },
  empty: { get title() { return tr('pg.emp.t'); }, get hint() { return tr('pg.emp.h'); }, tone: 'warn' },
  loading: { get title() { return tr('pg.ldg.t'); }, get hint() { return tr('pg.ldg.h'); }, tone: 'warn' },
};

/** Chữ + tông của kết luận; giá trị lạ coi như trống. */
export const verdictInfo = (v: string) => VERDICTS[v as Verdict] ?? VERDICTS.empty;

/** URL người dùng gõ → URL mở được (thiếu giao thức thì thêm https://), '' khi trống. */
export function normalizeUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`;
}
