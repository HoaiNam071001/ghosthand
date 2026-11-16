// Inspector node xử lý chữ (bước 42 G4b): Lọc mẫu, Tách chữ, Làm sạch chữ, Số & ngày – ô chữ vào chung, trường riêng
// từng loại, nút Chạy thử (Go PreviewText – cùng regex RE2 như lúc chạy). Chỉ hiển thị – nối store ở stepform/ControlSection.
import { tr, useT } from '../../../i18n';
import NumInput, { fieldBox } from '../../NumInput';
import Segmented from '../../Segmented';
import VarTextInput from '../../inputs/VarTextInput';
import { errText, Field, hint, SwitchField } from '../../stepform/shared';
import { caseModes, numOps, NUM_STYLES, type TextType } from '../../../flow/textNodes';
import type { CondCtx } from './CondEditor';
import TextPreviewButton from './TextPreviewButton';

const textBox = `${fieldBox} w-full text-ink outline-none`;

const inputHelp = (): Record<TextType, string> => ({
  textMatch: tr('txn.in.match'),
  textSplit: tr('txn.in.split'),
  textClean: tr('txn.in.clean'),
  textNumber: tr('txn.in.number'),
});

export default function TextNodeFields({ ctx, type }: { ctx: CondCtx; type: TextType }) {
  const t = useT();
  const { step: s, set, vars, tools } = ctx;
  const date = type === 'textNumber' && s.numOp === 'date';
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('txn.f.in')} group help={inputHelp()[type]}>
        <VarTextInput {...vars} rows={2} value={s.value ?? ''} onChange={(value) => set({ value })} placeholder={date ? t('txn.f.nowPh') : '{{n2.output.text}}'} />
        {!s.value?.trim() && !date && <span className={errText}>{t('txn.f.noText')}</span>}
      </Field>
      {type === 'textMatch' && <MatchForm ctx={ctx} />}
      {type === 'textSplit' && (
        <Field label={t('txn.f.sep')} group help={t('txn.f.sepHelp')}>
          <input value={s.separator ?? ''} onChange={(e) => set({ separator: e.target.value || undefined })} placeholder={t('txn.f.sepPh')}
            className={`${textBox} font-mono text-[13px]`} />
        </Field>
      )}
      {type === 'textClean' && <CleanForm ctx={ctx} />}
      {type === 'textNumber' && <NumberForm ctx={ctx} />}
      {tools?.previewText && <TextPreviewButton step={s} run={tools.previewText} />}
    </div>
  );
}

function MatchForm({ ctx: { step: s, set, vars } }: { ctx: CondCtx }) {
  const t = useT();
  return <>
    <Field label={t('txn.f.pattern')} group help={t('txn.f.patternHelp')}>
      <VarTextInput {...vars} rows={1} compact value={s.pattern ?? ''} onChange={(v) => set({ pattern: v || undefined })} placeholder={t('txn.f.patternPh')} />
      {!s.pattern && <span className={errText}>{t('txn.f.noPattern')}</span>}
    </Field>
    <SwitchField label={t('txn.f.all')} on={!!s.matchAll} onChange={(on) => set({ matchAll: on || undefined })}
      help={t('txn.f.allHelp')} />
    <span className={hint}>
      {t('txn.f.commonA')} <span className="font-mono text-ink">\d+</span> {t('txn.f.digits')} · <span className="font-mono text-ink">[\w.]+@[\w.]+</span> {t('txn.f.email')} ·
      <span className="font-mono text-ink"> 0\d{'{9}'}</span> {t('txn.f.phone')}. {t('txn.f.noMatchA')} <b className="text-ink">{t('txn.f.noMatchB')}</b>.
    </span>
  </>;
}

function CleanForm({ ctx: { step: s, set, vars } }: { ctx: CondCtx }) {
  const t = useT();
  return <>
    <>
      <Field label={t('txn.f.replace')} group>
        <VarTextInput {...vars} rows={1} compact value={s.replaceFrom ?? ''} onChange={(v) => set({ replaceFrom: v || undefined })} placeholder={t('txn.f.replacePh')} />
      </Field>
      <Field label={t('txn.f.with')} group help={s.replaceRegex ? t('txn.f.withRe') : t('txn.f.withEmpty')}>
        <VarTextInput {...vars} rows={1} compact value={s.replaceTo ?? ''} onChange={(v) => set({ replaceTo: v || undefined })} placeholder={t('txn.f.withPh')} />
      </Field>
    </>
    {s.replaceFrom && <SwitchField label={t('txn.f.isRe')} on={!!s.replaceRegex} onChange={(on) => set({ replaceRegex: on || undefined })} />}
    <SwitchField label={t('txn.f.strip')} on={!!s.stripAccents} onChange={(on) => set({ stripAccents: on || undefined })} help="Đà Nẵng → Da Nang" />
    <Field label={t('txn.f.case')} group>
      <Segmented value={s.caseMode ?? ''} onChange={(v) => set({ caseMode: v || undefined })} full label={t('txn.f.case')} options={caseModes()} />
    </Field>
    <SwitchField label={t('txn.f.trim')} on={!!s.trim} onChange={(on) => set({ trim: on || undefined })}
      help={t('txn.f.trimHelp')} />
    <span className={hint}>{t('txn.f.order')}</span>
  </>;
}

function NumberForm({ ctx: { step: s, set } }: { ctx: CondCtx }) {
  const t = useT();
  return <>
    <Field label={t('txn.f.job')} group>
      <Segmented value={s.numOp ?? ''} onChange={(v) => set({ numOp: v || undefined })} full label={t('txn.f.job')} options={numOps()} />
    </Field>
    {s.numOp === 'format' && (
      <>
        <Field label={t('txn.f.style')} group>
          <Segmented value={s.numStyle ?? ''} onChange={(v) => set({ numStyle: v || undefined })} full label={t('txn.f.style')} options={NUM_STYLES} />
        </Field>
        <Field label={t('txn.f.dec')} help={t('txn.f.decHelp')}>
          <NumInput value={s.decimals ?? 0} onChange={(d) => set({ decimals: Math.min(d, 10) || undefined })} />
        </Field>
      </>
    )}
    {s.numOp === 'date' && (
      <Field label={t('txn.f.layout')} group help={t('txn.f.layoutHelp')}>
        <input value={s.dateLayout ?? ''} onChange={(e) => set({ dateLayout: e.target.value || undefined })} placeholder="dd/MM/yyyy"
          className={`${textBox} font-mono text-[13px]`} />
      </Field>
    )}
    <span className={hint}>
      {s.numOp === 'date' ? t('txn.f.readDate')
        : <>{t('txn.f.readNumA')} <span className="font-mono text-ink">1.234.000 đ</span>, <span className="font-mono text-ink">$1,234.56</span> {t('txn.f.readNumB')}</>}
      {t('txn.f.unreadA')} <b className="text-ink">{t('txn.port.noRead')}</b>.
    </span>
  </>;
}
