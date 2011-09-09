// Test try/catch
var t = new TestObject();
test_list([
    function() {
        try {
        } catch (err) {
            t.fail("No exception, should not catch");
        }
    }
]);
