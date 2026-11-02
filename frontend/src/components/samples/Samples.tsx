// Hộp thoại Mẫu thử nối Go: nạp danh sách (App.Samples), dùng mẫu qua scriptFile (hỏi lưu nếu đang có thay đổi),
// mở trang sân thử / web thật bằng trình duyệt mặc định.
import { useEffect, useState } from 'react';
import { OpenSandboxPage, Samples as LoadSamples } from '../../../wailsjs/go/app/App';
import { openSample } from '../../scriptFile';
import { inWails } from '../../windowMode';
import { Sample } from '../../samples/filter';
import SamplesDialog from './SamplesDialog';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function Samples({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<Sample[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!inWails) return setError('cần chạy trong app (wails dev)');
    LoadSamples().then((l) => setList(l ?? [])).catch((e) => setError(errText(e)));
  }, []);
  return (
    <SamplesDialog samples={list} error={error} ready={inWails} onClose={onClose}
      onPick={(s) => { openSample(s.id, s.name); onClose(); }}
      onOpenPage={(page) => OpenSandboxPage(page).catch((e) => setError(errText(e)))} />
  );
}
