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
