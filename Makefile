all: build

build: build-stage0 build-test

test: build
	winxed --nowarn t/harness

clean:
	rm stage0/runtime/*.pir stage0/runtime/*.pbc
	rm t/*.pir t/*.pbc

build-stage0: stage0/js/parser.js stage0/runtime/jsobject.pbc

build-test: t/testlib.pbc t/harnesslib.pbc

clean:
	rm stage0/runtime/*.pbc
	rm stage0/runtime/*.pir
	rm t/*.pbc
	rm t/*.pir

stage0/js/parser.js: stage0/js/grammar.jiy stage0/js/lexer.jil
	jison stage0/js/grammar.jiy stage0/js/lexer.jil
	mv grammar.js stage0/js/parser.js

stage0/runtime/jsobject.pbc: stage0/runtime/jsobject.pir
	parrot -o stage0/runtime/jsobject.pbc stage0/runtime/jsobject.pir

stage0/runtime/jsobject.pir: stage0/runtime/jsobject.winxed
	winxed -c -o stage0/runtime/jsobject.pir stage0/runtime/jsobject.winxed

t/testlib.pbc: t/testlib.pir
	parrot -o t/testlib.pbc t/testlib.pir

t/testlib.pir: t/testlib.winxed
	winxed -c -o t/testlib.pir t/testlib.winxed

t/harnesslib.pbc: t/harnesslib.pir
	parrot -o t/harnesslib.pbc t/harnesslib.pir

t/harnesslib.pir: t/harnesslib.winxed
	winxed -c -o t/harnesslib.pir t/harnesslib.winxed


