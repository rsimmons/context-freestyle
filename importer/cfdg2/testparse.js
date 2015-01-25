var util = require('util');
var parser = require('./parser.js');
var importer = require('./');

testGrammar = '\
startshape myruleB\n\
size {s 10 23.3\n\
  x .42 y 0.9}\n\
rule myruleA 2 { myruleB {} }\n\
rule myruleB { myruleA {s 5} SQUARE {  }}\n\
rule myruleB { myruleA {  s 6  } }\n\
rule myruleB { myruleB {s 5 x 10} }\n\
rule myruleB 0.034 { myruleB {  size 5 x 10  } }\n\
rule myruleB { myruleB [[s 5 x 10]] }\n\
rule myruleB {}\n\
'

console.log('\nPARSE:\n', util.inspect(parser.parse(testGrammar), {depth: null}));
console.log('\nIMPORT:\n', util.inspect(importer.importGrammar(testGrammar), {depth: null}));
