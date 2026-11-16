// Node chuột: nút chuột, vị trí (neo), kéo thả A → B, số click / thời gian giữ / kéo, ngẫu nhiên vị trí.
import { useT } from '../../i18n';
import { useState } from 'react';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import AnchorField, { AnchorMap } from '../steps/AnchorField';
import { boundsOf, endpoints, isAbsolute, refOf, setAnchor, setDragFromPrev, setDragRelative, updateStep, useScript } from '../../store';
import { numVarOf, Step } from '../../types';
import { usesVar } from '../../anchor';
import PointSource from './PointSource';
import { ButtonField, Field, hint, NumField, PickButton, SetPoint } from './shared';

export const isMouse = (s: Step) => s.type === 'click' || s.type === 'double' || s.type === 'hold' || s.type === 'drag' || s.type === 'path';

export function MouseFields({ step: s, setPoint }: { step: Step; setPoint: SetPoint }) {
  const t = useT();
  const { region } = useScript();
  const inZone = region && !isAbsolute(s); // node absolute: toạ độ màn hình, không theo vùng
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const mouse = isMouse(s);
  return (
    <>
      {mouse && (
        <ButtonField step={s} />
      )}

      {mouse && s.type !== 'drag' && !(s.type === 'path' && !s.shape) && s.points[0] && (
        <PointSource step={s} index={0} setPoint={setPoint}
          label={s.type === 'path' ? t('mo.center') : t('mo.pos')}>
          {(menu) => <AnchorField value={s.points[0]} onChange={(p) => setPoint(0, p)} onAnchor={(ax, ay) => setAnchor(s.id, 0, ax, ay)}
            pick={<PickButton step={s} />} menu={menu} bounds={boundsOf(region, s)} boundsLabel={inZone ? t('sc.zoneCap') : t('sc.screenCap')} />}
        </PointSource>
      )}
      {s.type === 'drag' && s.points.length >= 2 && <DragPoints step={s} setPoint={setPoint} />}

      {s.type === 'click' && (
        <>
          <NumField label={t('mo.clicks')} step={s} field="clicks" min={1} stepper />
          {(s.clicks > 1 || numVarOf(s, 'clicks') !== undefined) && <NumField label={t('mo.between')} step={s} field="clickInterval" unit="ms" />}
        </>
      )}
      {s.type === 'hold' && <NumField label={t('mo.hold')} step={s} field="holdMs" unit="ms" />}
      {s.type === 'drag' && <NumField label={t('mo.dragTime')} step={s} field="dragMs" unit="ms" />}
    </>
  );
}

