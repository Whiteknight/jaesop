var sys = require("sys");
var prototypes = exports.prototypes = [];
var constructors = exports.constructors = [];
var FUNC_INDENT = "";
var STMT_INDENT = "        ";
var BLCK_INDENT = "            ";
var FUNC_ENTRY = "    using JavaScript.__fetch_global;\n" +
                 "    using JavaScript.__store_global;\n" +
                 "    var __OBJECT_CONSTRUCTOR__ = __fetch_global('Object');\n" +
                 "    var __tmp;\n";

/* Winxed code generation state object
    This object type maintains state for the code generator to keep track of
    global and local symbols, etc.
*/

var st_globals = { };
function SymbolTable(p) {
    this.parent = p;
    this.locals = { };
    this.globals_seen_locally = { };
    this.declare_vars_locally = true;
}
SymbolTable.prototype.declareVarsLocally = function(d) { this.declare_vars_locally = d; };
SymbolTable.prototype.addLocal = function(s) { this.locals[s] = 1; };
SymbolTable.prototype.addGlobal = function(s) { st_globals[s] = 1; };
SymbolTable.prototype.findLocal = function(s) {
    if (s in this.locals)
        return "local";
    if (this.parent != null)
        return this.parent.findLocal(s);
    return null;
};
SymbolTable.prototype.findSymbol = function(s) {
    var f = this.findLocal(s);
    if (f != null)
        return f;
    if (s in st_globals)
        return "global";
    return null;
};
SymbolTable.prototype.seeGlobalLocally = function(s) { this.globals_seen_locally[s] = 1; };

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
        var st = new SymbolTable(null);
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
            "    using JavaScript.JSObject.box_function;\n" +
            "    using JavaScript.__store_global;\n" +
            "    try {\n" +
            "        var __f;\n";
        wx += this.children.map(function(c) {
            if (c.name != null) {
                var name = c.name.toWinxed(st);
                st.addGlobal(name);
                return "        using " + name + ";\n" +
                    "        __f = box_function(" + name + ");\n" +
                    "        __store_global('" + name + "', __f);\n";
            } else
                return "";
        }).join("\n");
        wx += "\n" +
            "        __js_main__(arguments);\n" +
            "    } catch (__e__) {\n" +
            "        say(__e__.message);\n" +
            "        for (string bt in __e__.backtrace_strings())\n" +
            "            say(bt);\n" +
            "    }\n" +
            "}\n\n";
        wx += this.children.map(function(c) { return c.toWinxed(); }).join("\n\n") + "\n" +
            "} // JavaScript HLL\n";
        return wx;
    }
});

def(wast, "MainFunctionDecl", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function() {
        var st = new SymbolTable(null);
        st.declareVarsLocally(false);
        var wx = "function __js_main__[anon](var argumentss)\n" +
            "{\n" +
            FUNC_ENTRY;
        var stmts = this.children.map(function(c) { return "    " + c.toWinxed(st); }).join(";\n");
        wx += stmts +
            ";\n}";
        return wx;
    }
});

