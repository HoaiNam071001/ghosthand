// Node chờ ảnh / chữ, click theo ảnh / chữ, chờ màu pixel (bước 25, 25e): ảnh mẫu / chữ, thử tìm, nguồn chỗ thấy, màu.
import Select from '../Select';
import { useEffect, useState } from 'react';
import NumInput, { fieldBox } from '../NumInput';
import Segmented from '../Segmented';
import { Switch } from '../Switch';
import VarTextInput from '../inputs/VarTextInput';
import AnchorField from '../steps/AnchorField';
import { setAnchor, updateStep, useScript } from '../../store';
import { findsImage } from '../../flow/model';
import { addInput } from '../../scriptInputs';
import { checkCapture, pickColor, requestCapture, startCapture, templateUrl, testFind, useImageState } from '../../imageSteps';
import { openOverlay } from '../../windowMode';
import { nodeTitle } from '../../flow/view';
import { Step } from '../../types';
import { ButtonField, errText, Field, fmtSec, hint, NumField, PickButton, selectBox, SetPoint, SwitchField, useNodeVars, varHint } from './shared';
import { ElementSearchFields } from './ElementFields';
import PointSource from './PointSource';
import { FindAllResult } from './FindAllResult';
import MatchFields from './MatchFields';
import AISearchFields from './AISearchFields';
import { usesVar } from '../../anchor';
import { tr, useT } from '../../i18n';
import type { MsgKey } from '../../i18n/vi';

export const isImageStep = (s: Step) => s.type === 'waitImage' || s.type === 'clickImage' || s.type === 'waitPixel' || s.type === 'findAll';

export // macOS: chưa có quyền ghi màn hình thì chụp chỉ ra hình nền – báo ngay trong inspector.
function CapturePermission() {
  const t = useT();
  const { allowed } = useImageState();
  useEffect(() => {
    checkCapture();
  }, []);
  if (allowed !== false) return null;
  return (
    <div className="col-span-2 flex flex-col gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger-text">
      {t('if.perm')}
      <span>{t('if.permHow')}</span>
      <button onClick={requestCapture} className="self-start rounded-control border border-danger/40 px-2.5 py-1 font-semibold hover:bg-danger/10">{t('if.permAsk')}</button>
    </div>
  );
}


const FIND_OPTIONS = (): { id: 'image' | 'text' | 'element' | 'ai'; label: string }[] => [{ id: 'image', label: tr('if.opt.image') }, { id: 'text', label: tr('if.opt.text') }, { id: 'element', label: tr('if.opt.element') }];
const findName = (by: string) => tr(`if.name.${by}` as MsgKey);

