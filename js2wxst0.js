var sys = require("sys");

var argv = process.argv;
var node_exe = argv.shift();
var js2wx_exe = argv.shift().split("/").pop();

function main(args) {
    var fs = require("fs");
    var compilerBase = require("./stage0/js2winxed");
    var compiler = new compilerBase.Compiler();
    var astdebug = 0;
    var infile;
    var outfile = "-";
    var write = function (msg) { sys.puts(msg); };
    var loadlibs = [];

    while(args.length > 0) {
        var arg = args.shift();
        if (arg == "--astdebug")
            astdebug = 1;
        else if(arg == "-o")
            outfile = args.shift();
        else if(arg == "-i")
            loadlibs.push(args.shift());
        else {
            infile = arg;
            if (args.length > 0) {
                sys.puts("Too many arguments");
                usageAndExit();
            }
        }
    }

    var infileText = fs.readFileSync(infile).toString();

    var ast = compiler.parse(infileText);
    if (astdebug == 1) {
        sys.puts("AST: \n");
        dump(ast);
    }

    var wast = ast.toWast();

    if (astdebug == 1) {
        sys.puts("\nWAST: \n");
        dump(wast);
        sys.puts("\nWinxed: \n");
    }

    if (outfile != "-") {
        var outfileHandle = fs.openSync(outfile, "w");
        write = function(msg) { fs.writeSync(outfileHandle, msg, 0); };
    }

    var winxed = wast.toWinxed(loadlibs);
    write(winxed);
}

function usageAndExit() {
    sys.puts("Usage: " + node_exe + " " + js2wx_exe + " [--astdebug] [-i pbc] [-o <wx_file>] <js_file>");
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
