// Trường riêng của các node nâng cao (bước 35) – Step kế thừa (types.ts), khớp struct Step trong internal/model/model.go
// (tsc kiểm qua stepMatchesGo). Tách khỏi types.ts cho file không phình theo số loại node.
import type { ShotArea } from './flow/shot';
import type { WaitMode } from './flow/waitScreen';
import type { ClipOp } from './flow/clipboard';
import type { BodyType, HttpMethod } from './flow/http';
import type { FileOp } from './flow/file';
import type { SysOp } from './flow/system';
import type { IfPassed } from './flow/waitUntil';
import type { Shape } from './flow/shape';
import type { WinMatch, WinOp, WinPreset } from './flow/window';
import type { AppOp } from './flow/app';
import type { ProcOp } from './flow/process';
import type { InputOp } from './flow/inputSource';
import type { ZipOp } from './flow/zip';
import type { PowerOp } from './flow/power';
import type { DisplayOp } from './flow/display';
import type { BrowserName, TabOp } from './flow/browserTab';
import type { CaseMode, NumOp, NumStyle } from './flow/textNodes';
import type { KV, Rect } from './types';

export interface AdvancedFields {
  // chụp màn hình (bước 35 N1, internal/engine/shot.go)
  shotArea?: ShotArea; // bỏ trống = vùng của kịch bản
  display?: number; // shotArea screen: 0 = màn chứa vùng kịch bản, n = màn thứ n
  shotRect?: Rect; // shotArea rect: toạ độ màn hình
  saveDir?: string; // trống = thư mục ảnh trong Cài đặt (Pictures/Ghosthand); nhận {{biến}}
  fileName?: string; // trống = ghosthand-<ngày>-<giờ>; nhận {{biến}}
  toClipboard?: boolean;
  // chờ màn hình (bước 42 G1, internal/engine/waitscreen.go) – vùng theo shotArea / display / shotRect / imageFrom
  waitMode?: WaitMode; // bỏ trống = đứng yên | change = thay đổi so với lúc bắt đầu
  stableMs?: number; // đứng yên: đứng yên liên tục bao lâu (ms)
  diffPct?: number; // ngưỡng % điểm ảnh đổi: đứng yên = ≤ ngưỡng, thay đổi = > ngưỡng
  // clipboard (bước 35 N2, internal/engine/clip.go)
  clipOp?: ClipOp; // bỏ trống = đọc chữ
  filePath?: string; // clipOp image: file PNG; nhận {{biến}}
  // HTTP (bước 35 N3, internal/engine/http.go) – mọi ô chữ nhận {{biến}}
  method?: HttpMethod; // bỏ trống = GET
  url?: string; // biến chèn nguyên văn – giá trị cần mã hoá đặt trong query; browserTab new: URL tab mới; browserGo: URL cần tới
  query?: KV[];
  headers?: KV[];
  bodyType?: BodyType; // bỏ trống = không body
  body?: string; // json / text
  form?: KV[]; // bodyType form
  // tệp / thư mục (bước 35 N4, internal/engine/file.go) – filePath + text dùng chung
  fileOp?: FileOp; // bỏ trống = ghi chữ
  fileAppend?: boolean; // ghi chữ: thêm vào cuối
  cells?: string[]; // row: ô của dòng mới; nhận {{biến}}
  sheet?: string; // row xlsx: tên sheet, trống = sheet đầu
  filePattern?: string; // trash: mẫu tên file, vd *.png
  // hệ thống (bước 35 N5, internal/engine/system.go)
  sysOp?: SysOp;
  volume?: number; // volume: mức 0–100; volumeUp / volumeDown: mỗi lần (0 = 10)
  // chờ đến giờ (bước 35 N6, internal/engine/waituntil.go)
  at?: string; // HH:mm[:ss[.mmm]] (kèm ngày nếu cần); nhận {{biến}}
  ifPassed?: IfPassed;
  useNtp?: boolean;
  // vẽ đường (bước 35 N7, internal/engine/draw.go) – points, button, dragMs dùng chung
  shape?: Shape; // bỏ trống = qua các điểm
  shapeW?: number;
  shapeH?: number; // 0 = bằng shapeW
  closed?: boolean; // qua các điểm: nối điểm cuối về đầu
  // cửa sổ (bước 26, internal/engine/window.go) – timeoutMs: chờ cửa sổ khớp; display: màn của winPreset (0 = màn chứa cửa sổ)
  winOp?: WinOp; // bỏ trống = focus
  winApp?: string; // tên app / tên exe / bundle id; nhận {{biến}}
  winTitle?: string; // tiêu đề; nhận {{biến}}
  confirm?: boolean; // người dùng đánh dấu node ghi / xoá: phải được đồng ý trước lần chạy đầu (flow/danger.ts, op marked)
  onlyInWindow?: boolean; // click / double / hold / drag / scroll / path / type / key: chỉ thao tác khi cửa sổ winApp + winTitle đang ở trước, không thì lỗi window_mismatch (flow/windowGuard.ts)
  winMatch?: WinMatch; // bỏ trống = chứa (không phân biệt hoa thường, dấu)
  winPreset?: WinPreset; // setBounds: bỏ trống = đúng winRect
  winRect?: Rect; // setBounds: khung đích (preset trái / giữa / phải: chỉ lấy w, h)
  // ứng dụng (bước 26, internal/engine/app.go) – timeoutMs: chờ app chạy / thoát
  appOp?: AppOp; // bỏ trống = kiểm tra đang chạy (cổng yes / no)
  appName?: string; // tên app / tên exe / bundle id; nhận {{biến}}
  appMatch?: WinMatch; // như winMatch
  appForce?: boolean; // thoát: quá giờ chưa thoát thì buộc thoát
  // nguồn (bước 43 S3, internal/engine/power.go)
  powerOp?: PowerOp;
  countdownSec?: number; // đếm ngược trước khi làm (giây; 0 = 30 s với hành động cần đồng ý) – bấm Dừng để huỷ
  // màn hình / âm thanh (bước 43 S7, internal/engine/display.go)
  displayOp?: DisplayOp; // bỏ trống = đọc
  displayValue?: string; // theme: light | dark | toggle · brightness: 0–100 · audioOut / audioIn: tên thiết bị · sound: file hoặc tên âm; nhận {{biến}}
  soundWait?: boolean; // sound: chờ phát xong
  // thông báo hệ thống (bước 43 S9, internal/engine/toast.go) – nội dung = text
  notifyTitle?: string; // tiêu đề (trống = Ghosthand); nhận {{biến}}
  // nén / giải nén (bước 43 S8, internal/engine/zip.go) – nguồn = filePath, lọc tên file khi nén thư mục = filePattern
  zipOp?: ZipOp; // bỏ trống = nén
  zipTo?: string; // đích: nén = file .zip, giải nén = thư mục; nhận {{biến}}
  // bộ gõ (bước 43 S6, internal/engine/inputsource.go)
  inputOp?: InputOp; // bỏ trống = đọc
  inputHotkey?: string; // toggleIME: phím tắt của phần mềm gõ (trống = ctrl+shift)
  inputLayout?: string; // set: bộ gõ cần đổi sang – id hoặc tên; nhận {{biến}}
  // tiến trình (bước 43 S5, internal/engine/process.go) – timeoutMs / stableMs: chờ
  procOp?: ProcOp; // bỏ trống = đọc
  procName?: string; // tên tiến trình; nhận {{biến}}
  procMatch?: WinMatch; // như winMatch
  cpuBelow?: number; // waitIdle: tổng CPU phải dưới ngưỡng này (%, 100 = đầy một lõi; 0 = 5)
  // tab trình duyệt (bước 43 B1, internal/engine/browsertab.go; browserGo dùng chung cách chọn tab) – tab: tiêu đề / URL tab cần làm; url: tab mới; timeoutMs: chờ tab
  tabOp?: TabOp; // bỏ trống = đọc tab
  browser?: BrowserName; // bỏ trống = trình duyệt đang ở trước
  tabMatch?: WinMatch; // như winMatch – so tab với tiêu đề và URL
  tabFrom?: string; // id node Mở: làm với tab node đó vừa mở (bỏ qua tab)
  // chuẩn hoá trình duyệt (bước 43 B3, internal/engine/browsernorm.go) – cỡ cửa sổ dùng winPreset / winRect / display
  normZoom?: boolean; // zoom về 100 %
  normFullscreen?: boolean; // thoát toàn màn hình
  normSize?: boolean; // đặt vị trí + cỡ cửa sổ
  normPopups?: boolean; // đóng popup bằng Esc
}

// Node xử lý chữ (bước 42 G4b, internal/textop) – chữ vào ở value
export interface TextFields {
  pattern?: string; // textMatch: regex RE2 (nhóm () đầu nếu có); nhận {{biến}}
  matchAll?: boolean; // textMatch: mọi chỗ khớp vào items
  separator?: string; // textSplit: '' = mỗi dòng; \n \t = xuống dòng / tab
  replaceFrom?: string; // textClean: chuỗi cần thay; nhận {{biến}}
  replaceTo?: string; // textClean: thay bằng; nhận {{biến}}
  replaceRegex?: boolean; // textClean: replaceFrom là regex ($1 = nhóm 1)
  stripAccents?: boolean; // textClean: bỏ dấu tiếng Việt
  caseMode?: CaseMode; // textClean: '' = giữ
  trim?: boolean; // textClean: gọn khoảng trắng, bỏ dòng trống
  numOp?: NumOp; // textNumber: '' = lấy số
  decimals?: number; // textNumber format: số chữ số thập phân
  numStyle?: NumStyle; // textNumber format: '' = 1.234.567,5
  dateLayout?: string; // textNumber date: '' = dd/MM/yyyy
}
