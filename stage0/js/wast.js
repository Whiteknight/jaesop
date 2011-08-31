var sys = require("sys");
var prototypes = exports.prototypes = [];
var constructors = exports.constructors = [];
var FUNC_INDENT = "";
var STMT_INDENT = "        ";
var BLCK_INDENT = "            ";

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
    toWinxed : function() { return "[!!! Wast error: " + this.nodeType + " has no .toWinxed() method !!!]"; }
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

        var wx = "function __init_js__[anon,load,init]()\n" +
              "{\n" +
              //"        var rosella = load_packfile('rosella/core.pbc');\n" +
              //"        var(Rosella.initialize_rosella)();\n" +
              //"        var(Rosella.load_bytecode_file)('./stage0/runtime/jsobject.pbc');\n" +
              "    load_bytecode('./stage0/runtime/jsobject.pbc');\n" +
              "}\n\n" +
              "function __main__[main,anon](var arguments)\n" +
              "{\n" +
              "    try {\n" +
              "        __js_main__(arguments);\n" +
              "    } catch (__e__) {\n" +
              "        say(__e__.message);\n" +
              "        for (string bt in __e__.backtrace_strings())\n" +
              "            say(bt);\n" +
              "    }\n" +
              "}\n\n";
        wx += this.children.map(function(c) { return c.toWinxed(); }).join("\n\n");
        return wx + "\n";
    }
});

def(wast, "MainFunctionDecl", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function() {
        var wx = "function __js_main__[anon](var arguments)\n" +
            "{\n";
        wx += this.children.map(function(c) {
            return "    " + c.toWinxed();
        }).join(";\n") + ";\n}\n\n";
        return wx;
    }
});

def(wast, "ParametersList", {
    addParameter : function(p) { this.children.push(p); },
    toWinxed : function() {
        return this.children.map(function(c) { return c.toWinxed(); }).join(", ");
    }
});

def(wast, "FunctionDecl", {
    setName : function(n) { this.name = n; },
    addArg : function(a) {
        if (!this.args)
            this.args = [];
        this.args.push(a);
    },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function() {
        var wx = "function " + this.name.toWinxed() +
            "(" + this.args.map(function(a) { return a.toWinxed(); }).join(", ") + ")\n" +
            "{\n" +
            this.children.map(function(c) { return "    " + c.toWinxed(); }).join(";\n") +
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
    toWinxed : function() {
        var wx = "function (" + this.args.map(function(a) { return a.toWinxed(); }).join(", ") + ") {\n" +
            this.children.map(function(c) { return "                " + c.toWinxed(); }).join(";\n") + "; }";
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

def(wast, "StatementBlock", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function() {
        return "{\n            " +
            this.children.map(function(c) { return c.toWinxed(); }).join(";\n            ") +
            ";\n        }";
    }
});

def(stmt, "VarDecl", {
    name : "",
    initializer : null,
    setName : function(n) { this.name = n; },
    setInitializer : function(i) { this.initializer = i; },
    toWinxed : function() {
        var wx =  "var " + this.name.toWinxed();
        if (this.initializer != null) {
            wx += " = " + this.initializer.toWinxed();
        }
        return wx;
    }
});

def(expr, "BinaryOperator", {
    op : "",
    setOperator : function(o) { this.op = o; },
    setOperands : function(a,b) { this.children.push(a); this.children.push(b); },
    toWinxed : function() {
        return this.children.map(function(c) { return c.toWinxed(); }).join(" " + this.op + " ");
    }
});

def(expr, "UnaryOperator", {
    op : "",
    location : "prefix",
    setLocation : function(l) { this.location = l; },
    setOperator : function(o) { this.op = o; },
    setOperand : function(a) { this.children.push(a); },
    toWinxed : function() {
        if (this.location == "prefix")
            return this.op + " " + this.children[0].toWinxed();
        else if (this.location == "postfix")
            return this.children[0].toWinxed() + this.op;
    }
});

def(expr, "ArrayLiteral", {
    addElement : function(e) { this.children.push(e); },
    toWinxed : function() {
        return "new JSArray(" + this.children.map(function(c) { return c.toWinxed(); }).join(", ") + ")";
    }
});

def(expr, "jsObjectLiteral", {
    addElement : function(n, e) { this.children[n] = e; },
    toWinxed : function() {
        var wx = "new JavaScript.JSObject(null, null";
        for (var key in this.children)
            wx += ", " + this.children[key].toWinxed() + ":[named('" + key.toString() + "')]";
        return wx + ")";
    }
});

def(expr, "InvokeExpr", {
    name : null,
    object : null,
    setObject : function(o) { this.object = o; },
    setName : function(n) { this.name = n; },
    addArgument : function(a) { this.children.push(a); },
    toWinxed : function() {
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
