namespace JavaScript[HLL] {
    extern function fetch_global;
    extern function store_global;
    namespace JSObject {
        extern function construct;
        extern function box_function;
    }
    class JSObject;

    class Test_JSObject
    {
        function test_fetch_global() {
            var f = fetch_global("Function");
            self.assert.not_null(f);
            self.assert.instance_of(f, class JSObject);
        }

        function test_store_global() {
            var x = "Hello World!";
            store_global("X", x);
            var z = fetch_global("X");
            self.assert.same(x, z);
        }

        function test_Object_prototype() {
            // Test that we can look up a method inherited from the Object prototype
            var object = fetch_global("Object");
            var x = JSObject.construct(null, object);
            var toString = x.*"toString";
            self.assert.not_null(toString);
            self.assert.instance_of(toString, class JSObject);
            self.assert.equal(toString.get_type_name(), "Function");
        }

        function test_manual_prototype() {
            var x = new JSObject(null, null, 1:[named("a")]);
            var z = new JSObject(x, null, 2:[named("b")]);
            self.assert.equal(z.a, 1);
            self.assert.equal(z.b, 2);

            // Show that overwriting a value on a local copy doesn't affect
            // the prototype
            z.a = "hello";
            self.assert.equal(z.a, "hello");
            self.assert.equal(x.a, 1);
        }

        function construct() {
            // construct function requires a constructor. Otherwise, use
            // "new JSObject(...)"
            self.assert.throws(function() {
                // Need a constructor
                var x = JSObject.construct(null, null);
            });

            // Create an Object. Show that x has access to things in the
            // Object prototype. If we don't specify a prototype, take it from
            // the constructor
            var object = fetch_global("Object");
            var x = JSObject.construct(null, object);
            self.assert.instance_of(x, class JSObject);
            self.assert.same(x.constructor, object);
            self.assert.same(x.prototype, object.prototype);

            // Create a new type with a new constructor. Verify that arguments
            // to construct are passed to the constructor.
            var MyType = JSObject.box_function(function(var obj, var a, var b) {
                obj.*"a" = a;
                obj.*"b" = b;
            });
            var n = JSObject.construct(null, MyType, "hello", "world");
            self.assert.equal(n.a, "hello");
            self.assert.equal(n.b, "world");
            self.assert.is_null(n.c);

            // Verify that named parameters passed to construct are added as
            // attributes to the object
            var m = JSObject.construct(null, MyType, "hello", "world", "item c":[named("c")]);
            self.assert.equal(m.a, "hello");
            self.assert.equal(m.b, "world");
            self.assert.equal(m.c, "item c");
        }

        function box_function() {
            var f = JSObject.box_function(function(var obj) { return "foo"; });
            self.assert.instance_of(f, class JSObject);
            self.assert.equal(f.get_type_name(), "Function");
            self.assert.equal(f(null), "foo");

            var g = JSObject.box_function(function(var obj, var a, var b) { return string(a) + string(b); });
            self.assert.equal(g(null, 1, 2), "12");
            var call = g.*"call";
            self.assert.equal(call(g, null, 3, 4), "34");
            var apply = g.*"apply";
            self.assert.equal(apply(g, null, [5, 6]), "56");
        }
    }
}

function main[main]()
{
    load_bytecode("rosella/test.pbc");
    load_bytecode("./stage0/runtime/jsobject.pbc");
    var(Rosella.Test.test)(class JavaScript.Test_JSObject);
}

