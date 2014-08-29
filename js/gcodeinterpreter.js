function GCodeInterpreter(millingMachine, scene) {
  var STATES = {STOPPED: "stopped", RUNNING: "running", PAUSED: "paused"};
  var state = STATES.STOPPED;
  var gCode;
  var tools;
  var gCodeLines;
  var curGCodeLine;
  var endGCodeLine;
  var ti = 1;
  var validPartStarts = "mgotxyzijkf";
  var partValueParser =   [intParser, intParser, stringParser, intParser, floatParser, floatParser, floatParser, floatParser, floatParser, floatParser, floatParser];
  var prevPos = {x:0, y:0, z:0};
  var partVal = {};
  var stateChangeListener;
  
  function trim1 (str) {    // returns str with whitespace removed from both ends
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  }
  
  function floatParser(s) { return parseFloat(s); }
  function intParser(s) { return parseInt(s); }
  function stringParser(s) { return s; }
  
  // parse g code line by line and call machine functions
  // machine is {reset: function() {...}, millFromTo: function(from, to, ti) {...}}
  // supports g0, g1 and m6
  function runAll(machine) {
    if (state == STATES.STOPPED) {
      machine.reset();
    }
    state = STATES.RUNNING;
    scene.setRenderLoopFunction(function() {
      runGCodeLine(machine);
      if (curGCodeLine >= gCodeLines.length || state != STATES.RUNNING) {
        if (curGCodeLine >= gCodeLines.length) {
          state = STATES.STOPPED;
          if (stateChangeListener != undefined) {
            stateChangeListener();
          }
        }
        scene.setRenderLoopFunction(undefined);
      }
    })
  }

  function runGCodeLine(machine) {
    if (curGCodeLine < gCodeLines.length) {
      delete partVal.m;
      var line = trim1(gCodeLines[curGCodeLine]);
      if (line.length > 0 && line.charAt(0) !== '(') {
        var parts = line.split(' ');
        for (var j in parts) {
          var part = parts[j];
          var partStart = part.charAt(0).toLowerCase();
          var partRest = part.substr(1);
          var partStartIndex = validPartStarts.indexOf(partStart);
          if (partStartIndex == -1) {
            throw new SyntaxError("invalid g-code", curGCodeLine);
          }
          partVal[partStart] = partValueParser[partStartIndex](partRest);
        }
        if (partVal.m == 6) {
            if (partVal.t == undefined) {
                throw new SyntaxError("missing t value for m6", curGCodeLine);
            }
            ti = partVal.t;
        }
        if (partVal.g == 0 || partVal.g == 1) {
          if (partVal.x == undefined || partVal.y == undefined || partVal.z == undefined) {
            throw new SyntaxError("missing x, y or z", curGCodeLine);
          }
          if (partVal.g == 1) {
            machine.millFromTo(prevPos, partVal, tools[ti - 1]);
          }
          prevPos.x = partVal.x; 
          prevPos.y = partVal.y; 
          prevPos.z = partVal.z;
        }
      }
      curGCodeLine++;
    }
  }
  
  return {
    isStopped: function() { return state == STATES.STOPPED; },
    isPaused: function() { return state == STATES.PAUSED; },
    isRunning: function() { return state == STATES.RUNNING; },
    
    setGCode: function(newGCode) {
      state = STATES.STOPPED;
      gCode = newGCode;
      gCodeLines = gCode.split('\n');
      curGCodeLine = 0;
    },
    
    setTools: function(newTools) {
      tools = newTools;
    },
    
    run: function() {
      runAll(millingMachine);
    },
    
    setStateChangeListener: function(listener) {
      stateChangeListener = listener;
    },
    
    pause: function() {
      state = STATES.PAUSED;
    },
    
    step: function() {
      if (state == STATES.STOPPED) {
        millingMachine.reset();
        curGCodeLine = 0;
        state = STATES.PAUSED;
      }
      if (curGCodeLine < gCodeLines.length) {
        runGCodeLine(millingMachine);
      }
    },
    
    stop: function() {
      state = STATES.STOPPED;
    },
    
    getCurrentLine: function() {
      return curGCodeLine;
    }
  }
}