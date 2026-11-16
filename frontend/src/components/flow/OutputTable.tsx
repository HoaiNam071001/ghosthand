// Bảng output của một node (bước 50 C1): Nhãn · Biến · Giá trị, kèm nút chép JSON. Chỉ hiển thị.
import { useT } from '../../i18n';
import { CopyButton } from '../settings/parts';
import { OutputRow, outputJson } from '../../flow/outputRows';

export default function OutputTable({ rows, output, label = 'node' }: { rows: OutputRow[]; output?: Record<string, unknown>; label?: string }) {
  const t = useT();
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <table className="w-full table-fixed border-collapse text-xs">
        <thead className="text-left text-muted"><tr><th className="w-[28%] pb-1 font-normal">{t('fl.ot.label')}</th><th className="w-[34%] pb-1 font-normal">{t('fl.ot.var')}</th><th className="pb-1 font-normal">{t('fl.ot.value')}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-line align-top">
              <td className="break-words py-1 pr-2">{r.label}</td>
              <td className="break-all py-1 pr-2 font-mono text-accent-text select-text">{r.variable}</td>
              <td className="whitespace-pre-wrap break-words py-1 font-mono select-text">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {output && <div className="flex items-center gap-2 text-muted"><span className="flex-1 text-xs">{t('fl.ot.copy')}</span>
        <CopyButton text={outputJson(output)} label={t('fl.ot.copyOf', { n: label })} /></div>}
    </div>
  );
}
