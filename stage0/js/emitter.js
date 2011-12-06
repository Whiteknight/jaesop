function Emitter()
{
    this.indentLevel = 1;
    this.indent = new Array(this.indentLevel).join("    ");
    this.lines = [];
}
Emitter.prototype.increase_indent = function() {
    this.indentLevel++;
    this.indent = new Array(this.indentLevel).join("    ");
};
Emitter.prototype.decrease_indent = function() {
    this.indentLevel--;
    this.indent = new Array(this.indentLevel).join("    ");
};
Emitter.prototype.emit = function(s) {
    return this.indent + s;
}

exports.emitter = new Emitter();
