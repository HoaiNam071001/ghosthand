// Danh sách nhóm / loại node của bảng chọn node (Thêm node + Đổi loại node). Dữ liệu thuần: tên, từ khoá, mô tả, hành động thêm.
// type: loại node thuần để dùng cho Đổi loại node (biến thể như Click theo chữ không có type nên không hiện khi đổi loại).
import type { PaletteGroup } from '../PaletteView';
import { addControl, addPointStep, addStep } from '../../store';
import { WEB_BASIC_NOTE } from '../../flow/web';
import { NODE_INFO } from '../../flow/nodeInfo';
import { addElementStep, addImageStep, addTextStep } from '../../imageSteps';

// Nhóm theo flow/category (cùng màu thẻ node) – tên nhóm lấy từ CATEGORIES
export const GROUPS: PaletteGroup[] = [
  {
    cat: 'mouse', items: [
      { icon: 'click', label: 'Click', info: NODE_INFO.click, key: 'click', keywords: 'bam nhan chuot trai phai', type: 'click', run: () => addPointStep('click') },
      { icon: 'double', label: 'Double click', info: NODE_INFO.double, key: 'double', keywords: 'nhay dup hai lan', type: 'double', run: () => addPointStep('double') },
      { icon: 'hold', label: 'Giữ chuột', info: NODE_INFO.hold, key: 'hold', keywords: 'hold nhan giu', type: 'hold', run: () => addPointStep('hold') },
      { icon: 'drag', label: 'Kéo thả', info: NODE_INFO.drag, key: 'drag', keywords: 'drag keo tha a b', type: 'drag', run: () => addPointStep('drag') },
      { icon: 'path', label: 'Vẽ đường', info: NODE_INFO.path, key: 'path', keywords: 've duong net hinh tron chu nhat sao ky ten draw path shape', type: 'path', run: () => addStep('path') },
      { icon: 'scroll', label: 'Cuộn', info: NODE_INFO.scroll, key: 'scroll', keywords: 'scroll lan chuot', type: 'scroll', run: () => addStep('scroll') },
      { icon: 'clickImage', label: 'Click theo ảnh / chữ / phần tử', info: NODE_INFO.clickImage, key: 'clickImage', keywords: 'image anh mau tim nut text chu ocr doc phan tu accessibility chrome thuong app aria role bam element', type: 'clickImage', run: () => addImageStep('clickImage') },
    ],
  },
  {
    cat: 'kb', items: [
      { icon: 'type', label: 'Gõ chữ', info: NODE_INFO.type, key: 'type', keywords: 'type text nhap van ban', type: 'type', run: () => addStep('type') },
      { icon: 'key', label: 'Phím tắt', info: NODE_INFO.key, key: 'key', keywords: 'key hotkey enter ctrl to hop', type: 'key', run: () => addStep('key') },
    ],
  },
  {
    cat: 'wait', items: [
      { icon: 'wait', label: 'Chờ', info: NODE_INFO.wait, key: 'wait', keywords: 'wait delay nghi doi', type: 'wait', run: () => addStep('wait') },
      { icon: 'waitImage', label: 'Chờ ảnh', info: NODE_INFO.waitImage, key: 'waitImage', keywords: 'wait image anh mau xuat hien khoanh', type: 'waitImage', run: () => addImageStep('waitImage') },
      { icon: 'waitImage', label: 'Chờ chữ', info: NODE_INFO.waitText, key: 'waitText', keywords: 'wait text chu ocr doc xuat hien', run: () => addTextStep('waitImage') },
      { icon: 'waitImage', label: 'Chờ phần tử', info: NODE_INFO.waitElement, key: 'waitElement', keywords: 'phan tu accessibility chrome thuong app aria role xuat hien', run: () => addElementStep('waitImage') },
      { icon: 'findAll', label: 'Tìm tất cả', info: NODE_INFO.findAll, key: 'findAll', keywords: 'tim tat ca moi cho nhieu dem danh sach find all nut lap tung', type: 'findAll', run: () => addStep('findAll') },
      { icon: 'waitScreen', label: 'Chờ màn hình', info: NODE_INFO.waitScreen, key: 'waitScreen', keywords: 'cho man hinh dung yen thay doi tai xong load spinner loading on dinh doi', type: 'waitScreen', run: () => addStep('waitScreen') },
      { icon: 'waitUIEvent', label: 'Chờ sự kiện giao diện', info: NODE_INFO.waitUIEvent, key: 'waitUIEvent', keywords: 'cho su kien giao dien cua so moi hop thoai menu popup xuat hien doi focus gia tri doi observer', type: 'waitUIEvent', run: () => addStep('waitUIEvent') },
      { icon: 'waitDownload', label: 'Chờ tải xong', info: NODE_INFO.waitDownload, key: 'waitDownload', keywords: 'cho tai xong download tai ve file crdownload thu muc downloads xuat file bao cao pdf xlsx', type: 'waitDownload', run: () => addStep('waitDownload') },
      { icon: 'waitUntil', label: 'Chờ đến giờ', info: NODE_INFO.waitUntil, key: 'waitUntil', keywords: 'cho den gio hen gio dong ho time schedule san sale flash ntp', type: 'waitUntil', run: () => addStep('waitUntil') },
      { icon: 'waitPixel', label: 'Chờ màu pixel', info: NODE_INFO.waitPixel, key: 'waitPixel', keywords: 'pixel mau color diem', type: 'waitPixel', run: () => addImageStep('waitPixel') },
      { icon: 'screenshot', label: 'Chụp màn hình', info: NODE_INFO.screenshot, key: 'screenshot', keywords: 'screenshot chup anh man hinh luu png clipboard bang chung', type: 'screenshot', run: () => addStep('screenshot') },
    ],
  },
  {
    // bước 35: node nâng cao – hệ thống, tệp, API
    cat: 'data', items: [
      { icon: 'clipboard', label: 'Clipboard', info: NODE_INFO.clipboard, key: 'clipboard', keywords: 'clipboard copy paste dan chep bo nho tam doc ghi', type: 'clipboard', run: () => addStep('clipboard') },
      { icon: 'http', label: 'HTTP / API', info: NODE_INFO.http, key: 'http', keywords: 'http api rest get post put delete webhook json goi server request', type: 'http', run: () => addStep('http') },
      { icon: 'file', label: 'Tệp / thư mục', info: NODE_INFO.file, key: 'file', keywords: 'file tep thu muc folder ghi luu csv excel xlsx xoa thung rac don dep', type: 'file', run: () => addStep('file') },
      { icon: 'sysInfo', label: 'Thông tin máy', info: NODE_INFO.sysInfo, key: 'sysInfo', keywords: 'thong tin may pin cpu ram o dia mang wifi man hinh ten may battery', type: 'sysInfo', run: () => addStep('sysInfo') },
      { icon: 'power', label: 'Nguồn', info: NODE_INFO.power, key: 'power', keywords: 'nguon power tat may khoi dong lai ngu sleep khoa man lock dang xuat logout shutdown restart', type: 'power', run: () => addStep('power') },
      { icon: 'display', label: 'Màn hình / âm thanh', info: NODE_INFO.display, key: 'display', keywords: 'man hinh am thanh do sang brightness dark mode toi sang loa micro audio tai nghe phat tieng bao sound', type: 'display', run: () => addStep('display') },
      { icon: 'mcpTool', label: 'Gọi tool MCP', info: NODE_INFO.mcpTool, key: 'mcpTool', keywords: 'mcp tool goi cong cu server model context protocol github sheets filesystem tich hop plugin', type: 'mcpTool', run: () => addStep('mcpTool') },
      { icon: 'askAI', label: 'Hỏi AI', info: NODE_INFO.askAI, key: 'askAI', keywords: 'hoi ai tri tue nhan tao gpt claude openai anthropic ollama phan loai soan tra loi', type: 'askAI', run: () => addStep('askAI') },
      { icon: 'notify', label: 'Thông báo hệ thống', info: NODE_INFO.notify, key: 'notify', keywords: 'thong bao notification toast banner nhac bao xong chuong', type: 'notify', run: () => addStep('notify') },
      { icon: 'zip', label: 'Nén / giải nén', info: NODE_INFO.zip, key: 'zip', keywords: 'nen giai nen zip rar nen file thu muc archive extract compress gui tai len', type: 'zip', run: () => addStep('zip') },
      { icon: 'inputSource', label: 'Bộ gõ', info: NODE_INFO.inputSource, key: 'inputSource', keywords: 'bo go ban phim input source layout telex vni abc unikey evkey tieng viet ngon ngu doi', type: 'inputSource', run: () => addStep('inputSource') },
      { icon: 'process', label: 'Tiến trình', info: NODE_INFO.process, key: 'process', keywords: 'tien trinh process cpu ram bo nho chay nen render xong het ban task manager activity monitor', type: 'process', run: () => addStep('process') },
      { icon: 'osShortcut', label: 'Shortcuts (macOS)', info: NODE_INFO.osShortcut, key: 'osShortcut', keywords: 'shortcuts phim tat apple macos tu dong hoa chay shortcut', type: 'osShortcut', run: () => addStep('osShortcut') },
      { icon: 'shell', label: 'Chạy lệnh', info: NODE_INFO.shell, key: 'shell', keywords: 'chay lenh script shell terminal command cmd powershell applescript jxa bash zsh dong lenh', type: 'shell', run: () => addStep('shell') },
      { icon: 'system', label: 'Âm lượng', info: NODE_INFO.system, key: 'system', keywords: 'he thong am luong volume loa tat tieng mute sound', type: 'system', run: () => addStep('system') },
      { icon: 'calc', label: 'Tính toán', info: NODE_INFO.calc, key: 'calc', keywords: 'tinh toan bieu thuc cong tru nhan chia lam tron so sanh calc math round', run: () => addControl('calc') },
      { icon: 'textNumber', label: 'Số & ngày', info: NODE_INFO.textNumber, key: 'textNumber', keywords: 'lay so gia tien dinh dang so ngay gio thang nam number date format nghin', run: () => addControl('textNumber') },
      { icon: 'textMatch', label: 'Lọc mẫu', info: NODE_INFO.textMatch, key: 'textMatch', keywords: 'loc mau regex khop trich lay ma don email so dien thoai match', run: () => addControl('textMatch') },
      { icon: 'textSplit', label: 'Tách chữ', info: NODE_INFO.textSplit, key: 'textSplit', keywords: 'tach chu chia danh sach dau phay dong split', run: () => addControl('textSplit') },
      { icon: 'textClean', label: 'Làm sạch chữ', info: NODE_INFO.textClean, key: 'textClean', keywords: 'lam sach chu thay the bo dau hoa thuong khoang trang trim replace lower upper', run: () => addControl('textClean') },
      { icon: 'setVar', label: 'Đặt biến', info: NODE_INFO.setVar, key: 'setVar', keywords: 'set var bien gan', run: () => addControl('setVar') },
    ],
  },
  {
    cat: 'app', items: [
      { icon: 'open', label: 'Mở URL / app', info: NODE_INFO.open, key: 'open', keywords: 'url web link trinh duyet ung dung open youtube', type: 'open', run: () => addStep('open') },
      { icon: 'window', label: 'Cửa sổ', info: NODE_INFO.window, key: 'window', keywords: 'window cua so ung dung focus dua len truoc dat vi tri co kich thuoc thu nho phong to dong cho mo', type: 'window', run: () => addStep('window') },
      { icon: 'app', label: 'Ứng dụng', info: NODE_INFO.app, key: 'app', keywords: 'app ung dung chuong trinh dang chay kiem tra cho mo thoat tat buoc thoat kill quit process tien trinh', type: 'app', run: () => addStep('app') },
      { icon: 'browserTab', label: 'Tab trình duyệt', info: NODE_INFO.browserTab, key: 'browserTab', keywords: 'tab trinh duyet chrome edge brave coc coc dong tab mo tab moi chuyen tab tai lai quay lai url tieu de browser', type: 'browserTab', run: () => addStep('browserTab') },
      { icon: 'browserGo', label: 'Đi tới URL', info: NODE_INFO.browserGo, key: 'browserGo', keywords: 'di toi url doi trang dia chi trong tab hien tai chrome trinh duyet go navigate tai trang', type: 'browserGo', run: () => addStep('browserGo') },
      { icon: 'browserNorm', label: 'Chuẩn hoá trình duyệt', info: NODE_INFO.browserNorm, key: 'browserNorm', keywords: 'chuan hoa trinh duyet zoom 100 toan man hinh fullscreen dat co cua so popup dich trang chrome toa do lech', type: 'browserNorm', run: () => addStep('browserNorm') },
      { icon: 'savePdf', label: 'Lưu trang ra PDF', info: NODE_INFO.savePdf, key: 'savePdf', keywords: 'luu pdf in trang print save as pdf xuat file bao cao hoa don chrome trinh duyet', type: 'savePdf', run: () => addStep('savePdf') },
      { icon: 'elementAction', label: 'Thao tác phần tử', info: NODE_INFO.elementAction, key: 'elementAction', keywords: 'thao tac phan tu bam tick dien gia tri chon khong chuot accessibility ax nhap form checkbox an', type: 'elementAction', run: () => addStep('elementAction') },
      { icon: 'readTable', label: 'Đọc bảng', info: NODE_INFO.readTable, key: 'readTable', keywords: 'doc bang table grid dong cot excel csv xlsx du lieu don hang bang gia accessibility chrome thuong app lay bang', type: 'readTable', run: () => addStep('readTable') },
      { icon: 'readDocument', label: 'Đọc tài liệu', info: NODE_INFO.readDocument, key: 'readDocument', keywords: 'doc tai lieu noi dung van ban ghi chu word textedit notepad o soan thao nguyen van phan dang chon boi den accessibility', type: 'readDocument', run: () => addStep('readDocument') },
      { icon: 'pageText', label: 'Đọc chữ trang', info: NODE_INFO.pageText, key: 'pageText', keywords: 'doc chu trang toan bo noi dung van ban danh sach bang gia accessibility chrome thuong app lay het chu text', type: 'pageText', run: () => addStep('pageText') },
      { icon: 'elementRead', label: 'Đọc phần tử', info: NODE_INFO.elementRead, key: 'elementRead', keywords: 'doc phan tu accessibility chrome thuong app gia tri o nhap gia tien lay du lieu', type: 'elementRead', run: () => addStep('elementRead') },
    ],
  },
  {
    cat: 'flow', items: [
      { icon: 'if', label: 'Nếu', info: NODE_INFO.if, key: 'if', keywords: 'if dieu kien re nhanh else thay chu anh mau so sanh', run: () => addControl('if') },
      { icon: 'switchScreen', label: 'Switch theo màn hình', info: NODE_INFO.switchScreen, key: 'switchScreen', keywords: 'switch case man hinh thay', run: () => addControl('switchScreen') },
      { icon: 'switch', label: 'Switch theo giá trị', info: NODE_INFO.switch, key: 'switch', keywords: 'switch case gia tri bien', run: () => addControl('switch') },
      { icon: 'forEach', label: 'Lặp qua danh sách', info: NODE_INFO.forEach, key: 'forEach', keywords: 'foreach lap qua danh sach moi phan tu dong csv excel xlsx mang json loop list', run: () => addControl('forEach') },
      { icon: 'counter', label: 'Đếm', info: NODE_INFO.counter, key: 'counter', keywords: 'counter lap loop dem gioi han so lan thu', run: () => addControl('counter') },
      { icon: 'end', label: 'Kết thúc', info: NODE_INFO.end, key: 'end', keywords: 'end stop dung ket thuc', run: () => addControl('end') },
    ],
  },
  {
    // bước 25d: tìm phần tử bằng HTML qua Chrome của app, bấm bằng chuột thật – để cuối, chỉ cho trang cơ bản
    cat: 'web', note: WEB_BASIC_NOTE, items: [
      { icon: 'open', label: 'Mở trang (Chrome của app)', info: NODE_INFO.openWeb, key: 'openWeb', keywords: 'web url trinh duyet chrome dieu khien dom html', run: () => addStep('open', { webBrowser: true }) },
      { icon: 'webWait', label: 'Chờ phần tử web', info: NODE_INFO.webWait, key: 'webWait', keywords: 'web dom html selector css xpath aria role cho xuat hien mat', type: 'webWait', run: () => addStep('webWait') },
      { icon: 'webClick', label: 'Click phần tử web', info: NODE_INFO.webClick, key: 'webClick', keywords: 'web dom html selector css xpath aria role nut bam click', type: 'webClick', run: () => addStep('webClick') },
      { icon: 'webType', label: 'Gõ vào ô web', info: NODE_INFO.webType, key: 'webType', keywords: 'web dom html o nhap input go chu dien form dang nhap', type: 'webType', run: () => addStep('webType') },
      { icon: 'webRead', label: 'Đọc phần tử web', info: NODE_INFO.webRead, key: 'webRead', keywords: 'web dom html doc chu gia tri thuoc tinh href bien lay du lieu', type: 'webRead', run: () => addStep('webRead') },
      { icon: 'webKey', label: 'Phím trên trang web', info: NODE_INFO.webKey, key: 'webKey', keywords: 'web dom phim key enter tab esc chrome nen', type: 'webKey', run: () => addStep('webKey') },
      { icon: 'webScroll', label: 'Cuộn trang web', info: NODE_INFO.webScroll, key: 'webScroll', keywords: 'web dom html cuon lan scroll feed toi khi thay', type: 'webScroll', run: () => addStep('webScroll') },
    ],
  },
];

