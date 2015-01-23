start
  = grammarfile



ws "whitespace"
  = [ \t\n\r]

_ "optional whitespace run"
  = ws*

number
  = [1-9] [0-9]* "." [0-9]* { return parseFloat(text()); }
  / [1-9] [0-9]* { return parseFloat(text()); }
  / "0"? "." [0-9]* { return parseFloat(text()); }

shapename
  = [_a-z]i [_a-z0-9]i* { return text(); }



grammarfile
  = _ topthings:toplevelthing* { return topthings; }

toplevelthing
  = startshape_directive
  / size_directive
  / shaperule

startshape_directive
  = "startshape" ws+ name:shapename _ { return {type: 'startshape', name: name}; }

size_directive
  = "size" _ "{" _ "s" ws+ width:number ws+ height:number ws+ "x" ws+ xpos:number ws+ "y" ws+ ypos:number _ "}" _
    { return {type: 'size', width: width, height: height, xpos: xpos, ypos: ypos}}

shape_adjustment
  = "x" ws+ x:number ws+ y:number ws+ z:number { return {type: 'xyzTrans', x: x, y: y, z: z}; }
  / "x" ws+ x:number ws+ y:number { return {type: 'xyTrans', x: x, y: y}; }
  / "x" ws+ x:number { return {type: 'xTrans', x: x}; }
  / "y" ws+ y:number { return {type: 'yTrans', y: y}; }
  / "z" ws+ z:number { return {type: 'zTrans', z: z}; }
  / ("size" / "s") ws+ xscale:number ws+ yscale:number { return {type: 'scale', x: xscale, y: yscale}; }
  / ("size" / "s") ws+ scale:number { return {type: 'scale', x: scale, y: scale}; }
  / ("rotate" / "r") ws+ degrees:number { return {type: 'rotate', degrees: degrees}; }
  / ("flip" / "f") ws+ degrees:number { return {type: 'flip', degrees: degrees}; }

spaced_shape_adjustment
  = ws+ adj:shape_adjustment { return adj; }

shape_adjustments
  = "{" _ "}" { return { ordered: false, adjList: []}; }
  / "{" _ first_adj:shape_adjustment rest_adjs:spaced_shape_adjustment* _ "}"
    { return { ordered: false, adjList: [first_adj].concat(rest_adjs)}; }

shape_replacement
  = name:shapename _ adjustments:shape_adjustments _
    { return {name: name, adjustments: adjustments}; }

shaperule
  = "rule" ws+ name:shapename ws+ weight:number _ "{" _ replacements:shape_replacement* "}" _
    { return {type: 'shaperule', name: name, weight: weight, replacements: replacements}; }
  / "rule" ws+ name:shapename _ "{" _ replacements:shape_replacement* "}" _
    { return {type: 'shaperule', name: name, weight: 1, replacements: replacements}; }

