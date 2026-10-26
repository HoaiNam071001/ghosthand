// Màn #demo-minibar (bước 27b): các trạng thái thanh mini, gồm trạng thái chưa có logic –
// đang chờ ảnh (vòng theo thời gian chờ, bước 25), thử lại (25b), tên bộ giá trị input (21b).
import { MiniBarView } from './MiniBar';
import { RecordBarView } from '../components/minibar/RecordBar';

const noop = () => {};
const STATES: { note: string; props: Parameters<typeof MiniBarView>[0] }[] = [
  {
    note: 'Đang chờ ảnh – vòng theo thời gian chờ (bước 25)',
    props: { title: 'n3 · Chờ ảnh nút Nhắn tin', lines: ['đang tìm 4.2 / 10 s   thử lại 0 / 2', 'vòng 2 / 10   38 click   01:26'], icon: 'waitImage', progress: 0.42, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'Hết giờ, đang thử lại (bước 25b) + tên bộ giá trị input (bước 21b)',
    props: { title: 'n3 · Chờ ảnh nút Nhắn tin', lines: ['thử lại 1 / 2   đang tìm 1.0 / 10 s', 'Gửi cho Lan · vòng 2 / 10   01:38'], icon: 'waitImage', progress: 0.1, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'Rẽ nhánh: node trước + cổng đã đi, lượt node Đếm (bước 20 F6)',
    props: { title: 'n2 · Tìm nút Nhắn tin · Thất bại → n4 · Đếm', lines: ['lượt n4 3 / 10', 'vòng 1 / 1   12 click   00:41'], icon: 'counter', progress: 0.3, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'AI vừa chụp màn hình – chấm đỏ cạnh tiêu đề (bước 31c)',
    props: { title: 'n3 · Click nút Gửi', lines: ['vòng 1 / 1   3 click   00:12'], icon: 'click', progress: 0.5, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop, ai: { level: 'auto', onLevel: noop }, capturing: true },
  },
  {
    note: 'AI đang chạy – chip mức AI (bước 31b)',
    props: { title: 'n3 · Click nút Gửi', lines: ['vòng 1 / 1   3 click   00:12'], icon: 'click', progress: 0.5, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop, ai: { level: 'auto', onLevel: noop } },
  },
  {
    note: 'AI đang chạy – bấm chip: chọn mức (Tắt / Chỉ soạn dừng lượt AI ngay)',
    props: { title: 'n3 · Click nút Gửi', lines: [], icon: 'click', progress: 0.5, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop, ai: { level: 'auto', onLevel: noop }, aiOpen: true },
  },
  {
    note: 'AI đang chạy, người dùng đụng chuột → tự tạm dừng (bấm ▶ để chạy tiếp)',
    props: { title: 'Bạn vừa đụng chuột – đã tạm dừng · n3 · Click nút Gửi', lines: ['vòng 1 / 1   3 click   00:12'], icon: 'click', progress: 0.5, paused: true, countdown: 0, canPause: true, onPause: noop, onStop: noop, ai: { level: 'auto', onLevel: noop } },
  },
  {
    note: 'Đang chạy (đã có)',
    props: { title: 'n5 · Gõ chữ', lines: ['vòng 4 / 10   142 click   02:05'], icon: 'type', progress: 0.36, paused: false, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'Tạm dừng (đã có)',
    props: { title: 'Tạm dừng · n5 · Gõ chữ', lines: ['vòng 4 / 10   142 click   02:05'], icon: 'type', progress: 0.36, paused: true, countdown: 0, canPause: true, onPause: noop, onStop: noop },
  },
  {
    note: 'Đếm ngược (đã có)',
    props: { title: 'Bắt đầu sau 2 giây…', lines: ['vòng 0 / 10   0 click   00:00'], icon: 'click', progress: 0, paused: false, countdown: 2, canPause: false, onPause: noop, onStop: noop },
  },
];

export default function DemoMiniBar() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-5 bg-bg p-8 text-ink">
      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">Màn mẫu #demo-minibar</span>
      {STATES.map((s) => (
        <div key={s.note} className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">{s.note}</span>
          <MiniBarView {...s.props} />
        </div>
      ))}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Đang ghi macro (bước 24) – bấm Dừng ghi hoặc F9</span>
        <RecordBarView elapsed="00:07" onStop={noop} />
      </div>
    </div>
  );
}
