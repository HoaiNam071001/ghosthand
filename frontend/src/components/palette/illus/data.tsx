// Hoạt hoạ nhóm dữ liệu: clipboard, HTTP, tệp, âm lượng, tính toán, xử lý chữ, đặt biến (bước 47).
import { Arr, Chip, Move, Scenes, Show, Stage, T, Tick, Tween, Typed, Win } from './parts';

const box = (x: number, y: number, w: number, h: number, label?: string) => (
  <g><rect x={x} y={y} width={w} height={h} rx="6" className="fill-surface stroke-line-strong" />
    {label && <T x={x + w / 2} y={y + h / 2 + 3} anchor="middle" s={8} cls="fill-muted">{label}</T>}</g>
);
const packet = (pts: [number, number, number][], label: string) => (
  <Move pts={pts}><rect x={-14} y={-7} width="28" height="14" rx="7" className="fill-accent" /><T x={0} y={3} anchor="middle" s={7.5} cls="fill-on-accent">{label}</T></Move>
);

export const data: Scenes = {
  clipboard: () => (
    <Stage>
      {box(14, 40, 62, 56)}<T x={45} y={66} anchor="middle" s={10}>abc 123</T>
      <rect x={96} y={32} width="48" height="70" rx="6" className="fill-field stroke-line-strong" /><rect x={110} y={27} width="20" height="9" rx="3" className="fill-accent" />
      <Show from={0.4}><T x={120} y={72} anchor="middle" s={9}>abc 123</T></Show>
      {box(164, 40, 62, 56)}<Show from={0.8}><T x={195} y={66} anchor="middle" s={10}>abc 123</T></Show>
      <Arr x1={78} y1={68} x2={94} y2={68} /><Arr x1={146} y1={68} x2={162} y2={68} />
      <T x={45} y={112} anchor="middle" s={8} cls="fill-muted">Copy</T><T x={195} y={112} anchor="middle" s={8} cls="fill-muted">Paste</T>
    </Stage>
  ),
  http: () => (
    <Stage>
      {box(14, 38, 56, 58, 'Ghosthand')}{box(170, 38, 56, 58, 'Server')}
      <Arr x1={74} y1={56} x2={164} y2={56} /><Arr x1={166} y1={80} x2={76} y2={80} />
      {packet([[0.1, 88, 56], [0.4, 150, 56]], 'GET')}{packet([[0.5, 150, 80], [0.85, 90, 80]], '{ }')}
      <Show from={0.85}><Chip x={14} y={104} w={56} label="200 OK ✓" cls="fill-surface stroke-ok" /></Show>
    </Stage>
  ),
  file: () => (
    <Stage><Win />
      {[0, 1, 2, 3].map((i) => <g key={i}><rect x={28} y={30 + i * 18} width="184" height="16" className={i === 0 ? 'fill-soft' : 'fill-field'} />
        {[0, 1, 2].map((j) => <rect key={j} x={34 + j * 60} y={36 + i * 18} width={i === 0 ? 40 : 30 + ((i + j) % 3) * 8} height="4" rx="2" className="fill-line-strong" />)}</g>)}
      <Show from={0.4}><rect x={28} y={102} width="184" height="16" className="fill-accent-soft stroke-accent" /><T x={34} y={113} s={8}>ĐH-4821 · 1.250.000 · xong</T></Show>
      <Show from={0.4}><T x={206} y={113} anchor="end" cls="fill-accent-text">+ dòng mới</T></Show>
    </Stage>
  ),
  sysInfo: () => (
    <Stage>
      {box(14, 28, 70, 78, 'Máy')}
      <rect x={26} y={56} width="46" height="10" rx="3" className="fill-soft stroke-line" /><rect x={28} y={58} width="30" height="6" rx="2" className="fill-ok" />
      <rect x={26} y={72} width="46" height="10" rx="3" className="fill-soft stroke-line" /><rect x={28} y={74} width="18" height="6" rx="2" className="fill-accent" />
      <Arr x1={88} y1={67} x2={140} y2={67} />
      <Show from={0.4}><rect x={144} y={36} width="82" height="62" rx="6" className="fill-surface stroke-ok" /><T x={152} y={54} s={8} cls="fill-ink">pin 87%</T><T x={152} y={70} s={8} cls="fill-ink">ổ 44 GB</T><T x={152} y={86} s={8} cls="fill-ink">mạng có</T><Tick x={226} y={36} from={0.4} /></Show>
    </Stage>
  ),
  power: () => (
    <Stage>
      {box(14, 34, 96, 66)}
      <Arr x1={116} y1={67} x2={150} y2={67} />
      <circle cx={190} cy={67} r={24} className="fill-surface stroke-line-strong" />
      <path d="M190 52v14" className="stroke-danger" strokeWidth={3} strokeLinecap="round" fill="none"><Tween attr="opacity" pts={[[0.6, 1], [0.8, 0.3]]} /></path>
      <Show from={0.5}><T x={190} y={112} anchor="middle" s={9} cls="fill-muted">30…29…</T></Show>
    </Stage>
  ),
  display: () => (
    <Stage>
      <rect x={20} y={36} width="84" height="58" rx="6" className="fill-ink stroke-line-strong" />
      <rect x={130} y={36} width="84" height="58" rx="6" className="fill-surface stroke-line-strong" />
      <Arr x1={108} y1={65} x2={126} y2={65} />
      <Show from={0.5}><Tick x={214} y={36} from={0.5} /></Show>
    </Stage>
  ),
  askAI: () => (
    <Stage>
      {box(14, 34, 96, 66)}
      <Arr x1={114} y1={67} x2={140} y2={67} />
      <Show from={0.4}><rect x={144} y={36} width="96" height="62" rx="8" className="fill-surface stroke-line-strong" /><T x={156} y={54} s={9} cls="fill-ink">AI</T><T x={156} y={70} s={8} cls="fill-muted">Cần trả lời: có</T><Tick x={240} y={36} from={0.4} /></Show>
    </Stage>
  ),
  notify: () => (
    <Stage>
      {box(14, 34, 96, 66)}
      <Show from={0.4}><rect x={128} y={30} width="110" height="40" rx="8" className="fill-surface stroke-line-strong" /><T x={140} y={48} s={9} cls="fill-ink">Ghosthand</T><T x={140} y={62} s={8} cls="fill-muted">Đã xử lý xong</T><Tick x={238} y={30} from={0.4} /></Show>
    </Stage>
  ),
  zip: () => (
    <Stage>
      {box(14, 34, 70, 66, 'bao-cao')}
      <Arr x1={92} y1={67} x2={128} y2={67} />
      <rect x={132} y={40} width="64" height="54" rx="6" className="fill-surface stroke-line-strong" />
      <rect x={160} y={40} width="8" height="54" className="fill-soft stroke-line" />
      <Show from={0.5}><T x={164} y={112} anchor="middle" s={9} cls="fill-ok">.zip</T><Tick x={196} y={40} from={0.5} /></Show>
    </Stage>
  ),
  inputSource: () => (
    <Stage>
      {box(14, 40, 62, 54)}<Show to={0.5}><T x={45} y={72} anchor="middle" s={11}>Telex</T></Show>
      <Arr x1={80} y1={67} x2={120} y2={67} />
      <rect x={124} y={44} width="104" height="46" rx="6" className="fill-field stroke-line-strong" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={132 + i * 18} y={52} width="14" height="10" rx="2" className="fill-soft stroke-line" />)}
      {[0, 1, 2, 3].map((i) => <rect key={i} x={141 + i * 18} y={68} width="14" height="10" rx="2" className="fill-soft stroke-line" />)}
      <Show from={0.5}><T x={45} y={72} anchor="middle" s={11} cls="fill-ok">ABC</T><Tick x={76} y={40} from={0.5} /></Show>
    </Stage>
  ),
  process: () => (
    <Stage>
      {box(14, 28, 96, 78, 'ffmpeg')}
      <rect x={24} y={58} width="76" height="8" rx="3" className="fill-soft stroke-line" /><rect x={26} y={60} width="70" height="4" rx="2" className="fill-accent"><Tween attr="width" pts={[[0.5, 70], [0.65, 10]]} /></rect>
      <rect x={24} y={76} width="76" height="8" rx="3" className="fill-soft stroke-line" /><rect x={26} y={78} width="36" height="4" rx="2" className="fill-ok" />
      <Arr x1={116} y1={67} x2={150} y2={67} />
      <Show from={0.6}><rect x={154} y={44} width="72" height="46" rx="6" className="fill-surface stroke-ok" /><T x={162} y={62} s={8} cls="fill-ink">CPU 2%</T><T x={162} y={78} s={8} cls="fill-ink">hết bận</T><Tick x={226} y={44} from={0.6} /></Show>
    </Stage>
  ),
  osShortcut: () => (
    <Stage>
      {box(14, 40, 62, 54, 'Phím tắt')}
      <path d="M52 48l-10 20h8l-4 18 14-24h-8z" className="fill-accent" />
      <Arr x1={80} y1={67} x2={160} y2={67} />
      {packet([[0.1, 96, 67], [0.5, 144, 67]], 'chữ')}
      <Show from={0.55}><rect x={164} y={50} width="62" height="34" rx="6" className="fill-surface stroke-ok" /><T x={195} y={71} anchor="middle" s={8} cls="fill-ink">KẾT QUẢ</T><Tick x={226} y={50} from={0.55} /></Show>
    </Stage>
  ),
  shell: () => (
    <Stage>
      <rect x={30} y={22} width="180" height="94" rx="7" className="fill-ink" opacity="0.92" />
      <Typed x={40} y={46} w={120} text="$ ls | wc -l" from={0.1} to={0.45} s={10} />
      <Show from={0.55}><T x={40} y={68} s={10} cls="fill-ok font-mono">42</T></Show>
      <Show from={0.7}><Chip x={150} y={92} w={52} label="exit 0 ✓" cls="fill-surface stroke-ok" /></Show>
    </Stage>
  ),
  system: () => (
    <Stage>
      <path d="M70 58h14l18-14v46L84 76H70z" className="fill-ink" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${112 + i * 10} ${62 - i * 6}a${10 + i * 6} ${10 + i * 6} 0 0 1 0 ${12 + i * 12}`} fill="none" className="stroke-accent" strokeWidth="3" strokeLinecap="round">
        <Tween attr="opacity" pts={[[0, 0.2], [0.2 + i * 0.15, 0.2], [0.3 + i * 0.15, 1], [0.9, 1], [0.95, 0.2]]} /></path>)}
      <rect x={60} y={108} width="120" height="6" rx="3" className="fill-field" />
      <rect x={60} y={108} width="20" height="6" rx="3" className="fill-accent"><Tween attr="width" pts={[[0, 20], [0.25, 20], [0.75, 100]]} /></rect>
    </Stage>
  ),
  calc: () => (
    <Stage><Win />
      <Show from={0.05}><T x={44} y={62} s={20}>12</T></Show>
      <Show from={0.25}><T x={84} y={62} s={20} cls="fill-accent-text">×</T></Show>
      <Show from={0.4}><T x={110} y={62} s={20}>3</T></Show>
      <Show from={0.55}><T x={136} y={62} s={20} cls="fill-accent-text">=</T></Show>
      <Show from={0.7}><rect x={156} y={40} width="52" height="30" rx="6" className="fill-accent-soft stroke-accent" /><T x={182} y={61} s={20} anchor="middle">36</T></Show>
      <Show from={0.85}><Chip x={150} y={84} w={64} label="{{vars.tong}}" /></Show>
    </Stage>
  ),
  textNumber: () => (
    <Stage><Win />
      <T x={120} y={52} anchor="middle" s={15}>1.234.000 đ</T>
      <Show from={0.4}><Arr x1={120} y1={60} x2={120} y2={80} cls="stroke-accent" /></Show>
      <Show from={0.5}><rect x={78} y={84} width="84" height="24" rx="6" className="fill-accent-soft stroke-accent" /><T x={120} y={101} anchor="middle" s={14} cls="fill-ink">1234000</T></Show>
    </Stage>
  ),
  textMatch: () => (
    <Stage><Win />
      <T x={30} y={50} s={10} cls="fill-muted">Đơn của bạn mã</T>
      <Show from={0.25}><rect x={122} y={39} width="64" height="16" rx="3" className="fill-accent-soft stroke-accent" /></Show>
      <T x={126} y={51} s={10}>ĐH-4821</T><T x={190} y={51} s={10} cls="fill-muted">đã</T>
      <T x={30} y={68} s={10} cls="fill-muted">giao thành công.</T>
      <Show from={0.5}><Arr x1={154} y1={58} x2={154} y2={84} cls="stroke-accent" /><Chip x={118} y={88} w={72} label="ĐH-4821" /></Show>
    </Stage>
  ),
  textSplit: () => (
    <Stage><Win />
      <Show to={0.4}><T x={120} y={70} anchor="middle" s={14}>táo, cam, nho</T></Show>
      {['táo', 'cam', 'nho'].map((w, i) => (
        <Show key={w} from={0.4}><Move pts={[[0.4, 120, 70], [0.65, 60 + i * 60, 84]]}><rect x={-20} y={-12} width="40" height="22" rx="6" className="fill-accent-soft stroke-accent" /><T x={0} y={3} anchor="middle">{w}</T></Move></Show>
      ))}
    </Stage>
  ),
  textClean: () => (
    <Stage><Win />
      <Show to={0.45}><T x={120} y={56} anchor="middle" s={15}>  Đà  Nẵng </T><T x={120} y={86} anchor="middle" s={8} cls="fill-muted">thừa khoảng trắng · có dấu · Hoa</T></Show>
      <Show from={0.45}><T x={120} y={56} anchor="middle" s={15} cls="fill-accent-text">da-nang</T><T x={120} y={86} anchor="middle" s={8} cls="fill-ok">sạch · không dấu · thường</T></Show>
    </Stage>
  ),
  setVar: () => (
    <Stage><Win />
      <rect x={76} y={40} width="88" height="40" rx="8" className="fill-field stroke-accent" strokeWidth="1.6" />
      <T x={88} y={56} s={8} cls="fill-muted">đã_xử_lý</T>
      {['0', '1', '2'].map((v, i) => <Show key={v} from={i === 0 ? 0 : 0.33 * i} to={i === 2 ? 1 : 0.33 * (i + 1)}><T x={140} y={72} anchor="middle" s={20}>{v}</T></Show>)}
      <Chip x={86} y={92} w={68} label="{{vars.đã_xử_lý}}" />
    </Stage>
  ),
};
