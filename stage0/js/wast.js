var sys = require("sys");
var prototypes = exports.prototypes = [];
var constructors = exports.constructors = [];
var FUNC_INDENT = "";
var STMT_INDENT = "        ";
var BLCK_INDENT = "            ";
var FUNC_ENTRY = "    using fetch_global;\n" +
                 "    var __OBJECT_CONSTRUCTOR__ = fetch_global('Object');\n";

function SymbolTable(p) {
    this.syms = { };
    this.parent = p;
}
SymbolTable.prototype.addSymbol = function(s) { this.syms[s] = 1; };
SymbolTable.prototype.findSymbol = function(s) {
    if (s in this.syms)
        return true;
    if (this.parent != null)
        return this.parent.findSymbol;
    return false;
};

function extend (base, ext, except) {
    for (var k in ext) {
        if (ext.hasOwnProperty(k) && (!except || !except[k])) {
            base[k] = ext[k];
        }
    }
}

var beget = (function () {
    var fn = function fn () {};
    return function bfn (base, ext) {
        fn.prototype = base;
        var obj = new fn();
        fn.prototype = null;
        extend(obj, ext);
        return obj;
    }
})();

var wast = prototypes.base = {
    init: function (props) {
        extend(this, props);
        this.children = [];
        return this;
    },
    clone: function (extend) {
        return beget(this, extend);
    },

    winxedValue : function(v) { w.literalValue = v; },
    toWinxed : function(g, l) { return "[!!! Wast error: " + this.nodeType + " has no .toWinxed() method !!!]"; },
    toWinxedError : function(msg) { return "[!!! Wast error: " + msg + " !!!]"; }
}

var def = function def(proto, name, extend, construct) {
    prototypes[name] = proto.clone(extend);
    prototypes[name].nodeType = name;

    constructors[name] = construct || function () {
        this.init.apply(this, arguments);
        this.nodeType = name; // do this for tests
        return this;
    };
    constructors[name].prototype = prototypes[name];
    var handlers = constructors[name].handlers = {};
    constructors[name].on = function on (evt, fn) {
        if (!handlers[evt]) handlers[evt] = [];
        handlers[evt].push(fn);
    };
    constructors[name].off = function off (evt, fn) {
        if (!evt) handlers = {};
        else if (!fn && handlers[evt]) handlers[evt] = [];
        //handlers[evt].push(fn);
    };
    return prototypes[name];
}

var expr = prototypes.expr = wast.clone();
var stmt = prototypes.stmt = wast.clone();

def(wast, "Program", {
    addFunction: function(f) { this.children.push(f); },
    toWinxed: function() {
        //var wx = "namespace JavaScript[HLL]\n{\n";
        var g = new SymbolTable(null);
        var wx =
            "namespace JavaScript[HLL] {\n" +
            "function __init_js__[anon,load,init]()\n" +
            "{\n" +
            //"        var rosella = load_packfile('rosella/core.pbc');\n" +
            //"        var(Rosella.initialize_rosella)();\n" +
            //"        var(Rosella.load_bytecode_file)('./stage0/runtime/jsobject.pbc');\n" +
            "    load_bytecode('./stage0/runtime/jsobject.pbc');\n" +
            "}\n\n" +
            "function __main__[main,anon](var arguments)\n" +
            "{\n" +
            "    using JSObject.box_function;\n" +
            "    using store_global;\n" +
            "    try {\n";
            "       var __f;\n";
        wx += this.children.map(function(c) {
            if (c.name != null) {
                var name = c.name.toWinxed(g, null);
                return "        using " + name + ";\n" +
                    "        __f = box_function(" + name + ");\n" +
                    "        store_global('" + name + "', __f);\n";
            } else
                return "";
        }).join("\n");
        wx +=
            "        __js_main__(arguments);\n" +
            "    } catch (__e__) {\n" +
            "        say(__e__.message);\n" +
            "        for (string bt in __e__.backtrace_strings())\n" +
            "            say(bt);\n" +
            "    }\n" +
            "}\n\n";
        wx += this.children.map(function(c) { return c.toWinxed(g, null); }).join("\n\n") + "\n" +
            "} // JavaScript HLL\n";
        return wx;
    }
});

def(wast, "MainFunctionDecl", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(g, l) {
        l = new SymbolTable(l);
        var wx = "function __js_main__[anon](var argumentss)\n" +
            "{\n" +
            FUNC_ENTRY +
            this.children.map(function(c) { return "    " + c.toWinxed(g, l); }).join(";\n") +
            ";\n}";
        return wx;
    }
});

