all: build

build: build-stage0 build-test

test: build-test
	winxed t/harness

build-stage0: stage0/js/parser.js stage0/runtime/jsobject.pbc

build-test: t/testlib.pbc

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

