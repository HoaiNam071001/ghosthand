// Inspector node Tính toán (bước 42 G4a): ô biểu thức + kết quả xem trước (không còn biến) / lỗi cú pháp, bảng cú pháp
// ngắn. Chỉ hiển thị – nối store ở stepform/ControlSection.
import { Fragment } from 'react';
import { tr, useT } from '../../../i18n';
import VarTextInput from '../../inputs/VarTextInput';
import { errText, Field, hint } from '../../stepform/shared';
import { calcPreview } from '../../../flow/calc';
import type { CondCtx } from './CondEditor';

const syntax = (): [string, string][] => [
  ['+ - * / %', tr('ctl.syn.arith')],
  ['== != < <= > >=', tr('ctl.syn.cmp')],
  ['and  or  not', tr('ctl.syn.logic')],
  ['round(x, 2)  floor  ceil', tr('ctl.syn.round')],
  ['min(a, b)  max  abs', tr('ctl.syn.min')],
  ['"Hết hàng"', tr('ctl.syn.str')],
];

export default function CalcFields({ ctx: { step: s, set, vars } }: { ctx: CondCtx }) {
  const t = useT();
  const p = calcPreview(s.value ?? '');
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('ctl.calc.expr')} group help={t('ctl.calc.exprHelp')}>
        <VarTextInput {...vars} rows={2} value={s.value ?? ''} onChange={(value) => set({ value })} placeholder={'{{n2.output.count}} * 2 + 1'} />
        {p.error ? <span className={errText}>{p.error}</span>
          : p.value !== undefined ? <span className={hint}>{t('ctl.calc.result')} <b className="font-mono text-ink">{p.value}</b></span>
          : p.needsRun && <span className={hint}>{t('ctl.calc.needRun')}</span>}
      </Field>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-card bg-soft px-3 py-2 text-xs text-muted">
        {syntax().map(([code, desc]) => <Fragment key={code}><span className="font-mono text-ink">{code}</span><span>{desc}</span></Fragment>)}
      </div>
      <span className={hint}>
        {t('ctl.calc.useA')} <span className="var-token">{`${s.ref}.output.value`}</span> {t('ctl.calc.useB')} <b className="text-ink">{t('ctl.calc.ifNode')}</b>.
        {t('ctl.calc.numA')} <span className="font-mono">1.234.000 đ</span> {t('ctl.calc.numB')} <b className="text-ink">{t('ctl.calc.numNode')}</b> {t('ctl.calc.numC')}
      </span>
    </div>
  );
}
