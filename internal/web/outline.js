// Chạy trong trang (outline.go, sau common.js): cây accessibility rút gọn cho AI (D4c / MCP 31) – phần tử tương tác,
// tiêu đề, ảnh có alt, vùng chính (nav / main / form / dialog…) đang hiện, cả trong iframe cùng nguồn, theo thứ tự
// trang. Mỗi dòng kèm selector đã kiểm: find.js tìm selector đó ra đúng phần tử này. Khung theo toạ độ client của
// trang chính (CSS px). max = số dòng tối đa.
(max, onlyDialog) => {
  const ACTIVE = new Set(['button', 'link', 'textbox', 'searchbox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton',
    'combobox', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'treeitem']);
  const BOXES = new Set(['navigation', 'main', 'form', 'search', 'dialog', 'alertdialog', 'tablist', 'menu', 'menubar',
    'listbox', 'tree', 'table', 'banner', 'contentinfo', 'complementary', 'region', 'alert']);
  const KEEP = r => ACTIVE.has(r) || BOXES.has(r) || r === 'heading' || r === 'img';
  const VALUED = new Set(['textbox', 'searchbox', 'spinbutton', 'combobox', 'slider']);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD']);
  const norm = s => clean(s).toLowerCase();
  const docs = allDocs();
  const parentOf = el => el.parentElement || el.ownerDocument.defaultView.frameElement;
  // selector css: phần tử hiện đầu tiên khớp (mọi document, như find.js) phải là el
  const cssHits = (css, el) => {
    try {
      return docs.flatMap(d => Array.from(d.querySelectorAll(css))).find(shown) === el;
    } catch (e) { return false; }
  };
  const before = {}; // role → tên (chuẩn hoá) các phần tử hiện cùng vai trò đứng trước
  // vùng (main / nav…) chỉ lấy tên ghi rõ – tên theo chữ bên trong là cả trang
  const nameOf = (el, role) => clean(BOXES.has(role) ? ariaLabel(el) || el.getAttribute('title') : accName(el));
  const selectorOf = (el, role, name) => {
    const prev = before[role] || (before[role] = []);
    try {
      if (usable(name) && !prev.some(p => p.includes(norm(name)))) return `role=${role}[name="${name}"]`;
      if (el.id && !autoLike(el.id) && cssHits('#' + CSS.escape(el.id), el)) return 'css=#' + CSS.escape(el.id);
      for (const a of ['data-testid', 'data-test', 'data-qa', 'name']) {
        const v = el.getAttribute(a), css = `${tag(el).toLowerCase()}[${a}="${v}"]`;
        if (v && usable(v) && cssHits(css, el)) return 'css=' + css;
      }
      if (!prev.length) return 'role=' + role;
      return 'css=' + cssPath(el);
    } finally { prev.push(norm(accName(el))); } // find.js so tên theo accName
  };
  const ariaBool = (el, a) => { const v = el.getAttribute(a); return v === 'true' || v === 'false' || v === 'mixed' ? v : ''; };
  const stateOf = (el, role) => {
    const s = {};
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') s.disabled = true;
    if (el.ownerDocument.activeElement === el && tag(el) !== 'BODY') s.focused = true;
    if (role === 'heading') s.level = +(el.getAttribute('aria-level') || tag(el).slice(1)) || 0;
    if (['checkbox', 'radio', 'switch', 'menuitemcheckbox', 'menuitemradio'].includes(role)) {
      s.checked = typeof el.checked === 'boolean' && !el.hasAttribute('aria-checked') ? String(el.checked) : ariaBool(el, 'aria-checked');
    }
    if (el.hasAttribute('aria-expanded')) s.expanded = ariaBool(el, 'aria-expanded');
    if (el.getAttribute('aria-selected') === 'true') s.selected = true;
    if (VALUED.has(role)) {
      if (el.type === 'password') s.secret = true;
      else s.value = clean(el.value != null ? String(el.value) : el.innerText).slice(0, 100);
    }
    return s;
  };
  // onlyDialog: chỉ phần tử trong hộp thoại đang mở trên cùng (cuối trang) – form antd nằm ở portal cuối body
  const dialogs = docs.flatMap(d => Array.from(d.querySelectorAll('[role=dialog], [role=alertdialog], dialog[open]'))).filter(shown);
  const top = onlyDialog && dialogs.length ? dialogs[dialogs.length - 1] : null;
  const items = [], depth = new Map(); // vùng (BOXES) đã giữ → độ sâu
  let total = 0;
  for (const doc of docs) {
    if (!doc.body) continue;
    for (const el of doc.body.querySelectorAll('*')) {
      if (SKIP.has(tag(el))) continue;
      const role = roleOf(el);
      if (!KEEP(role) || !shown(el)) continue;
      if (top && !top.contains(el)) continue;
      if (role === 'option' && el.closest('select')) { // không liệt kê, nhưng find.js vẫn đếm khi tìm role=option
        (before.option || (before.option = [])).push(norm(accName(el)));
        continue;
      }
      total++;
      const name = nameOf(el, role);
      const sel = selectorOf(el, role, name); // gọi cả khi đã đủ max – giữ danh sách tên đứng trước cho đúng
      if (items.length >= max) continue;
      let d = 0;
      for (let p = parentOf(el); p; p = parentOf(p)) if (depth.has(p)) { d = depth.get(p) + 1; break; }
      if (BOXES.has(role)) depth.set(el, d);
      const { box, inView: center } = place(el);
      // vùng lớn: tâm thường nằm ngoài khung nhìn – tính là trong khi có phần chồng lên khung nhìn
      const inView = BOXES.has(role) ? box.x < innerWidth && box.y < innerHeight && box.x + box.w > 0 && box.y + box.h > 0 : center;
      items.push(Object.assign({ role, name: name.slice(0, 80), sel, depth: d, inView, region: BOXES.has(role),
        x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) }, stateOf(el, role)));
    }
  }
  let crossFrames = 0;
  for (const doc of docs) for (const f of doc.querySelectorAll('iframe, frame')) {
    try { if (!f.contentDocument) crossFrames++; } catch (e) { crossFrames++; }
  }
  return { url: location.href, title: document.title, viewW: innerWidth, viewH: innerHeight, scrollX: Math.round(scrollX),
    scrollY: Math.round(scrollY), items, total, crossFrames, dialogs: dialogs.length };
}
