// Test chạy với tiếng Việt (jsdom mặc định en-US sẽ chọn English) – chuỗi trong test.ts viết theo bản Việt.
import { applyLang } from './i18n/lang';

applyLang('vi');
