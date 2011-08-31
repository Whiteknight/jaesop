namespace JavaScript[HLL] {
    extern function fetch_global;
    extern function store_global;
    namespace JSObject {
        extern function construct_jsobj;
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

        function test_prototype() {
            var object = fetch_global("Object");
            var x = JSObject.construct_jsobj(null, object);
            var toString = x.*"toString";
            self.assert.not_null(toString);
            self.assert.instance_of(toString, class JSObject);
            self.assert.equal(toString.get_type_name(), "Function");
        }
    }
}

function main[main]()
{
    load_bytecode("rosella/test.pbc");
    load_bytecode("./stage0/runtime/jsobject.pbc");
    var(Rosella.Test.test)(class JavaScript.Test_JSObject);
}

