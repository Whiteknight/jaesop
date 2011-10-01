var t = new TestObject();
test_list([
    function() {
        var x = 1;
        switch(x) {
            case 3:
                t.fail();
            case 2:
                t.fail();
            case 1:
                break;
            default:
                t.fail();
        }
    },

    function() {
        var x = 1;
        switch(x) {
            case 3:
                t.fail();
            case 2:
                t.fail();
            default:
        }
    }
]);
