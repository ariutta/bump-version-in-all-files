require('pretty-error').start();
var VError = require('verror');

var RxNode = require('rx-node-extra');
var Rx = RxNode.Rx;
var RxFs = require('rx-fs');

function update(file, updater) {

  var dataSource = RxFs.createReadObservable(file, {
      flags: 'r'
    })
    .flatMap(function(data) {
      var lines = data.toString().split('\n');
      // NOTE On OS/X, the last line will be empty, but we
      // still want to keep it.
      // TODO check whether this is cross-platform compatible.
      return Rx.Observable.from(lines);
    });

  var tempPath = file + '.temp-file-bump-version';

  var inputSource = dataSource
    .let(updater)
    .doOnError(function(err) {
      var newError = new VError(err, 'Error with provided updater for fileLineUpdater.update');
      console.error(newError.stack);
    });

  // TODO after I changed rx-node-extra, both Options A and B below appear to have stopped working.
  // The tests are failing.
  // Once I get them working again, I need to determine which is better: Option A or B.

  //* Option A
  var destStream = RxFs.createWriteStream(tempPath);
  inputSource.pipe(destStream);

  return inputSource
    .doOnCompleted(function() {
      RxFs.rename(tempPath, file)
        .doOnError(function(err) {
          var newError = new VError(err, 'Error removing temp file in fileLineUpdater.update');
          console.error(newError.stack);
        })
        .subscribe();
    });
  //*/

  /* Option B
  var destSource = RxFs.createWriteObservable(tempPath);
  return inputSource
    .let(destSource)
    .doOnError(function(err) {
      var newError = new VError(err, 'Error writing to file');
      console.error(newError.stack);
    })
    .flatMap(RxFs.rename(tempPath, file))
    .doOnError(function(err) {
      var newError = new VError(err, 'Error with provided updater for fileLineUpdater.update');
      console.error(newError.stack);
    });
    //*/
}

module.exports = {
  update: update
};