def(wast, "FunctionDecl", {
    setName : function(n) { this.name = n; },
    setArguments : function(a) { this.args = a; },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(g, l) {
        l = new SymbolTable(l);
        var wx = "function " + this.name.toWinxed(g, l) + "[anon]" +
            "(" + this.args.toWinxed(g, l) + ")\n" +
            "{\n" +
            FUNC_ENTRY;
        var stmts = this.children.map(function(c) { return "    " + c.toWinxed(g, l); }).join(";\n");
            // TODO: Iterate over the global symbol table and output code to fetch each and store locally
            ";\n}";
        return wx;
    }
});

def(wast, "ClosureDecl", {
    addArg : function(a) {
        if (!this.args)
            this.args = [];
        this.args.push(a);
    },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(g, l) {
        var l = new SymbolTable(l);
        var wx = "function (" + this.args.map(function(a) { return a.toWinxed(g, l); }).join(", ") + ") {\n" +
            this.children.map(function(c) { return "                " + c.toWinxed(g, l); }).join(";\n") + "; }";
        return wx;
    }
});

def(stmt, "ReturnStatement", {
    addValue : function(v) { this.children.push(v); },
    toWinxed : function() {
        return "return " + (this.children.length == 1 ? this.children[0].toWinxed() : "");
    }
});

def(expr, "Literal", {
    value : "",
    literalValue : function(v) { this.value = v.toString(); },
    toWinxed : function() { return this.value; }
});

def(wast, "ParametersList", {
    addParameter : function(p) { this.children.push(p); },
    toWinxed : function(g, l) {
        if (this.children.length == 0)
            return "this";
        return "this, " +
            this.children.map(function(c) { return c.toWinxed(g, l); }).join(", ");
    }
});

def(wast, "ParameterDeclare", {
    setName : function(n) { this.name = n; },
    toWinxed : function(g, l) {
        l.addSymbol(this.name.toString());
        return this.name.toString();
    }
});

def(stmt, "VariableDeclare", {
    initializer : null,
    setName : function(n) { this.name = n; },
    setInitializer : function(i) { this.initializer = i; },
    toWinxed : function(g, l) {
        string n = this.name.toWinxed(g, l);
        var wx =  "var " + n;
        if (this.initializer != null)
            wx += " = " + this.initializer.toWinxed(g, l);
        l.addSymbol(n);
        return wx;
    }
});

def(expr, "VariableName", {
    setName : function(n) { this.name = n; },
    toWinxed : function(g, l) {
        return this.name.toString();
    }
});

def(wast, "StatementBlock", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(g, l) {
        l = new SymbolTable(l);
        return "{\n            " +
            this.children.map(function(c) { return c.toWinxed(g, l); }).join(";\n            ") +
            ";\n        }";
    }
});

def(expr, "Assignment", {
    setDestination : function(d) { this.children[0] = d; },
    setValue : function(v) { this.children[1] = v; },
    toWinxed : function(g, l) {
        var c1 = this.children[0].toWinxed(g, l);
        var wx = c1 + " = " + this.children[1].toWinxed();
        if (this.children[0].nodeType == "VariableName") {
            if (!l.findSymbol(c1) && g.findSymbol(c1))
                wx += "; __store_global('" + c1 + "', " + c1 + ")";
        }
        return wx;
    }
});

def(expr, "BinaryOperator", {
    op : "",
    setOperator : function(o) { this.op = o; },
    setOperands : function(a,b) { this.children.push(a); this.children.push(b); },
    toWinxed : function(g, l) {
        return this.children.map(function(c) { return c.toWinxed(g, l); }).join(" " + this.op + " ");
    }
});

def(expr, "UnaryOperator", {
    op : "",
    location : "prefix",
    setLocation : function(l) { this.location = l; },
    setOperator : function(o) { this.op = o; },
    setOperand : function(a) { this.children.push(a); },
    toWinxed : function(g, l) {
        if (this.location == "prefix")
            return this.op + " " + this.children[0].toWinxed(g, l);
        else if (this.location == "postfix")
            return this.children[0].toWinxed(g, l) + this.op;
    }
});

def(expr, "ArrayLiteral", {
    addElement : function(e) { this.children.push(e); },
    toWinxed : function(g, l) {
        // TODO: Need to redo this to fetch the Array constructor
        "new JSArray(" + this.children.map(function(c) { return c.toWinxed(g, l); }).join(", ") + ")";
    }
});

