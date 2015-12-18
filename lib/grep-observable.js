// inspired by https://github.com/bsteephenson/simple-grep
// and https://github.com/reepush/grepy

var _ = require('lodash');
var path = require('path');
var quote = require('shell-quote').quote;
var Rx = require('rx');
var RxNode = require('rx-node-extra');
var stripAnsi = require('strip-ansi');

var cwd = process.cwd();

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
  args = args || {};
  var includeList = args.include || [];
  includeList = _.isArray(includeList) ? includeList : [includeList];
  var excludeList = args.exclude || [];
  excludeList = _.isArray(excludeList) ? excludeList : [excludeList];
  var excludeDirList = args.excludeDir || [];
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
    includeList.map(function(include) {
      return quote(['--include=' + include]);
    })
  )
  .concat(
    excludeList.map(function(exclude) {
      return quote(['--exclude=' + exclude]);
    })
  )
  .concat(
    excludeDirList.map(function(excludeDir) {
      return quote(['--exclude-dir=' + excludeDir]);
    })
  );

  return RxNode.spawn('grep', commandLineArgs, {
    cwd: cwd
  })
    .doOnError(function(err) {
      console.error('grep process failed with error code: ' + err.code);
      console.error(err.toString());
      throw err;
    })
    .concatMap(function(data) {
      var dataAsString = data.toString();
      var matchingLines = dataAsString.split('\n');
      return Rx.Observable.fromArray(matchingLines);
    })
    .filter(function(matchingLine) {
      // Remove any empty lines (should just be the last line,
      // which is always an empty line in grep results)
      return !!matchingLine;
    })
    .map(function(grepResultLine) {
      var grepResultLineComponents = grepResultLine.split(':'); //file:lineNumber:line
      // 'file' is a string representing the absolute path to the file
      var file = path.resolve(cwd, grepResultLineComponents[0]);
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

module.exports = {
  grep: grep
};
