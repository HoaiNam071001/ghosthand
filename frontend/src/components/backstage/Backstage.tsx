// Trang Tệp (backstage, bước 63) – phủ toàn vùng giữa thanh tiêu đề và status bar, thay thanh thư viện bên trái cũ:
// Trang đầu (mới / kịch bản của tôi / lịch sử), Mở, Mẫu thử, Lưu, Lưu thành, Nhúng, Gói .zip, Lịch sử chạy, Cài đặt. Esc hoặc ← Quay lại để về màn soạn.
// Canvas phía dưới vẫn mount (chỉ bị che) nên không mất vị trí xem.
import { useEffect } from 'react';
import { useT } from '../../i18n';
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
  const t = useT();
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
      { id: 'home', label: t('bs.home'), icon: 'history', page: 'home' },
      { id: 'new', label: t('bs.new'), icon: 'dup', hint: `${MOD}N`, disabled: !inWails, onClick: run(newScript) },
      { id: 'open', label: t('bs.open'), icon: 'folder', hint: `${MOD}O`, disabled: !inWails, onClick: run(openScript) },
      { id: 'samples', label: t('bs.samples'), icon: 'grid', page: 'samples', title: t('bs.samplesT') },
    ],
    [
      { id: 'save', label: t('bs.save'), icon: 'save', hint: `${MOD}S`, disabled: !inWails, onClick: run(() => save()) },
      { id: 'saveAs', label: t('bs.saveAs'), icon: 'save', title: t('bs.saveAsT', { mod: MOD, shift: SHIFT }), disabled: !inWails, onClick: run(() => save(true)) },
      { id: 'embed', label: t('bs.embed'), icon: 'pack', page: 'embed', title: t('bs.embedT') },
      { id: 'export', label: t('bs.export'), icon: 'zip', disabled: !inWails, onClick: run(exportPack), title: t('bs.exportT') },
      { id: 'import', label: t('bs.import'), icon: 'zip', disabled: !inWails, onClick: run(importPack) },
    ],
    [{ id: 'runs', label: t('bs.runs'), icon: 'clock', page: 'runs' }],
    [{ id: 'settings', label: t('st.title'), icon: 'gear', hint: `${MOD},`, onClick: openSettingsDialog }],
  ];
  const fill = page === 'samples' || page === 'runs'; // trang tự lấp đầy và tự cuộn
  return (
    <div role="region" aria-label={t('bs.nav')} className="absolute inset-0 z-30 flex bg-bg">
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
