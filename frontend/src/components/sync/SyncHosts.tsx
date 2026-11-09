// Phần nối store của đồng bộ cloud (bước 54 C8) cho màn chính: hộp hỏi xung đột + chấm trên thanh dưới + nạp lại sau khi kéo về.
// Phần hiển thị nằm ở SyncConflictDialog / SyncChip (props) để màn mẫu #demo-sync dùng chung.
import { useEffect } from 'react';
import { openSettings } from '../../settingsNav';
import { initTheme } from '../../theme';
import { setNotice } from '../../store';
import { answerSyncConflict, onSyncPulled, useSyncConflict, useSyncStatus } from '../../syncState';
import SyncChip from './SyncChip';
import SyncConflictDialog from './SyncConflictDialog';

export function SyncConflictHost() {
  const ask = useSyncConflict();
  return <SyncConflictDialog ask={ask} onAnswer={answerSyncConflict} />;
}

export function SyncChipHost() {
  const status = useSyncStatus();
  return <SyncChip status={status} onClick={() => openSettings('sync')} />;
}

/** Kéo được thứ gì về: cài đặt → áp lại giao diện; kịch bản → báo (kịch bản đang mở không bị đổi dưới tay). */
export function useSyncPulled() {
  useEffect(() => onSyncPulled((paths) => {
    if (paths.includes('settings.json')) initTheme();
    const scripts = paths.filter((p) => p.startsWith('scripts/')).length;
    if (scripts > 0) setNotice(`Đồng bộ: nhận ${scripts} kịch bản từ cloud – mở lại từ Thư viện để thấy bản mới`);
  }), []);
}
