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
    children : [],
    nodeType : "WastNode",
    clone: function (extend) {
        return beget(this, extend);
    },

    winxedValue : function(v) { w.literalValue = v; },
    toWinxed : function() { return ""; }
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
    functions : [],
    addFunction: function(f) { this.functions.push(f); },
});

def(wast, "FunctionDecl", {
    name : "",
    setName : function(n) { this.name = n; },
    args : [],
    addArg : function(a) { this.args.push(a); },
    statements : [],
    addStatement : function(s) { this.statements.push(s); }
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
    setInitializer : function(i) { this.initializer = i: }
});

def(stmt, "BinaryOperator", {
    op : "",
    children : [],
    operator : function(o) { this.op = o; },
    operands : function(a,b) { this.children.push(a); this.children.push(b); }
});

def(stmt, "ArrayLiteral", {
    children : [],
    addElement : function(e) { this.children.push(e); }
});

def(stmt, "jsObjectLiteral", {
    children : {},
    addElement : function(n, e) { this.children[n] = e; }
});
