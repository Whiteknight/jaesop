all: build

build: build-stage0

build-stage0:
	jison lib/js/grammar.jiy lib/js/lexer.jil
	mv grammar.js lib/js/parser.js

