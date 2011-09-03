load_bytecode("rosella/test.pbc");
load_bytecode("./stage0/runtime/jsobject.pbc");
WX->using Rosella.Test.test_list;

// Test to show we can do basic testing with Rosella
test_list({
    test_1 : function(t) {
        t.assert.equal(0, 0);
    },
    test_2 : function(t) {
        t.assert.expect_fail(function() {
            t.assert.equal(0, 1);
        });
    },
    test_3 : function(t) {
        t.assert.is_null(null);
    }
});

