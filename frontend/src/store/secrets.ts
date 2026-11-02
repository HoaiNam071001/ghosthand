// Tên các bí mật đã lưu (bước 43 S10) – gợi ý {{secret.<tên>}} trong ô chữ. Chỉ tên, giá trị không bao giờ về giao diện.
import { useEffect, useState } from 'react';
import { ListSecrets } from '../../wailsjs/go/app/App';

let names: string[] = [];
let loaded = false;
const listeners = new Set<(n: string[]) => void>();

export function refreshSecretNames(): Promise<void> {
  try { // trình duyệt không có Go (#demo) → binding không tồn tại
    return ListSecrets().then((n) => { names = n ?? []; loaded = true; listeners.forEach((l) => l(names)); }).catch(() => undefined);
  } catch {
    loaded = true;
    return Promise.resolve();
  }
}

export function useSecretNames(): string[] {
  const [n, setN] = useState(names);
  useEffect(() => {
    listeners.add(setN);
    if (!loaded) refreshSecretNames();
    return () => { listeners.delete(setN); };
  }, []);
  return n;
}
