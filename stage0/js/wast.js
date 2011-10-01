var sys = require("sys");
var prototypes = exports.prototypes = [];
var constructors = exports.constructors = [];
var FUNC_INDENT = "";
var STMT_INDENT = "    ";
var ARG_INDENT =  "        ";
var BLCK_INDENT = "        ";
var FUNC_ENTRY = "    /* Standard preamble */\n" +
                 "    using JavaScript.__fetch_global;\n" +
                 "    using JavaScript.__store_global;\n" +
                 "    var __OBJECT_CONSTRUCTOR__ = __fetch_global('Object');\n" +
                 "    var __ARRAY_CONSTRUCTOR__ = __fetch_global('Array');\n" +
                 "    var __tmp;\n\n";

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
    toWinxed : function(st) { return "[!!! Wast error: " + this.nodeType + " has no .toWinxed() method !!!]"; },
    wrapWinxed : function(st) { return this.toWinxed(st); },
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
var blck = prototypes.blck = wast.clone({
    wrapWinxed : function(st) {
        var lines = this.toWinxed(st).split("\n");
        var wx = STMT_INDENT + lines[0] + "\n";
        for (var i = 1; i < lines.length - 1; i++)
            wx += BLCK_INDENT + lines[i] + "\n";
        wx += STMT_INDENT + lines[lines.length - 1];
        return wx;
    }
});

def(wast, "Program", {
    addFunction: function(f) { this.children.push(f); },
    toWinxed: function(loadlibs) {
        //var wx = "namespace JavaScript[HLL]\n{\n";
        var st = new SymbolTable(null);
        var wx =
            //"namespace JavaScript[HLL] {\n" +
            "function __init_js__[anon,load,init]()\n" +
            "{\n" +
            //"        var rosella = load_packfile('rosella/core.pbc');\n" +
            //"        var(Rosella.initialize_rosella)();\n" +
            //"        var(Rosella.load_bytecode_file)('./stage0/runtime/jsobject.pbc');\n" +
            "    load_bytecode('./stage0/runtime/jsobject.pbc');\n" +
            "    load_bytecode('./stage0/runtime/common.pbc');\n" +
            loadlibs.map(function(l) { return "    load_bytecode('" + l + "');\n"; }) +
            "}\n\n" +
            "function __main__[main,anon](var arguments)\n" +
            "{\n" +
            "    using JavaScript.JSObject.box_function;\n" +
            "    using JavaScript.__store_global;\n" +
            "    using JavaScript.__fetch_global;\n" +
            "    try {\n" +
            "        /* Setup the process */\n" +
            "        var __process_const = __fetch_global('Process');\n" +
            "        var __process = JavaScript.JSObject.construct(null, __process_const, arguments);\n" +
            "        __store_global('process', __process);\n\n" +
            "        /* Box global functions */\n" +
            "        var __f;\n";
        wx += this.children.map(function(c) {
            if (c.name != null) {
                var name = c.name.wrapWinxed(st);
                st.addGlobal(name);
                return "        using " + name + ";\n" +
                    "        __f = box_function(" + name + ");\n" +
                    "        __store_global('" + name + "', __f);\n";
            } else
                return "";
        }).join("\n");
        wx += "\n" +
            "        /* Call the real main function */\n" +
            "        __js_main__(arguments);\n" +
            "    } catch (__e__) {\n" +
            "        var __payload = __e__.payload;\n" +
            "        string __msg = (__payload == null ? __e__.message : string(__payload));\n" +
            "        say(__msg);\n" +
            "        for (string bt in __e__.backtrace_strings())\n" +
            "            say(bt);\n" +
            "    }\n" +
            "}\n\n";
        wx += this.children.map(function(c) { return c.wrapWinxed(); }).join("\n\n") + "\n";
        //wx += "} // JavaScript HLL\n";
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
        var stmts = this.children.map(function(c) { return STMT_INDENT + c.wrapWinxed(st) + ";\n"; }).join("");

        var fwd_fetch = "";
        for (var g in st_globals) {
            if (g in st.globals_seen_locally)
                fwd_fetch += STMT_INDENT + "var " + g + " = __fetch_global('" + g + "');\n";
            else
                fwd_fetch += STMT_INDENT + "var " + g + ";\n";
        }
        if (fwd_fetch != "")
            fwd_fetch = STMT_INDENT + "/* Declare and fetch global values */\n" + fwd_fetch + "\n";
        wx += fwd_fetch;

        wx += STMT_INDENT + "/* Begin user code */\n" +
            stmts + "\n" +
            STMT_INDENT + "/* End user code */\n" +
            "}";
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
        var this_name = this.name.wrapWinxed(st);
        var wx = "function " + this_name + "[anon] (" + this.args.wrapWinxed(st) + ")\n" +
            "{\n" +
            FUNC_ENTRY;
        var stmts = this.children.map(function(c) { return STMT_INDENT + c.wrapWinxed(st) + ";\n"; }).join("\n");

        var fwd_fetch = "";
        for (var gul in st.globals_seen_locally) {
            if (gul != this_name)
                fwd_fetch += STMT_INDENT + "var " + gul + " = __fetch_global('" + gul + "');\n";
        }
        if (fwd_fetch != "")
            fwd_fetch = STMT_INDENT + "/* Declare and fetch global values */\n" + fwd_fetch + "\n";
        wx += fwd_fetch;

        wx += STMT_INDENT + "/* Begin user code */\n" +
            stmts + (stmts == "" ? "" : ";\n") +
            STMT_INDENT + "/* End user code */\n" +
            "}";
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
        var wx = "JavaScript.JSObject.box_function(function (" + this.args.map(function(a) { return a.wrapWinxed(st); }).join(", ") + ") {\n";
        var stmts = this.children.map(function(c) { return "\n" + BLCK_INDENT + c.wrapWinxed(st); }).join(";");
        for (var gsl in st.globals_seen_locally)
            wx += BLCK_INDENT + "var " + gsl + " = __fetch_global('" + gsl + "');\n";
        wx += stmts +
            "; })";
        return wx;
    }
});

