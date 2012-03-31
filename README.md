Jaesop is JavaScript on Parrot. It is an experimental playground. It probably
does not work, is not the best solution to the problem, and is not stable or
usable. Awesome.

=== STATUS ===

The current architecture for the "stage0" section borrows code from
zaach/cafe. It uses Jison to parse JavaScript with JavaScript to produce an
ast. It transforms that ast into a new tree form called "wast". From there, it
will attempt to output Winxed code.

If this strategy works works well, it will be used as a stage 0 of a
bootstrapped js compiler. The winxed version will be used to parse a stage1,
written in JavaScript. Stage 1 will be used to compile itself for stage 2.

If it does not work, I'll delete it, claim it never happened, and try
something else.

Currently, I only have a stage zero compiler, and it's only partially
implemented.

=== REQUIREMENTS ===

You need a modern Parrot and Winxed installed, with Rosella. You need node.js
and jison.

=== USAGE ===

To build the stage0 compiler and stage0 runtime, do this:

    make

To use the stage0 compiler to compile JavaScript to Winxed, do this:

    node js2wxst0.js -o output.winxed input.js

Or, you can use pipes:

    node js2wxst0.js input.js > output.winxed

If you are hacking and want to see the AST and WAST structures, you can use
the --astdebug option:

    node js2wxst0.js --astdebug input.js

To run the automated test suite:

    make test



