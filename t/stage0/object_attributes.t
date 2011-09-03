var t = new TestObject();
test_list([
    function() {
        var x = { };
        t.not_null(x);
    },

    function() {
        var x = { a : "item a", b : "item b" };
        t.equal(x.a, "item a");
        t.equal(x["a"], "item a");
        t.equal(x.b, "item b");
        t.equal(x["b"], "item b");
    },

    function() {
        var x = {};
        x.foo = "test";
        t.equal(x.foo, "test");
    }
]);
