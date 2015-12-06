var _ = require('lodash');
var Rx = require('rx');
var rxFs = require('rx-fs');

function updateFileLines(file, updatedTextByLineMap) {

  var dataSource = rxFs.createReadObservable(file, {
      flags: 'r'
    })
    .flatMap(function(data) {
      var lines = data.toString().split('\n');
      // get rid of empty last line that is not
      // actually in the file
      lines.pop();
      return Rx.Observable.from(lines);
    });

  var tempPath = file + '.temp-bump-file-by-find-and-replace';
  var destSource = rxFs.createWriteObservable(tempPath);

  return dataSource
    .map(function(text, idx) {
      return updatedTextByLineMap[idx.toString()] || text;
    })
    .reduce(function(accumulator, item) {
      return accumulator + '\n' + item;
    });
    /*
    .let(destSource)
    .flatMap(rxFs.rename(tempPath, file));
    //*/
}

module.exports = updateFileLines;
