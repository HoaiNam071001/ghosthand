// Trường riêng từng loại node web (bước 25d) – phần chung (Chrome của app, cách tìm, tab, chờ tối đa) ở WebFields.
import { tr, useT } from '../../i18n';
import { ReactNode } from 'react';
import NumInput, { fieldBox } from '../NumInput';
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { ScrollDirection, Step } from '../../types';
import { canBackground, parseSelector, READ_LABEL, ReadFrom, SCROLL_MODE_LABEL, ScrollMode, SELECTOR_LABEL, selectorLines, stableSelector } from '../../flow/web';
import { ButtonField, directionOptions, Field, NumField, SwitchField, useNodeVars, varHint } from './shared';
import { TypeModeField } from './TextFields';
import { SelectorFixHint } from './SelectorFixHint';

const set = (s: Step, patch: Partial<Step>) => updateStep(s.id, patch);

// Ô "mỗi dòng một cách tìm" – dùng cho cách tìm phần tử và khung cuộn (webScroll tới khi thấy).
export function SelectorsField({ step: s, label, value, onChange, placeholder, emptyText, help, children }: {
  step: Step; label: string; value: string[] | undefined; onChange: (v: string[]) => void; placeholder: string; emptyText: string;
  help?: string; children?: ReactNode;
}) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const lines = selectorLines(value);
  const parsed = lines.map(parseSelector);
  const bad = parsed.findIndex((p) => !p);
  const all = value ?? [];
  const volatile = all.findIndex((l) => stableSelector(l));
  return (
    <Field label={label} wide group help={help} side={<span className="text-xs text-muted">{t('wa.perLine')}</span>}>
      <VarTextInput value={(value ?? []).join('\n')} onChange={(v) => onChange(v.split('\n'))} inputs={script.inputs ?? []} nodeVars={nodeVars}
        onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} rows={lines.length > 1 ? 3 : 2} placeholder={placeholder} />
      <span className={`text-xs ${bad >= 0 || (lines.length === 0 && emptyText.startsWith(t('wa.unsetPrefix'))) ? 'text-danger-text' : 'text-muted'}`}>
        {lines.length === 0 ? emptyText
          : bad >= 0 ? t('wa.badLine', { l: lines[bad].trim() })
          : t('wa.order', { list: parsed.map((p) => SELECTOR_LABEL[p!.by] + (p!.exact ? ` (${t('wa.exact')})` : '')).join(' → ') })}
      </span>
      {volatile >= 0 && (
        <SelectorFixHint why={t('wa.volatile', { l: all[volatile].trim() })} fix={stableSelector(all[volatile])!}
          onUse={() => onChange(all.map((l, i) => (i === volatile ? stableSelector(l)! : l)))} />
      )}
      {children}
    </Field>
  );
}

export function WebWaitFields({ step: s }: { step: Step }) {
  const t = useT();
  return (
    <Field label={t('wa.until')} wide group>
      <Segmented value={s.webGone ? 'gone' : 'shown'} onChange={(v) => set(s, { webGone: v === 'gone' || undefined })} full label={t('wa.until')}
        options={[{ id: 'shown', label: t('wa.shown') }, { id: 'gone', label: t('wa.gone') }]} />
    </Field>
  );
}

export function WebClickFields({ step: s }: { step: Step }) {
  const t = useT();
  return <>
    <Field label={t('wa.offset')} wide>
      <div className="flex gap-2">
        <NumInput signed prefix="ΔX" value={s.dx ?? 0} onChange={(dx) => set(s, { dx })} className="flex-1" />
        <NumInput signed prefix="ΔY" value={s.dy ?? 0} onChange={(dy) => set(s, { dy })} className="flex-1" />
      </div>
    </Field>
    <ButtonField step={s} />
    <NumField label={t('wa.clicks')} step={s} field="clicks" min={1} stepper />
    <NumField label={t('mo.between')} step={s} field="clickInterval" unit="ms" />
  </>;
}

export function WebTypeFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  return <>
    <Field label={t('tf.typeContent')} wide group side={varHint}>
      <VarTextInput value={s.text} onChange={(text) => set(s, { text })} inputs={script.inputs ?? []} nodeVars={nodeVars} rows={2}
        placeholder="{{email}}" onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} />
    </Field>
    {!s.webBackground && <TypeModeField step={s} />}
    <SwitchField label={t('wa.clear')} help={t('wa.clearHelp')} on={!!s.webClear} onChange={(webClear) => set(s, { webClear: webClear || undefined })} />
    <SwitchField label={t('wa.enter')} on={!!s.webEnter} onChange={(webEnter) => set(s, { webEnter: webEnter || undefined })} />
    <SwitchField label={t('wa.skipFocus')} help={t('wa.skipFocusHelp')}
      on={!!s.skipFocusCheck} onChange={(skipFocusCheck) => set(s, { skipFocusCheck: skipFocusCheck || undefined })} />
  </>;
}

