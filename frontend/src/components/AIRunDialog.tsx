// AI muốn chạy kịch bản (bước 31b, mức "Hỏi trước khi chạy"): tên kịch bản, phần sẽ chạy, Cho phép một lần /
// Cho phép kịch bản này đến khi đóng app / Từ chối. Enter = cho phép một lần, Esc = từ chối. Lượt run_batch (61 M2)
// hỏi một lần cho cả lượt – liệt kê tên, không có "đến khi đóng app".
import { useEffect } from 'react';
import { answerAI, useAIAsk } from '../aiAsk';
import { aiBatchNames, aiRunScope } from '../aiScope';
import { Play } from './icons';

export default function AIRunDialog() {
  const ask = useAIAsk();
  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answerAI('deny');
      else if (e.key === 'Enter') answerAI('once');
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ask]);
  if (!ask) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[14vh]">
      <div role="alertdialog" aria-labelledby="ai-run-title" aria-describedby="ai-run-desc"
        className="flex w-[460px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div className="flex gap-3 p-[18px]">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[9px] bg-accent-soft text-accent-text"><Play className="h-[18px] w-[18px]" /></span>
          <div className="flex min-w-0 flex-col gap-2">
            <div id="ai-run-title" className="text-base font-semibold">{ask.batch ? `AI muốn chạy ${ask.batch.length} kịch bản một lượt` : `AI muốn chạy “${ask.script}”`}</div>
            {ask.batch ? (
              <div id="ai-run-desc" className="flex flex-col gap-1 text-[13px]">
                <span>Chạy lần lượt, kịch bản lỗi thì chạy tiếp – chuột và bàn phím sẽ do kịch bản điều khiển. Không ghi Lịch sử chạy.</span>
                <span className="line-clamp-3 font-mono text-xs text-muted">{aiBatchNames(ask.batch)}</span>
              </div>
            ) : (
              <div id="ai-run-desc" className="flex flex-col gap-1 text-[13px]">
                <span>Chạy {aiRunScope(ask)} – chuột và bàn phím sẽ do kịch bản điều khiển.</span>
                {ask.path ? <span className="truncate font-mono text-xs text-muted" title={ask.path}>{ask.path}</span>
                  : <span className="text-xs text-muted">Kịch bản tạm AI gửi kèm (chưa lưu, {ask.steps} node) – lần sau vẫn hỏi lại.</span>}
              </div>
            )}
            <span className="text-xs text-muted">Dừng bất cứ lúc nào: F8 hoặc đưa chuột chạm góc màn hình{ask.batch ? ' – dừng cả lượt' : ''}.</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-chrome px-[18px] py-3">
          <button onClick={() => answerAI('deny')} className="h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">Từ chối <span className="font-mono text-[11px] text-muted">Esc</span></button>
          {ask.path && <button onClick={() => answerAI('script')} className="ml-auto h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">Cho phép đến khi đóng app</button>}
          <button autoFocus onClick={() => answerAI('once')} className={`btn-primary h-9 ${ask.path ? '' : 'ml-auto'} rounded-control px-4 font-semibold text-on-accent`}>Cho phép lần này</button>
        </div>
      </div>
    </div>
  );
}
