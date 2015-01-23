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