export function WebReadFields({ step: s }: { step: Step }) {
  const t = useT();
  const from = s.readFrom ?? '';
  return <>
    <Field label={t('er.read')} wide group>
      <Segmented value={from} onChange={(v) => set(s, { readFrom: (v || undefined) as ReadFrom | undefined })} full label={t('er.read')}
        options={(Object.keys(READ_LABEL) as (keyof typeof READ_LABEL)[]).map((id) => ({ id, label: READ_LABEL[id][0].toUpperCase() + READ_LABEL[id].slice(1) }))} />
    </Field>
    {from === 'attr' && (
      <Field label={t('wa.attr')} help={t('wa.attrHelp')}>
        <span className={`${fieldBox} w-full ${s.attr?.trim() ? '' : 'border-danger'}`}>
          <input value={s.attr ?? ''} onChange={(e) => set(s, { attr: e.target.value })} placeholder="href" spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none" />
        </span>
      </Field>
    )}
  </>;
}

export function WebScrollFields({ step: s }: { step: Step }) {
  const t = useT();
  const mode = s.scrollMode ?? '';
  return <>
    <Field label={t('wa.scroll')} wide group>
      <Segmented value={mode} onChange={(v) => set(s, { scrollMode: (v || undefined) as ScrollMode | undefined })} full label={t('wa.scrollHow')}
        options={(Object.keys(SCROLL_MODE_LABEL) as (keyof typeof SCROLL_MODE_LABEL)[]).map((id) => ({ id, label: SCROLL_MODE_LABEL[id] }))} />
    </Field>
    {mode !== '' && <>
      <Field label={t('sc.dir')} wide group>
        <Segmented value={s.direction ?? 'down'} onChange={(direction: ScrollDirection) => set(s, { direction })} full label={t('sc.dirLabel')}
          options={directionOptions()} />
      </Field>
      <NumField label={mode === 'until' ? t('wa.eachRoll') : t('sc.notches')} step={s} field="amount" unit={t('sc.notchUnit')} min={1} stepper />
    </>}
    {mode === 'until' && (
      <SelectorsField step={s} label={t('wa.rollIn')} value={s.scrollIn} onChange={(scrollIn) => set(s, { scrollIn })}
        placeholder={t('wa.rollInPh')} emptyText={t('wa.rollInEmpty')} />
    )}
  </>;
}

// Chuột thật / chạy nền (D4b) – chỉ loại có thao tác (canBackground).
export function WebModeField({ step: s }: { step: Step }) {
  const t = useT();
  if (!canBackground(s)) return null;
  return (
    <Field label={t('wa.control')} wide group help={t(s.webBackground ? 'wa.ctlBgHelp' : 'wa.ctlRealHelp')}>
      <Segmented value={s.webBackground ? 'bg' : 'real'} onChange={(v) => set(s, { webBackground: v === 'bg' || undefined })} full label={t('wa.control')}
        options={[{ id: 'real', label: t('wa.real') }, { id: 'bg', label: t('wa.bg') }]} />
    </Field>
  );
}

// Dòng giải thích cuối inspector theo loại node.
export function webHintText(s: Step, after: string): string {
  if (s.webBackground && canBackground(s)) {
    if (s.type === 'webType') return tr('wa.h.bgType', { after });
    if (s.type === 'webScroll' && s.scrollMode) return s.scrollMode === 'until' ? tr('wa.h.bgUntil', { after }) : tr('wa.h.bgIn');
  }
  switch (s.type) {
    case 'webWait': return s.webGone ? tr('wa.h.stay', { after }) : tr('wa.h.miss', { after });
    case 'webClick': return tr('wa.h.click', { after });
    case 'webType': return tr('wa.h.type', { after });
    case 'webRead': return tr('wa.h.read', { ref: s.ref, after });
    case 'webScroll':
      return s.scrollMode === 'until' ? tr('wa.h.rollUntil', { after })
        : s.scrollMode === 'in' ? tr('wa.h.rollIn')
        : tr('wa.h.rollTo', { after });
  }
  return '';
}
