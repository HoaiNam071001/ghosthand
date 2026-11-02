// Toả cổng dữ liệu ở thẻ Gọn + kéo nối dữ liệu (bước 60): rê chuột lên thẻ FAN_DELAY ms → toả VÀO / RA; đang kéo từ một
// output thì node dưới chuột toả VÀO (hoặc báo lý do không nối được). Hook nhỏ của FlowCanvas.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection } from '@xyflow/react';

export const FAN_DELAY = 400;
const CLOSE_DELAY = 200;
export const isDataHandle = (h?: string | null) => !!h && h.startsWith('o:');

export function useDataFan(enabled: boolean, linkBlock?: (from: string, to: string) => string | null) {
  // "node|handle" khi đang kéo nối – chuỗi để canvas không vẽ lại theo từng bước chuột
  const drag = useConnection((c) => (c.inProgress ? `${c.fromNode?.id ?? ''}|${c.fromHandle?.id ?? ''}` : ''));
  const [from, handle] = drag.split('|');
  const dataDrag = isDataHandle(handle);
  const [hover, setHover] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (!dataDrag) setTarget(null); }, [dataDrag]);

  const enter = useCallback((id: string) => {
    clearTimeout(timer.current);
    if (dataDrag) return setTarget(id);
    if (enabled) timer.current = setTimeout(() => setHover(id), FAN_DELAY);
  }, [dataDrag, enabled]);
  const leave = useCallback(() => {
    clearTimeout(timer.current);
    if (!dataDrag) timer.current = setTimeout(() => setHover(null), CLOSE_DELAY);
    // đang kéo: giữ VÀO của node vừa rời toả tiếp – chuột đi ra chip ngoài thẻ vẫn thả được
  }, [dataDrag]);

  // Trạng thái toả của một node
  const fanOf = useCallback((id: string): { fan?: 'both' | 'in'; block?: string } => {
    if (dataDrag) {
      if (id === from) return enabled ? { fan: 'both' } : {};
      if (id !== target) return {};
      const why = linkBlock?.(from, id);
      return why ? { block: why } : enabled ? { fan: 'in' } : {};
    }
    return enabled && id === hover ? { fan: 'both' } : {};
  }, [dataDrag, from, target, hover, enabled, linkBlock]);
  return { enter, leave, fanOf, dataDrag, target };
}
