package cloud

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"
)

// Local – phía máy, đã quy về đường dẫn kiểu cloud (library.go, settings, bí mật). Hashes là hash của nội dung
// Ở DẠNG MANG ĐI ĐƯỢC (đường dẫn tương đối, không có chuỗi riêng máy), cùng thứ Read trả về.
type Local interface {
	Hashes() (map[string]string, error)
	Read(path string) ([]byte, error)
	Write(path string, data []byte) error
	Remove(path string) error
}

// Conflict – hai bên cùng đổi; đưa cho Resolver (hộp thoại hỏi người dùng).
type Conflict struct {
	Path       string
	LocalHash  string // "" = máy đã xoá
	RemoteHash string // "" = cloud đã xoá
	Device     string // máy sửa cuối trên cloud
	RemoteTime time.Time
}

// Choice – người dùng chọn gì cho một xung đột. Zero = Skip: để nguyên, hỏi lại lần sau (không bao giờ tự ghi đè).
type Choice int

const (
	Skip       Choice = iota
	KeepLocal         // giữ bản máy này (đẩy lên cloud; máy đã xoá thì xoá trên cloud)
	TakeRemote        // lấy bản cloud (cloud đã xoá thì xoá ở máy)
	KeepBoth          // giữ cả hai: bản cloud lưu thành "tên (máy khác).json" – chỉ kịch bản; file khác coi như Skip
)

type Resolver func(Conflict) Choice

// Syncer – một lần đồng bộ. State là bản cuối đã đồng bộ, được cập nhật tại chỗ (kể cả khi lỗi giữa chừng) – người gọi
// lưu lại sau Run.
type Syncer struct {
	Remote  Provider
	Local   Local
	State   *State
	Device  string
	Scope   Scope
	Resolve Resolver               // nil = mọi xung đột bỏ qua
	Hold    func(path string) bool // true = đừng ghi / xoá file này ở máy (kịch bản đang mở có thay đổi chưa lưu)
	Now     func() time.Time
}

// Result – việc đã làm; đường dẫn kiểu cloud.
type Result struct {
	Pushed, Pulled, DeletedLocal, DeletedRemote []string
	Conflicts                                   []Conflict // chưa giải quyết (Skip / không có Resolver)
	Held                                        []string   // hoãn vì đang mở có thay đổi chưa lưu
	Kept                                        []string   // bản cloud đã lưu thành file riêng (KeepBoth)
}

// Changed – có gì đổi không.
func (r Result) Changed() bool {
	return len(r.Pushed)+len(r.Pulled)+len(r.DeletedLocal)+len(r.DeletedRemote)+len(r.Kept) > 0
}

const maxAttempts = 3

// Run đồng bộ một lượt. Máy khác ghi xen vào giữa chừng (ErrPrecondition) thì đọc lại cloud và làm tiếp, tối đa 3 lần.
func (s *Syncer) Run(ctx context.Context) (Result, error) {
	var res Result
	var err error
	for range maxAttempts {
		res, err = s.run(ctx)
		if !errors.Is(err, ErrPrecondition) {
			return res, err
		}
	}
	return res, fmt.Errorf("cloud liên tục bị máy khác sửa trong lúc đồng bộ – thử lại sau: %w", err)
}

func (s *Syncer) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (s *Syncer) run(ctx context.Context) (Result, error) {
	var res Result
	man, manVer, err := s.loadManifest(ctx)
	if err != nil {
		return res, err
	}
	local, err := s.Local.Hashes()
	if err != nil {
		return res, fmt.Errorf("không quét được file ở máy: %w", err)
	}
	remote := map[string]string{}
	for p, e := range man.Files {
		remote[p] = e.Hash
	}
	if s.State.Files == nil {
		s.State.Files = map[string]string{}
	}
	r := &runner{s: s, ctx: ctx, man: man, local: local, res: &res}
	var runErr error
	for _, it := range Plan(local, s.State.Files, remote, s.Scope) {
		if runErr = r.apply(it); runErr != nil {
			break
		}
	}
	// manifest ghi lại kể cả khi lỗi giữa chừng: file đã đẩy phải được ghi nhận
	if r.dirty {
		man.Version = manifestVersion
		b, _ := json.MarshalIndent(man, "", "  ")
		if _, err := s.Remote.Put(ctx, ManifestPath, b, manVer); err != nil {
			// cloud chưa ghi nhận phần đã đẩy → máy này cũng không coi là đã đồng bộ (lượt sau đẩy lại)
			r.rollback()
			if runErr == nil {
				runErr = err
			}
		}
	}
	return res, runErr
}

