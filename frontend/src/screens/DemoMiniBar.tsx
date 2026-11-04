// Màn #demo-minibar (bước 27b): các trạng thái thanh mini – tiêu đề theo việc đang làm (58 D4: đang thao tác / đang chờ /
// tạm dừng – lọc bằng ?mode=acting|waiting|paused), thử lại (25b), tên bộ giá trị input (21b).
import { MiniBarView } from './MiniBar';
import { RecordBarView } from '../components/minibar/RecordBar';
import { AskCard } from '../components/ask/AskCard';

const noop = () => {};
const STATES: { note: string; mode?: 'acting' | 'waiting' | 'paused'; props: Parameters<typeof MiniBarView>[0] }[] = [
  {
    note: 'Đang chờ ảnh – vòng theo thời gian chờ (bước 25)', mode: 'waiting',
    props: { title: 'Đang chờ ảnh · còn 6 s', lines: ['n3 · Chờ ảnh nút Nhắn tin', 'khớp nhất 71%', 'vòng 2 / 10   38 click   01:26'], icon: 'waitImage', progress: 0.42, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'Đang chờ chữ, đang thử lại (bước 25b) – 58 D4', mode: 'waiting',
    props: { title: 'Đang chờ chữ "Sent" · còn 7 s', lines: ['n6 · Chờ đã gửi', 'thử lại 1 / 2', 'vòng 1 / 1   4 click   00:38'], icon: 'waitImage', progress: 0.1, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'Rẽ nhánh: node trước + cổng đã đi, lượt node Đếm (bước 20 F6)',
    props: { title: 'Đang thao tác – đừng chạm chuột', lines: ['n2 · Tìm nút Nhắn tin · Thất bại → n4 · Đếm', 'lượt n4 3 / 10', 'vòng 1 / 1   12 click   00:41'], icon: 'counter', progress: 0.3, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'AI vừa chụp màn hình – chấm đỏ cạnh tiêu đề (bước 31c)',
    props: { title: 'Đang thao tác – đừng chạm chuột', lines: ['n3 · Click nút Gửi', 'vòng 1 / 1   3 click   00:12'], icon: 'click', progress: 0.5, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop, ai: { level: 'auto', onLevel: noop }, capturing: true },
  },
  {
    note: 'AI đang chạy – chip mức AI (bước 31b)', mode: 'acting',
    props: { title: 'Đang thao tác – đừng chạm chuột', lines: ['n3 · Click nút Gửi', 'vòng 1 / 1   3 click   00:12'], icon: 'click', progress: 0.5, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop, ai: { level: 'auto', onLevel: noop } },
  },
  {
    note: 'AI đang chạy – bấm chip: chọn mức (Tắt / Chỉ soạn dừng lượt AI ngay)',
    props: { title: 'Đang thao tác – đừng chạm chuột', lines: [], icon: 'click', progress: 0.5, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop, ai: { level: 'auto', onLevel: noop }, aiOpen: true },
  },
  {
    note: 'AI đang chạy, người dùng đụng chuột → tạm dừng, chuột đứng yên thì tự chạy tiếp (57 B4)', mode: 'paused',
    props: { title: 'Bạn vừa đụng chuột · tự chạy tiếp sau 4 s', lines: ['n3 · Click nút Gửi', 'vòng 1 / 1   3 click   00:12'], icon: 'click', progress: 0.5, paused: true, countdown: 0, canPause: true, onPause: noop, onStop: noop, ai: { level: 'auto', onLevel: noop } },
  },
  {
    note: 'Đang chạy', mode: 'acting',
    props: { title: 'Đang thao tác – đừng chạm chuột', lines: ['n5 · Gõ chữ', 'vòng 4 / 10   142 click   02:05'], icon: 'type', progress: 0.36, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'Tạm dừng', mode: 'paused',
    props: { title: 'Tạm dừng', lines: ['n5 · Gõ chữ', 'vòng 4 / 10   142 click   02:05'], icon: 'type', progress: 0.36, paused: true, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'Đếm ngược',
    props: { title: 'Bắt đầu sau 2 giây…', lines: ['vòng 0 / 10   0 click   00:00'], icon: 'click', progress: 0, paused: false, countdown: 2, canPause: false, onPause: noop, onStop: noop },
  },
];

export default function DemoMiniBar() {
  const mode = new URLSearchParams(location.search).get('mode');
  return (
    <div className="flex min-h-screen flex-col items-center gap-5 bg-bg p-8 text-ink">
      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">Màn mẫu #demo-minibar</span>
      {STATES.filter((s) => !mode || s.mode === mode).map((s) => (
        <div key={s.note} className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">{s.note}</span>
          <MiniBarView {...s.props} />
        </div>
      ))}
      {!mode && <><div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Đang ghi macro (bước 24) – bấm Dừng ghi hoặc F9</span>
        <RecordBarView elapsed="00:07" onStop={noop} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted">Node Hỏi người dùng – thanh nở ra, thẻ hỏi dưới thanh (56 D1)</span>
        <MiniBarView title="Đang chờ bạn trả lời · còn 4 phút" lines={['n2 · Hỏi người dùng', 'vòng 1 / 1   0 click   00:09']} icon="askUser" progress={0.1} paused={false} countdown={0} canPause onPause={noop} onStop={noop} />
        <AskCard message="Gửi 3 email nháp này?" items={['an@vidu.vn', 'binh@vidu.vn', 'chi@vidu.vn']} input onAnswer={noop} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Lần chạy từ AI / hẹn giờ đã xong – thanh mini giữ lại, nút Mở app (57 B2)</span>
        <MiniBarView title="Đã chạy xong" lines={['vòng 1 / 1   3 click   00:12']} icon="click" progress={1} paused={false} countdown={0} canPause={false} onPause={noop} onStop={noop} idle />
      </div></>}
    </div>
  );
}
