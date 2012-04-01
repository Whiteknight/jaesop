#!/bin/sh
node js2wxst0.js -o temp.winxed $1
#cat temp.winxed
winxed --nowarn -c -o temp.pir temp.winxed
parrot -o $2 temp.pir
#rm temp.winxed
