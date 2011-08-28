var sys = require("sys");

var argv = process.argv;
var node_exe = argv.shift();
var js2wx_exe = argv.shift().split("/").pop();

function main(args) {
    var fs = require("fs");
    var cafe = require("../lib/cafe");
    var compiler = new cafe.js.Compiler();
    var infile = args[0];
    var infileText = fs.readFileSync(infile).toString();
    var ast = compiler.parse(infileText);
    sys.inspect(ast);
}

function usageAndExit() {
    sys.puts("Usage: " + node_exe + " " + js2wx_exe + " <file>");
    process.exit(0);
}

function versionAndExit() {
    sys.puts(js2wx_exe + ": JS to Winxed compiler Version 0.0");
    process.exit(0);
}


if (argv.length == 0 || argv[0] == "-h" || argv[0] == "--help")
    usageAndExit();
if (argv[0] == "-V" || argv[0] == "--version")
    versionAndExit();

main(argv);
