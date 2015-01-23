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

grammarfile
  = _ topthings:toplevelthing* { return topthings; }

toplevelthing
  = startshape_directive
  / size_directive

startshape_directive
  = "startshape" ws+ name:shapename _ { return {type: 'startshape', name: name}; }

size_directive
  = "size" _ "{" _ "s" ws+ width:number ws+ height:number ws+ "x" ws+ xpos:number ws+ "y" ws+ ypos:number _ "}" _ { return {type: 'size', width: width, height: height, xpos: xpos, ypos: ypos}}

shapename
  = [_a-z]i [_a-z0-9]i* { return text(); }
