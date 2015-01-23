var util = require('util');
var cfdg2 = require('./cfdg2.js');

console.log(util.inspect(cfdg2.parse('\
startshape foobar\n\
size {s 10 23.3\n\
  x .42 y 0.9}\n\
rule myruleA 2 { foo {} }\n\
rule myruleB { bar {s 5} }\n\
'), {depth: null}));
