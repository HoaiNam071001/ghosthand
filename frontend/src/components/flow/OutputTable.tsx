// Bảng output của một node (bước 50 C1): Nhãn · Biến · Giá trị, kèm nút chép JSON. Chỉ hiển thị.
import { CopyButton } from '../settings/parts';
import { OutputRow, outputJson } from '../../flow/outputRows';

export default function OutputTable({ rows, output, label = 'node' }: { rows: OutputRow[]; output?: Record<string, unknown>; label?: string }) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <table className="w-full table-fixed border-collapse text-xs">
        <thead className="text-left text-muted"><tr><th className="w-[28%] pb-1 font-normal">Nhãn</th><th className="w-[34%] pb-1 font-normal">Biến</th><th className="pb-1 font-normal">Giá trị</th></tr></thead>
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
      {output && <div className="flex items-center gap-2 text-muted"><span className="flex-1 text-xs">Chép output (JSON)</span>
        <CopyButton text={outputJson(output)} label={`Chép output của ${label} dạng JSON`} /></div>}
    </div>
  );
}
