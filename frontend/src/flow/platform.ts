// Loại node không chạy được ở hệ điều hành đang dùng (bước 50 D1). Dữ liệu từ Go (model/platform.go) – ở đây chỉ phần tính.
export type OnlyOS = Record<string, string[]>;

const OS_NAME: Record<string, string> = { darwin: 'macOS', windows: 'Windows' };

// Nhãn ngắn "Chỉ macOS" cho loại bị giới hạn (kể cả khi máy này chạy được – để biết kịch bản không mang sang máy kia được).
export function onlyLabel(only: OnlyOS, type?: string): string {
  const list = type ? only[type] : undefined;
  return list?.length ? `Chỉ ${list.map((g) => OS_NAME[g] ?? g).join(' / ')}` : '';
}

// Loại này không chạy được trên goos ("" = chạy được hoặc chưa biết hệ điều hành).
export const unsupportedHere = (only: OnlyOS, type: string | undefined, goos: string) =>
  !!goos && !!type && !!only[type] && !only[type].includes(goos);