def(expr, "jsObjectLiteral", {
    addElement : function(n, e) { this.children[n] = e; },
    toWinxed : function(g, l) {
        var wx = "new JavaScript.JSObject(null, __OBJECT_CONSTRUCTOR__";
        for (var key in this.children)
            wx += ", " + this.children[key].toWinxed(g, l) + ":[named('" + key.toString() + "')]";
        return wx + ")";
    }
});

def(expr, "InvokeExpr", {
    name : null,
    object : null,
    setObject : function(o) { this.object = o; },
    setName : function(n) { this.name = n; },
    addArgument : function(a) { this.children.push(a); },
    toWinxed : function(g, l) {
        var wx = "";
        if (this.object != null) {
            if (this.object.nodeType == "Literal" || this.object.nodeType == "MemberExpr")
                wx += this.object.toWinxed() + ".";
            else
                wx += "(" + this.object.toWinxed() + ").";
        }

        wx += this.name.toWinxed() + "(" +
            this.children.map(function(c) { return c.toWinxed(); }).join(", ") +
            ")";
        return wx;
    }
});

def(expr, "NewOperator", {
    name : null,
    setName : function(n) { this.name = n; },
    addOperand : function(a) { this.children.push(a); },
    toWinxed : function() {
        var wx = "new ";
        if (this.name.nodeType == "Literal" || this.name.nodeType == "MemberExpr")
            wx += this.name.toWinxed();
        else
            wx += "(" + this.name.toWinxed() + ")";
        wx += "(" + this.children.map(function(c) { return c.toWinxed(); }).join(", ") + ")";
        return wx;
    }
});

def(expr, "MemberExpr", {
    addMember : function(m) { this.children.push(m); },
    toWinxed : function() {
        return this.children.map(function(c) { return c.toWinxed(); }).join(".");
    }
});

def(expr, "KeyedIndexExpr", {
    addKey : function(m) { this.children.push(m); },
    toWinxed : function() {
        return this.children[0].toWinxed() + "[" + this.children[1].toWinxed() + "]";
    }
});

def(stmt, "WhileStatement", {
    setCondition : function(c) { this.children[0] = c; },
    setBlock : function(c) { this.children[1] = c; },
    toWinxed: function() {
        return "while (" + this.children[0].toWinxed() + ") " + this.children[1].toWinxed();
    }
});

def(stmt, "DoWhileStatement", {
    setCondition : function(c) { this.children[1] = c; },
    setBlock : function(c) { this.children[0] = c; },
    toWinxed: function() {
        return "do " + this.children[0].toWinxed() +
            " while (" + this.children[1].toWinxed() + ")";
    }
});

def(stmt, "IfStatement", {
    setCondition : function(c) { this.children[0] = c; },
    thenStatement : function(s) { this.children[1] = s; },
    elseStatement : function(s) { this.children[2] = s; },
    toWinxed : function() {
        var wx = "if (" + this.children[0].toWinxed() + ")" +
            this.children[1].toWinxed();
        if (this.children.length >= 3)
            wx += " else " + this.children[2].toWinxed();
        return wx;
    }
});

def(stmt, "ForStatement", {
    setCondition : function(a, b, c) {
        this.children[0] = a;
        this.children[1] = b;
        this.children[2] = c;
    },
    setStatement : function(s) { this.children[3] = s; },
    toWinxed : function() {
        return "for (" + this.children[0].toWinxed() + " ; " +
            this.children[1].toWinxed() + " ; " +
            this.children[2].toWinxed() + ") " +
            this.children[3].toWinxed();
    }
});

def(stmt, "ForInStatement", {
    setEnumerator : function(a, b) {
        this.children[0] = a;
        this.children[1] = b;
    },
    setStatement : function(s) { this.children[2] = s; },
    toWinxed : function() {
        return "for (" + this.children[0].toWinxed() + " in " + this.children[1].toWinxed() + ") "
            + this.children[2].toWinxed();
    }
});

def(expr, "ConditionalExpr", {
    setCondition : function(c) { this.children[0] = c; },
    setOptions : function(a, b) { this.children[1] = a; this.children[2] = b; },
    toWinxed : function() {
        return this.children[0].toWinxed() + " ? " +
            this.children[1].toWinxed() + " : " +
            this.children[2].toWinxed();
    }
});
