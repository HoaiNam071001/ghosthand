// Thanh thu phóng ở góc phải status bar (bước 63): − ━●━ + 100% và nút vừa màn hình. Chỉ hiển thị – lệnh qua props (app thật: canvasBus).
import { RibbonIcon } from '../ribbon/ribbonIcons';
import { useT } from '../../i18n';

const MIN = 0.3, MAX = 1.6; // khớp minZoom / maxZoom của FlowCanvas

const btn = 'grid h-5 w-5 place-items-center rounded text-muted hover:bg-hover hover:text-ink';

export default function ZoomBar({ zoom, onIn, onOut, onFit, onReset, onZoom }: { zoom: number; onZoom: (z: number) => void; onIn: () => void; onOut: () => void; onFit: () => void; onReset: () => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('zoom.group')}>
      <button onClick={onOut} aria-label={t('zoom.out')} title={t('zoom.out')} className={btn}><RibbonIcon name="zout" className="h-3.5 w-3.5" /></button>
      <input type="range" min={MIN} max={MAX} step={0.01} value={Math.min(Math.max(zoom, MIN), MAX)} onChange={(e) => onZoom(Number(e.target.value))}
        aria-label={t('zoom.level')} className="zoom-range h-4 w-24 cursor-pointer" />
      <button onClick={onIn} aria-label={t('zoom.in')} title={t('zoom.in')} className={btn}><RibbonIcon name="zin" className="h-3.5 w-3.5" /></button>
      <button onClick={onReset} title={t('zoom.reset')} className="w-10 rounded px-1 text-right font-mono hover:bg-hover hover:text-ink">{Math.round(zoom * 100)}%</button>
      <button onClick={onFit} aria-label={t('zoom.fit')} title={t('zoom.fit')} className={btn}><RibbonIcon name="fit" className="h-3.5 w-3.5" /></button>
    </div>
  );
}
