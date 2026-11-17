// Danh sách màn hình cho ribbon. Tải lại khi cửa sổ lấy lại focus (vừa đóng overlay chọn vùng, hoặc cắm / rút màn).
import { useEffect, useState } from 'react';
import { Displays } from '../../../wailsjs/go/app/App';
import { inWails } from '../../windowMode';
import type { DisplayLike } from '../../overlay/regionSummary';

export function useDisplayList(): DisplayLike[] {
  const [ds, setDs] = useState<DisplayLike[]>([]);
  useEffect(() => {
    if (!inWails) return;
    const load = () => { Displays().then(setDs).catch(() => {}); };
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);
  return ds;
}
