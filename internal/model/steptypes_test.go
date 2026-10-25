package model

import "testing"

func TestOnlyOSLoaiHopLe(t *testing.T) {
	known := map[string]bool{}
	for _, d := range StepTypeDocs() {
		known[d.Type] = true
	}
	for typ := range onlyOS {
		if !known[typ] {
			t.Errorf("onlyOS có loại không tồn tại: %q", typ)
		}
	}
	if SupportedOn(StepSavePdf, "windows") || !SupportedOn(StepSavePdf, "darwin") || !SupportedOn(StepClick, "windows") {
		t.Error("SupportedOn sai")
	}
}
