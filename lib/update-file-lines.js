var Rx = require('rx');
var rxFs = require('rx-fs');

function updateFileLines(file, updater) {

  var dataSource = rxFs.createReadObservable(file, {
      flags: 'r'
    })
    .flatMap(function(data) {
      var lines = data.toString().split('\n');
      // NOTE On OS/X, the last line will be empty, but we.
      // still want to keep it.
      // TODO check whether this is cross-platform compatible.
      return Rx.Observable.from(lines);
    });

  var tempPath = file + '.temp-file-bump-version';
  var destSource = rxFs.createWriteObservable(tempPath);

  return dataSource
    .let(updater)
    .let(destSource)
    .flatMap(rxFs.rename(tempPath, file));
}

module.exports = updateFileLines;
