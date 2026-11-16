// Mẫu thử (bước 33): kịch bản mẫu đơn giản để test từng loại bước, lọc theo loại bước / kiểu app (ô chọn
// cùng hàng ô tìm – danh sách mẫu chiếm phần lớn chiều cao) + ô tìm. SamplesBody là phần ruột, dùng cho trang Tệp → Mẫu thử (bước 63)
// và hộp thoại SamplesDialog (màn mẫu #demo).
// Chỉ hiển thị – nạp danh sách / mở mẫu ở Samples.tsx (app thật) hoặc dữ liệu giả (#demo).
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { StepIcon, StepIconName, STEP_ICON } from '../icons';
import { categoryOfType } from '../../flow/category';
import { fieldBox } from '../NumInput';
import { ALL, appsOf, filterSamples, Sample, SampleFilter, stepCounts, stepName } from '../../samples/filter';
import SampleCard from './SampleCard';
import Select from '../Select';

export type SamplesDialogProps = {
  samples: Sample[] | null; // null = đang nạp
  error?: string;
  ready: boolean; // false: trình duyệt không có Go – không mở được
  onPick: (s: Sample) => void;
  onOpenPage: (page: string) => void; // '' = danh sách trang sân thử
  onClose: () => void;
};

export default function SamplesDialog(p: SamplesDialogProps) {
  const { onClose } = p;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/25 px-4 pt-[6vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Mẫu thử" className="flex max-h-[86vh] w-[820px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <SamplesBody {...p} />
      </div>
    </div>
  );
}

// onClose bỏ trống = đang là một trang (không có nút ✕)
export function SamplesBody({ samples, error, ready, onPick, onOpenPage, onClose }: Omit<SamplesDialogProps, 'onClose'> & { onClose?: () => void }) {
  const [f, setF] = useState<SampleFilter>(ALL);
  const list = samples ?? [];
  const shown = useMemo(() => filterSamples(list, f), [list, f]);
  const steps = useMemo(() => stepCounts(list), [list]);
  const apps = useMemo(() => appsOf(list), [list]);
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-[18px]">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-base font-semibold">Mẫu thử</div>
            <div className="text-[13px] text-muted">Kịch bản đơn giản để test từng loại bước, chạy trên sân thử cục bộ (trang giả lập offline, tự hiện kết quả). Dùng mẫu = mở bản sao chưa lưu.</div>
          </div>
          <button disabled={!ready} onClick={() => onOpenPage('')} className="h-8 shrink-0 rounded-control border border-line px-2.5 text-[13px] enabled:hover:bg-hover disabled:opacity-60">Mở sân thử</button>
          {onClose && <button onClick={onClose} aria-label="Đóng" className="h-8 w-8 shrink-0 rounded-control text-muted hover:bg-hover hover:text-ink">✕</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={`${fieldBox} min-w-[220px] flex-1`}>
            <input autoFocus value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Tìm mẫu (không dấu cũng được)…" className="w-full bg-transparent text-ink outline-none" />
          </label>
          <div className="w-[170px]">
            <Select value={f.app} onChange={(app) => setF({ ...f, app })} aria-label="Lọc theo kiểu" className={`${fieldBox} text-[13px] text-ink`}
              options={[{ value: '', label: 'Kiểu: tất cả' }, ...apps.map((a) => ({ value: a, label: a }))]} />
          </div>
          <div className="w-[210px]">
            <Select value={f.step} onChange={(step) => setF({ ...f, step })} aria-label="Lọc theo bước" className={`${fieldBox} text-[13px] text-ink`} menuWidth={240}
              options={[{ value: '', label: 'Bước: tất cả' }, ...steps.map(({ type, count }) => ({
                value: type, label: stepName(type), sub: String(count),
                icon: type in STEP_ICON ? <span className={`cat-${categoryOfType(type)} grid`}><StepIcon type={type as StepIconName} className="h-3.5 w-3.5 text-cat" /></span> : <span className="w-3.5" />,
              }))]} />
          </div>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto bg-bg p-[18px] sm:grid-cols-2">
        {error ? <Empty>Không nạp được danh sách mẫu: {error}</Empty>
          : !samples ? <Empty>Đang nạp…</Empty>
          : !shown.length ? <Empty>Không có mẫu khớp bộ lọc.</Empty>
          : shown.map((s) => <SampleCard key={s.id} sample={s} ready={ready} onPick={() => onPick(s)} onOpenPage={() => onOpenPage(s.page)} />)}
      </div>
      <div className="border-t border-line px-[18px] py-2 text-xs text-muted">{shown.length} / {list.length} mẫu</div>
    </>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <div className="col-span-full py-10 text-center text-muted">{children}</div>;
