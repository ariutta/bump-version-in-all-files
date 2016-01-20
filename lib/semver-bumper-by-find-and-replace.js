require('pretty-error').start();
var _ = require('lodash');
var colors = require('colors');
var fileLineUpdater = require('./file-line-updater.js');
var grepObservable = require('./grep-observable.js');
var path = require('path');
var RxNode = require('rx-node-extra');
var Rx = RxNode.Rx;
var VError = require('verror');

function getFilteredLineMap(lineDetailsMap) {
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

function getPromptSet(newVersion, filepath, item) {
  var match = item.str;
  var file = item.file;
  var lineIndex = item.lineIndex;

  return [{
    type: 'confirm',
    name: 'bump',
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

function bump(newVersion, filepath, args) {
  var getPromptSetBound = getPromptSet.bind(null, newVersion, filepath);

  // Regular expression to find version numbers, including the pre-release suffix if present.
  // It should use syntax compatible with both egrep and JS (they differ in some ways).
  // If it's not possible to use the same syntax, use the syntax for JS and convert
  // it to the syntax for egrep when needed.
  var versionNumberRE = /[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)(\.[0-9]+)?)?/;

  return grepObservable.grep(versionNumberRE, filepath, args)
    .splitOnChange(function(grepResults) {
      return grepResults.file;
    })
    .ask(getPromptSetBound, createIterable)
    .splitOnChange(function(valueAndAnswers) {
      return valueAndAnswers.value.file;
    })
    .map(function(valueAndAnswersSetsForSelectedFile) {
      var file = valueAndAnswersSetsForSelectedFile[0].value.file;
      return valueAndAnswersSetsForSelectedFile
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
      var filteredLineMap = getFilteredLineMap(lineDetailsMap);
      return {
        file: file,
        filteredLineMap: filteredLineMap
      };
    })
    .filter(function(filteredLineMapAndFile) {
      var filteredLineMap = filteredLineMapAndFile.filteredLineMap;
      return !_.isEmpty(filteredLineMap);
    })
    .doOnNext(function(filteredLineMapAndFile) {
      var filteredLineMap = filteredLineMapAndFile.filteredLineMap;
      var file = filteredLineMapAndFile.file;

      function updater(o) {
        return o.map(function(text, idx) {
          return filteredLineMap[idx.toString()] || text;
        })
        .toArray()
        .map(function(result) {
          return result.join('\n');
        });
      }

      fileLineUpdater.update(file, updater);
    })
    .doOnError(function(err) {
      var newError = new VError(err, 'Error with semverBumperByFindAndReplace.bump');
      throw newError;
    });
}

module.exports = {
  bump: bump,
  _getPromptSet: getPromptSet,
  _createIterable: createIterable
};
