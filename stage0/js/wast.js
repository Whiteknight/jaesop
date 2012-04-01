var sys = require("sys");
var prototypes = exports.prototypes = [];
var constructors = exports.constructors = [];
var emitter = require("./emitter");
emitter = emitter.emitter;
var FUNC_ENTRY = "    /* Standard preamble */\n" +
                 "    using JavaScript.__fetch_global;\n" +
                 "    using JavaScript.__store_global;\n" +
                 "    var __OBJECT_CONSTRUCTOR__ = __fetch_global('Object');\n" +
                 "    var __ARRAY_CONSTRUCTOR__ = __fetch_global('Array');\n" +
                 "    var __REGEXP_CONSTRUCTOR__ = __fetch_global('RegExp');\n" +
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
                var name = c.name.toWinxed(st);
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
        wx += this.children.map(function(c) { return c.toWinxed(); }).join("\n\n") + "\n";
        //wx += "} // JavaScript HLL\n";
        return wx;
    }
});

def(wast, "MainFunctionDecl", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function() {
        var st = new SymbolTable(null);
        st.declareVarsLocally(false);
        var wx = "function __js_main__[anon,tag('js_main')](var arguments)\n" +
            "{\n" +
            FUNC_ENTRY;
        emitter.increase_indent();
        var stmts = this.children.map(function(c) { return emitter.emit(c.toWinxed(st)) + ";\n"; }).join("");


        var fwd_fetch = "";
        for (var g in st_globals) {
            //sys.puts("Saw global " + g + " locally");
            if (g in st.globals_seen_locally)
                fwd_fetch += emitter.emit("var " + g + " = __fetch_global('" + g + "');\n");
            else
                fwd_fetch += emitter.emit("var " + g + ";\n");
        }
        if (fwd_fetch != "")
            fwd_fetch = emitter.emit("/* Declare and fetch global values */\n") + fwd_fetch + "\n";
        wx += fwd_fetch;
        wx += emitter.emit("var exports = new JavaScript.JSObject(null, __OBJECT_CONSTRUCTOR__);\n");
        wx += emitter.emit("/* Begin user code */\n") +
            stmts + "\n" +
            emitter.emit("/* End user code */\n") +
            emitter.emit("return exports;\n") +
            "}";
        emitter.decrease_indent();
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

        emitter.increase_indent();
        var stmts = this.children.map(function(c) { return emitter.emit(c.toWinxed(st) + ";\n"); }).join("\n");

        var fwd_fetch = "";
        for (var gul in st.globals_seen_locally) {
            if (gul != this_name)
                fwd_fetch += emitter.emit("var " + gul + " = __fetch_global('" + gul + "');\n");
        }
        if (fwd_fetch != "")
            fwd_fetch = emitter.emit("/* Declare and fetch global values */\n") + fwd_fetch + "\n";
        wx += fwd_fetch;

        wx += emitter.emit("/* Begin user code */\n") +
            stmts + (stmts == "" ? "" : ";\n") +
            emitter.emit("/* End user code */\n") +
            "}";
        emitter.decrease_indent();
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
        var wx = "JavaScript.JSObject.box_function(\n";
        emitter.increase_indent();
        wx += emitter.emit("function (" + this.args.map(function(a) { return a.toWinxed(st); }).join(", ") + ") {\n");
        emitter.increase_indent();
        var stmts = this.children.map(function(c) { return emitter.emit(c.toWinxed(st)) + ";\n"; }).join("");
        for (var gsl in st.globals_seen_locally) {
            if (st.parent.declare_vars_locally == true)     // This is a function
                st.parent.seeGlobalLocally(gsl);
            else
                wx += emitter.emit("var " + gsl + " = __fetch_global('" + gsl + "');\n");
        }
        wx += stmts;
        emitter.decrease_indent();
        wx += emitter.emit("}\n");
        emitter.decrease_indent();
        wx += emitter.emit(")");
        return wx;
    }
});

