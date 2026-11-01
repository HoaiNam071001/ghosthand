// Chạy trong trang (CDP Runtime.evaluate, find.go, sau common.js): tìm phần tử theo danh sách selector
// {by, value, exact, name}, cái đầu thấy phần tử hiện thì dùng – cả trong iframe cùng nguồn. scroll = phần tử ngoài
// viewport thì cuộn vào giữa; read = đọc chữ / value / thuộc tính attr của phần tử (webRead); viewport = trả chính
// khung nhìn của trang (lăn chuột giữa trang – webScroll). Trả khung theo toạ độ client của trang chính (CSS px), phần tử che tâm (elementFromPoint
// từng tầng frame) và hình học cửa sổ để Go biết khi nào phải đo lại toạ độ. Phần tử thấy được ghi vào
// window.__acTarget để probe.js kiểm khi thử hover. scope "dialog" = chỉ trong hộp thoại đang mở trên cùng; nth = chỗ thứ
// mấy trong số phần tử đang hiện (0 = chỗ bấm được đầu tiên). wheel (cùng scroll) = không nhảy bằng scrollIntoView mà
// trả out.wheel – khung cần lăn chuột thật (Go lăn rồi tìm lại); không tìm được khung lăn thì vẫn nhảy.
(sels, { scroll, read, attr, viewport, scope, nth, wheel }) => {
  const norm = s => clean(s).toLowerCase();
  const matches = (got, value, exact) => {
    const a = norm(got), b = norm(value);
    return a !== '' && (exact ? a === b : a.includes(b));
  };
  // Chữ nằm trực tiếp trong phần tử (bỏ chữ của thẻ con): nhãn “<span>*</span> Ngày sinh” khớp cả chuỗi “Ngày sinh”.
  const directText = el => Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.data).join(" ");
  const ownMatches = (el, sel) => matches(ownText(el), sel.value, sel.exact) || (sel.exact && matches(directText(el), sel.value, true));
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD']);
  const all = doc => Array.from(doc.body ? doc.body.querySelectorAll('*') : []).filter(el => !SKIP.has(tag(el)));
  // Phần tử sâu nhất chứa chữ: bỏ phần tử có con cũng khớp (chữ trong <button><span>Gửi</span></button> → span).
  const deepest = list => { const set = new Set(list); return list.filter(el => !Array.from(el.children).some(c => set.has(c))); };
  const inDocOrder = list => Array.from(new Set(list)).sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  // Nhanh: text node chứa chữ → phần tử cha (+ ô nhập theo value / placeholder). Chữ bị tách qua nhiều thẻ
  // ("Xem <b>lịch</b> sử") thì mới quét mọi phần tử (chậm trên trang lớn).
  const byText = (sel, doc) => {
    const hits = [];
    const w = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const p = n.parentElement;
      if (p && !SKIP.has(tag(p)) && matches(n.data, sel.value, false) && ownMatches(p, sel)) hits.push(p);
    }
    for (const el of doc.querySelectorAll('input, textarea')) if (matches(ownText(el), sel.value, sel.exact)) hits.push(el);
    if (hits.length) return inDocOrder(hits);
    return deepest(all(doc).filter(el => matches(el.textContent, sel.value, false) && ownMatches(el, sel)));
  };
  const byAria = (sel, doc) => all(doc).filter(el => (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) && matches(ariaLabel(el), sel.value, sel.exact));
  const byRole = (sel, doc) => {
    const explicit = all(doc).filter(el => el.hasAttribute('role') && el.getAttribute('role').trim().split(/\s+/)[0].toLowerCase() === sel.value);
    const implicit = IMPLICIT[sel.value] ? Array.from(doc.querySelectorAll(IMPLICIT[sel.value])).filter(el => !el.hasAttribute('role')) : [];
    const list = inDocOrder([...explicit, ...implicit]);
    return sel.name ? list.filter(el => matches(accName(el), sel.name, false)) : list;
  };
  // label=: ô nhập của nhãn – label for / aria-labelledby, không có thì ô đầu tiên sau nhãn trong khối gần nhất (≤ 4 tầng,
  // nhãn antd không gắn for). Nhãn tìm như text=.
  const FIELD = 'input:not([type=hidden]), textarea, select, [contenteditable=""], [contenteditable=true], [role=textbox], [role=combobox], [role=spinbutton]';
  const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  const fieldOf = lab => {
    const own = lab.closest('label');
    if (own && own.control) return own.control;
    const id = lab.id || (own && own.id);
    const by = id && lab.ownerDocument.querySelector('[aria-labelledby~="' + CSS.escape(id) + '"]');
    if (by) return by;
    let box = own || lab;
    for (let up = 0; up < 4 && box.parentElement; up++) {
      box = box.parentElement;
      const f = Array.from(box.querySelectorAll(FIELD)).find(x => after(lab, x) && !(own || lab).contains(x));
      if (f) return f;
    }
    return null;
  };
  const byLabel = (sel, doc) => Array.from(new Set(byText(sel, doc).map(fieldOf).filter(Boolean)));
  const byXPath = (v, doc) => {
    const r = doc.evaluate(v, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    return Array.from({ length: r.snapshotLength }, (_, i) => r.snapshotItem(i)).filter(n => n.nodeType === Node.ELEMENT_NODE);
  };
  const findIn = (sel, doc) => {
    switch (sel.by) {
      case 'text': return byText(sel, doc);
      case 'aria': return byAria(sel, doc);
      case 'role': return byRole(sel, doc);
      case 'label': return byLabel(sel, doc);
      case 'css': return Array.from(doc.querySelectorAll(sel.value));
      case 'xpath': return byXPath(sel.value, doc);
    }
    throw new Error('cách tìm không hợp lệ: ' + sel.by);
  };
  const docs = allDocs();
  // Phần tử che tâm: xét từ trang chính xuống, mỗi tầng điểm đó phải rơi vào frame chứa đích (tầng cuối: chính đích).
  const coverOf = (el, cx, cy) => {
    const chain = [el];
    for (let f = el.ownerDocument.defaultView.frameElement; f; f = f.ownerDocument.defaultView.frameElement) chain.unshift(f);
    for (const want of chain) {
      const doc = want.ownerDocument, off = frameOffset(doc.defaultView);
      const top = doc.elementFromPoint(cx - off.x, cy - off.y);
      if (top && top !== want && !want.contains(top) && !top.contains(want)) return describe(top);
    }
    return '';
  };
  const geom = { screenX, screenY, outerW: outerWidth, outerH: outerHeight, innerW: innerWidth, innerH: innerHeight, dpr: devicePixelRatio };
  // đang tải (tab mới mở, chưa có body): không thấy chưa có nghĩa là đã mất
  const loading = document.readyState === 'loading' || location.href === 'about:blank' || !document.body;
  // counts[i] – số phần tử hiện / ẩn khớp selector i (chỉ các selector đã xét – không thấy thì là tất cả; báo lỗi cho AI)
  const out = { sel: -1, hidden: 0, counts: [], geom, loading, focus: document.hasFocus(), visible: document.visibilityState === 'visible' };
  window.__acTarget = null;
  // chỗ chuột bấm xuống thật (webType: ô nhận focus có phải chỗ vừa bấm không, kể cả khi bấm lệch khỏi đích)
  window.__acDown = null;
  for (const d of docs) if (!d.__acDownHook) { d.__acDownHook = true; d.addEventListener("mousedown", e => { window.__acDown = e.target; }, true); }
  if (viewport) return Object.assign(out, { sel: 0, x: 0, y: 0, w: innerWidth, h: innerHeight, text: '', inView: true, count: 1 });
  // Hộp thoại trên cùng: cái đang hiện mà tâm của nó không bị phần khác che, không có thì cái sau cùng trong trang.
  let dialog = null;
  if (scope === 'dialog') {
    const ds = docs.flatMap(d => Array.from(d.querySelectorAll('[role=dialog], [role=alertdialog], [aria-modal=true], dialog[open]'))).filter(shown);
    dialog = ds.slice().reverse().find(d => { const p = place(d); return p.inView && !coverOf(d, p.cx, p.cy); }) || ds[ds.length - 1] || null;
    if (!dialog) return Object.assign(out, { noDialog: true });
  }
  const inScope = el => {
    if (!dialog) return true;
    for (let x = el; x; x = x.ownerDocument.defaultView.frameElement) if (dialog.contains(x)) return true;
    return false;
  };
  // Khung cần lăn để tâm el (p – place) vào vùng nhìn: khung cuộn trong cùng mà tâm còn ngoài vùng của nó và phần thấy
  // được trên màn đủ đặt chuột; hết khung cuộn trong một document thì là khung nhìn của document đó (trang / iframe).
  // Trả vùng đặt chuột (toạ độ trang chính), hướng, quãng px từ tâm el tới giữa khung.
  const wheelOf = (el, p) => {
    const need = (c, sx, sy) => {
      const mx = c.x + c.w / 2, my = c.y + c.h / 2;
      if (sy && (p.cy < c.y || p.cy >= c.y + c.h)) return { dir: p.cy > my ? 'down' : 'up', px: Math.abs(p.cy - my) };
      if (sx && (p.cx < c.x || p.cx >= c.x + c.w)) return { dir: p.cx > mx ? 'right' : 'left', px: Math.abs(p.cx - mx) };
      return null;
    };
    for (let a = el; a;) {
      const doc = a.ownerDocument, win = doc.defaultView;
      let c, sx = true, sy = true;
      a = a.parentElement;
      if (a && a !== doc.body && a !== doc.documentElement) {
        const cs = win.getComputedStyle(a);
        sx = /auto|scroll|overlay/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1;
        sy = /auto|scroll|overlay/.test(cs.overflowY) && a.scrollHeight > a.clientHeight + 1;
        if (!sx && !sy) continue;
        const r = a.getBoundingClientRect(), off = frameOffset(win);
        c = { x: r.left + a.clientLeft + off.x, y: r.top + a.clientTop + off.y, w: a.clientWidth, h: a.clientHeight };
      } else if (a === doc.body) {
        continue;
      } else { // hết cây: khung nhìn của document, rồi đi tiếp từ iframe chứa nó
        const f = win.frameElement;
        if (f) {
          const fc = frameContent(f), o = frameOffset(f.ownerDocument.defaultView);
          c = { x: fc.x + o.x, y: fc.y + o.y, w: fc.w, h: fc.h };
        } else c = { x: 0, y: 0, w: innerWidth, h: innerHeight };
        a = f;
      }
      const d = need(c, sx, sy);
      const x = Math.max(c.x, 0), y = Math.max(c.y, 0), w = Math.min(c.x + c.w, innerWidth) - x, h = Math.min(c.y + c.h, innerHeight) - y;
      if (d && w >= 20 && h >= 20) return Object.assign(d, { x, y, w, h });
    }
    return null;
  };
  // Nhiều phần tử cùng tên (ô lọc của lưới sau hộp thoại + ô trong hộp thoại): sắp bấm thì lấy cái đầu tiên đang trong
  // vùng nhìn mà không bị che; không có thì như cũ (cái đầu) để báo đúng phần tử che.
  const pickClear = list => {
    if (!scroll || list.length < 2) return list[0];
    for (const c of list.slice(0, 20)) {
      const p = place(c);
      if (p.inView && !coverOf(c, p.cx, p.cy)) return c;
    }
    return list[0];
  };
  // href / src: URL đầy đủ (thuộc tính có thể là đường dẫn tương đối)
  const readOf = el => {
    if (read === 'value') return el.value == null ? '' : String(el.value);
    if (read === 'attr') {
      const v = el.getAttribute(attr);
      return v != null && (attr === 'href' || attr === 'src') && typeof el[attr] === 'string' ? el[attr] : v ?? '';
    }
    return clean(el.innerText ?? el.textContent);
  };
  for (let i = 0; i < sels.length; i++) {
    const found = docs.flatMap(doc => findIn(sels[i], doc)).filter(inScope);
    const visible = found.filter(shown), el = nth > 0 ? visible[nth - 1] : pickClear(visible);
    out.counts.push({ shown: visible.length, hidden: found.length - visible.length });
    if (!el) { out.hidden = Math.max(out.hidden, found.length); continue; }
    let p = place(el);
    if (scroll && !p.inView) {
      if (wheel) out.wheel = wheelOf(el, p);
      if (!out.wheel) {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        p = place(el);
      }
    }
    window.__acTarget = el;
    Object.assign(out, { sel: i, x: p.box.x, y: p.box.y, w: p.box.w, h: p.box.h, text: clean(ownText(el)).slice(0, 200), inView: p.inView, count: visible.length });
    if (read) out.value = readOf(el).slice(0, 10000);
    // tâm ngoài vùng nhìn thấy (chưa cuộn) → chưa bấm được, nhưng webWait vẫn tính là thấy
    if (p.inView) out.covered = coverOf(el, p.cx, p.cy);
    return out;
  }
  return out;
}
