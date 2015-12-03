// inspired by https://github.com/bsteephenson/simple-grep
// and https://github.com/reepush/grepy

var _ = require('lodash');
var path = require('path');
var stripAnsi = require('strip-ansi');
var Rx = require('rx');
var RxNode = require('rx-node-extra');

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

var grep = function(jsRE, where, args) {
  var excludeList = args.exclude;
  excludeList = _.isArray(excludeList) ? excludeList : [excludeList];
  var excludeDirList = args.excludeDir;
  excludeDirList = _.isArray(excludeDirList) ? excludeDirList : [excludeDirList];

  // TODO:
  // 1) remove flags
  // 2) might need to add backslashes to curly braces when converting
  //    from JS RegExp to egrep RegExp pattern (passed as just a string)
  var egrepREPattern = jsRE.source;

  var commandLineArgs = [
    '-ErnI',
    egrepREPattern,
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
  );

  return RxNode.spawn('grep', commandLineArgs)
    .doOnError(function(err) {
      console.log('child processes failed with error code: ' + err.code);
      throw err;
    })
    .flatMap(function(data) {
      var dataAsString = data.toString();
      return Rx.Observable.fromArray(dataAsString.split('\n'));
    })
    .filter(function(data) {
      // remove last element (it’s an empty line)
      return !!data;
    })
    .map(function(grepResultLine) {
      var grepResultLineComponents = grepResultLine.split(':'); //file:lineNumber:line
      // 'file' is a string representing the absolute path to the file
      var file = path.resolve(grepResultLineComponents[0]);
      var lineNumber = grepResultLineComponents[1];
      // remove file and lineNumber from grepResultsLineComponents array
      // to leave just the line items.
      grepResultLineComponents.shift();
      grepResultLineComponents.shift();
      // the actual line in the file
      var line = grepResultLineComponents.join(':');

      // Clone the regular expression object, but ensure "g" (global) flag is set
      // (even if it was not set on the given RegExp instance).
      var jsREGlobal = cloneRegExp(jsRE, 'g');
      var exec;
      var matches = [];
      while ((exec = jsREGlobal.exec(line)) !== null) {
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
    });
};

module.exports = grep;
