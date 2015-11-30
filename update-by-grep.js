var _ = require('lodash');
var colors = require('colors');
var exec = require('child_process').exec;
var grepObservable = require('./grep-observable.js');
var inquirer = require('inquirer');
var Rx = require('rx');

var newVersion = '3.2.1';

// Pattern to find version numbers, including the pre-release suffix if present.
// It should use syntax compatible with both egrep and JS (they differ in some ways).
// If it's not possible to use the same syntax, use the syntax for egrep and convert
// it to the syntax for JS when needed.
var versionNumberPattern = '[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)(\.[0-9])?)?';

grepObservable(versionNumberPattern, './', {
  exclude: [
    'package.json'
  ],
  excludeDir: [
    '.git',
    'node_modules'
  ]
})
  .flatMap(function(data) {
    var prompts = data
      .reduce(function(accumulator, item) {
        var filename = item.filename;
        var line = item.line;
        var lineNumber = item.lineNumber;
        var chunks = item.chunks;
        accumulator = accumulator.concat(
          chunks.map(function(chunk, i) {
            if (!chunk.matched) {
              return false;
            }
            var match = chunk.str;
            var promptChunks = _.clone(chunks);
            promptChunks[i].str = colors.yellow.bold(_.clone(match));
            var highlightedLine = promptChunks.map(function(promptChunk) {
              return promptChunk.str;
            }).join('');

            /*
            var trueChunks = _.clone(chunks);
            trueChunks[i].str = newVersion;
            var trueLine = trueChunks.map(function(trueChunk) {
              return trueChunk.str;
            }).join('');

            var falseLine = chunks.map(function(falseChunk) {
              return falseChunk.str;
            }).join('');
            //*/

            return {
              type: 'confirm',
              name: {
                filename: filename,
                lineNumber: lineNumber,
                matchIndex: i
              },
              message: 'Replace ' + colors.bold(match) + ' with ' + colors.bold(newVersion) +
                    ' in ' + colors.bold(filename) + ', line ' + lineNumber +
                    ', as highlighted below?\n' +
                '\n' +
                '    ' + highlightedLine + '\n' +
                '\n',
              default: true
            };
          })
          .filter(function(x) {
            return x;
          })
        );
        return accumulator;
      }, []);

    return inquirer.prompt(prompts).process
      .filter(function(response) {
        console.log('response');
        console.log(response);
        return response.answer;
      })
      .map(function(response) {
        console.log('response');
        console.log(response);
        return response.name;
      })
      .map(function(name) {
        var correspondingItem = _.find(data, function(item) {
          return (item.filename === name.filename) &&
            (item.lineNumber === name.lineNumber);
        });

        if (correspondingItem) {
          correspondingItem.chunks[name.matchIndex].str = newVersion;
        }

        return data;
      });
      /*
      .reduce(function(accumulator, name) {
        var correspondingItem = _.find(accumulator, function(item) {
          return (item.filename === name.filename) &&
            (item.lineNumber === name.lineNumber);
        });

        if (correspondingItem) {
          correspondingItem.chunks[name.matchIndex] = newVersion;
        }

        return accumulator;
      }, data);
      //*/
  })
  .last()
  .flatMap(function(data) {
    console.log('data');
    console.log(data);
    console.log('groupBy');
    console.log(_.pairs(_.groupBy(data, 'filename')));
    return Rx.Observable.from(_.pairs(_.groupBy(data, 'filename')));
  })
  .map(function(dataByFilenamePair) {
    return dataByFilenamePair[1].reduce(function(accumulator, details) {
      var newLine = details.chunks.map(function(chunk) {
        return chunk.str;
      })
      .join('');

      accumulator.push({
        line: newLine,
        lineNumber: details.lineNumber
      });

      return accumulator;
    }, []);
  })
  /*
  .flatMap(function(results) {
    var chunks = results.reduce(function(accumulator, result) {
      var filename = result.filename;
      var lineNumber = result.lineNumber;
      var chunkDetails = result.chunks.map(function(chunk) {
        chunk.filename = filename;
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
          message: 'Replace ' + potentialOlderVersion + ' with ' + newVersion + ' in text below?\n' +
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
  .subscribe(function(result) {
    /*
    var currentLine = result.name;
    console.log('currentLine');
    console.log(currentLine);
    //*/
    console.log('result');
    console.log(result);
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
//      path: lineComponents[0],
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
//        message: 'Replace ' + potentialOlderVersion + ' with ' + newVersion + ' in line below?\n' +
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