export // Ảnh mẫu (hoặc chữ / phần tử) + thử tìm + độ khớp / chờ tối đa / vùng tìm – dùng cho Chờ ảnh và Click theo ảnh (tự tìm).
function ImageSearchFields({ step: s }: { step: Step }) {
  const t = useT();
  const { finds, busy, error } = useImageState();
  const find = finds[s.id];
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const k = s.templateScale || 1;
  const byText = s.findBy === 'text';
  const byElem = s.findBy === 'element';
  const byAI = s.findBy === 'ai';
  return (
    <>
      <Field label={t('er.by')} wide group help={t(`if.help.${s.findBy || 'image'}` as MsgKey)}>
        <Segmented value={s.findBy || 'image'} full label={t('er.by')}
          onChange={(v) => updateStep(s.id, { findBy: v === 'image' ? undefined : v, ...(v === 'element' && !s.selectors?.length ? { selectors: ['text='] } : {}) })}
          options={s.type === 'findAll' ? FIND_OPTIONS() : [...FIND_OPTIONS(), { id: 'ai', label: 'AI' }]} />
      </Field>
      {byAI ? <AISearchFields step={s} /> : byElem ? <ElementSearchFields step={s} /> : byText ? <TextSearchFields step={s} /> : <Field label={t('if.opt.image')} wide group>
        <div className="relative grid min-h-[92px] place-items-center overflow-hidden rounded-card border border-line bg-soft p-2 text-[13px]">
          {s.template ? (
            <>
              <img src={templateUrl(s.template)} alt={t('if.opt.image')} className="max-h-[140px] max-w-full object-contain"
                style={size ? { width: Math.min(size.w / k, 300) } : undefined}
                onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
              {size && (
                <span className="absolute right-1.5 bottom-1.5 rounded bg-hud/80 px-1.5 font-mono text-[11px] text-hud-text">
                  {Math.round(size.w / k)} × {Math.round(size.h / k)}
                </span>
              )}
            </>
          ) : t('if.noTpl')}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => startCapture(s.id)} className="h-8 flex-1 rounded-control border border-line bg-surface text-ink hover:bg-hover">
            {s.template ? t('if.recapture') : t('if.capture')}
          </button>
          <button onClick={() => testFind(s.id)} disabled={!s.template || busy === s.id}
            title={t('if.tryTip')}
            className="h-8 flex-1 rounded-control border border-line bg-surface text-ink enabled:hover:bg-hover disabled:opacity-50">
            {busy === s.id ? t('el.f.trying') : t('el.f.try')}
          </button>
        </div>
        {find && s.type === 'findAll' ? <FindAllResult step={s} find={find} /> : find && (
          <span className={`flex flex-wrap items-center gap-x-2 text-xs ${find.found ? 'text-ok' : 'text-warn'}`}>
            {find.found
              ? <>{t('el.f.foundAt', { x: find.x + Math.round(find.w / 2), y: find.y + Math.round(find.h / 2) })} · {t('if.match', { n: find.score })}{s.colorTol ? ` · ${t('if.colorOff', { n: find.colorDiff ?? 0 })}` : ''} · {find.ms} ms</>
              : s.colorTol && find.score >= (s.threshold ?? 0)
                ? <>{t('if.colorMiss', { score: find.score, diff: find.colorDiff ?? 0, tol: s.colorTol ?? 0 })}</>
              : find.fromRun
                ? <>{t('if.prevMiss', { score: find.score, need: s.threshold ?? 0 })}</>
                : <>{t('if.nowMiss', { score: find.score, need: s.threshold ?? 0 })}</>}
            <button onClick={() => openOverlay('point', s.id)} className="text-muted underline">{t('el.f.view')}</button>
          </span>
        )}
        {error && busy === '' && <span className={errText}>{error}</span>}
      </Field>}
      {!byText && !byElem && !byAI && <NumField label={t('if.minMatch')} info={t('if.minMatchInfo')} step={s} field="threshold" unit="%" min={1} />}
      {!byText && !byElem && !byAI && <MatchFields value={s} onChange={(p) => updateStep(s.id, p)} />}
      <NumField label={t('common.maxWait')} info={t('if.notSeen', { t: fmtSec(s.timeoutMs) })} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      {!byText && !byElem && !byAI && (s.threshold ?? 0) < 70 && (
        <span className="col-span-2 -mt-1 text-xs text-warn">
          {t('if.lowMatch', { n: s.threshold ?? 0 })}
        </span>
      )}
      <Field label={t('er.in')} wide group help={t(byElem ? 'if.areaEl' : byText ? 'if.areaText' : 'if.areaImg') + (byElem ? '' : ' ' + t('if.areaScreen'))}>
        <Segmented value={s.searchArea ?? 'region'} onChange={(v) => updateStep(s.id, { searchArea: v === 'screen' ? 'screen' : undefined })} full
          options={[{ id: 'region', label: t('er.region') }, { id: 'screen', label: t('er.screen') }]} />
      </Field>
    </>
  );
}


