all: build

build: build-stage0

build-stage0:
	jison stage0/js/grammar.jiy stage0/js/lexer.jil
	mv grammar.js stage0/js/parser.js

