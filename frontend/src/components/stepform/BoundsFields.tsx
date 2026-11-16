// Đặt vị trí + cỡ cửa sổ (preset trong vùng làm việc của màn) – dùng chung node Cửa sổ (setBounds, bước 26) và Chuẩn hoá trình duyệt (43 B3).
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import { updateStep } from '../../store';
import { WIN_PRESETS } from '../../flow/window';
import { Rect, Step } from '../../types';
import { errText, Field } from './shared';
import { DisplayPicker } from './ShotFields';

// onTakeCurrent: nút lấy khung hiện tại của cửa sổ (chỉ node Cửa sổ biết cửa sổ nào); note: lời báo của nút đó.
export function BoundsFields({ step: s, onTakeCurrent, note }: { step: Step; onTakeCurrent?: () => void; note?: string }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const rect: Rect = s.winRect ?? { x: 0, y: 0, w: 0, h: 0 };
  const setRect = (r: Partial<Rect>) => set({ winRect: { ...rect, ...r } });
  return (
    <>
      <Field label={t('bf.at')} wide group help={t('bf.atHelp')}>
        <Segmented value={s.winPreset ?? ''} full label={t('bf.at')} onChange={(v) => set({ winPreset: v || undefined })} options={WIN_PRESETS} />
      </Field>
      {s.winPreset !== 'full' && (
        <Field label={s.winPreset ? t('bf.size') : t('bf.frame')} wide group>
          {!s.winPreset && <div className="flex gap-2">
            <NumInput prefix="X" value={rect.x} signed onChange={(x) => setRect({ x })} className="flex-1" />
            <NumInput prefix="Y" value={rect.y} signed onChange={(y) => setRect({ y })} className="flex-1" />
          </div>}
          <div className="flex gap-2">
            <NumInput prefix="W" value={rect.w} min={0} onChange={(w) => setRect({ w })} className="flex-1" />
            <NumInput prefix="H" value={rect.h} min={0} onChange={(h) => setRect({ h })} className="flex-1" />
          </div>
          {onTakeCurrent && <button onClick={onTakeCurrent} className="h-8 rounded-control border border-line text-[13px] text-ink hover:bg-hover">{t('bf.take')}</button>}
          {note && <span className={errText}>{note}</span>}
          {!s.winPreset && !(rect.w > 0 && rect.h > 0) && <span className={errText}>{t('bf.noSize')}</span>}
        </Field>
      )}
      {s.winPreset && (
        <Field label={t('shot.display')} wide group>
          <DisplayPicker value={s.display ?? 0} onChange={(display) => set({ display: display || undefined })} zero={t('bf.zero')} />
        </Field>
      )}
    </>
  );
}