def(stmt, "ReturnStatement", {
    addValue : function(v) { this.children.push(v); },
    toWinxed : function() {
        return "return " + (this.children.length == 1 ? this.children[0].wrapWinxed() : "");
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
        return this.children.map(function(c) { return c.wrapWinxed(st) + ", "; }).join("") +
            "var this [named,optional]";
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
        if (n == undefined)
            n = this.name.value;
        var wx = "";

        if (st.declare_vars_locally == true) {
            // In a normal function. Declare the variable like normal.
            wx = "var " + n;
            if (this.initializer != null)
                wx += " = " + this.initializer.wrapWinxed(st);
            st.addLocal(n);
        } else {
            // In the top-level scope. The variable is already declared as a
            // global. Initialize it if necessary, otherwise do nothing.
            wx = n;
            if (this.initializer != null)
                wx += " = " + this.initializer.wrapWinxed(st) + "; __store_global('" + n + "', " + n + ")";
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
        if (locale == null) {
            st.addGlobal(n);
            st.seeGlobalLocally(n);
        }
        else if (locale == "global")
            st.seeGlobalLocally(n);
        return n;
    }
});

def(wast, "StatementBlock", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(st) {
        st = new SymbolTable(st);
        return "{\n" +
            this.children.map(function(c) { return BLCK_INDENT + c.wrapWinxed(st) + ";\n"; }).join("") +
            STMT_INDENT + "}";
    }
});

def(stmt, "Assignment", {
    setDestination : function(d) { this.children[0] = d; },
    setValue : function(v) { this.children[1] = v; },
    toWinxed : function(st) {
        var c1 = this.children[0].wrapWinxed(st);
        var wx = c1 + " = " + this.children[1].wrapWinxed(st);
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
        return this.children.map(function(c) { return c.wrapWinxed(st); }).join(" " + this.op + " ");
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
            return this.op + " " + this.children[0].wrapWinxed(st);
        else if (this.location == "postfix")
            return this.children[0].wrapWinxed(st) + this.op;
    }
});

