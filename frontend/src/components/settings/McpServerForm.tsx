// Form thêm / sửa một MCP server ngoài (bước 55 M8) – chỉ hiển thị, state ở McpServersSettings.
import { useT } from '../../i18n';
import Segmented from '../Segmented';

export type ServerDraft = {
  id: string; name: string; kind: string; command: string; args: string; env: string; url: string; headers: string;
};

export const EMPTY_DRAFT: ServerDraft = { id: '', name: '', kind: 'stdio', command: '', args: '', env: '', url: '', headers: '' };

const input = 'rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus';

type Props = { draft: ServerDraft; onChange: (patch: Partial<ServerDraft>) => void; onSave: () => void; onCancel: () => void };

export default function McpServerForm({ draft: d, onChange, onSave, onCancel }: Props) {
  const t = useT();
  const kinds = [{ id: 'stdio', label: t('mcps.f.kindStdio') }, { id: 'http', label: 'HTTP' }, { id: 'sse', label: 'SSE' }];
  const stdio = d.kind === 'stdio';
  const ok = d.name.trim() !== '' && (stdio ? d.command.trim() !== '' : d.url.trim() !== '');
  return (
    <form className="flex flex-col gap-1.5 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); if (ok) onSave(); }}>
      <span className="font-semibold">{d.id ? t('mcps.f.edit') : t('mcps.add')}</span>
      <input value={d.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={t('mcps.f.name')} aria-label={t('mcps.f.nameAria')} className={input} />
      <Segmented value={d.kind} options={kinds} onChange={(kind) => onChange({ kind })} label={t('mcps.f.kind')} full />
      {stdio ? (
        <>
          <input value={d.command} onChange={(e) => onChange({ command: e.target.value })} placeholder={t('mcps.f.cmd')} aria-label={t('mcps.f.cmdAria')} className={`${input} font-mono`} spellCheck={false} />
          <input value={d.args} onChange={(e) => onChange({ args: e.target.value })} placeholder={t('mcps.f.args')} aria-label={t('mcps.f.argsAria')} className={`${input} font-mono`} spellCheck={false} />
          <textarea value={d.env} onChange={(e) => onChange({ env: e.target.value })} rows={2} placeholder={t('mcps.f.env')} aria-label={t('mcps.f.envAria')} className={`${input} font-mono`} spellCheck={false} />
        </>
      ) : (
        <>
          <input value={d.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://…/mcp" aria-label={t('mcps.f.urlAria')} className={`${input} font-mono`} spellCheck={false} />
          <textarea value={d.headers} onChange={(e) => onChange({ headers: e.target.value })} rows={2} placeholder={t('mcps.f.headers')} aria-label={t('mcps.f.headersAria')} className={`${input} font-mono`} spellCheck={false} />
        </>
      )}
      <span className="text-xs text-muted">{t('mcps.f.note')}</span>
      <div className="flex gap-1.5">
        <button type="submit" disabled={!ok} className="btn-primary rounded-control px-3 py-1.5 disabled:opacity-40">{t('mcps.f.save')}</button>
        <button type="button" onClick={onCancel} className="rounded-control px-3 py-1.5 text-muted hover:bg-hover hover:text-ink">{t('mcps.f.cancel')}</button>
      </div>
    </form>
  );
}
