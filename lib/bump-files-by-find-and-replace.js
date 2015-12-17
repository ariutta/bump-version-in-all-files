var _ = require('lodash');
var colors = require('colors');
var grepObservable = require('./grep-observable.js');
var inquirer = require('inquirer');
var path = require('path');
var RxNode = require('rx-node-extra');
var Rx = RxNode.Rx;
var updateFileLines = require('./update-file-lines.js');

function _getPromptSource(newVersion, filepath, grepResultsByFile) {
  var file = grepResultsByFile[0].file;
  var prompts = grepResultsByFile
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
              message: 'Replace ' + colors.underline(match) + ' with ' +
                          colors.underline(newVersion) +
                    ' (' + path.relative(filepath, file) + ':' + lineNumber + ')?\n' +
                    '\n' +
                    '    ' + highlightedLine + '\n' +
                    '\n',
              default: true
            };
          })
      );
      return accumulator;
    }, []);

  return Rx.Observable.from(prompts);
}

function _getStarter(grepResultsByFile) {
  var file = grepResultsByFile[0].file;
  return grepResultsByFile.reduce(function(accumulator, item) {
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
  }, {
    file: file,
    lineDetailsMap: {}
  });
}

function _getFilteredLineMap(lineDetailsMap) {
  return _.pairs(lineDetailsMap)
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
}

function bumpFilesByFindAndReplace(newVersion, filepath, args) {

  function getPrompts(item) {
    var match = item.str;
    var file = item.file;
    var lineIndex = item.lineIndex;
    return [{
      type: 'confirm',
      name: 'bump',
      /*
      name: {
        file: file,
        lineIndex: lineIndex,
        str: match,
        chunkIndex: item.chunkIndex
      },
      //*/
      message: 'Replace ' + colors.underline(match) + ' with ' +
        colors.underline(newVersion) +
        ' (' + path.relative(filepath, file) + ':' + (lineIndex + 1) + ')?\n' +
        '\n' +
        '    ' + item.highlightedLine + '\n' +
        '\n',
      default: true
    }];
  }

  function createIterable(grepResultsByFile) {
    var file = grepResultsByFile[0].file;
    return grepResultsByFile
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

              var chunkStrings = chunks.map(function(originalChunk) {
                return originalChunk.str;
              });

              var promptChunkStrings = _.cloneDeep(chunkStrings);
              promptChunkStrings[index] = colors.yellow.bold(match);
              var highlightedLine = promptChunkStrings.join('');

              return {
                file: file,
                lineIndex: lineNumber - 1,
                str: match,
                chunkIndex: index,
                chunkStrings: chunkStrings,
                highlightedLine: highlightedLine,
              };

            })
        );
        return accumulator;
      }, []);
  }

  // Regular expression to find version numbers, including the pre-release suffix if present.
  // It should use syntax compatible with both egrep and JS (they differ in some ways).
  // If it's not possible to use the same syntax, use the syntax for JS and convert
  // it to the syntax for egrep when needed.
  var versionNumberRE = /[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)(\.[0-9]+)?)?/;

  var cwd = process.cwd();

  var subject = new Rx.ReplaySubject();

  var source = grepObservable(versionNumberRE, filepath, args)
    .splitOnChange(function(grepResults) {
      return grepResults.file;
    })
    .ask(getPrompts, createIterable)
    .splitOnChange(function(valueAndAnswers) {
      return valueAndAnswers.value.file;
    })
    .map(function(valueAndAnswersForSelectedFile) {
      var file = valueAndAnswersForSelectedFile[0].value.file;
      return valueAndAnswersForSelectedFile
        .reduce(function(accumulator, valueAndAnswers) {
          var value = valueAndAnswers.value;
          var answers = valueAndAnswers.answers;
          var lineDetailsMap = accumulator.lineDetailsMap;
          var lineIndex = value.lineIndex;
          var lineIndexString = String(lineIndex);
          var chunkIndex = value.chunkIndex;
          var lineDetails = lineDetailsMap[lineIndexString] = (lineDetailsMap[lineIndexString] || {
            chunkStrings: value.chunkStrings,
            updated: false
          });
          if (answers.bump) {
            lineDetails.chunkStrings[chunkIndex] = newVersion;
            lineDetails.updated = true;
          }
          return accumulator;
        }, {
          file: file,
          lineDetailsMap: {}
        });
    })
    .map(function(lineDetailsMapAndFile) {
      var lineDetailsMap = lineDetailsMapAndFile.lineDetailsMap;
      var file = lineDetailsMapAndFile.file;
      var filteredLineMap = _getFilteredLineMap(lineDetailsMap);
      return {
        file: file,
        lineMap: filteredLineMap
      };
    })
    .concatMap(function(lineMapAndFile) {
      var lineMap = lineMapAndFile.lineMap;
      var file = lineMapAndFile.file;

      function updater(o) {
        return o.map(function(text, idx) {
          return lineMap[idx.toString()] || text;
        })
        .reduce(function(accumulator, item) {
          return accumulator + '\n' + item;
        });
      }

      return updateFileLines(file, updater);
    })
    .subscribe(function(result) {
      subject.onNext(result);
    }, function(err) {
      throw err;
    }, function() {
      subject.onCompleted();
    });

  return subject;
}

module.exports = {
  bumpFilesByFindAndReplace: bumpFilesByFindAndReplace,
  _getPromptSource: _getPromptSource,
  _getStarter: _getStarter,
  _getFilteredLineMap: _getFilteredLineMap
};
