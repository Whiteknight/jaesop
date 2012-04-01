# Jaesop Stage 0 Compiler

The purpose of the stage 0 compiler is to be a suitable bootstrapping tool
for writing a JavaScript compiler in JavaScript. Stage 0 does not intend to
be complete or perfect. It will be a subset, missing certain features. Some
of these features will be ommitted because they are too hard and are not
necessary. Others will be purposelly excluded.

Here we list the items which are purposefully omitted from the compiler and
the items which are intended to be included but which have not yet been
implemented.

## Known Feature Omissions:

The stage 0 compiler is not a full or complete JavaScript compiler. Some
features have been purposefully omitted and will not be supported:

* `with` will not be supported
* Primitive strings do not autobox to String. Must use `newString(...)`
* Method chaining. This will not work: `foo.bar().baz()`. You must break method
  chains up using intermediate values: `var a = foo.bar(); a.baz();`

## Features Not Yet Implemented:

This is a list of items which are yet to be done, but might be worth
implementing before stage 0 is called "complete" and usable for stage 1:

* methods on Object
* methods on Array
* methods on String
* pcre bindings and RegExpExpr
* Handling empty statements

## Features to Maybe Implement:

These features might or might not need to be implemented:

* `arguments`
