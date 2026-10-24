// Hook của thanh mini.
import { useEffect, useState } from 'react';
import { GetSettings, SetMCPSettings } from '../../../wailsjs/go/main/App';
import { store } from '../../../wailsjs/go/models';
import { AiLevel, aiLevel, withLevel } from '../../aiLevel';
import { errorText, setLastError } from '../../engineStore';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
import { inWails } from '../../windowMode';

// useAiLevel – mức AI hiện tại + đổi mức (lưu như Cài đặt; Go dừng lượt AI khi chuyển về Tắt / Chỉ soạn).
// active = false (lượt không do AI chạy) → không đọc cài đặt, trả undefined.
export function useAiLevel(active: boolean): { level: AiLevel; onLevel: (l: AiLevel) => void } | undefined {
  const [mcp, setMcp] = useState<store.MCPSettings | null>(null);
  useEffect(() => {
    if (active) GetSettings().then((s) => setMcp(s.mcp)).catch(() => {});
  }, [active]);
  if (!active || !mcp) return undefined;
  return {
    level: aiLevel(mcp),
    // đọc lại trước khi lưu – AI có thể vừa đổi phần khác (ưu tiên node – 44)
    onLevel: (l) => GetSettings().then((s) => {
      const next = store.MCPSettings.createFrom(withLevel(s.mcp, l));
      return SetMCPSettings(next).then(() => setMcp(next));
    }).catch((e) => setLastError(errorText(e))),
  };
}

// useCaptureDot – true vài giây sau khi AI chụp / đọc màn hình (event ai:capture – Go bỏ qua nếu người dùng đã tắt chấm).
export function useCaptureDot(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!inWails) return;
    let timer: ReturnType<typeof setTimeout>;
    const off = EventsOn('ai:capture', () => {
      setOn(true);
      clearTimeout(timer);
      timer = setTimeout(() => setOn(false), 3000);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);
  return on;
}
