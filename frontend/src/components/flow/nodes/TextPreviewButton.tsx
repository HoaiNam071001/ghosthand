// Nút Chạy thử của node xử lý chữ: chạy node trên chữ đang nhập (Go PreviewText), hiện output. Chữ có biến thì chỉ biết
// khi chạy cả kịch bản.
import { useEffect, useState } from 'react';
import { useT } from '../../../i18n';
import { errText, hint } from '../../stepform/shared';
import type { Step } from '../../../types';
import type { TextPreview } from './CondEditor';

type Peek = { out?: TextPreview; error?: string; busy?: boolean };

const show = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));

export default function TextPreviewButton({ step: s, run }: { step: Step; run: () => Promise<TextPreview> }) {
  const t = useT();
  const [peek, setPeek] = useState<Peek>({});
  const { value, pattern, matchAll, separator, replaceFrom, replaceTo, replaceRegex, stripAccents, caseMode, trim, numOp, decimals, numStyle, dateLayout } = s;
  useEffect(() => setPeek({}), [s.id, value, pattern, matchAll, separator, replaceFrom, replaceTo, replaceRegex, stripAccents, caseMode, trim, numOp, decimals, numStyle, dateLayout]);
  if ([value, pattern, replaceFrom, replaceTo].some((x) => x?.includes('{{'))) return <span className={hint}>{t('txn.p.hasVar')}</span>;
  const go = () => {
    setPeek({ busy: true });
    run().then((out) => setPeek({ out }), (e) => setPeek({ error: String(e) }));
  };
  const entries = Object.entries(peek.out?.output ?? {}).filter(([k]) => k !== 'startedAt' && k !== 'durationMs');
  return (
    <div className="flex flex-col gap-1.5">
      <button onClick={go} disabled={peek.busy} className="h-8 w-fit rounded-control border border-line bg-surface px-3 text-[13px] text-ink enabled:hover:bg-hover disabled:opacity-50">
        {peek.busy ? t('txn.p.busy') : t('txn.p.run')}
      </button>
      {peek.error && <span className={errText}>{peek.error}</span>}
      {peek.out && (
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-card bg-soft px-3 py-2 text-xs text-muted">
          {entries.map(([k, v]) => <span key={k} className="contents"><span>{k}</span><span className="min-w-0 break-all font-mono text-ink">{show(v)}</span></span>)}
        </div>
      )}
    </div>
  );
}
