// Dòng đầu canvas flow (design v3): "Flow · N node" bên trái, nút (vùng, + Thêm node…) bên phải – nằm đè trên canvas,
// nền trong suốt; chỉ nút nhận chuột để kéo / chọn trên canvas không bị chặn. Dùng chung app (FlowEditor) và #demo-flow.
// Canvas hẹp (panel node mở) thì nút chỉ còn icon – chữ ẩn theo container query, không xuống dòng / tràn dưới panel.
import { ReactNode } from 'react';

export default function FlowHeader({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="@container pointer-events-none absolute inset-x-4 top-3 z-10 flex items-center gap-2.5">
      {/* nền mờ: node cuộn tới dưới dòng đầu thì chữ vẫn đọc được */}
      <span className="flex flex-none items-center gap-2.5 rounded-md bg-canvas/85 px-1.5 py-0.5">
        <h1 className="font-semibold">Flow</h1>
        <span className={`text-[12.5px] whitespace-nowrap text-muted ${headerLabel}`}>{count} node</span>
      </span>
      <span className="pointer-events-auto ml-auto flex items-center gap-1.5">{children}</span>
    </div>
  );
}

// Chữ trên nút ẩn khi dòng đầu hẹp (< 42rem; phím tắt < 48rem) – nút vẫn có title / aria-label
export const headerLabel = '@max-2xl:hidden';
export const headerKey = '@max-3xl:hidden';
// Nút trên dòng đầu canvas
export const headerBtn = 'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-control border border-line bg-surface px-2.5 text-[12.5px] hover:bg-hover';
