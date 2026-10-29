// Thư viện MCP server gợi ý (bước 55 M6) – chỉ hiển thị; Thêm = điền sẵn form, người dùng xem lại rồi Lưu (vẫn qua hộp hỏi quyền).
import { useState } from 'react';
import { mcplib } from '../../../wailsjs/go/models';
import { libraryFields } from '../../flow/mcpServer';
import type { ServerDraft } from './McpServerForm';

const input = 'rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus';

type Props = { entries: mcplib.Entry[]; onPick: (d: ServerDraft) => void; onOpenSecrets: () => void };

export default function McpLibrary({ entries, onPick, onOpenSecrets }: Props) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const val = (id: string, key: string) => vals[`${id}:${key}`] ?? '';
  return (
    <ul className="flex flex-col gap-2 border-t border-line pt-3">
      <span className="font-semibold">Thư viện server gợi ý</span>
      {entries.map((e) => {
        const params = Object.fromEntries((e.params ?? []).map((p) => [p.key, val(e.id, p.key).trim()]));
        const ready = e.available && Object.values(params).every(Boolean);
        return (
          <li key={e.id} className="flex flex-col gap-1.5 rounded-control border border-line p-2">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{e.name}</span>
              {e.thirdParty && <span className="rounded-control bg-soft px-1.5 text-xs text-muted">bên thứ ba</span>}
              <span className="rounded-control bg-soft px-1.5 text-xs text-muted">{e.kind === 'stdio' ? 'chạy lệnh' : 'từ xa'}</span>
            </div>
            <span className="text-xs text-muted">{e.desc}</span>
            {e.warn && <span className="text-xs text-warn">{e.warn}</span>}
            {!e.available && <span className="text-xs text-danger-text">{e.installHint}</span>}
            {(e.secrets ?? []).length > 0 && (
              <span className="text-xs text-muted">Cần bí mật: {e.secrets!.map((s) => `{{secret.${s}}}`).join(', ')} – <button className="underline" onClick={onOpenSecrets}>thêm ở tab Bí mật</button></span>
            )}
            {(e.params ?? []).map((p) => (
              <input key={p.key} value={val(e.id, p.key)} onChange={(ev) => setVals({ ...vals, [`${e.id}:${p.key}`]: ev.target.value })}
                placeholder={`${p.label}${p.placeholder ? ` (vd ${p.placeholder})` : ''}`} aria-label={p.label} className={input} spellCheck={false} />
            ))}
            <button disabled={!ready} onClick={() => onPick({ id: '', ...libraryFields(e, params) })}
              className="btn-primary self-start rounded-control px-3 py-1 text-xs disabled:opacity-40">Thêm</button>
          </li>
        );
      })}
    </ul>
  );
}
