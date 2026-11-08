// Output của từng loại node (tách từ view.ts – view.ts re-export, nơi khác vẫn lấy qua view.ts).
import type { Step } from '../types';
import { browserTabOutputs } from './browserTab';
import { textOutputs } from './textNodes';

// Output node trả về khi thành công – khớp Outputs trong steptypes.go. Node sau đọc bằng {{ref.output.key}}.
export type OutputField = { key: string; desc: string };
const FOUND: OutputField[] = [
  { key: 'x', desc: 'tâm chỗ thấy – X' }, { key: 'y', desc: 'tâm chỗ thấy – Y' }, { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' },
  { key: 'score', desc: '% khớp' }, { key: 'text', desc: 'chữ tìm thấy (tìm theo chữ / phần tử)' },
  { key: 'role', desc: 'vai trò phần tử (tìm theo phần tử)' },
];
const WEB_FOUND: OutputField[] = [
  { key: 'x', desc: 'tâm phần tử – X' }, { key: 'y', desc: 'tâm phần tử – Y' }, { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' },
  { key: 'text', desc: 'chữ của phần tử' }, { key: 'selector', desc: 'cách tìm đã khớp' },
];
// Sau click / gõ / phím web: engine chờ trang yên rồi báo (webeffect.go).
const WEB_EFFECT: OutputField[] = [
  { key: 'navigated', desc: 'đã sang trang / đổi URL (true / false)' }, { key: 'url', desc: 'URL tab sau thao tác' },
  { key: 'popup', desc: 'URL tab mới mở (trống = không)' },
];
// Output mọi node có (CommonOutputs trong steptypes.go, engine điền ở execNode).
const COMMON: OutputField[] = [{ key: 'startedAt', desc: 'giờ bắt đầu' }, { key: 'durationMs', desc: 'thời gian chạy (ms)' }];
export const outputsOf = (s: Step): OutputField[] => [...ownOutputs(s), ...COMMON];
const MOUSE_AT: OutputField[] = [{ key: 'x', desc: 'X chuột dừng' }, { key: 'y', desc: 'Y chuột dừng' }];
// Cửa sổ đang ở trước sau thao tác (Windows) – kiểm tra có bấm / gõ vào đúng app không.
const FOCUS: OutputField[] = [{ key: 'window', desc: 'cửa sổ đang ở trước (tiêu đề)' }, { key: 'windowApp', desc: 'app của cửa sổ đang ở trước' }];
function ownOutputs(s: Step): OutputField[] {
  switch (s.type) {
    case 'click': case 'double': case 'drag': return [...MOUSE_AT, ...FOCUS];
    case 'hold': return [...MOUSE_AT, { key: 'ms', desc: 'thời gian đã giữ (ms)' }];
    case 'wait': return [{ key: 'ms', desc: 'thời gian đã chờ (ms, gồm ngẫu nhiên)' }];
    case 'key': return [{ key: 'keys', desc: 'tổ hợp đã bấm, vd cmd+l' }, ...FOCUS];
    case 'scroll': return [...MOUSE_AT, { key: 'direction', desc: 'hướng đã cuộn' }, { key: 'amount', desc: 'số nấc đã cuộn' }];
    case 'type': return [{ key: 'text', desc: 'chữ đã gõ (sau khi thay biến)' }, ...FOCUS];
    case 'open': return [{ key: 'target', desc: 'URL / app đã mở' }, { key: 'app', desc: 'mở bằng app (trống = mặc định)' },
      { key: 'window', desc: 'cửa sổ mới hiện (không có → cửa sổ đang ở trước)' }, { key: 'windowApp', desc: 'app của cửa sổ đó' },
      { key: 'newWindow', desc: 'có cửa sổ mới hiện trong lúc chờ (true / false)' }];
    case 'waitImage': return FOUND;
    case 'clickImage': return [{ key: 'clickX', desc: 'X đã click' }, { key: 'clickY', desc: 'Y đã click' }, ...(s.imageSource === 'search' ? FOUND : [])];
    case 'waitPixel': return [{ key: 'color', desc: 'màu đọc được' }];
    case 'waitScreen': return [{ key: 'ms', desc: 'thời gian đã chờ (ms)' }, { key: 'diff', desc: '% điểm ảnh đổi ở lần so cuối' }];
    case 'ocrRead': return [{ key: 'text', desc: 'mọi chữ đọc được, mỗi dòng một dòng' }, { key: 'lines', desc: 'mảng các dòng (nối vào Lặp qua danh sách)' }, { key: 'count', desc: 'số dòng' }];
    case 'findAll': return [{ key: 'count', desc: 'số chỗ thấy' }, { key: 'items', desc: 'danh sách chỗ thấy [{x, y, w, h, score, text}] – nối vào Lặp qua danh sách' }];
    case 'path': return [{ key: 'x', desc: 'X chỗ nhả chuột' }, { key: 'y', desc: 'Y chỗ nhả chuột' }, { key: 'points', desc: 'số đỉnh đã đi qua' }];
    case 'waitUntil': return [{ key: 'firedAt', desc: 'giờ chạy tiếp (có ms)' }, { key: 'target', desc: 'giờ hẹn' }, { key: 'lateMs', desc: 'trễ so với giờ hẹn (ms)' }, { key: 'ntpOffsetMs', desc: 'giờ chuẩn − giờ máy (ms)' }];
    case 'window': return s.winOp === 'waitClose' ? [] : [{ key: 'title', desc: 'tiêu đề cửa sổ' }, { key: 'app', desc: 'tên app' },
      { key: 'left', desc: 'X góc trên trái' }, { key: 'top', desc: 'Y góc trên trái' }, { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' },
      { key: 'x', desc: 'X tâm cửa sổ' }, { key: 'y', desc: 'Y tâm cửa sổ' }, { key: 'display', desc: 'màn thứ mấy (từ 1)' },
      { key: 'minimized', desc: 'đang thu nhỏ (true / false)' }, { key: 'pid', desc: 'mã tiến trình' }];
    case 'app': return [{ key: 'running', desc: 'đang chạy (true / false)' }, { key: 'pid', desc: 'mã tiến trình' }, { key: 'name', desc: 'tên app' },
      { key: 'id', desc: 'đường dẫn exe / bundle id' }, { key: 'windows', desc: 'số cửa sổ đang mở' }];
    case 'browserTab': case 'browserGo': case 'browserNorm': case 'savePdf': return browserTabOutputs(s);
    case 'sysInfo': return [
      { key: 'batteryPercent', desc: 'pin còn (%, máy bàn = 100)' }, { key: 'hasBattery', desc: 'máy có pin không' }, { key: 'charging', desc: 'đang cắm sạc' },
      { key: 'cpuPercent', desc: 'CPU đang dùng (%)' }, { key: 'memUsedPercent', desc: 'RAM đang dùng (%)' }, { key: 'memFreeMB', desc: 'RAM còn trống (MB)' }, { key: 'memTotalMB', desc: 'RAM tổng (MB)' },
      { key: 'diskFreeGB', desc: 'ổ đĩa còn trống (GB)' }, { key: 'diskTotalGB', desc: 'ổ đĩa tổng (GB)' },
      { key: 'displays', desc: 'số màn hình' }, { key: 'screenWidth', desc: 'rộng màn chính' }, { key: 'screenHeight', desc: 'cao màn chính' }, { key: 'scale', desc: 'tỷ lệ scale màn chính' },
      { key: 'online', desc: 'có mạng' }, { key: 'ip', desc: 'IP của máy' }, { key: 'wifi', desc: 'tên Wi-Fi ("" nếu không có)' },
      { key: 'hostname', desc: 'tên máy' }, { key: 'user', desc: 'tên người dùng' }, { key: 'os', desc: 'darwin | windows' },
    ];
    case 'power': return [{ key: 'action', desc: 'hành động đã làm' }, { key: 'countdownSec', desc: 'số giây đã đếm ngược' }];
    case 'display': return [
      { key: 'theme', desc: 'light | dark (đọc / đổi chế độ)' }, { key: 'dark', desc: 'đang ở chế độ tối' }, { key: 'changed', desc: 'node đã đổi chế độ' },
      { key: 'brightness', desc: 'độ sáng % (-1 nếu không đọc được)' }, { key: 'previous', desc: 'độ sáng / thiết bị trước khi đổi' },
      { key: 'outputName', desc: 'loa mặc định' }, { key: 'inputName', desc: 'micro mặc định' }, { key: 'name', desc: 'thiết bị vừa chọn' }, { key: 'id', desc: 'mã thiết bị vừa chọn' },
      { key: 'items', desc: 'mỗi dòng “loa|micro: tên” máy có' }, { key: 'sound', desc: 'âm đã phát' }, { key: 'waited', desc: 'đã chờ phát xong' },
    ];
    case 'askAI': return [{ key: 'text', desc: 'câu trả lời của AI' }, { key: 'json', desc: 'JSON đã giải mã (khi chọn trả lời JSON) – đọc sâu {{n2.output.json.<trường>}}' }, { key: 'skipped', desc: 'true khi AI không dùng được và node lấy giá trị dự phòng' }];
    case 'mcpTool': return [{ key: 'text', desc: 'phần chữ tool trả về' }, { key: 'json', desc: 'JSON tool trả (structuredContent, hoặc chữ nếu là JSON) – đọc sâu {{n2.output.json.<trường>}}' }, { key: 'isError', desc: 'tool báo lỗi (node đi cổng thất bại)' }, { key: 'content', desc: 'từng phần kết quả; ảnh / âm thanh có path file tạm' }];
    case 'notify': return [{ key: 'title', desc: 'tiêu đề đã hiện' }, { key: 'text', desc: 'nội dung đã hiện' }];
    case 'askUser': return [{ key: 'answer', desc: 'approve / deny / timeout' }, { key: 'text', desc: 'chữ bạn gõ ở ô nhập' }, { key: 'waitedMs', desc: 'thời gian chờ trả lời (ms)' }];
    case 'zip': return [
      { key: 'path', desc: 'file .zip vừa tạo / thư mục đã giải nén vào' }, { key: 'count', desc: 'số file' }, { key: 'size', desc: 'tổng dung lượng dữ liệu gốc (byte)' },
    ];
    case 'inputSource': return [
      { key: 'id', desc: 'mã bộ gõ đang dùng' }, { key: 'name', desc: 'tên bộ gõ đang dùng' }, { key: 'lang', desc: 'ngôn ngữ (en, vi…)' },
      { key: 'vietnamese', desc: 'bộ gõ hệ điều hành là tiếng Việt' }, { key: 'previousId', desc: 'mã bộ gõ trước node' }, { key: 'changed', desc: 'node đã đổi bộ gõ' },
      { key: 'imeApp', desc: 'Unikey / EVKey… đang chạy (trống nếu không)' }, { key: 'items', desc: 'tên các bộ gõ máy có' }, { key: 'hotkey', desc: 'phím tắt đã bấm (toggleIME)' }, { key: 'toggled', desc: 'đã bấm phím tắt đổi chế độ gõ' },
    ];
    case 'process': return [
      { key: 'running', desc: 'có tiến trình khớp (true / false)' }, { key: 'count', desc: 'số tiến trình khớp' },
      { key: 'pid', desc: 'mã tiến trình dùng CPU nhiều nhất' }, { key: 'name', desc: 'tên tiến trình đó' },
      { key: 'cpuPercent', desc: 'tổng CPU (%, 100 = đầy một lõi)' }, { key: 'memMB', desc: 'tổng RAM (MB)' },
      { key: 'items', desc: 'mỗi dòng “tên · pid · CPU · RAM”, nặng → nhẹ' },
    ];
    case 'osShortcut': return [{ key: 'text', desc: 'chữ Shortcut trả về (rỗng nếu không xuất gì)' }];
    case 'shell': return [{ key: 'stdout', desc: 'chữ lệnh in ra (bỏ xuống dòng cuối)' }, { key: 'stderr', desc: 'chữ lỗi lệnh in ra' }, { key: 'exitCode', desc: 'mã thoát (0 = thành công)' }];
    case 'system': return [{ key: 'volume', desc: 'âm lượng sau khi chạy (%)' }, { key: 'muted', desc: 'đang tắt tiếng (true / false)' }];
    case 'file': return s.fileOp === 'trash' ? [{ key: 'count', desc: 'số file đã xoá' }, { key: 'files', desc: 'tên các file đã xoá' }]
      : s.fileOp === 'emptyTrash' ? [] : s.fileOp === 'row' ? [{ key: 'path', desc: 'đường dẫn file' }, { key: 'rows', desc: 'số dòng sau khi thêm' }]
      : s.fileOp === 'mkdir' ? [{ key: 'path', desc: 'đường dẫn thư mục' }] : [{ key: 'path', desc: 'đường dẫn file' }, { key: 'bytes', desc: 'số byte đã ghi' }];
    case 'http': return [{ key: 'status', desc: 'mã HTTP, vd 200' }, { key: 'json', desc: 'JSON trả về – đọc sâu json.data.id' }, { key: 'body', desc: 'phản hồi dạng chữ' }, { key: 'headers', desc: 'header trả về (tên chữ thường)' }];
    case 'clipboard': return s.clipOp === 'image' ? [{ key: 'path', desc: 'file ảnh đã chép' }] : [{ key: 'text', desc: s.clipOp === 'write' ? 'chữ đã ghi' : 'chữ đọc được' }];
    case 'screenshot': return [{ key: 'path', desc: 'đường dẫn file ảnh' }, { key: 'x', desc: 'vùng đã chụp – X trái' }, { key: 'y', desc: 'vùng đã chụp – Y trên' },
      { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' }];
    case 'webWait': return s.webGone ? [] : WEB_FOUND;
    case 'webClick': return [{ key: 'clickX', desc: 'X đã click' }, { key: 'clickY', desc: 'Y đã click' }, ...WEB_FOUND, ...WEB_EFFECT];
    case 'webType': return [{ key: 'text', desc: 'chữ đã gõ (sau khi thay biến)' }, { key: 'clickX', desc: 'X đã click' }, { key: 'clickY', desc: 'Y đã click' },
      ...WEB_FOUND.filter((f) => f.key !== 'text'), ...WEB_EFFECT];
    case 'waitUIEvent': return [{ key: 'event', desc: 'sự kiện đã bắt được' }, { key: 'title', desc: 'tiêu đề cửa sổ (sự kiện cửa sổ)' }, { key: 'app', desc: 'app của cửa sổ' },
      { key: 'role', desc: 'vai trò phần tử (sự kiện phần tử)' }, { key: 'text', desc: 'chữ / tên phần tử' }, { key: 'value', desc: 'giá trị phần tử' },
      { key: 'x', desc: 'tâm X' }, { key: 'y', desc: 'tâm Y' }, { key: 'w', desc: 'rộng' }, { key: 'h', desc: 'cao' }];
    case 'elementAction': return [{ key: 'action', desc: 'thao tác đã làm' }, { key: 'role', desc: 'vai trò phần tử (button, checkbox…)' }, { key: 'text', desc: 'chữ / tên phần tử sau thao tác' }, { key: 'value', desc: 'giá trị sau thao tác (ô nhập, checkbox 0 / 1)' }];
    case 'waitDownload': return [{ key: 'path', desc: 'đường dẫn đầy đủ của file tải về' }, { key: 'name', desc: 'tên file' }, { key: 'size', desc: 'cỡ file (byte)' }];
    case 'readTable': return [{ key: 'rows', desc: 'mảng các dòng, mỗi dòng mảng ô (gồm dòng tên cột)' }, { key: 'items', desc: 'mỗi dòng dữ liệu một đối tượng {tên cột không dấu: giá trị} – nối vào Lặp qua danh sách' }, { key: 'columns', desc: 'tên các cột' }, { key: 'count', desc: 'số dòng dữ liệu' }, { key: 'path', desc: 'file đã ghi (khi có Ghi ra file)' }];
    case 'readDocument': return [{ key: 'text', desc: 'nội dung nguyên văn, giữ xuống dòng' }, { key: 'length', desc: 'số ký tự' }, { key: 'lines', desc: 'số dòng' }];
    case 'pageText': return [{ key: 'text', desc: 'toàn bộ chữ, mỗi khối một dòng' }, { key: 'lines', desc: 'mảng các dòng (nối vào Lặp qua danh sách)' }, { key: 'count', desc: 'số dòng' }];
    case 'elementRead': return [{ key: 'text', desc: s.readPattern || s.readNumber ? 'giá trị sau khi lọc' : 'chữ / giá trị đọc được' },
      ...(s.readPattern || s.readNumber ? [{ key: 'raw', desc: 'chữ đọc được trước khi lọc' }] : []),
      ...(s.readChange ? [{ key: 'old', desc: 'giá trị trước khi đổi' }] : []),
      { key: 'count', desc: s.findBy === 'text' ? 'số chỗ thấy nhãn' : 'số phần tử khớp' }, ...(s.findBy === 'text' ? [] : [{ key: 'role', desc: 'vai trò phần tử' }]),
      ...FOUND.slice(0, 4)];
    case 'webRead': return [{ key: 'text', desc: 'giá trị đọc được' }, { key: 'count', desc: 'số phần tử khớp' }, { key: 'selector', desc: 'cách tìm đã khớp' }];
    case 'webKey': return [{ key: 'keys', desc: 'tổ hợp đã bấm, vd shift+tab' }, { key: 'tab', desc: 'URL tab đã bấm' }, ...WEB_EFFECT];
    case 'webScroll': return [...WEB_FOUND, ...(s.scrollMode === 'until' ? [{ key: 'scrolls', desc: 'số lần đã lăn' }] : [])];
    case 'if': return [{ key: 'result', desc: 'true / false' }, ...FOUND.map((f) => ({ ...f, desc: `${f.desc} (điều kiện ảnh / chữ đúng)` }))];
    case 'switch': return [{ key: 'case', desc: 'case khớp (default nếu không)' }, { key: 'value', desc: 'giá trị đã xét' }];
    case 'switchScreen': return [{ key: 'case', desc: 'case hiện trước (none nếu không)' }, ...FOUND];
    case 'counter': return [{ key: 'count', desc: 'số lần đã đi qua' }];
    case 'forEach': return [{ key: 'item', desc: s.listFrom === 'file' ? 'dòng đang xét – item.<cột>' : 'phần tử đang xét (object: item.<khoá>)' },
      { key: 'index', desc: 'thứ tự phần tử (từ 1)' }, { key: 'count', desc: 'số phần tử' }];
    case 'setVar': return [{ key: 'name', desc: 'tên biến' }, { key: 'value', desc: 'giá trị sau khi đặt' }];
    case 'calc': return [{ key: 'value', desc: 'kết quả – số hoặc true / false' }];
    default: return textOutputs(s);
  }
}
