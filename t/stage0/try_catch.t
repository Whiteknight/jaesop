// Test try/catch and throw
var t = new TestObject();
test_list([
    function() {
        try {
        } catch (err) {
            t.fail("No exception, should not catch");
        }
    },
    function() {
        var is_ok = 1;
        try {
            throw "exception message";
            is_ok = 0;
        } catch (err) {
            t.equal(err, "exception message");
        }
        t.equal(is_ok, 1);
    }
]);
