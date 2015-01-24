'use strict';

var parser = require('./parser')
var primTypes = require('../../primTypes');

var primNameType = {
  'SQUARE': primTypes.SQUARE,
  'CIRCLE': primTypes.CIRCLE,
  'TRIANGLE': primTypes.TRIANGLE,
};

// map adjustments from parsed form to internal form
function mapAdjustments(adjustments) {
  // TODO
}

function importGrammar(grammarStr) {
  var parseResult = parser.parse(grammarStr);

  var warnings = [];

  var shapeNameRules = {}; // map from shape name to list of rules, each rule an object
  var startShapeName;

  // transform parse result into internal representation
  // parse result is list of top-level "things" (directives, shape rules, etc.)
  for (var i = 0; i < parseResult.length; i++) {
    var thing = parseResult[i];

    if (thing.type === 'shaperule') {
      ruleObj = {
        weight: thing.weight,
        prims: [],
        nonprims: [],
      }

      // TODO: fill prims and nonprims from thing.replacements.
      // TODO: instead of .shape properties use .shapeName for now, will resolve later
      for (var j = 0; j < thing.replacements.length; j++) {
        var rep = thing.replacements[j];

        if (primNameType.hasOwnProperty(rep.name)) {
          // replacement is a primitive shape
          ruleObj.prims.push({
            adjs: mapAdjustments(rep.adjustments),
            primType: primNameType[rep.name],
          });
        } else {
          // replacement must be a non-primitive shape
          ruleObj.nonprims.push({
            adjs: mapAdjustments(rep.adjustments),
            shapeName: rep.name, // this is temporary, we resolve name to actual object later
          });
        }
      }

      // create list of rules for shape name if none yet
      if (!shapeNameRules.hasOwnProperty(thing.name)) {
        shapeNameRules[thing.name] = [];
      }

      // add rule to list
      shapeNameRules[thing.name].push(ruleObj);
    } else if (thing.type === 'startshape') {
      if (startShapeName) {
        warnings.push('Found multiple startshape directives, using first one');
      } else {
        startShapeName = thing.name;
      }
    } else if (thing.type === 'size') {
      // TODO
    } else {
      // TODO: throw better error
      throw "Unrecognized top-level thing";
    }
  }

  if (!startShapeName) {
    // TODO: throw better error
    throw "No startshape directive found";
  }

  // resolve name refs to make final grammar obj
  // TODO: I think we can just modify shapeNameRules in-place, resolving name refs

  if (!shapeNameRules.hasOwnProperty(startShapeName)) {
    // TODO: throw better error
    throw "Name specified by startshape directive not found";
  }

  var grammar = {
    startShape: shapeNameRules[startShapeName],
    // NOTE: we don't actually need to include map/list of shapes here since they are reachable via startShape
  };

  return {
    grammar: grammar,
    warnings: warnings,
  };
}

module.exports = {
  importGrammar: importGrammar,
};
