// Test to show we can do basic testing with Rosella
var t = new TestObject();
test_list([
    function() {
        t.equal(0, 0);
    },
    function() {
        t.expect_fail(function() {
            t.equal(0, 1);
        });
    },
    function() {
        t.is_null(null);
    }
]);
