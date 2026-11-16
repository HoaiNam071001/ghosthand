// Phần tử màn hình qua Accessibility (bước 37): Tìm theo: Phần tử của Chờ / Click (E3) và của node Đọc phần tử
// (ElementReadFields). ElementQueryFields (cách tìm, app, bỏ dấu, chỗ thứ mấy) dùng chung.
import { useT } from '../../i18n';
import NumInput from '../NumInput';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { elementSelectorError } from '../../flow/element';
import { stableSelector } from '../../flow/web';
import { SelectorsField } from './WebActionFields';
import { errText, Field, fmtSec, hint, NumField, SwitchField, useNodeVars } from './shared';
import { pickElement, testFind, useImageState } from '../../imageSteps';
import { inWails, openOverlay } from '../../windowMode';
import { FindAllResult } from './FindAllResult';
import { ElementSuggestions } from './ElementSuggestions';
import { SelectorFixHint } from './SelectorFixHint';

// optional: cách tìm có thể trống (node Đọc chữ trang: trống = cả cửa sổ)
export function ElementQueryFields({ step: s, optional }: { step: Step; optional?: boolean }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const bad = elementSelectorError(s.selectors);
  return (
    <>
      <SelectorsField step={s} label={optional ? t('el.f.readIn') : t('el.f.how')} value={s.selectors} onChange={(selectors) => set({ selectors })}
        placeholder={optional ? t('el.f.phOpt') : t('el.f.ph')}
        emptyText={optional ? t('el.f.emptyOpt') : t('el.f.empty')}
        help={t('el.f.help')}>
        {bad && <span className={errText}>{bad}</span>}
      </SelectorsField>
      <Field label={t('ap.app')} wide group help={t('el.f.appHelp')}>
        <VarTextInput value={s.elementApp ?? ''} onChange={(v) => set({ elementApp: v || undefined })} inputs={script.inputs ?? []} nodeVars={nodeVars}
          onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} rows={1} compact placeholder={t('el.f.appPh')} />
      </Field>
      <SwitchField label={t('el.f.accent')} on={!s.textAccent} onChange={(v) => set({ textAccent: v ? undefined : true })} />
      {s.type !== 'findAll' && <Field label={t('el.f.nth')} help={t('el.f.nthHelp')}>
        <NumInput value={Math.max(s.occurrence ?? 1, 1)} min={1} stepper onChange={(n) => set({ occurrence: n > 1 ? n : undefined })} />
      </Field>}
    </>
  );
}

// Tìm theo: Phần tử của Chờ / Click theo ảnh·chữ (37 E3): cách tìm + Chọn phần tử trên màn + Thử tìm (khung vẽ trên
// overlay; không thấy thì liệt kê các phần tử đang có để chọn lại cách tìm).
export function ElementSearchFields({ step: s }: { step: Step }) {
  const t = useT();
  const { finds, busy, error, suggestions } = useImageState();
  const find = finds[s.id];
  const btn = 'h-[34px] flex-1 rounded-control border border-line bg-surface text-[13px] text-ink enabled:hover:bg-hover disabled:opacity-50';
  return (
    <>
      <ElementQueryFields step={s} />
      <div className="col-span-2 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button onClick={() => pickElement(s.id)} disabled={!inWails || busy === s.id} className={btn}
            title={inWails ? t('el.f.pickTip') : t('el.f.appOnly')}>{t('el.f.pick')}</button>
          <button onClick={() => testFind(s.id)} disabled={!inWails || busy === s.id || !s.selectors?.some((l) => l.trim().length > 5)} className={btn}
            title={t('el.f.tryTip')}>{busy === s.id ? t('el.f.trying') : t('el.f.try')}</button>
        </div>
        <ElementSuggestions list={suggestions[s.id] ?? []} current={s.selectors?.[0]}
          onPick={(g) => updateStep(s.id, { selectors: [g.selector], occurrence: g.occurrence > 1 ? g.occurrence : undefined })} />
        {find && !find.found && find.fix && !s.selectors?.some((l) => stableSelector(l)) && (
          <SelectorFixHint why={t('el.f.fixWhy')}
            fix={find.fix} onUse={() => updateStep(s.id, { selectors: [find.fix!, ...(s.selectors ?? []).filter((l) => l.trim())] })} />
        )}
        {find && s.type === 'findAll' ? <FindAllResult step={s} find={find} /> : find && (
          <span className={`flex flex-col gap-1 text-xs ${find.found ? 'text-ok' : 'text-warn'}`}>
            <span className="flex flex-wrap items-center gap-x-2">
              {find.found ? <>{t('el.f.foundAt', { x: find.x + Math.round(find.w / 2), y: find.y + Math.round(find.h / 2) })}{find.ms ? ` · ${find.ms} ms` : ''}</>
                : find.fromRun ? <>{t('el.f.prevMiss')}</> : <>{t('el.f.notNow')}</>}
              {find.found && <button onClick={() => openOverlay('point', s.id)} className="text-muted underline">{t('el.f.view')}</button>}
            </span>
            {!find.found && !!find.read?.length && (
              <span className="text-muted">{t('el.f.have')} {find.read.slice(0, 12).join(' · ')}{find.read.length > 12 ? ' …' : ''}</span>
            )}
          </span>
        )}
        {error && busy === '' && <span className={errText}>{error}</span>}
        <span className={hint}>{t('el.f.note')}</span>
      </div>
    </>
  );
}
