// "Dán lệnh curl" của node HTTP (bước 50 E3): dán từ DevTools → Network → Copy as cURL, bấm Điền là có URL, query, header, body.
import { useState } from 'react';
import { updateStep } from '../../store';
import { parseCurl } from '../../flow/curl';
import { Step } from '../../types';
import { errText, hint } from './shared';

export function CurlImport({ step: s }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const fill = () => {
    const r = parseCurl(text);
    if ('error' in r) return setError(r.error);
    // trường curl không có thì xoá giá trị cũ – nút Điền là thay toàn bộ request
    updateStep(s.id, { ...{ query: undefined, headers: undefined, bodyType: undefined, body: undefined, form: undefined }, ...r.patch });
    setError('');
    setNotes(r.notes);
    setText('');
    setOpen(false);
  };
  return (
    <div className="col-span-2 flex flex-col gap-1.5">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="h-8 w-fit rounded-control border border-line px-3 text-[13px] text-ink hover:bg-hover">Dán lệnh curl…</button>
      {open && <>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} spellCheck={false} aria-label="Lệnh curl"
          placeholder={"curl 'https://api.example.com/orders' -H 'Authorization: Bearer …' -d '{\"id\":1}'"}
          className="w-full resize-y rounded-control border border-line bg-field px-2.5 py-2 font-mono text-[13px] text-ink outline-none placeholder:text-muted" />
        <div className="flex items-center gap-2">
          <button onClick={fill} disabled={!text.trim()} className="btn-primary h-8 rounded-control px-3 text-[13px] disabled:opacity-50">Điền vào node</button>
          <span className={hint}>Thay URL, tham số, header và body hiện có. Chrome: DevTools → Network → chuột phải → Copy → Copy as cURL.</span>
        </div>
      </>}
      {error && <span className={errText}>{error}</span>}
      {notes.map((n) => <span key={n} className={hint}>⚠ {n}</span>)}
    </div>
  );
}
