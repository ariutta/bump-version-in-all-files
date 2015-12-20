require('pretty-error').start();
var VError = require('verror');

var Rx = require('rx');
var rxFs = require('rx-fs');

function update(file, updater) {

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
    .doOnError(function(err) {
      var newError = new VError(err, 'Error with provided updater for fileLineUpdater.update');
      console.error(newError.stack);
    })
    .let(destSource)
    .doOnError(function(err) {
      var newError = new VError(err, 'Error writing to file');
      console.error(newError.stack);
    })
    .flatMap(rxFs.rename(tempPath, file))
    .doOnError(function(err) {
      var newError = new VError(err, 'Error getting rid of temp file');
      console.error(newError.stack);
    });
}

module.exports = {
  update: update
};
