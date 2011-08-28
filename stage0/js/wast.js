var sys = require("sys");
var prototypes = exports.prototypes = [];
var constructors = exports.constructors = [];

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
    children : [],
    nodeType : "WastNode",
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
        var wx = "$include 'jsinclude.winxed';\n" +
                 "namespace JavaScript[HLL] { namespace jsop_main\n{ \n";
        wx += "    function 'init_js'[anon,load,init]()\n" +
              "    {\n" +
              "        var rosella = load_packfile('rosella/core.pbc');\n" +
              "        var(Rosella.initialize_rosella)();\n" +
              "        var(Rosella.load_bytecode_file)('jsruntime.pbc');\n" +
              "    }\n\n";
        wx += this.children.map(function(c) { return c.toWinxed(); }).join("\n\n");
        return wx + "\n}}\n";
    }
});

def(wast, "FunctionDecl", {
    name : null,
    setName : function(n) { this.name = n; },
    flags : [],
    addFlag : function(f) { this.flags.push(f.toString()); },
    args : [],
    addArg : function(a) { this.args.push(a); },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function() {
        var wx = "    function " + this.name.toWinxed() +
            "[" + this.flags.join(", ") + "] " +
            "(" + this.args.map(function(a) { return a.toWinxed(); }).join(", ") + ")\n" +
            "    {\n" +
            this.children.map(function(c) { return "        " + c.toWinxed(); }).join(";\n") +
            ";\n    }";
        return wx;
    }
});

def(expr, "Literal", {
    value : "",
    literalValue : function(v) { this.value = v.toString(); },
    toWinxed : function() { return this.value; }
});

def(wast, "StatementBlock", {
    statements : [],
    addStatement : function(s) { this.statements.push(s); }
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
    operator : function(o) { this.op = o; },
    operands : function(a,b) { this.children.push(a); this.children.push(b); },
    toWinxed : function() {
        return this.children.map(function(c) { return c.toWinxed(); }).join(" " + this.op + " ");
    }
});

def(expr, "ArrayLiteral", {
    addElement : function(e) { this.children.push(e); },
    toWinxed : function() {
        return "JSArray(" + this.children.map(function(c) { return c.toWinxed(); }).join(", ") + ")";
    }
});

def(expr, "jsObjectLiteral", {
    addElement : function(n, e) { this.children.push(e); },
    toWinxed : function() {
        var wx = "new JSObject(";
        var first = true;
        for (var key in this.children) {
            if (!first)
                wx += ", ";
            wx += this.children[key].toWinxed() + ":[named('" + key.toString() + "')]";
            first = false;
        }
        return wx + ")";
    }
});

def(expr, "InvokeStatement", {
    name : null,
    object : null,
    setObject : function(o) { this.object = o; },
    setName : function(n) { this.name = n; },
    addArgument : function(a) { this.children.push(a); },
    toWinxed : function() {
        var wx = "";
        if (this.object != null) {
            if (this.object.nodeType == "Literal")
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
        if (this.name.nodeType == "Literal")
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