func (s *Syncer) loadManifest(ctx context.Context) (Manifest, string, error) {
	b, ver, err := s.Remote.Get(ctx, ManifestPath)
	if errors.Is(err, ErrNotFound) {
		return newManifest(), "", nil
	}
	if err != nil {
		return Manifest{}, "", err
	}
	m, err := decodeManifest(b)
	return m, ver, err
}

// runner giữ trạng thái của một lượt.
type runner struct {
	s     *Syncer
	ctx   context.Context
	man   Manifest
	local map[string]string
	res   *Result
	dirty bool // manifest đã đổi, cần ghi
	// undo – giá trị cũ trong State của file đã đẩy / xoá trên cloud; nhận lại nếu manifest không ghi được
	undo map[string]*string
}

func (r *runner) remember(p string) {
	if r.undo == nil {
		r.undo = map[string]*string{}
	}
	if _, done := r.undo[p]; done {
		return
	}
	if h, ok := r.s.State.Files[p]; ok {
		r.undo[p] = &h
	} else {
		r.undo[p] = nil
	}
}

func (r *runner) rollback() {
	for p, h := range r.undo {
		if h == nil {
			delete(r.s.State.Files, p)
		} else {
			r.s.State.Files[p] = *h
		}
	}
}

func (r *runner) held(p string) bool {
	if r.s.Hold != nil && r.s.Hold(p) {
		r.res.Held = append(r.res.Held, p)
		return true
	}
	return false
}

func (r *runner) apply(it Item) error {
	p := it.Path
	switch it.Action {
	case ActNone:
		r.markSame(p)
		return nil
	case ActPush:
		return r.push(p)
	case ActPull:
		return r.pull(p)
	case ActDeleteLocal:
		return r.deleteLocal(p)
	case ActDeleteRemote:
		return r.deleteRemote(p)
	}
	return r.conflict(p, r.local[p], r.man.Files[p].Hash)
}

// markSame ghi nhận vào "bản cuối đã đồng bộ": hai bên giống nhau → hash đó; tệp đi kèm bị bỏ qua lệnh xoá →
// theo cloud (cloud không còn thì quên, lượt sau tự đẩy lại nếu máy còn).
func (r *runner) markSame(p string) {
	h := r.man.Files[p].Hash
	if h == "" {
		delete(r.s.State.Files, p)
		return
	}
	r.s.State.Files[p] = h
}

func (r *runner) push(p string) error {
	data, err := r.s.Local.Read(p)
	if err != nil {
		return fmt.Errorf("không đọc được %s: %w", p, err)
	}
	h := Hash(data)
	r.remember(p)
	ver, err := r.put(p, data, h)
	if err != nil {
		return fmt.Errorf("không đẩy được %s: %w", p, err)
	}
	r.man.Files[p] = Entry{Hash: h, Ver: ver, Device: r.s.Device, Time: r.s.now()}
	r.s.State.Files[p] = h
	r.local[p] = h
	r.dirty = true
	r.res.Pushed = append(r.res.Pushed, p)
	return nil
}

// put ghi file với ifMatch = version đã ghi trong manifest (không đè bản máy khác vừa đẩy); chưa có trong manifest mà
// cloud có file = mồ côi của lượt lỗi trước, không ai tham chiếu → ghi đè.
func (r *runner) put(p string, data []byte, h string) (string, error) {
	e, ok := r.man.Files[p]
	if !ok {
		ver, err := r.s.Remote.Put(r.ctx, p, data, "")
		if errors.Is(err, ErrPrecondition) {
			return r.s.Remote.Put(r.ctx, p, data, IfAny)
		}
		return ver, err
	}
	if e.Ver == "" {
		return r.s.Remote.Put(r.ctx, p, data, IfAny)
	}
	ver, err := r.s.Remote.Put(r.ctx, p, data, e.Ver)
	if errors.Is(err, ErrPrecondition) {
		// đã có đúng nội dung này = chính máy này đẩy ở lượt trước mà manifest chưa kịp ghi
		if cur, curVer, gerr := r.s.Remote.Get(r.ctx, p); gerr == nil && Hash(cur) == h {
			return curVer, nil
		}
	}
	return ver, err
}

