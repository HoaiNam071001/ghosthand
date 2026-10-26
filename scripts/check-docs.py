#!/usr/bin/env python3
"""Kiểm tra tài liệu / quy tắc lệch với code. Chạy: python3 scripts/check-docs.py (thoát 1 nếu có lỗi).
- Mọi method public của App và mọi event EventsEmit phải có trong docs/ARCHITECTURE.md.
- Mọi loại node trong StepTypes (internal/model/kinds.go) phải có nhãn (types.ts), icon (icons.tsx), mô tả (internal/model/steptypes.go).
- Mọi loại node phải có mục trong internal/guide/nodes.json (Hướng dẫn, bước 51); trường riêng *mới* của node chưa được nhắc trong mục đó → cảnh báo (nền: scripts/guide-fields-baseline.json).
- Cảnh báo (không lỗi): file code > 300 dòng (quy tắc *Một file một việc*); file code chưa có trong bản đồ file."""
import glob
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')  # Windows: console mặc định cp1252 không in được tiếng Việt
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
read = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
rel_path = lambda f: os.path.relpath(f, ROOT).replace(os.sep, '/')  # Windows: \ → /

go_files = [f for f in glob.glob(os.path.join(ROOT, '*.go')) + glob.glob(os.path.join(ROOT, 'internal/**/*.go'), recursive=True)
            if not f.endswith('_test.go')]
go_src = {rel_path(f): open(f, encoding='utf-8').read() for f in go_files}
arch = read('docs/ARCHITECTURE.md')
errors, warns = [], []

# Method public của App (bind sang frontend). Bỏ Greet (mẫu Wails).
for name, src in go_src.items():
    for m in re.finditer(r'^func \(a \*App\) ([A-Z]\w*)\(', src, re.M):
        if m.group(1) != 'Greet' and f'`{m.group(1)}' not in arch and m.group(1) not in arch:
            errors.append(f'ARCHITECTURE.md thiếu method App.{m.group(1)} ({name})')

# Event Go → frontend.
for name, src in go_src.items():
    for m in re.finditer(r'EventsEmit\([^,]+,\s*"([^"]+)"', src):
        if m.group(1) not in arch:
            errors.append(f'ARCHITECTURE.md thiếu event "{m.group(1)}" ({name})')

# Loại node: hằng trong stepTypes → giá trị chuỗi.
model = go_src['internal/model/kinds.go']
consts = dict(re.findall(r'^\s*(Step\w+)\s*=\s*"(\w+)"', model, re.M))
listed = re.search(r'var StepTypes = \[\]string\{(.+?)\}', model, re.S)
if not listed:
    errors.append('không thấy var StepTypes trong internal/model/kinds.go – sửa check-docs.py')
types = [consts[c] for c in re.findall(r'Step\w+', listed.group(1)) if c in consts] if listed else []
for rel in ('frontend/src/types.ts', 'frontend/src/components/icons.tsx', 'internal/model/steptypes.go'):
    src = read(rel)
    for t in types:
        if not re.search(rf"(^|[\s{{,'\"])'?{t}'?\s*:|Step{t[0].upper() + t[1:]}\b|\"{t}\"", src, re.M):
            errors.append(f'{rel} thiếu loại node "{t}" (nhãn / icon / mô tả – checklist Thêm loại node)')

# Hướng dẫn: mục node trong nodes.json + trường riêng (Fields của steptypes.go) có được nhắc.
guide_nodes = json.loads(read('internal/guide/nodes.json'))
for t in types:
    if t not in guide_nodes:
        errors.append(f'internal/guide/nodes.json thiếu mục hướng dẫn cho loại node "{t}" (skill add-node-type, mục Hướng dẫn)')
# Nền: trường đã có sẵn lúc bật kiểm tra mà hướng dẫn chưa nhắc – chỉ cảnh báo trường *mới* ngoài danh sách này.
base_path = os.path.join(ROOT, 'scripts/guide-fields-baseline.json')
guide_base = json.load(open(base_path, encoding='utf-8')) if os.path.exists(base_path) else {}
guide_missing, update_base = {}, '--update-guide-baseline' in sys.argv
steps_src = go_src['internal/model/steptypes.go']
for m in re.finditer(r'^\t\{(Step\w+),.*?\[\]string\{([^}]*)\}', steps_src, re.M | re.S):
    t = consts.get(m.group(1))
    if t not in guide_nodes:
        continue
    text = json.dumps(guide_nodes[t], ensure_ascii=False)
    missing = [f for f in re.findall(r'"([A-Za-z]\w*)', m.group(2)) if not re.search(rf'\b{f}\b', text)]
    guide_missing[t] = missing
    new = [f for f in missing if f not in guide_base.get(t, [])]
    if new and not update_base:
        warns.append(f'nodes.json["{t}"] chưa nhắc trường mới {", ".join(new)} (thêm vào mục node hoặc chạy --update-guide-baseline nếu cố ý bỏ)')
if update_base:
    open(base_path, 'w', encoding='utf-8').write(json.dumps(guide_missing, ensure_ascii=False, indent=1, sort_keys=True) + '\n')
    print('đã ghi', base_path)

# File dài.
code = [f.replace(os.sep, '/') for f in go_files + glob.glob(os.path.join(ROOT, 'frontend/src/**/*.ts*'), recursive=True)]
for f in sorted(code):
    if '/demo/' in f or f.endswith('.test.ts'):
        continue
    n = sum(1 for _ in open(f, encoding='utf-8'))
    if n > 300:
        warns.append(f'{rel_path(f)}: {n} dòng (> 300) – tách trước khi thêm tính năng vào file này')

# File code chưa có trong bản đồ file (theo tên, hoặc thư mục `components/x/` / mẫu `Demo*`) – bản đồ lệch thì phải tự đi tìm.
for f in sorted(code):
    rel = rel_path(f)
    stem = re.sub(r'\.(go|tsx?)$', '', os.path.basename(f))
    base = 'frontend/src' if rel.startswith('frontend/') else '.'
    folder = os.path.relpath(os.path.dirname(f), os.path.join(ROOT, base)).replace(os.sep, '/') + '/'
    if f.endswith(('.test.ts', '.d.ts')) or '/demo/' in f or stem in arch or folder in arch or (stem.startswith('Demo') and 'Demo*' in arch):
        continue
    warns.append(f'{rel}: chưa có trong docs/ARCHITECTURE.md §8 Bản đồ file')

for w in warns:
    print('cảnh báo:', w)
for e in errors:
    print('LỖI:', e)
print(f'{len(errors)} lỗi, {len(warns)} cảnh báo')
sys.exit(1 if errors else 0)
