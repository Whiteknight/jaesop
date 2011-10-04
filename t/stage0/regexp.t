var t = new TestObject();
if (RegExp == null)
    return;
test_list([
    function() {

        var r = new RegExp("a", "");
        var a = "--a--";
        var b = "--b--";

        var result = r.test(a);
        t.equal(result, 1);

        result = r.test(b);
        t.equal(result, 0);
    },

    function() {

        var r = new RegExp("a", "");
        var a = "--a--";
        var b = "--b--";

        r.compile("b", "");

        var result = r.test(a);
        t.equal(result, 0);

        result = r.test(b);
        t.equal(result, 1);
    }
]);

