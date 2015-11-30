// inspired by https://github.com/bsteephenson/simple-grep
// and https://github.com/reepush/grepy

var _ = require('lodash');
var stripAnsi = require('strip-ansi');
var Rx = require('rx');

var grep = function(what, where, args, callback) {
  var excludeList = args.exclude;
  excludeList = _.isArray(excludeList) ? excludeList : [excludeList];
  var excludeDirList = args.excludeDir;
  excludeDirList = _.isArray(excludeDirList) ? excludeDirList : [excludeDirList];

  what = what.replace(/\\/g, '\\\\');
  var whatForCommandLine = '\'' + what + '\'';
  var whatForJS = what.replace(/\\\\{/g, '{').replace(/\\\\}/g, '}');

  var commandString = [
    'grep',
    '-ErnI',
    whatForCommandLine,
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
      var filename = grepResultLineComponents[0];
      var lineNumber = grepResultLineComponents[1];
      grepResultLineComponents.shift();
      grepResultLineComponents.shift();
      // the actual line in the file
      var line = grepResultLineComponents.join(':');

      /*
      return {
        filename: filename,
        lineNumber: lineNumber,
        line: line
      };
      //*/

      //*
      var exec;
      var matches = [];
      var re = new RegExp(whatForJS, 'g');
      while ((exec = re.exec(line)) !== null) {
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
        filename: filename,
        lineNumber: lineNumber,
        line: line,
        chunks: chunks
      };
      //*/
    });

    return callback(null, parsedLines);
  });
};

module.exports = Rx.Observable.fromNodeCallback(grep);
