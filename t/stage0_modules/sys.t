// Test sys module
var t = new TestObject();
test_list([
    function() {
        t.output_is(function() {
            var sys = require('sys');
            sys.puts("Hello world!");
        }, "Hello world!\n");
    }
]);
