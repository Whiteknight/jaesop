var t = new TestObject();
test_list([
    function(t) {
        var x = { };
        t.assert.not_null(x);
        //t.assert.instance_of(x, class JavaScript.JSObject);
    },

    function(t) {
        var x = { a : "item a", b : "item b" };
        t.assert.equal(x.a, "item a");
        t.assert.equal(x["a"], "item a");
        t.assert.equal(x.b, "item b");
        t.assert.equal(x["b"], "item b");
    },

    function(t) {
        var x = {};
        x.foo = "test";
        t.assert.equal(x.foo, "test");
    }
]);
