// Node Tệp / thư mục (bước 35 N4): ghi chữ, thêm dòng csv / xlsx, tạo thư mục, xoá vào / dọn Thùng rác. Ô chữ nhận {{biến}}.
import { useT } from '../../i18n';
import Select from '../Select';
import { Switch } from '../Switch';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { FILE_OPS, folderOf, isDeleteOp, type FileOp } from '../../flow/file';
import { Step } from '../../types';
import { errText, Field, selectBox, useNodeVars } from './shared';

export function FileFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const op = s.fileOp ?? '';
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const folder = op === 'mkdir' || op === 'trash';
  const xlsx = /\.xlsx$/i.test(s.filePath ?? '');
  const badTable = op === 'row' && !!s.filePath?.trim() && !s.filePath.includes('{{') && !/\.(csv|xlsx)$/i.test(s.filePath.trim());
  const setOp = (fileOp: FileOp) => set({
    fileOp: fileOp || undefined,
    ...(fileOp === 'row' && !s.cells?.length ? { cells: [''] } : {}),
    // sang thao tác cần thư mục: ô đang là file thì giữ thư mục chứa nó
    ...((fileOp === 'mkdir' || fileOp === 'trash') && s.filePath ? { filePath: folderOf(s.filePath) } : {}),
  });
  return (
    <>
      <Field label={t('ap.do')}>
        <Select value={op as string} onChange={(v) => setOp(v as FileOp)} className={selectBox} aria-label={t('ea.op')}
          options={FILE_OPS.map((o) => ({ value: o.id as string, label: o.label }))} />
      </Field>
      {isDeleteOp(op) && (
        <div className={`col-span-2 rounded-card px-3 py-2.5 text-xs ${op === 'emptyTrash' ? 'bg-danger-soft text-danger-text' : 'bg-soft text-muted'}`}>
          {op === 'emptyTrash'
            ? <><b>{t('fi.delHard')}</b> {t('fi.delHardRest')}</>
            : <>{t('fi.trash1')} <b className="text-ink">{t('fi.trashRestorable')}</b>. {t('fi.trash2')}</>}
          {' '}{t('fi.confirm')}
        </div>
      )}
      {op !== 'emptyTrash' && (
        <Field label={folder ? t('fi.folder') : t('fi.file')} wide group help={t('fi.pathHelp')}>
          <PathInput kind={folder ? 'folder' : 'save'} {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })}
            placeholder={folder ? '~/Downloads' : op === 'row' ? '~/Documents/orders.xlsx' : '~/Documents/log.txt'} />
          {(!s.filePath?.trim() || badTable) && (
            <span className={errText}>{!s.filePath?.trim() ? t(folder ? 'fi.noFolder' : 'fi.noFile') : t('fi.badTable')}</span>
          )}
        </Field>
      )}
      {op === '' && <>
        <Field label={t('cl.content')} wide group>
          <VarTextInput {...varProps} rows={4} value={s.text} onChange={(text) => set({ text })} placeholder={t('fi.contentPh')} />
        </Field>
        <Field label={t('fi.append')} group help={t('fi.appendHelp')}>
          <Switch on={!!s.fileAppend} onChange={(on) => set({ fileAppend: on || undefined })} label={t('fi.appendLabel')} />
        </Field>
      </>}
      {op === 'row' && <CellsField step={s} varProps={varProps} xlsx={xlsx} />}
      {op === 'trash' && (
        <Field label={t('fi.pattern')} wide group help={t('fi.patternHelp')}>
          <VarTextInput {...varProps} rows={1} compact value={s.filePattern ?? ''} onChange={(v) => set({ filePattern: v || undefined })} placeholder="*.png" />
          {!s.filePattern?.trim() && <span className={errText}>{t('fi.noPattern')}</span>}
        </Field>
      )}
    </>
  );
}

function CellsField({ step: s, varProps, xlsx }: { step: Step; varProps: Omit<Parameters<typeof VarTextInput>[0], 'value' | 'onChange'>; xlsx: boolean }) {
  const t = useT();
  const cells = s.cells ?? [];
  const set = (next: string[]) => updateStep(s.id, { cells: next });
  return (
    <>
      <Field label={t('fi.cells')} wide group side={<span className="text-xs text-muted">{t('fi.cellCount', { n: cells.length })}</span>}
        help={t(xlsx ? 'fi.cellsXlsx' : 'fi.cellsCsv')}>
        {cells.map((c, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="grid h-8 w-6 flex-none place-items-center font-mono text-xs">{String.fromCharCode(65 + (i % 26))}</span>
            <div className="min-w-0 flex-1">
              <VarTextInput {...varProps} rows={1} compact value={c} onChange={(v) => set(cells.map((x, j) => (j === i ? v : x)))} placeholder={i === 0 ? '{{name}}' : ''} />
            </div>
            <button onClick={() => set(cells.filter((_, j) => j !== i))} aria-label={t('fi.delCell', { n: i + 1 })} disabled={cells.length === 1}
              className="grid h-8 w-7 flex-none place-items-center rounded-control text-muted hover:bg-hover hover:text-ink disabled:opacity-30">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        ))}
        <button onClick={() => set([...cells, ''])} className="h-8 w-fit rounded-control border border-dashed border-line-strong px-3 text-[13px] text-ink hover:bg-hover">{t('fi.addCell')}</button>
      </Field>
      {xlsx && (
        <Field label="Sheet" wide group>
          <VarTextInput {...varProps} rows={1} compact value={s.sheet ?? ''} onChange={(v) => updateStep(s.id, { sheet: v || undefined })} placeholder={t('fi.sheetPh')} />
        </Field>
      )}
    </>
  );
}
