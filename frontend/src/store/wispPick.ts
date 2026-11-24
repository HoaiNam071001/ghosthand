// Chọn element trên Wisp (bước 65): bật chế độ chọn bên Wisp; mỗi lần người dùng bấm một phần tử Go phát `wisp:pick`
// → thêm node web đã có selector, nối sau node đang chọn (một lần hoàn tác), rồi báo lại để Wisp hiện toast.
import { useEffect, useState } from 'react';
import { tr } from '../i18n/lang';
import { AckWispPick, StartWispPick, WispStatus } from '../../wailsjs/go/app/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import type { Step } from '../types';
import { makeStep } from '../types';
import { inWails } from '../windowMode';
import { setNotice } from './editor';
import { clearInsertAt, insertAfterSelected, insertNode, newId } from './nodes';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

type PickMsg = { step: Step; warn: boolean; url: string };

function onPick({ step, warn }: PickMsg) {
  insertAfterSelected();
  let ref = '';
  insertNode(makeStep({ ...step, id: newId(), ref: '' }), (r) => {
    ref = r;
    return warn ? tr('pick.addedWarn', { ref: r }) : tr('pick.added', { ref: r });
  });
  clearInsertAt();
  void AckWispPick(ref);
}

if (inWails) EventsOn('wisp:pick', onPick);

export async function startWispPick() {
  try {
    await StartWispPick(true);
    setNotice(tr('pick.on'));
  } catch (e) {
    setNotice(tr('pick.fail', { e: errText(e) }));
  }
}

// Wisp đang mở + bật cổng? (đọc ghosthand.json, rẻ) – nút Chọn element chỉ bật khi sẵn sàng. problem = lý do khi chưa.
export function useWispReady(): { ready: boolean; problem: string } {
  const [st, setSt] = useState({ ready: false, problem: '' });
  useEffect(() => {
    if (!inWails) return;
    let live = true;
    const poll = () => Promise.resolve().then(WispStatus).then((s) => live && setSt((o) => (o.ready === s.ready && o.problem === s.problem ? o : { ready: s.ready, problem: s.problem }))).catch(() => {});
    void poll();
    const h = setInterval(poll, 5000);
    return () => { live = false; clearInterval(h); };
  }, []);
  return st;
}
