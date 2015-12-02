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
//var versionNumberPatternOrig = '[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)(\.[0-9])?)?';
//var versionNumberPattern = '[0-9]+\\.[0-9]+\\.[0-9]+(-(alpha|beta|rc)(\\.[0-9])?)?';

grepObservable(versionNumberRe, './', {
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
  .flatMap(function(data) {
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
                message: 'Replace ' + colors.bold(match) + ' with ' + colors.bold(newVersion) +
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

    var chunkStringsByFileByLineIndex = data.reduce(function(accumulator, item) {
      var file = item.file;
      var lineIndexString = String(item.lineNumber - 1);
      var chunkStrings = item.chunks.map(function(chunk) {
        return chunk.str;
      });
      accumulator[file] = accumulator[file] || {};
      accumulator[file][lineIndexString] = accumulator[file][lineIndexString] || {};
      accumulator[file][lineIndexString].chunkStrings = chunkStrings;
      accumulator[file][lineIndexString].updated = false;
      return accumulator;
    }, {});
    return Rx.Observable.return(chunkStringsByFileByLineIndex).concat(
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
    /*
    var correspondingItem = _.find(accumulator, function(item) {
      return (item.file === name.file) &&
        (item.lineNumber === name.lineNumber);
    });
    //*/

    var file = item.file;
    var lineIndexString = item.lineIndex.toString();
    console.log('accumulator');
    console.log(accumulator);
    //console.log(JSON.stringify(accumulator, null, '  '));
    var lineDetails = accumulator[file][lineIndexString];
    lineDetails.updated = true;
    console.log('lineDetails118');
    console.log(JSON.stringify(lineDetails, null, '  '));
    var chunkStrings = lineDetails.chunkStrings;
    console.log('chunkStrings120');
    console.log(JSON.stringify(chunkStrings, null, '  '));
    chunkStrings[item.chunkIndex] = item.str;

    return accumulator;
  })
  .flatMap(function(data) {
    console.log('data119');
    console.log(data);
    return Rx.Observable.from(_.pairs(_.groupBy(data, 'file')));
  })
  /*
  .map(function(dataByFilenamePair) {
    var file = dataByFilenamePair[0];
    var detailsByLineList = dataByFilenamePair[1];

    var lastUpdatedLineNumber = 0;

    var updatedLines = detailsByLineList.reduce(function(accumulator, lineDetails) {
      var lineNumber = lineDetails.lineNumber;

      var text = lineDetails.chunks.map(function(chunk) {
        return chunk.str;
      })
      .join('');

      //accumulator[lineNumber - 1] = text;

      var updatedLine = {
        text: text,
        number: lineNumber
      };
      accumulator.push(updatedLine);

      return accumulator;
    }, []);

    return {
      file: file,
      updatedLines: updatedLines
    };
  })
  //*/
  .map(function(dataByFilenamePair) {
    var file = dataByFilenamePair[0];
    var detailsByLineList = dataByFilenamePair[1];

    var lastUpdatedLineNumber = 0;

    var updatedTextByLineMap = detailsByLineList.reduce(function(accumulator, lineDetails) {
      var lineNumber = lineDetails.lineNumber;

      var text = lineDetails.chunks.map(function(chunk) {
        return chunk.str;
      })
      .join('');

      accumulator[lineNumber - 1] = text;

      return accumulator;
    }, {});

    return {
      file: file,
      updatedTextByLineMap: updatedTextByLineMap
    };
  })
  /*
  .flatMap(function(results) {
    var chunks = results.reduce(function(accumulator, result) {
      var file = result.file;
      var lineNumber = result.lineNumber;
      var chunkDetails = result.chunks.map(function(chunk) {
        chunk.file = file;
        chunk.lineNumber = lineNumber;
        return chunk;
      });
      return accumulator.concat(chunkDetails);
    }, []);

    console.log('chunks');
    console.log(chunks);

    var prompts = chunks
      .filter(function(chunk) {
        return chunk.matched;
      })
      .filter(function(chunk) {
        var str = chunk.str;
        var potentialOlderVersion = re.exec(str).shift();
        return potentialOlderVersion !== newVersion;
      })
      .map(function(chunk) {
        var str = chunk.str;
        var potentialOlderVersion = re.exec(str).shift();
        return {
          type: 'confirm',
          name: chunk,
          message: 'Replace ' + potentialOlderVersion + ' with ' + newVersion +
                      ' in text below?\n' +
            '\n' +
            '    ' + str.replace(potentialOlderVersion,
                         colors.yellow.bold(potentialOlderVersion)) + '\n' +
            '\n',
          default: true
        };
      });

    return inquirer.prompt(prompts).process;
  })
  //*/
  .flatMap(function(fileAndUpdatesByLine) {
    console.log('fileAndUpdatesByLine');
    console.log(fileAndUpdatesByLine);
    return updateFileLines(fileAndUpdatesByLine.file, fileAndUpdatesByLine.updatedTextByLineMap);
  })
  .subscribe(function(result) {
    /*
    var currentLine = result.name;
    console.log('currentLine');
    console.log(currentLine);
    //*/
    console.log('result');
    console.log(result);
    //updateFileLines()
  }, function(err) {
    throw err;
  }, function() {
    // complete
  });

//exec(commandString, function(err, stdout, stderr) {
//  if (err) {
//    console.log('child processes failed with error code: ' + err.code);
//  }
//  var lines = stdout.split('\n');
//
//  var parsedLines = lines.map(function(line) {
//    var lineComponents = line.split(' ');
//    return {
//      file: lineComponents[0],
//      value: lineComponents[1],
//    };
//  });
//  console.log(parsedLines);
//
//  /*
//  lines.forEach(function(line) {
//    console.log('ln: ' + line);
//  });
//  lines.forEach(function(line) {
//    console.log('new ln: ' + line.replace(jsVersionNumberPattern, '3.2.1'));
//  });
//  //*/
//
//  var newVersion = '3.2.1';
//  var prompts = lines
//    .filter(function(line) {
//      return line;
//    })
//    .filter(function(line) {
//      var potentialOlderVersion = line.match(jsVersionNumberPattern).shift();
//      return potentialOlderVersion !== newVersion;
//    })
//    .map(function(line) {
//      var potentialOlderVersion = line.match(jsVersionNumberPattern).shift();
//      return {
//        type: 'confirm',
//        name: line,
//        message: 'Replace ' + potentialOlderVersion + ' with ' +
//                    newVersion + ' in line below?\n' +
//          '\n' +
//          '    ' + line.replace(potentialOlderVersion,
//                       colors.yellow.bold(potentialOlderVersion)) + '\n' +
//          '\n',
//        default: true
//      };
//    });
//
//  inquirer.prompt(prompts).process
//    .subscribe(function(result) {
//      var currentLine = result.name;
//      console.log('currentLine');
//      console.log(currentLine);
//      console.log('result');
//      console.log(result);
//    }, function(err) {
//      throw err;
//    }, function() {
//      // complete
//    });
//});
