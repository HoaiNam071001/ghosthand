// Mẫu thử nối Go: nạp danh sách (App.Samples), dùng mẫu qua scriptFile (hỏi lưu nếu đang có thay đổi),
// mở trang sân thử / web thật bằng trình duyệt mặc định. Dạng hộp thoại (Samples) và dạng trang Tệp (SamplesPage – bước 63).
import { useEffect, useState } from 'react';
import { OpenSandboxPage, Samples as LoadSamples } from '../../../wailsjs/go/app/App';
import { openSample } from '../../scriptFile';
import { inWails } from '../../windowMode';
import { Sample } from '../../samples/filter';
import SamplesDialog, { SamplesBody } from './SamplesDialog';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useSamples() {
  const [list, setList] = useState<Sample[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!inWails) return setError('cần chạy trong app (wails dev)');
    LoadSamples().then((l) => setList(l ?? [])).catch((e) => setError(errText(e)));
  }, []);
  return { list, error, openPage: (page: string) => OpenSandboxPage(page).catch((e) => setError(errText(e))) };
}

export default function Samples({ onClose }: { onClose: () => void }) {
  const { list, error, openPage } = useSamples();
  return (
    <SamplesDialog samples={list} error={error} ready={inWails} onClose={onClose}
      onPick={(s) => { openSample(s.id, s.name); onClose(); }} onOpenPage={openPage} />
  );
}

// Trang Tệp → Mẫu thử: dùng mẫu xong thì onDone (đóng trang Tệp để thấy kịch bản mới mở)
export function SamplesPage({ onDone }: { onDone: () => void }) {
  const { list, error, openPage } = useSamples();
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-surface">
      <SamplesBody samples={list} error={error} ready={inWails} onPick={(s) => { openSample(s.id, s.name); onDone(); }} onOpenPage={openPage} />
    </div>
  );
}
