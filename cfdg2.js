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
        peg$c6 = /^[1-9]/,
        peg$c7 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c8 = /^[0-9]/,
        peg$c9 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c10 = ".",
        peg$c11 = { type: "literal", value: ".", description: "\".\"" },
        peg$c12 = function() { return parseFloat(text()); },
        peg$c13 = null,
        peg$c14 = "0",
        peg$c15 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c16 = function(topthings) { return topthings; },
        peg$c17 = "startshape",
        peg$c18 = { type: "literal", value: "startshape", description: "\"startshape\"" },
        peg$c19 = function(name) { return {type: 'startshape', name: name}; },
        peg$c20 = "size",
        peg$c21 = { type: "literal", value: "size", description: "\"size\"" },
        peg$c22 = "{",
        peg$c23 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c24 = "s",
        peg$c25 = { type: "literal", value: "s", description: "\"s\"" },
        peg$c26 = "x",
        peg$c27 = { type: "literal", value: "x", description: "\"x\"" },
        peg$c28 = "y",
        peg$c29 = { type: "literal", value: "y", description: "\"y\"" },
        peg$c30 = "}",
        peg$c31 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c32 = function(width, height, xpos, ypos) { return {type: 'size', width: width, height: height, xpos: xpos, ypos: ypos}},
        peg$c33 = /^[_a-z]/i,
        peg$c34 = { type: "class", value: "[_a-z]i", description: "[_a-z]i" },
        peg$c35 = /^[_a-z0-9]/i,
        peg$c36 = { type: "class", value: "[_a-z0-9]i", description: "[_a-z0-9]i" },
        peg$c37 = function() { return text(); },

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
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (peg$c6.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c7); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c8.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              if (peg$c8.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c9); }
              }
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c12();
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
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (peg$c6.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c7); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (peg$c8.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c9); }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c8.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c12();
            s0 = s1;
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
          if (input.charCodeAt(peg$currPos) === 48) {
            s1 = peg$c14;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
          if (s1 === peg$FAILED) {
            s1 = peg$c13;
          }
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s2 = peg$c10;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c11); }
            }
            if (s2 !== peg$FAILED) {
              s3 = [];
              if (peg$c8.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c9); }
              }
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                if (peg$c8.test(input.charAt(peg$currPos))) {
                  s4 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c9); }
                }
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c12();
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
          s1 = peg$c16(s2);
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
      }

      return s0;
    }

    function peg$parsestartshape_directive() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 10) === peg$c17) {
        s1 = peg$c17;
        peg$currPos += 10;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c18); }
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
              s1 = peg$c19(s3);
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
      if (input.substr(peg$currPos, 4) === peg$c20) {
        s1 = peg$c20;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c21); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 123) {
            s3 = peg$c22;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 115) {
                s5 = peg$c24;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c25); }
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
                            s11 = peg$c26;
                            peg$currPos++;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c27); }
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
                                    s15 = peg$c28;
                                    peg$currPos++;
                                  } else {
                                    s15 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c29); }
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
                                            s19 = peg$c30;
                                            peg$currPos++;
                                          } else {
                                            s19 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c31); }
                                          }
                                          if (s19 !== peg$FAILED) {
                                            s20 = peg$parse_();
                                            if (s20 !== peg$FAILED) {
                                              peg$reportedPos = s0;
                                              s1 = peg$c32(s7, s9, s13, s17);
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

    function peg$parseshapename() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (peg$c33.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c34); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c35.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c36); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c35.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c36); }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c37();
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
