(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/russ/Projects/context-freestyle/main.js":[function(require,module,exports){
'use strict';

var vec2A = require('./vec2A');

// based on this from http://blog.hvidtfeldts.net/index.php/2008/12/grammars-for-generative-art-part-ii/
// order of xforms in rules is ignored, always made to be translate/rotate/scale/skew/flip
/*
startshape SEED1

rule SEED1 {
 SQUARE{}
 SEED1 {y 1.2 size 0.99 rotate 1.5 brightness 0.009}
}

rule SEED1 0.04 {
 SQUARE{}
 SEED1 {y 1.2 s 0.9 r 1.5 flip 90}
 SEED1 {y 1.2 x 1.2 s 0.8 r -60}
 SEED1 {y 1.2 x -1.2 s 0.6 r 60  flip 90}
}
*/

// {{1, 0, 0}, {0, 1, 1.2}, {0, 0, 1}} . {{0.999657, -0.0262, 0}, {0.0262, 0.999657, 0}, {0, 0, 1}} . {{0.99, 0, 0}, {0, 0.99, 0}, {0, 0, 1}}
// {{1, 0, 0}, {0, 1, 1.2}, {0, 0, 1}} . {{cos(1.5*π/180), -sin(1.5*π/180)}, {sin(1.5*π/180), cos(1.5*π/180)}} . {{0.99, 0, 0}, {0, 0.99, 0}, {0, 0, 1}}

var testShape = [];

testShape.push({
  weight: 1,
  prims: [null],
  nonprims: [
    {xform: vec2A.mmMult(vec2A.mScale(0.99, 0.99), vec2A.mmMult(vec2A.mRotDeg(1.5), vec2A.mTrans(0, 1.2))), shape: testShape},
  ],
});

testShape.push({
  weight: 0.04,
  prims: [null],
  nonprims: [
    {xform: vec2A.mmMult(vec2A.mScale(-0.9, 0.9), vec2A.mmMult(vec2A.mRotDeg(1.5), vec2A.mTrans(0, 1.2))), shape: testShape},
    {xform: vec2A.mmMult(vec2A.mScale(0.8, 0.8), vec2A.mmMult(vec2A.mRotDeg(-60), vec2A.mTrans(1.2, 1.2))), shape: testShape},
    {xform: vec2A.mmMult(vec2A.mScale(-0.6, 0.6), vec2A.mmMult(vec2A.mRotDeg(60), vec2A.mTrans(-1.2, 1.2))), shape: testShape},
  ],
});

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
  };
  var queue = [{
    state: initState,
    shape: startShape,
  }];

  var depth = 0;
  var primCount = 0;
  var pruneCount = 0;

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
        // TODO: ctx.save(), apply transform for this prim
        // TODO: draw r.prims[j]
        // HACK: for now, always just draw an un-transformed unit square
        ctx.fillRect(-0.5, -0.5, 1, 1);
        primCount += 1;
        // TODO: ctx.restore()
      }

      for (var j = 0; j < r.nonprims.length; j++) {
        var np = r.nonprims[j];
        var combinedXform = vec2A.mmMult(q.state.xform, np.xform);

        if (vec2A.mNormSq(combinedXform) > 0.5) {
          nextQueue.push({state: {xform: combinedXform}, shape: np.shape});
        } else {
          pruneCount += 1;
        }
      }
    }

    queue = nextQueue;
    depth += 1;
  }

  console.log('primitives drawn:', primCount);
  console.log('branches pruned:', pruneCount);
}

document.addEventListener('DOMContentLoaded', function() {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  ctx.strokeStyle = 'none';
  ctx.fillStyle = 'black';

  var initXform = vec2A.mmMult(vec2A.mTrans(0.5*canvas.width, canvas.height), vec2A.mScale(5, -5));

  drawShapeCanvas(testShape, initXform, ctx);
});

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
