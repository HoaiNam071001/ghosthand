// Thư viện MCP server gợi ý (bước 55 M6) – chỉ hiển thị, chia nhóm + ô tìm; Thêm = điền sẵn form, người dùng xem lại rồi Lưu (vẫn qua hộp hỏi quyền).
import { useState } from 'react';
import { mcplib } from '../../../wailsjs/go/models';
import { useT } from '../../i18n';
import { groupLibrary, libraryFields } from '../../flow/mcpServer';
import type { ServerDraft } from './McpServerForm';

const input = 'rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus';

type Props = { entries: mcplib.Entry[]; onPick: (d: ServerDraft) => void; onOpenSecrets: () => void };

export default function McpLibrary({ entries, onPick, onOpenSecrets }: Props) {
  const t = useT();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const val = (id: string, key: string) => vals[`${id}:${key}`] ?? '';
  const groups = groupLibrary(entries, query);
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{t('mcps.l.title')}</span>
        <input value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder={t('mcps.l.search')} aria-label={t('mcps.l.searchAria')}
          className={`${input} ml-auto w-48 text-xs`} spellCheck={false} />
      </div>
      {groups.length === 0 && <span className="text-xs text-muted">{t('mcps.l.none', { q: query })}</span>}
      {groups.map((g) => (
        <section key={g.group} className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{g.group}</span>
          <ul className="flex flex-col gap-2">{g.items.map((e) => {
            const params = Object.fromEntries((e.params ?? []).map((p) => [p.key, val(e.id, p.key).trim()]));
            const ready = e.available && Object.values(params).every(Boolean);
            return (
              <li key={e.id} className="flex flex-col gap-1.5 rounded-control border border-line p-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{e.name}</span>
                  {e.thirdParty && <span className="rounded-control bg-soft px-1.5 text-xs text-muted">{t('mcps.l.third')}</span>}
                  <span className="rounded-control bg-soft px-1.5 text-xs text-muted">{e.kind === 'stdio' ? t('mcps.l.stdio') : t('mcps.l.remote')}</span>
                </div>
                <span className="text-xs text-muted">{e.desc}</span>
                {e.warn && <span className="text-xs text-warn">{e.warn}</span>}
                {!e.available && <span className="text-xs text-danger-text">{e.installHint}</span>}
                {(e.secrets ?? []).length > 0 && (
                  <span className="text-xs text-muted">{t('mcps.l.secrets', { list: e.secrets!.map((s) => `{{secret.${s}}}`).join(', ') })}<button className="underline" onClick={onOpenSecrets}>{t('mcps.l.addSecrets')}</button></span>
                )}
                {(e.params ?? []).map((p) => (
                  <input key={p.key} value={val(e.id, p.key)} onChange={(ev) => setVals({ ...vals, [`${e.id}:${p.key}`]: ev.target.value })}
                    placeholder={p.placeholder ? t('mcps.l.eg', { label: p.label, ph: p.placeholder }) : p.label} aria-label={p.label} className={input} spellCheck={false} />
                ))}
                <button disabled={!ready} onClick={() => onPick({ id: '', ...libraryFields(e, params) })}
                  className="btn-primary self-start rounded-control px-3 py-1 text-xs disabled:opacity-40">{t('mcps.l.add')}</button>
              </li>
            );
          })}</ul>
        </section>
      ))}
    </div>
  );
}
