package guide

import (
	"regexp"
	"testing"

	"ghosthand/internal/samples"
)

func TestLoad(t *testing.T) {
	g, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if len(g.Chapters) == 0 {
		t.Fatal("không có chương nào")
	}
}

// Mẫu thử và link chương trỏ tới phải có thật – nút Mở mẫu thử / link không được chết.
func TestRefsExist(t *testing.T) {
	g, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	list, err := samples.List()
	if err != nil {
		t.Fatal(err)
	}
	have := map[string]bool{}
	for _, s := range list {
		have[s.ID] = true
	}
	chapters := map[string]bool{}
	for _, c := range g.Chapters {
		chapters[c.ID] = true
	}
	link := regexp.MustCompile(`\[\[chapter:([\w-]+)\]\]`)
	check := func(where string, bs []Block, extra []string) {
		for _, id := range extra {
			if !have[id] {
				t.Errorf("%s: mẫu %q không có", where, id)
			}
		}
		for _, b := range bs {
			if b.Kind == KindSample && !have[b.Sample] {
				t.Errorf("%s: mẫu %q không có", where, b.Sample)
			}
			texts := append([]string{b.Text}, b.Items...)
			for _, r := range b.Rows {
				texts = append(texts, r...)
			}
			for _, s := range texts {
				for _, m := range link.FindAllStringSubmatch(s, -1) {
					if !chapters[m[1]] {
						t.Errorf("%s: link chương %q không có", where, m[1])
					}
				}
			}
		}
	}
	for _, c := range g.Chapters {
		check("chương "+c.ID, c.Blocks, nil)
	}
	for k, n := range g.Nodes {
		check("node "+k, n.Blocks, n.Samples)
	}
}

func TestCheckBlocks(t *testing.T) {
	bad := [][]Block{
		{{Kind: "x", Text: "a"}},
		{{Kind: KindPara}},
		{{Kind: KindList}},
		{{Kind: KindTable, Head: []string{"a", "b"}, Rows: [][]string{{"1"}}}},
		{{Kind: KindSample}},
	}
	for i, bs := range bad {
		if checkBlocks(bs) == nil {
			t.Errorf("ca %d: phải báo lỗi", i)
		}
	}
	if err := checkBlocks([]Block{{Kind: KindTable, Head: []string{"a"}, Rows: [][]string{{"1"}}}}); err != nil {
		t.Error(err)
	}
}
