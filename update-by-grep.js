var _ = require('lodash');
var colors = require('colors');
var exec = require('child_process').exec;
var grepObservable = require('./grep-observable.js');
var inquirer = require('inquirer');
var Rx = require('rx');
var updateFileLines = require('./lib/update-file-lines.js');

var newVersion = '3.2.1';

// Regular expression to find version numbers, including the pre-release suffix if present.
// It should use syntax compatible with both egrep and JS (they differ in some ways).
// If it's not possible to use the same syntax, use the syntax for JS and convert
// it to the syntax for egrep when needed.
var versionNumberRe = /[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)(\.[0-9])?)?/;

var pauser = new Rx.Subject();

var boundary = 'bump-version-in-all-files-boundary';
var source = grepObservable(versionNumberRe, './', {
    exclude: [
      'package.json',
      'update-by-grep.js'
    ],
    excludeDir: [
      '.git',
      'node_modules',
      'lib'
    ]
  })
  .pairwise()
  .flatMap(function(pair) {
    var previous = pair[0];
    var current = pair[1];
    if (previous.file === current.file) {
      return Rx.Observable.from(pair);
    } else {
      return Rx.Observable.from([previous, boundary, current]);
    }
  })
  .publish().refCount();

var openings = source
  .filter(function(x) {
    return x === boundary;
  });

source
  .filter(function(x) {
    return x !== boundary;
  })
  .distinctUntilChanged(JSON.stringify)
  .window(openings)
  .flatMap(function(obs) {
    return obs
      .pausableBuffered(pauser)
      .toArray()
      .concatMap(function(data) {
        pauser.onNext(false);
        var file = data[0].file;
        var prompts = data
          .reduce(function(accumulator, item) {
            var file = item.file;
            var line = item.line;
            var lineNumber = item.lineNumber;
            var chunks = item.chunks;
            accumulator = accumulator.concat(
              _.pairs(chunks)
                .map(function(chunkPair) {
                  var index = parseFloat(chunkPair[0]);
                  var chunk = chunkPair[1];
                  return [index, chunk];
                })
                .filter(function(chunkPair) {
                  var chunk = chunkPair[1];
                  return chunk.matched;
                })
                .map(function(chunkPair) {
                  var index = chunkPair[0];
                  var chunk = chunkPair[1];
                  var match = chunk.str;

                  var promptChunkStrings = chunks.map(function(originalChunk) {
                    return originalChunk.str;
                  });
                  promptChunkStrings[index] = colors.yellow.bold(match);

                  var highlightedLine = promptChunkStrings.join('');

                  return {
                    type: 'confirm',
                    name: {
                      file: file,
                      lineIndex: lineNumber - 1,
                      str: match,
                      chunkIndex: index
                    },
                    message: 'Replace ' + colors.bold(match) + ' with ' +
                                colors.bold(newVersion) +
                          ' in ' + colors.bold(file) + ', line ' + lineNumber +
                          ', as highlighted below?\n' +
                      '\n' +
                      '    ' + highlightedLine + '\n' +
                      '\n',
                    default: true
                  };
                })
            );
            return accumulator;
          }, []);

        var output = {
          file: file,
          lineDetailsMap: {}
        };
        return Rx.Observable.return(
          data.reduce(function(accumulator, item) {
            var lineIndexString = String(item.lineNumber - 1);
            var chunkStrings = item.chunks.map(function(chunk) {
              return chunk.str;
            });
            var lineDetailsMap = accumulator.lineDetailsMap;
            var lineDetails = lineDetailsMap[lineIndexString] =
                lineDetailsMap[lineIndexString] || {};
            lineDetails.chunkStrings = chunkStrings;
            lineDetails.updated = false;
            return accumulator;
          }, output)
        ).concat(
          inquirer.prompt(prompts).process
            .filter(function(response) {
              return response.answer;
            })
            .map(function(response) {
              var item = response.name;
              item.str = newVersion;
              return item;
            })
        );
      })
      .reduce(function(accumulator, item) {
        var lineIndexString = item.lineIndex.toString();
        var lineDetails = accumulator.lineDetailsMap[lineIndexString];
        lineDetails.updated = true;
        var chunkStrings = lineDetails.chunkStrings;
        chunkStrings[item.chunkIndex] = item.str;
        return accumulator;
      });
  })
  .flatMap(function(data) {
    pauser.onNext(true);
    var file = data.file;
    var lineDetailsMap = data.lineDetailsMap;
    var filteredLineMap = _.pairs(lineDetailsMap)
      .filter(function(lineDetailsPair) {
        return lineDetailsPair[1].updated;
      })
      .reduce(function(accumulator, lineDetailsPair) {
        var lineIndexString = lineDetailsPair[0];
        var lineDetails = lineDetailsPair[1];
        var text = lineDetails.chunkStrings.join('');
        accumulator[lineIndexString] = text;
        return accumulator;
      }, {});
    return updateFileLines(file, filteredLineMap);
  })
  .subscribe(function(result) {
    console.log('result');
    console.log(result);
  }, function(err) {
    throw err;
  }, function() {
    // complete
  });

pauser.onNext(true);
