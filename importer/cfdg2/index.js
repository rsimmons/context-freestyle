'use strict';

var parser = require('./parser')

function importGrammar(grammarStr) {
  var parseResult = parser.parse(grammarStr);

  var warnings = [];

  var startShapeName;

  // transform parse result into internal representation
  // parse result is list of top-level "things" (directives, shape rules, etc.)
  for (var i = 0; i < parseResult.length; i++) {
    var thing = parseResult[i];

    if (thing.type === 'shaperule') {
      // TODO
    } else if (thing.type === 'startshape') {
      if (startShapeName) {
        warnings.push('Found multiple startshape directives, using first one');
      } else {
        startShapeName = thing.name;
      }
    } else if (thing.type === 'size') {
      // TODO
    } else {
      // TODO: throw error
    }
  }

  if (!startShapeName) {
    // TODO: throw error
  }
}

module.exports = {
  importGrammar: importGrammar,
};
