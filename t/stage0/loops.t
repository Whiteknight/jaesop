// Test loops
var t = new TestObject();
test_list([
    function() {
        var y = 0;
        for (var x = 1; x <= 8; x = x * 2) {
            y = y + x;
        }
        t.equal(y, 15);
    },

    function() {
        var y = 0;
        for (var x = 1; x <= 8; x = x * 2) {
            y = y + x;
            break;
        }
        t.equal(y, 1);
    },

    function() {
        var y = 0;
        for (var x = 1; x <= 8; x = x * 2) {
            continue;
            y = y + x;
        }
        t.equal(y, 0);
    }
]);
