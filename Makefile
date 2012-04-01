
# Basic Make Targets

all: build

build: build-stage0 build-test

test: build
	winxed --nowarn t/harness

clean:
	rm stage0/runtime/*.pir stage0/runtime/*.pbc stage0/modules/*.pbc
	rm t/*.pir t/*.pbc

# Build Test Library

build-test: t/testlib.pbc t/harnesslib.pbc

t/testlib.pbc: t/testlib.pir
	parrot -o t/testlib.pbc t/testlib.pir

t/testlib.pir: t/testlib.winxed
	winxed -c -o t/testlib.pir t/testlib.winxed

t/harnesslib.pbc: t/harnesslib.pir
	parrot -o t/harnesslib.pbc t/harnesslib.pir

t/harnesslib.pir: t/harnesslib.winxed
	winxed -c -o t/harnesslib.pir t/harnesslib.winxed

# Stage 0

STAGE_ZERO_MODULES = \
	stage0/modules/sys.pbc

build-stage0: stage0/js/parser.js stage0/runtime/jsobject.pbc stage0/runtime/common.pbc $(STAGE_ZERO_MODULES)

stage0/js/parser.js: stage0/js/grammar.jiy stage0/js/lexer.jil
	jison stage0/js/grammar.jiy stage0/js/lexer.jil
	mv grammar.js stage0/js/parser.js

stage0/runtime/jsobject.pbc: stage0/runtime/jsobject.pir
	parrot -o stage0/runtime/jsobject.pbc stage0/runtime/jsobject.pir

stage0/runtime/jsobject.pir: stage0/runtime/jsobject.winxed
	winxed -c -o stage0/runtime/jsobject.pir stage0/runtime/jsobject.winxed

stage0/runtime/common.pbc: stage0/runtime/common.pir
	parrot -o stage0/runtime/common.pbc stage0/runtime/common.pir

stage0/runtime/common.pir: stage0/runtime/common.winxed
	winxed -c -o stage0/runtime/common.pir stage0/runtime/common.winxed

stage0/modules/sys.pbc: stage0/modules/sys.js
	./js0cc.sh stage0/modules/sys.js stage0/modules/sys.pbc