def(wast, "FunctionDecl", {
    setName : function(n) { this.name = n; },
    setArguments : function(a) { this.args = a; },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function() {
        var st = new SymbolTable(null);
        st.declareVarsLocally(true);
        var this_name = this.name.toWinxed(st);
        var wx = "function " + this_name + "[anon] (" + this.args.toWinxed(st) + ")\n" +
            "{\n" +
            FUNC_ENTRY;
        var stmts = this.children.map(function(c) { return "    " + c.toWinxed(st); }).join(";\n");
        for (var gul in st.globals_seen_locally) {
            if (gul != this_name)
                wx += "    var " + gul + " = __fetch_global('" + gul + "');\n";
        }
        wx += stmts +
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
    toWinxed : function(st) {
        st = new SymbolTable(st);
        var wx = "function (" + this.args.map(function(a) { return a.toWinxed(st); }).join(", ") + ") {";
        var stmts = this.children.map(function(c) { return "\n            " + c.toWinxed(st); }).join(";");
        for (var gsl in st.globals_seen_locally)
            wx += "            var " + gsl + " = __fetch_global('" + gsl + "');\n";
        wx += stmts +
            "; }";
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
    toWinxed : function(st) {
        if (this.children.length == 0)
            return "this";
        return "this, " +
            this.children.map(function(c) { return c.toWinxed(st); }).join(", ");
    }
});

def(wast, "ParameterDeclare", {
    setName : function(n) { this.name = n; },
    toWinxed : function(st) {
        var n = this.name.toString();
        // Main func doesn't have any parameters, so we can ignore special handling
        st.addLocal(n);
        return n;
    }
});

def(stmt, "VariableDeclare", {
    initializer : null,
    setName : function(n) { this.name = n; },
    setInitializer : function(i) { this.initializer = i; },
    toWinxed : function(st) {

        var n = this.name.name;
        var wx =  "var " + n;

        if (this.initializer != null)
            wx += " = " + this.initializer.toWinxed(st);
        if (st.declare_vars_locally)
            st.addLocal(n);
        else {
            wx += "; __store_global('" + n + "', " + n + ")";
            st.addGlobal(n);
        }
        return wx;
    }
});

def(expr, "VariableName", {
    setName : function(n) { this.name = n; },
    toWinxed : function(st) {
        var n = this.name.toString();
        var locale = st.findSymbol(n);
        if (locale == "global" || locale == null)
            st.seeGlobalLocally(n);
        return n;
    }
});

def(wast, "StatementBlock", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(st) {
        st = new SymbolTable(st);
        return "{\n            " +
            this.children.map(function(c) { return c.toWinxed(st); }).join(";\n            ") +
            ";\n        }";
    }
});

def(expr, "Assignment", {
    setDestination : function(d) { this.children[0] = d; },
    setValue : function(v) { this.children[1] = v; },
    toWinxed : function(st) {
        var c1 = this.children[0].toWinxed(st);
        var wx = c1 + " = " + this.children[1].toWinxed(st);
        if (this.children[0].nodeType == "VariableName") {
            if (st.findSymbol(c1) == "global")
                wx += "; __store_global('" + c1 + "', " + c1 + ")";
        }
        return wx;
    }
});

def(expr, "BinaryOperator", {
    op : "",
    setOperator : function(o) { this.op = o; },
    setOperands : function(a,b) { this.children.push(a); this.children.push(b); },
    toWinxed : function(st) {
        return this.children.map(function(c) { return c.toWinxed(st); }).join(" " + this.op + " ");
    }
});

def(expr, "UnaryOperator", {
    op : "",
    location : "prefix",
    setLocation : function(l) { this.location = l; },
    setOperator : function(o) { this.op = o; },
    setOperand : function(a) { this.children.push(a); },
    toWinxed : function(st) {
        if (this.location == "prefix")
            return this.op + " " + this.children[0].toWinxed(st);
        else if (this.location == "postfix")
            return this.children[0].toWinxed(st) + this.op;
    }
});

def(expr, "ArrayLiteral", {
    addElement : function(e) { this.children.push(e); },
    toWinxed : function(st) {
        // TODO: Need to redo this to fetch the Array constructor
        "new JSArray(" + this.children.map(function(c) { return c.toWinxed(st); }).join(", ") + ")";
    }
});

def(expr, "jsObjectLiteral", {
    addElement : function(n, e) { this.children[n] = e; },
    toWinxed : function(st) {
        var wx = "new JavaScript.JSObject(null, __OBJECT_CONSTRUCTOR__";
        for (var key in this.children)
            wx += ", " + this.children[key].toWinxed(st) + ":[named('" + key.toString() + "')]";
        return wx + ")";
    }
});

def(expr, "SubInvokeExpr", {
    setName : function(n) { this.name = n; },
    addArgument : function(a) { this.children.push(a); },
    toWinxed : function(st) {
        var wx = "";
        wx += this.name.toWinxed(st) + "(null" +
            this.children.map(function(c) { return ", " + c.toWinxed(st); }).join("") +
            ")";
        return wx;
    }
});

def(expr, "MethodInvokeExpr", {
    object : null,
    setObject : function(o) { this.object = o; },
    setName : function(n) { this.name = n; },
    addArgument : function(a) { this.children.push(a); },
    toWinxed : function(st) {
        var wx = "";
        var n = this.name.toWinxed(st);
        if (this.object == null)
            return this.toWinxedError("Object cannot be null in a MethodInvokeExpr (" + n + ")");
        var obj = "";
        if (this.object.nodeType == "Literal" || this.object.nodeType == "MemberExpr" || this.object.nodeType == "VariableName")
            obj = this.object.toWinxed(st);
        else
            obj= "(" + this.object.toWinxed(st) + ")";
        wx += "var(" + obj + ".*'" + n + "')(" + obj +
            this.children.map(function(c) { return ", " + c.toWinxed(st); }).join("") +
            ")";
        return wx;
    }
});

def(expr, "NewOperator", {
    name : null,
    setName : function(n) { this.name = n; },
    addOperand : function(a) { this.children.push(a); },
    toWinxed : function(st) {
        var wx = "JavaScript.JSObject.construct(null, ";
        if (this.name.nodeType == "Literal" || this.name.nodeType == "MemberExpr" || this.name.nodeType == "VariableName")
            wx += this.name.toWinxed(st);
        else
            wx += "(" + this.name.toWinxed(st) + ")";
        wx += this.children.map(function(c) { return ", " + c.toWinxed(st); }).join("") + ")";
        return wx;
    }
});

def(expr, "MemberExpr", {
    addMember : function(m) { this.children.push(m); },
    toWinxed : function(st) {
        return this.children.map(function(c) { return c.toWinxed(st); }).join(".");
    }
});

def(expr, "KeyedIndexExpr", {
    addKey : function(m) { this.children.push(m); },
    toWinxed : function(st) {
        return this.children[0].toWinxed(st) + "[" + this.children[1].toWinxed(st) + "]";
    }
});

def(stmt, "WhileStatement", {
    setCondition : function(c) { this.children[0] = c; },
    setBlock : function(c) { this.children[1] = c; },
    toWinxed: function(st) {
        return "while (" + this.children[0].toWinxed(st) + ") " + this.children[1].toWinxed(st);
    }
});

def(stmt, "DoWhileStatement", {
    setCondition : function(c) { this.children[1] = c; },
    setBlock : function(c) { this.children[0] = c; },
    toWinxed: function(st) {
        return "do " + this.children[0].toWinxed(st) +
            " while (" + this.children[1].toWinxed(st) + ")";
    }
});

def(stmt, "IfStatement", {
    setCondition : function(c) { this.children[0] = c; },
    thenStatement : function(s) { this.children[1] = s; },
    elseStatement : function(s) { this.children[2] = s; },
    toWinxed : function(st) {
        var wx = "if (" + this.children[0].toWinxed(st) + ")" +
            this.children[1].toWinxed(st);
        if (this.children.length >= 3)
            wx += " else " + this.children[2].toWinxed(st);
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
    toWinxed : function(st) {
        return "for (" + this.children[0].toWinxed(st) + " ; " +
            this.children[1].toWinxed(st) + " ; " +
            this.children[2].toWinxed(st) + ") " +
            this.children[3].toWinxed(st);
    }
});

def(stmt, "ForInStatement", {
    setEnumerator : function(a, b) {
        this.children[0] = a;
        this.children[1] = b;
    },
    setStatement : function(s) { this.children[2] = s; },
    toWinxed : function(st) {
        return "for (" + this.children[0].toWinxed(st) + " in " + this.children[1].toWinxed(st) + ") "
            + this.children[2].toWinxed(st);
    }
});

def(expr, "ConditionalExpr", {
    setCondition : function(c) { this.children[0] = c; },
    setOptions : function(a, b) { this.children[1] = a; this.children[2] = b; },
    toWinxed : function(st) {
        return this.children[0].toWinxed(st) + " ? " +
            this.children[1].toWinxed(st) + " : " +
            this.children[2].toWinxed(st);
    }
});