func (r *runner) pull(p string) error {
	if r.held(p) {
		return nil
	}
	want := r.man.Files[p].Hash
	data, _, err := r.s.Remote.Get(r.ctx, p)
	if err != nil {
		return fmt.Errorf("không tải được %s: %w", p, err)
	}
	if Hash(data) != want {
		return fmt.Errorf("%s trên cloud chưa nhất quán (máy khác đang ghi?) – thử lại: %w", p, ErrPrecondition)
	}
	if err := r.s.Local.Write(p, data); err != nil {
		return fmt.Errorf("không ghi được %s: %w", p, err)
	}
	r.s.State.Files[p] = want
	r.local[p] = want
	r.res.Pulled = append(r.res.Pulled, p)
	return nil
}

func (r *runner) deleteLocal(p string) error {
	if r.held(p) {
		return nil
	}
	if err := r.s.Local.Remove(p); err != nil {
		return fmt.Errorf("không xoá được %s: %w", p, err)
	}
	delete(r.s.State.Files, p)
	delete(r.local, p)
	r.res.DeletedLocal = append(r.res.DeletedLocal, p)
	return nil
}

func (r *runner) deleteRemote(p string) error {
	r.remember(p)
	if err := r.s.Remote.Delete(r.ctx, p); err != nil {
		return fmt.Errorf("không xoá được %s trên cloud: %w", p, err)
	}
	delete(r.man.Files, p)
	delete(r.s.State.Files, p)
	r.dirty = true
	r.res.DeletedRemote = append(r.res.DeletedRemote, p)
	return nil
}

func (r *runner) conflict(p, localHash, remoteHash string) error {
	e := r.man.Files[p]
	c := Conflict{Path: p, LocalHash: localHash, RemoteHash: remoteHash, Device: e.Device, RemoteTime: e.Time}
	choice := Skip
	if r.s.Resolve != nil {
		choice = r.s.Resolve(c)
	}
	if choice == KeepBoth && (localHash == "" || remoteHash == "" || !strings.HasPrefix(p, ScriptsDir)) {
		// một bên đã xoá: "giữ cả hai" = giữ bản còn lại; file không phải kịch bản không có tên thứ hai
		switch {
		case localHash == "" && remoteHash != "":
			choice = TakeRemote
		case remoteHash == "" && localHash != "":
			choice = KeepLocal
		default:
			choice = Skip
		}
	}
	switch choice {
	case KeepLocal:
		if localHash == "" {
			return r.deleteRemote(p)
		}
		return r.push(p)
	case TakeRemote:
		if remoteHash == "" {
			return r.deleteLocal(p)
		}
		return r.pull(p)
	case KeepBoth:
		return r.keepBoth(p, e)
	}
	r.res.Conflicts = append(r.res.Conflicts, c)
	return nil
}

// keepBoth: bản cloud lưu thành file riêng ở máy, rồi đẩy cả bản máy lẫn file riêng lên cloud.
func (r *runner) keepBoth(p string, e Entry) error {
	if r.held(p) {
		return nil
	}
	data, _, err := r.s.Remote.Get(r.ctx, p)
	if err != nil {
		return fmt.Errorf("không tải được %s: %w", p, err)
	}
	if Hash(data) != e.Hash {
		return fmt.Errorf("%s trên cloud chưa nhất quán – thử lại: %w", p, ErrPrecondition)
	}
	alt := r.altPath(p, e.Device)
	if err := r.s.Local.Write(alt, data); err != nil {
		return fmt.Errorf("không ghi được %s: %w", alt, err)
	}
	r.local[alt] = e.Hash
	r.res.Kept = append(r.res.Kept, alt)
	if err := r.push(p); err != nil {
		return err
	}
	return r.push(alt)
}

// altPath: scripts/a.json → scripts/a (Máy B).json, trùng thì thêm số.
func (r *runner) altPath(p, device string) string {
	if device == "" {
		device = "máy khác"
	}
	ext := path.Ext(p)
	stem := strings.TrimSuffix(p, ext)
	for i := 1; ; i++ {
		tag := device
		if i > 1 {
			tag = fmt.Sprintf("%s %d", device, i)
		}
		alt := fmt.Sprintf("%s (%s)%s", stem, tag, ext)
		_, onLocal := r.local[alt]
		_, onCloud := r.man.Files[alt]
		if !onLocal && !onCloud {
			return alt
		}
	}
}
