var sys = require("sys");

var argv = process.argv;
var node_exe = argv.shift();
var js2wx_exe = argv.shift().split("/").pop();

function main(args) {
    var fs = require("fs");
    var compilerBase = require("./stage0/js2winxed");
    var compiler = new compilerBase.Compiler();
    var infile = args[0];
    var infileText = fs.readFileSync(infile).toString();

    sys.puts("AST: \n");
    var ast = compiler.parse(infileText);
    dump(ast);

    sys.puts("\nWAST: \n");
    var wast = ast.toWast();
    dump(wast);

    sys.puts("\nWinxed: \n");
    var winxed = wast.toWinxed();
    sys.puts(winxed);
}

function usageAndExit() {
    sys.puts("Usage: " + node_exe + " " + js2wx_exe + " <file>");
    process.exit(0);
}

function versionAndExit() {
    sys.puts(js2wx_exe + ": JS to Winxed compiler Version 0.0");
    process.exit(0);
}

function dump(x) {
    sys.puts(sys.inspect(x, false, 20));
}


if (argv.length == 0 || argv[0] == "-h" || argv[0] == "--help")
    usageAndExit();
if (argv[0] == "-V" || argv[0] == "--version")
    versionAndExit();

main(argv);
