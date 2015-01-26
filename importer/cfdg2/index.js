'use strict';

var parser = require('./parser')
var primTypes = require('../../primTypes');
var state = require('../../state');
var vec2A = require('../../vec2A');

var primNameType = {
  'SQUARE': primTypes.SQUARE,
  'CIRCLE': primTypes.CIRCLE,
  'TRIANGLE': primTypes.TRIANGLE,
};

// map adjustments from parsed form to internal form, a single combination of all adjustments
function mapAdjustments(parsedAdjustments) {
  var adjs = parsedAdjustments.adjList;

  // expando any multi-translation adjustments
  var newAdjs = [];
  for (var i = 0; i < adjs.length; i++) {
    var a = adjs[i];
    if (a.type === 'xyzTrans') {
      newAdjs.push({type: 'xTrans', x: a.x});
      newAdjs.push({type: 'yTrans', y: a.y});
      newAdjs.push({type: 'zTrans', z: a.z});
    } else if (a.type === 'xyTrans') {
      newAdjs.push({type: 'xTrans', x: a.x});
      newAdjs.push({type: 'yTrans', y: a.y});
    } else {
      newAdjs.push(a);
    }
  }
  adjs = newAdjs;

  if (!parsedAdjustments.ordered) {
    // only keep first adjustment of each type
    var newAdjs = [];
    var seenAdjTypes = {};
    for (var i = 0; i < adjs.length; i++) {
      var at = adjs[i].type;
      if (!seenAdjTypes.hasOwnProperty(at)) {
        newAdjs.push(adjs[i]);
        seenAdjTypes[at] = null;
      } else {
        // TODO: better info
        warnings.push('ignored adjustment');
      }
    }
    adjs = newAdjs;

    // sort adjustments into canonical order: translate/rotate/scale/skew/flip
    var ADJ_TYPE_ORDER = {
      'xTrans': 1,
      'yTrans': 2,
      'zTrans': 3,
      'rotate': 4,
      'scale': 5,
      'skew': 6,
      'flip': 7,
    };

    var taggedAdjs = [];
    for (var i = 0; i < adjs.length; i++) {
      taggedAdjs.push([ADJ_TYPE_ORDER[adjs[i].type], adjs[i]]);
    }
    taggedAdjs.sort();

    var newAdjs = [];
    for (var i = 0; i < taggedAdjs.length; i++) {
      newAdjs.push(taggedAdjs[i][1]);
    }
    adjs = newAdjs;
  }

  // combine adjustments
  var accum = state.adjIdent();

  for (var i = 0; i < adjs.length; i++) {
    var a = adjs[i];
    var r = state.adjIdent();
    if (a.type === 'xTrans') {
      r.xform = vec2A.mTrans(a.x, 0);
    } else if (a.type === 'yTrans') {
      r.xform = vec2A.mTrans(0, a.y);
    } else if (a.type === 'zTrans') {
      throw 'z coords not supported yet';
    } else if (a.type === 'rotate') {
      r.xform = vec2A.mRotDeg(a.degrees);
    } else if (a.type === 'scale') {
      r.xform = vec2A.mScale(a.x, a.y);
    } else if (a.type === 'flip') {
      // rotate, flip, rotate back
      r.xform = vec2A.mmMult(vec2A.mRotDeg(-a.degrees), vec2A.mmMult(vec2A.mScale(1, -1), vec2A.mRotDeg(a.degrees)));
    } else {
      throw 'Unhandled adjustment type ' + a.type;
    }

    accum = state.adjCombine(accum, r);
    // accum = state.adjCombine(r, accum);
  }

  return accum;
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
      var ruleObj = {
        weight: thing.weight,
        prims: [],
        nonprims: [],
      }

      // fill prims and nonprims from thing.replacements.
      for (var j = 0; j < thing.replacements.length; j++) {
        var rep = thing.replacements[j];

        if (primNameType.hasOwnProperty(rep.name)) {
          // replacement is a primitive shape
          ruleObj.prims.push({
            adj: mapAdjustments(rep.adjustments),
            primType: primNameType[rep.name],
          });
        } else {
          // replacement must be a non-primitive shape
          ruleObj.nonprims.push({
            adj: mapAdjustments(rep.adjustments),
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
      throw 'Unrecognized top-level thing';
    }
  }

  if (!startShapeName) {
    // TODO: throw better error
    throw 'No startshape directive found';
  }

  // resolve name refs to make final grammar obj
  for (var sn in shapeNameRules) {
    if (shapeNameRules.hasOwnProperty(sn)) {
      for (var i = 0; i < shapeNameRules[sn].length; i++) {
        for (var j = 0; j < shapeNameRules[sn][i].nonprims.length; j++) {
          var np = shapeNameRules[sn][i].nonprims[j];

          if (!shapeNameRules.hasOwnProperty(np.shapeName)) {
            // TODO: throw better error
            throw 'Referenced shape name not found';
          }

          np.shape = shapeNameRules[np.shapeName];
        }
      }
    }
  }

  if (!shapeNameRules.hasOwnProperty(startShapeName)) {
    // TODO: throw better error
    throw 'Name specified by startshape directive not found';
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
