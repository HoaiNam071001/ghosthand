// Inspector node Lặp qua danh sách (bước 42 G2): nguồn chữ / biến hoặc file CSV / xlsx, nút Đọc thử (app thật) hiện
// số phần tử + cột → khoá biến. Chỉ hiển thị – nối store ở stepform/ControlSection.
import { useEffect, useState } from 'react';
import { useT } from '../../../i18n';
import Segmented from '../../Segmented';
import VarTextInput from '../../inputs/VarTextInput';
import { errText, Field, hint } from '../../stepform/shared';
import type { CondCtx, ListPreview } from './CondEditor';

type Peek = { list?: ListPreview; error?: string; busy?: boolean };

export default function ForEachFields({ ctx: { step: s, set, vars, tools } }: { ctx: CondCtx }) {
  const t = useT();
  const file = s.listFrom === 'file';
  const path = s.filePath?.trim() ?? '';
  const badExt = file && !!path && !path.includes('{{') && !/\.(csv|xlsx)$/i.test(path);
  const [peek, setPeek] = useState<Peek>({});
  useEffect(() => setPeek({}), [s.id, s.listFrom, s.filePath, s.sheet, s.value]);
  const read = tools?.previewList && (() => {
    setPeek({ busy: true });
    tools.previewList!().then((list) => setPeek({ list }), (e) => setPeek({ error: String(e) }));
  });
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('ctl.fe.from')} group>
        <Segmented value={file ? 'file' : 'text'} onChange={(v) => set({ listFrom: v === 'file' ? 'file' : undefined })} full label={t('ctl.fe.from')}
          options={[{ id: 'text', label: t('ctl.fe.text') }, { id: 'file', label: t('ctl.fe.file') }]} />
      </Field>
      {file ? <>
        <Field label={t('ctl.fe.fileLabel')} group help={t('ctl.fe.fileHelp')}>
          <VarTextInput {...vars} rows={1} compact value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })} placeholder="~/Documents/khach-hang.csv" />
          {(!path || badExt) && <span className={errText}>{!path ? t('ctl.fe.noFile') : t('ctl.fe.badExt')}</span>}
        </Field>
        {/\.xlsx$/i.test(path) && (
          <Field label="Sheet" group>
            <VarTextInput {...vars} rows={1} compact value={s.sheet ?? ''} onChange={(v) => set({ sheet: v || undefined })} placeholder={t('ctl.fe.sheetPh')} />
          </Field>
        )}
      </> : (
        <Field label={t('ctl.fe.list')} group help={t('ctl.fe.listHelp')}>
          <VarTextInput {...vars} rows={4} value={s.value ?? ''} onChange={(value) => set({ value })} placeholder={t('ctl.fe.listPh')} />
          {!s.value?.trim() && <span className={errText}>{t('ctl.fe.empty')}</span>}
        </Field>
      )}
      {read && (
        <div className="flex flex-col gap-1.5">
          <button onClick={read} disabled={peek.busy} className="h-8 w-fit rounded-control border border-line bg-surface px-3 text-[13px] text-ink enabled:hover:bg-hover disabled:opacity-50">
            {peek.busy ? t('ctl.fe.reading') : t('ctl.fe.read')}
          </button>
          {peek.error && <span className={errText}>{peek.error}</span>}
          {peek.list && <PeekResult list={peek.list} ref_={s.ref} />}
        </div>
      )}
      <span className={hint}>
        {t('ctl.fe.noteA')} <b className="text-ink">{t('ctl.fe.eachPort')}</b> {t('ctl.fe.noteB')} <b className="text-ink">{t('ctl.fe.donePort')}</b>.
        {t('ctl.fe.noteC')} <span className="var-token">{`${s.ref}.output.item`}</span>, <span className="var-token">{`${s.ref}.output.index`}</span> {t('ctl.fe.noteD')}
      </span>
    </div>
  );
}

function PeekResult({ list, ref_ }: { list: ListPreview; ref_: string }) {
  const t = useT();
  const first = typeof list.first === 'string' ? list.first : list.first === undefined ? '' : JSON.stringify(list.first);
  return (
    <div className="flex flex-col gap-1 rounded-card bg-soft px-3 py-2 text-xs text-muted">
      <span><b className="text-ink">{list.count}</b> {t('ctl.fe.count')}{!list.columns?.length && first ? <>{t('ctl.fe.first')} <span className="font-mono text-ink">{first.length > 60 ? `${first.slice(0, 59)}…` : first}</span></> : null}</span>
      {list.columns?.map((c) => (
        <span key={c.key} className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-ink">{c.name || t('ctl.fe.noName')}</span>→<span className="var-token">{`${ref_}.output.item.${c.key}`}</span>
        </span>
      ))}
    </div>
  );
}
