var util = require('util');
var parser = require('./parser.js');

console.log(util.inspect(parser.parse('\
startshape foobar\n\
size {s 10 23.3\n\
  x .42 y 0.9}\n\
rule myruleA 2 { foo {} }\n\
rule myruleB { bar {s 5} }\n\
rule myruleB { bar {  s 6  } }\n\
rule myruleB { bar {s 5 x 10} }\n\
rule myruleB { bar {  size 5 x 10  } }\n\
rule myruleB { bar [[s 5 x 10]] }\n\
rule myruleB {}\n\
'), {depth: null}));
