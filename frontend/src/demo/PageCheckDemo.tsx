// Hộp Thử trang với dữ liệu giả (bước 44) – xem đủ 6 kết luận trên màn #demo, không cần Go / Chrome.
import { useState } from 'react';
import { web } from '../../wailsjs/go/models';
import PageCheckDialog from '../components/pagecheck/PageCheckDialog';
import { verdictInfo, Verdict } from '../pageCheck';

const SIGNS: Record<Verdict, string[]> = {
  ok: [],
  captcha: ['Có khung reCAPTCHA (iframe google.com/recaptcha)', 'Chữ “Tôi không phải người máy”'],
  blocked: ['Tiêu đề “Access Denied”', 'Chữ “403 Forbidden”'],
  canvas: ['Có 1 thẻ <canvas> chiếm 92 % trang', 'Chỉ đọc được 3 phần tử ngoài canvas'],
  empty: ['Không đọc được phần tử nào'],
  loading: ['Trang còn đang thay đổi sau 30 giây'],
};
const ELEMENTS: Record<Verdict, number> = { ok: 48, captcha: 12, blocked: 2, canvas: 3, empty: 0, loading: 0 };

const fake = (v: Verdict) => web.PageCheck.createFrom({
  verdict: v, useWeb: v === 'ok', signs: SIGNS[v], url: 'https://game-a.vn/choi', title: 'Game A – Chơi ngay', loaded: v !== 'loading',
  elements: ELEMENTS[v], outline: [], tab: 't1',
});

export default function PageCheckDemo() {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>('ok');
  const [url, setUrl] = useState('game-a.vn/choi');
  const verdicts = Object.keys(SIGNS) as Verdict[];
  return (
    <>
      <span className="flex flex-wrap items-center gap-1.5">
        <select value={verdict} onChange={(e) => setVerdict(e.target.value as Verdict)} aria-label="Kết luận mẫu"
          className="h-7 rounded-control border border-line bg-field px-2 text-xs">
          {verdicts.map((v) => <option key={v} value={v}>{verdictInfo(v).title}</option>)}
        </select>
        <button onClick={() => setOpen(true)} className="h-7 rounded-control border border-line bg-surface px-2.5 text-xs hover:bg-hover">Hộp Thử trang</button>
      </span>
      {open && <PageCheckDialog url={url} onUrl={setUrl} busy={false} result={fake(verdict)} error="" onCheck={() => {}} onRecheck={() => {}} onClose={() => setOpen(false)} />}
    </>
  );
}
