// Khung vẽ trên overlay (chỉ hiển thị): vùng, khung "Thử tìm", khung khoanh ảnh mẫu.
import { tr, useT } from '../../i18n';
import type { ReactNode } from 'react';
import { cornersOf, captureLayout } from '../../overlay/geometry';
import { Point, Rect, Step } from '../../types';
import { safeArea } from '../../windowMode';
import type { useImageState } from '../../imageSteps';

type Finds = ReturnType<typeof useImageState>['finds'];
type Size = { w: number; h: number };

export function RegionBox({ rect, size, dim }: { rect: Rect; size: Size | null; dim: boolean }) {
  const t = useT();
  return (
    <div className={dim ? 'opacity-30' : ''}>
      <div className="absolute rounded-md border-2 border-dashed border-white bg-white/5"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />
      <span className="absolute rounded-md bg-accent px-2 py-[3px] font-mono text-xs text-on-accent"
        style={{ left: rect.x, top: rect.y - 30 }}>{t('sh2.region', { w: size?.w ?? 0, h: size?.h ?? 0 })}</span>
      {cornersOf(rect).map((p, i) => (
        <span key={i} className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border-2 border-accent bg-white" style={{ left: p.x, top: p.y }} />
      ))}
    </div>
  );
}

// Khung "Thử tìm" (bước 25): chỗ giống ảnh mẫu nhất trên màn hình lúc thử; Tìm tất cả (42 G3): mọi chỗ, kèm số thứ tự.
// focus: chỉ hiện của node đang xem riêng.
export function FindBoxes({ steps, finds, focus, toClient }: { steps: Step[]; finds: Finds; focus: string | null; toClient: (p: Point) => Point }) {
  return steps.flatMap((s) => {
    const f = finds[s.id];
    if (!f || (focus && s.id !== focus)) return [];
    if (s.type === 'findAll') { // 0 chỗ: Go bỏ trường all – không vẽ gì
      const all = f.all ?? [];
      return all.map((r, i) => <FindBox key={`find${s.id}-${i}`} box={r} ok={f.found} toClient={toClient} label={i ? `${i + 1}` : `${s.ref}: 1 / ${all.length}`} />);
    }
    return [<FindBox key={`find${s.id}`} box={f} ok={f.found} toClient={toClient} label={<>{s.ref}: {f.label ?? <>{f.found ? tr('ws3.found') : tr('sh2.closest')} · {tr('if.match', { n: f.score })}</>}</>} />];
  });
}

function FindBox({ box: r, ok, label, toClient }: { box: Rect; ok: boolean; label: ReactNode; toClient: (p: Point) => Point }) {
  const a = toClient(r), b = toClient({ x: r.x + r.w, y: r.y + r.h });
  return (
    <div className={`pointer-events-none absolute rounded-sm border-2 border-dashed ${ok ? 'border-ok bg-ok/15' : 'border-warn bg-warn/10'}`}
      style={{ left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y }}>
      <span className={`absolute -top-6 left-0 rounded px-1.5 py-px font-mono text-[11px] whitespace-nowrap text-black ${ok ? 'bg-ok' : 'bg-warn'}`}>{label}</span>
    </div>
  );
}

// Khoanh ảnh mẫu: tối ngoài khung, nhãn cỡ thật, 4 núm; confirmed (đã thả chuột) → nút Dùng ảnh này / Khoanh lại.
// forRect: khoanh vùng chụp cho node Chụp màn hình – nút ghi "Dùng vùng này".
export function CaptureBox({ rect: r, size, confirmed, busy, err, onUse, onRedo, forRect = false }: {
  rect: Rect; size: Size; confirmed: boolean; busy: boolean; err: string; onUse: () => void; onRedo: () => void; forRect?: boolean;
}) {
  const t = useT();
  const { left, top, labelTop } = captureLayout(r, safeArea(), window.innerWidth, confirmed);
  return (
    <>
      <div className="pointer-events-none absolute rounded-[3px] border-2 border-accent shadow-[0_0_0_9999px_rgb(0_0_0/.38)]"
        style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
      <span className="pointer-events-none absolute rounded-md bg-accent px-2 py-[3px] font-mono text-xs text-on-accent"
        style={{ left: r.x, top: labelTop }}>{size.w} × {size.h}</span>
      {cornersOf(r).map((p, i) => (
        <span key={i} className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border-2 border-accent bg-white" style={{ left: p.x, top: p.y }} />
      ))}
      {confirmed && (
        <div data-ui className="absolute flex items-center gap-2 rounded-xl bg-hud/95 p-1.5 shadow-[0_8px_24px_rgb(0_0_0/.4)]" style={{ left, top }}>
          <button onClick={onUse} disabled={busy} className="btn-primary h-[38px] rounded-lg px-3.5 font-semibold disabled:opacity-60">
            {busy ? t('sh2.capturing') : <>{forRect ? t('sh2.useRegion') : t('sh2.useImage')} <span className="font-mono text-[11px] font-normal opacity-75">Enter</span></>}
          </button>
          <button onClick={onRedo} className="h-[38px] rounded-lg bg-white/10 px-3.5 text-hud-text hover:bg-white/15">{t('if.recapture')} <span className="font-mono text-[11px] opacity-60">Esc</span></button>
          {err && <span className="max-w-[360px] px-1.5 text-xs text-danger-text">{err}</span>}
        </div>
      )}
    </>
  );
}
