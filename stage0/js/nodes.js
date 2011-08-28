var wast = require("./wast");
var sys = require("sys");

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

function getWast(name) {
    return new wast.constructors[name]();
}

exports.defineNodes = function (prototypes, constructors) {

var node = prototypes.base = {
    init: function node (props) {
        extend(this, props);
        this.children = [];
        var args = Array.prototype.slice.call(arguments, 1);
        if (args.length) this.appendList(args);
        return this;
    },
    append: function (item) {
        this.children.push(item);
        return this;
    },
    appendList: function (nodes) {
        if (!nodes.length) return this;
        var kids = this.children;
        nodes.forEach(function (item){
            if (item) kids.push(item);
        });
        return this;
    },
    clone: function (extend) {
        return beget(this, extend);
    },
    eldest: function (extend) {
        return this.children[0];
    },
    fire: function fire (evt) {
        var self = this;
        if (constructors[this.nodeType].handlers['parse'])
          constructors[this.nodeType].handlers['parse'].map(function (fn) { fn.call(self); });
    },
    toWast: function () {
        return null;
    }
};

var expr = prototypes.expr = node.clone();
var stmt = prototypes.stmt = node.clone();
var binaryExpr = prototypes.binaryExpr = expr.clone();
var unaryExpr = prototypes.unaryExpr = expr.clone();


var def = function def(proto, name, extend, construct) {
    prototypes[name] = proto.clone(extend);
    prototypes[name].nodeType = name;

    constructors[name] = construct || function () {
        this.init.apply(this, arguments);
        this.nodeType = name; // do this for tests
        this.fire('parse');
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
}

/* Nodes
*/

// Program node
def(node,'Program', {
    toWast : function() {
        var p = getWast("Program");
        var main = getWast("FunctionDecl");
        var main_name = getWast("Literal");
        main_name.literalValue("main");
        main.setName(main_name);
        main.addFlag("main");
        for (var i = 0; i < this.children.length; i++) {
            if (this.children[i].nodeType == "FunctionDecl") {
                sys.puts("Adding function");
                p.addFunction(this.children[i].toWast());
            } else {
                sys.puts("Adding statement to main()");
                main.addStatement(this.children[i].toWast());
            }
        }
        sys.puts("Adding main() to Program");
        p.addFunction(main);
        return p;
    }
});

// Identifier node
def(node,'IdPatt', {
    toWast : function() {
        var w = getWast("Literal");
        w.literalValue(this.name);
        return w;
    }
}, function (name) {
    this.init({name:name});
    this.fire('parse');
    this.nodeType = 'IdPatt';
    return this;
});

// Literal expression node
def(expr,'LiteralExpr', {
    toWast : function() {
        var w = getWast("Literal");
        var v;
        switch (this.type) {
            case 'null':
                v = 'null';
            case 'string':
                v = '"'+this.value+'"';
            default:
                v = this.value.toString();
        }
        w.literalValue(v);
        return w;
    }
});

// "this" expression node
def(expr,'ThisExpr', {
    toWast : function() {
        var w = getWast("Literal");
        w.literalValue("self");
        return w;
    }
});

// Regexp Literal expression node
def(expr,'RegExpExpr', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

// Var statement node
def(stmt,'VarDecl', {
    toWast : function() {
        var w = getWast("VarDecl");
        w.setName(this.name);
        if (this.children.length > 0)
            w.setInitializer(this.children[0].toWast());
        return w;
    }
});

// Const statement node
def(stmt,'ConstDecl', { });

// Init pattern node
def(expr,'InitPatt', {
    toWast : function() {
        var w = getWast("Literal");
        w.literalValue(this.name);
        return w;
    }
});

// Identifier expression node
def(expr,'IdExpr', {
    toWast : function() {
        var w = getWast("Literal");
        w.literalValue(this.name);
        return w;
    }
});

// Assignment expression node
def(expr,'AssignExpr', {
    toWast : function() {
        var w = getWast("BinaryOperator");
        w.operator("=");
        w.operands(this.children[0].toWast(), this.children[1].toWast());
        return w;
    }
});

def(expr,'ArrayExpr', {
    toWast : function() {
        var w = getWast("ArrayLiteral");
        this.children.map(function(c) { w.addElement(c.toWast()); });
        return w;
    }
});

def(expr,'ObjectExpr', {
    toWast : function() {
        var w = getWast("jsObjectLiteral");
        this.children.map(function(c) { w.addElement(c.name, c.children[0].toWast()); });
        return w;
    }
});

def(node,'DataProp', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(node,'GetterSetterProp', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

// Function declaration node
def(stmt,'FunctionDecl', {
    toWast : function() {
        var w = getWast("FunctionDecl");
        this.children.map(function(c) { w.addStatement(c.name, c.children[0].toWast()); });
        return w;
    }
});

// Function expression node
def(expr,'FunctionExpr', prototypes.FunctionDecl);

// Param declaration node
def(node,'ParamDecl', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

// return statement node
def(stmt,'ReturnStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'TryStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'BlockStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(node,'CatchClause', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'ThrowStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'LabelledStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'BreakStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'ContinueStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'SwitchStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(node,'Case', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});
def(node,'DefaultCase', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'WithStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

// operators
def(expr,'ConditionalExpr', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(unaryExpr,'UnaryExpr', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(binaryExpr,'BinaryExpr', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(binaryExpr,'LogicalORExpr', {op: '||'});
def(binaryExpr,'LogicalANDExpr', {op: '&&'});

def(binaryExpr,'BitwiseORExpr', {op: '|'});
def(binaryExpr,'BitwiseANDExpr', {op: '&'});
def(binaryExpr,'BitwiseXORExpr', {op: '^'});

def(binaryExpr,'EqualExpr', {op: '=='});
def(binaryExpr,'NotEqualExpr', {op: '!='});
def(binaryExpr,'StrictEqualExpr', {op: '==='});
def(binaryExpr,'StrictNotEqualExpr', {op: '!=='});

def(binaryExpr,'InExpr', {op: 'in'});
def(binaryExpr,'InstanceofExpr', {op: 'instanceof'});
def(binaryExpr,'GreaterEqExpr', {op: '>='});
def(binaryExpr,'LessEqExpr', {op: '<='});
def(binaryExpr,'GreaterExpr', {op: '>'});
def(binaryExpr,'LessExpr', {op: '<'});
def(binaryExpr,'URightShiftExpr', {op: '>>>'});
def(binaryExpr,'RightShiftExpr', {op: '>>'});
def(binaryExpr,'LeftShiftExpr', {op: '<<'});
def(binaryExpr,'AddExpr', {op: '+'});
def(binaryExpr,'SubExpr', {op: '-'});
def(binaryExpr,'ModExpr', {op: '%'});
def(binaryExpr,'DivExpr', {op: '/'});
def(binaryExpr,'MultExpr', {op: '*'});

def(unaryExpr,'VoidExpr', {op: 'void'});
def(unaryExpr,'LogicalNotExpr', {op: '!'});
def(unaryExpr,'BitwiseNotExpr', {op: '~'});
def(unaryExpr,'NegateExpr', {op: '-'});
def(unaryExpr,'UnaryPlusExpr', {op: '+'});
def(unaryExpr,'DeleteExpr', {op: 'delete'});
def(unaryExpr,'TypeofExpr', {op: 'typeof'});

def(expr,'CountExpr', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(expr,'CallExpr', {
    toWast : function() {throw new Error(this.nodeType);
        throw new Error(this.nodeType);
    }
});

def(expr,'NewExpr', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(expr,'MemberExpr', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(expr,'InvokeExpr', {
    toWast : function() {
        var w = getWast("InvokeStatement");
        w.setObject(this.children[0].toWast());
        w.setName(this.children[1].toWast());
        for (var i = 2; i < this.children.length; i++)
            w.addArgument(this.children[i].toWast());
        return w;
    }
});

// debugger node
def(stmt,'DebuggerStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

// empty node
def(node,'Empty', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'EmptyStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

// control structs

def(stmt,'WhileStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'DoWhileStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'ForStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'ForInStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

def(stmt,'IfStmt', {
    toWast : function() {
        throw new Error(this.nodeType);
    }
});

return def;
}