def(wast, "ReturnStatement", {
    addValue : function(v) { this.children.push(v); },
    toWinxed : function() {
        return emitter.emit("return " + (this.children.length == 1 ? this.children[0].toWinxed() : ""));
    }
});

def(wast, "Literal", {
    value : "",
    literalValue : function(v) { this.value = v.toString(); },
    toWinxed : function() { return this.value; }
});

def(wast, "ParametersList", {
    addParameter : function(p) { this.children.push(p); },
    toWinxed : function(st) {
        return this.children.map(function(c) { return c.toWinxed(st) + ", "; }).join("") +
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

def(wast, "VariableDeclare", {
    initializer : null,
    setName : function(n) { this.name = n; },
    setInitializer : function(i) { this.initializer = i; },
    toWinxed : function(st) {
        var n = this.name.name;
        //sys.puts("Declaring variable " + n + " + " + st.declare_vars_locally);
        if (n == undefined)
            n = this.name.value;
        var wx = "";

        if (st.declare_vars_locally == true) {
            // In a normal function. Declare the variable like normal.
            var d = "var " + n;
            if (this.initializer != null)
                d += " = " + this.initializer.toWinxed(st);
            wx += d;
            st.addLocal(n);
        } else {
            // In the top-level scope. The variable is already declared as a
            // global. Initialize it if necessary, otherwise do nothing.
            var d = n
            if (this.initializer != null)
                d += " = " + this.initializer.toWinxed(st) + "; __store_global('" + n + "', " + n + ")";
            wx += d;
            st.addGlobal(n);
        }
        return wx;
    }
});

def(wast, "VariableName", {
    setName : function(n) { this.name = n; },
    toWinxed : function(st) {
        var n = this.name.toString();
        var locale = st.findSymbol(n);
        //sys.puts("Using variable " + n + " " + locale);
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
        var wx = "{\n";
        emitter.increase_indent();
        wx += this.children.map(function(c) { return emitter.emit(c.toWinxed(st)) + ";\n"; }).join("");
        emitter.decrease_indent();
        wx += emitter.emit("}");
        return wx;
    }
});

def(wast, "Assignment", {
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

def(wast, "BinaryOperator", {
    op : "",
    setOperator : function(o) { this.op = o; },
    setOperands : function(a,b) { this.children.push(a); this.children.push(b); },
    toWinxed : function(st) {
        return this.children.map(function(c) { return c.toWinxed(st); }).join(" " + this.op + " ");
    }
});

def(wast, "UnaryOperator", {
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

def(wast, "ArrayLiteral", {
    addElement : function(e) { this.children.push(e); },
    toWinxed : function(st) {
        // TODO: Need to redo this to fetch the Array constructor
        var wx = "JavaScript.JSObject.construct(null, __ARRAY_CONSTRUCTOR__";
        if (this.children.length == 0) {
            return wx + ")"
        }
        wx += ",\n";
        emitter.increase_indent();
        wx += this.children.map(function(c) { return emitter.emit(c.toWinxed(st)); }).join(",\n") + "\n";
        emitter.decrease_indent();
        wx += emitter.emit(")");
        return wx;
    }
});

def(wast, "jsObjectLiteral", {
    addElement : function(n, e) { this.children[n] = e; },
    toWinxed : function(st) {
        var wx = emitter.emit("new JavaScript.JSObject(null, __OBJECT_CONSTRUCTOR__");
        emitter.increase_indent();
        for (var key in this.children)
            wx += ",\n" + emitter.emit(this.children[key].toWinxed(st) + ":[named('" + key.toString() + "')]");
        emitter.decrease_indent();
        return wx + emitter.emit(")");
    }
});

def(wast, "SubInvokeExpr", {
    setName : function(n) { this.name = n; },
    addArgument : function(a) { this.children.push(a); },
    toWinxed : function(st) {
        var wx = this.name.toWinxed(st) + "(";
        if (this.children.length == 0)
            return wx + ")";
        wx += "\n";
        emitter.increase_indent();
        wx += emitter.emit(this.children.map(function(c) { return c.toWinxed(st); }).join(",\n")) + "\n";
        emitter.decrease_indent();
        wx += emitter.emit(")");
        return wx;
    }
});

def(wast, "MethodInvokeExpr", {
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

        wx += "var(" + obj + ".*'" + n + "')(\n";
        emitter.increase_indent();
        wx += this.children.map(function(c) { return emitter.emit(c.toWinxed(st) + ","); }).join("\n") + "\n";
        wx += emitter.emit(obj + ":[named('this')]\n");
        emitter.decrease_indent();
        wx += emitter.emit(")");
        return wx;
    }
});

def(wast, "NewOperator", {
    name : null,
    setName : function(n) { this.name = n; },
    addOperand : function(a) { this.children.push(a); },
    toWinxed : function(st) {
        var wx = "JavaScript.JSObject.construct(null, ";
        if (this.name.nodeType == "Literal" || this.name.nodeType == "MemberExpr" || this.name.nodeType == "VariableName")
            wx += this.name.toWinxed(st);
        else
            wx += "(" + this.name.toWinxed(st) + ")";
        emitter.increase_indent();
        wx += emitter.emit(this.children.map(function(c) { return ",\n" + c.toWinxed(st); }).join("") + ")");
        return wx;
    }
});

def(wast, "MemberExpr", {
    addMember : function(m) { this.children.push(m); },
    toWinxed : function(st) {
        var wx = this.children[0].toWinxed(st);
        var child = this.children[1].toWinxed(st);
        if (this.children[1].nodeType == "Literal") {
            if (child.substring(0, 1) == "'" && child.substring(child.length - 1, child.length) == "'")
                wx += ".*" + child;
            else
                wx += ".*'" + child + "'";
        } else
            wx += "." + this.children[1].toWinxed(st);
        return wx;
    }
});

def(wast, "KeyedIndexExpr", {
    addKey : function(m) { this.children.push(m); },
    toWinxed : function(st) {
        return this.children[0].toWinxed(st) + "[" + this.children[1].toWinxed(st) + "]";
    }
});

def(wast, "WhileStatement", {
    setCondition : function(c) { this.children[0] = c; },
    setBlock : function(c) { this.children[1] = c; },
    toWinxed: function(st) {
        return "while (" + this.children[0].toWinxed(st) + ") \n" +
            emitter.emit(this.children[1].toWinxed(st));
    }
});

def(wast, "DoWhileStatement", {
    setCondition : function(c) { this.children[1] = c; },
    setBlock : function(c) { this.children[0] = c; },
    toWinxed: function(st) {
        return "do \n" +
            emitter.emit(this.children[0].toWinxed(st)) + "\n" +
            emitter.emit("while (" + this.children[1].toWinxed(st) + ")");
    }
});

def(wast, "IfStatement", {
    setCondition : function(c) { this.children[0] = c; },
    thenStatement : function(s) { this.children[1] = s; },
    elseStatement : function(s) { this.children[2] = s; },
    toWinxed : function(st) {
        var wx = "if (" + this.children[0].toWinxed(st) + ")\n";
        emitter.increase_indent();
        wx += emitter.emit(this.children[1].toWinxed(st)) + ";";
        emitter.decrease_indent();
        if (this.children.length >= 3) {
            wx += "\n";
            wx += emitter.emit("else\n");
            emitter.increase_indent();
            wx += emitter.emit(this.children[2].toWinxed(st));
            emitter.decrease_indent();
        }
        return wx;
    }
});

def(wast, "ForStatement", {
    setCondition : function(a, b, c) {
        this.children[0] = a;
        this.children[1] = b;
        this.children[2] = c;
    },
    setStatement : function(s) { this.children[3] = s; },
    toWinxed : function(st) {
        return "for (" + this.children[0].toWinxed(st) + " ; " +
            this.children[1].toWinxed(st) + " ; " +
            this.children[2].toWinxed(st) + ")\n" +
            emitter.emit(this.children[3].toWinxed(st));
    }
});

def(wast, "ForInStatement", {
    setEnumerator : function(a, b) {
        this.children[0] = a;
        this.children[1] = b;
    },
    setStatement : function(s) { this.children[2] = s; },
    toWinxed : function(st) {
        return "for (" + this.children[0].toWinxed(st) + " in " + this.children[1].toWinxed(st) + ")\n"
            + emitter.emit(this.children[2].toWinxed(st));
    }
});

def(wast, "ConditionalExpr", {
    setCondition : function(c) { this.children[0] = c; },
    setOptions : function(a, b) { this.children[1] = a; this.children[2] = b; },
    toWinxed : function(st) {
        return this.children[0].toWinxed(st) + " ? " +
            this.children[1].toWinxed(st) + " : " +
            this.children[2].toWinxed(st);
    }
});

def(wast, "TryStatement", {
    setTryBlock : function(b) { this.children[0] = b; },
    setCatchClause : function(c) { this.children[1] = c; },
    toWinxed : function(st) {
        return "try\n" +
            emitter.emit(this.children[0].toWinxed(st)) + "\n" +
            emitter.emit(this.children[1].toWinxed(st));
    }
});

def(wast, "CatchClause", {
    setExceptionVar : function(e) { this.children[0] = e; },
    setCatchBlock : function(b) { this.children[1] = b; },
    toWinxed : function(st) {
        wx = "catch (";
        var ex = null;
        if (this.children[0] != null) {
            ex = this.children[0].toWinxed(st);
            wx += "__exception__";
        }
        wx += ")\n";
        if (ex == null) {
            wx += this.children[1].toWinxed(st);
        } else {
            var st = new SymbolTable(st);
            st.addLocal(ex);
            wx += emitter.emit("{\n");
            emitter.increase_indent();
            wx += emitter.emit("var " + ex + " = __exception__.payload;\n");
            wx += emitter.emit("if (" + ex + " == null) " + ex + " = __exception__.message;\n");
            wx += emitter.emit(this.children[1].toWinxed(st) + "\n");
            emitter.decrease_indent();
            wx += emitter.emit("}\n");
        }
        return wx;
    }
});

def(wast, "ThrowStatement", {
    setPayload : function(p) { this.children[0] = p; },
    toWinxed : function(st) {
        var wx = "__tmp = new 'Exception'; __tmp.payload = " + this.children[0].toWinxed(st) + "; throw(__tmp)";
        return wx;
    }
});

def(wast, "BreakStatement", {
    toWinxed : function(st) { return "break"; }
});

def(wast, "ContinueStatement", {
    toWinxed : function(st) { return "continue"; }
});

def(wast, "SwitchStatement", {
    setExpr : function(e) { this.children[0] = e; },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(st) {
        var wx = "switch (" + this.children[0].toWinxed(st) + ")\n" +
            emitter.emit("{\n");
        emitter.increase_indent();
        for (var i = 1; i < this.children.length; i++)
            wx += emitter.emit(this.children[i].toWinxed(st));
        emitter.decrease_indent();
        return wx + emitter.emit("}");
    }
});

def(wast, "CaseStatement", {
    setValue : function(v) { this.children[0] = v; },
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(st) {
        var wx = "case " + this.children[0].toWinxed(st) + ":\n";
        emitter.increase_indent();
        for (var i = 1; i < this.children.length; i++)
            wx += emitter.emit(this.children[i].toWinxed(st) + ";\n");
        emitter.decrease_indent();
        return wx;
    }
});

def(wast, "DefaultStatement", {
    addStatement : function(s) { this.children.push(s); },
    toWinxed : function(st) {
        var wx = "default:\n";
        emitter.increase_indent();
        for (var i = 0; i < this.children.length; i++)
            wx +=  emitter.emit(this.children[i].toWinxed(st) + ";\n");
        emitter.decrease_indent();
        return wx;
    }
});

def(wast, "RegExprExpression", {
    setPattern : function(p, m) {
        this.children[0] = p;
        this.children[1] = m;
    },
    toWinxed : function(st) {
        return "JavaScript.JSObject.construct(null, __REGEXP_CONSTRUCTOR__, '" + this.children[0] + "', '" + this.children[1] + "')";
    }
});
