// Màn #demo-runtree (bước 60): Lịch sử chạy dạng cây với kịch bản mẫu Bảng giá + lần chạy giả (thành công / lỗi lượt 3 –
// ?run=fail), không cần Go. Cùng giao diện hộp thoại Lịch sử chạy (RunTreeView).
import { useMemo, useState } from 'react';
import Segmented from '../components/Segmented';
import RunTreeView from '../components/runs/RunTreeView';
import { demoDataScript, demoRun } from '../demo/dataDemo';

export default function DemoRunTree() {
  const sc = useMemo(demoDataScript, []);
  const [which, setWhich] = useState<'ok' | 'fail'>(new URLSearchParams(location.search).get('run') === 'fail' ? 'fail' : 'ok');
  const results = useMemo(() => demoRun(which === 'fail'), [which]);
  return (
    <div className="flex h-screen flex-col bg-bg text-ink">
      <div className="flex flex-none items-center gap-3 border-b border-line bg-chrome px-4 py-2.5">
        <div className="flex-1">
          <div className="text-base font-semibold">Lịch sử chạy</div>
          <div className="text-[13px] text-muted">{sc.name} · dữ liệu mẫu</div>
        </div>
        <Segmented label="Lần chạy mẫu" value={which} onChange={setWhich} options={[{ id: 'ok', label: '14:32 · thành công' }, { id: 'fail', label: '13:05 · lỗi ở n9' }]} />
      </div>
      <div className="min-h-0 flex-1"><RunTreeView key={which} results={results} steps={sc.steps} edges={sc.edges} /></div>
    </div>
  );
}