// Tìm theo chữ: ô chữ (nhận {{biến}}), cách so, chỗ thứ mấy, thử tìm. Dùng lại cho nhãn của Đọc phần tử (37 E4).
export function TextSearchFields({ step: s, label, placeholder }: { step: Step; label?: string; placeholder?: string }) {
  const t = useT();
  label ??= t('if.txt.label');
  placeholder ??= t('if.txt.ph');
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const { finds, busy, error } = useImageState();
  const find = finds[s.id];
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const empty = !s.findText?.trim();
  return (
    <>
    <Field label={label} wide group side={varHint} help={t('if.txt.help')}>
      <VarTextInput value={s.findText ?? ''} onChange={(findText) => set({ findText })} inputs={script.inputs ?? []} nodeVars={nodeVars}
        placeholder={placeholder} onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} />
      {empty && <span className={errText}>{t('if.txt.empty')}</span>}
    </Field>
    <SwitchField label={t('if.txt.exact')} help={t('if.txt.exactHelp')} on={!!s.textExact} onChange={(textExact) => set({ textExact: textExact || undefined })} />
    <SwitchField label={t('el.f.accent')} help={t('if.txt.accentHelp')} on={!s.textAccent} onChange={(v) => set({ textAccent: v ? undefined : true })} />
    {s.type !== 'findAll' && <Field label={t('el.f.nth')} help={t('if.txt.nthHelp')}>
      <NumInput value={Math.max(s.occurrence ?? 1, 1)} min={1} stepper onChange={(n) => set({ occurrence: n > 1 ? n : undefined })} />
    </Field>}
    <div className="col-span-2 flex flex-col gap-1.5 text-muted">
      <button onClick={() => testFind(s.id)} disabled={empty || busy === s.id}
        title={t('if.txt.tryTip')}
        className="h-8 rounded-control border border-line bg-surface text-ink enabled:hover:bg-hover disabled:opacity-50">
        {busy === s.id ? t('if.txt.reading') : t('el.f.try')}
      </button>
      {find && s.type === 'findAll' ? <FindAllResult step={s} find={find} /> : find && (
        <span className={`flex flex-col gap-1 text-xs ${find.found ? 'text-ok' : 'text-warn'}`}>
          <span className="flex flex-wrap items-center gap-x-2">
            {find.found ? <>{t('el.f.foundAt', { x: find.x + Math.round(find.w / 2), y: find.y + Math.round(find.h / 2) })} · {find.ms} ms</>
              : find.fromRun ? <>{t('if.txt.prevMiss')}</>
              : <>{t('if.txt.nowMiss')}{find.ms ? ` · ${find.ms} ms` : ''}</>}
            {find.found && <button onClick={() => openOverlay('point', s.id)} className="text-muted underline">{t('el.f.view')}</button>}
          </span>
          {!find.found && (
            <span className="text-muted">
              {find.read?.length ? <>{t('if.txt.read')} {find.read.slice(0, 12).map((w, i) => (
                <button key={i} onClick={() => set({ findText: w })} title={t('if.txt.use')}
                  className="mr-1 mb-1 inline-block rounded border border-line px-1.5 text-ink hover:bg-hover">{w}</button>
              ))}</> : t('if.txt.none')}
            </span>
          )}
        </span>
      )}
      {error && busy === '' && <span className="text-xs text-danger-text">{error}</span>}
    </div>
    </>
  );
}


