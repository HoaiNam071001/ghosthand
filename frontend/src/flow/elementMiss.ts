// Chi tiết lỗi "không thấy phần tử" (Go engine/detail.go elementMiss, bước 50 A2): phần đã đọc được từ cây accessibility.
export type ReadItem = { raw: string; role: string; name?: string; value?: string; depth: number; box: { x: number; y: number; w: number; h: number } };
export type NearItem = { role: string; name: string; score: number };
export type ElementMiss = { read: number; count: number; near: NearItem[]; dump: ReadItem[]; roles: { raw: string; count: number }[] };

// null nếu không phải lỗi phần tử (detail.kind khác).
export function elementMissOf(detail?: Record<string, unknown>): ElementMiss | null {
  if (detail?.kind !== 'element') return null;
  const list = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
  return {
    read: Number(detail.read) || 0, count: Number(detail.count) || 0,
    near: list<NearItem>(detail.near), dump: list<ReadItem>(detail.dump), roles: list<ElementMiss['roles'][number]>(detail.roles),
  };
}

// Gợi ý nguyên nhân theo số đã đọc – để người dùng biết nên kiểm tra gì.
export function missHint(m: ElementMiss): string {
  if (m.read === 0) return 'Không đọc được phần tử nào – app chưa có cửa sổ hiện, hoặc chưa cấp quyền Accessibility.';
  if (m.read >= 20000) return 'Cây quá lớn nên bị cắt ở 20000 phần tử (hoặc quá 2 giây) – phần tử cần tìm có thể nằm ngoài; thu hẹp bằng Vùng tìm hoặc selector theo khung cha.';
  if (m.dump.length === 0) return 'Chỉ đọc được khung cửa sổ, không có chữ nào – app (Chrome: nội dung trang) chưa mở cây accessibility cho app khác.';
  if (m.near.length === 0) return 'Đọc được phần tử nhưng không cái nào giống cách tìm – xem danh sách đã đọc bên dưới, chỉnh selector theo tên đúng.';
  return 'Có phần tử gần giống cách tìm – xem cột Giống để chỉnh selector.';
}

// Bản chép: một dòng mỗi phần tử, thụt theo độ sâu – dán vào ghi chú / gửi người khác.
export function missText(m: ElementMiss): string {
  const head = `Đã đọc ${m.read} phần tử; khớp ${m.count}.`;
  const roles = m.roles.map((r) => `${r.raw}×${r.count}`).join(' ');
  const lines = m.dump.map((d) => `${'  '.repeat(Math.min(d.depth, 8))}${d.raw} ${JSON.stringify(d.name ?? '')}${d.value ? ` = ${JSON.stringify(d.value)}` : ''}`);
  return [head, roles, ...lines].join('\n');
}
