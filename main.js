'use strict';

var vec2A = require('./vec2A');
var cfdg2Importer = require('./importer/cfdg2');

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

// formulas for transforming CFDG brightness values to ours, where b is CDFG value:
// bMult = (1 - b)
// bOff = b > 0 ? b : 0

var testShape = [];

testShape.push({
  weight: 1,
  prims: [null],
  nonprims: [
    {
      adj: {
        xform: vec2A.mmMult(vec2A.mTrans(0, 1.2), vec2A.mmMult(vec2A.mRotDeg(1.5), vec2A.mScale(0.99, 0.99))),
        bMult: (1 - 0.009),
        bOff: 0.009,
      },
      shape: testShape,
    },
  ],
});

testShape.push({
  weight: 0.04,
  prims: [null],
  nonprims: [
    {
      adj: {
        xform: vec2A.mmMult(vec2A.mTrans(0, 1.2), vec2A.mmMult(vec2A.mRotDeg(1.5), vec2A.mScale(-0.9, 0.9))),
        bMult: 1,
        bOff: 0,
      },
      shape: testShape,
    },
    {
      adj: {
        xform: vec2A.mmMult(vec2A.mTrans(1.2, 1.2), vec2A.mmMult(vec2A.mRotDeg(-60), vec2A.mScale(0.8, 0.8))),
        bMult: 1,
        bOff: 0,
      },
      shape: testShape,
    },
    {
      adj: {
        xform: vec2A.mmMult(vec2A.mTrans(-1.2, 1.2), vec2A.mmMult(vec2A.mRotDeg(60), vec2A.mScale(-0.6, 0.6))),
        bMult: 1,
        bOff: 0,
      },
      shape: testShape,
    },
  ],
});

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
testShape = importTestShape;

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
        // TODO: ctx.save(), apply transform for this prim
        // TODO: draw r.prims[j]
        // HACK: for now, always just draw an un-transformed unit square
        var b = Math.floor(255*q.state.brightness);
        ctx.fillStyle = 'rgb(x,x,x)'.replace(/x/g, b.toString()); // faster than building with +
        ctx.fillRect(-0.5, -0.5, 1, 1);
        primCount += 1;
        // TODO: ctx.restore()
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

function redraw() {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  ctx.strokeStyle = 'none';
  // ctx.fillStyle = 'black';

  var initXform = vec2A.mmMult(vec2A.mTrans(0.5*canvas.width, canvas.height), vec2A.mScale(5, -5));

  drawShapeCanvas(testShape, initXform, ctx);
}

document.addEventListener('DOMContentLoaded', function() {
  redraw();
});

document.addEventListener('click', function() {
  redraw();
});
