// Tab "Tất cả output" của nhật ký (bước 49): output mọi node của một lần chạy, mỗi node một khối "tên = giá trị",
// chép được từng node hoặc cả lần chạy. Chỉ hiển thị – dữ liệu đã gom ở flow/runOutputs.
import { StatusChip } from './PortField';
import OutputTable from './OutputTable';
import { outputRows } from '../../flow/outputRows';
import { CopyButton } from '../settings/parts';
import { allOutputsJson, blockJson, OutputBlock } from '../../flow/runOutputs';

export default function RunOutputs({ blocks, loops }: { blocks: OutputBlock[]; loops: boolean }) {
  if (!blocks.length) return <p className="border-t border-line px-4 py-2 text-[13px] text-muted">Lần chạy này không node nào có output.</p>;
  return (
    <div className="min-w-0 flex-1 overflow-y-auto border-t border-line">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface px-4 py-1.5 text-xs text-muted">
        <span className="flex-1">{blocks.length} node có output</span>
        <span>Chép tất cả (JSON)</span>
        <CopyButton text={allOutputsJson(blocks)} label="Chép output của mọi node" />
      </div>
      {blocks.map((b, i) => (
        <section key={i} className="flex flex-col gap-1.5 border-b border-line px-4 py-2.5">
          <header className="flex items-center gap-2 text-[13px]">
            <span className="font-mono text-xs text-muted">{b.ref}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{b.title}</span>
            {loops && <span className="font-mono text-[11px] text-muted">vòng {b.loop}</span>}
            <span className="font-mono text-xs text-muted">{b.at}</span>
            <StatusChip status={b.status} />
            <CopyButton text={blockJson(b)} label={`Chép output của ${b.ref}`} />
          </header>
          <OutputTable rows={outputRows(b.ref, b.output)} />
        </section>
      ))}
    </div>
  );
}
