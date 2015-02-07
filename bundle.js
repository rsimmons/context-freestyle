(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/russ/Projects/context-freestyle/importer/cfdg2/index.js":[function(require,module,exports){
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
    } else if (a.type === 'brightness') {
      r.bMult = 1 - a.amount;
      r.bOff = a.amount > 0 ? a.amount : 0;
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

},{"../../primTypes":"/Users/russ/Projects/context-freestyle/primTypes.js","../../state":"/Users/russ/Projects/context-freestyle/state.js","../../vec2A":"/Users/russ/Projects/context-freestyle/vec2A.js","./parser":"/Users/russ/Projects/context-freestyle/importer/cfdg2/parser.js"}],"/Users/russ/Projects/context-freestyle/importer/cfdg2/parser.js":[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = { type: "other", description: "whitespace" },
        peg$c1 = /^[ \t\n\r]/,
        peg$c2 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$c3 = { type: "other", description: "optional whitespace run" },
        peg$c4 = [],
        peg$c5 = peg$FAILED,
        peg$c6 = null,
        peg$c7 = "-",
        peg$c8 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c9 = /^[1-9]/,
        peg$c10 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c11 = /^[0-9]/,
        peg$c12 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c13 = ".",
        peg$c14 = { type: "literal", value: ".", description: "\".\"" },
        peg$c15 = function() { return parseFloat(text()); },
        peg$c16 = "0",
        peg$c17 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c18 = /^[_a-z]/i,
        peg$c19 = { type: "class", value: "[_a-z]i", description: "[_a-z]i" },
        peg$c20 = /^[_a-z0-9]/i,
        peg$c21 = { type: "class", value: "[_a-z0-9]i", description: "[_a-z0-9]i" },
        peg$c22 = function() { return text(); },
        peg$c23 = function(topthings) { return topthings; },
        peg$c24 = "startshape",
        peg$c25 = { type: "literal", value: "startshape", description: "\"startshape\"" },
        peg$c26 = function(name) { return {type: 'startshape', name: name}; },
        peg$c27 = "size",
        peg$c28 = { type: "literal", value: "size", description: "\"size\"" },
        peg$c29 = "{",
        peg$c30 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c31 = "s",
        peg$c32 = { type: "literal", value: "s", description: "\"s\"" },
        peg$c33 = "x",
        peg$c34 = { type: "literal", value: "x", description: "\"x\"" },
        peg$c35 = "y",
        peg$c36 = { type: "literal", value: "y", description: "\"y\"" },
        peg$c37 = "}",
        peg$c38 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c39 = function(width, height, xpos, ypos) { return {type: 'size', width: width, height: height, xpos: xpos, ypos: ypos}},
        peg$c40 = function(x, y, z) { return {type: 'xyzTrans', x: x, y: y, z: z}; },
        peg$c41 = function(x, y) { return {type: 'xyTrans', x: x, y: y}; },
        peg$c42 = function(x) { return {type: 'xTrans', x: x}; },
        peg$c43 = function(y) { return {type: 'yTrans', y: y}; },
        peg$c44 = "z",
        peg$c45 = { type: "literal", value: "z", description: "\"z\"" },
        peg$c46 = function(z) { return {type: 'zTrans', z: z}; },
        peg$c47 = function(xscale, yscale) { return {type: 'scale', x: xscale, y: yscale}; },
        peg$c48 = function(scale) { return {type: 'scale', x: scale, y: scale}; },
        peg$c49 = "rotate",
        peg$c50 = { type: "literal", value: "rotate", description: "\"rotate\"" },
        peg$c51 = "r",
        peg$c52 = { type: "literal", value: "r", description: "\"r\"" },
        peg$c53 = function(degrees) { return {type: 'rotate', degrees: degrees}; },
        peg$c54 = "flip",
        peg$c55 = { type: "literal", value: "flip", description: "\"flip\"" },
        peg$c56 = "f",
        peg$c57 = { type: "literal", value: "f", description: "\"f\"" },
        peg$c58 = function(degrees) { return {type: 'flip', degrees: degrees}; },
        peg$c59 = "brightness",
        peg$c60 = { type: "literal", value: "brightness", description: "\"brightness\"" },
        peg$c61 = "b",
        peg$c62 = { type: "literal", value: "b", description: "\"b\"" },
        peg$c63 = function(amount) { return {type: 'brightness', amount: amount}; },
        peg$c64 = function(adj) { return adj; },
        peg$c65 = function(first_adj, rest_adjs) { return [first_adj].concat(rest_adjs); },
        peg$c66 = function() { return { ordered: false, adjList: []}; },
        peg$c67 = function(adjList) { return { ordered: false, adjList: adjList}; },
        peg$c68 = "[[",
        peg$c69 = { type: "literal", value: "[[", description: "\"[[\"" },
        peg$c70 = "]]",
        peg$c71 = { type: "literal", value: "]]", description: "\"]]\"" },
        peg$c72 = function() { return { ordered: true, adjList: []}; },
        peg$c73 = function(adjList) { return { ordered: true, adjList: adjList}; },
        peg$c74 = function(name, adjustments) { return {name: name, adjustments: adjustments}; },
        peg$c75 = "rule",
        peg$c76 = { type: "literal", value: "rule", description: "\"rule\"" },
        peg$c77 = function(name, weight, replacements) { return {type: 'shaperule', name: name, weight: weight, replacements: replacements}; },
        peg$c78 = function(name, replacements) { return {type: 'shaperule', name: name, weight: 1, replacements: replacements}; },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parsegrammarfile();

      return s0;
    }

    function peg$parsews() {
      var s0, s1;

      peg$silentFails++;
      if (peg$c1.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c2); }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c0); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      s1 = peg$parsews();
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parsews();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c3); }
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s1 = peg$c7;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c6;
      }
      if (s1 !== peg$FAILED) {
        if (peg$c9.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c10); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c11.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c12); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c11.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c12); }
            }
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s4 = peg$c13;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c14); }
            }
            if (s4 !== peg$FAILED) {
              s5 = [];
              if (peg$c11.test(input.charAt(peg$currPos))) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c12); }
              }
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                if (peg$c11.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c12); }
                }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c15();
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
          s1 = peg$c7;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s1 === peg$FAILED) {
          s1 = peg$c6;
        }
        if (s1 !== peg$FAILED) {
          if (peg$c9.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c10); }
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            if (peg$c11.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c12); }
            }
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              if (peg$c11.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c12); }
              }
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c15();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 45) {
            s1 = peg$c7;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s1 === peg$FAILED) {
            s1 = peg$c6;
          }
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 48) {
              s2 = peg$c16;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c17); }
            }
            if (s2 === peg$FAILED) {
              s2 = peg$c6;
            }
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s3 = peg$c13;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c14); }
              }
              if (s3 !== peg$FAILED) {
                s4 = [];
                if (peg$c11.test(input.charAt(peg$currPos))) {
                  s5 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c12); }
                }
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  if (peg$c11.test(input.charAt(peg$currPos))) {
                    s5 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c12); }
                  }
                }
                if (s4 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c15();
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        }
      }

      return s0;
    }

    function peg$parseshapename() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (peg$c18.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c19); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c20.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c21); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c20.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c21); }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c22();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }

      return s0;
    }

    function peg$parsegrammarfile() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsetoplevelthing();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsetoplevelthing();
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c23(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }

      return s0;
    }

    function peg$parsetoplevelthing() {
      var s0;

      s0 = peg$parsestartshape_directive();
      if (s0 === peg$FAILED) {
        s0 = peg$parsesize_directive();
        if (s0 === peg$FAILED) {
          s0 = peg$parseshaperule();
        }
      }

      return s0;
    }

    function peg$parsestartshape_directive() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 10) === peg$c24) {
        s1 = peg$c24;
        peg$currPos += 10;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c25); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsews();
          }
        } else {
          s2 = peg$c5;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseshapename();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c26(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }

      return s0;
    }

    function peg$parsesize_directive() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c27) {
        s1 = peg$c27;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 123) {
            s3 = peg$c29;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c30); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 115) {
                s5 = peg$c31;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c32); }
              }
              if (s5 !== peg$FAILED) {
                s6 = [];
                s7 = peg$parsews();
                if (s7 !== peg$FAILED) {
                  while (s7 !== peg$FAILED) {
                    s6.push(s7);
                    s7 = peg$parsews();
                  }
                } else {
                  s6 = peg$c5;
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsenumber();
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    s9 = peg$parsews();
                    if (s9 !== peg$FAILED) {
                      while (s9 !== peg$FAILED) {
                        s8.push(s9);
                        s9 = peg$parsews();
                      }
                    } else {
                      s8 = peg$c5;
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parsenumber();
                      if (s9 !== peg$FAILED) {
                        s10 = [];
                        s11 = peg$parsews();
                        if (s11 !== peg$FAILED) {
                          while (s11 !== peg$FAILED) {
                            s10.push(s11);
                            s11 = peg$parsews();
                          }
                        } else {
                          s10 = peg$c5;
                        }
                        if (s10 !== peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 120) {
                            s11 = peg$c33;
                            peg$currPos++;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c34); }
                          }
                          if (s11 !== peg$FAILED) {
                            s12 = [];
                            s13 = peg$parsews();
                            if (s13 !== peg$FAILED) {
                              while (s13 !== peg$FAILED) {
                                s12.push(s13);
                                s13 = peg$parsews();
                              }
                            } else {
                              s12 = peg$c5;
                            }
                            if (s12 !== peg$FAILED) {
                              s13 = peg$parsenumber();
                              if (s13 !== peg$FAILED) {
                                s14 = [];
                                s15 = peg$parsews();
                                if (s15 !== peg$FAILED) {
                                  while (s15 !== peg$FAILED) {
                                    s14.push(s15);
                                    s15 = peg$parsews();
                                  }
                                } else {
                                  s14 = peg$c5;
                                }
                                if (s14 !== peg$FAILED) {
                                  if (input.charCodeAt(peg$currPos) === 121) {
                                    s15 = peg$c35;
                                    peg$currPos++;
                                  } else {
                                    s15 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c36); }
                                  }
                                  if (s15 !== peg$FAILED) {
                                    s16 = [];
                                    s17 = peg$parsews();
                                    if (s17 !== peg$FAILED) {
                                      while (s17 !== peg$FAILED) {
                                        s16.push(s17);
                                        s17 = peg$parsews();
                                      }
                                    } else {
                                      s16 = peg$c5;
                                    }
                                    if (s16 !== peg$FAILED) {
                                      s17 = peg$parsenumber();
                                      if (s17 !== peg$FAILED) {
                                        s18 = peg$parse_();
                                        if (s18 !== peg$FAILED) {
                                          if (input.charCodeAt(peg$currPos) === 125) {
                                            s19 = peg$c37;
                                            peg$currPos++;
                                          } else {
                                            s19 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c38); }
                                          }
                                          if (s19 !== peg$FAILED) {
                                            s20 = peg$parse_();
                                            if (s20 !== peg$FAILED) {
                                              peg$reportedPos = s0;
                                              s1 = peg$c39(s7, s9, s13, s17);
                                              s0 = s1;
                                            } else {
                                              peg$currPos = s0;
                                              s0 = peg$c5;
                                            }
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c5;
                                          }
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c5;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c5;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c5;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c5;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c5;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c5;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c5;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c5;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c5;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c5;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c5;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c5;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }

      return s0;
    }

    function peg$parseshape_adjustment() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 120) {
        s1 = peg$c33;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c34); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsews();
          }
        } else {
          s2 = peg$c5;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsenumber();
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsews();
            if (s5 !== peg$FAILED) {
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parsews();
              }
            } else {
              s4 = peg$c5;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsenumber();
              if (s5 !== peg$FAILED) {
                s6 = [];
                s7 = peg$parsews();
                if (s7 !== peg$FAILED) {
                  while (s7 !== peg$FAILED) {
                    s6.push(s7);
                    s7 = peg$parsews();
                  }
                } else {
                  s6 = peg$c5;
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsenumber();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c40(s3, s5, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c5;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 120) {
          s1 = peg$c33;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c34); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsews();
          if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parsews();
            }
          } else {
            s2 = peg$c5;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsenumber();
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parsews();
              if (s5 !== peg$FAILED) {
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = peg$parsews();
                }
              } else {
                s4 = peg$c5;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsenumber();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c41(s3, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 120) {
            s1 = peg$c33;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c34); }
          }
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$parsews();
            if (s3 !== peg$FAILED) {
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parsews();
              }
            } else {
              s2 = peg$c5;
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parsenumber();
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c42(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 121) {
              s1 = peg$c35;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c36); }
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$parsews();
              if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  s3 = peg$parsews();
                }
              } else {
                s2 = peg$c5;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parsenumber();
                if (s3 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c43(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 122) {
                s1 = peg$c44;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c45); }
              }
              if (s1 !== peg$FAILED) {
                s2 = [];
                s3 = peg$parsews();
                if (s3 !== peg$FAILED) {
                  while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    s3 = peg$parsews();
                  }
                } else {
                  s2 = peg$c5;
                }
                if (s2 !== peg$FAILED) {
                  s3 = peg$parsenumber();
                  if (s3 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c46(s3);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c5;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 4) === peg$c27) {
                  s1 = peg$c27;
                  peg$currPos += 4;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c28); }
                }
                if (s1 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 115) {
                    s1 = peg$c31;
                    peg$currPos++;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c32); }
                  }
                }
                if (s1 !== peg$FAILED) {
                  s2 = [];
                  s3 = peg$parsews();
                  if (s3 !== peg$FAILED) {
                    while (s3 !== peg$FAILED) {
                      s2.push(s3);
                      s3 = peg$parsews();
                    }
                  } else {
                    s2 = peg$c5;
                  }
                  if (s2 !== peg$FAILED) {
                    s3 = peg$parsenumber();
                    if (s3 !== peg$FAILED) {
                      s4 = [];
                      s5 = peg$parsews();
                      if (s5 !== peg$FAILED) {
                        while (s5 !== peg$FAILED) {
                          s4.push(s5);
                          s5 = peg$parsews();
                        }
                      } else {
                        s4 = peg$c5;
                      }
                      if (s4 !== peg$FAILED) {
                        s5 = peg$parsenumber();
                        if (s5 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c47(s3, s5);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c5;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c5;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c5;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c5;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 4) === peg$c27) {
                    s1 = peg$c27;
                    peg$currPos += 4;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c28); }
                  }
                  if (s1 === peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 115) {
                      s1 = peg$c31;
                      peg$currPos++;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c32); }
                    }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = [];
                    s3 = peg$parsews();
                    if (s3 !== peg$FAILED) {
                      while (s3 !== peg$FAILED) {
                        s2.push(s3);
                        s3 = peg$parsews();
                      }
                    } else {
                      s2 = peg$c5;
                    }
                    if (s2 !== peg$FAILED) {
                      s3 = peg$parsenumber();
                      if (s3 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c48(s3);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c5;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c5;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c5;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 6) === peg$c49) {
                      s1 = peg$c49;
                      peg$currPos += 6;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c50); }
                    }
                    if (s1 === peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 114) {
                        s1 = peg$c51;
                        peg$currPos++;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c52); }
                      }
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = [];
                      s3 = peg$parsews();
                      if (s3 !== peg$FAILED) {
                        while (s3 !== peg$FAILED) {
                          s2.push(s3);
                          s3 = peg$parsews();
                        }
                      } else {
                        s2 = peg$c5;
                      }
                      if (s2 !== peg$FAILED) {
                        s3 = peg$parsenumber();
                        if (s3 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c53(s3);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c5;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c5;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c5;
                    }
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 4) === peg$c54) {
                        s1 = peg$c54;
                        peg$currPos += 4;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c55); }
                      }
                      if (s1 === peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 102) {
                          s1 = peg$c56;
                          peg$currPos++;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c57); }
                        }
                      }
                      if (s1 !== peg$FAILED) {
                        s2 = [];
                        s3 = peg$parsews();
                        if (s3 !== peg$FAILED) {
                          while (s3 !== peg$FAILED) {
                            s2.push(s3);
                            s3 = peg$parsews();
                          }
                        } else {
                          s2 = peg$c5;
                        }
                        if (s2 !== peg$FAILED) {
                          s3 = peg$parsenumber();
                          if (s3 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c58(s3);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c5;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c5;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c5;
                      }
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 10) === peg$c59) {
                          s1 = peg$c59;
                          peg$currPos += 10;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c60); }
                        }
                        if (s1 === peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 98) {
                            s1 = peg$c61;
                            peg$currPos++;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c62); }
                          }
                        }
                        if (s1 !== peg$FAILED) {
                          s2 = [];
                          s3 = peg$parsews();
                          if (s3 !== peg$FAILED) {
                            while (s3 !== peg$FAILED) {
                              s2.push(s3);
                              s3 = peg$parsews();
                            }
                          } else {
                            s2 = peg$c5;
                          }
                          if (s2 !== peg$FAILED) {
                            s3 = peg$parsenumber();
                            if (s3 !== peg$FAILED) {
                              peg$reportedPos = s0;
                              s1 = peg$c63(s3);
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c5;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c5;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c5;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsespaced_shape_adjustment() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsews();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsews();
        }
      } else {
        s1 = peg$c5;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseshape_adjustment();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c64(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }

      return s0;
    }

    function peg$parseshape_adjustments_inner() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseshape_adjustment();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsespaced_shape_adjustment();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsespaced_shape_adjustment();
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c65(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }

      return s0;
    }

    function peg$parseshape_adjustments() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c29;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c30); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 125) {
            s3 = peg$c37;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c38); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c66();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
          s1 = peg$c29;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c30); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseshape_adjustments_inner();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 125) {
                  s5 = peg$c37;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c38); }
                }
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c67(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c68) {
            s1 = peg$c68;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c69); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c70) {
                s3 = peg$c70;
                peg$currPos += 2;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c71); }
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c72();
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c68) {
              s1 = peg$c68;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c69); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseshape_adjustments_inner();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  if (s4 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c70) {
                      s5 = peg$c70;
                      peg$currPos += 2;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c71); }
                    }
                    if (s5 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c73(s3);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c5;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c5;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          }
        }
      }

      return s0;
    }

    function peg$parseshape_replacement() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parseshapename();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseshape_adjustments();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c74(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }

      return s0;
    }

    function peg$parseshaperule() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c75) {
        s1 = peg$c75;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c76); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsews();
          }
        } else {
          s2 = peg$c5;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseshapename();
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsews();
            if (s5 !== peg$FAILED) {
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parsews();
              }
            } else {
              s4 = peg$c5;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsenumber();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 123) {
                    s7 = peg$c29;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c30); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      s9 = [];
                      s10 = peg$parseshape_replacement();
                      while (s10 !== peg$FAILED) {
                        s9.push(s10);
                        s10 = peg$parseshape_replacement();
                      }
                      if (s9 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                          s10 = peg$c37;
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c38); }
                        }
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parse_();
                          if (s11 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c77(s3, s5, s9);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c5;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c5;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c5;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c5;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c5;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c5;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 4) === peg$c75) {
          s1 = peg$c75;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c76); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsews();
          if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parsews();
            }
          } else {
            s2 = peg$c5;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseshapename();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 123) {
                  s5 = peg$c29;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c30); }
                }
                if (s5 !== peg$FAILED) {
                  s6 = peg$parse_();
                  if (s6 !== peg$FAILED) {
                    s7 = [];
                    s8 = peg$parseshape_replacement();
                    while (s8 !== peg$FAILED) {
                      s7.push(s8);
                      s8 = peg$parseshape_replacement();
                    }
                    if (s7 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 125) {
                        s8 = peg$c37;
                        peg$currPos++;
                      } else {
                        s8 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c38); }
                      }
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parse_();
                        if (s9 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c78(s3, s7);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c5;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c5;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c5;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c5;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c5;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c5;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c5;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c5;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c5;
        }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{}],"/Users/russ/Projects/context-freestyle/main.js":[function(require,module,exports){
'use strict';

var vec2A = require('./vec2A');
var cfdg2Importer = require('./importer/cfdg2');
var primTypes = require('./primTypes');

var TWOPI = 2*Math.PI;
var TRI_TOP_Y = 1/Math.sqrt(3);
var TRI_SIDE_Y = -Math.sqrt(3)/6;

// based on this from http://blog.hvidtfeldts.net/index.php/2008/12/grammars-for-generative-art-part-ii/
// order of xforms in rules is ignored, always made to be translate/rotate/scale/skew/flip
var importTestShape = cfdg2Importer.importGrammar('\
startshape SEED1\n\
\n\
rule SEED1 {\n\
 SQUARE{}\n\
 SEED1 {y 1.2 size 0.99 rotate 1.5 brightness 0.009}\n\
}\n\
\n\
rule SEED1 0.04 {\n\
 SQUARE{}\n\
 SEED1 {y 1.2 s 0.9 r 1.5 flip 90}\n\
 SEED1 {y 1.2 x 1.2 s 0.8 r -60}\n\
 SEED1 {y 1.2 x -1.2 s 0.6 r 60 flip 90}\n\
}\n\
').grammar.startShape;

var currentShape;

function pickRule(shape) {
  var total = 0;
  for (var i = 0; i < shape.length; i++) {
    total += shape[i].weight;
  }
  var pick = Math.random()*total;
  for (var i = 0; i < shape.length; i++) {
    pick -= shape[i].weight;
    if (pick < 0) {
      return shape[i];
    }
  }
  return shape[0];
}

function drawShapeCanvas(startShape, initXform, ctx) {
  var MAX_DEPTH = 300;

  var initState = {
    xform: initXform,
    brightness: 0,
  };
  var queue = [{
    state: initState,
    shape: startShape,
  }];

  var depth = 0;
  var primCount = 0;
  var pruneCount = 0;

  var startMilliseconds = performance.now();
  while (true) {
    if (queue.length == 0) {
      console.log('queue emptied');
      break;
    } else if (depth > MAX_DEPTH) {
      console.log('hit max depth, queue size', queue.length);
      break;
    }

    var nextQueue = [];

    for (var i = 0; i < queue.length; i++) {
      var q = queue[i];

      var r = pickRule(q.shape);

      var qsx = q.state.xform;

      ctx.setTransform(qsx[0], qsx[1], qsx[2], qsx[3], qsx[4], qsx[5]);
      for (var j = 0; j < r.prims.length; j++) {
        var prim = r.prims[j];
        var b = Math.floor(255*q.state.brightness);
        ctx.fillStyle = 'rgb(x,x,x)'.replace(/x/g, b.toString()); // faster than building with +

        switch (prim.primType) {
          case primTypes.SQUARE:
            ctx.fillRect(-0.5, -0.5, 1, 1);
            break;

          case primTypes.CIRCLE:
            ctx.beginPath();
            ctx.arc(0, 0, 0.5, 0, TWOPI);
            ctx.fill();
            break;

          case primTypes.TRIANGLE:
            ctx.beginPath();
            ctx.moveTo(0, TRI_TOP_Y);
            ctx.lineTo(0.5, TRI_SIDE_Y);
            ctx.lineTo(-0.5, TRI_SIDE_Y);
            ctx.fill();
            break;

          default:
            throw "unsupported primitive type";
        }

        primCount += 1;
      }

      for (var j = 0; j < r.nonprims.length; j++) {
        var np = r.nonprims[j];
        var adj = np.adj;
        var combinedXform = vec2A.mmMult(q.state.xform, adj.xform);

        if (vec2A.mNormSq(combinedXform) > 0.3) {
          var newState = {
            xform: combinedXform,
            brightness: adj.bMult*q.state.brightness + adj.bOff,
          };

          nextQueue.push({
            state: newState,
            shape: np.shape,
          });
        } else {
          pruneCount += 1;
        }
      }
    }

    queue = nextQueue;
    depth += 1;
  }
  var elapsedTime = 0.001*(performance.now() - startMilliseconds);

  console.log('primitives drawn:', primCount);
  console.log('branches pruned:', pruneCount);
  console.log('primitives per second:', Math.floor(primCount/elapsedTime));
}

function resizeCanvas() {
  var canvas = document.getElementById('canvas');
  var cParent = canvas.parentNode;
  canvas.width = cParent.clientWidth;
  canvas.height = cParent.clientHeight;
  // canvas.width = document.documentElement.clientWidth;
  // canvas.height = document.documentElement.clientHeight;
  console.log('resized canvas to', canvas.width, 'by', canvas.height);
}

function redraw() {
  var canvas = document.getElementById('canvas');

  var ctx = canvas.getContext('2d');

  // clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'none';
  // ctx.fillStyle = 'black';

  // var initXform = vec2A.mmMult(vec2A.mTrans(0.5*canvas.width, canvas.height), vec2A.mScale(5, -5));
  var initXform = vec2A.mmMult(vec2A.mTrans(0.5*canvas.width, 0.5*canvas.height), vec2A.mScale(5, -5));

  drawShapeCanvas(currentShape, initXform, ctx);
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('canvas').addEventListener('click', function() {
    redraw();
  });

  window.addEventListener('resize', function() {
    resizeCanvas();
  }, false);

  document.getElementById('button-run').addEventListener('click', function() {
    var code = document.getElementById('code-textarea').value;
    var parseResult = cfdg2Importer.importGrammar(code);
    currentShape = parseResult.grammar.startShape;
    redraw();
  }, false);

  resizeCanvas();

  currentShape = importTestShape;
  redraw();
});


},{"./importer/cfdg2":"/Users/russ/Projects/context-freestyle/importer/cfdg2/index.js","./primTypes":"/Users/russ/Projects/context-freestyle/primTypes.js","./vec2A":"/Users/russ/Projects/context-freestyle/vec2A.js"}],"/Users/russ/Projects/context-freestyle/primTypes.js":[function(require,module,exports){
'use strict';

module.exports = {
  SQUARE: 1,
  CIRCLE: 2,
  TRIANGLE: 3,
};

},{}],"/Users/russ/Projects/context-freestyle/state.js":[function(require,module,exports){
 'use strict';

var vec2A = require('./vec2A');

module.exports = {
  adjIdent: function() {
    return {
      xform: vec2A.mIdent(),
      bMult: 1,
      bOff: 0,
    };
  },

  adjCombine: function(a, b) {
    return {
      xform: vec2A.mmMult(a.xform, b.xform),
      bMult: a.bMult*b.bMult,
      bOff: a.bMult*b.bOff + a.bOff,
    };
  },
};

},{"./vec2A":"/Users/russ/Projects/context-freestyle/vec2A.js"}],"/Users/russ/Projects/context-freestyle/vec2A.js":[function(require,module,exports){
'use strict';

module.exports = {
  mIdent: function() {
    return [1, 0, 0, 1, 0, 0];
  },

  mTrans: function(x, y) {
    return [1, 0, 0, 1, x, y];
  },

  mRotDeg: function(theta) {
    var rad = theta*(Math.PI/180.0);
    var c = Math.cos(rad);
    var s = Math.sin(rad);
    return [c, s, -s, c, 0, 0];
  },

  mScale: function(sx, sy) {
    return [sx, 0, 0, sy, 0, 0];
  },

  mmMult: function(a, b) {
    return [
      a[0]*b[0] + a[2]*b[1],
      a[1]*b[0] + a[3]*b[1],
      a[0]*b[2] + a[2]*b[3],
      a[1]*b[2] + a[3]*b[3],
      a[0]*b[4] + a[2]*b[5] + a[4],
      a[1]*b[4] + a[3]*b[5] + a[5],
    ];
  },

  mNormSq: function(m) {
    return m[0]*m[0] + m[1]*m[1] + m[2]*m[2] + m[3]*m[3];
  },
};

},{}]},{},["/Users/russ/Projects/context-freestyle/main.js"]);
