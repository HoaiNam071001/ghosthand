// Node cuộn: hướng, số nấc / quãng px, cuộn tại chuột / điểm, bản đồ cuộn tới đâu.
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import AnchorField from '../steps/AnchorField';
import ScrollMap from '../steps/ScrollMap';
import { boundsOf, endpoints, isAbsolute, setAnchor, setScrollAt, toScreen, updateStep, useScript } from '../../store';
import { pinnedInput, setPinnedValue } from '../../scriptInputs';
import { insideBounds } from '../../anchor';
import { ScrollDirection, Step } from '../../types';
import { SCROLL_NOTCH_PX } from '../../scroll';
import { directionOptions, errText, Field, NumField, PickButton, SetPoint } from './shared';
import PointSource from './PointSource';
import { useT } from '../../i18n';

export function ScrollFields({ step: s, setPoint }: { step: Step; setPoint: SetPoint }) {
  const t = useT();
  const script = useScript();
  const { region } = script;
  const inZone = region && !isAbsolute(s); // node absolute: toạ độ màn hình, không theo vùng
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return (
          <>
        <Field label={t('sc.dir')} wide group>
          <Segmented value={s.direction ?? 'down'} onChange={(direction: ScrollDirection) => set({ direction })} full label={t('sc.dirLabel')}
            options={directionOptions()} />
        </Field>
        <NumField label={t('sc.notches')} step={s} field="amount" unit={t('sc.notchUnit')} min={1} stepper />
        <Field label={t('sc.dist')} help={t('sc.distHelp', { px: SCROLL_NOTCH_PX })}>
          <NumInput value={(s.amount ?? 0) * SCROLL_NOTCH_PX} unit="px" min={SCROLL_NOTCH_PX} pinned={!!pinnedInput(script, s.id, 'amount')}
            onChange={(px) => {
              const amount = Math.max(1, Math.round(px / SCROLL_NOTCH_PX));
              const inp = pinnedInput(script, s.id, 'amount');
              if (inp) setPinnedValue(s.id, 'amount', amount);
              else set({ amount });
            }} />
        </Field>
        <Field label={t('sc.at')} group help={s.points.length ? t('sc.atPoint') : t('sc.atMouse')}>
          <Segmented value={s.points.length ? 'point' : 'mouse'} onChange={(v) => setScrollAt(s.id, v === 'point')} full label={t('sc.at')}
            options={[{ id: 'mouse', label: t('sc.mouse') }, { id: 'point', label: t('sc.point') }]} />
        </Field>
        {s.points[0] ? (
          <PointSource step={s} index={0} setPoint={setPoint}
            label={t('sc.putAt')}>
            {(menu) => <>
            <AnchorField value={s.points[0]} onChange={(p) => setPoint(0, p)} onAnchor={(ax, ay) => setAnchor(s.id, 0, ax, ay)}
              pick={<PickButton step={s} />} menu={menu} />
            {!insideBounds(toScreen(s.points[0], region, s), boundsOf(region, s)) && (
              <span className={errText}>
                {t('sc.outside', { where: inZone ? t('sc.zone') : t('sc.screen'), w: boundsOf(region, s).w, h: boundsOf(region, s).h })}
                {' '}{t('sc.outsideTip')}
              </span>
            )}
            </>}
          </PointSource>
        ) : null}
        <Field label={t('sc.map')} wide group>
          <ScrollMap bounds={boundsOf(region, s)} label={inZone ? t('sc.zoneCap') : t('sc.screenCap')} direction={s.direction ?? 'down'} amount={s.amount ?? 0}
            at={endpoints(script, region).get(s.id)?.start ?? null} />
        </Field>
      </>
  );
}
