// Hoạt hoạ nhóm bàn phím + chờ / chụp (bước 47).
import { Arr, Btn, Chip, Clock, Cur, Gem, KeyCap, Ln, Lines, Move, Ring, Scenes, Show, Spinner, Stage, T, Tick, Tween, Typed, Win } from './parts';

const page = <><Win /><Lines x={28} y={26} ws={[90, 60]} /></>;
const scan = (from = 0.1, to = 0.5) => (
  <rect x={28} y={26} width="3" height="86" rx="1.5" className="fill-accent" opacity=".7"><Tween attr="x" pts={[[0, 28], [from, 28], [to, 205]]} /></rect>
);

export const wait: Scenes = {
  type: () => (
    <Stage><Win />
      <T x={28} y={36} cls="fill-muted" s={8}>Tìm kiếm</T>
      <rect x={28} y={42} width="184" height="22" rx="5" className="fill-field stroke-accent" strokeWidth="1.5" />
      <Typed x={36} y={57} w={120} text="xin chào Ghosthand" from={0.15} to={0.7} />
      <rect x={36} y={47} width="1.5" height="12" className="fill-accent"><animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" /></rect>
      <Lines x={28} y={78} ws={[150, 110]} />
    </Stage>
  ),
  key: () => (
    <Stage><Win />
      <KeyCap x={56} y={44} w={44} label="Ctrl" from={0.15} to={0.75} /><T x={112} y={59} anchor="middle" cls="fill-muted">+</T>
      <KeyCap x={124} y={44} w={30} label="C" from={0.3} to={0.75} />
      <Show from={0.55}><Chip x={86} y={86} w={68} label="đã chép ✓" cls="fill-surface stroke-ok" /></Show>
    </Stage>
  ),
  wait: () => (
    <Stage><Win />
      <Clock x={120} y={62} r={26} />
      <rect x={70} y={102} width="100" height="6" rx="3" className="fill-field" />
      <rect x={70} y={102} width="0" height="6" rx="3" className="fill-accent"><Tween attr="width" pts={[[0, 0], [0.1, 0], [0.9, 100]]} /></rect>
      <Show from={0.9}><T x={120} y={120} anchor="middle" cls="fill-ok" s={8}>đi tiếp →</T></Show>
    </Stage>
  ),
  waitImage: () => (
    <Stage>{page}{scan(0.1, 0.55)}
      <Show from={0.45}><Gem x={150} y={72} s={1.4} /></Show>
      <Ring x={132} y={54} w={36} h={36} from={0.5} /><Tick x={176} y={52} from={0.55} />
    </Stage>
  ),
  waitText: () => (
    <Stage>{page}{scan(0.1, 0.55)}
      <Show from={0.45}><T x={120} y={78} anchor="middle" s={12}>Thành công</T></Show>
      <Ring x={72} y={60} w={96} h={24} from={0.5} /><Tick x={176} y={56} from={0.55} />
    </Stage>
  ),
  waitElement: () => (
    <Stage>{page}
      <rect x={34} y={56} width="60" height="44" rx="4" className="fill-none stroke-line-strong" strokeDasharray="3 3" />
      <rect x={104} y={56} width="100" height="44" rx="4" className="fill-none stroke-line-strong" strokeDasharray="3 3" />
      <Show from={0.45}><Btn x={118} y={66} w={70} h={24} label="Thanh toán" /></Show>
      <Ring x={114} y={62} w={78} h={32} from={0.5} /><Tick x={196} y={58} from={0.55} />
    </Stage>
  ),
  waitPixel: () => (
    <Stage>{page}
      <rect x={96} y={42} width="48" height="48" rx="6" className="fill-line-strong" />
      <Show from={0.5}><rect x={96} y={42} width="48" height="48" rx="6" className="fill-ok" /></Show>
      <path d="M120 58v-8M120 74v8M104 66h-8M136 66h8" className="stroke-ink" strokeWidth="1.6" strokeLinecap="round" />
      <Show from={0.5}><Chip x={92} y={98} w={56} label="#22C55E" cls="fill-surface stroke-ok" /></Show>
    </Stage>
  ),
  waitScreen: () => (
    <Stage><Win />
      <Show from={0} to={0.55}><Spinner x={120} y={68} r={14} /><T x={120} y={104} anchor="middle" cls="fill-muted" s={8}>đang tải… (hình còn đổi)</T></Show>
      <Show from={0.55}><Lines x={34} y={34} ws={[120, 150, 90, 130]} /><rect x={34} y={74} width="60" height="32" rx="4" className="fill-field" /><Tick x={196} y={34} from={0} /><T x={150} y={104} anchor="middle" cls="fill-ok" s={8}>đứng yên → đi tiếp</T></Show>
    </Stage>
  ),
  ocrRead: () => (
    <Stage><Win />
      <T x={70} y={58} cls="fill-ink" s={10}>Đơn #4821</T><T x={70} y={80} cls="fill-ok" s={12}>THÀNH CÔNG</T>
      <rect x={60} y={42} width="140" height="48" rx="4" className="fill-none stroke-accent" strokeDasharray="4 3" />
      {scan(0.1, 0.5)}
      <Show from={0.55}><Chip x={80} y={98} w={110} label="text = THÀNH CÔNG" /></Show>
    </Stage>
  ),
  waitUIEvent: () => (
    <Stage><Win />
      <Btn x={30} y={36} w={64} h={22} label="Mở" />
      <Show from={0} to={0.55}><T x={150} y={90} anchor="middle" cls="fill-muted" s={8}>đang chờ giao diện đổi…</T></Show>
      <Show from={0.55}><rect x={104} y={58} width="104" height="52" rx="6" className="fill-surface stroke-accent" /><T x={156} y={88} anchor="middle" cls="fill-ink" s={9}>Hộp thoại</T><Tick x={214} y={58} from={0.55} /></Show>
    </Stage>
  ),
  waitDownload: () => (
    <Stage><Win />
      <Btn x={30} y={36} w={64} h={22} label="Tải về" />
      <Show from={0} to={0.6}><rect x={110} y={72} width="100" height="24" rx="5" className="fill-field stroke-line-strong" /><rect x={114} y={80} width={Math.round(92 * 0.6)} height="8" rx="3" className="fill-accent-soft" /><T x={160} y={69} anchor="middle" cls="fill-muted" s={8}>bao-cao.pdf.crdownload</T></Show>
      <Show from={0.6}><rect x={110} y={72} width="100" height="24" rx="5" className="fill-field stroke-ok" /><T x={160} y={88} anchor="middle" cls="fill-ink" s={9}>bao-cao.pdf</T><Tick x={216} y={72} from={0.6} /></Show>
    </Stage>
  ),
  waitUntil: () => (
    <Stage><Win />
      <Clock x={86} y={68} r={30} />
      <T x={170} y={62} anchor="middle" s={15} cls="fill-ink">20:00:00</T>
      <Show from={0.75}><Btn x={140} y={74} w={60} h={22} label="Chạy!" hot /></Show>
      <Show from={0} to={0.75}><T x={170} y={90} anchor="middle" cls="fill-muted" s={8}>còn chờ…</T></Show>
    </Stage>
  ),
  findAll: () => (
    <Stage>{page}
      {[[56, 48], [112, 76], [168, 52], [150, 98]].map(([x, y], i) => (
        <g key={i}><Gem x={x} y={y} s={1.1} /><Ring x={x - 13} y={y - 13} w={26} h={26} from={0.15 + i * 0.15} />
          <Show from={0.15 + i * 0.15}><circle cx={x + 13} cy={y - 13} r="6" className="fill-accent" /><T x={x + 13} y={y - 10} anchor="middle" cls="fill-on-accent" s={8}>{i + 1}</T></Show></g>
      ))}
      <Show from={0.8}><Chip x={16} y={112} w={60} label="4 chỗ khớp" cls="fill-surface stroke-ok" /></Show>
    </Stage>
  ),
  screenshot: () => (
    <Stage>{page}
      <Lines x={28} y={46} ws={[140, 100, 120]} />
      <path d="M40 40h14M40 40v14M200 40h-14M200 40v14M40 108h14M40 108v-14M200 108h-14M200 108v-14" fill="none" className="stroke-accent" strokeWidth="2.4" strokeLinecap="round" />
      <Show from={0.4} to={0.48}><rect x="0" y="0" width="240" height="135" rx="8" className="fill-surface" /></Show>
      <Move pts={[[0, 120, 70], [0.5, 120, 70], [0.85, 192, 100]]}>
        <rect x={-30} y={-20} width="60" height="40" rx="4" className="fill-surface stroke-ink" opacity="0"><Tween attr="opacity" pts={[[0, 0], [0.49, 0], [0.5, 1]]} /></rect>
      </Move>
      <Show from={0.85}><Chip x={176} y={112} w={44} label="PNG ✓" cls="fill-surface stroke-ok" /></Show>
      <Cur pts={[[0, 40, 118], [0.3, 40, 40], [0.4, 200, 108]]} />
    </Stage>
  ),
};