def(expr, "ArrayLiteral", {
    addElement : function(e) { this.children.push(e); },
    toWinxed : function(st) {
        // TODO: Need to redo this to fetch the Array constructor
        return "JavaScript.JSObject.construct(null, __ARRAY_CONSTRUCTOR__" +
            this.children.map(function(c) { return ", " + c.wrapWinxed(st); }).join("") +
            ")";
    }
});

def(expr, "jsObjectLiteral", {
    addElement : function(n, e) { this.children[n] = e; },
    toWinxed : function(st) {
        var wx = "new JavaScript.JSObject(null, __OBJECT_CONSTRUCTOR__";
        for (var key in this.children)
            wx += ",\n" + ARG_INDENT + this.children[key].wrapWinxed(st) + ":[named('" + key.toString() + "')]";
        return wx + ")";
    }
});

def(expr, "SubInvokeExpr", {
    setName : function(n) { this.name = n; },
    addArgument : function(a) { this.children.push(a); },
    toWinxed : function(st) {
        var wx = "";
        wx += this.name.wrapWinxed(st) + "(" +
            this.children.map(function(c) { return c.wrapWinxed(st); }).join(",\n" + ARG_INDENT) +
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
        var n = this.name.wrapWinxed(st);

        if (this.object == null)
            return this.toWinxedError("Object cannot be null in a MethodInvokeExpr (" + n + ")");
        var obj = "";
        if (this.object.nodeType == "Literal" || this.object.nodeType == "MemberExpr" || this.object.nodeType == "VariableName")
            obj = this.object.wrapWinxed(st);
        else
            obj= "(" + this.object.wrapWinxed(st) + ")";

        wx += "var(" + obj + ".*'" + n + "')(" +
            this.children.map(function(c) { return "\n" + ARG_INDENT + c.wrapWinxed(st) + ","; }).join("") +
            "\n" + ARG_INDENT + obj + ":[named('this')])";
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
            wx += this.name.wrapWinxed(st);
        else
            wx += "(" + this.name.wrapWinxed(st) + ")";
        wx += this.children.map(function(c) { return ",\n" + ARG_INDENT + c.wrapWinxed(st); }).join("") + ")";
        return wx;
    }
});

def(expr, "MemberExpr", {
    addMember : function(m) { this.children.push(m); },
    toWinxed : function(st) {
        return this.children.map(function(c) { return c.wrapWinxed(st); }).join(".");
    }
});

def(expr, "KeyedIndexExpr", {
    addKey : function(m) { this.children.push(m); },
    toWinxed : function(st) {
        return this.children[0].wrapWinxed(st) + "[" + this.children[1].wrapWinxed(st) + "]";
    }
});

def(blck, "WhileStatement", {
    setCondition : function(c) { this.children[0] = c; },
    setBlock : function(c) { this.children[1] = c; },
    toWinxed: function(st) {
        return "while (" + this.children[0].wrapWinxed(st) + ") " + this.children[1].wrapWinxed(st);
    }
});

def(stmt, "DoWhileStatement", {
    setCondition : function(c) { this.children[1] = c; },
    setBlock : function(c) { this.children[0] = c; },
    toWinxed: function(st) {
        return "do " + this.children[0].wrapWinxed(st) +
            " while (" + this.children[1].wrapWinxed(st) + ")";
    }
});

