var _ = require('lodash');
var colors = require('colors');
var exec = require('child_process').exec;
var grepObservable = require('./grep-observable.js');
var inquirer = require('inquirer');
var path = require('path');
var Rx = require('rx');
var updateFileLines = require('./update-file-lines.js');

function bumpFilesByFindAndReplace(newVersion, filepath, args) {

  // Regular expression to find version numbers, including the pre-release suffix if present.
  // It should use syntax compatible with both egrep and JS (they differ in some ways).
  // If it's not possible to use the same syntax, use the syntax for JS and convert
  // it to the syntax for egrep when needed.
  var versionNumberRe = /[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)(\.[0-9]+)?)?/;

  var cwd = process.cwd();

  var pauser = new Rx.Subject();

  var subject = new Rx.ReplaySubject();

  var source = grepObservable(versionNumberRe, filepath, args)
    .splitOnChange(function(x) {
      return x.file;
    })
    .pausableBuffered(pauser)
    .flatMap(function(data) {
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
      )
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

      function updater(o) {
        return o.map(function(text, idx) {
          return filteredLineMap[idx.toString()] || text;
        })
          .reduce(function(accumulator, item) {
            return accumulator + '\n' + item;
          });
      }

      return updateFileLines(file, updater);
    })
    .subscribe(function(result) {
      subject.onNext(result);
      pauser.onNext(true);
    }, function(err) {
      throw err;
    }, function() {
      subject.onCompleted();
    });

  pauser.onNext(true);

  return subject;
}

module.exports = bumpFilesByFindAndReplace;
