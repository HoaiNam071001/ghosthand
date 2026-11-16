// Hộp hỏi khi đồng bộ gặp xung đột (bước 54 C4): hai bên cùng đổi một thứ. Không có lựa chọn "tự ghi đè" – đóng hộp / Esc = để đó,
// lần đồng bộ sau hỏi lại. Chỉ hiển thị: app thật dùng SyncConflictHost (nối store), màn mẫu #demo-sync truyền props.
import { useEffect } from 'react';
import { tr, useLang } from '../../i18n';
import { clockText, conflictLead } from '../../sync/text';
import type { SyncAnswer, SyncConflict } from '../../sync/types';

const kindLabel = (k: SyncConflict['kind']) => tr(`sync.kind.${k}`);

function Side({ title, time, note }: { title: string; time: string; note?: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-control border border-line bg-field p-2.5">
      <span className="text-xs text-muted">{title}</span>
      <span className="font-mono text-[13px]">{note ?? clockText(time)}</span>
    </div>
  );
}

export default function SyncConflictDialog({ ask, onAnswer }: { ask: SyncConflict | null; onAnswer: (a: SyncAnswer) => void }) {
  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onAnswer('skip');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ask, onAnswer]);
  useLang();
  if (!ask) return null;
  const btn = 'rounded-control border border-line bg-surface px-3.5 py-2 text-left hover:bg-hover';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[12vh]">
      <div role="alertdialog" aria-labelledby="sync-ask-title" className="flex w-[520px] max-w-full flex-col gap-3 rounded-panel border border-line bg-surface p-[18px] text-[13px] text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div id="sync-ask-title" className="text-base font-semibold">{tr('sync.c.title', { kind: kindLabel(ask.kind), name: ask.name })}</div>
        <span>{conflictLead(ask)}</span>
        <div className="flex gap-2">
          <Side title={tr('sync.c.thisMachine')} time={ask.localTime} note={ask.localDeleted ? tr('sync.c.deleted') : ask.kind === 'script' ? undefined : tr('sync.c.localCopy')} />
          <Side title={tr('sync.c.cloud', { dev: ask.device || tr('sync.otherDevice') })} time={ask.remoteTime} note={ask.remoteDeleted ? tr('sync.c.deleted') : undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => onAnswer('local')} className={btn}><b>{tr('sync.c.keepLocal')}</b><br /><span className="text-xs text-muted">{ask.localDeleted ? tr('sync.c.keepLocalDel') : tr('sync.c.keepLocalOver')}</span></button>
          <button onClick={() => onAnswer('remote')} className={btn}><b>{tr('sync.c.takeRemote')}</b><br /><span className="text-xs text-muted">{ask.remoteDeleted ? tr('sync.c.takeRemoteDel') : tr('sync.c.takeRemoteOver')}</span></button>
          {ask.canKeepBoth && (
            <button onClick={() => onAnswer('both')} className={btn}><b>{tr('sync.c.both')}</b><br /><span className="text-xs text-muted">{tr('sync.c.bothHint', { name: ask.name, dev: ask.device || tr('sync.otherDevice') })}</span></button>
          )}
        </div>
        <div className="flex items-center border-t border-line pt-3">
          <span className="text-xs text-muted">{tr('sync.c.note')}</span>
          <button onClick={() => onAnswer('skip')} className="ml-auto rounded-control border border-line bg-surface px-3.5 py-1.5 hover:bg-hover">{tr('sync.c.later')} <span className="font-mono text-[11px] text-muted">Esc</span></button>
        </div>
      </div>
    </div>
  );
}
