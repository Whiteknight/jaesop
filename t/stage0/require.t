// Test require
var t = new TestObject();
test_list([
    function() {
        var sys = require('sys');
        t.not_null(sys);
    },

    function() {
        var sys_a = require('sys');
        var sys_b = require('sys');
        t.same(sys_a, sys_b);
    }
]);