// Click theo ảnh / chữ: chỗ một node chờ ảnh / chữ đã thấy (chọn node nguồn), hoặc tự tìm.
export function ClickImageFields({ step: s }: { step: Step }) {
  const t = useT();
  const { steps } = useScript();
  const sources = steps.filter((x) => x.id !== s.id && findsImage(x));
  const src = sources.find((x) => x.id === s.imageFrom);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const byNode = s.imageSource !== 'search';
  return (
    <>
      <Field label={t('if.click')} wide group>
        <Segmented value={byNode ? 'node' : 'search'} onChange={(imageSource: 'node' | 'search') => set({ imageSource })} full
          options={[{ id: 'node', label: t('if.byNode') }, { id: 'search', label: t('if.auto') }]} label={t('if.click')} />
        {byNode && (
          <Select value={src ? src.id : ''} onChange={(v) => set({ imageFrom: v || undefined })} aria-label={t('if.nodeLabel')}
            className={`${selectBox} ${src ? '' : 'border-danger'}`} placeholder={t('if.nodePh')}
            options={sources.map((x) => ({ value: x.id, label: `${x.ref} · ${nodeTitle(x)}` }))} />
        )}
        <span className={`text-xs ${byNode && !src ? 'text-danger-text' : 'text-muted'}`}>
          {!byNode ? t('if.autoHint', { what: findName(s.findBy || 'image') })
            : src ? t('if.nodeHint', { ref: src.ref })
            : sources.length ? t('if.nodePick') : t('if.nodeNone')}
        </span>
      </Field>
      {!byNode && <ImageSearchFields step={s} />}
      <Field label={t('if.offset', { what: !byNode && s.findBy ? findName(s.findBy) : t('if.spot') })} wide group help={t('if.offsetHelp')}>
        <div className="flex gap-2">
          <NumInput signed prefix="ΔX" value={s.dx ?? 0} onChange={(dx) => set({ dx })} className="flex-1" />
          <NumInput signed prefix="ΔY" value={s.dy ?? 0} onChange={(dy) => set({ dy })} className="flex-1" />
        </div>
      </Field>
      <ButtonField step={s} />
    </>
  );
}

export function WaitPixelFields({ step: s, setPoint }: { step: Step; setPoint: SetPoint }) {
  const t = useT();
  const { region } = useScript();
  const { busy, error } = useImageState();
  const valid = /^#[0-9a-fA-F]{6}$/.test(s.color ?? '');
  return (
    <>
      {s.points[0] && (
        <PointSource step={s} index={0} setPoint={setPoint} label={t('if.point')}>
          {(menu) => <AnchorField value={s.points[0]} onChange={(p) => setPoint(0, p)} onAnchor={(ax, ay) => setAnchor(s.id, 0, ax, ay)}
            pick={<PickButton step={s} />} menu={menu} />}
        </PointSource>
      )}
      <Field label={t('if.color')} wide group>
        <div className="flex gap-2">
          <span className={`${fieldBox} flex-1 gap-2 ${valid ? '' : 'border-danger'}`}>
            <span className="h-4 w-4 flex-none rounded border border-line" style={{ background: valid ? s.color : 'transparent' }} />
            <input value={s.color ?? ''} onChange={(e) => updateStep(s.id, { color: e.target.value.trim() })} spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none" />
          </span>
          <button onClick={() => pickColor(s.id)} disabled={busy === s.id || (!!s.points[0] && usesVar(s.points[0]))}
            title={t('if.pickTip')}
            className="h-8 rounded-control border border-line px-2.5 text-[13px] whitespace-nowrap text-ink enabled:hover:bg-hover disabled:opacity-50">
            {busy === s.id ? t('if.picking') : t('if.pick')}
          </button>
        </div>
        {!valid && <span className="text-xs text-danger-text">{t('if.colorFmt')}</span>}
        {error && busy === '' && <span className="text-xs text-danger-text">{error}</span>}
      </Field>
      <Field label={t('if.tol')} help={t('if.tolHelp', { ms: s.intervalMs ?? 100, region: region ? t('if.inRegion') : '', n: s.tolerance ?? 0 })}>
        <NumInput prefix="±" value={s.tolerance ?? 0} onChange={(tolerance) => updateStep(s.id, { tolerance: Math.min(tolerance, 255) })} />
      </Field>
      <NumField label={t('common.maxWait')} info={t('if.noColorChange', { t: fmtSec(s.timeoutMs) })} step={s} field="timeoutMs" unit="ms" min={1} />
    </>
  );
}