def(stmt, "IfStatement", {
    setCondition : function(c) { this.children[0] = c; },
    thenStatement : function(s) { this.children[1] = s; },
    elseStatement : function(s) { this.children[2] = s; },
    toWinxed : function(st) {
        var wx = "if (" + this.children[0].wrapWinxed(st) + ")" +
            this.children[1].wrapWinxed(st);
        if (this.children.length >= 3)
            wx += " else " + this.children[2].wrapWinxed(st);
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
        return "for (" + this.children[0].wrapWinxed(st) + " ; " +
            this.children[1].wrapWinxed(st) + " ; " +
            this.children[2].wrapWinxed(st) + ") " +
            this.children[3].wrapWinxed(st);
    }
});

def(stmt, "ForInStatement", {
    setEnumerator : function(a, b) {
        this.children[0] = a;
        this.children[1] = b;
    },
    setStatement : function(s) { this.children[2] = s; },
    toWinxed : function(st) {
        return "for (" + this.children[0].wrapWinxed(st) + " in " + this.children[1].wrapWinxed(st) + ") "
            + this.children[2].wrapWinxed(st);
    }
});

def(expr, "ConditionalExpr", {
    setCondition : function(c) { this.children[0] = c; },
    setOptions : function(a, b) { this.children[1] = a; this.children[2] = b; },
    toWinxed : function(st) {
        return this.children[0].wrapWinxed(st) + " ? " +
            this.children[1].wrapWinxed(st) + " : " +
            this.children[2].wrapWinxed(st);
    }
});

def(wast, "TryStatement", {
    setTryBlock : function(b) { this.children[0] = b; },
    setCatchClause : function(c) { this.children[1] = c; },
    toWinxed : function(st) {
        return "try " + this.children[0].wrapWinxed(st) + this.children[1].wrapWinxed(st);
    }
});

def(wast, "CatchClause", {
    setExceptionVar : function(e) { this.children[0] = e; },
    setCatchBlock : function(b) { this.children[1] = b; },
    toWinxed : function(st) {
        wx = " catch (";
        var ex = null;
        if (this.children[0] != null) {
            ex = this.children[0].wrapWinxed(st);
            wx += "__exception__";
        }
        wx += ") ";
        if (ex == null) {
            wx += this.children[1].wrapWinxed(st);
        } else {
            var st = new SymbolTable(st);
            st.addLocal(ex);
            wx += "{\n" +
                BLCK_INDENT + "var " + ex + " = __exception__.payload;\n" +
                BLCK_INDENT + "if (" + ex + " == null) " + ex + " = __exception__.message;\n" +
                BLCK_INDENT + this.children[1].wrapWinxed(st) + "\n" +
                STMT_INDENT + "}\n";
        }
        return wx;
    }
});

def(stmt, "ThrowStatement", {
    setPayload : function(p) { this.children[0] = p; },
    toWinxed : function(st) {
        var wx = "__tmp = new 'Exception'; __tmp.payload = " + this.children[0].toWinxed(st) + "; throw(__tmp)";
        return wx;
  }
});

def(stmt, "BreakStatement", {
    toWinxed : function(st) { return "break"; }
});

def(stmt, "ContinueStatement", {
    toWinxed : function(st) { return "continue"; }
});

def(stmt, "SwitchStatement", {
    setExpr : function(e) { this.children[0] = e; },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(st) {
        var wx = "switch (" + this.children[0].wrapWinxed(st) + ") {\n"
        for (var i = 1; i < this.children.length; i++)
            wx += BLCK_INDENT + this.children[i].wrapWinxed(st);
        return wx + STMT_INDENT + "}";
    }
});

def(stmt, "CaseStatement", {
    setValue : function(v) { this.children[0] = v; },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(st) {
        var wx = "case " + this.children[0].wrapWinxed(st) + ":\n";
        for (var i = 1; i < this.children.length; i++)
            wx += BLCK_INDENT + "    " + this.children[i].wrapWinxed(st) + ";\n";
        return wx;
    }
});

def(stmt, "DefaultStatement", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(st) {
        var wx = "default:\n";
        for (var i = 0; i < this.children.length; i++)
            wx += BLCK_INDENT + "    " + this.children[i].wrapWinxed(st) + ";\n";
        return wx;
    }
});
