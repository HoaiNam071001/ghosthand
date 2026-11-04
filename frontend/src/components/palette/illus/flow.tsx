// Hoạt hoạ nhóm luồng: Nếu, Switch, lặp, đếm, kết thúc (bước 47), hỏi người dùng (56 D1).
import { Arr, Chip, Move, Scenes, Show, Stage, T, Tick, Tween } from './parts';

const node = (x: number, y: number, label: string, w = 46) => (
  <g><rect x={x - w / 2} y={y - 11} width={w} height="22" rx="6" className="fill-surface stroke-line-strong" /><T x={x} y={y + 3} anchor="middle" s={8}>{label}</T></g>
);
const dot = (pts: [number, number, number][]) => <Move pts={pts}><circle r="5" className="fill-accent" /></Move>;

export const flow: Scenes = {
  if: () => (
    <Stage>
      {node(30, 68, 'Thấy nút?', 52)}
      <Arr x1={58} y1={62} x2={140} y2={38} /><Arr x1={58} y1={74} x2={140} y2={98} />
      <T x={100} y={42} s={8} cls="fill-ok">Đúng</T><T x={100} y={104} s={8} cls="fill-danger-text">Sai</T>
      {node(170, 36, 'Bấm nút')}{node(170, 100, 'Báo lỗi')}
      {dot([[0.1, 30, 68], [0.45, 100, 53], [0.7, 168, 38]])}
      <Tick x={204} y={36} from={0.7} />
    </Stage>
  ),
  switch: () => (
    <Stage>
      {node(34, 68, 'trạng_thái', 56)}
      {[[0, 'Mới'], [1, 'Đang giao'], [2, 'Huỷ']].map(([i, l]) => <g key={String(l)}><Arr x1={64} y1={68} x2={140} y2={30 + Number(i) * 38} />{node(176, 30 + Number(i) * 38, String(l), 62)}</g>)}
      {dot([[0.1, 34, 68], [0.5, 100, 68], [0.7, 150, 68]])}
      <Show from={0.7}><rect x={145} y={57} width="62" height="22" rx="6" className="fill-accent-soft stroke-accent" strokeWidth="1.6" /></Show>
    </Stage>
  ),
  switchScreen: () => (
    <Stage>
      <rect x={14} y={38} width="60" height="46" rx="5" className="fill-surface stroke-line-strong" /><rect x={20} y={46} width="48" height="6" rx="3" className="fill-line-strong" /><T x={44} y={72} anchor="middle" s={8}>Đăng nhập</T>
      {[0, 1, 2].map((i) => <Arr key={i} x1={78} y1={61} x2={130} y2={28 + i * 33} />)}
      {node(168, 28, 'Màn đăng nhập', 70)}{node(168, 61, 'Có captcha', 70)}{node(168, 94, 'Trang chính', 70)}
      <Show from={0.4}><rect x={133} y={17} width="70" height="22" rx="6" className="fill-accent-soft stroke-accent" strokeWidth="1.6" /></Show>
    </Stage>
  ),
  forEach: () => (
    <Stage>
      {['An', 'Bình', 'Chi'].map((n, i) => <g key={n}><rect x={20} y={26 + i * 26} width="90" height="20" rx="5" className="fill-field stroke-line-strong" /><T x={30} y={40 + i * 26}>{n}</T></g>)}
      <rect x={16} y={22} width="98" height="28" rx="6" className="fill-accent-soft stroke-accent" strokeWidth="1.6"><Tween attr="y" pts={[[0, 22], [0.1, 22], [0.3, 22], [0.4, 48], [0.6, 48], [0.7, 74], [0.9, 74]]} /></rect>
      <Arr x1={118} y1={62} x2={140} y2={62} />
      {node(180, 62, 'Làm việc', 60)}
      <path d="M180 76q0 22 -40 22q-80 0 -80 -28" fill="none" className="stroke-muted" strokeWidth="1.6" strokeDasharray="3 3" />
      <Show from={0.9}><Chip x={150} y={106} w={72} label="hết danh sách" cls="fill-surface stroke-ok" /></Show>
    </Stage>
  ),
  counter: () => (
    <Stage>
      <circle cx="90" cy="64" r="30" className="fill-field stroke-line-strong" strokeWidth="2" />
      {['1', '2', '3'].map((v, i) => <Show key={v} from={0.05 + i * 0.28} to={0.05 + (i + 1) * 0.28}><T x={90} y={74} anchor="middle" s={30}>{v}</T></Show>)}
      <T x={90} y={110} anchor="middle" s={8} cls="fill-muted">đã đi qua</T>
      <Show to={0.85}><Chip x={150} y={40} w={64} label="Còn lượt" cls="fill-surface stroke-ok" /><Arr x1={124} y1={64} x2={148} y2={47} cls="stroke-ok" /></Show>
      <Show from={0.85}><Chip x={150} y={80} w={64} label="Hết lượt" cls="fill-surface stroke-danger" /><Arr x1={124} y1={64} x2={148} y2={87} cls="stroke-danger" /></Show>
    </Stage>
  ),
  askUser: () => (
    <Stage>
      <rect x={14} y={26} width="120" height="76" rx="8" className="fill-surface stroke-line-strong" />
      <T x={24} y={44} s={9} cls="fill-ink">Gửi 3 email?</T>
      <rect x={24} y={52} width="100" height="14" rx="3" className="fill-soft" />
      <rect x={30} y={80} width="44" height="16" rx="4" className="fill-surface stroke-line-strong" /><T x={52} y={91} anchor="middle" s={7}>Từ chối</T>
      <rect x={80} y={80} width="46" height="16" rx="4" className="fill-accent" /><T x={103} y={91} anchor="middle" s={7} cls="fill-on-accent">Đồng ý</T>
      <Move pts={[[0, 200, 120], [0.35, 104, 90], [0.5, 104, 90]]}><path d="M0 0l0 13 4-4 3 6 2-1-3-6 5 0z" className="fill-ink stroke-surface" /></Move>
      <Show from={0.5}><Arr x1={138} y1={64} x2={168} y2={64} cls="stroke-ok" />{node(198, 64, 'Gửi', 44)}</Show>
      <Tick x={222} y={52} from={0.6} />
    </Stage>
  ),
  end: () => (
    <Stage>
      {node(50, 68, 'Bước cuối', 60)}<Arr x1={82} y1={68} x2={118} y2={68} />
      <circle cx="150" cy="68" r="26" className="fill-surface stroke-line-strong" strokeWidth="2" />
      <Show from={0.4}><circle cx="150" cy="68" r="26" className="fill-ok" /><path d="M138 68l9 9 17-18" fill="none" className="stroke-on-accent" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></Show>
      <Show from={0.4}><T x={150} y={112} anchor="middle" s={9} cls="fill-ok">Đã đặt hàng</T></Show>
    </Stage>
  ),
};