// Ngẫu nhiên vị trí – cuối phần chuột
export function JitterField({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return (
    <Field label={t('mo.jitter')} help={s.jitterPx > 0
      ? t(s.type === 'drag' ? 'mo.jitterOnDrag' : 'mo.jitterOnClick', { n: 2 * s.jitterPx + 1 })
      : t(s.type === 'drag' ? 'mo.jitterOffDrag' : 'mo.jitterOffClick')}>
      <NumInput prefix="±" value={s.jitterPx} unit="px" onChange={(v) => set({ jitterPx: v })} />
    </Field>
  );
}

// Điểm A / B của bước kéo thả: A = vị trí hoặc "từ điểm trước"; B = vị trí hoặc lệch so với A.
function DragPoints({ step: s, setPoint }: { step: Step; setPoint: SetPoint }) {
  const t = useT();
  const script = useScript();
  const { region } = script;
  const inZone = region && !isAbsolute(s);
  const ends = endpoints(script, region).get(s.id);
  const inRegion = inZone && <span className="ml-1.5 text-xs">{t('if.inRegion').trim()}</span>;
  // Bản đồ chung A + B: chọn điểm nào để đổi neo (chỉ điểm lưu vị trí – không phải "từ điểm trước" / "lệch so với A").
  const editable = [!s.dragFromPrev && !usesVar(s.points[0]) && 'A', !s.dragRelative && !usesVar(s.points[1]) && 'B'].filter(Boolean) as ('A' | 'B')[];
  const [pick, setPick] = useState<'A' | 'B'>('A');
  const cur = editable.includes(pick) ? pick : editable[0];
  const curIdx = cur === 'B' ? 1 : 0;
  return (
    <>
      <div className="col-span-2 flex flex-col gap-1.5 text-muted">
        <span>{t('mo.a')}{!s.dragFromPrev && inRegion}</span>
        <Segmented value={s.dragFromPrev ? 'prev' : 'pos'} onChange={(v) => setDragFromPrev(s.id, v === 'prev')} full
          options={[{ id: 'pos', label: t('mo.pos') }, { id: 'prev', label: t('mo.fromPrev') }]} />
        {s.dragFromPrev ? (
          <span className={`text-[13px] ${ends?.start ? '' : 'text-danger-text'}`}>
            {ends?.start ? t('mo.prevStop', { ref: refOf(ends.prevStep ?? ''), x: ends.start.x, y: ends.start.y })
              : ends?.prevStep ? t('mo.prevVar', { ref: refOf(ends.prevStep) })
              : t('mo.noPrev')}
          </span>
        ) : (
          <PointSource step={s} index={0} setPoint={setPoint} label={t('mo.coordA')}>
            {(menu) => <AnchorField value={s.points[0]} onChange={(p) => setPoint(0, p)} onAnchor={(ax, ay) => setAnchor(s.id, 0, ax, ay)}
              pick={<PickButton step={s} title={t('mo.repickAB')} />} menu={menu} grid={false} />}
          </PointSource>
        )}
      </div>
      <div className="col-span-2 flex flex-col gap-1.5 text-muted">
        <span>{t('mo.b')}{!s.dragRelative && inRegion}</span>
        <Segmented value={s.dragRelative ? 'rel' : 'pos'} onChange={(v) => setDragRelative(s.id, v === 'rel')} full
          options={[{ id: 'pos', label: t('mo.pos') }, { id: 'rel', label: t('mo.relA') }]} />
        <PointSource step={s} index={1} setPoint={setPoint} label={s.dragRelative ? t('mo.offB') : t('mo.coordB')} relative={s.dragRelative}>
          {(menu) => s.dragRelative ? (
            <div className="flex gap-2">
              {(['x', 'y'] as const).map((k) => (
                <NumInput key={k} signed prefix={`Δ${k.toUpperCase()}`} value={s.points[1][k]} onChange={(v) => setPoint(1, { [k]: v })} className="flex-1" />
              ))}
              {s.dragFromPrev && <PickButton step={s} title={t('mo.repickB')} />}
              {menu}
            </div>
          ) : (
            <AnchorField value={s.points[1]} onChange={(p) => setPoint(1, p)} onAnchor={(ax, ay) => setAnchor(s.id, 1, ax, ay)}
              pick={s.dragFromPrev ? <PickButton step={s} title={t('mo.repickB')} /> : <span />} menu={menu} grid={false} />
          )}
        </PointSource>
        {s.dragRelative && ends?.end && (
          <span className="text-xs">{t('mo.dropAt', { x: ends.end.x, y: ends.end.y })}</span>
        )}
      </div>
      <div className="col-span-2 flex flex-col gap-1.5 text-muted">
        <span className="flex items-center gap-2">
          <span className="flex-1">{t('mo.anchorOn', { what: inZone ? t('sc.zone') : t('sc.screen') })}</span>
          {editable.length > 1 && (
            <Segmented value={cur} onChange={(v: 'A' | 'B') => setPick(v)} label={t('mo.anchorFor')}
              options={[{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]} />
          )}
        </span>
        <AnchorMap bounds={boundsOf(region, s)} label={inZone ? t('sc.zoneCap') : t('sc.screenCap')}
          value={cur ? s.points[curIdx] : undefined} onAnchor={cur ? (ax, ay) => setAnchor(s.id, curIdx, ax, ay) : undefined}
          marks={[
            ...(ends?.start ? [{ at: ends.start, text: 'A', active: cur === 'A' }] : []),
            ...(ends?.end ? [{ at: ends.end, text: 'B', active: cur === 'B' }] : []),
          ]}
          arrow={ends?.start && ends.end ? [ends.start, ends.end] : null} />
        {!cur && <span className="text-xs">{t('mo.noAnchor')}</span>}
      </div>
    </>
  );
}
