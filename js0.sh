#!/bin/sh
node js2wxst0.js -o temp.winxed $1
#cat temp.winxed
winxed --nowarn temp.winxed
#rm temp.winxed
