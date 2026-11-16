// Trang Tệp (backstage, bước 63) – phủ toàn vùng giữa thanh tiêu đề và status bar, thay thanh thư viện bên trái cũ:
// Trang đầu (mới / kịch bản của tôi / lịch sử), Mở, Mẫu thử, Lưu, Lưu thành, Nhúng, Gói .zip, Lịch sử chạy, Cài đặt. Esc hoặc ← Quay lại để về màn soạn.
// Canvas phía dưới vẫn mount (chỉ bị che) nên không mất vị trí xem.
import { useEffect } from 'react';
import { exportPack, importPack, newScript, openScript, save } from '../../scriptFile';
import { inWails } from '../../windowMode';
import { closeBackstage, openBackstage, openSettingsDialog, useShell } from '../../shellStore';
import { RunsPage } from '../library/RunsDialog';
import { SamplesPage } from '../samples/Samples';
import BackstageNav, { NavEntry } from './BackstageNav';
import EmbedPage from './EmbedPage';
import HomePage from './HomePage';
import { MOD } from '../ribbon/model';

const SHIFT = navigator.platform.startsWith('Mac') ? '⇧' : 'Shift+';

export default function Backstage() {
  const { backstage: page } = useShell();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || (e.target as HTMLElement).closest?.('input, textarea, select, [role=dialog], [role=listbox], [role=menu]')) return;
      closeBackstage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!page) return null;

  // lệnh làm việc với file: về màn soạn trước (hộp thoại hỏi lưu / chọn file hiện trên màn soạn)
  const run = (f: () => unknown) => () => { closeBackstage(); void f(); };
  const sections: NavEntry[][] = [
    [
      { id: 'home', label: 'Trang đầu', icon: 'history', page: 'home' },
      { id: 'new', label: 'Mới', icon: 'dup', hint: `${MOD}N`, disabled: !inWails, onClick: run(newScript) },
      { id: 'open', label: 'Mở…', icon: 'folder', hint: `${MOD}O`, disabled: !inWails, onClick: run(openScript) },
      { id: 'samples', label: 'Mẫu thử', icon: 'grid', page: 'samples', title: 'Kịch bản mẫu để test từng loại node' },
    ],
    [
      { id: 'save', label: 'Lưu', icon: 'save', hint: `${MOD}S`, disabled: !inWails, onClick: run(() => save()) },
      { id: 'saveAs', label: 'Lưu thành…', icon: 'save', title: `Lưu thành file khác (${MOD}${SHIFT}S)`, disabled: !inWails, onClick: run(() => save(true)) },
      { id: 'embed', label: 'Nhúng kịch bản…', icon: 'pack', page: 'embed', title: 'Chép node của kịch bản khác vào đây thành một khung nhóm' },
      { id: 'export', label: 'Xuất gói .zip…', icon: 'zip', disabled: !inWails, onClick: run(exportPack), title: 'Kịch bản kèm file CSV / ảnh để gửi máy khác' },
      { id: 'import', label: 'Nhập gói .zip…', icon: 'zip', disabled: !inWails, onClick: run(importPack) },
    ],
    [{ id: 'runs', label: 'Lịch sử chạy', icon: 'clock', page: 'runs' }],
    [{ id: 'settings', label: 'Cài đặt', icon: 'gear', hint: `${MOD},`, onClick: openSettingsDialog }],
  ];
  const fill = page === 'samples' || page === 'runs'; // trang tự lấp đầy và tự cuộn
  return (
    <div role="region" aria-label="Trang Tệp" className="absolute inset-0 z-30 flex bg-bg">
      <BackstageNav sections={sections} current={page} onPage={openBackstage} onBack={closeBackstage} />
      <div className={`min-w-0 flex-1 p-[22px_28px] ${fill ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {page === 'home' && <HomePage onDone={closeBackstage} />}
        {page === 'samples' && <SamplesPage onDone={closeBackstage} />}
        {page === 'runs' && <RunsPage onDone={closeBackstage} />}
        {page === 'embed' && <EmbedPage onDone={closeBackstage} />}
      </div>
    </div>
  );
}
