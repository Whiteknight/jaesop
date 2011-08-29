load_bytecode("rosella/test.pbc");
Rosella.Test.test_list({
    test_1 : function(t) {
        t.assert.equal(0, 0);
    },
    test_2 : function(t) {
        t.assert.expect_fail(function() {
            t.assert.equal(0, 1);
        });
    },
    test_3 : function(t) {

    }
})

function a(x) { }
function b(y) { }
function c(z) { }
