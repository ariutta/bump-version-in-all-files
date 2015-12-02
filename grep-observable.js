// inspired by https://github.com/bsteephenson/simple-grep
// and https://github.com/reepush/grepy

var _ = require('lodash');
var path = require('path');
var stripAnsi = require('strip-ansi');
var Rx = require('rx');

// from http://www.bennadel.com/blog/
//      2664-cloning-regexp-regular-expression-objects-in-javascript.htm
/**
* I clone the given RegExp object, and ensure that the given flags exist on
* the clone. The injectFlags parameter is purely additive - it cannot remove
* flags that already exist on the
*
* @input RegExp - I am the regular expression object being cloned.
* @injectFlags String( Optional ) - I am the flags to enforce on the clone.
*/
function cloneRegExp(input, injectFlags) {
  var pattern = input.source;
  var flags = '';
  // Make sure the parameter is a defined string - it will make the conditional
  // logic easier to read.
  injectFlags = (injectFlags || '');
  // Test for global.
  if (input.global || (/g/i).test(injectFlags)) {
    flags += 'g';
  }
  // Test for ignoreCase.
  if (input.ignoreCase || (/i/i).test(injectFlags)) {
    flags += 'i';
  }
  // Test for multiline.
  if (input.multiline || (/m/i).test(injectFlags)) {
    flags += 'm';
  }
  // Return a clone with the additive flags.
  return (new RegExp(pattern, flags));
}

var grep = function(reJS, where, args, callback) {
  var excludeList = args.exclude;
  excludeList = _.isArray(excludeList) ? excludeList : [excludeList];
  var excludeDirList = args.excludeDir;
  excludeDirList = _.isArray(excludeDirList) ? excludeDirList : [excludeDirList];

  // Clone the regular expression object, but ensure "g" (global) flag is set
  // (even if it was not set on the given RegExp instance).
  var reJSGlobal = cloneRegExp(reJS, 'g');

  // TODO:
  // 1) remove flags
  // 2) might need to add backslashes to curly braces when converting
  //    from JS RegExp to egrep RegExp
  var reEgrep = '\'' + reJS.source + '\'';

  var commandString = [
    'grep',
    '-ErnI',
    reEgrep,
    where,
  ]
  .concat(
    excludeDirList.map(function(excludeDir) {
      return '--exclude-dir=' + excludeDir;
    })
  )
  .concat(
    excludeList.map(function(exclude) {
      return '--exclude=' + exclude;
    })
  )
  .join(' ');

  var exec = require('child_process').exec;

  exec(commandString, function(err, stdin, stdout) {
    if (err) {
      console.log('child processes failed with error code: ' + err.code);
      return callback(err);
    }

    var list = {};

    var grepResultLines = stdin.split('\n');

    // remove last element (it’s an empty line)
    grepResultLines.pop();

    var parsedLines = grepResultLines.map(function(grepResultLine) {
      var grepResultLineComponents = grepResultLine.split(':'); //file:lineNumber:line
      // "file" is a string representing the absolute path to the file
      var file = path.resolve(grepResultLineComponents[0]);
      var lineNumber = grepResultLineComponents[1];
      grepResultLineComponents.shift();
      grepResultLineComponents.shift();
      // the actual line in the file
      var line = grepResultLineComponents.join(':');

      /*
      return {
        file: file,
        lineNumber: lineNumber,
        line: line
      };
      //*/

      //*
      var exec;
      var matches = [];
      while ((exec = reJSGlobal.exec(line)) !== null) {
        matches.push({
          start: exec.index,
          length: exec[0].length
        });
      }

      var chunks = [];
      var i = 0;
      matches.forEach(function(match) {
        if (i < match.start) {
          chunks.push({
            str: line.slice(i, match.start),
            matched: false
          });
        }

        chunks.push({
          str: stripAnsi(line.substr(match.start, match.length)),
          matched: true
        });
        i = match.start + match.length;
      });

      if (i < line.length) {
        chunks.push({
          str: line.slice(i),
          matched: false
        });
      }

      return {
        file: file,
        lineNumber: parseFloat(lineNumber),
        line: line,
        chunks: chunks
      };
      //*/
    });

    return callback(null, parsedLines);
  });
};

module.exports = Rx.Observable.fromNodeCallback(grep);
