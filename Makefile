all: build

build: build-stage0

build-stage0: stage0/js/parser.js stage0/runtime/jsobject.pbc

stage0/js/parser.js: stage0/js/grammar.jiy stage0/js/lexer.jil
	jison stage0/js/grammar.jiy stage0/js/lexer.jil
	mv grammar.js stage0/js/parser.js

stage0/runtime/jsobject.pbc: stage0/runtime/jsobject.pir
	parrot -o stage0/runtime/jsobject.pbc stage0/runtime/jsobject.pir

stage0/runtime/jsobject.pir: stage0/runtime/jsobject.winxed
	winxed -c -o stage0/runtime/jsobject.pir stage0/runtime/jsobject.winxed
