WX->load_bytecode("rosella/test.pbc");
WX->Rosella.Test.test_list(
{
    empty_object_literal : function(t) {
        var x = { };
        t.assert.not_null(x);
        //t.assert.instance_of(x, class JavaScript.JSObject);
    },

    object_properties : function(t) {
        var x = { a : "item a", b : "item b" };
        t.assert.equal(x.a, "item a");
        t.assert.equal(x["a"], "item a");
        t.assert.equal(x.b, "item b");
        t.assert.equal(x["b"], "item b");
    },

    attr_autocreate : function(t) {
        var x = {};
        x.foo = "test";
        t.assert.equal(x.foo, "test");
    }
});
