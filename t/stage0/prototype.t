var t = new TestObject();

function Foo() {
    this.a = "foo a";
}
Foo.prototype.b = "foo b";

function Bar() {
}
Bar.prototype.b = "bar b";

test_list([
    function() {
        var foo = new Foo();
        var foo_a = foo.a;
        t.equal(foo_a, "foo a");
        var foo_b = foo.b;
        t.equal(foo_b, "foo b");
    },

    function() {
        var bar = new Bar();
        var bar_b = bar.b;
        t.equal(bar_b, "bar b");
        var bar_a = bar.a;
        t.is_null(bar_a);
    },

    function() {
        var bar_a = Bar.prototype.a;
        t.is_null(bar_a);
    }
]);




